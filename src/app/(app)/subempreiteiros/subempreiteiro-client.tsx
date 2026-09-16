'use client'

import { useState, useTransition } from 'react'
import { Plus, Search, X, Star, Phone, Trash2, Loader2, CheckCircle, XCircle, Users } from 'lucide-react'
import { createSubcontractor, updateSubcontractor, deleteSubcontractor } from '@/server/actions/subcontractors'
import { formatCurrency, formatDate, getStatusLabel, cn } from '@/lib/utils'
import { Modal } from '@/components/ui/modal'
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
      {/* Top Search & Count Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white border border-slate-200 shadow-xs rounded-[4px]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar por nome, empresa ou telefone..."
            className="w-full pl-9 pr-8 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-amber-600"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="text-xs text-slate-500 font-medium px-1 flex items-center gap-1.5">
          <span>A exibir</span>
          <span className="text-slate-900 font-bold bg-slate-100 px-2 py-0.5 rounded-[3px] border border-slate-200">{filtered.length}</span>
          <span>de</span>
          <span className="text-slate-900 font-bold">{subs.length}</span>
          <span>subempreiteiros</span>
        </div>
      </div>

      {/* Main Action & Metrics Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-slate-200 shadow-xs rounded-[4px]">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-8 bg-emerald-500 rounded-[2px]" />
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Disponíveis</div>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {subs.filter(s => s.isAvailable).length} <span className="text-xs font-normal text-slate-500">profissionais</span>
              </div>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-3">
            <div className="w-2.5 h-8 bg-amber-500 rounded-[2px]" />
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Em Obra</div>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {subs.filter(s => !s.isAvailable).length} <span className="text-xs font-normal text-slate-500">alocados</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={specialtyFilter}
            onChange={e => setSpecialtyFilter(e.target.value as Specialty | 'ALL')}
            className="px-3 py-2 rounded-[4px] text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-amber-600 cursor-pointer"
          >
            <option value="ALL">Todas as especialidades</option>
            {SPECIALTIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          {/* Segmented availability controls */}
          <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-1 rounded-[4px]">
            {[{ value: 'ALL', label: 'TODOS' }, { value: true, label: '✓ DISPONÍVEL' }, { value: false, label: '✗ EM OBRA' }].map(opt => (
              <button
                key={String(opt.value)}
                onClick={() => setAvailFilter(opt.value as boolean | 'ALL')}
                className={cn(
                  'px-2.5 py-1.5 rounded-[3px] text-[11px] font-bold tracking-wider transition-all',
                  availFilter === opt.value
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Equipa</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* List */}
        <div className="flex-1 space-y-3">
          {filtered.map(sub => {
            const pending = pendingPayments(sub)
            const overdue = pending.filter(p => new Date(p.dueDate) < new Date())
            return (
              <div
                key={sub.id}
                className={cn(
                  'p-4 bg-white border border-slate-200 hover:border-slate-300 rounded-[4px] cursor-pointer transition-all duration-150 group shadow-xs',
                  selected?.id === sub.id && 'border-amber-500 ring-1 ring-amber-500/40 bg-amber-50/20'
                )}
                onClick={() => setSelected(sub)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-[4px] flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309' }}
                  >
                    {sub.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-900">{sub.name}</p>
                      {sub.companyName && <p className="text-xs text-slate-500">({sub.companyName})</p>}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <StarRating rating={sub.rating} />
                      <span className={cn('text-[10.5px] px-2 py-0.5 rounded-[3px] font-bold uppercase tracking-wider', SPECIALTY_COLORS[sub.specialty])}>
                        {getStatusLabel(sub.specialty)}
                      </span>
                      {sub.dailyRate && <span className="text-xs font-semibold text-slate-600">{formatCurrency(sub.dailyRate)}/dia</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />{sub.phone}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); handleToggleAvailable(sub.id, sub.isAvailable) }}
                      className={cn(
                        'flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-[3px] font-bold uppercase tracking-wider transition-all',
                        sub.isAvailable ? 'badge-green' : 'badge-yellow'
                      )}
                    >
                      {sub.isAvailable ? <><CheckCircle className="w-3 h-3" />Disponível</> : <><XCircle className="w-3 h-3" />Em Obra</>}
                    </button>
                    {overdue.length > 0 && (
                      <span className="text-[10px] badge-red px-2 py-0.5 rounded-[3px] font-bold uppercase">{overdue.length} atrasado(s)</span>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(sub.id) }}
                      className="opacity-80 sm:opacity-0 sm:group-hover:opacity-100 text-slate-400 hover:text-red-600 transition-all p-1"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="text-center py-14 px-4 bg-white border border-slate-200 rounded-[4px] shadow-xs flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-[4px] bg-amber-50 border border-amber-200 flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                {search ? 'Nenhum profissional encontrado' : 'Sem subempreiteiros registados'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mb-4">
                {search ? 'Tente ajustar os termos de pesquisa ou o filtro de especialidade.' : 'Adicione eletricistas, canalizadores, pedreiros ou outros profissionais para gerir alocações e pagamentos.'}
              </p>
              {!search && (
                <button
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Profissional
                </button>
              )}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-slate-900">Detalhe do Profissional</p>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Nome</p>
                  <p className="text-slate-900 font-bold">{selected.name}</p>
                </div>
                {selected.companyName && (
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Empresa</p>
                    <p className="text-slate-800">{selected.companyName}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Rating</p>
                  <StarRating rating={selected.rating} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Total recebido</p>
                  <p className="text-emerald-700 font-bold">{formatCurrency(totalPaid(selected))}</p>
                </div>
                {selected.notes && (
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Notas</p>
                    <p className="text-slate-600 text-xs">{selected.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment history */}
            <div className="bg-white border border-slate-200 rounded-[4px] p-4 sm:p-5 shadow-xs">
              <p className="text-sm font-bold text-slate-900 mb-3">Histórico de Pagamentos</p>
              {selected.payments.length === 0 ? (
                <p className="text-xs text-slate-500">Sem pagamentos ainda</p>
              ) : (
                <div className="space-y-2">
                  {selected.payments.slice(0, 8).map(pay => {
                    const isOverdue = pay.status === 'PENDENTE' && new Date(pay.dueDate) < new Date()
                    return (
                      <div key={pay.id} className="p-2.5 rounded-[4px] bg-slate-50 border border-slate-200">
                        <p className="text-xs text-slate-900 font-semibold truncate">{pay.phaseDescription}</p>
                        <p className="text-xs text-slate-500 truncate">{pay.project.title}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs font-bold text-slate-900">{formatCurrency(pay.amount)}</span>
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-[3px] font-bold uppercase',
                            pay.status === 'PAGO' ? 'badge-green' : isOverdue ? 'badge-red' : 'badge-yellow')}>
                            {pay.status === 'PAGO' ? 'Pago' : isOverdue ? 'Atrasado' : 'Pendente'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">Venc.: {formatDate(pay.dueDate)}</p>
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
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Novo Subempreiteiro"
        subtitle="Registar profissional ou parceiro de obra"
        icon={<Users className="w-5 h-5 text-amber-600" />}
      >
        <form onSubmit={handleCreate} className="space-y-3.5">
          {[
            { label: 'Nome *', key: 'name', type: 'text', placeholder: 'Ex: António Silva' },
            { label: 'Empresa', key: 'companyName', type: 'text', placeholder: 'Silva & Filhos Lda.' },
            { label: 'Telefone *', key: 'phone', type: 'tel', placeholder: '912 345 678' },
            { label: 'Taxa Diária (€)', key: 'dailyRate', type: 'number', placeholder: '250' },
          ].map(field => (
            <div key={field.key}>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{field.label}</label>
              <input
                type={field.type}
                placeholder={field.placeholder}
                required={field.label.includes('*')}
                value={(form as Record<string, string | number | boolean>)[field.key] as string}
                onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-300 focus:outline-none focus:border-amber-600"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Especialidade</label>
            <select
              value={form.specialty}
              onChange={e => setForm(p => ({ ...p, specialty: e.target.value as Specialty }))}
              className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 bg-white border border-slate-300 focus:outline-none focus:border-amber-600"
            >
              {SPECIALTIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Classificação</label>
            <StarRating rating={form.rating} onChange={r => setForm(p => ({ ...p, rating: r }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notas Internas</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={2}
              placeholder="Observações sobre pontualidade, qualidade ou referências..."
              className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-300 resize-none focus:outline-none focus:border-amber-600"
            />
          </div>
          <div className="flex items-center gap-2.5 pt-1">
            <input
              type="checkbox"
              id="isAvailable"
              checked={form.isAvailable}
              onChange={e => setForm(p => ({ ...p, isAvailable: e.target.checked }))}
              className="rounded-[3px] border-slate-300 bg-white text-amber-600 focus:ring-0 w-4 h-4"
            />
            <label htmlFor="isAvailable" className="text-xs text-slate-700 cursor-pointer font-semibold">Disponível para nova obra</label>
          </div>
          <div className="flex gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 rounded-[4px] text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-amber-600 hover:bg-amber-700 flex items-center justify-center gap-2 disabled:opacity-60 transition-all shadow-md shadow-amber-600/20"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Subempreiteiro'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
