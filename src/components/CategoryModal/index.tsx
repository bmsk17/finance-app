'use client'

import { useEffect, useState } from 'react';
import { getCategoryStats } from '@/app/actions/categories';
import styles from './styles.module.scss';
import Link from 'next/link';

interface Props {
  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
  onClose: () => void;
}

interface StatsData {
  kpis: { monthTotal: number; yearTotal: number; average: number };
  chart: { label: string; total: number }[];
  recent: { id: string; description: string; amount: number; date: Date }[];
}

export function CategoryModal({ category, onClose }: Props) {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCategoryStats(category.id).then(stats => {
      setData(stats);
      setLoading(false);
    });
  }, [category.id]);

  const formatMoney = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // CORREÇÃO 1: Calculamos o máximo usando Math.abs para ignorar negativos
  const maxChartValue = data 
    ? Math.max(...data.chart.map(d => Math.abs(d.total)), 10) 
    : 100;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <div 
              className={styles.icon} 
              style={{ backgroundColor: category.color + '20', color: category.color }}
            >
              {category.icon}
            </div>
            <div>
              <h2>{category.name}</h2>
              <span>Detalhes de Despesas</span>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        <div className={styles.content}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Carregando...</div>
          ) : data ? (
            <>
              {/* KPIS */}
              <div className={styles.kpiGrid}>
                <div className={`${styles.kpiCard} ${styles.highlight}`}>
                  <span className={styles.label}>Este Mês</span>
                  <span className={styles.value}>{formatMoney(data.kpis.monthTotal)}</span>
                </div>
                <div className={styles.kpiCard}>
                  <span className={styles.label}>Média Mensal</span>
                  <span className={styles.value}>{formatMoney(data.kpis.average)}</span>
                </div>
                <div className={styles.kpiCard}>
                  <span className={styles.label}>Total Anual</span>
                  <span className={styles.value}>{formatMoney(data.kpis.yearTotal)}</span>
                </div>
              </div>

              {/* GRÁFICO */}
              <div className={styles.chartSection}>
                <h3>Evolução Mensal</h3>
                <div className={styles.chartContainer}>
                  {data.chart.map((bar, idx) => {
                    // CORREÇÃO 2: Usamos Math.abs() para garantir que o gráfico entenda o valor
                    const absValue = Math.abs(bar.total);
                    const heightPercent = (absValue / maxChartValue) * 100;
                    
                    const displayValue = absValue > 0 
                      ? new Intl.NumberFormat('pt-BR', { notation: "compact", maximumFractionDigits: 1 }).format(absValue)
                      : "";

                    return (
                      <div key={idx} className={styles.barWrapper}>
                        
                        {/* CORREÇÃO 3: Verificamos se absValue > 0 */}
                        {absValue > 0 && (
                          <span className={styles.barValue} title={formatMoney(bar.total)}>
                             R$ {displayValue}
                          </span>
                        )}

                        <div 
                          className={styles.bar} 
                          style={{ 
                            height: `${heightPercent}%`, 
                            backgroundColor: category.color 
                          }} 
                        />
                        <span className={styles.monthLabel}>{bar.label.replace('.', '')}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* LISTA RECENTE */}
              <div className={styles.listSection}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <h3>Últimas Transações</h3>
                  <Link href={`/categories/edit/${category.id}`} style={{fontSize: '0.8rem', color: '#3b82f6', textDecoration: 'none'}}>
                    Editar Categoria
                  </Link>
                </div>
                
                {data.recent.length === 0 ? (
                   <p style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>Nenhuma transação recente.</p>
                ) : (
                  data.recent.map(t => (
                    <div key={t.id} className={styles.transactionItem}>
                      <div>
                        <span className={styles.tDate}>
                          {new Date(t.date).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}
                        </span>
                        <span>{t.description}</span>
                      </div>
                      <span className={styles.tVal}>{formatMoney(t.amount)}</span>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
             <p>Erro ao carregar dados.</p>
          )}
        </div>

      </div>
    </div>
  );
}