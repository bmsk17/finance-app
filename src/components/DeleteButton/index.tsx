// ARQUIVO: src/components/DeleteButton/index.tsx
'use client'

import { useState } from 'react'
import { deleteTransaction } from '@/app/actions/transactions'
import styles from './styles.module.scss'

interface DeleteButtonProps {
  transactionId: string
  installmentId: string | null
  size?: 'normal' | 'small'
}

export function DeleteButton({ transactionId, installmentId, size = 'normal' }: DeleteButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleClick = (e: React.FormEvent) => {
    e.preventDefault() 
    e.stopPropagation()
    // AGORA SEMPRE ABRE O MODAL, independente se é parcela ou não
    setShowModal(true)
  }

  const handleDelete = async (mode: 'single' | 'all') => {
    setIsDeleting(true)
    
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
        className={`${styles.deleteBtn} ${size === 'small' ? styles.small : ''}`} 
        title="Excluir"
        disabled={isDeleting}
      >
        {isDeleting ? '...' : '🗑️'}
      </button>

      {showModal && (
        <div className={styles.modalOverlay} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modal}>
            
            {/* LÓGICA INTELIGENTE DO MODAL */}
            {installmentId ? (
              // --- CASO 1: É PARCELADO ---
              <>
                <h3>Excluir Parcelamento?</h3>
                <p>Esta transação faz parte de um grupo de parcelas.</p>
                
                <div className={styles.actions}>
                  <button className={styles.btnAll} onClick={() => handleDelete('all')}>
                    Apagar TODAS as parcelas
                  </button>
                  
                  <button className={styles.btnSingle} onClick={() => handleDelete('single')}>
                    Apagar apenas ESTA (deste mês)
                  </button>

                  <button className={styles.btnCancel} onClick={() => setShowModal(false)}>
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              // --- CASO 2: É ITEM ÚNICO (O que faltava) ---
              <>
                <h3>Excluir Transação?</h3>
                <p>Tem certeza que deseja excluir este item permanentemente?</p>
                
                <div className={styles.actions}>
                  <button className={styles.btnAll} onClick={() => handleDelete('single')}>
                    Sim, excluir
                  </button>

                  <button className={styles.btnCancel} onClick={() => setShowModal(false)}>
                    Cancelar
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </>
  )
}