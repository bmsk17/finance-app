// ARQUIVO: src/app/import/page.tsx
import { prisma } from "@/lib/prisma"
import { ImportClient } from "./ImportClient"

// --- IMPORTAÇÕES DE SEGURANÇA ---
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function ImportPage() {
  // 1. VERIFICAÇÃO DE IDENTIDADE
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect("/login")
  }
  const userId = (session.user as any).id

  // 2. BUSCAS BLINDADAS (Apenas o que pertence ao utilizador)
  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: { name: 'asc' }
  })
  
  const rawAccounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { name: 'asc' }
  })

  // Procuramos as transações recentes para a função "Relacionar" (também blindado)
  const recentRawTransactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 500 
  })

  const accounts = rawAccounts.map(acc => ({ ...acc, balance: Number(acc.balance) }))
  
  const recentTransactions = recentRawTransactions.map(t => ({
    ...t,
    amount: Number(t.amount),
    date: t.date.toISOString() 
  }))

  return (
    <ImportClient 
      categories={categories} 
      accounts={accounts} 
      recentTransactions={recentTransactions} 
    />
  )
}