import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { AccountGrid } from "./AccountGrid"
import styles from "../categories/page.module.scss" 

export default async function AccountsPage() {
  const today = new Date(); // Definimos o marco temporal "agora"

  const data = await prisma.account.findMany({
    orderBy: { name: 'asc' },
    include: {
      transactions: {
        // --- O FILTRO QUE FALTAVA ---
        where: {
          isPaid: true,
          date: { lte: today } // "lte" significa "less than or equal" (menor ou igual a hoje)
        },
        select: { amount: true, type: true }
      }
    }
  })

  const accounts = data.map(acc => {
    // Agora o totalIncome e totalExpense só somam o que já passou por conta do filtro acima
    const totalIncome = acc.transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

    const totalExpense = acc.transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

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