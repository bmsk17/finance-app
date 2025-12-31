// ARQUIVO: src/components/ProjectionSimulator/index.tsx
'use client'

import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { CustomSelect } from '@/components/CustomSelect';
import styles from './styles.module.scss';

interface Props {
  initialData: {
    startBalance: number;
    recurring: any[];
    futureTransactions: any[];
  }
}

interface SimulationItem {
  id: string;
  name: string;
  amount: number;
  type: 'income' | 'expense';
  frequency: 'once' | 'monthly';
  startMonth: number; 
}

interface MonthDetailItem {
  label: string;
  value: number;
  type: 'income' | 'expense' | 'interest';
  source: 'Recorrente' | 'Parcelado' | 'Simulado' | 'Rendimento';
}

export function ProjectionSimulator({ initialData }: Props) {
  const [monthsToProject, setMonthsToProject] = useState(12);
  const [interestRate, setInterestRate] = useState<string>('0');
  const [interestType, setInterestType] = useState<string>('yearly');
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);

  // Estados do Formulário
  const [simulations, setSimulations] = useState<SimulationItem[]>([]);
  const [simName, setSimName] = useState('');
  const [simAmount, setSimAmount] = useState('');
  const [simType, setSimType] = useState<string>('expense');
  const [simFreq, setSimFreq] = useState<string>('monthly');

  // CÁLCULO (IGUAL AO ANTERIOR)
  const projectionData = useMemo(() => {
    let currentBalance = initialData.startBalance;
    const data = [];
    const today = new Date();
    const rateVal = parseFloat(interestRate.replace(',', '.') || '0');
    let monthlyRate = 0;

    if (rateVal > 0) {
      if (interestType === 'monthly') monthlyRate = rateVal / 100;
      else monthlyRate = Math.pow(1 + rateVal / 100, 1 / 12) - 1;
    }

    for (let i = 0; i <= monthsToProject; i++) {
      const targetDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const targetMonth = targetDate.getMonth();
      const targetYear = targetDate.getFullYear();
      const monthDetails: MonthDetailItem[] = [];
      const startBalanceOfMonth = currentBalance;

      let interestGained = 0;
      if (i > 0 && currentBalance > 0) {
        interestGained = currentBalance * monthlyRate;
        currentBalance += interestGained;
        if (interestGained > 0) {
          monthDetails.push({
            label: `Rendimento (${(monthlyRate * 100).toFixed(2)}%)`,
            value: interestGained,
            type: 'interest',
            source: 'Rendimento'
          });
        }
      }

      if (i > 0) { 
        initialData.recurring.forEach(rec => {
           const val = Number(rec.amount);
           if (rec.type === 'expense') {
             currentBalance -= val;
             monthDetails.push({ label: rec.description, value: val, type: 'expense', source: 'Recorrente' });
           } else {
             currentBalance += val;
             monthDetails.push({ label: rec.description, value: val, type: 'income', source: 'Recorrente' });
           }
        });
      }

      const monthTransactions = initialData.futureTransactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === targetMonth && tDate.getFullYear() === targetYear;
      });

      monthTransactions.forEach(t => {
        const val = Math.abs(Number(t.amount));
        if (t.type === 'expense') {
          currentBalance -= val;
          monthDetails.push({ label: t.description, value: val, type: 'expense', source: 'Parcelado' });
        } else {
          currentBalance += val;
          monthDetails.push({ label: t.description, value: val, type: 'income', source: 'Parcelado' });
        }
      });

      simulations.forEach(sim => {
        const val = Math.abs(sim.amount);
        const isExpense = sim.type === 'expense';
        let shouldApply = false;
        if (sim.frequency === 'monthly') {
          if (i >= sim.startMonth) shouldApply = true;
        } else {
          if (i === 1) shouldApply = true; 
        }

        if (shouldApply) {
          if (isExpense) currentBalance -= val;
          else currentBalance += val;
          monthDetails.push({ 
            label: sim.name, value: val, type: isExpense ? 'expense' : 'income', source: 'Simulado' 
          });
        }
      });

      data.push({
        index: i,
        name: targetDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        fullDate: targetDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        balance: currentBalance,
        startBalance: startBalanceOfMonth,
        interestGained: interestGained,
        details: monthDetails,
        color: currentBalance >= 0 ? '#10b981' : '#ef4444' 
      });
    }
    return data;
  }, [initialData, monthsToProject, simulations, interestRate, interestType]);

  const addSimulation = () => {
    if (!simName || !simAmount) return;
    const newItem: SimulationItem = {
      id: crypto.randomUUID(),
      name: simName,
      amount: parseFloat(simAmount.replace(',', '.')),
      type: simType as 'income' | 'expense',
      frequency: simFreq as 'once' | 'monthly',
      startMonth: 0 
    };
    setSimulations([...simulations, newItem]);
    setSimName('');
    setSimAmount('');
  };

  const removeSimulation = (id: string) => {
    setSimulations(simulations.filter(s => s.id !== id));
  };

  const formatMoney = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const selectedMonthData = selectedMonthIndex !== null ? projectionData[selectedMonthIndex] : null;

  return (
    <div className={styles.container}>
      
      {/* 1. CONTROLES */}
      <div className={styles.controls}>
        <div className={styles.rangeControl}>
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
             <label>Tempo: <strong>{monthsToProject} meses</strong> ({Math.floor(monthsToProject/12)} anos)</label>
          </div>
          <input 
            type="range" min="3" max="120" value={monthsToProject} 
            onChange={(e) => setMonthsToProject(Number(e.target.value))} 
            className={styles.slider}
          />
        </div>

        <div style={{ 
            display:'flex', flexDirection:'column', gap:'5px', 
            borderLeft:'1px solid var(--border-color)', paddingLeft:'20px',
            minWidth: '200px'
        }}>
          <label style={{fontSize:'0.8rem', color:'var(--text-secondary)'}}>Rentabilidade</label>
          <div style={{display:'flex', gap:'8px', alignItems: 'center'}}>
            <input 
              type="number" 
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              placeholder="0"
              style={{
                  width:'70px', padding:'10px', borderRadius:'8px', 
                  border:'1px solid var(--border-color)', background:'var(--bg-color)', color:'var(--text-primary)',
                  height: '42px'
              }}
            />
            <div style={{flex: 1, minWidth: '120px'}}>
              <CustomSelect
                name="interestType"
                initialValue={interestType}
                onChange={(val) => setInterestType(val)}
                options={[
                  { value: "monthly", label: "% ao Mês" },
                  { value: "yearly", label: "% ao Ano" }
                ]}
              />
            </div>
          </div>
        </div>

        <div className={styles.resultCard}>
          <span>Saldo Estimado Final</span>
          <strong style={{ 
            color: projectionData[projectionData.length-1]?.balance >= 0 ? '#10b981' : '#ef4444',
            fontSize: '1.5rem'
          }}>
            {formatMoney(projectionData[projectionData.length-1]?.balance || 0)}
          </strong>
        </div>
      </div>

      {/* 2. GRÁFICO */}
      <div className={styles.chartContainer}>
        <p style={{fontSize: '0.8rem', color: 'gray', textAlign:'center', marginBottom: '10px'}}>
          * Clique em um ponto do gráfico para ver o que caiu naquele mês
        </p>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={projectionData}
            onClick={(e: any) => {
              if (e && e.activeTooltipIndex !== undefined) {
                setSelectedMonthIndex(e.activeTooltipIndex);
              }
            }}
          >
            <defs>
              <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickMargin={10} minTickGap={30} />
            <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `R$ ${val/1000}k`} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
              itemStyle={{ color: '#fff' }}
              formatter={(val: any) => formatMoney(Number(val))} 
              labelStyle={{ color: '#94a3b8' }}
              cursor={{ stroke: '#3b82f6', strokeWidth: 2 }}
            />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
            <Area 
              type="monotone" 
              dataKey="balance" 
              stroke="#3b82f6" 
              fillOpacity={1} 
              fill="url(#colorBal)" 
              activeDot={{ r: 6, strokeWidth: 0 }}
              style={{ cursor: 'pointer' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 3. SIMULAÇÃO (ADICIONAR RENDA) */}
      <div className={styles.simBox}>
        <h3>🧪 Adicionar Cenário</h3>
        <div className={styles.simForm}>
          <input 
            placeholder="Ex: Aumento, Compra Carro..." 
            value={simName} onChange={e => setSimName(e.target.value)}
          />
          <input 
            type="number" placeholder="Valor (R$)" 
            value={simAmount} onChange={e => setSimAmount(e.target.value)}
          />
          <div style={{minWidth: '140px'}}>
            <CustomSelect
                name="simType"
                initialValue={simType}
                onChange={(val) => setSimType(val)}
                options={[
                  { value: "income", label: "Receita (+)" },
                  { value: "expense", label: "Despesa (-)" }
                ]}
            />
          </div>
          <div style={{minWidth: '140px'}}>
             <CustomSelect
                name="simFreq"
                initialValue={simFreq}
                onChange={(val) => setSimFreq(val)}
                options={[
                  { value: "monthly", label: "Mensal" },
                  { value: "once", label: "Único" }
                ]}
            />
          </div>
          <button onClick={addSimulation}>Adicionar</button>
        </div>

        {simulations.length > 0 && (
          <div className={styles.simList}>
            {simulations.map(sim => (
              <div key={sim.id} className={styles.simItem}>
                <span className={sim.type === 'income' ? styles.plus : styles.minus}>
                  {sim.type === 'income' ? '+' : '-'} {formatMoney(sim.amount)}
                </span>
                <span className={styles.simDesc}>
                  {sim.name} ({sim.frequency === 'monthly' ? 'Mensal' : 'Único'})
                </span>
                <button onClick={() => removeSimulation(sim.id)}>&times;</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. DETALHES DO EXTRATO (MOVIDO PARA O FINAL) */}
      {selectedMonthData && (
        <div className={styles.detailsContainer}>
          <h3>
            Extrato Projetado: {selectedMonthData.fullDate}
            <button 
              onClick={() => setSelectedMonthIndex(null)}
              style={{background:'none', border:'none', fontSize:'1.2rem', cursor:'pointer', color:'var(--text-secondary)'}}
            >
              &times;
            </button>
          </h3>

          <div className={styles.detailsGrid}>
            <div className={styles.detailGroup}>
              <h4>Entradas & Rendimentos</h4>
              
              {selectedMonthData.interestGained > 0 && (
                <div className={styles.interestRow}>
                  <span>📈 Rendimento (Juros)</span>
                  <span>+ {formatMoney(selectedMonthData.interestGained)}</span>
                </div>
              )}

              {selectedMonthData.details.filter(d => d.type === 'income').map((item, idx) => (
                <div key={idx} className={styles.detailItem}>
                  <span>
                    <span className={styles.sourceTag}>{item.source}</span>
                    {item.label}
                  </span>
                  <span style={{color: '#10b981', fontWeight:'bold'}}>
                    + {formatMoney(item.value)}
                  </span>
                </div>
              ))}
              
              {selectedMonthData.details.filter(d => d.type === 'income').length === 0 && selectedMonthData.interestGained === 0 && (
                <p style={{fontSize:'0.85rem', color:'gray', fontStyle:'italic'}}>Nenhuma entrada prevista.</p>
              )}
            </div>

            <div className={styles.detailGroup}>
              <h4>Saídas Previstas</h4>
              {selectedMonthData.details.filter(d => d.type === 'expense').map((item, idx) => (
                <div key={idx} className={styles.detailItem}>
                   <span>
                    <span className={styles.sourceTag}>{item.source}</span>
                    {item.label}
                  </span>
                  <span style={{color: '#ef4444', fontWeight:'bold'}}>
                    - {formatMoney(item.value)}
                  </span>
                </div>
              ))}
              {selectedMonthData.details.filter(d => d.type === 'expense').length === 0 && (
                <p style={{fontSize:'0.85rem', color:'gray', fontStyle:'italic'}}>Nenhuma saída prevista.</p>
              )}
            </div>
          </div>

          <div className={styles.summaryRow}>
            <span>Saldo Final do Mês</span>
            <span style={{color: selectedMonthData.balance >= 0 ? '#10b981' : '#ef4444'}}>
              {formatMoney(selectedMonthData.balance)}
            </span>
          </div>
        </div>
      )}

    </div>
  );
}