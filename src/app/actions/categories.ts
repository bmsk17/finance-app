'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createCategory(formData: FormData) {
  const name = formData.get("name") as string
  const icon = formData.get("icon") as string
  const color = formData.get("color") as string

  const isThirdParty = formData.get("isThirdParty") === "on"

  // Validação: Só o nome é obrigatório para não travar o fluxo.
  // Se o ícone falhar, usamos um padrão.
  if (!name) return;

  await prisma.category.create({
    data: {
      name,
      // Se icon vier vazio, salva uma pasta 📁
      icon: icon || "📁", 
      // Se color vier vazio, salva um cinza padrão
      color: color || "#64748b", 
      isThirdParty,
    },
  })

  revalidatePath("/categories") 
  revalidatePath("/")           
  revalidatePath("/transactions/new")
  
  redirect("/categories")
}

export async function deleteCategory(formData: FormData) {
  const id = formData.get("id") as string

  if (!id) return;

  try {
    await prisma.category.delete({
      where: { id }
    })
  } catch (e) {
    console.log("Erro ao apagar categoria (provavelmente em uso)")
    // Aqui podíamos retornar uma mensagem de erro para a UI no futuro
  }

  revalidatePath("/categories")
  revalidatePath("/")
  revalidatePath("/transactions/new")
}

// --- ESTATÍSTICAS PARA O MODAL ---
export async function getCategoryStats(categoryId: string) {
  const now = new Date();
  const year = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = Jan, 11 = Dez

  // 1. Define intervalo do Ano Atual (Jan 1 a Dez 31)
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);
  
  // 2. Intervalo do Mês Atual
  const startOfMonth = new Date(year, currentMonth, 1);
  const endOfMonth = new Date(year, currentMonth + 1, 0);

  // Busca TUDO do ano para evitar múltiplas queries
  const transactions = await prisma.transaction.findMany({
    where: {
      categoryId,
      date: { gte: startOfYear, lte: endOfYear },
      type: 'expense', // Focamos em gastos (despesas)
    },
    orderBy: { date: 'desc' }
  });

  // --- CÁLCULOS KPI ---
  
  // Total do Ano
  const yearTotal = transactions.reduce((acc, t) => acc + Number(t.amount), 0);
  
  // Total do Mês Atual
  const monthTotal = transactions
    .filter(t => t.date >= startOfMonth && t.date <= endOfMonth)
    .reduce((acc, t) => acc + Number(t.amount), 0);

  // Média Mensal (Total do Ano / Quantos meses já se passaram até agora)
  // Se estamos em Março (mês 2), dividimos por 3 (Jan, Fev, Mar)
  const monthsPassed = currentMonth + 1;
  const average = yearTotal / (monthsPassed || 1);

  // --- DADOS DO GRÁFICO (Jan a Dez) ---
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    // Filtra transações do mês 'i'
    const total = transactions
      .filter(t => t.date.getMonth() === i)
      .reduce((acc, t) => acc + Number(t.amount), 0);
    
    // Nome do mês curto
    const label = new Date(year, i, 1).toLocaleDateString('pt-BR', { month: 'short' });
    
    return { label, total };
  });

  // --- ÚLTIMAS 5 TRANSAÇÕES ---
  const recentTransactions = transactions.slice(0, 5).map(t => ({
    id: t.id,
    description: t.description,
    amount: Number(t.amount),
    date: t.date,
  }));

  return {
    kpis: {
      monthTotal,
      yearTotal,
      average
    },
    chart: monthlyData,
    recent: recentTransactions
  };
}


export async function updateCategory(formData: FormData) {
  const id = formData.get("id") as string
  const name = formData.get("name") as string
  const icon = formData.get("icon") as string
  const color = formData.get("color") as string
  const isThirdParty = formData.get("isThirdParty") === "on"

  if (!id || !name) return;

  await prisma.category.update({
    where: { id },
    data: {
      name,
      icon: icon || "📁", 
      color: color || "#64748b", 
      isThirdParty,
    },
  })

  revalidatePath("/categories") 
  revalidatePath("/")           
  redirect("/categories")
}