// ARQUIVO: src/app/categories/page.tsx
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import styles from "./page.module.scss"
import { CategoryGrid } from "./CategoryGrid"

// 1. Importações do motor de Login
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function CategoriesPage() {
  // 2. VERIFICAÇÃO DE IDENTIDADE: Pegamos o ID do usuário logado
  const session = await getServerSession(authOptions)
  
  // Se por algum motivo o usuário tentar burlar a URL sem estar logado, ele é expulso
  if (!session?.user) {
    redirect("/login")
  }
  
  const userId = (session.user as any).id

  // 3. Busca os dados no servidor (Blindado)
  const categories = await prisma.category.findMany({
    where: { userId }, // A MÁGICA AQUI: O Prisma agora só traz as categorias do Bernardo
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

      {/* 4. Passa os dados para o componente interativo (Client Side) */}
      <CategoryGrid categories={categories} />

    </main>
  )
}