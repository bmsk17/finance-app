import { prisma } from "@/lib/prisma";
import {
  createRecurringExpense,
  deleteRecurringExpense,
} from "@/app/actions/recurring";
import { CustomSelect } from "@/components/CustomSelect";
import styles from "./page.module.scss";
import Link from "next/link";

export default async function RecurringPage() {
  // Buscar dados
  const recurring = await prisma.recurringExpense.findMany({
    orderBy: { day: "asc" },
    include: { category: true, account: true },
  });

  const categories = await prisma.category.findMany();
  const accounts = await prisma.account.findMany();

  return (
    <main className={styles.container}>
      {/* HEADER */}
      <div className={styles.header}>
        <Link
          href="/"
          style={{
            textDecoration: "none",
            color: "var(--text-secondary)",
            fontSize: "0.9rem",
            display: "block",
            marginBottom: "10px",
          }}
        >
          ← Voltar para Dashboard
        </Link>
        <h1>Despesas Fixas & Assinaturas</h1>
        <p>
          Cadastre contas que se repetem todo mês para automatizar o lançamento.
        </p>
      </div>

      {/* FORMULÁRIO */}
      <div className={styles.card}>
        <h2
          style={{
            fontSize: "1.1rem",
            marginBottom: "20px",
            color: "var(--text-primary)",
          }}
        >
          Nova Recorrência
        </h2>

        <form action={createRecurringExpense}>
          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <label>Descrição</label>
              <input name="description" placeholder="Ex: Netflix" required />
            </div>
            <div className={styles.inputGroup}>
              <label>Valor</label>
              <input name="amount" placeholder="0,00" step="0.01" required />
            </div>
            <div className={styles.inputGroup}>
              <label>Dia Vencimento</label>
              <input
                name="day"
                type="number"
                min="1"
                max="31"
                placeholder="Dia"
                required
              />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <label>Tipo</label>
              <CustomSelect
                name="type"
                label="Tipo"
                initialValue="expense"
                options={[
                  { value: "expense", label: "Despesa (-)" },
                  { value: "income", label: "Receita (+)" },
                ]}
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Categoria</label>
              <CustomSelect 
                name="categoryId" 
                label="Categoria"
                options={categories.map(cat => ({
                  value: cat.id,
                  label: cat.name,
                  icon: cat.icon // Passamos o ícone também!
                }))}
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Conta</label>
              <CustomSelect 
                name="accountId" 
                label="Conta"
                options={accounts.map(acc => ({
                  value: acc.id,
                  label: acc.name
                }))}
              />
            </div>
          </div>

          <button type="submit" className={styles.saveBtn}>
            Salvar Recorrência
          </button>
        </form>
      </div>

      {/* LISTA */}
      <div className={styles.card}>
        <h2
          style={{
            fontSize: "1.1rem",
            marginBottom: "20px",
            color: "var(--text-primary)",
          }}
        >
          Cadastrados ({recurring.length})
        </h2>

        {recurring.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", textAlign: "center" }}>
            Nenhuma conta fixa cadastrada.
          </p>
        ) : (
          recurring.map((item) => (
            <div key={item.id} className={styles.item}>
              <div className={styles.itemInfo}>
                <div className={styles.dayBadge}>{item.day}</div>
                <div>
                  <div
                    style={{ fontWeight: "bold", color: "var(--text-primary)" }}
                  >
                    {item.description}
                  </div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {item.category?.icon} {item.category?.name} •{" "}
                    {item.account.name}
                  </div>
                </div>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "16px" }}
              >
                <span
                  style={{
                    fontWeight: "bold",
                    color: item.type === "expense" ? "#ef4444" : "#10b981",
                  }}
                >
                  {item.type === "expense" ? "-" : "+"} R${" "}
                  {Number(item.amount).toFixed(2)}
                </span>
                
                {/* --- NOVO: BOTÃO EDITAR --- */}
                 <Link href={`/recurring/edit/${item.id}`} style={{ textDecoration: 'none' }}>
                   <button 
                     type="button" 
                     className={styles.deleteBtn} // Podemos reaproveitar a classe ou criar uma .editBtn
                     title="Editar"
                     style={{ fontSize: '1.2rem', marginRight: '8px' }} // Pequeno ajuste inline
                   >
                     ✏️
                   </button>
                 </Link>
                 {/* -------------------------- */}

                <form action={deleteRecurringExpense}>
                  <input type="hidden" name="id" value={item.id} />
                  <button
                    type="submit"
                    className={styles.deleteBtn}
                    title="Remover"
                  >
                    🗑️
                  </button>
                </form>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
