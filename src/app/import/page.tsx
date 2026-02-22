// ARQUIVO: src/app/import/page.tsx
import { prisma } from "@/lib/prisma"
import { ImportClient } from "./ImportClient"

export default async function ImportPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' }
  })
  
  const rawAccounts = await prisma.account.findMany({
    orderBy: { name: 'asc' }
  })

  // Procuramos as transações recentes para a função "Relacionar"
  const recentRawTransactions = await prisma.transaction.findMany({
    orderBy: { date: 'desc' },
    take: 500 // Pega as últimas 100
  })

  const accounts = rawAccounts.map(acc => ({ ...acc, balance: Number(acc.balance) }))
  
  // Limpamos os decimais das transações recentes
  const recentTransactions = recentRawTransactions.map(t => ({
    ...t,
    amount: Number(t.amount),
    date: t.date.toISOString() // Transforma a data num formato seguro para o Frontend
  }))

  return <ImportClient categories={categories} accounts={accounts} recentTransactions={recentTransactions} />
}