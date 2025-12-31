// ARQUIVO: src/app/actions/projections.ts
'use server'

import { prisma } from "@/lib/prisma"

export async function getProjectionData() {
  const today = new Date();

  // 1. Saldo Atual de todas as contas (Ponto de Partida)
  const accounts = await prisma.account.findMany();
  
  // Calculamos o saldo REAL atual (Saldo Inicial + Transações passadas e pagas)
  const balances = await Promise.all(accounts.map(async (acc) => {
    const agg = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { accountId: acc.id, isPaid: true, date: { lte: today } }
    });
    return Number(acc.balance) + (Number(agg._sum.amount) || 0);
  }));

  const totalCurrentBalance = balances.reduce((a, b) => a + b, 0);

  // 2. Despesas/Receitas Fixas (Recorrências)
  const recurring = await prisma.recurringExpense.findMany();

  // 3. Parcelas Futuras (Transações reais já cadastradas com data > hoje)
  // Trazemos transações futuras mesmo que não sejam parceladas (agendamentos)
  const futureTransactions = await prisma.transaction.findMany({
    where: {
      date: { gt: today }, // Apenas futuro
    },
    select: {
      date: true,
      amount: true,
      description: true,
      type: true
    },
    orderBy: { date: 'asc' }
  });

  return {
    startBalance: totalCurrentBalance,
    recurring: recurring.map(r => ({
      ...r,
      amount: Number(r.amount)
    })),
    futureTransactions: futureTransactions.map(t => ({
      ...t,
      amount: Number(t.amount)
    }))
  };
}