import { createTransaction } from "@/app/actions/transactions";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import styles from "./page.module.scss";

export default async function NewTransactionPage() {
  // 1. Buscamos as contas cruas
  const accountsRaw = await prisma.account.findMany();
  const categories = await prisma.category.findMany();

  // 2. Calculamos o Saldo Real (Igualzinho ao Dashboard)
  const accounts = await Promise.all(accountsRaw.map(async (acc) => {
    const agg = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { 
        accountId: acc.id, 
        isPaid: true, 
        date: { lte: new Date() } // Até hoje
      }
    });
    return { 
      ...acc, 
      currentBalance: Number(acc.balance) + (Number(agg._sum.amount) || 0) 
    };
  }));

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Nova Movimentação</h1>

        <form action={createTransaction} className={styles.form}>
          
          {/* Descrição */}
          <div className={styles.formGroup}>
            <label>Descrição</label>
            <input type="text" name="description" placeholder="Ex: Mercado, Salário..." required />
          </div>

           <div className={styles.row}>
            {/* Valor */}
            <div className={styles.formGroup}>
              <label>Valor da Parcela (R$)</label>
              <input type="number" name="amount" step="0.01" placeholder="0,00" required />
            </div>

            {/* Data */}
            <div className={styles.formGroup}>
              <label>Data 1ª Parcela</label>
              <input 
                type="date" 
                name="date" 
                defaultValue={new Date().toISOString().split('T')[0]} 
                required 
              />
            </div>
          </div>
          
           <div className={styles.row}>
            {/* Tipo */}
            <div className={styles.formGroup}>
              <label>Tipo</label>
              <select name="type" defaultValue="expense">
                <option value="expense">🔴 Despesa</option>
                <option value="income">🟢 Receita</option>
              </select>
            </div>
            {/* Categoria */}
             <div className={styles.formGroup}>
              <label>Categoria</label>
              <select name="categoryId" required defaultValue="">
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
            <select name="accountId" required>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} (Saldo Atual: R$ {Number(acc.currentBalance).toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          {/* --- BLOCO DE PARCELAMENTO E STATUS (Refatorado para SCSS) --- */}
          
          <div className={styles.installmentsBlock}>
            {/* Campo de Parcelas */}
            <div className={styles.formGroup}>
              <label>Repetir (Parcelas)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="number" 
                  name="installments" 
                  defaultValue="1" 
                  min="1" 
                  max="48"
                  style={{ width: '80px' }} 
                />
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>meses (1x = à vista)</span>
              </div>
            </div>

            {/* Checkbox de Status */}
            <div>
                <div className={styles.checkboxWrapper}>
                <input 
                    type="checkbox" 
                    name="isPaid" 
                    id="isPaid" 
                    defaultChecked 
                />
                <label htmlFor="isPaid">
                    Já está pago/consolidado?
                </label>
                </div>
                <p className={styles.helperText}>
                Desmarque se for um gasto planejado (opcional) ou futuro.
                </p>
            </div>
          </div>

          {/* ------------------------- */}

          <button type="submit" className={styles.btnSubmit}>
            Salvar
          </button>
        </form>

        <Link href="/" className={styles.backLink}>
          ← Cancelar e voltar
        </Link>
      </div>
    </main>
  );
}