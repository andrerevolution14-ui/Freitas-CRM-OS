import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import type { Session } from 'next-auth'
import { cookies } from 'next/headers'
import { decode } from 'next-auth/jwt'

const SECRET = process.env.NEXTAUTH_SECRET || 'freitas-renovacoes-secret-2024-super-secure'

export async function getSession(): Promise<Session | null> {
  // 1. Standard NextAuth session extraction
  try {
    const session = await getServerSession(authOptions)
    if (session?.user) return session
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'digest' in err && (err as { digest?: string }).digest === 'DYNAMIC_SERVER_USAGE') {
      throw err
    }
  }

  // 2. Direct resilient cookie fallback: decode JWT directly
  try {
    const cookieStore = await cookies()
    const rawToken =
      cookieStore.get('__Secure-next-auth.session-token')?.value ||
      cookieStore.get('next-auth.session-token')?.value

    if (rawToken) {
      const decoded = await decode({ token: rawToken, secret: SECRET })
      if (decoded && decoded.sub) {
        return {
          user: {
            id: decoded.sub as string,
            name: (decoded.name as string) || 'Utilizador',
            email: (decoded.email as string) || '',
            role: (decoded.role as string) || 'ADMIN',
            color: (decoded.color as string) || '#4f7ef8',
            image: (decoded.picture as string) || undefined,
          },
          expires: new Date(((decoded.exp as number) || Math.floor(Date.now() / 1000) + 86400 * 30) * 1000).toISOString(),
        } as Session
      }
    }
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'digest' in err && (err as { digest?: string }).digest === 'DYNAMIC_SERVER_USAGE') {
      throw err
    }
  }

  return null
}

export async function requireAuth(): Promise<Session> {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }
  return session
}
