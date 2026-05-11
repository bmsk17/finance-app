// ARQUIVO: src/app/actions/categories.ts
'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// Função auxiliar para pegar o ID do usuário de forma segura
async function getUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");
  return (session.user as any).id;
}

export async function createCategory(formData: FormData) {
  const userId = await getUserId();
  const name = formData.get("name") as string
  const icon = formData.get("icon") as string
  const color = formData.get("color") as string
  const isThirdParty = formData.get("isThirdParty") === "on"

  if (!name) return;

  await prisma.category.create({
    data: {
      name,
      icon: icon || "📁", 
      color: color || "#64748b", 
      isThirdParty,
      userId // <-- Vincula ao usuário atual
    },
  })

  revalidatePath("/categories") 
  revalidatePath("/")           
  revalidatePath("/transactions/new")
  redirect("/categories")
}

export async function deleteCategory(formData: FormData) {
  const userId = await getUserId();
  const id = formData.get("id") as string

  if (!id) return;

  try {
    // Usa deleteMany para garantir que ele só apague se o ID e o USERID baterem
    await prisma.category.deleteMany({
      where: { id, userId }
    })
  } catch (e) {
    console.log("Erro ao apagar categoria")
  }

  revalidatePath("/categories")
  revalidatePath("/")
  revalidatePath("/transactions/new")
}

export async function getCategoryStats(categoryId: string) {
  const userId = await getUserId();
  const now = new Date();
  const year = now.getFullYear();
  const currentMonth = now.getMonth(); 

  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);

  const startOfMonth = new Date(year, currentMonth, 1);
  const endOfMonth = new Date(year, currentMonth + 1, 0);

  const transactions = await prisma.transaction.findMany({
    where: {
      categoryId,
      userId, // <-- Busca blindada
      date: { gte: startOfYear, lte: endOfYear },
      type: 'expense', 
    },
    orderBy: { date: 'desc' }
  });

  const yearTotal = transactions.reduce((acc, t) => acc + Number(t.amount), 0);
  const monthTotal = transactions
    .filter(t => t.date >= startOfMonth && t.date <= endOfMonth)
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const monthsPassed = currentMonth + 1;
  const average = yearTotal / (monthsPassed || 1);

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const total = transactions
      .filter(t => t.date.getMonth() === i)
      .reduce((acc, t) => acc + Number(t.amount), 0);
    const label = new Date(year, i, 1).toLocaleDateString('pt-BR', { month: 'short' });
    return { label, total };
  });

  const recentTransactions = transactions.slice(0, 5).map(t => ({
    id: t.id,
    description: t.description,
    amount: Number(t.amount),
    date: t.date,
  }));

  return { kpis: { monthTotal, yearTotal, average }, chart: monthlyData, recent: recentTransactions };
}

export async function updateCategory(formData: FormData) {
  const userId = await getUserId();
  const id = formData.get("id") as string
  const name = formData.get("name") as string
  const icon = formData.get("icon") as string
  const color = formData.get("color") as string
  const isThirdParty = formData.get("isThirdParty") === "on"

  if (!id || !name) return;

  await prisma.category.updateMany({
    where: { id, userId }, // <-- Atualização blindada
    data: { name, icon: icon || "📁", color: color || "#64748b", isThirdParty },
  })

  revalidatePath("/categories") 
  revalidatePath("/")           
  redirect("/categories")
}