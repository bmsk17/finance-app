'use server'

import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"


export async function createAccount(formData: FormData) {
  const name = formData.get("name") as string
  const type = formData.get("type") as string
  const balanceStr = formData.get("balance") as string

  // CORREÇÃO: Remove o R$, troca a vírgula por ponto e converte.
  // IMPORTANTE: Removi o .replace(/\./g, "") que estava apagando os pontos decimais.
  const balance = parseFloat(
    balanceStr
      .replace("R$", "")
      .replace(/\s/g, "")
      .replace(",", ".")
  );

  await prisma.account.create({
    data: { name, type, balance }
  })

  revalidatePath("/")
  revalidatePath("/accounts")
  redirect("/")
}

// --- ATUALIZAÇÃO ---
export async function updateAccount(formData: FormData) {
  const id = formData.get("id") as string
  const name = formData.get("name") as string
  const type = formData.get("type") as string
  // Nota: Geralmente não editamos saldo diretamente aqui se já houver transações, 
  // mas para corrigir erros iniciais, vamos permitir.
  const balance = parseFloat(formData.get("balance") as string)

  if (!id || !name) return

  await prisma.account.update({
    where: { id },
    data: { name, type, balance }
  })

  revalidatePath("/accounts")
  revalidatePath("/")
  redirect("/accounts")
}

// --- DELETAR ---
export async function deleteAccount(formData: FormData) {
  const id = formData.get("id") as string
  if (!id) return

  try {
    await prisma.account.delete({ where: { id } })
  } catch (error) {
    console.log("Erro ao deletar conta (pode ter transações)")
  }

  revalidatePath("/accounts")
  revalidatePath("/")
}

// --- ESTATÍSTICAS PARA O MODAL (O Pulo do Gato) ---
export async function getAccountStats(accountId: string) {
  const now = new Date();
  const year = now.getFullYear();

  // 1. Busca TUDO do ano (sem limite de quantidade)
  const transactions = await prisma.transaction.findMany({
    where: {
      accountId,
      date: {
        gte: new Date(year, 0, 1),
        lte: new Date(year, 11, 31, 23, 59, 59)
      }
    },
    orderBy: { date: 'desc' },
    include: { category: true }
  });

  // 2. Cálculos Gerais (KPIs)
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const periodBalance = totalIncome + totalExpense;

  // 3. Dados do Gráfico (Mensal)
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const monthTrans = transactions.filter(t => t.date.getMonth() === i);
    
    const income = monthTrans
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + Number(t.amount), 0);
      
    const expense = monthTrans
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + Number(t.amount), 0);

    const label = new Date(year, i, 1).toLocaleDateString('pt-BR', { month: 'short' });
    // Vamos mandar o índice do mês (0-11) para facilitar o filtro no front
    return { index: i, label, income, expense };
  });

  // 4. Lista Completa Formatada
  const allTransactions = transactions.map(t => ({
    id: t.id,
    description: t.description,
    amount: Number(t.amount),
    type: t.type,
    date: t.date,
    categoryName: t.category?.name || 'Outros',
    categoryIcon: t.category?.icon || '📄'
  }));

  return { 
    kpis: { totalIncome, totalExpense, periodBalance },
    chart: monthlyData, 
    transactions: allTransactions // Mandamos TUDO agora
  };
}