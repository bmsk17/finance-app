import { prisma } from "@/lib/prisma"
import { updateCategory } from "@/app/actions/categories"
import Link from "next/link"
import { redirect } from "next/navigation"
// Reutilizamos o estilo da página de criação para manter o padrão
import styles from "../../new/page.module.scss" 
import { ColorPicker } from "@/components/ColorPicker"
import { IconPicker } from "@/components/IconPicker"

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditCategoryPage({ params }: Props) {
  const { id } = await params

  // 1. Busca os dados atuais da categoria
  const category = await prisma.category.findUnique({
    where: { id }
  })

  if (!category) {
    redirect("/categories")
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Editar Categoria</h1>
      
      <form action={updateCategory} className={styles.form}>
        
        {/* ID Escondido */}
        <input type="hidden" name="id" value={category.id} />

        {/* Nome */}
        <div className={styles.formGroup}>
          <label>Nome</label>
          <input 
            type="text" 
            name="name" 
            defaultValue={category.name}
            placeholder="Ex: Jogos, Investimento..." 
            required 
          />
        </div>

        {/* Icon e Color Pickers */}
        <IconPicker 
          name="icon" 
          label="Ícone" 
          initialValue={category.icon || "📁"}
        />

        <ColorPicker 
          name="color" 
          label="Cor da Categoria" 
          initialValue={category.color || "#3b82f6"}
        />

        {/* --- NOVO: CHECKBOX DE TERCEIROS --- */}
        <div className={styles.checkboxGroup}>
          <input 
            type="checkbox" 
            name="isThirdParty" 
            id="isThirdParty" 
            // O pulo do gato: já vem marcado se for true no banco
            defaultChecked={category.isThirdParty} 
          />
          <div className={styles.labelContainer}>
            <label htmlFor="isThirdParty">Categoria de Reembolso/Terceiros?</label>
            <p>Marque se as despesas daqui serão pagas por outra pessoa.</p>
          </div>
        </div>

        <button type="submit" className={styles.btnSubmit}>
          Salvar Alterações
        </button>

      </form>

      <Link href="/categories" className={styles.cancelLink}>
        ← Cancelar
      </Link>
    </main>
  )
}