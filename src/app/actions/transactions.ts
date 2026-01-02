'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

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

  // CORREÇÃO: Tratamento do valor sem apagar o ponto decimal
  let baseAmount = parseFloat(
    amountStr
      .replace("R$", "")
      .replace(/\s/g, "")
      .replace(",", ".")
  );
  
  // Garante o sinal correto conforme o tipo
  baseAmount = Math.abs(baseAmount);
  if (type === "expense") baseAmount = baseAmount * -1;

  const installmentId = installments > 1 ? crypto.randomUUID() : null
  
  // Tratamento de data seguro para evitar erros de fuso horário
  const [year, month, day] = dateStr.split('-').map(Number);
  const baseDate = new Date(year, month - 1, day);

  const operations = [];

  for (let i = 0; i < installments; i++) {
    const date = new Date(baseDate);
    date.setMonth(baseDate.getMonth() + i);

    // Ajuste para meses com menos dias (ex: 31 de jan -> 28 de fev)
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

  // 1. TRATAMENTO DE VALOR (IGUAL AO CREATE)
  // Remove R$, espaços e garante que a vírgula vire ponto sem apagar o ponto decimal real
  let baseAmount = parseFloat(
    amountStr
      .replace("R$", "")
      .replace(/\s/g, "")
      .replace(",", ".")
  );
  
  // Garante que o valor é absoluto antes de aplicar o sinal do tipo
  baseAmount = Math.abs(baseAmount);
  if (type === "expense") baseAmount = baseAmount * -1;

  // 2. BUSCAR TRANSAÇÃO ORIGINAL
  const originalTransaction = await prisma.transaction.findUnique({
    where: { id }
  })

  if (!originalTransaction) return;

  // 3. TRATAMENTO DE DATA SEGURO (O PULO DO GATO)
  // Evita que a transação "mude de dia" sozinha devido ao fuso horário do navegador
  const [year, month, day] = dateStr.split('-').map(Number);
  const updatedDate = new Date(year, month - 1, day);

  // 4. LÓGICA DE ATUALIZAÇÃO
  if (originalTransaction.installmentId) {
    // --- CENÁRIO A: É PARCELADO (Atualiza o grupo) ---
    
    let newBaseDescription = description;
    if (originalTransaction.installmentLabel) {
       // Remove o sufixo antigo para reconstruir o nome das parcelas irmãs
       newBaseDescription = description.replace(` (${originalTransaction.installmentLabel})`, "");
    }

    const siblings = await prisma.transaction.findMany({
      where: { installmentId: originalTransaction.installmentId }
    })

    const operations = siblings.map(sibling => {
      if (sibling.id === id) {
        // Para a parcela que você está editando manualmente
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
        // Para as parcelas "irmãs" (só atualiza os dados gerais)
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
    // --- CENÁRIO B: NÃO É PARCELADO (Simples) ---
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

  await prisma.transaction.update({
    where: { id },
    data: { isPaid: !isPaid }
  });

  revalidatePath("/");
}

/**
 * EXCLUSÃO
 */
export async function deleteTransaction(formData: FormData) {
  const id = formData.get("id") as string
  const deleteMode = formData.get("deleteMode") as string

  const transaction = await prisma.transaction.findUnique({ where: { id } })
  if (!transaction) return;

  // --- 1. LÓGICA DE REVERSÃO DE REEMBOLSO (RESOLVE O PROBLEMA DO RAIO ⚡) ---
  // Se a transação apagada for um "income" (entrada) de uma categoria de terceiros,
  // precisamos procurar a despesa original e marcar isReimbursed como false.
  if (transaction.type === 'income' && transaction.categoryId) {
    const category = await prisma.category.findUnique({ 
      where: { id: transaction.categoryId } 
    });

    // Só fazemos o rollback se a categoria for de terceiros (Amanda/Mai)
    if (category?.isThirdParty) {
      const originalExpense = await prisma.transaction.findFirst({
        where: {
          categoryId: transaction.categoryId,
          amount: Number(transaction.amount) * -1, // Valor negativo correspondente
          isReimbursed: true, // Que estava marcada como reembolsada
        },
        orderBy: { date: 'desc' }
      });

      if (originalExpense) {
        await prisma.transaction.update({
          where: { id: originalExpense.id },
          data: { isReimbursed: false } // DEVOLVE O RAIO ⚡ NO PAINEL
        });
      }
    }
  }

  // --- 2. LÓGICA DE TRANSFERÊNCIAS EM PAR (SEU CÓDIGO ORIGINAL) ---
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
      revalidatePath("/");
      revalidatePath("/receivables"); // Adicionado para atualizar o painel
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

  revalidatePath("/");
  revalidatePath("/receivables"); // Garante que o painel de cobranças atualize
}

/**
 * BUSCA DE CONTAS PARA CLIENT COMPONENTS (COM CONVERSÃO DE DECIMAL)
 */
export async function getAccountsAction() {
  const accountsRaw = await prisma.account.findMany();
  
  return Promise.all(accountsRaw.map(async (acc) => {
    const agg = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { 
        accountId: acc.id, 
        isPaid: true, 
        date: { lte: new Date() },
        // --- O SEGREDO DA ENGENHARIA ---
        // Se a despesa foi reembolsada (isReimbursed: true), ela não 
        // deve mais subtrair do saldo da conta original (ex: Nubank).
        NOT: {
          isReimbursed: true
        }
      }
    });

    return { 
      id: acc.id,
      name: acc.name,
      type: acc.type,
      balance: Number(acc.balance), 
      currentBalance: Number(acc.balance) + (Number(agg._sum.amount) || 0) 
    };
  }));
}

/**
 * BUSCA DE CATEGORIAS PARA CLIENT COMPONENTS
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
 * Cria duas transações atômicas: uma saída na origem e uma entrada no destino.
 */
export async function createTransfer(formData: FormData) {
  const amountStr = formData.get("amount") as string
  const description = formData.get("description") as string
  const dateStr = formData.get("date") as string
  const fromAccountId = formData.get("fromAccountId") as string
  const toAccountId = formData.get("toAccountId") as string
  // Opcional: O usuário pode escolher uma categoria "Transferência" ou "Pagamento"
  const categoryId = formData.get("categoryId") as string 
  
  if (!amountStr || !fromAccountId || !toAccountId || !dateStr) return;

  // 1. Tratamento do valor (sempre positivo aqui, a lógica define o sinal)
  let baseAmount = parseFloat(
    amountStr.replace("R$", "").replace(/\s/g, "").replace(",", ".")
  );
  baseAmount = Math.abs(baseAmount);

  // 2. Tratamento da Data
  const [year, month, day] = dateStr.split('-').map(Number);
  const transactionDate = new Date(year, month - 1, day);

  // 3. Criação Atômica (Ou faz os dois, ou não faz nenhum)
  await prisma.$transaction([
    // A: Tira da Origem (Despesa)
    prisma.transaction.create({
      data: {
        description: `Transf. para: ${description || 'Conta Destino'}`,
        amount: baseAmount * -1, // Negativo
        type: 'expense',
        date: transactionDate,
        accountId: fromAccountId,
        categoryId: categoryId || null, // Ideal ter uma categoria "Transferência"
        isPaid: true, // Transferências geralmente são imediatas
      }
    }),
    // B: Coloca no Destino (Receita)
    prisma.transaction.create({
      data: {
        description: `Receb. de: ${description || 'Conta Origem'}`,
        amount: baseAmount, // Positivo
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

