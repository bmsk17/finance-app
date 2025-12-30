'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

// --- CRUD BÁSICO ---

export async function createRecurringExpense(formData: FormData) {
  const description = formData.get("description") as string
  const amountStr = formData.get("amount") as string
  const type = formData.get("type") as string
  const day = parseInt(formData.get("day") as string)
  const categoryId = formData.get("categoryId") as string
  const accountId = formData.get("accountId") as string

  if (!description || !amountStr || !day || !accountId) return;

  let baseAmount = parseFloat(amountStr.replace("R$", "").replace(/\./g, "").replace(",", "."))
  // Apenas garantimos que o valor é absoluto aqui, o sinal quem decide é o 'type' na hora de exibir
  baseAmount = Math.abs(baseAmount)

  await prisma.recurringExpense.create({
    data: { description, amount: baseAmount, type, day, categoryId: categoryId || null, accountId }
  })

  revalidatePath("/recurring")
  revalidatePath("/")
}

export async function deleteRecurringExpense(formData: FormData) {
  const id = formData.get("id") as string
  if (!id) return;
  await prisma.recurringExpense.delete({ where: { id } })
  revalidatePath("/recurring")
  revalidatePath("/")
}

// --- AUTOMATIZAÇÃO (O CÉREBRO) ---

// 1. Verifica pendências
export async function checkPendingRecurring(month: number, year: number) {
  // Pega todas as fixas
  const allRecurring = await prisma.recurringExpense.findMany({
    include: { category: true, account: true }
  });

  if (allRecurring.length === 0) return [];

  // Intervalo do mês atual
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  // Pega transações já lançadas neste mês
  const existingTransactions = await prisma.transaction.findMany({
    where: {
      date: { gte: startDate, lte: endDate }
    }
    
  });

  // Filtra: Retorna as Recorrentes que NÃO foram achadas nas Transações
  // Critério: Mesma descrição e mesmo valor (com margem pequena de erro para float)
  return allRecurring.filter(rec => {
    const isAlreadyLaunched = existingTransactions.some(t => {
      // Compara descrição (ignorando maiúsculas/minúsculas)
      const sameName = t.description.toLowerCase() === rec.description.toLowerCase();
      // Compara valor (converte Decimal para Number)
      const sameAmount = Math.abs(Number(t.amount)) === Math.abs(Number(rec.amount));
      return sameName && sameAmount;
    });
    return !isAlreadyLaunched;
  });
}

// 2. Lança as pendências
export async function generateRecurringTransactions(formData: FormData) {
  const recurringIdsStr = formData.get("ids") as string;
  const month = parseInt(formData.get("month") as string);
  const year = parseInt(formData.get("year") as string);
  
  if (!recurringIdsStr) return;

  const ids = JSON.parse(recurringIdsStr) as string[];

  const recurringItems = await prisma.recurringExpense.findMany({
    where: { id: { in: ids } }
  });

  const operations = recurringItems.map(item => {
    // Lógica de Data Segura (evita 30 de Fev)
    let targetDate = new Date(year, month, item.day);
    if (targetDate.getMonth() !== month) {
       targetDate.setDate(0); // Volta para último dia do mês anterior (correto)
    }

    // Prepara valor (negativo se for despesa)
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
        isPaid: false, // Entra como PLANEJADO (reloginho)
      }
    });
  });

  await prisma.$transaction(operations);
  revalidatePath("/");
  
}

export async function updateRecurringExpense(formData: FormData) {
  const id = formData.get("id") as string
  const description = formData.get("description") as string
  const amountStr = formData.get("amount") as string
  const type = formData.get("type") as string
  const day = parseInt(formData.get("day") as string)
  const categoryId = formData.get("categoryId") as string
  const accountId = formData.get("accountId") as string

  if (!id || !description || !amountStr || !day || !accountId) return;

  // Limpeza do valor (igual ao create)
  let baseAmount = parseFloat(amountStr.replace("R$", "").replace(/\./g, "").replace(",", "."))
  baseAmount = Math.abs(baseAmount)

  await prisma.recurringExpense.update({
    where: { id },
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
  redirect("/recurring") // Redireciona de volta para a lista após salvar
}