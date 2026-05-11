// ARQUIVO: src/app/actions/projections.ts
'use server'

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// Função auxiliar para pegar o crachá do usuário logado
async function getUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");
  return (session.user as any).id;
}

export async function getProjectionData() {
  const userId = await getUserId(); // <--- BLINDAGEM APLICADA
  const today = new Date();

  // 1. Saldo Atual de todas as contas (Ponto de Partida) - BLINDADO
  const accounts = await prisma.account.findMany({
    where: { userId }
  });
  
  // Calculamos o saldo REAL atual (Saldo Inicial + Transações passadas e pagas) - BLINDADO
  const balances = await Promise.all(accounts.map(async (acc) => {
    const agg = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { accountId: acc.id, isPaid: true, date: { lte: today }, userId }
    });
    return Number(acc.balance) + (Number(agg._sum.amount) || 0);
  }));

  const totalCurrentBalance = balances.reduce((a, b) => a + b, 0);

  // 2. Despesas/Receitas Fixas (Recorrências) - BLINDADO
  const recurring = await prisma.recurringExpense.findMany({
    where: { userId }
  });

  // 3. Parcelas Futuras (Transações reais já cadastradas com data > hoje) - BLINDADO
  const futureTransactions = await prisma.transaction.findMany({
    where: {
      date: { gt: today }, // Apenas futuro
      userId
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