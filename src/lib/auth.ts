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
          const user = await prisma.user.findFirst({
            where: {
              OR: [
                { username: { equals: identifier, mode: 'insensitive' } },
                { email: { equals: identifier, mode: 'insensitive' } },
              ],
            },
          })

          if (!user) {
            console.log(`[AUTH] Utilizador não encontrado: ${identifier}`)
            return null
          }

          // Verificação estrita de segurança através de hash bcrypt
          const isValid = await bcrypt.compare(cleanPassword, user.password)
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
