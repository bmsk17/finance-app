'use client'

import { useState } from 'react';
import { generateRecurringTransactions } from '@/app/actions/recurring';
import styles from './styles.module.scss';

interface RecurringExpense {
  id: string;
  description: string;
  amount: number; // Agora já vem como number limpo
  day: number;
}

interface Props {
  pendingExpenses: RecurringExpense[];
  currentMonth: number;
  currentYear: number;
}

export function RecurringAlert({ pendingExpenses, currentMonth, currentYear }: Props) {
  const [isVisible, setIsVisible] = useState(true);
  
  // Estado para guardar quais itens estão selecionados (começa com TODOS selecionados)
  const [selectedIds, setSelectedIds] = useState<string[]>(
    pendingExpenses.map(p => p.id)
  );

  if (!isVisible || pendingExpenses.length === 0) return null;

  // Função para marcar/desmarcar
  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div className={styles.container}>
      
      <div className={styles.header}>
        <h3 className={styles.title}>🔔 Lançamentos Pendentes</h3>
        <button onClick={() => setIsVisible(false)} className={styles.closeBtn}>&times;</button>
      </div>

      <p className={styles.description}>
        Selecione as despesas fixas para lançar neste mês:
      </p>

      {/* LISTA DE SELEÇÃO */}
      <div className={styles.list}>
        {pendingExpenses.map(item => (
          <div 
            key={item.id} 
            className={styles.listItem} 
            onClick={() => toggleSelection(item.id)} // Clicar na linha também seleciona
          >
            <input 
              type="checkbox" 
              className={styles.checkbox}
              checked={selectedIds.includes(item.id)}
              readOnly // Controlado pelo onClick da div pai para melhor UX
            />
            <div className={styles.itemInfo}>
              <span>{item.day} - {item.description}</span>
              <span>R$ {item.amount.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      <form action={async (formData) => {
          await generateRecurringTransactions(formData);
          // Oculta o alerta se lançou tudo. 
          // Se lançou só alguns, a lógica da Home vai recarregar e mostrar o alerta de novo com o que sobrou.
          setIsVisible(false); 
      }}>
        {/* Passamos APENAS os IDs que estão no estado 'selectedIds' */}
        <input type="hidden" name="ids" value={JSON.stringify(selectedIds)} />
        <input type="hidden" name="month" value={currentMonth} />
        <input type="hidden" name="year" value={currentYear} />
        
        <button 
          type="submit" 
          className={styles.actionBtn}
          disabled={selectedIds.length === 0} // Desabilita se não tiver nada selecionado
        >
          {selectedIds.length === 0 
            ? "Selecione pelo menos uma" 
            : `Lançar ${selectedIds.length} Itens Selecionados`}
        </button>
      </form>

    </div>
  );
}