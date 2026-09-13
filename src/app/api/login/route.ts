import { NextRequest, NextResponse } from 'next/server'
import { encode } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

const SECRET = process.env.NEXTAUTH_SECRET || 'freitas-renovacoes-secret-2024-super-secure'
// NextAuth uses this cookie name on HTTP, and __Secure- prefix on HTTPS
const COOKIE_NAME = process.env.NEXTAUTH_URL?.startsWith('https')
  ? '__Secure-next-auth.session-token'
  : 'next-auth.session-token'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = (body.email || '').trim().toLowerCase()
    const password = (body.password || '').trim()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e palavra-passe são obrigatórios.' }, { status: 400 })
    }

    // Find user in database
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    })

    if (!user) {
      console.log(`[LOGIN] Utilizador não encontrado: ${email}`)
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 })
    }

    // Verify password via bcrypt
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      console.log(`[LOGIN] Palavra-passe incorreta para: ${email}`)
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 })
    }

    // Build the same JWT payload that NextAuth would build
    const now = Math.floor(Date.now() / 1000)
    const thirtyDays = 30 * 24 * 60 * 60
    const token = await encode({
      token: {
        sub: user.id,
        name: user.name,
        email: user.email,
        picture: user.image ?? undefined,
        role: user.role,
        color: user.color,
        iat: now,
        exp: now + thirtyDays,
        jti: crypto.randomUUID(),
      },
      secret: SECRET,
      maxAge: thirtyDays,
    })

    // Determine if we're on HTTPS (production)
    const isSecure = req.headers.get('x-forwarded-proto') === 'https' ||
                     req.nextUrl.protocol === 'https:'

    const cookieName = isSecure
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token'

    const cookieOptions = [
      `${cookieName}=${token}`,
      'Path=/',
      'HttpOnly',
      `Max-Age=${thirtyDays}`,
      `SameSite=Lax`,
      ...(isSecure ? ['Secure'] : []),
    ].join('; ')

    const response = NextResponse.json({ ok: true }, { status: 200 })
    response.headers.set('Set-Cookie', cookieOptions)

    console.log(`[LOGIN] Sessão criada para: ${user.email} (cookie: ${cookieName})`)
    return response

  } catch (err) {
    console.error('[LOGIN_ERROR]', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
