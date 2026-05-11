// ARQUIVO: src/app/actions/accounts.ts
'use server'

import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

async function getUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");
  return (session.user as any).id;
}

export async function createAccount(formData: FormData) {
  const userId = await getUserId();
  const name = formData.get("name") as string
  const type = formData.get("type") as string
  const balanceStr = formData.get("balance") as string

  const balance = parseFloat(balanceStr.replace("R$", "").replace(/\s/g, "").replace(",", "."));

  await prisma.account.create({
    data: { name, type, balance, userId } // <-- Vincula ao usuário atual
  })

  revalidatePath("/")
  revalidatePath("/accounts")
  redirect("/")
}

export async function updateAccount(formData: FormData) {
  const userId = await getUserId();
  const id = formData.get("id") as string
  const name = formData.get("name") as string
  const type = formData.get("type") as string
  const balance = parseFloat(formData.get("balance") as string)

  if (!id || !name) return

  await prisma.account.updateMany({
    where: { id, userId }, // <-- Atualização blindada
    data: { name, type, balance }
  })

  revalidatePath("/accounts")
  revalidatePath("/")
  redirect("/accounts")
}

export async function deleteAccount(formData: FormData) {
  const userId = await getUserId();
  const id = formData.get("id") as string
  if (!id) return

  try {
    await prisma.account.deleteMany({ where: { id, userId } }) // <-- Exclusão blindada
  } catch (error) {
    console.log("Erro ao deletar conta")
  }

  revalidatePath("/accounts")
  revalidatePath("/")
}

export async function getAccountStats(accountId: string) {
  const userId = await getUserId();
  const now = new Date();
  const year = now.getFullYear();

  const transactions = await prisma.transaction.findMany({
    where: {
      accountId,
      userId, // <-- Busca blindada
      date: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59) }
    },
    orderBy: { date: 'desc' },
    include: { category: true }
  });

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
  const periodBalance = totalIncome + totalExpense;

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const monthTrans = transactions.filter(t => t.date.getMonth() === i);
    const income = monthTrans.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
    const expense = monthTrans.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
    const label = new Date(year, i, 1).toLocaleDateString('pt-BR', { month: 'short' });
    return { index: i, label, income, expense };
  });

  const allTransactions = transactions.map(t => ({
    id: t.id,
    description: t.description,
    amount: Number(t.amount),
    type: t.type,
    date: t.date,
    categoryName: t.category?.name || 'Outros',
    categoryIcon: t.category?.icon || '📄'
  }));

  return { kpis: { totalIncome, totalExpense, periodBalance }, chart: monthlyData, transactions: allTransactions };
}