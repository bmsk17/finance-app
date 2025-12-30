'use client'
import { useState } from 'react'
import { deleteAccount } from '@/app/actions/accounts'
import { AccountModal } from '@/components/AccountModal'
import Link from 'next/link'
// Reutilize o CSS que já existe ou crie um novo
import styles from '../categories/page.module.scss' // O estilo de card das categorias serve perfeitamente aqui!

export function AccountGrid({ accounts }: { accounts: any[] }) {
  const [selected, setSelected] = useState<any>(null)

  return (
    <>
      <div className={styles.grid}>
        {accounts.map(acc => (
          <div key={acc.id} className={styles.card} onClick={() => setSelected(acc)} style={{cursor:'pointer'}}>
            {/* Ícone baseado no tipo */}
            <div className={styles.iconWrapper} style={{background: '#3b82f620', color:'#3b82f6'}}>
               {acc.type === 'Carteira' ? '💵' : acc.type === 'Investimento' ? '📈' : '🏦'}
            </div>
            
            <span className={styles.catName}>{acc.name}</span>
            <span style={{fontSize:'1.1rem', fontWeight:'bold', color: Number(acc.balance) >= 0 ? 'var(--text-primary)' : '#ef4444'}}>
              R$ {Number(acc.balance).toFixed(2)}
            </span>

            <div className={styles.actions} onClick={e => e.stopPropagation()}>
               <Link href={`/accounts/edit/${acc.id}`}>
                 <button className={styles.actionBtn}>✏️</button>
               </Link>
               <form action={deleteAccount}>
                 <input type="hidden" name="id" value={acc.id} />
                 <button type="submit" className={`${styles.actionBtn} ${styles.deleteBtn}`}>🗑️</button>
               </form>
            </div>
          </div>
        ))}
      </div>

      {selected && <AccountModal account={selected} onClose={() => setSelected(null)} />}
    </>
  )
}