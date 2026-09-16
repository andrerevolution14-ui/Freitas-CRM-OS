'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Lock, User, AlertCircle, Loader2, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react'

async function doLogin(username: string, password: string): Promise<string | null> {
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      credentials: 'same-origin',
    })
    const data = await res.json()
    if (res.ok && data.ok) return null // null = no error = success
    return data.error || 'Credenciais inválidas.'
  } catch {
    return 'Erro ao contactar o servidor. Verifique a ligação.'
  }
}

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Por favor introduza o nome de utilizador e a palavra-passe.')
      return
    }

    setLoading(true)
    setError('')

    const err = await doLogin(username, password)
    if (err) {
      setError(err)
      setLoading(false)
    } else {
      // Success — navigate to dashboard
      window.location.replace('/dashboard')
    }
  }

  return (
    <div
      style={{ minHeight: '100dvh', background: '#eaedf2' }}
      className="w-full flex flex-col items-center justify-center px-4 py-8"
    >
      <div className="w-full" style={{ maxWidth: 390 }}>
        {/* ── Logo & Badge ─────────────────────────────────── */}
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
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 3,
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1d4ed8',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            <ShieldCheck size={13} />
            Portal de Gestão Executiva
          </span>
        </div>

        {/* ── Login Card ───────────────────────────────────── */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #dbe1ea',
            borderRadius: 4,
            padding: 26,
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.06)',
          }}
        >
          <div className="mb-5">
            <h2 className="text-slate-900 text-base font-extrabold tracking-tight uppercase">Iniciar Sessão</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Introduza as suas credenciais para aceder ao sistema.
            </p>
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
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: 13,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, color: '#dc2626' }} />
              <span style={{ fontWeight: 500 }}>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Username */}
            <div>
              <label
                htmlFor="f-username"
                style={{ display: 'block', color: '#334155', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}
              >
                Nome de Utilizador
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={15}
                  style={{
                    position: 'absolute',
                    left: 13,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
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
                  placeholder="Ex: AndreQ ou JorgeF"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    paddingLeft: 38,
                    paddingRight: 14,
                    paddingTop: 11,
                    paddingBottom: 11,
                    borderRadius: 4,
                    fontSize: 14,
                    color: '#0f172a',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
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
                style={{ display: 'block', color: '#334155', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}
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
                    color: '#94a3b8',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="f-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
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
                    color: '#0f172a',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
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
              disabled={loading}
              style={{
                marginTop: 6,
                width: '100%',
                minHeight: 46,
                borderRadius: 4,
                border: '1px solid rgba(96,165,250,0.4)',
                background: loading ? '#1e40af' : '#2563eb',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 20px rgba(37,99,235,0.45)',
                WebkitTapHighlightColor: 'transparent',
                transition: 'background 0.15s',
              }}
            >
              {loading ? (
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
        <p style={{ textAlign: 'center', color: '#475569', fontSize: 11, marginTop: 16 }}>
          Freitas Renovações © 2025 ·{' '}
          <span style={{ color: '#60a5fa', fontFamily: 'monospace' }}>v4.0</span>
        </p>
      </div>
    </div>
  )
}
