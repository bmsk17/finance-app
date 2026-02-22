// ARQUIVO: src/app/actions/import.ts
'use server'

import { prisma } from "@/lib/prisma"

export interface AnalyzedTransaction {
  originalDate: string;
  description: string;
  amount: number;
  status: 'READY' | 'DUPLICATE' | 'NEEDS_CATEGORY' | 'IGNORED';
  suggestedCategoryId: string | null;
  installment?: { current: number; total: number; isInitial: boolean } | null;
}

export async function analyzeNubankCsvAction(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file) throw new Error("Nenhum arquivo foi enviado.");

  const text = await file.text();
  const lines = text.split('\n');
  const transactions: AnalyzedTransaction[] = [];

  const rules = await prisma.importRule.findMany();
  const recentTransactions = await prisma.transaction.findMany({
    orderBy: { date: 'desc' },
    take: 500
  });

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',');
    if (parts.length >= 3) {
      const dateStr = parts[0]; 
      const amountStr = parts[parts.length - 1]; 
      const titleStr = parts.slice(1, parts.length - 1).join(',').replace(/"/g, '').trim(); 
      
      const amount = parseFloat(amountStr) * -1;

      if (titleStr.toLowerCase().includes('pagamento recebido') || amount > 0) {
        transactions.push({
          originalDate: dateStr, description: titleStr, amount, status: 'IGNORED', suggestedCategoryId: null
        });
        continue;
      }

      let installment = null;
      const installmentMatch = titleStr.match(/(\d+)\/(\d+)/i);
      if (installmentMatch) {
        const current = parseInt(installmentMatch[1]);
        const total = parseInt(installmentMatch[2]);
        installment = { 
          current, 
          total,
          isInitial: current === 1 
        };
      }

      const isDuplicate = recentTransactions.some(t => {
        const tDateStr = t.date.toISOString().split('T')[0];
        return tDateStr === dateStr && 
               Math.abs(Number(t.amount)) === Math.abs(amount) && 
               t.description.toLowerCase() === titleStr.toLowerCase();
      });

      if (isDuplicate) {
        transactions.push({
          originalDate: dateStr, description: titleStr, amount, status: 'DUPLICATE', suggestedCategoryId: null, installment
        });
        continue;
      }

      let matchedCategoryId = null;
      for (const rule of rules) {
        if (titleStr.toLowerCase().includes(rule.pattern.toLowerCase())) {
          matchedCategoryId = rule.categoryId;
          break;
        }
      }

      if (installment && !installment.isInitial) {
        transactions.push({
          originalDate: dateStr, 
          description: titleStr, 
          amount, 
          status: 'NEEDS_CATEGORY', 
          suggestedCategoryId: matchedCategoryId, 
          installment
        });
      } else if (matchedCategoryId) {
        transactions.push({
          originalDate: dateStr, description: titleStr, amount, status: 'READY', suggestedCategoryId: matchedCategoryId, installment
        });
      } else {
        transactions.push({
          originalDate: dateStr, description: titleStr, amount, status: 'NEEDS_CATEGORY', suggestedCategoryId: null, installment
        });
      }
    }
  }

  return transactions;
}

export async function saveImportedTransactionsAction(
  transactions: any[],
  accountId: string,
  selectedMonth: string // <-- NOVO PARÂMETRO QUE VEM DA TELA (ex: "2026-02")
) {
  let correlatedCount = 0;
  let newInstallmentsCount = 0;
  let newSimpleCount = 0;

  // Extrai o Ano e o Mês que você escolheu na tela
  const [selYear, selMonth] = selectedMonth.split('-').map(Number);

  for (const t of transactions) {
    if (t.correlatedId) {
      await prisma.transaction.update({
        where: { id: t.correlatedId },
        data: { accountId: accountId }
      });
      correlatedCount++;
      continue;
    }

    // Pega o dia da compra original no CSV
    const originalParts = t.originalDate.split('-');
    const originalDay = originalParts.length === 3 ? Number(originalParts[2]) : new Date().getDate();

    // A MÁGICA: Monta a data com o Mês/Ano da fatura, mas mantém o Dia da compra
    // Se quiser que seja LITERALMENTE hoje pra tudo, basta trocar essa linha por: const baseDate = new Date();
    const baseDate = new Date(selYear, selMonth - 1, originalDay);

    if (t.installment && t.installment.isInitial && t.installment.total > 1) {
      const { current, total } = t.installment;
      const installmentGroupId = crypto.randomUUID();
      
      for (let i = current; i <= total; i++) {
        const installmentDate = new Date(baseDate);
        installmentDate.setMonth(baseDate.getMonth() + (i - current));

        await prisma.transaction.create({
          data: {
            description: `${t.description} (${i}/${total})`,
            amount: t.amount,
            date: installmentDate, // Usando a data ajustada
            categoryId: t.suggestedCategoryId,
            accountId: accountId,
            type: 'expense', 
            installmentId: installmentGroupId
          }
        });
      }
      newInstallmentsCount++;
    } 
    else {
      await prisma.transaction.create({
        data: {
          description: t.description,
          amount: t.amount,
          date: baseDate, // Usando a data ajustada
          categoryId: t.suggestedCategoryId,
          accountId: accountId,
          type: t.amount < 0 ? 'expense' : 'income', 
          installmentId: t.installmentId || null 
        }
      });
      newSimpleCount++;
    }

    if (t.learned && t.suggestedCategoryId) {
      const existingRule = await prisma.importRule.findFirst({ where: { pattern: t.description } });
      if (!existingRule) {
        await prisma.importRule.create({
          data: { pattern: t.description, categoryId: t.suggestedCategoryId }
        });
      }
    }
  }

  return { correlatedCount, newInstallmentsCount, newSimpleCount };
}