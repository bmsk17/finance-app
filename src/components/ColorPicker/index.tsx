'use client'

import { useState } from 'react';
import styles from './styles.module.scss';

// Lista de cores pré-definidas (Tailwind colors)
const COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#64748b', // Slate
];

interface Props {
  name: string;
  label: string;
  initialValue?: string;
}

export function ColorPicker({ name, label, initialValue }: Props) {
  const [selected, setSelected] = useState(initialValue || COLORS[0]);

  return (
    <div className={styles.container}>
      <span className={styles.label}>{label}</span>
      
      {/* O Input Escondido para o Formulário */}
      <input type="hidden" name={name} value={selected} />

      <div className={styles.grid}>
        {COLORS.map(color => (
          <div
            key={color}
            className={`${styles.colorCircle} ${selected === color ? styles.selected : ''}`}
            style={{ backgroundColor: color }}
            onClick={() => setSelected(color)}
            title={color}
          />
        ))}
      </div>
    </div>
  );
}