'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus,
  Phone,
  MapPin,
  Euro,
  Calendar,
  ArrowRight,
  Trash2,
  LayoutGrid,
  List,
  Search,
  X,
  Loader2,
  ChevronDown,
  User,
  GripVertical,
  Building2,
  Sparkles,
} from 'lucide-react'
import {
  createLead,
  updateLeadStatus,
  deleteLead,
  convertLeadToProject,
} from '@/server/actions/leads'
import { formatCurrency, formatDate, getStatusLabel, cn } from '@/lib/utils'
import type { LeadStatus } from '@prisma/client'

const COLUMNS: { status: LeadStatus; label: string; color: string; dot: string; bg: string }[] = [
  {
    status: 'NOVA_LEAD',
    label: 'Nova Lead',
    color: 'rgba(79,126,248,0.12)',
    bg: 'rgba(79,126,248,0.04)',
    dot: '#4f7ef8',
  },
  {
    status: 'VISITA_AGENDADA',
    label: 'Visita Agendada',
    color: 'rgba(167,139,250,0.12)',
    bg: 'rgba(167,139,250,0.04)',
    dot: '#a78bfa',
  },
  {
    status: 'ORCAMENTO_ENVIADO',
    label: 'Orçamento Enviado',
    color: 'rgba(251,191,36,0.12)',
    bg: 'rgba(251,191,36,0.04)',
    dot: '#fbbf24',
  },
  {
    status: 'CONTRATO_ASSINADO',
    label: 'Contrato Assinado',
    color: 'rgba(52,211,153,0.12)',
    bg: 'rgba(52,211,153,0.04)',
    dot: '#34d399',
  },
  {
    status: 'PERDIDA',
    label: 'Perdida',
    color: 'rgba(248,113,113,0.12)',
    bg: 'rgba(248,113,113,0.04)',
    dot: '#f87171',
  },
]

type Lead = {
  id: string
  clientName: string
  phone: string
  email: string | null
  address: string
  source: string
  status: LeadStatus
  estimatedValue: number | null
  createdAt: Date
  project: { id: string } | null
}

const SOURCES = ['Meta Ads', 'Google Ads', 'Instagram', 'Referência', 'Website', 'Outro']

export function LeadsClient({ leads: initial }: { leads: Lead[] }) {
  const router = useRouter()
  const [leads, setLeads] = useState(initial)
  const [view, setView] = useState<'kanban' | 'table'>('kanban')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showConvert, setShowConvert] = useState<Lead | null>(null)
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<LeadStatus | null>(null)
  const [isPending, startTransition] = useTransition()

  // Form state
  const [form, setForm] = useState({
    clientName: '',
    phone: '',
    email: '',
    address: '',
    source: 'Meta Ads',
    estimatedValue: '',
  })
  const [convertForm, setConvertForm] = useState({
    title: '',
    contractValue: '',
    clientNIF: '',
    startDate: '',
  })

  const filtered = leads.filter(
    (l) =>
      l.clientName.toLowerCase().includes(search.toLowerCase()) ||
      l.address.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search)
  )

  // Drag and drop handlers
  function handleDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
    setDraggedLeadId(id)
  }

  function handleDragEnd() {
    setDraggedLeadId(null)
    setDragOverCol(null)
  }

  function handleDragOver(e: React.DragEvent, status: LeadStatus) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverCol !== status) {
      setDragOverCol(status)
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverCol(null)
    }
  }

  function handleDrop(e: React.DragEvent, targetStatus: LeadStatus) {
    e.preventDefault()
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId
    setDragOverCol(null)
    setDraggedLeadId(null)

    if (!leadId) return
    const lead = leads.find((l) => l.id === leadId)
    if (!lead || lead.status === targetStatus) return

    // Optimistic UI Update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: targetStatus } : l))
    )

    startTransition(async () => {
      await updateLeadStatus(leadId, targetStatus)
    })

    // If moved to CONTRATO_ASSINADO and no project exists, open convert modal
    if (targetStatus === 'CONTRATO_ASSINADO' && !lead.project) {
      setShowConvert(lead)
      setConvertForm({
        title: `Obra — ${lead.clientName}`,
        contractValue: String(lead.estimatedValue || ''),
        clientNIF: '',
        startDate: '',
      })
    }
  }

  async function handleCreateLead(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const lead = await createLead({
        clientName: form.clientName,
        phone: form.phone,
        email: form.email || undefined,
        address: form.address,
        source: form.source,
        estimatedValue: form.estimatedValue ? parseFloat(form.estimatedValue) : undefined,
      })
      setLeads((prev) => [
        { ...lead, status: lead.status as LeadStatus, project: null },
        ...prev,
      ])
      setForm({
        clientName: '',
        phone: '',
        email: '',
        address: '',
        source: 'Meta Ads',
        estimatedValue: '',
      })
      setShowForm(false)
    })
  }

  async function handleStatusChange(id: string, status: LeadStatus) {
    startTransition(async () => {
      await updateLeadStatus(id, status)
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)))
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminar esta lead permanentemente?')) return
    startTransition(async () => {
      await deleteLead(id)
      setLeads((prev) => prev.filter((l) => l.id !== id))
    })
  }

  async function handleConvert(e: React.FormEvent) {
    e.preventDefault()
    if (!showConvert) return
    startTransition(async () => {
      const project = await convertLeadToProject(showConvert.id, {
        title: convertForm.title || `Obra — ${showConvert.clientName}`,
        contractValue: parseFloat(convertForm.contractValue),
        clientNIF: convertForm.clientNIF || undefined,
        startDate: convertForm.startDate ? new Date(convertForm.startDate) : undefined,
      })
      setShowConvert(null)
      router.push(`/obras/${project.id}`)
    })
  }

  const badgeClass = (status: LeadStatus) => {
    const map: Record<LeadStatus, string> = {
      NOVA_LEAD: 'badge-blue',
      VISITA_AGENDADA: 'badge-purple',
      ORCAMENTO_ENVIADO: 'badge-yellow',
      CONTRATO_ASSINADO: 'badge-green',
      PERDIDA: 'badge-red',
    }
    return map[status]
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-[1400px] mx-auto pb-10">
      {/* iOS App Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Pipeline Comercial & CRM
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1">
            Funil de Obras
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            💡 <strong>Arrasta e larga (Drag & Drop)</strong> os cartões de uma coluna para a outra para atualizar o estado em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* iOS View Switcher */}
          <div className="ios-segmented">
            <button
              onClick={() => setView('kanban')}
              className={cn(
                'ios-segment-btn flex items-center gap-1.5',
                view === 'kanban' && 'ios-segment-btn-active'
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setView('table')}
              className={cn(
                'ios-segment-btn flex items-center gap-1.5',
                view === 'table' && 'ios-segment-btn-active'
              )}
            >
              <List className="w-3.5 h-3.5" />
              Lista
            </button>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 shadow-md shadow-blue-600/20 transition-all ios-interactive"
          >
            <Plus className="w-4 h-4" />
            Nova Lead
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por cliente, morada, telefone..."
            className="w-full pl-10 pr-8 py-2 rounded-xl text-xs text-white placeholder-slate-500 bg-white/5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="text-xs text-slate-400 hidden sm:block">
          A mostrar <strong className="text-white">{filtered.length}</strong> contactos
        </div>
      </div>

      {/* KANBAN VIEW WITH DRAG AND DROP */}
      {view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-6 pt-1">
          {COLUMNS.map((col) => {
            const colLeads = filtered.filter((l) => l.status === col.status)
            const colTotalValue = colLeads.reduce((s, l) => s + (l.estimatedValue || 0), 0)
            const isTarget = dragOverCol === col.status

            return (
              <div
                key={col.status}
                onDragOver={(e) => handleDragOver(e, col.status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.status)}
                className={cn(
                  'flex-shrink-0 w-80 rounded-2xl p-3.5 transition-all flex flex-col justify-between min-h-[500px]',
                  isTarget ? 'kanban-drop-target ring-2 ring-blue-500/50' : 'glass-card'
                )}
                style={{
                  background: isTarget ? 'rgba(79,126,248,0.12)' : col.bg,
                  borderColor: isTarget ? '#4f7ef8' : `${col.dot}20`,
                }}
              >
                <div>
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: col.dot }} />
                      <span className="text-xs font-bold text-white tracking-wide">{col.label}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                      {colLeads.length}
                    </span>
                  </div>

                  {/* Value Subtitle */}
                  <div className="px-1 mb-3 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Total Estimado:</span>
                    <span className="font-semibold text-slate-200">{formatCurrency(colTotalValue)}</span>
                  </div>

                  {/* Drag Target Drop Hint */}
                  {isTarget && (
                    <div className="mb-3 py-2 px-3 rounded-xl border border-dashed border-blue-400 bg-blue-500/20 text-blue-300 text-xs text-center font-medium animate-pulse">
                      ↓ Largar aqui para mover para {col.label}
                    </div>
                  )}

                  {/* Cards Container */}
                  <div className="space-y-3">
                    {colLeads.map((lead) => {
                      const isDragged = draggedLeadId === lead.id

                      return (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => router.push(`/leads/${lead.id}`)}
                          className={cn(
                            'glass-card p-4 rounded-2xl cursor-grab active:cursor-grabbing border border-white/[0.08] hover:border-white/20 transition-all group ios-interactive',
                            isDragged && 'kanban-drag-source'
                          )}
                        >
                          {/* Card Top */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm"
                                style={{ background: 'linear-gradient(135deg, #4f7ef8, #a78bfa)' }}
                              >
                                {lead.clientName[0]}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                                  {lead.clientName}
                                </p>
                                <span className="text-[10px] text-slate-400">{lead.source}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <GripVertical className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDelete(lead.id)
                                }}
                                className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-0.5"
                                title="Eliminar lead"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Contact and address details */}
                          <div className="space-y-1.5 mt-3 pt-2.5 border-t border-white/[0.05]">
                            <div className="flex items-center gap-2 text-xs text-slate-300">
                              <Phone className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                              <span className="truncate">{lead.phone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                              <span className="truncate">{lead.address}</span>
                            </div>
                            {lead.estimatedValue && (
                              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 pt-1">
                                <Euro className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>{formatCurrency(lead.estimatedValue)}</span>
                              </div>
                            )}
                          </div>

                          {/* Card Footer Actions */}
                          <div
                            className="mt-3 pt-2.5 border-t border-white/[0.05] flex items-center justify-between gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <select
                              value={lead.status}
                              onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                              className="text-[11px] rounded-lg px-2 py-1 text-slate-300 bg-white/5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                            >
                              {COLUMNS.map((c) => (
                                <option key={c.status} value={c.status}>
                                  {c.label}
                                </option>
                              ))}
                            </select>

                            {!lead.project ? (
                              <button
                                onClick={() => {
                                  setShowConvert(lead)
                                  setConvertForm({
                                    title: `Obra — ${lead.clientName}`,
                                    contractValue: String(lead.estimatedValue || ''),
                                    clientNIF: '',
                                    startDate: '',
                                  })
                                }}
                                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20"
                              >
                                <Building2 className="w-3 h-3" />
                                + Obra
                              </button>
                            ) : (
                              <Link
                                href={`/obras/${lead.project.id}`}
                                className="text-[11px] font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                              >
                                Ver Obra →
                              </Link>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {colLeads.length === 0 && (
                      <div className="text-center py-12 text-xs text-slate-600 border border-dashed border-white/5 rounded-2xl">
                        Nenhuma lead nesta etapa
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {view === 'table' && (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] text-xs font-semibold text-slate-400">
                <th className="text-left px-4 py-3.5">Cliente</th>
                <th className="text-left px-4 py-3.5">Telefone</th>
                <th className="text-left px-4 py-3.5">Morada</th>
                <th className="text-left px-4 py-3.5">Valor Est.</th>
                <th className="text-left px-4 py-3.5">Estado</th>
                <th className="text-left px-4 py-3.5">Data</th>
                <th className="text-right px-4 py-3.5">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => router.push(`/leads/${lead.id}`)}
                  className="table-row-hover cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #4f7ef8, #a78bfa)' }}
                      >
                        {lead.clientName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white leading-tight">{lead.clientName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{lead.source}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-300">{lead.phone}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-400 max-w-[200px] truncate">{lead.address}</td>
                  <td className="px-4 py-3.5 text-xs font-bold text-emerald-400">
                    {lead.estimatedValue ? formatCurrency(lead.estimatedValue) : '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={badgeClass(lead.status)}>{getStatusLabel(lead.status)}</span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">{formatDate(lead.createdAt)}</td>
                  <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleDelete(lead.id)}
                      className="text-slate-600 hover:text-red-400 transition-colors p-1"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-xs">Nenhuma lead encontrada.</div>
          )}
        </div>
      )}

      {/* CREATE LEAD MODAL */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-md bg-[#121624] border border-white/20 p-6 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" /> Nova Lead Comercial
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateLead} className="space-y-3.5">
              {[
                { label: 'Nome do Cliente *', key: 'clientName', type: 'text', placeholder: 'Ex: Sofia Ribeiro', required: true },
                { label: 'Telefone *', key: 'phone', type: 'tel', placeholder: '912 345 678', required: true },
                { label: 'Email', key: 'email', type: 'email', placeholder: 'sofia@exemplo.pt', required: false },
                { label: 'Morada da Obra *', key: 'address', type: 'text', placeholder: 'Rua Principal, Porto', required: true },
                { label: 'Valor Estimado (€)', key: 'estimatedValue', type: 'number', placeholder: '45000', required: false },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-slate-300 mb-1">{field.label}</label>
                  <input
                    type={field.type}
                    required={field.required}
                    placeholder={field.placeholder}
                    value={(form as Record<string, string>)[field.key]}
                    onChange={(e) => setForm((p) => ({ ...p, [field.key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-xs text-white placeholder-slate-500 bg-[#191e30] border border-white/15 focus:outline-none focus:border-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Canal de Origem</label>
                <select
                  value={form.source}
                  onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-xs text-white bg-[#191e30] border border-white/15 focus:outline-none"
                >
                  {SOURCES.map((s) => (
                    <option key={s} value={s} className="bg-[#12141c]">
                      {s}
                    </option>
                  ))}
                </select>
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
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONVERT TO OBRA MODAL */}
      {showConvert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-md bg-[#121624] border border-white/20 p-6 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" /> Converter Lead em Obra
              </h2>
              <button onClick={() => setShowConvert(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-3.5">
              <p className="text-xs text-slate-200">
                Cliente: <strong className="text-white">{showConvert.clientName}</strong>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Morada: {showConvert.address}</p>
            </div>
            <form onSubmit={handleConvert} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Título da Obra</label>
                <input
                  type="text"
                  value={convertForm.title}
                  onChange={(e) => setConvertForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs text-white bg-white/5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Valor Adjudicado do Contrato (€) *
                </label>
                <input
                  type="number"
                  required
                  value={convertForm.contractValue}
                  onChange={(e) => setConvertForm((p) => ({ ...p, contractValue: e.target.value }))}
                  placeholder="85000"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs text-white bg-white/5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">NIF do Cliente</label>
                <input
                  type="text"
                  value={convertForm.clientNIF}
                  onChange={(e) => setConvertForm((p) => ({ ...p, clientNIF: e.target.value }))}
                  placeholder="245 678 901"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs text-white bg-white/5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Data de Início Prevista</label>
                <input
                  type="date"
                  value={convertForm.startDate}
                  onChange={(e) => setConvertForm((p) => ({ ...p, startDate: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs text-white bg-white/5 border border-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConvert(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs text-slate-400 hover:text-white border border-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar e Abrir Obra →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
