import { prisma } from '../src/lib/prisma'
import bcrypt from 'bcryptjs'

async function main() {
  console.log('🌱 A configurar utilizadores do sistema...')

  const andreHash = await bcrypt.hash('andre100', 12)
  const andre = await prisma.user.upsert({
    where: { email: 'andre@freitasrenovacoes.pt' },
    update: {
      username: 'AndreQ',
      name: 'André Queirós',
      password: andreHash,
      role: 'ADMIN',
      color: '#4f7ef8',
      image: '/avatar-andre.jpg',
    },
    create: {
      username: 'AndreQ',
      name: 'André Queirós',
      email: 'andre@freitasrenovacoes.pt',
      password: andreHash,
      role: 'ADMIN',
      color: '#4f7ef8',
      image: '/avatar-andre.jpg',
    },
  })

  const jorgeHash = await bcrypt.hash('jorge100', 12)
  const jorge = await prisma.user.upsert({
    where: { email: 'jorge@freitasrenovacoes.pt' },
    update: {
      username: 'JorgeF',
      name: 'Jorge Freitas',
      password: jorgeHash,
      role: 'ADMIN',
      color: '#a78bfa',
      image: '/avatar-jorge.jpg',
    },
    create: {
      username: 'JorgeF',
      name: 'Jorge Freitas',
      email: 'jorge@freitasrenovacoes.pt',
      password: jorgeHash,
      role: 'ADMIN',
      color: '#a78bfa',
      image: '/avatar-jorge.jpg',
    },
  })

  console.log('✅ Utilizadores configurados:')
  console.log(`  - Username: ${andre.username} | Pass: andre100`)
  console.log(`  - Username: ${jorge.username} | Pass: jorge100`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
