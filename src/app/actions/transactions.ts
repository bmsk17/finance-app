'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"


export async function createTransaction(formData: FormData) {
  const description = formData.get("description") as string
  const amountStr = formData.get("amount") as string
  const type = formData.get("type") as string
  const accountId = formData.get("accountId") as string
  const categoryId = formData.get("categoryId") as string
  const dateStr = formData.get("date") as string
  const installments = parseInt(formData.get("installments") as string) || 1
  const isPaid = formData.get("isPaid") === "on"

  if (!description || !amountStr || !accountId || !categoryId || !dateStr) return;

  // Tratamento do valor
  let baseAmount = parseFloat(amountStr.replace("R$", "").replace(/\./g, "").replace(",", "."))
  if (type === "expense") baseAmount = Math.abs(baseAmount) * -1
  else baseAmount = Math.abs(baseAmount)

  // Grupo de parcelas (ID único para todas)
  const installmentId = installments > 1 ? crypto.randomUUID() : null
  
  // Data Base (fixa o timezone pegando a parte da data e forçando meio-dia ou tratando string)
  // Dica: Criar a data com "T12:00:00" evita problemas de fuso horário voltando 1 dia
  const [year, month, day] = dateStr.split('-').map(Number)
  // Cria data localmente segura (sem setar hora zero pra não cair no dia anterior com GMT-4)
  const baseDate = new Date(year, month - 1, day)

  const operations = []

  for (let i = 0; i < installments; i++) {
    const date = new Date(baseDate)
    
    // --- CORREÇÃO DE DATA (O PULO DO GATO) ---
    // Adiciona 'i' meses
    date.setMonth(baseDate.getMonth() + i)

    // Se o dia mudou (ex: era 31 e virou 3), significa que o mês não tinha 31 dias.
    // O JS jogou para o próximo mês. Vamos voltar para o último dia do mês correto.
    if (date.getDate() !== baseDate.getDate()) {
       date.setDate(0) // "Dia 0" deste mês = Último dia do mês anterior
    }
    // ------------------------------------------

    const installmentLabel = installments > 1 ? `${i + 1}/${installments}` : null
    
    // Nome: "PS5 (1/10)"
    const finalDescription = installmentLabel 
      ? `${description} (${installmentLabel})` 
      : description

    // Lógica de Status:
    // Se for parcelado, geralmente só a 1ª pode estar "Paga". As futuras são "Planejadas".
    // Se quiseres que TODAS fiquem pagas se marcares o check, usa `isPaid`.
    // Se quiseres só a primeira, usa: `const currentIsPaid = i === 0 ? isPaid : false`
    // Vou deixar o padrão (status igual para todas ou lógica inteligente):
    const currentIsPaid = (installments > 1 && i > 0) ? false : isPaid

    operations.push(
      prisma.transaction.create({
        data: {
          description: finalDescription,
          amount: baseAmount,
          date: date,
          type,
          accountId,
          categoryId,
          isPaid: currentIsPaid,
          installmentId,
          installmentLabel
        }
      })
    )
  }

  await prisma.$transaction(operations)

  revalidatePath("/")
  redirect("/")
}


export async function updateTransaction(formData: FormData) {
  const id = formData.get("id") as string
  const description = formData.get("description") as string
  const amountStr = formData.get("amount") as string
  const type = formData.get("type") as string
  const accountId = formData.get("accountId") as string
  const categoryId = formData.get("categoryId") as string
  const dateStr = formData.get("date") as string
  const isPaid = formData.get("isPaid") === "on"

  if (!id || !amountStr || !accountId || !categoryId) return;

  // 1. Tratamento do valor
  let baseAmount = parseFloat(amountStr.replace("R$", "").replace(/\./g, "").replace(",", "."))
  if (type === "expense") baseAmount = Math.abs(baseAmount) * -1
  else baseAmount = Math.abs(baseAmount)

  // 2. Buscar a transação original para ver se é parcelada
  const originalTransaction = await prisma.transaction.findUnique({
    where: { id }
  })

  if (!originalTransaction) return;

  // 3. Lógica de Atualização
  if (originalTransaction.installmentId) {
    // --- CENÁRIO A: É PARCELADO (Atualiza o grupo) ---
    
    // Descobrir a "Descrição Base" (sem o sufixo 1/10)
    // Se o usuário mudou de "TV (1/10)" para "Smart TV (1/10)", queremos pegar "Smart TV"
    let newBaseDescription = description
    if (originalTransaction.installmentLabel) {
       // Removemos o sufixo antigo (ex: " (1/10)") da string nova para pegar a base limpa
       // Nota: Isso é uma tentativa de preservar a edição do texto. 
       // Se o usuário apagou o sufixo manualmente no input, usamos o texto puro.
       newBaseDescription = description.replace(` (${originalTransaction.installmentLabel})`, "")
    }

    // Buscamos todas as irmãs
    const siblings = await prisma.transaction.findMany({
      where: { installmentId: originalTransaction.installmentId }
    })

    const operations = []

    for (const sibling of siblings) {
      // Para a transação ATUAL (a que estamos editando), atualizamos TUDO (Data, Status, etc)
      if (sibling.id === id) {
        operations.push(
          prisma.transaction.update({
            where: { id },
            data: {
              description, // Usa a descrição exata do input
              amount: baseAmount,
              date: new Date(dateStr),
              type,
              accountId,
              categoryId,
              isPaid
            }
          })
        )
      } else {
        // Para as IRMÃS, atualizamos só o Valor, Categoria, Conta e Nome (mantendo numeração)
        // NÃO mexemos na data nem no status (isPaid) delas!
        
        const siblingLabel = sibling.installmentLabel || ""
        const siblingNewDescription = siblingLabel 
           ? `${newBaseDescription} (${siblingLabel})` 
           : newBaseDescription

        operations.push(
          prisma.transaction.update({
            where: { id: sibling.id },
            data: {
              description: siblingNewDescription,
              amount: baseAmount,
              type,
              accountId,
              categoryId,
              // Mantemos date e isPaid originais desta parcela
            }
          })
        )
      }
    }

    await prisma.$transaction(operations)

  } else {
    // --- CENÁRIO B: NÃO É PARCELADO (Simples) ---
    await prisma.transaction.update({
      where: { id },
      data: {
        description,
        amount: baseAmount,
        date: new Date(dateStr),
        type,
        accountId,
        categoryId,
        isPaid
      }
    })
  }

  revalidatePath("/")
  redirect("/")
}

export async function toggleTransactionStatus(formData: FormData) {
  const id = formData.get("id") as string
  const isPaid = formData.get("isPaid") === "true" // Recebe o estado ATUAL

  if (!id) return;

  await prisma.transaction.update({
    where: { id },
    data: { 
      isPaid: !isPaid // Inverte o valor (true -> false, false -> true)
    }
  })

  revalidatePath("/")
}


export async function deleteTransaction(formData: FormData) {
  const id = formData.get("id") as string
  const deleteMode = formData.get("deleteMode") as string

  const transaction = await prisma.transaction.findUnique({ where: { id } })
  if (!transaction) return;

  if (deleteMode === 'all' && transaction.installmentId) {
    await prisma.transaction.deleteMany({
      where: { installmentId: transaction.installmentId }
    })
  } else {
    await prisma.transaction.delete({ where: { id } })
  }

  revalidatePath("/")
}