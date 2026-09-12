'use client'

import { useState, useTransition } from 'react'
import { Plus, Search, X, Star, Phone, Trash2, Loader2, CheckCircle, XCircle, Users } from 'lucide-react'
import { createSubcontractor, updateSubcontractor, deleteSubcontractor } from '@/server/actions/subcontractors'
import { formatCurrency, formatDate, getStatusLabel, cn } from '@/lib/utils'
import type { Specialty } from '@prisma/client'

const SPECIALTIES: { value: Specialty; label: string }[] = [
  { value: 'PEDREIRO', label: 'Pedreiro' },
  { value: 'PICHELEIRO_CANALIZADOR', label: 'Picheleiro / Canalizador' },
  { value: 'ELETRICISTA', label: 'Eletricista' },
  { value: 'PINTOR', label: 'Pintor' },
  { value: 'CARPINTEIRO', label: 'Carpinteiro' },
  { value: 'PLADURISTA', label: 'Pladurista' },
  { value: 'CAPOTISTA', label: 'Capotista' },
  { value: 'OUTRO', label: 'Outro' },
]

const SPECIALTY_COLORS: Record<string, string> = {
  PEDREIRO: 'badge-yellow',
  PICHELEIRO_CANALIZADOR: 'badge-blue',
  ELETRICISTA: 'badge-purple',
  PINTOR: 'badge-green',
  CARPINTEIRO: 'badge-gray',
  PLADURISTA: 'badge-gray',
  CAPOTISTA: 'badge-gray',
  OUTRO: 'badge-gray',
}

type Payment = {
  id: string
  phaseDescription: string
  amount: number
  dueDate: Date
  paidDate: Date | null
  status: string
  project: { id: string; title: string }
}

type Subcontractor = {
  id: string
  name: string
  companyName: string | null
  phone: string
  specialty: Specialty
  rating: number
  dailyRate: number | null
  notes: string | null
  isAvailable: boolean
  payments: Payment[]
}

function StarRating({ rating, onChange }: { rating: number; onChange?: (r: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={cn('w-3.5 h-3.5', i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600', onChange && 'cursor-pointer hover:text-yellow-400')}
          onClick={() => onChange?.(i)}
        />
      ))}
    </div>
  )
}

export function SubempreiteiroClient({ subcontractors: initial }: { subcontractors: Subcontractor[] }) {
  const [subs, setSubs] = useState(initial)
  const [search, setSearch] = useState('')
  const [specialtyFilter, setSpecialtyFilter] = useState<Specialty | 'ALL'>('ALL')
  const [availFilter, setAvailFilter] = useState<boolean | 'ALL'>('ALL')
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Subcontractor | null>(null)
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState({
    name: '', companyName: '', phone: '', specialty: 'PEDREIRO' as Specialty,
    rating: 5, dailyRate: '', notes: '', isAvailable: true,
  })

  const filtered = subs.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.companyName || '').toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search)
    const matchSpec = specialtyFilter === 'ALL' || s.specialty === specialtyFilter
    const matchAvail = availFilter === 'ALL' || s.isAvailable === availFilter
    return matchSearch && matchSpec && matchAvail
  })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const sub = await createSubcontractor({
        name: form.name,
        companyName: form.companyName || undefined,
        phone: form.phone,
        specialty: form.specialty,
        rating: form.rating,
        dailyRate: form.dailyRate ? parseFloat(form.dailyRate) : undefined,
        notes: form.notes || undefined,
        isAvailable: form.isAvailable,
      })
      setSubs(prev => [{ ...sub, specialty: sub.specialty as Specialty, payments: [] }, ...prev])
      setShowForm(false)
      setForm({ name: '', companyName: '', phone: '', specialty: 'PEDREIRO', rating: 5, dailyRate: '', notes: '', isAvailable: true })
    })
  }

  async function handleToggleAvailable(id: string, isAvailable: boolean) {
    startTransition(async () => {
      await updateSubcontractor(id, { isAvailable: !isAvailable })
      setSubs(prev => prev.map(s => s.id === id ? { ...s, isAvailable: !isAvailable } : s))
      if (selected?.id === id) setSelected(s => s ? { ...s, isAvailable: !isAvailable } : null)
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminar este subempreiteiro?')) return
    startTransition(async () => {
      await deleteSubcontractor(id)
      setSubs(prev => prev.filter(s => s.id !== id))
      if (selected?.id === id) setSelected(null)
    })
  }

  const totalPaid = (sub: Subcontractor) => sub.payments.filter(p => p.status === 'PAGO').reduce((s, p) => s + p.amount, 0)
  const pendingPayments = (sub: Subcontractor) => sub.payments.filter(p => p.status !== 'PAGO')

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Subempreiteiros</h1>
          <p className="text-sm text-slate-400 mt-1">
            {subs.filter(s => s.isAvailable).length} disponíveis · {subs.length} total
          </p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
          style={{ background: 'linear-gradient(135deg, #4f7ef8, #7c67f5)' }}>
          <Plus className="w-4 h-4" /> Novo Subempreiteiro
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar..."
            className="pl-9 pr-4 py-2 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none w-52"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"><X className="w-3 h-3" /></button>}
        </div>
        <select value={specialtyFilter} onChange={e => setSpecialtyFilter(e.target.value as Specialty | 'ALL')}
          className="px-3 py-2 rounded-lg text-sm text-slate-300 focus:outline-none"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <option value="ALL">Todas as especialidades</option>
          {SPECIALTIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <div className="flex items-center gap-1">
          {[{ value: 'ALL', label: 'Todos' }, { value: true, label: '✓ Disponível' }, { value: false, label: '✗ Em Obra' }].map(opt => (
            <button key={String(opt.value)} onClick={() => setAvailFilter(opt.value as boolean | 'ALL')}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                availFilter === opt.value ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-white/5')}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        {/* List */}
        <div className="flex-1 space-y-3">
          {filtered.map(sub => {
            const pending = pendingPayments(sub)
            const overdue = pending.filter(p => new Date(p.dueDate) < new Date())
            return (
              <div key={sub.id}
                className={cn('glass-card p-4 cursor-pointer transition-all duration-200 group hover:border-blue-500/30',
                  selected?.id === sub.id && 'border-blue-500/40 bg-blue-500/5')}
                onClick={() => setSelected(sub)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #4f7ef8, #a78bfa)' }}>
                    {sub.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white">{sub.name}</p>
                      {sub.companyName && <p className="text-xs text-slate-500">({sub.companyName})</p>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <StarRating rating={sub.rating} />
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', SPECIALTY_COLORS[sub.specialty])}>
                        {getStatusLabel(sub.specialty)}
                      </span>
                      {sub.dailyRate && <span className="text-xs text-slate-400">{formatCurrency(sub.dailyRate)}/dia</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Phone className="w-3 h-3" />{sub.phone}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <button onClick={e => { e.stopPropagation(); handleToggleAvailable(sub.id, sub.isAvailable) }}
                      className={cn('flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium transition-all',
                        sub.isAvailable ? 'badge-green' : 'badge-yellow')}>
                      {sub.isAvailable ? <><CheckCircle className="w-3 h-3" />Disponível</> : <><XCircle className="w-3 h-3" />Em Obra</>}
                    </button>
                    {overdue.length > 0 && (
                      <span className="text-xs badge-red px-2 py-0.5 rounded-full">{overdue.length} atrasado(s)</span>
                    )}
                    <button onClick={e => { e.stopPropagation(); handleDelete(sub.id) }}
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Sem subempreiteiros encontrados</p>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-80 flex-shrink-0 space-y-4">
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-white">Detalhe</p>
                <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Nome</p>
                  <p className="text-white font-medium">{selected.name}</p>
                </div>
                {selected.companyName && (
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Empresa</p>
                    <p className="text-white">{selected.companyName}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Rating</p>
                  <StarRating rating={selected.rating} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Total recebido</p>
                  <p className="text-emerald-400 font-semibold">{formatCurrency(totalPaid(selected))}</p>
                </div>
                {selected.notes && (
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Notas</p>
                    <p className="text-slate-300 text-xs">{selected.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment history */}
            <div className="glass-card p-5">
              <p className="text-sm font-semibold text-white mb-3">Histórico de Pagamentos</p>
              {selected.payments.length === 0 ? (
                <p className="text-xs text-slate-500">Sem pagamentos ainda</p>
              ) : (
                <div className="space-y-2">
                  {selected.payments.slice(0, 8).map(pay => {
                    const isOverdue = pay.status === 'PENDENTE' && new Date(pay.dueDate) < new Date()
                    return (
                      <div key={pay.id} className="p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <p className="text-xs text-white font-medium truncate">{pay.phaseDescription}</p>
                        <p className="text-xs text-slate-500 truncate">{pay.project.title}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs font-semibold text-white">{formatCurrency(pay.amount)}</span>
                          <span className={cn('text-xs px-1.5 py-0.5 rounded-full',
                            pay.status === 'PAGO' ? 'badge-green' : isOverdue ? 'badge-red' : 'badge-yellow')}>
                            {pay.status === 'PAGO' ? 'Pago' : isOverdue ? 'Atrasado' : 'Pendente'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">Venc.: {formatDate(pay.dueDate)}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl p-5 sm:p-6 my-4 bg-[#121624] border border-white/20 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" /> Novo Subempreiteiro
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3.5">
              {[
                { label: 'Nome *', key: 'name', type: 'text', placeholder: 'António Silva' },
                { label: 'Empresa', key: 'companyName', type: 'text', placeholder: 'Silva & Filhos Lda.' },
                { label: 'Telefone *', key: 'phone', type: 'tel', placeholder: '912 345 678' },
                { label: 'Taxa Diária (€)', key: 'dailyRate', type: 'number', placeholder: '250' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-slate-300 mb-1">{field.label}</label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    required={field.label.includes('*')}
                    value={(form as Record<string, string | number | boolean>)[field.key] as string}
                    onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 bg-[#191e30] border border-white/15 focus:outline-none focus:border-amber-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Especialidade</label>
                <select
                  value={form.specialty}
                  onChange={e => setForm(p => ({ ...p, specialty: e.target.value as Specialty }))}
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm text-white bg-[#191e30] border border-white/15 focus:outline-none"
                >
                  {SPECIALTIES.map(s => <option key={s.value} value={s.value} className="bg-[#121624]">{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Classificação</label>
                <StarRating rating={form.rating} onChange={r => setForm(p => ({ ...p, rating: r }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Notas</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  placeholder="Observações sobre o profissional..."
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 bg-[#191e30] border border-white/15 resize-none focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="isAvailable"
                  checked={form.isAvailable}
                  onChange={e => setForm(p => ({ ...p, isAvailable: e.target.checked }))}
                  className="rounded border-white/20 bg-[#191e30] text-blue-600 focus:ring-0 w-4 h-4"
                />
                <label htmlFor="isAvailable" className="text-xs text-slate-300 cursor-pointer">Disponível para nova obra</label>
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
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 flex items-center justify-center gap-2 disabled:opacity-60 transition-all shadow-md shadow-amber-600/20"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Subempreiteiro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
