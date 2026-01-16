// ARQUIVO: src/app/page.tsx

import { prisma } from "@/lib/prisma";
import { subMonths, endOfMonth } from "date-fns";
import { checkPendingRecurring } from "@/app/actions/recurring";
import { getReceivablesDashboardMetrics } from "@/app/actions/receivables";
import { DashboardClient } from "@/components/DashboardClient";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const today = new Date();

  const month = params.month ? Number(params.month) : today.getMonth();
  const year = params.year ? Number(params.year) : today.getFullYear();

  // 1. DADOS DE COBRANÇA
  const { totalAccumulated, totalMonth } = await getReceivablesDashboardMetrics(month, year);

  // 2. Recorrências
  const pendingRecurringRaw = await checkPendingRecurring(month, year);
  const pendingRecurring = pendingRecurringRaw.map((item) => ({
    id: item.id,
    description: item.description,
    day: item.day,
    amount: Number(item.amount),
  }));

  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 1);

  // 3. Patrimônio
  const accountsRaw = await prisma.account.findMany();
  const initialTotalBalance = accountsRaw.reduce((acc, a) => acc + Number(a.balance), 0);

  const transactionsUntilNow = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { isPaid: true, date: { lte: today }, },
  });
  const currentTotalBalance = initialTotalBalance + (Number(transactionsUntilNow._sum.amount) || 0);

  const lastMonthEnd = endOfMonth(subMonths(today, 1));
  const transactionsUntilLastMonth = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { isPaid: true, date: { lte: lastMonthEnd } },
  });
  const diff = currentTotalBalance - (initialTotalBalance + (Number(transactionsUntilLastMonth._sum.amount) || 0));

  // 4. Contas
  const accounts = await Promise.all(
    accountsRaw.map(async (acc) => {
      const agg = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { accountId: acc.id, isPaid: true, date: { lte: today } },
      });
      return {
        ...acc,
        balance: Number(acc.balance),
        currentBalance: Number(acc.balance) + (Number(agg._sum.amount) || 0),
      };
    })
  );

  // 5. Transações
  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: startDate, lt: endDate } },
    orderBy: { date: "desc" },
    include: { category: true, account: true },
  });

  const serializedTransactions = transactions.map((t) => ({
    ...t,
    amount: Number(t.amount),
    account: { ...t.account, balance: Number(t.account.balance) },
  }));

  // 6. Stats de Categoria
  const expensesGrouped = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      amount: { lt: 0 },
      categoryId: { not: null },
      date: { gte: startDate, lt: endDate },
    },
    _sum: { amount: true },
  });
  const allCategories = await prisma.category.findMany();
  const categoryStats = expensesGrouped
    .map((stat) => {
      const categoryInfo = allCategories.find((c) => c.id === stat.categoryId);
      return { ...categoryInfo, total: Number(stat._sum.amount) };
    })
    .sort((a, b) => a.total - b.total)
    .slice(0, 5);

  // --- 7. KPIS FINANCEIROS ---

  // A: ENTRADAS TOTAIS
  const totalIncome = transactions
    .filter(t => 
      Number(t.amount) > 0 && 
      t.isPaid && 
      !t.description.startsWith("Receb. de:")
    )
    .reduce((acc, t) => acc + Number(t.amount), 0);

  // B: MEUS GASTOS (Pessoal)
  const myExpenses = transactions
    .filter(t => 
      Number(t.amount) < 0 && 
      t.isPaid && 
      !t.description.startsWith("Transf. para:") && 
      t.category?.isThirdParty === false
    )
    .reduce((acc, t) => acc + Number(t.amount), 0);

  // C: GASTOS DE TERCEIROS
  const tpExpenses = transactions
    .filter(t => 
      Number(t.amount) < 0 && 
      t.isPaid && 
      t.category?.isThirdParty === true
    )
    .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);

  // --- NOVO CÁLCULO: SAÍDA TOTAL DO CAIXA ---
  // (Seus gastos pessoais + O que você pagou para terceiros)
  const totalOutflow = Math.abs(myExpenses) + tpExpenses;

  // D: FLUXO DE CAIXA LÍQUIDO
  const monthlyBalance = totalIncome - totalOutflow;

  return (
    <DashboardClient
      accounts={accounts}
      transactions={serializedTransactions}
      categoryStats={categoryStats}
      pendingRecurring={pendingRecurring}
      month={month}
      year={year}
      kpis={{
        totalIncome,
        totalExpense: myExpenses,
        totalOutflow, 
        receivablesMonth: totalMonth,
        receivablesTotal: totalAccumulated,
        monthlyBalance,
        currentTotalBalance,
        diff,
      }}
    />
  );
}