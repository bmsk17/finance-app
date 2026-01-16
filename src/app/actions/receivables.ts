// ARQUIVO: src/app/actions/receivables.ts
'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

// ==============================================================================
// 🤖 ROBÔ DE CONCILIAÇÃO: LÓGICA DE FRONTEIRA (OTIMIZADA)
// ==============================================================================
export async function autoReconcileDebts(categoryId: string) {
  console.log(`\n🤖 [DEBUG] AUTO-CONCILIAÇÃO (FRONTEIRA) ID: ${categoryId}`);

  // 1. Buscamos os TOTAIS direto no banco (Muito rápido, usa índices)
  
  // A. Total que ENTROU de dinheiro (Income)
  const incomeAgg = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { categoryId, type: 'income' }
  });
  const totalIncome = Number(incomeAgg._sum.amount?.toString() || "0");

  // B. Total que JÁ GASTAMOS pagando contas (Expense + Reimbursed)
  const reimbursedExpenseAgg = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { categoryId, type: 'expense', isReimbursed: true }
  });
  const totalReimbursedValue = Math.abs(Number(reimbursedExpenseAgg._sum.amount?.toString() || "0"));

  // 2. Calcula a Diferença (Delta)
  // Delta > 0: Tem dinheiro livre no pote.
  // Delta < 0: O pote estourou (Estorno necessário).
  let delta = totalIncome - totalReimbursedValue;

  console.log(`📊 [STATS] Renda Total: ${totalIncome} | Já Marcado: ${totalReimbursedValue} | Delta: ${delta.toFixed(2)}`);

  const EPSILON = 0.01; // Margem para centavos

  if (delta > EPSILON) {
    // === CENÁRIO 1: SOBRA (PAGAR DÍVIDAS VELHAS - FIFO) ===
    console.log(`   💰 Superávit! Buscando contas pendentes...`);

    // Busca APENAS o que falta pagar. O histórico de 10 anos atrás fica quieto no banco.
    // Ordenação: Data Ascendente (Antigo -> Novo) + Criação Ascendente (Desempate)
    const unpaidExpenses = await prisma.transaction.findMany({
      where: { categoryId, type: 'expense', isReimbursed: false },
      orderBy: [
        { date: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    for (const expense of unpaidExpenses) {
      const cost = Math.abs(Number(expense.amount));
      const desc = expense.description || "Sem descrição";
      
      if (delta >= cost - EPSILON) {
        await prisma.transaction.update({
          where: { id: expense.id },
          data: { isReimbursed: true }
        });
        console.log(`      ✅ Pagou: ${desc} (R$ ${cost.toFixed(2)})`);
        delta -= cost;
      } else {
        // O dinheiro acabou no meio da fila.
        break; 
      }
    }

  } else if (delta < -EPSILON) {
    // === CENÁRIO 2: DÉFICIT (ESTORNO RECENTE - LIFO) ===
    console.log(`   ⚠️ Déficit! Removendo checks das contas mais recentes...`);
    
    let deficit = Math.abs(delta);

    // Busca APENAS o que foi pago recentemente.
    // Ordenação: Data Descendente (Novo -> Antigo) + Criação Descendente
    const paidExpenses = await prisma.transaction.findMany({
      where: { categoryId, type: 'expense', isReimbursed: true },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    for (const expense of paidExpenses) {
      const cost = Math.abs(Number(expense.amount));
      const desc = expense.description || "Sem descrição";

      // Remove o check para cobrir o rombo
      await prisma.transaction.update({
        where: { id: expense.id },
        data: { isReimbursed: false }
      });
      console.log(`      ❌ Estornou: ${desc} (R$ ${cost.toFixed(2)})`);
      
      deficit -= cost;

      // Se já recuperamos o suficiente, paramos de estornar.
      if (deficit <= EPSILON) break;
    }

  } else {
    console.log(`   🆗 Tudo sincronizado.`);
  }
}

// ==============================================================================
// 🔍 FUNÇÃO DE LEITURA
// ==============================================================================
export async function getReceivablesData(month: number, year: number) {
  console.log(`!!! BUSCANDO DADOS PARA: Mês ${month + 1}/${year} !!!`); 

  const currentMonth = month;
  const currentYear = year;

  const categories = await prisma.category.findMany({
    where: { isThirdParty: true },
    include: { transactions: { orderBy: { date: 'asc' } } }
  });

  return categories.map(cat => {
    const historyMap: Record<string, { month: string, debt: number, paid: number }> = {};
    let totalSpent = 0;
    let totalPaid = 0;
    let currentMonthExpenses = 0;
    let currentMonthIncomes = 0;

    cat.transactions.forEach(t => {
      const d = new Date(t.date);
      const amount = Number(t.amount);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const isCurrentMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear;

      if (!historyMap[monthKey]) historyMap[monthKey] = { month: monthKey, debt: 0, paid: 0 };
      
      if (amount < 0) {
        const absAmount = Math.abs(amount);
        totalSpent += absAmount;
        historyMap[monthKey].debt += absAmount;
        if (isCurrentMonth) currentMonthExpenses += absAmount;
      } else {
        totalPaid += amount;
        historyMap[monthKey].paid += amount;
        if (isCurrentMonth) currentMonthIncomes += amount;
      }
    });

    const realMonthDebt = Math.max(0, currentMonthExpenses - currentMonthIncomes);
    const totalAccumulated = Math.max(0, totalSpent - totalPaid);

    return {
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color ?? undefined,
      monthDebt: realMonthDebt,
      totalAccumulated: totalAccumulated,
      chartData: Object.values(historyMap).map(item => ({ ...item, balance: item.debt - item.paid })),
      lastTransactions: cat.transactions.slice(-3).map(t => ({ ...t, amount: Number(t.amount) })).reverse(),
      allTransactions: cat.transactions.map(t => ({ ...t, amount: Number(t.amount) })).reverse(),
      currentMonthTransactions: cat.transactions
        .filter(t => {
          const d = new Date(t.date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .map(t => ({ ...t, amount: Number(t.amount) }))
    };
  }).filter(s => s.totalAccumulated > 0 || s.monthDebt > 0 || s.currentMonthTransactions.length > 0);
}

// ==============================================================================
// ⚡ AÇÕES DE ESCRITA
// ==============================================================================

export async function liquidateDebt(formData: FormData) {
  const categoryId = formData.get("categoryId") as string
  const accountId = formData.get("accountId") as string
  const amount = Number(formData.get("amount"))
  const personName = formData.get("personName") as string

  if (!categoryId || !accountId || !amount) return

  console.log(`[ACTION] LiquidateDebt Chamado. Valor: ${amount}`);

  await prisma.transaction.create({
    data: {
      description: `Recebimento: ${personName}`,
      amount: amount,
      type: 'income',
      date: new Date(),
      isPaid: true,
      categoryId,
      accountId
    }
  })

  await autoReconcileDebts(categoryId);

  const { revalidatePath } = require("next/cache")
  revalidatePath("/receivables")
  revalidatePath("/")
}

export async function liquidatePartialDebt(formData: {
  categoryId: string,
  accountId: string,
  amount: number,
  description: string
}) {
  console.log(`[ACTION] LiquidatePartialDebt Chamado. Valor: ${formData.amount}`);
  
  await prisma.transaction.create({
    data: {
      description: formData.description,
      amount: formData.amount,
      type: 'income',
      date: new Date(),
      categoryId: formData.categoryId,
      accountId: formData.accountId,
      isPaid: true
    }
  })

  await autoReconcileDebts(formData.categoryId);

  revalidatePath('/receivables')
  revalidatePath('/accounts')
  revalidatePath('/')
}

export async function liquidateSpecificTransaction(
  expenseId: string,
  accountId: string,
  amount: number,
  description: string,
  date?: string
) {
  console.log(`[ACTION] LiquidateSpecific (Raio) Chamado. Item: ${description}`);

  const originalExpense = await prisma.transaction.findUnique({ where: { id: expenseId } });
  if (!originalExpense) throw new Error("Transação original não encontrada");

  await prisma.transaction.create({
    data: {
      description: `Reembolso: ${description}`,
      amount: amount,
      type: 'income',
      date: date ? new Date(date) : new Date(),
      categoryId: originalExpense.categoryId,
      accountId: accountId,
      isPaid: true
    }
  });

  if (originalExpense.categoryId) {
    await autoReconcileDebts(originalExpense.categoryId);
  }

  revalidatePath('/receivables');
  revalidatePath('/');
}

export async function deleteReceivablePayment(transactionId: string) {
  console.log(`[ACTION] Tentando deletar pagamento ID: ${transactionId}`);
  
  // 1. Antes de apagar, descobrimos de quem é esse dinheiro
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId }
  });

  if (!transaction) {
    console.error("Transação não encontrada para deletar.");
    return;
  }

  const categoryId = transaction.categoryId;
  const amount = Number(transaction.amount);

  // 2. Apagamos o pagamento
  await prisma.transaction.delete({
    where: { id: transactionId }
  });
  console.log(`❌ Pagamento de R$ ${amount} deletado.`);

  // 3. AVISAMOS O ROBÔ
  if (categoryId) {
    await autoReconcileDebts(categoryId);
  }

  revalidatePath('/receivables');
  revalidatePath('/');
}

export async function undoReimbursementAction(expenseId: string) {
  await prisma.transaction.update({
    where: { id: expenseId },
    data: { isReimbursed: false }
  });
  revalidatePath('/receivables');
  revalidatePath('/');
}

// ==============================================================================
// 📊 DASHBOARD METRICS
// ==============================================================================
export async function getReceivablesDashboardMetrics(month: number, year: number) {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 1);

  const expensesAllTime = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: {
      type: 'expense',
      isPaid: true,
      category: { isThirdParty: true }
    }
  });

  const incomeAllTime = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: {
      type: 'income',
      isPaid: true,
      category: { isThirdParty: true }
    }
  });

  const totalDebt = Math.abs(Number(expensesAllTime._sum.amount || 0));
  const totalPaid = Number(incomeAllTime._sum.amount || 0);
  const totalAccumulated = Math.max(0, totalDebt - totalPaid);

  const expensesMonth = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: {
      type: 'expense',
      isPaid: true,
      category: { isThirdParty: true },
      date: { gte: startDate, lt: endDate }
    }
  });

  const incomeMonth = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: {
      type: 'income',
      isPaid: true,
      category: { isThirdParty: true },
      date: { gte: startDate, lt: endDate }
    }
  });

  const monthDebtVal = Math.abs(Number(expensesMonth._sum.amount || 0));
  const monthPaidVal = Number(incomeMonth._sum.amount || 0);
  const totalMonth = Math.max(0, monthDebtVal - monthPaidVal);

  return {
    totalAccumulated,
    totalMonth
  };
}