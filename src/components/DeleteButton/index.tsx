'use client'

import { useState } from 'react'
import { deleteTransaction } from '@/app/actions/transactions'
import styles from './styles.module.scss'

interface DeleteButtonProps {
  transactionId: string
  installmentId: string | null // Se for null, não é parcelado
}

export function DeleteButton({ transactionId, installmentId }: DeleteButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Função disparada ao clicar na lixeira
  const handleClick = (e: React.FormEvent) => {
    e.preventDefault() // Não envia o form ainda
    
    if (installmentId) {
      // Se tem parcelas, pergunta o que fazer
      setShowModal(true)
    } else {
      // Se é única, manda bala
      handleDelete('single')
    }
  }

  // Função que realmente chama a Server Action
  const handleDelete = async (mode: 'single' | 'all') => {
    setIsDeleting(true)
    
    // Precisamos criar um FormData manual para chamar a action
    const formData = new FormData()
    formData.append('id', transactionId)
    formData.append('deleteMode', mode)

    await deleteTransaction(formData)
    
    setIsDeleting(false)
    setShowModal(false)
  }

  return (
    <>
      <button 
        onClick={handleClick} 
        className={styles.deleteBtn} 
        title="Excluir"
        disabled={isDeleting}
      >
        {isDeleting ? '...' : '🗑️'}
      </button>

      {/* MODAL DE CONFIRMAÇÃO */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Excluir Parcelamento?</h3>
            <p>Esta transação faz parte de um grupo de parcelas.</p>
            
            <div className={styles.actions}>
              <button 
                className={styles.btnAll} 
                onClick={() => handleDelete('all')}
              >
                Apagar TODAS as parcelas
              </button>
              
              <button 
                className={styles.btnSingle} 
                onClick={() => handleDelete('single')}
              >
                Apagar apenas ESTA (deste mês)
              </button>

              <button 
                className={styles.btnCancel} 
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}