'use client'

import { useState } from 'react'
import { CategoryModal } from '@/components/CategoryModal' // O modal que acabamos de criar
import { deleteCategory } from '@/app/actions/categories'
import Link from 'next/link'
import styles from './page.module.scss' // Reaproveitamos o mesmo CSS

interface Category {
  id: string
  name: string
  icon: string | null;
  color: string | null;
}

interface Props {
  categories: Category[]
}

export function CategoryGrid({ categories }: Props) {
  // Estado para controlar qual categoria está aberta no Modal
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

  return (
    <>
      <div className={styles.grid}>
        {categories.map((cat) => (
          <div 
            key={cat.id} 
            className={styles.card}
            // Ao clicar no card, abre o modal
            onClick={() => setSelectedCategory(cat)}
            style={{ cursor: 'pointer' }}
          >
            
            <div 
              className={styles.iconWrapper}
              style={{ 
                backgroundColor: cat.color ? `${cat.color}20` : '#3b82f620', 
                color: cat.color || '#3b82f6'
              }}
            >
              {cat.icon}
            </div>

            <span className={styles.catName}>{cat.name}</span>

            <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
              {/* e.stopPropagation impede que clicar nos botões abra o modal */}
              
              <Link href={`/categories/edit/${cat.id}`}>
                <button className={styles.actionBtn} title="Editar">✏️</button>
              </Link>

              <form action={deleteCategory}>
                <input type="hidden" name="id" value={cat.id} />
                <button 
                  type="submit" 
                  className={`${styles.actionBtn} ${styles.deleteBtn}`} 
                  title="Excluir"
                >
                  🗑️
                </button>
              </form>
            </div>

          </div>
        ))}

        {categories.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#64748b', padding: '40px' }}>
            Nenhuma categoria encontrada. <br/>
            Crie a primeira para organizar suas finanças!
          </div>
        )}
      </div>

      {/* RENDERIZA O MODAL SE TIVER ALGO SELECIONADO */}
      {selectedCategory && (
        <CategoryModal 
          category={{
            ...selectedCategory,
            // Fallback de segurança: se for null, usa o padrão
            icon: selectedCategory.icon || "📁", 
            color: selectedCategory.color || "#3b82f6"
          }} 
          onClose={() => setSelectedCategory(null)} 
        />
      )}
    </>
  )
}