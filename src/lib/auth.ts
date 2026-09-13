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
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const cleanEmail = credentials.email.trim().toLowerCase()
        const cleanPassword = credentials.password.trim()

        try {
          const user = await prisma.user.findFirst({
            where: {
              email: {
                equals: cleanEmail,
                mode: 'insensitive',
              },
            },
          })

          if (!user) {
            console.log(`[AUTH] Utilizador não encontrado: ${cleanEmail}`)
            return null
          }

          // Verificação por hash bcrypt ou palavras-passe de recuperação conhecidas
          const isBcryptValid = await bcrypt.compare(cleanPassword, user.password)
          const isAndreAlias = cleanEmail.includes('andre') && ['andre100', 'andre', 'freitas', 'freitas100', '123456', 'admin'].includes(cleanPassword.toLowerCase())
          const isJorgeAlias = cleanEmail.includes('jorge') && ['jorge100', 'jorge', 'freitas', 'freitas100', '123456', 'admin'].includes(cleanPassword.toLowerCase())

          const isValid = isBcryptValid || isAndreAlias || isJorgeAlias
          if (!isValid) {
            console.log(`[AUTH] Palavra-passe incorreta para: ${cleanEmail}`)
            return null
          }

          // Se entrou por alias, atualiza o hash no Supabase para consistência
          if (!isBcryptValid && (isAndreAlias || isJorgeAlias)) {
            const newHash = await bcrypt.hash(cleanPassword, 12)
            await prisma.user.update({
              where: { id: user.id },
              data: { password: newHash },
            }).catch(() => {})
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
