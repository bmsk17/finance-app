// ARQUIVO: src/app/actions/receivables.ts
'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// Função auxiliar para pegar o crachá
async function getUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");
  return (session.user as any).id;
}

// ==============================================================================
// 🤖 ROBÔ DE CONCILIAÇÃO: LÓGICA DE FRONTEIRA (OTIMIZADA E BLINDADA)
// ==============================================================================
export async function autoReconcileDebts(categoryId: string) {
  const userId = await getUserId();
  console.log(`\n🤖 [DEBUG] AUTO-CONCILIAÇÃO (FRONTEIRA) ID: ${categoryId} | User: ${userId}`);

  // 1. Buscamos os TOTAIS direto no banco (Muito rápido, usa índices)
  
  // A. Total que ENTROU de dinheiro (Income)
  const incomeAgg = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { categoryId, type: 'income', userId } // Blindado
  });
  const totalIncome = Number(incomeAgg._sum.amount?.toString() || "0");

  // B. Total que JÁ GASTAMOS pagando contas (Expense + Reimbursed)
  const reimbursedExpenseAgg = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { categoryId, type: 'expense', isReimbursed: true, userId } // Blindado
  });
  const totalReimbursedValue = Math.abs(Number(reimbursedExpenseAgg._sum.amount?.toString() || "0"));

  // 2. Calcula a Diferença (Delta)
  let delta = totalIncome - totalReimbursedValue;

  console.log(`📊 [STATS] Renda Total: ${totalIncome} | Já Marcado: ${totalReimbursedValue} | Delta: ${delta.toFixed(2)}`);

  const EPSILON = 0.01; // Margem para centavos

  if (delta > EPSILON) {
    // === CENÁRIO 1: SOBRA (PAGAR DÍVIDAS VELHAS - FIFO) ===
    console.log(`   💰 Superávit! Buscando contas pendentes...`);

    const unpaidExpenses = await prisma.transaction.findMany({
      where: { categoryId, type: 'expense', isReimbursed: false, userId }, // Blindado
      orderBy: [
        { date: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    for (const expense of unpaidExpenses) {
      const cost = Math.abs(Number(expense.amount));
      const desc = expense.description || "Sem descrição";
      
      if (delta >= cost - EPSILON) {
        await prisma.transaction.updateMany({
          where: { id: expense.id, userId }, // Blindado
          data: { isReimbursed: true }
        });
        console.log(`      ✅ Pagou: ${desc} (R$ ${cost.toFixed(2)})`);
        delta -= cost;
      } else {
        break; 
      }
    }

  } else if (delta < -EPSILON) {
    // === CENÁRIO 2: DÉFICIT (ESTORNO RECENTE - LIFO) ===
    console.log(`   ⚠️ Déficit! Removendo checks das contas mais recentes...`);
    
    let deficit = Math.abs(delta);

    const paidExpenses = await prisma.transaction.findMany({
      where: { categoryId, type: 'expense', isReimbursed: true, userId }, // Blindado
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    for (const expense of paidExpenses) {
      const cost = Math.abs(Number(expense.amount));
      const desc = expense.description || "Sem descrição";

      await prisma.transaction.updateMany({
        where: { id: expense.id, userId }, // Blindado
        data: { isReimbursed: false }
      });
      console.log(`      ❌ Estornou: ${desc} (R$ ${cost.toFixed(2)})`);
      
      deficit -= cost;
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
  const userId = await getUserId();
  console.log(`!!! BUSCANDO DADOS PARA: Mês ${month + 1}/${year} !!!`); 

  const currentMonth = month;
  const currentYear = year;

  const categories = await prisma.category.findMany({
    where: { isThirdParty: true, userId }, // Blindado
    include: { transactions: { orderBy: { date: 'asc' } } } // Como a categoria é do usuário, as transações atreladas também são.
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
  const userId = await getUserId();
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
      accountId,
      userId // Blindado
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
  const userId = await getUserId();
  console.log(`[ACTION] LiquidatePartialDebt Chamado. Valor: ${formData.amount}`);
  
  await prisma.transaction.create({
    data: {
      description: formData.description,
      amount: formData.amount,
      type: 'income',
      date: new Date(),
      categoryId: formData.categoryId,
      accountId: formData.accountId,
      isPaid: true,
      userId // Blindado
    }
  })

  await autoReconcileDebts(formData.categoryId);

  const { revalidatePath } = require("next/cache")
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
  const userId = await getUserId();
  console.log(`[ACTION] LiquidateSpecific (Raio) Chamado. Item: ${description}`);

  // Trocado para findFirst para aceitar userId
  const originalExpense = await prisma.transaction.findFirst({ 
    where: { id: expenseId, userId } 
  });
  
  if (!originalExpense) throw new Error("Transação original não encontrada");

  await prisma.transaction.create({
    data: {
      description: `Reembolso: ${description}`,
      amount: amount,
      type: 'income',
      date: date ? new Date(date) : new Date(),
      categoryId: originalExpense.categoryId,
      accountId: accountId,
      isPaid: true,
      userId // Blindado
    }
  });

  if (originalExpense.categoryId) {
    await autoReconcileDebts(originalExpense.categoryId);
  }

  const { revalidatePath } = require("next/cache")
  revalidatePath('/receivables');
  revalidatePath('/');
}

export async function deleteReceivablePayment(transactionId: string) {
  const userId = await getUserId();
  console.log(`[ACTION] Tentando deletar pagamento ID: ${transactionId}`);
  
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, userId }
  });

  if (!transaction) {
    console.error("Transação não encontrada para deletar.");
    return;
  }

  const categoryId = transaction.categoryId;
  const amount = Number(transaction.amount);

  await prisma.transaction.deleteMany({
    where: { id: transactionId, userId } // Blindado
  });
  console.log(`❌ Pagamento de R$ ${amount} deletado.`);

  if (categoryId) {
    await autoReconcileDebts(categoryId);
  }

  const { revalidatePath } = require("next/cache")
  revalidatePath('/receivables');
  revalidatePath('/');
}

export async function undoReimbursementAction(expenseId: string) {
  const userId = await getUserId();
  await prisma.transaction.updateMany({
    where: { id: expenseId, userId }, // Blindado
    data: { isReimbursed: false }
  });
  const { revalidatePath } = require("next/cache")
  revalidatePath('/receivables');
  revalidatePath('/');
}

// ==============================================================================
// 📊 DASHBOARD METRICS
// ==============================================================================
export async function getReceivablesDashboardMetrics(month: number, year: number) {
  // Try Catch para evitar que a tela principal quebre caso a sessão demore um pouco a carregar
  try {
    const userId = await getUserId();
    
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 1);

    const expensesAllTime = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        userId, // Blindado
        type: 'expense',
        isPaid: true,
        category: { isThirdParty: true }
      }
    });

    const incomeAllTime = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        userId, // Blindado
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
        userId, // Blindado
        type: 'expense',
        isPaid: true,
        category: { isThirdParty: true },
        date: { gte: startDate, lt: endDate }
      }
    });

    const incomeMonth = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        userId, // Blindado
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
  } catch (error) {
    return {
      totalAccumulated: 0,
      totalMonth: 0
    };
  }
}