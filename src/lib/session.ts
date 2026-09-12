import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import type { Session } from 'next-auth'

export async function getSession(): Promise<Session | null> {
  return getServerSession(authOptions)
}

export async function requireAuth(): Promise<Session> {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }
  return session
}
