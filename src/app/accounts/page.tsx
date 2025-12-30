import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { AccountGrid } from "./AccountGrid"
import styles from "../categories/page.module.scss" 

export default async function AccountsPage() {
  const data = await prisma.account.findMany({
    orderBy: { name: 'asc' },
    include: {
      transactions: {
        select: { amount: true, type: true }
      }
    }
  })

  // CÁLCULO BLINDADO 🛡️
  const accounts = data.map(acc => {
    
    // 1. Receitas: Garantimos que o número é positivo com Math.abs
    const totalIncome = acc.transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

    // 2. Despesas: Garantimos que o número é positivo para poder SUBTRAIR depois
    const totalExpense = acc.transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

    // 3. A Matemática final
    // Saldo Inicial (Banco) + Entradas - Saídas
    const currentBalance = Number(acc.balance) + totalIncome - totalExpense;

    return {
      ...acc,
      balance: currentBalance, 
      transactions: undefined 
    }
  })

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <h1>Minhas Contas</h1>
        <Link href="/accounts/new" className={styles.newBtn}>
          + Nova Conta
        </Link>
      </div>
      
      <AccountGrid accounts={accounts} />
    </main>
  )
}