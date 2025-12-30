'use client'

import { toggleTransactionStatus } from "@/app/actions/transactions"
import styles from "./styles.module.scss"

interface StatusButtonProps {
  id: string
  isPaid: boolean
}

export function StatusButton({ id, isPaid }: StatusButtonProps) {
  
  const handleClick = async () => {
    // 1. Criamos o "envelope" (FormData)
    const formData = new FormData()
    
    // 2. Colocamos os dados dentro dele
    formData.append('id', id)
    formData.append('isPaid', String(isPaid)) // Convertemos boolean para string
    
    // 3. Enviamos o envelope para a Server Action
    await toggleTransactionStatus(formData)
  }

  return (
    <button 
      onClick={handleClick}
      className={`${styles.btnCheck} ${isPaid ? styles.paid : ''}`}
      title={isPaid ? "Marcar como não pago" : "Confirmar pagamento"}
    >
      {isPaid ? "✔" : "⏳"}
    </button>
  )
}