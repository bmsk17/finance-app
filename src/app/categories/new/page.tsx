import { createCategory } from "@/app/actions/categories"
import Link from "next/link"
import styles from "./page.module.scss"
import { ColorPicker } from "@/components/ColorPicker"
import { IconPicker } from "@/components/IconPicker"

export default function NewCategoryPage() {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Criar Categoria</h1>
      
      <form action={createCategory} className={styles.form}>
        
        {/* Nome (Input Padrão) */}
        <div className={styles.formGroup}>
          <label>Nome</label>
          <input 
            type="text" 
            name="name" 
            placeholder="Ex: Jogos, Investimento..." 
            required 
            autoFocus
          />
        </div>

        {/* Componentes Visuais (Substituem os inputs feios) */}
        <IconPicker 
          name="icon" 
          label="Ícone" 
        />

        <ColorPicker 
          name="color" 
          label="Cor da Categoria" 
        />

        <button type="submit" className={styles.btnSubmit}>
          Salvar Categoria
        </button>

      </form>

      <Link href="/categories" className={styles.cancelLink}>
        ← Cancelar
      </Link>
    </main>
  )
}