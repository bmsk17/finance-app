// ARQUIVO: prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import fs from 'fs'

const prisma = new PrismaClient()

async function main() {
  console.log('⏳ Lendo arquivo backup_fincontrol.json...')
  const raw = fs.readFileSync('backup_fincontrol.json', 'utf-8')
  const data = JSON.parse(raw)

  console.log('🚀 Iniciando injeção no Supabase (Nuvem)...')

  await prisma.user.createMany({ data: data.users })
  console.log('✅ Usuários migrados!')

  await prisma.account.createMany({ data: data.accounts })
  console.log('✅ Contas migradas!')

  await prisma.category.createMany({ data: data.categories })
  console.log('✅ Categorias migradas!')

  await prisma.importRule.createMany({ data: data.rules })
  console.log('✅ Regras migradas!')

  // Para despesas e transações, precisamos transformar a data (que virou texto no JSON) em Data real de novo
  const recurring = data.recurring.map((r: any) => ({
    ...r,
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt)
  }))
  await prisma.recurringExpense.createMany({ data: recurring })
  console.log('✅ Despesas Fixas migradas!')

  const txs = data.transactions.map((t: any) => ({
    ...t,
    date: new Date(t.date),
    createdAt: new Date(t.createdAt),
    updatedAt: new Date(t.updatedAt)
  }))
  await prisma.transaction.createMany({ data: txs })
  console.log('✅ Transações migradas!')

  console.log('🎉 MIGRAÇÃO DE 5 MESES CONCLUÍDA COM SUCESSO!')
}

main().catch(console.error).finally(() => prisma.$disconnect())