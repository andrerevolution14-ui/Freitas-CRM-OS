'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Lock, Mail, AlertCircle, Loader2, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react'

const PRESET_USERS = [
  {
    name: 'André Queirós',
    email: 'andre@freitasrenovacoes.pt',
    password: 'andre100',
    image: '/avatar-andre.jpg',
  },
  {
    name: 'Jorge Freitas',
    email: 'jorge@freitasrenovacoes.pt',
    password: 'jorge100',
    image: '/avatar-jorge.jpg',
  },
]

async function doLogin(email: string, password: string): Promise<string | null> {
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password: password.trim() }),
      credentials: 'same-origin',
    })
    const data = await res.json()
    if (res.ok && data.ok) return null          // null = no error = success
    return data.error || 'Credenciais inválidas.'
  } catch {
    return 'Erro ao contactar o servidor. Verifique a ligação.'
  }
}

export default function LoginPage() {
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [showPw, setShowPw]           = useState(false)
  const [error, setError]             = useState('')
  const [loadingKey, setLoadingKey]   = useState<string | null>(null)   // email of who is loading, or 'form'

  const loading = loadingKey !== null

  async function login(loginEmail: string, loginPassword: string, key: string) {
    if (loading) return
    setLoadingKey(key)
    setError('')
    const err = await doLogin(loginEmail, loginPassword)
    if (err) {
      setError(err)
      setLoadingKey(null)
    } else {
      // Success — hard navigate so the new cookie is picked up
      window.location.replace('/dashboard')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Por favor preencha o email e a palavra-passe.')
      return
    }
    await login(email, password, 'form')
  }

  return (
    <div
      style={{ minHeight: '100dvh', background: '#07090e' }}
      className="w-full flex flex-col items-center justify-center px-4 py-8"
    >
      <div className="w-full" style={{ maxWidth: 390 }}>

        {/* ── Logo ─────────────────────────────────────────── */}
        <div className="flex flex-col items-center mb-6">
          <div style={{ width: 140, height: 80, position: 'relative', marginBottom: 10 }}>
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
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 999,
              background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
              color: '#60a5fa', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em',
            }}
          >
            <ShieldCheck size={13} />
            Portal de Gestão Executiva
          </span>
        </div>

        {/* ── Card ─────────────────────────────────────────── */}
        <div
          style={{
            background: '#111622',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 18,
            padding: 20,
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
          }}
        >
          {/* 1-Tap buttons */}
          <p style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            Acesso Rápido
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {PRESET_USERS.map((u) => {
              const isLoading = loadingKey === u.email && loading
              return (
                <button
                  key={u.email}
                  onClick={() => {
                    setEmail(u.email)
                    setPassword(u.password)
                    login(u.email, u.password, u.email)
                  }}
                  disabled={loading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: isLoading ? '1.5px solid #60a5fa' : '1px solid rgba(255,255,255,0.1)',
                    background: isLoading ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    minHeight: 54,
                    transition: 'all 0.15s',
                    WebkitTapHighlightColor: 'transparent',
                    opacity: loading && !isLoading ? 0.5 : 1,
                  }}
                >
                  <img
                    src={u.image}
                    alt={u.name}
                    style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0 }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.name.split(' ')[0]}
                    </p>
                    <p style={{ color: isLoading ? '#fbbf24' : '#60a5fa', fontSize: 11, margin: 0, fontWeight: 500 }}>
                      {isLoading ? '⏳ A entrar...' : 'Entrar direto →'}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ color: '#64748b', fontSize: 11 }}>ou introduza manualmente</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 12px', borderRadius: 10, marginBottom: 14,
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#fca5a5', fontSize: 13,
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, color: '#f87171' }} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Email */}
            <div>
              <label htmlFor="f-email" style={{ display: 'block', color: '#cbd5e1', fontSize: 11, fontWeight: 600, marginBottom: 5 }}>
                Email de Acesso
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                <input
                  id="f-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="email"
                  placeholder="utilizador@freitasrenovacoes.pt"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    paddingLeft: 38, paddingRight: 14, paddingTop: 11, paddingBottom: 11,
                    borderRadius: 10, fontSize: 14,
                    color: '#fff', background: '#161c2b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="f-password" style={{ display: 'block', color: '#cbd5e1', fontSize: 11, fontWeight: 600, marginBottom: 5 }}>
                Palavra-passe
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                <input
                  id="f-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    paddingLeft: 38, paddingRight: 48, paddingTop: 11, paddingBottom: 11,
                    borderRadius: 10, fontSize: 14,
                    color: '#fff', background: '#161c2b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    outline: 'none', fontFamily: 'monospace', letterSpacing: '0.1em',
                  }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPw(p => !p)}
                  style={{
                    position: 'absolute', right: 0, top: 0, bottom: 0, width: 46,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'none', border: 'none', cursor: 'pointer',
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
              disabled={loading}
              style={{
                marginTop: 4,
                width: '100%', minHeight: 50,
                borderRadius: 12,
                border: '1px solid rgba(96,165,250,0.4)',
                background: loading ? '#1e40af' : '#2563eb',
                color: '#fff', fontSize: 15, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 20px rgba(37,99,235,0.45)',
                WebkitTapHighlightColor: 'transparent',
                transition: 'background 0.15s',
              }}
            >
              {loadingKey === 'form' ? (
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

        {/* Footer */}
        <p style={{ textAlign: 'center', color: '#475569', fontSize: 11, marginTop: 14 }}>
          Freitas Renovações © 2025 ·{' '}
          <span style={{ color: '#60a5fa', fontFamily: 'monospace' }}>v4.0</span>
        </p>
      </div>
    </div>
  )
}
