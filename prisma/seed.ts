// === ARQUIVO: prisma/seed.ts ===
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('123456', 10)
  
  await prisma.user.upsert({
    where: { email: 'teste@fincontrol.com' },
    update: {},
    create: {
      name: 'Usuário Teste',
      email: 'teste@fincontrol.com',
      password: hashedPassword
    }
  })
  
  console.log('✅ Usuário Teste criado! (teste@fincontrol.com / 123456)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })