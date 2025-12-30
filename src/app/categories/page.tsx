import { prisma } from "@/lib/prisma"
import Link from "next/link"
import styles from "./page.module.scss"
import { CategoryGrid } from "./CategoryGrid"

export default async function CategoriesPage() {
  // 1. Busca os dados no servidor (Server Side)
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' }
  })

  return (
    <main className={styles.container}>
      
      <div className={styles.header}>
        <h1>Minhas Categorias</h1>
        <Link href="/categories/new" className={styles.newBtn}>
          + Nova Categoria
        </Link>
      </div>

      {/* 2. Passa os dados para o componente interativo (Client Side) */}
      <CategoryGrid categories={categories} />

    </main>
  )
}