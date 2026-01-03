// ARQUIVO: src/app/actions/receivables.ts
'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"


export async function getReceivablesData() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const categories = await prisma.category.findMany({
    where: { isThirdParty: true },
    include: { transactions: { orderBy: { date: 'asc' } } }
  });

  return categories.map(cat => {
    const historyMap: Record<string, { month: string, debt: number, paid: number }> = {};
    let totalSpent = 0;
    let totalPaid = 0;
    
    // Novas variáveis para calcular o saldo líquido do mês atual
    let monthExpenses = 0;
    let monthIncomes = 0;

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
        // Se for deste mês, soma ao montante de despesas do mês
        if (isCurrentMonth) monthExpenses += absAmount; 
      } else {
        totalPaid += amount;
        historyMap[monthKey].paid += amount;
        // Se for deste mês, soma ao montante de reembolsos do mês
        if (isCurrentMonth) monthIncomes += amount; 
      }
    });

    return {
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color ?? undefined,
      // ALTERAÇÃO: Agora o monthDebt é o saldo real (Gasto - Pago) do mês
      // Usamos Math.max(0, ...) para evitar valores negativos no Dashboard
      monthDebt: Math.max(0, monthExpenses - monthIncomes), 
      totalAccumulated: totalSpent - totalPaid,
      chartData: Object.values(historyMap).map(item => ({ ...item, balance: item.debt - item.paid })),
      allTransactions: cat.transactions.map(t => ({ ...t, amount: Number(t.amount) })).reverse(),
      currentMonthTransactions: cat.transactions
        .filter(t => {
          const d = new Date(t.date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .map(t => ({ ...t, amount: Number(t.amount) }))
    };
  }).filter(s => s.totalAccumulated > 0 || s.monthDebt > 0);
}

export async function liquidateDebt(formData: FormData) {
  const categoryId = formData.get("categoryId") as string
  const accountId = formData.get("accountId") as string
  const amount = Number(formData.get("amount"))
  const personName = formData.get("personName") as string

  if (!categoryId || !accountId || !amount) return

  await prisma.transaction.create({
    data: {
      description: `Recebimento: ${personName}`,
      amount: amount, // Valor positivo (entrada)
      type: 'income',
      date: new Date(),
      isPaid: true,
      categoryId,
      accountId
    }
  })

  // Revalidar para atualizar o painel e o dashboard
  const { revalidatePath } = require("next/cache")
  revalidatePath("/receivables")
  revalidatePath("/")
}


export async function getPersonDetails(categoryId: string) {
  const transactions = await prisma.transaction.findMany({
    where: { categoryId },
    orderBy: { date: 'asc' },
  });

  // Agrupamento por mês para o Gráfico
  const historyMap: Record<string, { month: string, debt: number, paid: number }> = {};

  transactions.forEach(t => {
    const date = new Date(t.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!historyMap[monthKey]) {
      historyMap[monthKey] = { 
        month: monthKey, 
        debt: 0, 
        paid: 0 
      };
    }

    const amount = Number(t.amount);
    if (amount < 0) {
      historyMap[monthKey].debt += Math.abs(amount);
    } else {
      historyMap[monthKey].paid += amount;
    }
  });

  // Transforma o objeto em array ordenado para o Recharts
  const chartData = Object.values(historyMap).map(item => ({
    ...item,
    // Saldo acumulado do mês (Dívida - Pago)
    balance: item.debt - item.paid
  }));

  return {
    chartData,
    allTransactions: transactions.map(t => ({
      ...t,
      amount: Number(t.amount)
    }))
  };
}

export async function liquidatePartialDebt(formData: {
  categoryId: string,
  accountId: string,
  amount: number,
  description: string
}) {
  // 1. Registra a entrada no banco de dados
  await prisma.transaction.create({
    data: {
      description: formData.description,
      amount: formData.amount, // Valor positivo (entrada)
      type: 'income',
      date: new Date(),
      categoryId: formData.categoryId,
      accountId: formData.accountId,
      isPaid: true
    }
  })

  // 2. Revalida as rotas para atualizar os gráficos e cards instantaneamente
  revalidatePath('/receivables')
  revalidatePath('/accounts')
  revalidatePath('/')
}

export async function liquidateSpecificTransaction(
  expenseId: string,
  accountId: string,
  amount: number,
  description: string,
  date?: string // NOVA DATA OPCIONAL
) {
  const originalExpense = await prisma.transaction.findUnique({
    where: { id: expenseId }
  });

  if (!originalExpense) throw new Error("Transação original não encontrada");

  await prisma.$transaction([
    prisma.transaction.create({
      data: {
        description: `Reembolso: ${description}`,
        amount: amount,
        type: 'income',
        date: date ? new Date(date) : new Date(), // Usa a data escolhida ou HOJE
        categoryId: originalExpense.categoryId,
        accountId: accountId,
        isPaid: true
      }
    }),
    prisma.transaction.update({
      where: { id: expenseId },
      data: { isReimbursed: true }
    })
  ]);

  revalidatePath('/receivables');
  revalidatePath('/');
}

// NOVA FUNÇÃO: Para quando você quiser "Desfazer" o Check (✅)
export async function undoReimbursementAction(expenseId: string) {
  await prisma.transaction.update({
    where: { id: expenseId },
    data: { isReimbursed: false }
  });
  revalidatePath('/receivables');
  revalidatePath('/');
}