'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import styles from './styles.module.scss'; // <--- Importando o SCSS

interface Transaction {
  amount: number | any;
  type: string;
  category?: {
    name: string;
    color?: string | null;
  } | null;
}

interface Props {
  transactions: Transaction[];
}

export function ExpenseChart({ transactions }: Props) {
  // 1. Filtrar apenas DESPESAS
  const expenses = transactions.filter(t => t.type === 'expense');

  // 2. Agrupar por Categoria
  const dataMap = expenses.reduce((acc, curr) => {
    const catName = curr.category?.name || 'Outros';
    const catColor = curr.category?.color || '#94a3b8';
    
    if (!acc[catName]) {
      acc[catName] = { name: catName, value: 0, color: catColor };
    }
    
    acc[catName].value += Math.abs(Number(curr.amount));
    return acc;
  }, {} as Record<string, { name: string, value: number, color: string }>);

  const data = Object.values(dataMap);

  // Estado Vazio
  if (data.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        Sem despesas para exibir no gráfico. 👏
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>
        Gastos do Mês por Categoria
      </h3>

      <ResponsiveContainer width="100%" height="90%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--card-bg)" strokeWidth={2} />
            ))}
          </Pie>
          
          {/* O Tooltip precisa de estilos inline para o objeto interno da lib, 
              mas usamos as variáveis CSS para manter o tema */}
          <Tooltip 
            // CORREÇÃO AQUI: Mudamos de (value: number) para (value: any)
            formatter={(value: any) => `R$ ${Number(value).toFixed(2)}`}
            contentStyle={{ 
              backgroundColor: 'var(--card-bg)', 
              borderColor: 'var(--border-color)', 
              color: 'var(--text-primary)',
              borderRadius: '8px' 
            }}
            itemStyle={{ color: 'var(--text-primary)' }}
          />
          
          <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '10px' }}/>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}