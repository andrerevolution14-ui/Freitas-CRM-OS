import NextAuth, { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'freitas-renovacoes-secret-2024-super-secure',
  providers: [
    CredentialsProvider({
      name: 'Credenciais',
      credentials: {
        username: { label: 'Utilizador', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const identifier = (credentials?.username || (credentials as any)?.email || '').trim()
        const cleanPassword = (credentials?.password || '').trim()

        if (!identifier || !cleanPassword) return null

        try {
          // 1. Direct case-insensitive match on username, email, or name
          let user = await prisma.user.findFirst({
            where: {
              OR: [
                { username: { equals: identifier, mode: 'insensitive' } },
                { email: { equals: identifier, mode: 'insensitive' } },
                { name: { equals: identifier, mode: 'insensitive' } },
              ],
            },
          })

          // 2. Resilient normalization (handles accents like "André" -> "andre", first-name match)
          if (!user) {
            const normTarget = identifier.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
            if (normTarget) {
              const allUsers = await prisma.user.findMany()
              user = allUsers.find((u) => {
                const uNorm = (u.username || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
                const eNorm = (u.email || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
                const nNorm = (u.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
                return (
                  uNorm === normTarget ||
                  eNorm === normTarget ||
                  nNorm === normTarget ||
                  uNorm.startsWith(normTarget) ||
                  nNorm.startsWith(normTarget) ||
                  normTarget.startsWith(uNorm)
                )
              }) || null
            }
          }

          if (!user) {
            console.log(`[AUTH] Utilizador não encontrado: ${identifier}`)
            return null
          }

          // Verificação de segurança através de hash bcrypt com suporte a autocapitalize mobile
          let isValid = await bcrypt.compare(cleanPassword, user.password)
          if (!isValid) {
            const normPassword = cleanPassword.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
            if (normPassword !== cleanPassword) {
              isValid = await bcrypt.compare(normPassword, user.password)
            }
          }

          if (!isValid) {
            console.log(`[AUTH] Palavra-passe incorreta para: ${identifier}`)
            return null
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            color: user.color,
            image: user.image ?? null,
          }
        } catch (error) {
          console.error('[AUTH_AUTHORIZE_ERROR]', error)
          return null
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role
        token.color = (user as { color?: string }).color
        token.picture = (user as { image?: string | null }).image ?? undefined
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        const u = session.user as { id?: string; role?: string; color?: string; image?: string }
        u.id = token.sub
        u.role = token.role as string
        u.color = token.color as string
        u.image = token.picture as string | undefined
      }
      return session
    },
  },
  pages: { 
    signIn: '/login',
    error: '/login',
  },
}

export default NextAuth(authOptions)
