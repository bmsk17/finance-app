// ARQUIVO: src/app/actions/transactions.ts
'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
// 1. IMPORTAÇÃO DO ROBÔ
import { autoReconcileDebts } from "./receivables"

/**
 * CRIAÇÃO DE TRANSAÇÃO (Única ou Parcelada)
 */
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
  let baseAmount = parseFloat(
    amountStr
      .replace("R$", "")
      .replace(/\s/g, "")
      .replace(",", ".")
  );
  
  baseAmount = Math.abs(baseAmount);
  if (type === "expense") baseAmount = baseAmount * -1;

  const installmentId = installments > 1 ? crypto.randomUUID() : null
  
  const [year, month, day] = dateStr.split('-').map(Number);
  const baseDate = new Date(year, month - 1, day);

  const operations = [];

  for (let i = 0; i < installments; i++) {
    const date = new Date(baseDate);
    date.setMonth(baseDate.getMonth() + i);

    if (date.getDate() !== baseDate.getDate()) {
       date.setDate(0);
    }

    const installmentLabel = installments > 1 ? `${i + 1}/${installments}` : null
    const finalDescription = installmentLabel 
      ? `${description} (${installmentLabel})` 
      : description

    const currentIsPaid = (installments > 1 && i > 0) ? false : isPaid;

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
    );
  }

  await prisma.$transaction(operations);

  // 2. GATILHO DO ROBÔ
  if (categoryId) {
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (category?.isThirdParty) {
       await autoReconcileDebts(categoryId);
    }
  }

  revalidatePath("/");
  redirect("/");
}

/**
 * ATUALIZAÇÃO DE TRANSAÇÃO
 */
export async function updateTransaction(formData: FormData) {
  const id = formData.get("id") as string
  const description = formData.get("description") as string
  const amountStr = formData.get("amount") as string
  const type = formData.get("type") as string
  const accountId = formData.get("accountId") as string
  const categoryId = formData.get("categoryId") as string
  const dateStr = formData.get("date") as string
  const isPaid = formData.get("isPaid") === "on"

  if (!id || !amountStr || !accountId || !categoryId || !dateStr) return;

  let baseAmount = parseFloat(
    amountStr
      .replace("R$", "")
      .replace(/\s/g, "")
      .replace(",", ".")
  );
  
  baseAmount = Math.abs(baseAmount);
  if (type === "expense") baseAmount = baseAmount * -1;

  const originalTransaction = await prisma.transaction.findUnique({
    where: { id }
  })

  if (!originalTransaction) return;

  const [year, month, day] = dateStr.split('-').map(Number);
  const updatedDate = new Date(year, month - 1, day);

  if (originalTransaction.installmentId) {
    let newBaseDescription = description;
    if (originalTransaction.installmentLabel) {
       newBaseDescription = description.replace(` (${originalTransaction.installmentLabel})`, "");
    }

    const siblings = await prisma.transaction.findMany({
      where: { installmentId: originalTransaction.installmentId }
    })

    const operations = siblings.map(sibling => {
      if (sibling.id === id) {
        return prisma.transaction.update({
          where: { id },
          data: {
            description,
            amount: baseAmount,
            date: updatedDate,
            type,
            accountId,
            categoryId,
            isPaid
          }
        });
      } else {
        const siblingLabel = sibling.installmentLabel || "";
        const siblingNewDescription = siblingLabel 
           ? `${newBaseDescription} (${siblingLabel})` 
           : newBaseDescription;

        return prisma.transaction.update({
          where: { id: sibling.id },
          data: {
            description: siblingNewDescription,
            amount: baseAmount,
            type,
            accountId,
            categoryId
          }
        });
      }
    });

    await prisma.$transaction(operations);

  } else {
    await prisma.transaction.update({
      where: { id },
      data: {
        description,
        amount: baseAmount,
        date: updatedDate,
        type,
        accountId,
        categoryId,
        isPaid
      }
    });
  }

  // GATILHO DO ROBÔ NA EDIÇÃO
  if (categoryId) {
     const category = await prisma.category.findUnique({ where: { id: categoryId } });
     if (category?.isThirdParty) {
        await autoReconcileDebts(categoryId);
     }
  }

  revalidatePath("/");
  redirect("/");
}

/**
 * ALTERAR STATUS (PAGO/PENDENTE)
 */
export async function toggleTransactionStatus(formData: FormData) {
  const id = formData.get("id") as string
  const isPaid = formData.get("isPaid") === "true"

  if (!id) return;

  const transaction = await prisma.transaction.update({
    where: { id },
    data: { isPaid: !isPaid }
  });

  if (transaction.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: transaction.categoryId } });
    if (category?.isThirdParty) {
        await autoReconcileDebts(transaction.categoryId);
    }
  }

  revalidatePath("/");
}

/**
 * EXCLUSÃO (O PONTO CRÍTICO)
 */
export async function deleteTransaction(formData: FormData) {
  const id = formData.get("id") as string
  const deleteMode = formData.get("deleteMode") as string

  // Buscamos a categoria junto para saber se chamamos o robô
  const transaction = await prisma.transaction.findUnique({ 
    where: { id },
    include: { category: true } 
  })

  if (!transaction) return;

  // --- 1. LÓGICA MANUAL ANTIGA (BACKUP) ---
  if (transaction.type === 'income' && transaction.categoryId) {
    if (transaction.category?.isThirdParty) {
      const originalExpense = await prisma.transaction.findFirst({
        where: {
          categoryId: transaction.categoryId,
          amount: Number(transaction.amount) * -1, 
          isReimbursed: true, 
        },
        orderBy: { date: 'desc' }
      });

      if (originalExpense) {
        await prisma.transaction.update({
          where: { id: originalExpense.id },
          data: { isReimbursed: false } 
        });
      }
    }
  }

  // --- 2. LÓGICA DE TRANSFERÊNCIAS EM PAR ---
  const isTransferOut = transaction.description.startsWith("Transf. para:");
  const isTransferIn = transaction.description.startsWith("Receb. de:");

  if (isTransferOut || isTransferIn) {
    const twinAmount = Number(transaction.amount) * -1;
    const dateStart = new Date(transaction.date); 
    dateStart.setSeconds(dateStart.getSeconds() - 2);
    const dateEnd = new Date(transaction.date);
    dateEnd.setSeconds(dateEnd.getSeconds() + 2);

    const twinTransaction = await prisma.transaction.findFirst({
      where: {
        amount: twinAmount,
        date: { gte: dateStart, lte: dateEnd },
        description: {
          startsWith: isTransferOut ? "Receb. de:" : "Transf. para:"
        }
      }
    });

    if (twinTransaction) {
      await prisma.$transaction([
        prisma.transaction.delete({ where: { id: transaction.id } }),
        prisma.transaction.delete({ where: { id: twinTransaction.id } })
      ]);

      // --- CORREÇÃO: CHAMADA DO ROBÔ NA TRANSFERÊNCIA ---
      if (transaction.category?.isThirdParty && transaction.categoryId) {
          await autoReconcileDebts(transaction.categoryId);
      }
      
      revalidatePath("/");
      revalidatePath("/receivables"); 
      return;
    }
  }

  // --- 3. LÓGICA DE EXCLUSÃO SIMPLES OU PARCELADA ---
  if (deleteMode === 'all' && transaction.installmentId) {
    await prisma.transaction.deleteMany({
      where: { installmentId: transaction.installmentId }
    });
  } else {
    await prisma.transaction.delete({ where: { id } });
  }

  // 4. GATILHO DO ROBÔ NA EXCLUSÃO PADRÃO
  if (transaction.categoryId && transaction.category?.isThirdParty) {
     console.log(`🗑️ [DELETE HOME] Apagou transação de ${transaction.category.name}. Chamando Robô...`);
     await autoReconcileDebts(transaction.categoryId);
  }

  revalidatePath("/");
  revalidatePath("/receivables"); 
}

/**
 * BUSCA DE CONTAS PARA CLIENT COMPONENTS
 */
export async function getAccountsAction() {
  const accountsRaw = await prisma.account.findMany();
  
  // Cria a variável do fim do mês aqui também
  const today = new Date();
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

  return Promise.all(accountsRaw.map(async (acc) => {
    const agg = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { 
        accountId: acc.id, 
        isPaid: true, 
        // AQUI: Trocamos o 'new Date()' pelo 'endOfMonth'
        date: { lte: endOfMonth }, 
        
        NOT: {
          isReimbursed: true
        }
      }
    });

    const currentBalance = Number(acc.balance) + (Number(agg._sum.amount) || 0);

    return { 
      id: acc.id,
      name: acc.name,
      type: acc.type,
      balance: Number(acc.balance), 
      currentBalance: currentBalance
    };
  }));
}

/**
 * BUSCA DE CATEGORIAS
 */
export async function getCategoriesAction() {
  const categories = await prisma.category.findMany({ 
    orderBy: { name: 'asc' } 
  });

  return categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
    color: cat.color
  }));
}

/**
 * TRANSFERÊNCIA ENTRE CONTAS
 */
export async function createTransfer(formData: FormData) {
  const amountStr = formData.get("amount") as string
  const description = formData.get("description") as string
  const dateStr = formData.get("date") as string
  const fromAccountId = formData.get("fromAccountId") as string
  const toAccountId = formData.get("toAccountId") as string
  const categoryId = formData.get("categoryId") as string 
  
  if (!amountStr || !fromAccountId || !toAccountId || !dateStr) return;

  let baseAmount = parseFloat(
    amountStr.replace("R$", "").replace(/\s/g, "").replace(",", ".")
  );
  baseAmount = Math.abs(baseAmount);

  const [year, month, day] = dateStr.split('-').map(Number);
  const transactionDate = new Date(year, month - 1, day);

  await prisma.$transaction([
    prisma.transaction.create({
      data: {
        description: `Transf. para: ${description || 'Conta Destino'}`,
        amount: baseAmount * -1, 
        type: 'expense',
        date: transactionDate,
        accountId: fromAccountId,
        categoryId: categoryId || null, 
        isPaid: true, 
      }
    }),
    prisma.transaction.create({
      data: {
        description: `Receb. de: ${description || 'Conta Origem'}`,
        amount: baseAmount, 
        type: 'income',
        date: transactionDate,
        accountId: toAccountId,
        categoryId: categoryId || null,
        isPaid: true,
      }
    })
  ]);

  revalidatePath("/");
  redirect("/");
}


/**
 * ALTERAR STATUS EM LOTE (MARCAR/DESMARCAR TODOS)
 */
export async function toggleAllVisibleTransactions(ids: string[], isPaid: boolean) {
  if (!ids || ids.length === 0) return;

  // 1. Atualiza todas as transações de uma vez só no banco
  await prisma.transaction.updateMany({
    where: { id: { in: ids } },
    data: { isPaid }
  });

  // 2. Busca quais categorias foram afetadas para avisar o robô
  const affectedTransactions = await prisma.transaction.findMany({
    where: { id: { in: ids } },
    select: { categoryId: true },
    distinct: ['categoryId']
  });

  // 3. Gatilho do Robô
  for (const tx of affectedTransactions) {
    if (tx.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: tx.categoryId } });
      if (category?.isThirdParty) {
          await autoReconcileDebts(tx.categoryId);
      }
    }
  }

  revalidatePath("/");
}