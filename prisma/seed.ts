// prisma/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 A começar a semear o banco de dados...')

  // 1. Criar Categorias Padrão
  const categories = [
    { name: 'Alimentação', icon: '🍔', color: '#ef4444' }, // Vermelho
    { name: 'Casa', icon: '🏠', color: '#3b82f6' },        // Azul
    { name: 'Transporte', icon: '🚗', color: '#eab308' },  // Amarelo
    { name: 'Lazer', icon: '🎉', color: '#a855f7' },       // Roxo
    { name: 'Saúde', icon: '💊', color: '#22c55e' },       // Verde
    { name: 'Salário', icon: '💰', color: '#10b981' },     // Verde Escuro
    { name: 'Investimentos', icon: '📈', color: '#06b6d4' },// Ciano
  ]

  for (const cat of categories) {
    await prisma.category.create({
      data: cat
    })
  }
  console.log('✅ Categorias criadas!')

  // 2. Criar uma Conta Inicial
  await prisma.account.create({
    data: {
      name: 'Minha Carteira',
      type: 'dinheiro',
      balance: 0,
    }
  })
  console.log('✅ Conta "Minha Carteira" criada!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })