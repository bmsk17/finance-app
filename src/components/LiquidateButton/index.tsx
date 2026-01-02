'use client'

import { liquidateDebt } from "@/app/actions/receivables"
import { useState } from "react"
import styles from "./styles.module.scss"

interface Props {
  categoryId: string
  personName: string
  balance: number
  accounts: any[]
}

export function LiquidateButton({ categoryId, personName, balance, accounts }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  if (balance <= 0) return null

  return (
    <div className={styles.wrapper}>
      {!isOpen ? (
        <button className={styles.btnOpen} onClick={() => setIsOpen(true)}>
          💰 Registrar Pagamento
        </button>
      ) : (
        <form action={liquidateDebt} className={styles.formInline} onSubmit={() => setIsOpen(false)}>
          <input type="hidden" name="categoryId" value={categoryId} />
          <input type="hidden" name="personName" value={personName} />
          <input type="hidden" name="amount" value={balance} />
          
          <select name="accountId" required className={styles.select}>
            <option value="">Onde caiu o PIX?</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
          
          <div className={styles.actions}>
            <button type="submit" className={styles.btnConfirm}>Confirmar {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}</button>
            <button type="button" className={styles.btnCancel} onClick={() => setIsOpen(false)}>✕</button>
          </div>
        </form>
      )}
    </div>
  )
}