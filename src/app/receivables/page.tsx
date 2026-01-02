// ARQUIVO: src/app/receivables/page.tsx
import { getReceivablesData } from "@/app/actions/receivables";
import { prisma } from "@/lib/prisma";
import { ReceivablesClient } from "./ReceivablesClient";
import styles from "./page.module.scss";

export default async function ReceivablesPage() {
  const data = await getReceivablesData();
  const accountsRaw = await prisma.account.findMany();
  const accounts = accountsRaw.map((acc) => ({ id: acc.id, name: acc.name }));

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1>Painel de Cobranças 👤</h1>
        <p>Controle de gastos de terceiros e reembolsos pendentes.</p>
      </header>

      {/* O ReceivablesClient agora recebe os dados e desenha os cards para o clique funcionar */}
      <ReceivablesClient data={data} accounts={accounts} />
    </main>
  );
}