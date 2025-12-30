import { updateTransaction } from "@/app/actions/transactions";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import styles from "../../new/page.module.scss";
import { redirect } from "next/navigation";

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTransactionPage({ params }: EditPageProps) {
  const { id } = await params;

  // 1. Buscar os dados originais para preencher o form
  const transaction = await prisma.transaction.findUnique({
    where: { id },
  });

  if (!transaction) {
    redirect("/"); // Se não achar (url errada), volta pra home
  }

  // 2. Buscar dados auxiliares (Contas e Categorias)
  const accountsRaw = await prisma.account.findMany();
  const categories = await prisma.category.findMany();

  // Recalcular saldo das contas (só visual)
  const accounts = await Promise.all(accountsRaw.map(async (acc) => {
    const agg = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { accountId: acc.id, isPaid: true, date: { lte: new Date() } }
    });
    return { ...acc, currentBalance: Number(acc.balance) + (Number(agg._sum.amount) || 0) };
  }));

  // Formatar a data para o input HTML (yyyy-MM-dd)
  const dateValue = transaction.date.toISOString().split('T')[0];

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Editar Movimentação</h1>

        <form action={updateTransaction} className={styles.form}>
          {/* ID Oculto (Necessário para o backend saber quem atualizar) */}
          <input type="hidden" name="id" value={transaction.id} />

          {/* Descrição */}
          <div className={styles.formGroup}>
            <label>Descrição</label>
            <input 
              type="text" 
              name="description" 
              defaultValue={transaction.description} 
              required 
            />
          </div>

           <div className={styles.row}>
            {/* Valor (Usamos Math.abs para mostrar positivo no input) */}
            <div className={styles.formGroup}>
              <label>Valor (R$)</label>
              <input 
                type="number" 
                name="amount" 
                step="0.01" 
                defaultValue={Math.abs(Number(transaction.amount))} 
                required 
              />
            </div>

            {/* Data */}
            <div className={styles.formGroup}>
              <label>Data</label>
              <input 
                type="date" 
                name="date" 
                defaultValue={dateValue} 
                required 
              />
            </div>
          </div>
          
           <div className={styles.row}>
            {/* Tipo */}
            <div className={styles.formGroup}>
              <label>Tipo</label>
              <select name="type" defaultValue={transaction.type}>
                <option value="expense">🔴 Despesa</option>
                <option value="income">🟢 Receita</option>
              </select>
            </div>
            {/* Categoria */}
             <div className={styles.formGroup}>
              <label>Categoria</label>
              <select name="categoryId" defaultValue={transaction.categoryId || ""} required>
                <option value="" disabled>Selecione...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conta */}
           <div className={styles.formGroup}>
            <label>Conta / Carteira</label>
            <select name="accountId" defaultValue={transaction.accountId} required>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (Saldo: R$ {Number(acc.currentBalance).toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          {/* Status (Pago ou não) */}
          {/* Reutilizamos o estilo .installmentsBlock apenas para o checkbox ficar bonito */}
          <div className={styles.installmentsBlock} style={{ marginTop: 0 }}>
             <div className={styles.checkboxWrapper}>
                <input 
                    type="checkbox" 
                    name="isPaid" 
                    id="isPaid" 
                    defaultChecked={transaction.isPaid}
                />
                <label htmlFor="isPaid">
                    Está pago/consolidado?
                </label>
             </div>
             {/* Removemos a parte de parcelas aqui, pois editar parcelas é complexo */}
          </div>

          <button type="submit" className={styles.btnSubmit}>
            Salvar Alterações
          </button>
        </form>

        <Link href="/" className={styles.backLink}>
          ← Cancelar
        </Link>
      </div>
    </main>
  );
}