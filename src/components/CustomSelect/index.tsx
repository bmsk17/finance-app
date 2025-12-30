'use client'

import { useState, useRef, useEffect } from 'react';
import styles from './styles.module.scss';

interface Option {
  value: string;
  label: string;
  icon?: string | null;
}

interface CustomSelectProps {
  name: string;
  label?: string; // Deixei opcional caso queira usar sem label visível
  options: Option[];
  placeholder?: string;
  initialValue?: string;
  onChange?: (value: string) => void; // <--- NOVO: Para avisar quando mudar!
}

export function CustomSelect({ 
  name, 
  label, 
  options, 
  placeholder = "Selecione...", 
  initialValue = "",
  onChange // <--- Recebendo a função
}: CustomSelectProps) {
  
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVal, setSelectedVal] = useState(initialValue);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === selectedVal);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Função para tratar a seleção
  const handleSelect = (newValue: string) => {
    setSelectedVal(newValue);
    setIsOpen(false);
    
    // Se passaram uma função de onChange, chamamos ela agora!
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <div className={styles.container} ref={containerRef}>
      {label && <span className={styles.label}>{label}</span>}

      <input type="hidden" name={name} value={selectedVal} />

      <button 
        type="button" 
        className={styles.trigger} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {selectedOption ? (
            <>
              {selectedOption.icon && <span>{selectedOption.icon}</span>}
              {selectedOption.label}
            </>
          ) : (
            <span style={{ color: 'var(--text-secondary)' }}>{placeholder}</span>
          )}
        </span>
        <span className={styles.arrow}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {options.map(option => (
            <div
              key={option.value}
              className={`${styles.option} ${option.value === selectedVal ? styles.selected : ''}`}
              onClick={() => handleSelect(option.value)} // Usamos a nova função
            >
              {option.icon && <span>{option.icon}</span>}
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}