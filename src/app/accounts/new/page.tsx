import { createAccount } from "@/app/actions/accounts";
import Link from "next/link";
import styles from "./page.module.scss";

export default function NewAccountPage() {
  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Nova Conta / Banco</h1>

        <form action={createAccount}>
          
          <div className={styles.formGroup}>
            <label>Nome do Banco ou Carteira</label>
            <input 
              type="text" 
              name="name" 
              placeholder="Ex: Nubank, Inter, Cofre..." 
              required 
            />
          </div>

          <div className={styles.formGroup}>
            <label>Tipo</label>
            <select name="type">
              <option value="Conta Corrente">Conta Corrente</option>
              <option value="Carteira">Carteira / Dinheiro Físico</option>
              <option value="Investimento">Investimento</option>
              <option value="Poupança">Poupança</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Saldo Atual (R$)</label>
            <input 
              type="number" 
              name="balance" 
              step="0.01" 
              placeholder="0,00" 
              required 
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Quanto dinheiro tem lá hoje?
            </p>
          </div>

          <button type="submit" className={styles.btnSubmit}>
            Criar Conta
          </button>
        </form>

        <Link href="/" className={styles.cancelLink}>
          ← Cancelar
        </Link>
      </div>
    </main>
  );
}