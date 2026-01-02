// ARQUIVO: src/app/page.tsx

import { prisma } from "@/lib/prisma";
import { subMonths, endOfMonth } from "date-fns";
import { checkPendingRecurring } from "@/app/actions/recurring";
// Importamos nosso novo componente CLIENTE
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

  // --- BUSCA DE DADOS (SERVER SIDE) ---

  // 1. Recorrências Pendentes
  const pendingRecurringRaw = await checkPendingRecurring(month, year);
  const pendingRecurring = pendingRecurringRaw.map((item) => ({
    id: item.id,
    description: item.description,
    day: item.day,
    amount: Number(item.amount),
  }));

  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 1);

  // 2. Cálculo Patrimonial
  const accountsRaw = await prisma.account.findMany();
  const initialTotalBalance = accountsRaw.reduce(
    (acc, account) => acc + Number(account.balance),
    0
  );

  const transactionsUntilNow = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { isPaid: true, date: { lte: today } },
  });
  const currentTotalBalance =
    initialTotalBalance + (Number(transactionsUntilNow._sum.amount) || 0);

  const lastMonthEnd = endOfMonth(subMonths(today, 1));
  const transactionsUntilLastMonth = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { isPaid: true, date: { lte: lastMonthEnd } },
  });
  const lastMonthTotalBalance =
    initialTotalBalance + (Number(transactionsUntilLastMonth._sum.amount) || 0);
  const diff = currentTotalBalance - lastMonthTotalBalance;

  // 3. Dados das Contas Individuais
  const accounts = await Promise.all(
    accountsRaw.map(async (acc) => {
      const agg = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { accountId: acc.id, isPaid: true, date: { lte: today } },
      });
      return {
        ...acc,
        balance: Number(acc.balance), // Serialização segura
        currentBalance: Number(acc.balance) + (Number(agg._sum.amount) || 0),
      };
    })
  );
  

  // 4. Transações do Mês (DADOS COMPLETOS PARA O CLIENTE FILTRAR)
  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: startDate, lt: endDate } },
    orderBy: { date: "desc" },
    include: { category: true, account: true },
  });

  // Convertemos Decimal para Number para o Client Component não reclamar
  const serializedTransactions = transactions.map((t) => ({
    ...t,
    amount: Number(t.amount),
    account: {
      ...t.account,
      balance: Number(t.account.balance), // <--- O PULO DO GATO ESTAVA AQUI
    },
  }));

  // 5. Estatísticas por Categoria (Lógica de agrupamento continua aqui para eficiência)
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
      return {
        ...categoryInfo,
        total: Number(stat._sum.amount),
      };
    })
    .sort((a, b) => a.total - b.total)
    .slice(0, 5); // Top 5 gastos

  // 6. KPIs do Mês (Lógica de Reembolso/Terceiros)

  // A: Entradas Reais (Seu salário, etc - Ignora transferências)
  const totalIncome = transactions
    .filter(
      (t) =>
        Number(t.amount) > 0 &&
        t.isPaid &&
        !t.description.startsWith("Receb. de:")
    )
    .reduce((acc, t) => acc + Number(t.amount), 0);

  // B: Meus Gastos (Apenas o que NÃO é categoria de terceiros)
  // Filtramos: é despesa, está pago, NÃO é transferência E a categoria NÃO é de terceiros
  const myExpenses = transactions
    .filter(
      (t) =>
        Number(t.amount) < 0 &&
        t.isPaid &&
        !t.description.startsWith("Transf. para:") &&
        t.category?.isThirdParty === false // Filtra apenas o que é seu gasto real
    )
    .reduce((acc, t) => acc + Number(t.amount), 0);

  // C: A Receber (Gastos dos outros no seu cartão)
  // Pegamos apenas o que foi gasto em categorias marcadas como de terceiros
  const receivables = transactions
    .filter(
      (t) =>
        Number(t.amount) < 0 && t.isPaid && t.category?.isThirdParty === true // Identifica o que é empréstimo/reembolso
    )
    .reduce((acc, t) => acc + Number(t.amount), 0);

  // D: Balanço Mensal Real (Fluxo de Caixa)
  // Soma-se todas as saídas (suas + terceiros) porque o dinheiro saiu da sua conta real
  const totalOut = myExpenses + receivables;

  const monthlyBalance = totalIncome + totalOut;

  // --- RENDERIZA O COMPONENTE CLIENTE ---
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
        totalExpense: myExpenses, // Passamos apenas SEUS gastos para o card vermelho
        receivables: Math.abs(receivables), // Passamos o valor positivo para o novo card
        monthlyBalance,
        currentTotalBalance,
        diff,
      }}
    />
  );
}
