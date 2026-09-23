'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Lock, User, AlertCircle, Loader2, ShieldCheck, ArrowRight, Eye, EyeOff, Zap } from 'lucide-react'

interface QuickUser {
  id: string
  name: string
  role: string
  identifier: string
  image: string
  color: string
}

const QUICK_USERS: QuickUser[] = [
  {
    id: 'andre',
    name: 'André Queirós',
    role: 'Sócio-Administrador',
    identifier: 'andre@freitasrenovacoes.pt',
    image: '/avatar-andre.jpg',
    color: '#3b82f6',
  },
  {
    id: 'jorge',
    name: 'Jorge Freitas',
    role: 'Sócio-Fundador',
    identifier: 'jorge@freitasrenovacoes.pt',
    image: '/avatar-jorge.jpg',
    color: '#8b5cf6',
  },
]

async function doLogin(identifier: string, password?: string): Promise<string | null> {
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: identifier.trim(),
        password: (password || (identifier.toLowerCase().includes('andre') ? 'andre100' : 'jorge100')).trim(),
      }),
      credentials: 'same-origin',
    })
    const data = await res.json()
    if (res.ok && data.ok) return null
    return data.error || 'Credenciais inválidas.'
  } catch {
    return 'Erro ao contactar o servidor. Verifique a ligação à internet.'
  }
}

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loadingTarget, setLoadingTarget] = useState<string | null>(null) // 'form' | 'andre' | 'jorge' | null

  const isAnyLoading = loadingTarget !== null

  async function handleQuickLogin(user: QuickUser) {
    if (isAnyLoading) return
    setError('')
    setLoadingTarget(user.id)
    setUsername(user.name)

    const defaultPw = user.id === 'andre' ? 'andre100' : 'jorge100'
    const err = await doLogin(user.identifier, defaultPw)

    if (err) {
      setError(err)
      setLoadingTarget(null)
    } else {
      await new Promise((r) => setTimeout(r, 150))
      window.location.replace('/dashboard')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Por favor introduza o utilizador e a palavra-passe.')
      return
    }

    setLoadingTarget('form')
    setError('')

    const err = await doLogin(username, password)
    if (err) {
      setError(err)
      setLoadingTarget(null)
    } else {
      await new Promise((r) => setTimeout(r, 150))
      window.location.replace('/dashboard')
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'radial-gradient(ellipse at 50% 0%, #17233f 0%, #090d16 65%, #05070c 100%)',
      }}
      className="w-full flex flex-col items-center justify-center px-4 py-8 select-none"
    >
      <div className="w-full" style={{ maxWidth: 420 }}>
        {/* ── Logo & Badge ─────────────────────────────────── */}
        <div className="flex flex-col items-center mb-6">
          <div style={{ width: 170, height: 95, position: 'relative', marginBottom: 12 }}>
            <Image
              src="/logo.png"
              alt="Freitas Renovações"
              fill
              priority
              style={{ objectFit: 'contain' }}
            />
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 14px',
              borderRadius: 4,
              background: 'rgba(37, 99, 235, 0.12)',
              border: '1px solid rgba(96, 165, 250, 0.25)',
              color: '#93c5fd',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            <ShieldCheck size={14} className="text-blue-400" />
            Portal de Gestão Executiva
          </span>
        </div>

        {/* ── Login Card ───────────────────────────────────── */}
        <div
          style={{
            background: 'rgba(17, 24, 39, 0.90)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(51, 65, 85, 0.75)',
            borderRadius: 8,
            padding: 24,
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.55), 0 0 1px rgba(255, 255, 255, 0.08) inset',
          }}
        >
          <div className="mb-4">
            <h2 className="text-white text-base font-extrabold tracking-tight uppercase">Acesso Direto</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Selecione o seu perfil para entrar com 1 toque no telemóvel.
            </p>
          </div>

          {/* Quick 1-Tap Access Buttons */}
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            {QUICK_USERS.map((u) => {
              const isLoadingThis = loadingTarget === u.id
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleQuickLogin(u)}
                  disabled={isAnyLoading}
                  style={{
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                    border: isLoadingThis ? '1px solid #60a5fa' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: isLoadingThis ? 'rgba(37, 99, 235, 0.25)' : 'rgba(30, 41, 59, 0.7)',
                  }}
                  className="group relative flex flex-col items-center text-center p-3 rounded-lg hover:border-blue-500/50 hover:bg-slate-800/80 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
                >
                  <div className="relative w-12 h-12 rounded-full overflow-hidden mb-2 ring-2 ring-blue-500/30 group-hover:ring-blue-400 transition-all">
                    <Image
                      src={u.image}
                      alt={u.name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                  <span className="text-white text-xs font-bold leading-tight block">
                    {u.name}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block leading-tight">
                    {u.role}
                  </span>

                  <div className="mt-2.5 w-full flex items-center justify-center gap-1 py-1 rounded bg-blue-600/20 group-hover:bg-blue-600/30 text-blue-400 text-[11px] font-semibold">
                    {isLoadingThis ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        <span>A entrar...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={11} className="text-amber-400" />
                        <span>Entrar</span>
                      </>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-slate-700/60" />
            <span className="text-[11px] text-slate-400 font-medium tracking-wide">
              ou com credenciais
            </span>
            <div className="flex-1 h-px bg-slate-700/60" />
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 4,
                marginBottom: 16,
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#fca5a5',
                fontSize: 13,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, color: '#f87171' }} />
              <span style={{ fontWeight: 500 }}>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Username */}
            <div>
              <label
                htmlFor="f-username"
                style={{
                  display: 'block',
                  color: '#94a3b8',
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: 6,
                }}
              >
                Utilizador / Email
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={15}
                  style={{
                    position: 'absolute',
                    left: 13,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748b',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="f-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="text"
                  placeholder="Ex: andre ou jorge"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    paddingLeft: 38,
                    paddingRight: 14,
                    paddingTop: 11,
                    paddingBottom: 11,
                    borderRadius: 4,
                    fontSize: 14,
                    color: '#f8fafc',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    outline: 'none',
                    fontWeight: 500,
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="f-password"
                style={{
                  display: 'block',
                  color: '#94a3b8',
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: 6,
                }}
              >
                Palavra-passe
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={15}
                  style={{
                    position: 'absolute',
                    left: 13,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748b',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="f-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    paddingLeft: 38,
                    paddingRight: 48,
                    paddingTop: 11,
                    paddingBottom: 11,
                    borderRadius: 4,
                    fontSize: 14,
                    color: '#f8fafc',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    outline: 'none',
                    fontFamily: 'monospace',
                    letterSpacing: '0.1em',
                  }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPw((p) => !p)}
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: 46,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                  }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={isAnyLoading}
              style={{
                marginTop: 6,
                width: '100%',
                minHeight: 46,
                borderRadius: 4,
                border: '1px solid rgba(96,165,250,0.5)',
                background: loadingTarget === 'form' ? '#1e40af' : '#2563eb',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: isAnyLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 20px rgba(37,99,235,0.4)',
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
                transition: 'all 0.15s',
              }}
            >
              {loadingTarget === 'form' ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  <span>A autenticar...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Freitas OS</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer & Backlinks */}
        <div className="text-center mt-6 space-y-2">
          <p style={{ color: '#64748b', fontSize: 12 }}>
            <a
              href="https://grupofreitasrenovacoes.pt"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-300 hover:text-blue-400 transition-colors font-bold hover:underline"
              title="Grupo Freitas Renovações — Remodelações e Obras de Excelência"
            >
              Grupo Freitas Renovações
            </a>{' '}
            © 2025 ·{' '}
            <span style={{ color: '#60a5fa', fontFamily: 'monospace' }}>v4.1</span>
          </p>

          <div className="pt-1">
            <a
              href="https://grupofreitasrenovacoes.pt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/40 hover:text-blue-300 transition-all"
              title="Aceder ao portal institucional do Grupo Freitas Renovações"
            >
              <span>grupofreitasrenovacoes.pt</span>
              <span className="text-blue-400" aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
