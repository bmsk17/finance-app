'use client'

import { format, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { MonthPickerPopup } from '../MonthPickerPopup' // Importando da pasta vizinha
import styles from './styles.module.scss'

export function MonthSelector() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(false)

  // 1. Ler dados da URL
  const currentMonth = searchParams.get('month') 
    ? Number(searchParams.get('month')) 
    : new Date().getMonth()
    
  const currentYear = searchParams.get('year') 
    ? Number(searchParams.get('year')) 
    : new Date().getFullYear()

  const selectedDate = new Date(currentYear, currentMonth, 1)

  // 2. Funções de Ação
  const updateUrl = (month: number, year: number) => {
    const url = `/?month=${month}&year=${year}`
    router.push(url)
    setIsOpen(false)
  }

  const changeMonthArrow = (offset: number) => {
    const newDate = offset > 0 ? addMonths(selectedDate, 1) : subMonths(selectedDate, 1)
    updateUrl(newDate.getMonth(), newDate.getFullYear())
  }

  return (
    <div className={styles.container}>
      
      {/* Barra Principal */}
      <div className={styles.bar}>
        <button onClick={() => changeMonthArrow(-1)} className={styles.arrowBtn}>
          ◀
        </button>
        
        <button onClick={() => setIsOpen(!isOpen)} className={styles.mainLabel}>
          {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
        </button>

        <button onClick={() => changeMonthArrow(1)} className={styles.arrowBtn}>
          ▶
        </button>
      </div>

      {/* Popup Condicional */}
      {isOpen && (
        <MonthPickerPopup 
          selectedYear={currentYear}
          selectedMonth={currentMonth}
          onSelect={updateUrl}
          onClose={() => setIsOpen(false)}
        />
      )}

    </div>
  )
}