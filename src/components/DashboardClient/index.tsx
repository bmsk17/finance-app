// ARQUIVO: src/components/DashboardClient.tsx

'use client'

import { useState, useMemo } from 'react'
import Link from "next/link"
import styles from "@/app/page.module.scss" // Importando o estilo da página principal
import { MonthSelector } from "@/components/MonthSelector"
import { DeleteButton } from "@/components/DeleteButton"
import { RecurringAlert } from "@/components/RecurringAlert"
import { toggleTransactionStatus } from "@/app/actions/transactions"

interface DashboardProps {
  accounts: any[]
  transactions: any[]
  categoryStats: any[]
  kpis: {
    totalIncome: number
    totalExpense: number
    monthlyBalance: number
    currentTotalBalance: number
    diff: number
  }
  pendingRecurring: any[]
  month: number
  year: number
}

export function DashboardClient({ 
  accounts, 
  transactions, 
  categoryStats, 
  kpis, 
  pendingRecurring, 
  month, 
  year 
}: DashboardProps) {
  
  // --- ESTADOS DE CONTROLE ---
  // 1. Ordenação (Padrão: Data Descendente)
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ 
    key: 'date', 
    direction: 'desc' 
  });

  // 2. Filtro de Categoria
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // --- LÓGICA DE ORDENAÇÃO E FILTRO ---
  const filteredAndSortedTransactions = useMemo(() => {
    let result = [...transactions];

    // 1. Filtrar por Categoria (se houver uma selecionada)
    if (selectedCategory) {
      result = result.filter(t => t.categoryId === selectedCategory);
    }

    // 2. Ordenar
    result.sort((a, b) => {
      let valA: any = a[sortConfig.key];
      let valB: any = b[sortConfig.key];

      // Tratamentos especiais
      if (sortConfig.key === 'amount') {
        valA = Number(valA);
        valB = Number(valB);
      } else if (sortConfig.key === 'date') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      } else if (sortConfig.key === 'description') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [transactions, sortConfig, selectedCategory]);

  // Função para mudar a ordenação ao clicar no cabeçalho
  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    // Se já estiver ordenado por essa chave e for asc, vira desc
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Ícone da setinha de ordenação
  const getSortIcon = (key: string) => {
    const isActive = sortConfig.key === key;
    const icon = isActive 
      ? (sortConfig.direction === 'asc' ? '▲' : '▼') 
      : '⇅'; // Ícone neutro

    return (
      <span style={{
        display: 'inline-block', // Permite definir largura
        width: '18px',           // LARGURA FIXA: O segredo está aqui
        textAlign: 'center',     // Centraliza o ícone no espaço fixo
        opacity: isActive ? 1 : 0.2,
        marginLeft: '4px'        // Um respiro fixo do texto
      }}>
        {icon}
      </span>
    );
  };

  const formatMoney = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

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

      {/* SEÇÃO 1: PATRIMÔNIO (Igual ao original) */}
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

      {/* ALERTA DE RECORRÊNCIA */}
      <RecurringAlert 
        key={`${month}-${year}`} 
        pendingExpenses={pendingRecurring} 
        currentMonth={month}
        currentYear={year}
      />

      {/* SEÇÃO 2: RESUMO MENSAL */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span>Entradas (Mês)</span>
          <div className={`${styles.value} ${styles.green}`}>{formatMoney(kpis.totalIncome)}</div>
        </div>
        <div className={styles.summaryCard}>
          <span>Saídas (Mês)</span>
          <div className={`${styles.value} ${styles.red}`}>{formatMoney(kpis.totalExpense)}</div>
        </div>
        <div className={styles.summaryCard}>
          <span>Balanço (Mês)</span>
          <div className={`${styles.value} ${kpis.monthlyBalance >= 0 ? styles.blue : styles.red}`}>
            {formatMoney(kpis.monthlyBalance)}
          </div>
        </div>
      </div>

      {/* SEÇÃO 3: DETALHES INTERATIVOS */}
      <div className={styles.grid2}>
        
        {/* TABELA DE MOVIMENTAÇÕES */}
        <div className={styles.card}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '20px'}}>
            <h3 className={styles.cardTitle} style={{marginBottom:0}}>
              Movimentações de {new Date(year, month).toLocaleString("pt-BR", { month: "long" })}
            </h3>
            
            {/* Botão para limpar filtro se houver */}
            {selectedCategory && (
              <button 
                onClick={() => setSelectedCategory(null)}
                style={{
                  background: '#ef444420', color:'#ef4444', border:'none', 
                  padding:'4px 12px', borderRadius:'12px', cursor:'pointer', fontSize:'0.8rem', fontWeight:'bold'
                }}
              >
                ✕ Limpar Filtro
              </button>
            )}
          </div>

          <div className={styles.table}>
            {/* CABEÇALHO CLICÁVEL */}
            <div className={styles.trowHeader}>
              <span onClick={() => requestSort('description')} style={{cursor:'pointer', display:'flex', alignItems:'center', gap:'4px'}}>
                Descrição {getSortIcon('description')}
              </span>
              <span onClick={() => requestSort('date')} style={{cursor:'pointer', width:'100px', textAlign:'center', display:'flex', justifyContent:'center', alignItems:'center', gap:'4px'}}>
                Data {getSortIcon('date')}
              </span>
              <span onClick={() => requestSort('amount')} style={{cursor:'pointer', width:'120px', textAlign:'right', display:'flex', justifyContent:'flex-end', alignItems:'center', gap:'4px'}}>
                Valor {getSortIcon('amount')}
              </span>
              <span></span>
            </div>

            {filteredAndSortedTransactions.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                {selectedCategory ? "Nenhuma transação nesta categoria." : "Nenhuma transação neste mês."}
              </div>
            ) : (
              filteredAndSortedTransactions.map((tx) => (
                <div key={tx.id} className={styles.trow}>
                  
                  {/* Status Toggle */}
                  <form action={toggleTransactionStatus} style={{ display: "flex", alignItems: "center" }}>
                    <input type="hidden" name="id" value={tx.id} />
                    <input type="hidden" name="isPaid" value={String(tx.isPaid)} />
                    <button
                      type="submit"
                      title={tx.isPaid ? "Marcar como pendente" : "Marcar como pago"}
                      style={{
                        background: "transparent", border: "none", cursor: "pointer", fontSize: "1.5rem", marginRight: "12px",
                        opacity: tx.isPaid ? 1 : 0.6, transition: "transform 0.2s",
                      }}
                    >
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

                  <div className={styles.trowDate}>
                    {new Date(tx.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                  </div>

                  <div className={`${styles.trowValue} ${tx.type === "expense" ? styles.expense : styles.income}`}>
                    {tx.type === "expense" ? "" : "+"}
                    {Number(tx.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>

                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", alignItems: "center", minWidth: "80px" }}>
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

        {/* GASTOS DO MÊS (Categorias Clicáveis) */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Gastos do Mês</h3>
          {categoryStats.length === 0 ? (
            <p className="text-gray-400">Nenhuma despesa neste mês.</p>
          ) : (
            <div className={styles.categoryList}>
              <p style={{fontSize:'0.8rem', color:'gray', marginBottom:'10px'}}>
                * Clique na categoria para filtrar
              </p>
              {categoryStats.map((cat) => {
                const maxVal = categoryStats[0]?.total ? Math.abs(categoryStats[0].total) : 0;
                const percentage = Math.round((Math.abs(cat.total) / maxVal) * 100);
                const isSelected = selectedCategory === cat.id;

                return (
                  <div 
                    key={cat.id} 
                    className={styles.categoryItem}
                    // AQUI ESTÁ A MÁGICA DO FILTRO:
                    onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
                    style={{ 
                      cursor: 'pointer', 
                      opacity: (selectedCategory && !isSelected) ? 0.4 : 1, // Ofusca os não selecionados
                      transition: 'opacity 0.2s'
                    }}
                  >
                    <div className={styles.catHeader}>
                      <span style={{fontWeight: isSelected ? 'bold' : 'normal'}}>
                        {cat.icon} {cat.name} {isSelected && " (Filtrado)"}
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