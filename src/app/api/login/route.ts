import { NextRequest, NextResponse } from 'next/server'
import { encode } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

const SECRET = process.env.NEXTAUTH_SECRET || 'freitas-renovacoes-secret-2024-super-secure'

function normalizeStr(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const identifier = (body.username || body.email || '').trim()
    const password = (body.password || '').trim()

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Nome de utilizador e palavra-passe são obrigatórios.' }, { status: 400 })
    }

    // 1. First attempt: direct case-insensitive match on username, email, or name
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: identifier, mode: 'insensitive' } },
          { email: { equals: identifier, mode: 'insensitive' } },
          { name: { equals: identifier, mode: 'insensitive' } },
        ],
      },
    })

    // 2. Second attempt: accent-insensitive and prefix match (e.g. "André", "andre", "AndréQ" -> "AndreQ")
    if (!user) {
      const normTarget = normalizeStr(identifier)
      if (normTarget) {
        const allUsers = await prisma.user.findMany()
        user = allUsers.find((u) => {
          const uNorm = normalizeStr(u.username || '')
          const eNorm = normalizeStr(u.email || '')
          const nNorm = normalizeStr(u.name || '')
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
      console.log(`[LOGIN] Utilizador não encontrado para: "${identifier}"`)
      return NextResponse.json({ error: 'Credenciais inválidas. Verifique o utilizador.' }, { status: 401 })
    }

    // 3. Verify password: check exact match first, then normalized lowercase (handles mobile keyboard autocorrect/autocapitalize)
    let isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      const normPassword = password.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      if (normPassword !== password) {
        isValid = await bcrypt.compare(normPassword, user.password)
      }
    }

    if (!isValid) {
      console.log(`[LOGIN] Palavra-passe incorreta para utilizador: ${user.username || user.email}`)
      return NextResponse.json({ error: 'Palavra-passe incorreta.' }, { status: 401 })
    }

    // Build the same JWT payload that NextAuth builds
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

    // Determine if we're on HTTPS (production / Vercel)
    const isSecure = req.headers.get('x-forwarded-proto') === 'https' ||
                     req.nextUrl.protocol === 'https:' ||
                     Boolean(process.env.VERCEL) ||
                     Boolean(process.env.NEXTAUTH_URL?.startsWith('https'))

    const response = NextResponse.json({ ok: true, user: { name: user.name, role: user.role } }, { status: 200 })

    // Set standard session cookie
    response.cookies.set('next-auth.session-token', token, {
      path: '/',
      httpOnly: true,
      maxAge: thirtyDays,
      sameSite: 'lax',
      secure: isSecure,
    })

    // If HTTPS, also set the __Secure- prefixed cookie for NextAuth strict matching
    if (isSecure) {
      response.cookies.set('__Secure-next-auth.session-token', token, {
        path: '/',
        httpOnly: true,
        maxAge: thirtyDays,
        sameSite: 'lax',
        secure: true,
      })
    }

    console.log(`[LOGIN] Sessão criada com sucesso para: ${user.email} (${user.name})`)
    return response

  } catch (err) {
    console.error('[LOGIN_ERROR]', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
