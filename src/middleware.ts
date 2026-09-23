import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decode } from 'next-auth/jwt'

const SECRET = process.env.NEXTAUTH_SECRET || 'freitas-renovacoes-secret-2024-super-secure'

export async function middleware(req: NextRequest) {
  // Check both possible NextAuth cookie names
  const token =
    req.cookies.get('__Secure-next-auth.session-token')?.value ||
    req.cookies.get('next-auth.session-token')?.value

  if (!token) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  try {
    const session = await decode({ token, secret: SECRET })
    if (!session || !session.sub) {
      const loginUrl = new URL('/login', req.url)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  } catch (error) {
    console.error('[MIDDLEWARE_AUTH_ERROR]', error)
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/leads/:path*',
    '/obras/:path*',
    '/subempreiteiros/:path*',
    '/notas/:path*',
    '/pro-formas/:path*',
    '/calendario/:path*',
  ],
}
