'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './styles.module.scss'

interface MonthPickerPopupProps {
  selectedYear: number
  selectedMonth: number
  onSelect: (month: number, year: number) => void
  onClose: () => void
}

export function MonthPickerPopup({ selectedYear, selectedMonth, onSelect, onClose }: MonthPickerPopupProps) {
  const [browsingYear, setBrowsingYear] = useState(selectedYear)
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setBrowsingYear(selectedYear)
  }, [selectedYear])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onClose])

  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

  return (
    <div ref={popupRef} className={styles.popupContainer}>
      {/* Cabeçalho: Navegar Anos */}
      <div className={styles.header}>
        <button onClick={() => setBrowsingYear(browsingYear - 1)} className={styles.navBtn}>
          ◀◀
        </button>
        <span>{browsingYear}</span>
        <button onClick={() => setBrowsingYear(browsingYear + 1)} className={styles.navBtn}>
          ▶▶
        </button>
      </div>

      {/* Grid de Meses */}
      <div className={styles.grid}>
        {months.map((monthName, index) => {
          const isSelected = index === selectedMonth && browsingYear === selectedYear
          
          return (
            <button
              key={monthName}
              onClick={() => onSelect(index, browsingYear)}
              className={`${styles.monthBtn} ${isSelected ? styles.selected : ''}`}
            >
              {monthName}
            </button>
          )
        })}
      </div>
    </div>
  )
}