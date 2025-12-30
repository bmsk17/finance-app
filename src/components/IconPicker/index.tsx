'use client'

import { useState, useRef, useEffect } from 'react';
import styles from './styles.module.scss';

// Ícones mais comuns para facilitar a vida do usuário
const PRESETS = [
  '🏠', '🍔', '🚗', '🎮', '💊', 
  '💰', '🎓', '✈️', '🛒', '🔧', 
  '💡', '🐾', '🏋️', '👙', '💼'
];

interface Props {
  name: string;
  label: string;
  initialValue?: string;
}

export function IconPicker({ name, label, initialValue }: Props) {
  // Se o valor inicial não estiver na lista, assumimos que é um customizado
  const isInitialCustom = initialValue && !PRESETS.includes(initialValue);
  
  const [selected, setSelected] = useState(initialValue || PRESETS[0]);
  const [showCustomInput, setShowCustomInput] = useState(!!isInitialCustom);
  const inputRef = useRef<HTMLInputElement>(null);

  // Quando clicar no "+", foca no input automaticamente
  useEffect(() => {
    if (showCustomInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showCustomInput]);

  const handlePresetClick = (icon: string) => {
    setSelected(icon);
    setShowCustomInput(false); // Esconde o input se escolher um da lista
  };

  const handleCustomClick = () => {
    setShowCustomInput(true);
    setSelected(''); // Limpa a seleção visual para focar no input
  };

  return (
    <div className={styles.container}>
      <span className={styles.label}>{label}</span>
      
      {/* O Input Escondido que envia o dado real para o Server Action */}
      <input type="hidden" name={name} value={selected} />

      <div className={styles.grid}>
        {/* Lista de Ícones Prontos */}
        {PRESETS.map(icon => (
          <button
            key={icon}
            type="button"
            className={`${styles.iconBtn} ${selected === icon ? styles.selected : ''}`}
            onClick={() => handlePresetClick(icon)}
          >
            {icon}
          </button>
        ))}

        {/* Botão de "Mais" (+) */}
        <button
          type="button"
          className={`${styles.iconBtn} ${styles.addBtn} ${showCustomInput ? styles.selected : ''}`}
          onClick={handleCustomClick}
          title="Outro ícone"
        >
          ➕
        </button>
      </div>

      {/* Input que aparece só quando clica no + */}
      {showCustomInput && (
        <div className={styles.customInputWrapper}>
          <label>Digite ou pressione <b>Win + .</b> (Ponto)</label>
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Cole seu emoji aqui..."
            maxLength={2} // Limita a 1 ou 2 caracteres (emojis as vezes ocupam 2)
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}