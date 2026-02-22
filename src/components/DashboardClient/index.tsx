// ARQUIVO: src/components/DashboardClient.tsx

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import styles from "@/app/page.module.scss"; 
import { MonthSelector } from "@/components/MonthSelector";
import { DeleteButton } from "@/components/DeleteButton";
import { RecurringAlert } from "@/components/RecurringAlert";
import { toggleTransactionStatus, toggleAllVisibleTransactions } from "@/app/actions/transactions"; 

interface DashboardProps {
  accounts: any[];
  transactions: any[];
  categoryStats: any[];
  kpis: {
    totalIncome: number;
    totalExpense: number;
    totalOutflow: number;
    receivablesMonth: number;
    receivablesTotal: number;
    monthlyBalance: number;
    currentTotalBalance: number;
    diff: number;
  };
  pendingRecurring: any[];
  month: number;
  year: number;
}

export function DashboardClient({
  accounts,
  transactions,
  categoryStats,
  kpis,
  pendingRecurring,
  month,
  year,
}: DashboardProps) {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  }>({
    key: "date",
    direction: "desc",
  });

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isTogglingBulk, setIsTogglingBulk] = useState(false);

  const [showMyExpenses, setShowMyExpenses] = useState(true);
  const [showThirdParty, setShowThirdParty] = useState(true);

  const filteredAndSortedTransactions = useMemo(() => {
    let result = [...transactions];

    if (selectedCategory) {
      result = result.filter((t) => t.categoryId === selectedCategory);
    }

    result.sort((a, b) => {
      let valA: any = a[sortConfig.key];
      let valB: any = b[sortConfig.key];

      if (sortConfig.key === "amount") {
        valA = Number(valA);
        valB = Number(valB);
      } else if (sortConfig.key === "date") {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      } else if (sortConfig.key === "description") {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [transactions, sortConfig, selectedCategory]);

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    const isActive = sortConfig.key === key;
    const icon = isActive ? (sortConfig.direction === "asc" ? "▲" : "▼") : "⇅";
    return (
      <span style={{ display: "inline-block", width: "18px", textAlign: "center", opacity: isActive ? 1 : 0.2, marginLeft: "4px" }}>
        {icon}
      </span>
    );
  };

  const formatMoney = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const getKpiColor = (index: number) =>
    [styles.kpiBlue, styles.kpiGreen, styles.kpiPink][index % 3];

  const hasPending = filteredAndSortedTransactions.some(tx => !tx.isPaid); 
  
  const handleToggleBulk = async () => {
    if (filteredAndSortedTransactions.length === 0) return;
    setIsTogglingBulk(true);
    
    const ids = filteredAndSortedTransactions.map(t => t.id);
    const nextStatus = hasPending ? true : false; 

    try {
      await toggleAllVisibleTransactions(ids, nextStatus);
    } catch (error) {
      console.error("Erro ao atualizar em lote", error);
    } finally {
      setIsTogglingBulk(false);
    }
  };

  const myCategories = categoryStats.filter(c => !c.isThirdParty);
  const thirdPartyCategories = categoryStats.filter(c => c.isThirdParty);

  const myCategoriesTotal = myCategories.reduce((acc, c) => acc + c.total, 0);
  const thirdPartyTotal = thirdPartyCategories.reduce((acc, c) => acc + c.total, 0);
  
  const maxValGlobal = categoryStats.reduce((max, cat) => Math.max(max, Math.abs(cat.total)), 0);

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

      <section className={styles.patrimonySection}>
        <div>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Minhas Contas</h2>
            <Link href="/accounts/new" style={{ textDecoration: "none" }}>
              <button className={styles.btnAddBank}>+ Banco</button>
            </Link>
          </div>
          <div className={styles.kpiRow}>
            {accounts.map((account, index) => (
              <div key={account.id} className={`${styles.kpi} ${getKpiColor(index)}`}>
                <div className={styles.kpiHeader}>{account.type}</div>
                <div className={styles.kpiValue}>{formatMoney(account.currentBalance)}</div>
                <div className={styles.subTitle} style={{ opacity: 0.8, fontSize: "14px" }}>
                  {account.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.patrimonyCard}>
          <div className={styles.label}>Patrimônio Total</div>
          <div className={styles.bigValue}>{formatMoney(kpis.currentTotalBalance)}</div>
          <div className={styles.comparisonBox}>
            <p>Em relação ao mês passado:</p>
            <div className={`${styles.diffValue} ${kpis.diff >= 0 ? styles.profit : styles.loss}`}>
              <span>{kpis.diff >= 0 ? "▲" : "▼"}</span>
              <span>{kpis.diff >= 0 ? "+" : ""} {formatMoney(kpis.diff)}</span>
            </div>
          </div>
        </div>
      </section>

      <RecurringAlert
        key={`${month}-${year}`}
        pendingExpenses={pendingRecurring}
        currentMonth={month}
        currentYear={year}
      />

      <div className={styles.summaryGrid}>
        
        <div className={styles.summaryCard}>
          <span>Entradas (Mês)</span>
          <div className={`${styles.value} ${styles.green}`}>
            {formatMoney(kpis.totalIncome)}
          </div>
        </div>

        <div className={styles.summaryCard}>
          <span>Meus Gastos</span>
          <div className={`${styles.value} ${styles.red}`}>
            {formatMoney(kpis.totalExpense)}
          </div>
          <div style={{ fontSize: "0.85rem", color: "#888", marginTop: "4px" }}>
            Saída Total: {formatMoney(kpis.totalOutflow)}
          </div>
        </div>

        <div className={styles.summaryCard}>
          <span>A Receber (Total)</span>
          <div className={styles.value} style={{ color: "#d97706" }}>
            {formatMoney(kpis.receivablesTotal)}
          </div>
          <div style={{ fontSize: "0.85rem", color: "#888", marginTop: "4px" }}>
            Do mês: {formatMoney(kpis.receivablesMonth)}
          </div>
        </div>

        <div className={styles.summaryCard}>
          <span>Fluxo de Caixa</span>
          <div className={`${styles.value} ${kpis.monthlyBalance >= 0 ? styles.blue : styles.red}`}>
            {formatMoney(kpis.monthlyBalance)}
          </div>
        </div>
        
      </div>

      <div className={styles.grid2}>
        <div className={styles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 className={styles.cardTitle} style={{ marginBottom: 0 }}>
              Movimentações de {new Date(year, month).toLocaleString("pt-BR", { month: "long" })}
            </h3>
            {selectedCategory && (
              <button onClick={() => setSelectedCategory(null)} style={{ background: "#ef444420", color: "#ef4444", border: "none", padding: "4px 12px", borderRadius: "12px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "bold" }}>
                ✕ Limpar Filtro
              </button>
            )}
          </div>

          <div className={styles.table}>
            <div className={styles.trowHeader} style={{ display: 'flex', alignItems: 'center' }}>
              
              <div style={{ marginRight: '16px', display: 'flex', alignItems: 'center' }}>
                <button 
                  onClick={handleToggleBulk}
                  disabled={isTogglingBulk || filteredAndSortedTransactions.length === 0}
                  title={hasPending ? "Marcar tudo como pago" : "Marcar tudo como pendente"}
                  style={{ 
                    background: "transparent", 
                    border: "none", 
                    cursor: "pointer", 
                    fontSize: "1.4rem", 
                    opacity: isTogglingBulk ? 0.3 : 1,
                    transition: "transform 0.2s"
                  }}
                >
                  {hasPending ? "⏳" : "✅"}
                </button>
              </div>
              
              <span onClick={() => requestSort("description")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>Descrição {getSortIcon("description")}</span>
              <span onClick={() => requestSort("date")} style={{ cursor: "pointer", width: "100px", textAlign: "center", display: "flex", justifyContent: "center", alignItems: "center", gap: "4px", marginLeft: 'auto' }}>Data {getSortIcon("date")}</span>
              <span onClick={() => requestSort("amount")} style={{ cursor: "pointer", width: "120px", textAlign: "right", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "4px" }}>Valor {getSortIcon("amount")}</span>
              <span style={{ width: '80px' }}></span>
            </div>

            {filteredAndSortedTransactions.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                {selectedCategory ? "Nenhuma transação nesta categoria." : "Nenhuma transação neste mês."}
              </div>
            ) : (
              filteredAndSortedTransactions.map((tx) => (
                <div key={tx.id} className={styles.trow}>
                  <form action={toggleTransactionStatus} style={{ display: "flex", alignItems: "center" }}>
                    <input type="hidden" name="id" value={tx.id} />
                    <input type="hidden" name="isPaid" value={String(tx.isPaid)} />
                    <button type="submit" title={tx.isPaid ? "Marcar como pendente" : "Marcar como pago"} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "1.5rem", marginRight: "12px", opacity: tx.isPaid ? 1 : 0.6, transition: "transform 0.2s" }}>
                      {tx.isPaid ? "✅" : "⏳"}
                    </button>
                  </form>

                  <div className={styles.trowInfo}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "1.2rem" }}>{tx.category?.icon || "📄"}</span>
                      <strong>{tx.description}</strong>
                    </div>
                    <span className={styles.trowDetail}>
                      {tx.category?.name} • {tx.account.name}
                      {!tx.isPaid && <span style={{ color: "#eab308", fontWeight: "bold" }}> (Planejado)</span>}
                    </span>
                  </div>

                  <div className={styles.trowDate} style={{ marginLeft: 'auto', width: '100px', textAlign: 'center' }}>
                    {new Date(tx.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                  </div>

                  <div className={`${styles.trowValue} ${tx.type === "expense" ? styles.expense : styles.income}`} style={{ width: '120px', textAlign: 'right' }}>
                    {tx.type === "expense" ? "" : "+"}
                    {Number(tx.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>

                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", alignItems: "center", width: "80px" }}>
                    <Link href={`/transactions/edit/${tx.id}`}>
                      <button className={styles.editBtn} title="Editar">✏️</button>
                    </Link>
                    <DeleteButton transactionId={tx.id} installmentId={tx.installmentId} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* GASTOS DO MÊS COM SANFONA LIMPA */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Gastos do Mês</h3>
          {categoryStats.length === 0 ? (
            <p className="text-gray-400">Nenhuma despesa neste mês.</p>
          ) : (
            <div className={styles.categoryList}>
              <p style={{ fontSize: "0.8rem", color: "gray", marginBottom: "8px" }}>* Clique na categoria para filtrar</p>
              
              {/* --- GRUPO 1: MEUS GASTOS --- */}
              {myCategories.length > 0 && (
                <div className={styles.accordionGroup}>
                  <div className={styles.accordionHeader} onClick={() => setShowMyExpenses(!showMyExpenses)}>
                    <span>
                      <span className={styles.iconToggle}>{showMyExpenses ? "▼" : "▶"}</span> 
                      Meus Gastos
                    </span>
                    <span className={styles.negative}>{formatMoney(myCategoriesTotal)}</span>
                  </div>
                  
                  {showMyExpenses && (
                    <div className={styles.accordionBody}>
                      {myCategories.map((cat) => {
                        const percentage = Math.round((Math.abs(cat.total) / (maxValGlobal || 1)) * 100);
                        const isSelected = selectedCategory === cat.id;

                        return (
                          <div 
                            key={cat.id} 
                            className={`${styles.categoryItem} ${selectedCategory && !isSelected ? styles.dimmed : ''}`} 
                            onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
                          >
                            <div className={styles.catHeader}>
                              <span style={{ fontWeight: isSelected ? "bold" : "normal" }}>{cat.icon} {cat.name} {isSelected && " (Filtrado)"}</span>
                              <span className={styles.negative}>{formatMoney(cat.total)}</span>
                            </div>
                            <div className={styles.catBarBg}>
                              <div className={styles.catBarFill} style={{ width: `${percentage}%`, backgroundColor: cat.color || "#64748b" }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* --- GRUPO 2: CONTA DOS OUTROS --- */}
              {thirdPartyCategories.length > 0 && (
                <div className={styles.accordionGroup}>
                  <div className={styles.accordionHeader} onClick={() => setShowThirdParty(!showThirdParty)}>
                    <span>
                      <span className={styles.iconToggle}>{showThirdParty ? "▼" : "▶"}</span> 
                      Conta dos Outros
                    </span>
                    <span className={styles.negative}>{formatMoney(thirdPartyTotal)}</span>
                  </div>
                  
                  {showThirdParty && (
                    <div className={styles.accordionBody}>
                      {thirdPartyCategories.map((cat) => {
                        const percentage = Math.round((Math.abs(cat.total) / (maxValGlobal || 1)) * 100);
                        const isSelected = selectedCategory === cat.id;

                        return (
                          <div 
                            key={cat.id} 
                            className={`${styles.categoryItem} ${selectedCategory && !isSelected ? styles.dimmed : ''}`} 
                            onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
                          >
                            <div className={styles.catHeader}>
                              <span style={{ fontWeight: isSelected ? "bold" : "normal" }}>{cat.icon} {cat.name} {isSelected && " (Filtrado)"}</span>
                              <span className={styles.negative}>{formatMoney(cat.total)}</span>
                            </div>
                            <div className={styles.catBarBg}>
                              <div className={styles.catBarFill} style={{ width: `${percentage}%`, backgroundColor: cat.color || "#64748b" }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </main>
  );
}