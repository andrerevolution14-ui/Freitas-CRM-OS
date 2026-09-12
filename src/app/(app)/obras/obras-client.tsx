'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, X, HardHat, MapPin, Euro, Calendar, Loader2, Trash2, TrendingUp } from 'lucide-react'
import { createProject, deleteProject } from '@/server/actions/projects'
import { formatCurrency, formatDate, getStatusLabel, getMarginColor, calcMargin, cn } from '@/lib/utils'
import type { ProjectStatus } from '@prisma/client'

type Project = {
  id: string
  title: string
  clientName: string
  address: string
  contractValue: number
  startDate: Date | null
  endDate: Date | null
  status: ProjectStatus
  expenses: { amount: number }[]
  clientTranches: { status: string; amount: number }[]
}

const STATUS_BADGE: Record<ProjectStatus, string> = {
  EM_PLANEAMENTO: 'badge-blue',
  EM_EXECUCAO: 'badge-yellow',
  PAUSADA: 'badge-red',
  CONCLUIDA: 'badge-green',
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'EM_PLANEAMENTO', label: 'Em Planeamento' },
  { value: 'EM_EXECUCAO', label: 'Em Execução' },
  { value: 'PAUSADA', label: 'Pausada' },
  { value: 'CONCLUIDA', label: 'Concluída' },
]

export function ObrasClient({ projects: initial }: { projects: Project[] }) {
  const router = useRouter()
  const [projects, setProjects] = useState(initial)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL')
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    title: '', clientName: '', clientNIF: '', address: '',
    contractValue: '', startDate: '', endDate: '', status: 'EM_PLANEAMENTO' as ProjectStatus,
  })

  const filtered = projects.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.clientName.toLowerCase().includes(search.toLowerCase()) ||
      p.address.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const project = await createProject({
        title: form.title,
        clientName: form.clientName,
        clientNIF: form.clientNIF || undefined,
        address: form.address,
        contractValue: parseFloat(form.contractValue),
        startDate: form.startDate ? new Date(form.startDate) : undefined,
        endDate: form.endDate ? new Date(form.endDate) : undefined,
        status: form.status,
      })
      setProjects(prev => [{ ...project, status: project.status as ProjectStatus, expenses: [], clientTranches: [] }, ...prev])
      setShowForm(false)
      router.push(`/obras/${project.id}`)
    })
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Eliminar esta obra e todos os seus dados?')) return
    startTransition(async () => {
      await deleteProject(id)
      setProjects(prev => prev.filter(p => p.id !== id))
    })
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Obras</h1>
          <p className="text-sm text-slate-400 mt-1">
            {projects.filter(p => p.status === 'EM_EXECUCAO').length} em execução · {projects.length} total
          </p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
          style={{ background: 'linear-gradient(135deg, #4f7ef8, #7c67f5)' }}>
          <Plus className="w-4 h-4" /> Nova Obra
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar obras..."
            className="pl-9 pr-4 py-2 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 w-60"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><X className="w-3 h-3" /></button>}
        </div>
        <div className="flex items-center gap-1.5">
          {[{ value: 'ALL', label: 'Todas' }, ...STATUS_OPTIONS].map(opt => (
            <button key={opt.value} onClick={() => setStatusFilter(opt.value as ProjectStatus | 'ALL')}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                statusFilter === opt.value ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-white/5')}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(project => {
          const totalExpenses = project.expenses.reduce((s, e) => s + e.amount, 0)
          const profit = project.contractValue - totalExpenses
          const margin = calcMargin(project.contractValue, totalExpenses)
          const marginColor = getMarginColor(margin)
          const received = project.clientTranches.filter(t => t.status === 'PAGO').reduce((s, t) => s + t.amount, 0)
          const pctReceived = project.contractValue > 0 ? (received / project.contractValue) * 100 : 0

          return (
            <div key={project.id} className="glass-card p-5 group cursor-pointer hover:border-blue-500/30 transition-all duration-200"
              onClick={() => router.push(`/obras/${project.id}`)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(79,126,248,0.1)', border: '1px solid rgba(79,126,248,0.2)' }}>
                    <HardHat className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_BADGE[project.status])}>
                      {getStatusLabel(project.status)}
                    </span>
                  </div>
                </div>
                <button onClick={e => handleDelete(project.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <h3 className="text-sm font-semibold text-white mb-1 leading-snug">{project.title}</h3>
              <p className="text-xs text-slate-500 mb-3">{project.clientName}</p>

              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{project.address}</span>
                </div>
                {(project.startDate || project.endDate) && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar className="w-3 h-3" />
                    {formatDate(project.startDate)} → {formatDate(project.endDate)}
                  </div>
                )}
              </div>

              {/* Financial summary */}
              <div className="p-3 rounded-lg space-y-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Contrato</span>
                  <span className="text-white font-medium">{formatCurrency(project.contractValue)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Custos</span>
                  <span className="text-red-400">{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="flex justify-between text-xs" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
                  <span className="text-slate-400 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Lucro</span>
                  <span className={cn('font-semibold', profit > 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {formatCurrency(profit)} <span className={cn('text-xs', marginColor)}>({margin.toFixed(1)}%)</span>
                  </span>
                </div>
              </div>

              {/* Progress bar - received */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Recebido</span>
                  <span>{pctReceived.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(pctReceived, 100)}%` }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-slate-500">
          <HardHat className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{search ? 'Nenhuma obra encontrada' : 'Sem obras ainda'}</p>
        </div>
      )}

      {/* Create Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl p-5 sm:p-6 my-4 bg-[#121624] border border-white/20 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <HardHat className="w-5 h-5 text-blue-400" /> Nova Obra
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Título da Obra *', key: 'title', type: 'text', placeholder: 'Remodelação...', col: 2 },
                  { label: 'Nome do Cliente *', key: 'clientName', type: 'text', placeholder: 'João Silva', col: 1 },
                  { label: 'NIF do Cliente', key: 'clientNIF', type: 'text', placeholder: '123 456 789', col: 1 },
                  { label: 'Morada *', key: 'address', type: 'text', placeholder: 'Rua...', col: 2 },
                  { label: 'Valor do Contrato (€) *', key: 'contractValue', type: 'number', placeholder: '50000', col: 1 },
                  { label: 'Estado', key: 'status', type: 'select', placeholder: '', col: 1 },
                  { label: 'Data de Início', key: 'startDate', type: 'date', placeholder: '', col: 1 },
                  { label: 'Data de Fim', key: 'endDate', type: 'date', placeholder: '', col: 1 },
                ].map(field => (
                  <div key={field.key} className={field.col === 2 ? 'col-span-2' : ''}>
                    <label className="block text-xs font-medium text-slate-300 mb-1">{field.label}</label>
                    {field.type === 'select' ? (
                      <select
                        value={form.status}
                        onChange={e => setForm(p => ({ ...p, status: e.target.value as ProjectStatus }))}
                        className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm text-white bg-[#191e30] border border-white/15 focus:outline-none"
                      >
                        {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value} className="bg-[#121624]">{s.label}</option>)}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        placeholder={field.placeholder}
                        required={field.label.includes('*')}
                        value={(form as Record<string, string>)[field.key]}
                        onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 bg-[#191e30] border border-white/15 focus:outline-none focus:border-blue-500"
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs text-slate-400 hover:text-white border border-white/15 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 flex items-center justify-center gap-2 disabled:opacity-60 transition-all shadow-md shadow-blue-600/20"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Obra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
