import { prisma } from "@/lib/prisma";
import styles from "./page.module.scss";
import Link from "next/link";
import { MonthSelector } from "@/components/MonthSelector";
import { DeleteButton } from "@/components/DeleteButton";
import { subMonths, endOfMonth } from "date-fns";
import { toggleTransactionStatus } from "@/app/actions/transactions";

// Importações que você já tinha colocado corretamente
import { checkPendingRecurring } from "@/app/actions/recurring";
import { RecurringAlert } from "@/components/RecurringAlert";
import { ExpenseChart } from "@/components/ExpenseChart"; // (Opcional se quiser voltar com o gráfico depois)


export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const today = new Date();

  const month = params.month ? Number(params.month) : today.getMonth();
  const year = params.year ? Number(params.year) : today.getFullYear();
  
 // --- PARTE 1: A LÓGICA (CORRIGIDA DEFINITIVA) ---
  const pendingRecurringRaw = await checkPendingRecurring(month, year);

  // CONVERSÃO E LIMPEZA:
  // Criamos um objeto novo contendo APENAS os campos simples.
  // Isso remove o objeto 'account' e 'category' que contêm outros Decimals (como o saldo).
  const pendingRecurring = pendingRecurringRaw.map(item => ({
    id: item.id,
    description: item.description,
    day: item.day,
    amount: Number(item.amount) 
  }));
  // -
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 1);

  // 1. CÁLCULO PATRIMONIAL
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

  // 2. DADOS DAS CONTAS
  const accounts = await Promise.all(
    accountsRaw.map(async (acc) => {
      const agg = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { accountId: acc.id, isPaid: true, date: { lte: today } },
      });
      return {
        ...acc,
        currentBalance: Number(acc.balance) + (Number(agg._sum.amount) || 0),
      };
    })
  );

  // 3. DADOS DO DASHBOARD
  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: startDate, lt: endDate } },
    orderBy: { date: "desc" },
    include: { category: true, account: true },
  });

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

  const maxExpense =
    categoryStats.length > 0 ? Math.abs(categoryStats[0].total) : 0;

  const totalIncome = transactions
    .filter((t) => Number(t.amount) > 0)
    .reduce((acc, t) => acc + Number(t.amount), 0);
  const totalExpense = transactions
    .filter((t) => Number(t.amount) < 0)
    .reduce((acc, t) => acc + Number(t.amount), 0);
  const monthlyBalance = totalIncome + totalExpense;

  const formatMoney = (val: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  const getKpiColor = (index: number) =>
    [styles.kpiBlue, styles.kpiGreen, styles.kpiPink][index % 3];


  return (
    <main className={styles.wrapper}>
      <div className={styles.topbar}>
        <h1 className={styles.title}>Dashboard</h1>
        <MonthSelector />
        <div className={styles.filters}>
          <Link href="/transactions/new">
            <button className={styles.btnPrimary}>+ Nova Transação</button>
          </Link>
        </div>
      </div>

      {/* SEÇÃO 1: SALDO TOTAL E COMPARATIVO */}
      <section className={styles.patrimonySection}>
        {/* Lista de Contas (Esquerda) */}
        <div>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Minhas Contas</h2>
            <Link href="/accounts/new" style={{ textDecoration: "none" }}>
              <button className={styles.btnAddBank}>+ Banco</button>
            </Link>
          </div>
          <div className={styles.kpiRow}>
            {accounts.map((account, index) => (
              <div
                key={account.id}
                className={`${styles.kpi} ${getKpiColor(index)}`}
              >
                <div className={styles.kpiHeader}>{account.type}</div>
                <div className={styles.kpiValue}>
                  {formatMoney(account.currentBalance)}
                </div>
                <div
                  className={styles.subTitle}
                  style={{ opacity: 0.8, fontSize: "14px" }}
                >
                  {account.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CARD DE EVOLUÇÃO (Direita) */}
        <div className={styles.patrimonyCard}>
          <div className={styles.label}>Patrimônio Total</div>
          <div className={styles.bigValue}>
            {formatMoney(currentTotalBalance)}
          </div>

          <div className={styles.comparisonBox}>
            <p>Em relação ao mês passado:</p>
            <div
              className={`${styles.diffValue} ${
                diff >= 0 ? styles.profit : styles.loss
              }`}
            >
              <span>{diff >= 0 ? "▲" : "▼"}</span>
              <span>
                {diff >= 0 ? "+" : ""} {formatMoney(diff)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* --- PARTE 2: O VISUAL (NOVO) --- */}
      {/* Colocamos aqui para aparecer antes dos números mensais */}
      <RecurringAlert 
        // ADICIONE ESTA LINHA ABAIXO (A MÁGICA 🪄)
        key={`${month}-${year}`} 
        
        pendingExpenses={pendingRecurring} 
        currentMonth={month}
        currentYear={year}
      />
      {/* -------------------------------- */}

      {/* SEÇÃO 2: RESUMO MENSAL */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span>Entradas (Mês)</span>
          <div className={`${styles.value} ${styles.green}`}>
            {formatMoney(totalIncome)}
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>Saídas (Mês)</span>
          <div className={`${styles.value} ${styles.red}`}>
            {formatMoney(totalExpense)}
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>Balanço (Mês)</span>
          <div
            className={`${styles.value} ${
              monthlyBalance >= 0 ? styles.blue : styles.red
            }`}
          >
            {formatMoney(monthlyBalance)}
          </div>
        </div>
      </div>

      {/* SEÇÃO 3: DETALHES */}
      <div className={styles.grid2}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>
            Movimentações de{" "}
            {new Date(year, month).toLocaleString("pt-BR", { month: "long" })}
          </h3>
          <div className={styles.table}>
            <div className={styles.trowHeader}>
              <span>Descrição</span>
              <span>Data</span>
              <span style={{ textAlign: "right" }}>Valor</span>
              <span></span>
            </div>
            {transactions.length === 0 ? (
              <div
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: "#64748b",
                }}
              >
                Nenhuma transação neste mês.
              </div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className={styles.trow}>
                  {/* 1. STATUS */}
                  <form
                    action={toggleTransactionStatus}
                    style={{ display: "flex", alignItems: "center" }}
                  >
                    <input type="hidden" name="id" value={tx.id} />
                    <input
                      type="hidden"
                      name="isPaid"
                      value={String(tx.isPaid)}
                    />

                    <button
                      type="submit"
                      title={
                        tx.isPaid
                          ? "Marcar como pendente"
                          : "Marcar como pago/consolidado"
                      }
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "1.5rem",
                        marginRight: "12px",
                        opacity: tx.isPaid ? 1 : 0.6,
                        transition: "transform 0.2s",
                      }}
                    >
                      {tx.isPaid ? "✅" : "⏳"}
                    </button>
                  </form>

                  {/* 2. Ícone da Categoria + Descrição + Conta */}
                  <div className={styles.trowInfo}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span style={{ fontSize: "1.2rem" }}>
                        {tx.category?.icon || "📄"}
                      </span>
                      <strong>{tx.description}</strong>
                    </div>

                    <span className={styles.trowDetail}>
                      {tx.category?.name} • {tx.account.name}
                      {!tx.isPaid && (
                        <span style={{ color: "#eab308", fontWeight: "bold" }}>
                          {" "}
                          (Planejado)
                        </span>
                      )}
                    </span>
                  </div>

                  {/* 3. Data */}
                  <div className={styles.trowDate}>
                    {new Date(tx.date).toLocaleDateString("pt-BR", {
                      timeZone: "UTC",
                    })}
                  </div>

                  {/* 4. Valor */}
                  <div
                    className={`${styles.trowValue} ${
                      tx.type === "expense" ? styles.expense : styles.income
                    }`}
                  >
                    {tx.type === "expense" ? "-" : "+"}
                    {Number(tx.amount).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </div>

                  {/* 5. Ações */}
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      minWidth: "80px",
                      height: "100%",
                    }}
                  >
                    <Link
                      href={`/transactions/edit/${tx.id}`}
                      style={{
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <button className={styles.editBtn} title="Editar">
                        ✏️
                      </button>
                    </Link>

                    <DeleteButton
                      transactionId={tx.id}
                      installmentId={tx.installmentId}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Gastos do Mês</h3>
          {categoryStats.length === 0 ? (
            <p className="text-gray-400">Nenhuma despesa neste mês.</p>
          ) : (
            <div className={styles.categoryList}>
              {categoryStats.map((cat) => {
                const percentage = Math.round(
                  (Math.abs(cat.total) / maxExpense) * 100
                );
                return (
                  <div key={cat.id} className={styles.categoryItem}>
                    <div className={styles.catHeader}>
                      <span>
                        {cat.icon} {cat.name}
                      </span>
                      <span className={styles.negative}>
                        {formatMoney(cat.total)}
                      </span>
                    </div>
                    <div className={styles.catBarBg}>
                      <div
                        className={styles.catBarFill}
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: cat.color || "#64748b",
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}