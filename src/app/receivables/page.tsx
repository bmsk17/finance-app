// ARQUIVO: src/app/receivables/page.tsx

import { getReceivablesData } from "@/app/actions/receivables";
import { prisma } from "@/lib/prisma";
import { ReceivablesClient } from "./ReceivablesClient";
import styles from "./page.module.scss";

export default async function ReceivablesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const today = new Date();

  // 1. Pega mês/ano da URL ou usa o atual se não tiver nada
  const month = params.month ? Number(params.month) : today.getMonth();
  const year = params.year ? Number(params.year) : today.getFullYear();

  // 2. Busca os dados filtrados por esse mês específico
  const data = await getReceivablesData(month, year);
  
  const accountsRaw = await prisma.account.findMany();
  const accounts = accountsRaw.map((acc) => ({ id: acc.id, name: acc.name }));

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        {/* Título e descrição simplificados, o seletor vai no Client */}
        <h1>Painel de Cobranças 👤</h1>
        <p>Controle de gastos de terceiros e reembolsos pendentes.</p>
      </header>

      <ReceivablesClient 
        data={data} 
        accounts={accounts} 
        // 3. Passamos o mês atual para o cliente desenhar a tela corretamente
        currentMonth={month}
        currentYear={year}
      />
    </main>
  );
}