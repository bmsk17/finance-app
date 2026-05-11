// ARQUIVO: src/app/actions/recurring.ts
'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

// 1. Importações da Sessão
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// 2. Função auxiliar para pegar o crachá
async function getUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");
  return (session.user as any).id;
}

// --- CRUD BÁSICO ---

export async function createRecurringExpense(formData: FormData) {
  const userId = await getUserId(); // Blindagem

  const description = formData.get("description") as string
  const amountStr = formData.get("amount") as string
  const type = formData.get("type") as string
  const day = parseInt(formData.get("day") as string)
  const categoryId = formData.get("categoryId") as string
  const accountId = formData.get("accountId") as string

  if (!description || !amountStr || !day || !accountId) return;

  let baseAmount = parseFloat(amountStr.replace("R$", "").replace(/\./g, "").replace(",", "."))
  baseAmount = Math.abs(baseAmount)

  await prisma.recurringExpense.create({
    data: { 
      description, 
      amount: baseAmount, 
      type, 
      day, 
      categoryId: categoryId || null, 
      accountId,
      userId // <-- Vincula ao usuário atual
    }
  })

  revalidatePath("/recurring")
  revalidatePath("/")
}

export async function deleteRecurringExpense(formData: FormData) {
  const userId = await getUserId(); // Blindagem
  const id = formData.get("id") as string
  if (!id) return;

  // Usa deleteMany para garantir que só apaga se for do dono
  await prisma.recurringExpense.deleteMany({ where: { id, userId } })
  
  revalidatePath("/recurring")
  revalidatePath("/")
}

// --- AUTOMATIZAÇÃO (O CÉREBRO) ---

// 1. Verifica pendências
export async function checkPendingRecurring(month: number, year: number) {
  const userId = await getUserId(); // Blindagem

  // Pega todas as fixas APENAS DESTE USUÁRIO
  const allRecurring = await prisma.recurringExpense.findMany({
    where: { userId }, // Blindado
    include: { category: true, account: true }
  });

  if (allRecurring.length === 0) return [];

  // Intervalo do mês atual
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  // Pega transações já lançadas neste mês APENAS DESTE USUÁRIO
  const existingTransactions = await prisma.transaction.findMany({
    where: {
      userId, // Blindado
      date: { gte: startDate, lte: endDate }
    }
  });

  // Filtra: Retorna as Recorrentes que NÃO foram achadas nas Transações
  return allRecurring.filter(rec => {
    const isAlreadyLaunched = existingTransactions.some(t => {
      const sameName = t.description.toLowerCase() === rec.description.toLowerCase();
      const sameAmount = Math.abs(Number(t.amount)) === Math.abs(Number(rec.amount));
      return sameName && sameAmount;
    });
    return !isAlreadyLaunched;
  });
}

// 2. Lança as pendências
export async function generateRecurringTransactions(formData: FormData) {
  const userId = await getUserId(); // Blindagem
  
  const recurringIdsStr = formData.get("ids") as string;
  const month = parseInt(formData.get("month") as string);
  const year = parseInt(formData.get("year") as string);
  
  if (!recurringIdsStr) return;

  const ids = JSON.parse(recurringIdsStr) as string[];

  const recurringItems = await prisma.recurringExpense.findMany({
    where: { id: { in: ids }, userId } // Blindado
  });

  const operations = recurringItems.map(item => {
    let targetDate = new Date(year, month, item.day);
    if (targetDate.getMonth() !== month) {
       targetDate.setDate(0); 
    }

    let finalAmount = Number(item.amount);
    if (item.type === 'expense') finalAmount = Math.abs(finalAmount) * -1;
    else finalAmount = Math.abs(finalAmount);

    return prisma.transaction.create({
      data: {
        description: item.description,
        amount: finalAmount,
        type: item.type,
        date: targetDate,
        categoryId: item.categoryId!,
        accountId: item.accountId,
        isPaid: false, 
        userId // <-- VITAL: Assina a nova transação gerada
      }
    });
  });

  await prisma.$transaction(operations);
  revalidatePath("/");
}

export async function updateRecurringExpense(formData: FormData) {
  const userId = await getUserId(); // Blindagem
  
  const id = formData.get("id") as string
  const description = formData.get("description") as string
  const amountStr = formData.get("amount") as string
  const type = formData.get("type") as string
  const day = parseInt(formData.get("day") as string)
  const categoryId = formData.get("categoryId") as string
  const accountId = formData.get("accountId") as string

  if (!id || !description || !amountStr || !day || !accountId) return;

  let baseAmount = parseFloat(amountStr.replace("R$", "").replace(/\./g, "").replace(",", "."))
  baseAmount = Math.abs(baseAmount)

  await prisma.recurringExpense.updateMany({
    where: { id, userId }, // Blindado
    data: { 
      description, 
      amount: baseAmount, 
      type, 
      day, 
      categoryId: categoryId || null, 
      accountId 
    }
  })

  revalidatePath("/recurring")
  revalidatePath("/")
  redirect("/recurring") 
}