import { prisma } from "@/lib/prisma"
import { updateRecurringExpense } from "@/app/actions/recurring"
import { CustomSelect } from "@/components/CustomSelect"
import styles from "./page.module.scss"
import Link from "next/link"
import { redirect } from "next/navigation"

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditRecurringPage({ params }: Props) {
  const { id } = await params
  
  // 1. Buscar a recorrência existente
  const expense = await prisma.recurringExpense.findUnique({
    where: { id },
    include: { category: true, account: true }
  })

  if (!expense) {
    redirect("/recurring")
  }

  // 2. Buscar listas para os selects
  const categories = await prisma.category.findMany()
  const accounts = await prisma.account.findMany()

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <h1>Editar Recorrência</h1>
      </div>

      <div className={styles.card}>
        <form action={updateRecurringExpense}>
          <input type="hidden" name="id" value={expense.id} />

          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <label>Descrição</label>
              <input 
                name="description" 
                defaultValue={expense.description} 
                required 
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Valor</label>
              <input 
                name="amount" 
                defaultValue={Number(expense.amount).toFixed(2)} 
                step="0.01" 
                required 
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Dia Vencimento</label>
              <input 
                name="day" 
                type="number" 
                min="1" max="31" 
                defaultValue={expense.day} 
                required 
              />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <CustomSelect 
                name="type" 
                label="Tipo"
                initialValue={expense.type}
                options={[
                  { value: 'expense', label: 'Despesa (-)' },
                  { value: 'income', label: 'Receita (+)' }
                ]}
              />
            </div>

            <div className={styles.inputGroup}>
              <CustomSelect 
                name="categoryId" 
                label="Categoria"
                initialValue={expense.categoryId || ""}
                options={categories.map(cat => ({
                  value: cat.id,
                  label: cat.name,
                  icon: cat.icon || undefined
                }))}
              />
            </div>

            <div className={styles.inputGroup}>
              <CustomSelect 
                name="accountId" 
                label="Conta"
                initialValue={expense.accountId}
                options={accounts.map(acc => ({
                  value: acc.id,
                  label: acc.name
                }))}
              />
            </div>
          </div>

          <button type="submit" className={styles.saveBtn}>Salvar Alterações</button>
          
          <Link href="/recurring" className={styles.cancelBtn}>
            Cancelar
          </Link>
        </form>
      </div>
    </main>
  )
}