'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Lock, Mail, AlertCircle, Loader2, ShieldCheck, ArrowRight, Eye, EyeOff, KeyRound } from 'lucide-react'

const PRESET_USERS = [
  {
    name: 'André Queirós',
    role: 'Sócio-Administrador',
    email: 'andre@freitasrenovacoes.pt',
    image: '/avatar-andre.jpg',
    color: '#3b82f6',
  },
  {
    name: 'Jorge Freitas',
    role: 'Sócio-Fundador',
    email: 'jorge@freitasrenovacoes.pt',
    image: '/avatar-jorge.jpg',
    color: '#8b5cf6',
  },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleSelectUser(user: typeof PRESET_USERS[number]) {
    setSelectedUser(user.email)
    setEmail(user.email)
    setPassword('')
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const cleanEmail = email.trim()
    const cleanPassword = password.trim()

    const result = await signIn('credentials', {
      email: cleanEmail,
      password: cleanPassword,
      redirect: false,
    })

    if (result?.error) {
      setError('Credenciais inválidas. Verifique o email e a palavra-passe.')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0a0d14] px-4 py-8 select-none">
      {/* Dynamic ambient bank-grade glowing background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-blue-600/15 via-indigo-600/5 to-transparent blur-3xl rounded-full" />
        <div className="absolute -bottom-40 right-10 w-[500px] h-[400px] bg-purple-600/10 blur-3xl rounded-full" />
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
      </div>

      <div className="relative w-full max-w-[420px] z-10">
        {/* Brand Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="relative w-44 h-32 mb-2 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Freitas Renovações"
              width={160}
              height={120}
              priority
              className="object-contain filter drop-shadow-[0_4px_16px_rgba(255,255,255,0.1)]"
            />
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wide shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5" />
            Portal de Gestão Executiva
          </div>
        </div>

        {/* Banking-Grade Card */}
        <div className="bg-[#111622]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.04]">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              Selecionar Perfil
            </p>
            {/* Quick Profile Switcher */}
            <div className="grid grid-cols-2 gap-2.5">
              {PRESET_USERS.map((user) => {
                const isSelected = selectedUser === user.email
                return (
                  <button
                    key={user.email}
                    type="button"
                    onClick={() => handleSelectUser(user)}
                    className={`relative flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-400/30'
                        : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.1]'
                    }`}
                  >
                    <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-white/20 bg-slate-800">
                      <img
                        src={user.image}
                        alt={user.name}
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white truncate">{user.name.split(' ')[0]}</p>
                      <p className="text-[10px] text-slate-400 truncate">{user.name.split(' ')[1]}</p>
                    </div>
                    {isSelected && (
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 absolute top-2 right-2" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email de Acesso</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setSelectedUser('')
                  }}
                  required
                  autoComplete="username"
                  suppressHydrationWarning
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 bg-[#161c2b] border border-white/[0.08] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="utilizador@freitasrenovacoes.pt"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">Palavra-passe</label>
                <span className="text-[10px] text-slate-500">Acesso Encriptado</span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  suppressHydrationWarning
                  className="w-full pl-10 pr-11 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 bg-[#161c2b] border border-white/[0.08] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono tracking-wide"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                  tabIndex={-1}
                  title={showPassword ? 'Ocultar' : 'Mostrar'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl font-medium text-white text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  A autenticar com segurança...
                </>
              ) : (
                <>
                  Entrar no Freitas OS
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
            <span>Sessão protegida por JWT</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Sistemas Operacionais
            </span>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-500 mt-6 tracking-wide">
          Freitas Renovações © 2024 · Todos os direitos reservados
        </p>
      </div>
    </div>
  )
}
