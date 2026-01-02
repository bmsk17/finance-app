'use client'

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import styles from './DebtChart.module.scss';

interface DebtChartProps {
  data: any[]
  onMonthClick: (month: string) => void
}

export function DebtChart({ data, onMonthClick }: DebtChartProps) {
  const formatMoney = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className={styles.chartWrapper}>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart 
          data={data} 
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          onClick={(state) => {
            if (state && state.activeLabel) {
              onMonthClick(String(state.activeLabel));
            }
          }}
        >
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis 
            dataKey="month" 
            stroke="#94a3b8" 
            fontSize={12} 
            tickFormatter={(str) => {
              const [year, month] = str.split('-');
              return `${month}/${year.slice(2)}`;
            }}
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={12} 
            tickFormatter={(val) => `R$ ${val}`} 
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
            itemStyle={{ color: '#f59e0b' }}
            formatter={(val: any) => [formatMoney(val), 'Saldo Devedor']}
            labelFormatter={(label) => `Mês: ${label}`}
          />
          <Area 
            type="monotone" 
            dataKey="balance" 
            stroke="#f59e0b" 
            fillOpacity={1} 
            fill="url(#colorBalance)" 
            strokeWidth={3}
            activeDot={{ r: 6, cursor: 'pointer' }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <p className={styles.hint}>* Clica num ponto do gráfico para filtrar as transações desse mês.</p>
    </div>
  );
}