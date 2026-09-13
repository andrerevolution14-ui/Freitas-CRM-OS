import { PrismaClient } from '@prisma/client'

const DEFAULT_DATABASE_URL =
  'postgresql://postgres.vrcwjjboqdvstxkyrayt:YywJ0gTMEyyzzPJz@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true'

function getSanitizedDatabaseUrl(): string {
  let url = process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL

  // Corrige automaticamente se o utilizador configurou a porta 5432 na Vercel
  if (url.includes('pooler.supabase.com:5432')) {
    url = url.replace('pooler.supabase.com:5432', 'pooler.supabase.com:6543')
  }

  // Garante o parâmetro pgbouncer=true para a porta 6543 (Transaction Mode)
  if (url.includes(':6543') && !url.includes('pgbouncer=true')) {
    url += (url.includes('?') ? '&' : '?') + 'pgbouncer=true'
  }

  return url
}

const activeDbUrl = getSanitizedDatabaseUrl()
process.env.DATABASE_URL = activeDbUrl

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: activeDbUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

