'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Lock, Mail, AlertCircle, Loader2, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react'

const PRESET_USERS = [
  {
    name: 'André Queirós',
    role: 'Sócio-Administrador',
    email: 'andre@freitasrenovacoes.pt',
    password: 'andre100',
    image: '/avatar-andre.jpg',
  },
  {
    name: 'Jorge Freitas',
    role: 'Sócio-Fundador',
    email: 'jorge@freitasrenovacoes.pt',
    password: 'jorge100',
    image: '/avatar-jorge.jpg',
  },
]

// Direct credentials login that bypasses the NextAuth client CSRF flow
// This POSTs directly to the NextAuth callback URL with the CSRF token
async function doLogin(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    // Step 1: Get CSRF token from NextAuth
    const csrfRes = await fetch('/api/auth/csrf', { credentials: 'same-origin' })
    if (!csrfRes.ok) throw new Error('CSRF fetch failed')
    const { csrfToken } = await csrfRes.json()

    // Step 2: POST credentials with CSRF token as form-encoded body (as NextAuth expects)
    const formBody = new URLSearchParams({
      email: email.trim().toLowerCase(),
      password: password.trim(),
      csrfToken,
      callbackUrl: '/dashboard',
      json: 'true',
    })

    const signInRes = await fetch('/api/auth/callback/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody.toString(),
      credentials: 'same-origin',
      redirect: 'manual',
    })

    // NextAuth returns a redirect (302) on success or a JSON with error
    // redirect: 'manual' means we get opaqueredirect type on success
    if (signInRes.type === 'opaqueredirect' || signInRes.status === 302 || signInRes.ok) {
      // Check if we got a redirect to /login (error) or /dashboard (success)
      const location = signInRes.headers.get('location') || ''
      if (location.includes('error') || location.includes('/login')) {
        return { ok: false, error: 'Credenciais inválidas.' }
      }
      return { ok: true }
    }

    // If response has JSON body with error
    try {
      const data = await signInRes.json()
      if (data?.url && (data.url.includes('error') || data.url.includes('/login?'))) {
        return { ok: false, error: 'Credenciais inválidas.' }
      }
      if (data?.url) return { ok: true }
    } catch {}

    return { ok: false, error: 'Erro de autenticação.' }
  } catch (err) {
    console.error('[LOGIN_ERROR]', err)
    return { ok: false, error: 'Erro ao contactar o servidor.' }
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingUser, setLoadingUser] = useState<string>('')

  async function handleLogin(loginEmail: string, loginPassword: string, userKey = '') {
    if (loading) return
    setLoading(true)
    setLoadingUser(userKey)
    setError('')

    const result = await doLogin(loginEmail, loginPassword)

    if (result.ok) {
      // Hard redirect ensures cookies are picked up
      window.location.replace('/dashboard')
    } else {
      setError(result.error || 'Credenciais inválidas. Verifique o email e a palavra-passe.')
      setLoading(false)
      setLoadingUser('')
    }
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cleanEmail = email.trim()
    const cleanPassword = password.trim()

    if (!cleanEmail || !cleanPassword) {
      setError('Por favor, preencha o email e a palavra-passe.')
      return
    }

    await handleLogin(cleanEmail, cleanPassword)
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-[#07090e] px-4 py-6 relative">
      <div className="w-full max-w-[390px] relative z-10">

        {/* Brand Header */}
        <div className="text-center mb-5 flex flex-col items-center">
          <div className="relative w-36 h-20 mb-2 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Freitas Renovações"
              width={140}
              height={80}
              priority
              style={{ objectFit: 'contain', maxHeight: '100%' }}
            />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-[11px] font-semibold tracking-wide">
            <ShieldCheck className="w-3.5 h-3.5" />
            Portal de Gestão Executiva
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#111622] border border-white/[0.12] rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">

          {/* 1-Tap Quick Access */}
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Acesso com 1 Toque
          </p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {PRESET_USERS.map((user) => {
              const isThisLoading = loadingUser === user.email && loading
              return (
                <button
                  key={user.email}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setSelectedUser(user.email)
                    setEmail(user.email)
                    setPassword(user.password)
                    handleLogin(user.email, user.password, user.email)
                  }}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all min-h-[52px] active:scale-[0.96] ${
                    selectedUser === user.email && loading
                      ? 'bg-blue-600/35 border-blue-400 ring-2 ring-blue-400'
                      : 'bg-white/[0.04] border-white/[0.1] hover:bg-white/[0.08] active:bg-blue-500/20'
                  } ${loading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-white/20 bg-slate-800">
                    <img
                      src={user.image}
                      alt={user.name}
                      draggable={false}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{user.name.split(' ')[0]}</p>
                    <p className="text-[10px] font-medium truncate" style={{ color: isThisLoading ? '#facc15' : '#60a5fa' }}>
                      {isThisLoading ? '⏳ A entrar...' : 'Entrar direto ➔'}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 h-px bg-white/[0.08]" />
            <span className="text-[10px] text-slate-500 font-medium">ou use o formulário</span>
            <div className="flex-1 h-px bg-white/[0.08]" />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl mb-3 bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form noValidate onSubmit={handleFormSubmit} className="space-y-3">
            <div>
              <label htmlFor="login-email" className="block text-[11px] font-medium text-slate-300 mb-1">
                Email de Acesso
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setSelectedUser('')
                  }}
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 bg-[#161c2b] border border-white/[0.1] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="utilizador@freitasrenovacoes.pt"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="login-password" className="block text-[11px] font-medium text-slate-300">
                  Palavra-passe
                </label>
                <span className="text-[10px] text-slate-500">Acesso Encriptado</span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full pl-10 pr-12 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 bg-[#161c2b] border border-white/[0.1] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono tracking-wide"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-0 top-0 bottom-0 w-12 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer z-10"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4 pointer-events-none" /> : <Eye className="w-4 h-4 pointer-events-none" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              className="w-full mt-1 py-3 rounded-xl font-bold text-white text-sm bg-blue-600 hover:bg-blue-500 active:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(37,99,235,0.5)] border border-blue-400/40 disabled:opacity-60 min-h-[48px] cursor-pointer"
            >
              {loading && loadingUser === '' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>A autenticar...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Freitas OS</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-slate-500 mt-3 tracking-wide">
          Freitas Renovações © 2025 · <span className="text-blue-400/80 font-mono">v3.0</span>
        </p>
      </div>
    </div>
  )
}
