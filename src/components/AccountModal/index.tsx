'use client'
import { useEffect, useState } from 'react';
import { getAccountStats } from '@/app/actions/accounts';
import styles from './styles.module.scss';
import Link from 'next/link';
import { CustomSelect } from '@/components/CustomSelect';

interface Props {
  account: { id: string; name: string; type: string; balance: number };
  onClose: () => void;
}

export function AccountModal({ account, onClose }: Props) {
  const [data, setData] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  
  // NOVO: Estado para controlar a ordem (Padrão: Data Decrescente)
  const [sortOrder, setSortOrder] = useState('date-desc');

  useEffect(() => {
    getAccountStats(account.id).then(setData);
  }, [account.id]);

  const formatMoney = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // 1. Primeiro filtramos por mês (se houver seleção)
  const filteredTransactions = data?.transactions.filter((t: any) => {
    if (selectedMonth === null) return true;
    return new Date(t.date).getMonth() === selectedMonth;
  }) || [];

  // 2. AGORA ORDENAMOS essa lista filtrada
  const sortedTransactions = [...filteredTransactions].sort((a: any, b: any) => {
    switch (sortOrder) {
      case 'date-desc': // Mais recentes primeiro
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case 'date-asc': // Mais antigas primeiro
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'amount-desc': // Maior valor primeiro
        return b.amount - a.amount;
      case 'amount-asc': // Menor valor primeiro
        return a.amount - b.amount;
      case 'alpha-asc': // Alfabética A-Z
        return a.description.localeCompare(b.description);
      default:
        return 0;
    }
  });

  // Saldo do Mês (baseado na lista filtrada)
  const monthTotal = filteredTransactions.reduce((acc: number, t: any) => 
    t.type === 'income' ? acc + t.amount : acc - t.amount, 0
  );

  const maxVal = data 
    ? Math.max(...data.chart.map((d: any) => Math.max(d.income, d.expense)), 100) 
    : 100;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className={styles.header}>
          <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
            <div style={{fontSize:'2rem'}}>{account.type === 'Carteira' ? '💵' : '🏦'}</div>
            <div>
              <h2 style={{margin:0, fontSize:'1.2rem'}}>{account.name}</h2>
              <span style={{fontSize:'0.85rem', color:'gray'}}>Saldo Atual: <b style={{color: account.balance >=0?'#10b981':'#ef4444'}}>{formatMoney(account.balance)}</b></span>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        {/* CONTEÚDO */}
        <div className={styles.scrollContent}>
          {data ? (
            <>
              {/* RESUMO */}
              <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                  <span style={{color:'#10b981'}}>Entradas (Ano)</span>
                  <strong>{formatMoney(data.kpis.totalIncome)}</strong>
                </div>
                <div className={styles.summaryCard}>
                  <span style={{color:'#ef4444'}}>Saídas (Ano)</span>
                  <strong>{formatMoney(data.kpis.totalExpense)}</strong>
                </div>
                <div className={styles.summaryCard}>
                  <span>Balanço</span>
                  <strong style={{color: data.kpis.periodBalance >= 0 ? '#3b82f6' : '#ef4444'}}>
                    {formatMoney(data.kpis.periodBalance)}
                  </strong>
                </div>
              </div>

              {/* GRÁFICO */}
              <div className={styles.chartHeader}>
                <h3>Filtro Mensal</h3>
                {selectedMonth !== null && (
                  <button onClick={() => setSelectedMonth(null)}>Ver Ano Todo</button>
                )}
              </div>
              <div className={styles.chartContainer}>
                {data.chart.map((m: any, idx: number) => (
                  <div 
                    key={idx} 
                    className={`${styles.monthGroup} ${selectedMonth === m.index ? styles.selected : ''}`}
                    onClick={() => setSelectedMonth(selectedMonth === m.index ? null : m.index)}
                    title={`Ver ${m.label}`}
                  >
                    <div className={`${styles.bar} ${styles.incomeBar}`} style={{ height: `${(m.income / maxVal) * 100}%` }} />
                    <div className={`${styles.bar} ${styles.expenseBar}`} style={{ height: `${(m.expense / maxVal) * 100}%` }} />
                    <span className={styles.monthLabel}>{m.label[0]}</span>
                  </div>
                ))}
              </div>

              {/* LISTA + ORDENAÇÃO */}
              <div className={styles.listHeader}>
                <div className={styles.listTitleArea}>
                  <h3 style={{margin:0, fontSize:'1rem'}}>
                    {selectedMonth !== null 
                      ? `Extrato: ${new Date(2023, selectedMonth, 1).toLocaleDateString('pt-BR', {month:'long'})}` 
                      : "Todas as Transações"}
                  </h3>
                  {selectedMonth !== null && (
                    <span style={{fontSize:'0.8rem', color: monthTotal>=0 ? '#10b981' : '#ef4444'}}>
                      Resumo: {formatMoney(monthTotal)}
                    </span>
                  )}
                </div>

                {/* --- O NOVO SELECT DE ORDENAÇÃO --- */}
                <div className={styles.selectWrapper}> 
                  <CustomSelect 
                    name="sort" 
                    initialValue={sortOrder}
                    onChange={(val) => setSortOrder(val)}
                    options={[
                      { value: "date-desc", label: "📅 Recentes" }, // Encurtei o texto
                      { value: "date-asc", label: "📅 Antigas" },
                      { value: "amount-desc", label: "💰 Maior Valor" },
                      { value: "amount-asc", label: "💰 Menor Valor" },
                      { value: "alpha-asc", label: "🔤 Nome" }
                    ]}
                  />
                </div>
              </div>

              <div className={styles.transactionList}>
                {sortedTransactions.length === 0 ? (
                  <p style={{color:'gray', textAlign:'center', padding:'40px'}}>
                    Nenhuma movimentação encontrada.
                  </p>
                ) : (
                  // IMPORTANTE: Aqui usamos sortedTransactions em vez de filteredTransactions
                  sortedTransactions.map((t: any) => (
                    <div key={t.id} className={styles.transactionItem}>
                      <div className={styles.tInfo}>
                        <div className={styles.tIcon}>{t.categoryIcon}</div>
                        <div>
                          <span style={{display:'block', fontWeight:500}}>{t.description}</span>
                          <span className={styles.tDate}>
                            {new Date(t.date).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})} • {t.categoryName}
                          </span>
                        </div>
                      </div>
                      <span className={t.type === 'income' ? styles.income : styles.expense} style={{fontWeight:'bold'}}>
                        {t.type === 'income' ? '+' : '-'} {formatMoney(t.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
              
              <div style={{marginTop:'30px', textAlign:'center'}}>
                <Link href={`/accounts/edit/${account.id}`} style={{color:'#3b82f6', textDecoration:'none', fontSize:'0.9rem'}}>
                  Configurações da Conta
                </Link>
              </div>

            </>
          ) : <p style={{textAlign:'center', padding:'40px'}}>Carregando...</p>}
        </div>
      </div>
    </div>
  )
}