'use client'

import { format, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
// 1. Adicionado usePathname
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState } from 'react'
import { MonthPickerPopup } from '../MonthPickerPopup' 
import styles from './styles.module.scss'

export function MonthSelector() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname() // 2. Pega a rota atual (ex: '/receivables' ou '/')
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
    // 3. CORREÇÃO: Mantém na página atual usando pathname em vez de '/' fixo
    const url = `${pathname}?month=${month}&year=${year}`
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