// ARQUIVO: src/app/page.tsx

import { prisma } from "@/lib/prisma";
import { subMonths, endOfMonth } from "date-fns";
import { checkPendingRecurring } from "@/app/actions/recurring";
import { getReceivablesDashboardMetrics } from "@/app/actions/receivables";
import { DashboardClient } from "@/components/DashboardClient";

// 1. Importamos o "Cofre" para ler a sessão do usuário
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  // 2. VERIFICAÇÃO DE IDENTIDADE: Pegamos o ID do usuário logado
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  const userId = (session.user as any).id;

  const params = await searchParams;
  const today = new Date();

  const month = params.month ? Number(params.month) : today.getMonth();
  const year = params.year ? Number(params.year) : today.getFullYear();

  // 3. DADOS DE COBRANÇA (Vamos blindar essas actions no próximo passo)
  const { totalAccumulated, totalMonth } = await getReceivablesDashboardMetrics(month, year);

  // 4. RECORRÊNCIAS (Vamos blindar essas actions no próximo passo)
  const pendingRecurringRaw = await checkPendingRecurring(month, year);
  const pendingRecurring = pendingRecurringRaw.map((item) => ({
    id: item.id,
    description: item.description,
    day: item.day,
    amount: Number(item.amount),
  }));

  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 1);

  // =========================================================
  // A MÁGICA DA BLINDAGEM: Tudo agora tem `where: { userId }`
  // =========================================================

  // 5. Patrimônio
  const accountsRaw = await prisma.account.findMany({
    where: { userId } // Só pega as SUAS contas
  });
  const initialTotalBalance = accountsRaw.reduce((acc, a) => acc + Number(a.balance), 0);

  const transactionsUntilNow = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { userId, isPaid: true, date: { lte: today } }, // Só as SUAS transações
  });

  const currentTotalBalance = initialTotalBalance + (Number(transactionsUntilNow._sum.amount) || 0);

  const lastMonthEnd = endOfMonth(subMonths(today, 1));
  const transactionsUntilLastMonth = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { userId, isPaid: true, date: { lte: lastMonthEnd } },
  });

  const diff = currentTotalBalance - (initialTotalBalance + (Number(transactionsUntilLastMonth._sum.amount) || 0));

  const endOfMonthH = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

  // 6. Contas (com saldos atualizados)
  const accounts = await Promise.all(
    accountsRaw.map(async (acc) => {
      const agg = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { userId, accountId: acc.id, isPaid: true, date: { lte: endOfMonthH } },
      });
      return {
        ...acc,
        balance: Number(acc.balance),
        currentBalance: Number(acc.balance) + (Number(agg._sum.amount) || 0),
      };
    })
  );

  // 7. Transações do Mês
  const transactions = await prisma.transaction.findMany({
    where: { userId, date: { gte: startDate, lt: endDate } }, // Blindado!
    orderBy: { date: "desc" },
    include: { category: true, account: true },
  });

  const serializedTransactions = transactions.map((t) => ({
    ...t,
    amount: Number(t.amount),
    account: { ...t.account, balance: Number(t.account.balance) },
  }));

  // 8. Stats de Categoria
  const expensesGrouped = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      userId, // Blindado!
      amount: { lt: 0 },
      categoryId: { not: null },
      date: { gte: startDate, lt: endDate },
    },
    _sum: { amount: true },
  });

  const allCategories = await prisma.category.findMany({
    where: { userId } // Blindado!
  });
  
  const categoryStats = expensesGrouped
    .map((stat) => {
      const categoryInfo = allCategories.find((c) => c.id === stat.categoryId);
      return { ...categoryInfo, total: Number(stat._sum.amount) };
    })
    .filter((cat) => 
      cat.name?.toLowerCase() !== "pagamentos" && 
      cat.name?.toLowerCase() !== "pagamento" &&
      cat.name?.toLowerCase() !== "pagamento de fatura"
    )
    .sort((a, b) => a.total - b.total);

  // --- 9. KPIS FINANCEIROS ---

  const totalIncome = transactions
    .filter(t => 
      Number(t.amount) > 0 && 
      t.isPaid && 
      !t.description.startsWith("Receb. de:")
    )
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const myExpenses = transactions
    .filter(t => 
      Number(t.amount) < 0 && 
      t.isPaid && 
      !t.description.startsWith("Transf. para:") && 
      t.category?.isThirdParty === false
    )
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const tpExpenses = transactions
    .filter(t => 
      Number(t.amount) < 0 && 
      t.isPaid && 
      t.category?.isThirdParty === true
    )
    .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);

  const totalOutflow = Math.abs(myExpenses) + tpExpenses;
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