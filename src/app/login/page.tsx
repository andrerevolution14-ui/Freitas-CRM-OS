'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Image from 'next/image'
import { Lock, Mail, AlertCircle, Loader2, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react'

const PRESET_USERS = [
  {
    name: 'André Queirós',
    role: 'Sócio-Administrador',
    email: 'andre@freitasrenovacoes.pt',
    password: 'andre100',
    image: '/avatar-andre.jpg',
    color: '#3b82f6',
  },
  {
    name: 'Jorge Freitas',
    role: 'Sócio-Fundador',
    email: 'jorge@freitasrenovacoes.pt',
    password: 'jorge100',
    image: '/avatar-jorge.jpg',
    color: '#8b5cf6',
  },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleSelectUser(user: typeof PRESET_USERS[number]) {
    setSelectedUser(user.email)
    setEmail(user.email)
    setPassword(user.password)
    setError('')
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (loading) return

    const cleanEmail = email.trim()
    const cleanPassword = password.trim()

    if (!cleanEmail || !cleanPassword) {
      setError('Por favor, preencha o email e a palavra-passe.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email: cleanEmail,
        password: cleanPassword,
        redirect: false,
      })

      if (result?.error) {
        console.error('NextAuth signIn error:', result.error)
        setError('Credenciais inválidas. Verifique o email e a palavra-passe.')
        setLoading(false)
      } else {
        window.location.href = '/dashboard'
      }
    } catch (err) {
      console.error('Erro na submissão de login:', err)
      setError('Erro ao contactar o servidor. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-[#07090e] px-4 py-6 sm:py-10 relative overflow-y-auto">
      {/* High-visibility clean container without blocking overlay divs */}
      <div className="w-full max-w-[390px] relative z-10 my-auto pb-4">
        
        {/* Brand Header */}
        <div className="text-center mb-4 flex flex-col items-center">
          <div className="relative w-36 h-20 mb-1 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Freitas Renovações"
              width={140}
              height={90}
              priority
              className="object-contain filter drop-shadow-[0_4px_16px_rgba(255,255,255,0.15)] max-h-full"
            />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-[11px] font-semibold tracking-wide">
            <ShieldCheck className="w-3.5 h-3.5" />
            Portal de Gestão Executiva
          </div>
        </div>

        {/* Banking-Grade Card */}
        <div className="bg-[#111622] border border-white/[0.12] rounded-2xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Acesso Rápido — 1 Toque
            </p>
            {/* Quick 1-Tap Login Buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              {PRESET_USERS.map((user) => {
                const isSelected = selectedUser === user.email
                return (
                  <button
                    key={user.email}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      handleSelectUser(user)
                      // Submete diretamente para login imediato com 1 toque
                      setEmail(user.email)
                      setPassword(user.password)
                      signIn('credentials', {
                        email: user.email,
                        password: user.password,
                        redirect: false,
                      }).then((res) => {
                        if (!res?.error) {
                          window.location.href = '/dashboard'
                        } else {
                          setError('Erro ao aceder. Tente novamente.')
                        }
                      }).catch(() => {
                        window.location.href = '/dashboard'
                      })
                    }}
                    className={`relative flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer min-h-[56px] active:scale-[0.95] ${
                      isSelected
                        ? 'bg-blue-600/35 border-blue-400 shadow-[0_0_18px_rgba(59,130,246,0.4)] ring-2 ring-blue-400'
                        : 'bg-white/[0.05] border-white/[0.12] hover:bg-white/[0.09] active:bg-blue-600/20'
                    }`}
                  >
                    <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-white/20 bg-slate-800 pointer-events-none">
                      <img
                        src={user.image}
                        alt={user.name}
                        draggable={false}
                        className="w-full h-full object-cover object-top pointer-events-none"
                      />
                    </div>
                    <div className="min-w-0 flex-1 pointer-events-none">
                      <p className="text-xs font-bold text-white truncate">{user.name.split(' ')[0]}</p>
                      <p className="text-[10px] text-blue-400 font-semibold truncate">Entrar direto ➔</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl mb-3.5 bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form noValidate onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email de Acesso</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setSelectedUser('')
                  }}
                  autoComplete="username"
                  suppressHydrationWarning
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-base sm:text-sm text-white placeholder-slate-500 bg-[#161c2b] border border-white/[0.1] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="utilizador@freitasrenovacoes.pt"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-300">Palavra-passe</label>
                <span className="text-[10px] text-slate-500">Acesso Encriptado</span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  suppressHydrationWarning
                  className="w-full pl-10 pr-12 py-3 rounded-xl text-base sm:text-sm text-white placeholder-slate-500 bg-[#161c2b] border border-white/[0.1] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono tracking-wide"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    setShowPassword((prev) => !prev)
                  }}
                  className="absolute right-0 top-0 bottom-0 w-12 flex items-center justify-center text-slate-400 hover:text-white active:text-white transition-colors cursor-pointer z-20"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4 pointer-events-none" /> : <Eye className="w-4 h-4 pointer-events-none" />}
                </button>
              </div>
            </div>

            {/* High-visibility Vibrant Submit Button */}
            <button
              type="submit"
              disabled={loading}
              onClick={(e) => {
                e.preventDefault()
                handleSubmit()
              }}
              className="w-full mt-3 py-3.5 rounded-xl font-bold text-white text-base bg-blue-600 hover:bg-blue-500 active:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(37,99,235,0.5)] border border-blue-400/40 disabled:opacity-60 cursor-pointer min-h-[50px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>A autenticar com segurança...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Freitas OS</span>
                  <ArrowRight className="w-5 h-5 ml-1" />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 pt-3.5 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-400">
            <span>Sessão protegida por JWT</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Sistemas Operacionais
            </span>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-500 mt-4 tracking-wide">
          Freitas Renovações © 2024 · <span className="text-blue-400/80 font-mono">v2.0 (Toque Direto)</span>
        </p>
      </div>
    </div>
  )
}
