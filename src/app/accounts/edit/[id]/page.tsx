import { prisma } from "@/lib/prisma"
import { updateAccount } from "@/app/actions/accounts"
import Link from "next/link"
import { redirect } from "next/navigation"
// Importamos o estilo da página de criação (new) para não precisar duplicar CSS
import styles from "../../new/page.module.scss"

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditAccountPage({ params }: Props) {
  const { id } = await params

  // 1. Busca os dados atuais da conta no banco
  const account = await prisma.account.findUnique({
    where: { id }
  })

  // Se tentar editar uma conta que não existe, volta para a lista
  if (!account) {
    redirect("/accounts")
  }

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Editar Conta</h1>

        <form action={updateAccount}>
          
          {/* O PULO DO GATO: Input invisível com o ID para a Action saber quem atualizar */}
          <input type="hidden" name="id" value={account.id} />

          <div className={styles.formGroup}>
            <label>Nome do Banco ou Carteira</label>
            <input 
              type="text" 
              name="name" 
              defaultValue={account.name} // Preenche com o valor atual
              placeholder="Ex: Nubank, Inter, Cofre..." 
              required 
            />
          </div>

          <div className={styles.formGroup}>
            <label>Tipo</label>
            <select name="type" defaultValue={account.type}>
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
              defaultValue={Number(account.balance)} // Converte Decimal do banco para número
              required 
            />
            <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px' }}>
              ⚠️ Ajuste manual: Use para corrigir erros de saldo.
            </p>
          </div>

          <button type="submit" className={styles.btnSubmit}>
            Salvar Alterações
          </button>
        </form>

        <Link href="/accounts" className={styles.cancelLink}>
          ← Cancelar e Voltar
        </Link>
      </div>
    </main>
  );
}