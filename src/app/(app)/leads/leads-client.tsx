'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus,
  Phone,
  MapPin,
  Calendar,
  ArrowRight,
  Trash2,
  List,
  Search,
  X,
  Loader2,
  ChevronDown,
  Building2,
  Upload,
  Download,
  Filter,
  SlidersHorizontal,
  CheckSquare,
  AlertCircle,
  Briefcase,
} from 'lucide-react'
import {
  createLead,
  updateLeadStatus,
  deleteLead,
  convertLeadToProject,
} from '@/server/actions/leads'
import { formatCurrency, formatDate, getStatusLabel, cn } from '@/lib/utils'
import { Modal } from '@/components/ui/modal'
import type { LeadStatus } from '@prisma/client'

const CRM_COLUMNS: {
  status: LeadStatus
  title: string
  originalLabel: string
  color: string
  dot: string
}[] = [
  {
    status: 'NOVA_LEAD',
    title: 'Interessados',
    originalLabel: 'Nova Lead',
    color: '#3b82f6',
    dot: 'bg-blue-500',
  },
  {
    status: 'VISITA_AGENDADA',
    title: 'Qualificação',
    originalLabel: 'Visita Agendada',
    color: '#8b5cf6',
    dot: 'bg-purple-500',
  },
  {
    status: 'ORCAMENTO_ENVIADO',
    title: 'Proposta',
    originalLabel: 'Orçamento Enviado',
    color: '#f59e0b',
    dot: 'bg-amber-500',
  },
  {
    status: 'CONTRATO_ASSINADO',
    title: 'Negociação',
    originalLabel: 'Contrato Assinado',
    color: '#10b981',
    dot: 'bg-emerald-500',
  },
  {
    status: 'PERDIDA',
    title: 'Fechamento',
    originalLabel: 'Perdida / Concluída',
    color: '#ef4444',
    dot: 'bg-red-500',
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
  const [view, setView] = useState<'funil' | 'listagem' | 'mapa'>('funil')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'value_desc' | 'name'>('recent')
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

  // Filtering and Sorting
  const filtered = leads
    .filter(
      (l) =>
        l.clientName.toLowerCase().includes(search.toLowerCase()) ||
        l.address.toLowerCase().includes(search.toLowerCase()) ||
        l.phone.includes(search) ||
        (l.source || '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'value_desc') {
        return (b.estimatedValue || 0) - (a.estimatedValue || 0)
      }
      if (sortBy === 'name') {
        return a.clientName.localeCompare(b.clientName)
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  const totalPipelineValue = filtered.reduce((acc, l) => acc + (l.estimatedValue || 0), 0)

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

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
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
        contractValue: parseFloat(convertForm.contractValue) || 0,
        clientNIF: convertForm.clientNIF || undefined,
        startDate: convertForm.startDate ? new Date(convertForm.startDate) : undefined,
      })
      setShowConvert(null)
      router.push(`/obras/${project.id}`)
    })
  }

  // Export to CSV
  function handleExport() {
    if (leads.length === 0) {
      alert('Não existem contactos para exportar.')
      return
    }
    const headers = ['Nome', 'Telefone', 'Email', 'Morada', 'Canal', 'Valor Estimado', 'Estado', 'Data']
    const rows = leads.map(l => [
      `"${l.clientName.replace(/"/g, '""')}"`,
      `"${l.phone}"`,
      `"${l.email || ''}"`,
      `"${l.address.replace(/"/g, '""')}"`,
      `"${l.source}"`,
      `"${l.estimatedValue || 0}"`,
      `"${l.status}"`,
      `"${new Date(l.createdAt).toLocaleDateString('pt-PT')}"`,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `leads-freitas-os-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Lead card indicator dot
  function getLeadDot(lead: Lead) {
    if (lead.status === 'CONTRATO_ASSINADO' || lead.status === 'VISITA_AGENDADA') {
      return { color: 'bg-emerald-500', label: 'Com tarefa agendada' }
    }
    if (lead.status === 'ORCAMENTO_ENVIADO') {
      return { color: 'bg-amber-500', label: 'Tarefa atrasada / pendente' }
    }
    return { color: 'bg-red-500', label: 'Sem tarefa agendada' }
  }

  return (
    <div className="space-y-4 pb-12 w-full max-w-full">
      {/* ── TOP SEARCH & SORT BAR (Image 2 style) ────────────────────── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white border border-slate-200 shadow-sm p-2.5 rounded-[4px]">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, cliente ou morada..."
            className="w-full pl-3.5 pr-10 py-2 rounded-[4px] text-xs text-slate-900 placeholder-slate-400 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-blue-600"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 pointer-events-none" />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-9 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right count and sort dropdown */}
        <div className="flex items-center justify-between md:justify-end gap-3 flex-shrink-0 text-xs">
          <span className="text-slate-600 font-semibold whitespace-nowrap">
            <strong className="text-slate-900 text-sm">{filtered.length}</strong> negócio(s)
          </span>

          <div className="flex items-center gap-1.5">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-2 rounded-[4px] text-xs text-slate-800 bg-white border border-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="recent">Data recente - antigo</option>
              <option value="value_desc">Maior valor estimado</option>
              <option value="name">Nome (A - Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── ACTION TOOLBAR & METRICS (Image 2 style) ──────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200 shadow-sm p-3.5 sm:p-4 rounded-[4px]">
        {/* Action Button & Large Metric */}
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2.5 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-2 transition-all shadow-md shadow-blue-600/20 active:scale-98"
          >
            <Plus className="w-4 h-4" />
            Adicionar Negócio
          </button>

          <div className="flex items-baseline gap-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {leads.length}
            </span>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none">
                NEGÓCIOS
              </span>
              <span className="text-sm sm:text-base font-bold text-emerald-600 tracking-tight leading-tight mt-0.5">
                {formatCurrency(totalPipelineValue)}
              </span>
            </div>
          </div>
        </div>

        {/* Utilities: Import, Export, Views */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => alert('Para importar contactos em lote, utilize a importação via ficheiro CSV/Excel.')}
            className="px-3 py-2 rounded-[4px] text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            <span>IMPORTAR</span>
          </button>

          <button
            onClick={handleExport}
            className="px-3 py-2 rounded-[4px] text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>EXPORTAR</span>
          </button>

          {/* View switcher: LISTAGEM | FUNIL | MAPA */}
          <div className="inline-flex border border-slate-200 rounded-[4px] overflow-hidden bg-slate-100 p-0.5">
            <button
              onClick={() => setView('listagem')}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 rounded-[2px] transition-colors',
                view === 'listagem'
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <List className="w-3.5 h-3.5" />
              <span>LISTAGEM</span>
            </button>
            <button
              onClick={() => setView('funil')}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 rounded-[2px] transition-colors',
                view === 'funil'
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>FUNIL</span>
            </button>
            <button
              onClick={() => setView('mapa')}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 rounded-[2px] transition-colors',
                view === 'mapa'
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>MAPA</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── FUNIL VIEW (Image 2 style: Rectangular, Crisp Columns & Cards) ─ */}
      {view === 'funil' && (
        <div className="flex md:grid md:grid-cols-3 lg:grid-cols-5 gap-3 items-start overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none">
          {CRM_COLUMNS.map((col) => {
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
                  'w-[84vw] sm:w-[320px] md:w-auto flex-shrink-0 snap-center md:snap-align-none rounded-[4px] border transition-all flex flex-col min-h-[480px] md:min-h-[560px] bg-[#f1f5f9]',
                  isTarget ? 'border-blue-500 ring-1 ring-blue-500/50 bg-blue-50/30' : 'border-slate-200'
                )}
              >
                {/* Column Header (Image 2 style) */}
                <div className="px-3 py-3 border-b border-slate-200 bg-[#eef2f6] rounded-t-[4px] text-center">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight uppercase">
                    {col.title}
                  </h3>
                  <div className="text-[11px] font-bold text-slate-800 mt-0.5">
                    {formatCurrency(colTotalValue)}
                  </div>
                  <div className="text-[10px] font-medium text-slate-500">
                    ({colLeads.length} negócios)
                  </div>
                </div>

                {/* Cards Container */}
                <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                  {colLeads.map((lead) => {
                    const dotInfo = getLeadDot(lead)
                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => router.push(`/leads/${lead.id}`)}
                        className={cn(
                          'p-3 rounded-[4px] border border-slate-200 bg-white hover:border-blue-500 transition-all cursor-pointer shadow-xs relative group',
                          draggedLeadId === lead.id && 'opacity-30 border-dashed border-blue-500'
                        )}
                      >
                        {/* Dot indicator and Title */}
                        <div className="flex items-start gap-2">
                          <span
                            className={cn('w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0', dotInfo.color)}
                            title={dotInfo.label}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 leading-snug truncate">
                              {lead.clientName}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {lead.address || 'Sem morada'}
                            </p>
                          </div>
                        </div>

                        {/* Value and Source */}
                        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
                          <span className="text-xs font-bold text-slate-900">
                            {lead.estimatedValue ? formatCurrency(lead.estimatedValue) : 'Valor a definir'}
                          </span>
                          <span className="text-[10px] text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-[2px]">
                            {lead.source}
                          </span>
                        </div>

                        {/* Quick action buttons on card footer */}
                        <div className="flex items-center justify-between mt-2 pt-1">
                          <a
                            href={`tel:${lead.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-slate-400 hover:text-amber-600 p-1 rounded hover:bg-amber-50 transition-colors"
                            title={`Ligar: ${lead.phone}`}
                          >
                            <Phone className="w-3.5 h-3.5 text-amber-600" />
                          </a>

                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                            {lead.status === 'CONTRATO_ASSINADO' && !lead.project && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowConvert(lead)
                                  setConvertForm({
                                    title: `Obra — ${lead.clientName}`,
                                    contractValue: String(lead.estimatedValue || ''),
                                    clientNIF: '',
                                    startDate: '',
                                  })
                                }}
                                className="text-[10px] font-bold text-emerald-700 hover:underline px-1 py-0.5"
                                title="Converter em Obra"
                              >
                                + Obra
                              </button>
                            )}

                            <button
                              onClick={(e) => handleDelete(lead.id, e)}
                              className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                              title="Eliminar Lead"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {colLeads.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-xs italic">
                      Nenhum negócio nesta fase
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── LISTAGEM VIEW (Table style) ──────────────────────────────── */}
      {view === 'listagem' && (
        <div className="border border-slate-200 rounded-[4px] overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Cliente / Negócio</th>
                  <th className="px-4 py-3">Telefone</th>
                  <th className="px-4 py-3">Morada</th>
                  <th className="px-4 py-3">Origem</th>
                  <th className="px-4 py-3">Valor Estimado</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => router.push(`/leads/${lead.id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {lead.clientName}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{lead.phone}</td>
                    <td className="px-4 py-3 text-slate-500 truncate max-w-[220px]">{lead.address}</td>
                    <td className="px-4 py-3 text-slate-500">{lead.source}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {lead.estimatedValue ? formatCurrency(lead.estimatedValue) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-[3px] text-[10.5px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {getStatusLabel(lead.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleDelete(lead.id, e)}
                        className="text-slate-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      Nenhum negócio encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MAPA VIEW (Overview / Distribution) ──────────────────────── */}
      {view === 'mapa' && (
        <div className="border border-slate-200 rounded-[4px] p-6 bg-white shadow-sm text-center space-y-4">
          <MapPin className="w-10 h-10 text-blue-600 mx-auto opacity-70" />
          <h3 className="text-base font-bold text-slate-900">Distribuição Geográfica de Obras</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {filtered.length} contactos e localizações registadas no sistema.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-left max-w-3xl mx-auto pt-2">
            {filtered.map((l) => (
              <div key={l.id} className="p-3 bg-slate-50 border border-slate-200 rounded-[4px]">
                <p className="text-xs font-bold text-slate-900 truncate">{l.clientName}</p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{l.address}</p>
                <p className="text-[11px] font-bold text-emerald-700 mt-1">
                  {l.estimatedValue ? formatCurrency(l.estimatedValue) : '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── BOTTOM LEGEND (Image 2 style) ─────────────────────────────── */}
      <div className="flex items-center gap-5 pt-3 border-t border-slate-200 text-xs text-slate-600 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>Com tarefa agendada</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500" />
          <span>Tarefa atrasada</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span>Sem tarefa agendada</span>
        </div>
      </div>

      {/* ── CREATE LEAD MODAL (Uses Portal Modal) ─────────────────────── */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Adicionar Negócio"
        subtitle="Registar nova oportunidade comercial no funil de vendas"
        icon={<Briefcase className="w-5 h-5 text-blue-600" />}
      >
        <form onSubmit={handleCreateLead} className="space-y-3.5">
          {[
            { label: 'Nome do Cliente / Oportunidade *', key: 'clientName', type: 'text', placeholder: 'Ex: Sofia Ribeiro', required: true },
            { label: 'Telefone de Contacto *', key: 'phone', type: 'tel', placeholder: '912 345 678', required: true },
            { label: 'Email', key: 'email', type: 'email', placeholder: 'sofia@exemplo.pt', required: false },
            { label: 'Morada da Obra *', key: 'address', type: 'text', placeholder: 'Rua Principal, 45, Porto', required: true },
            { label: 'Valor Estimado do Negócio (€)', key: 'estimatedValue', type: 'number', placeholder: '45000', required: false },
          ].map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{field.label}</label>
              <input
                type={field.type}
                required={field.required}
                placeholder={field.placeholder}
                value={(form as Record<string, string>)[field.key]}
                onChange={(e) => setForm((p) => ({ ...p, [field.key]: e.target.value }))}
                className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-300 focus:outline-none focus:border-blue-600"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Canal de Origem</label>
            <select
              value={form.source}
              onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))}
              className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 bg-white border border-slate-300 focus:outline-none focus:border-blue-600"
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
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
              className="flex-1 py-2.5 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-60 transition-all shadow-md shadow-blue-600/20"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Negócio'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── CONVERT TO OBRA MODAL (Uses Portal Modal) ─────────────────── */}
      <Modal
        isOpen={Boolean(showConvert)}
        onClose={() => setShowConvert(null)}
        title="Converter em Obra Oficial"
        subtitle={`Adjudicar contrato para ${showConvert?.clientName || ''}`}
        icon={<Building2 className="w-5 h-5 text-emerald-600" />}
      >
        <div className="p-3 rounded-[4px] bg-emerald-50 border border-emerald-200 mb-3.5">
          <p className="text-xs text-slate-700">
            Cliente: <strong className="text-slate-900">{showConvert?.clientName}</strong>
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Morada: {showConvert?.address}</p>
        </div>
        <form onSubmit={handleConvert} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Título da Obra</label>
            <input
              type="text"
              value={convertForm.title}
              onChange={(e) => setConvertForm((p) => ({ ...p, title: e.target.value }))}
              className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 bg-white border border-slate-300 focus:outline-none focus:border-emerald-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Valor Adjudicado do Contrato (€) *
            </label>
            <input
              type="number"
              required
              value={convertForm.contractValue}
              onChange={(e) => setConvertForm((p) => ({ ...p, contractValue: e.target.value }))}
              placeholder="85000"
              className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 bg-white border border-slate-300 focus:outline-none focus:border-emerald-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">NIF do Cliente</label>
            <input
              type="text"
              value={convertForm.clientNIF}
              onChange={(e) => setConvertForm((p) => ({ ...p, clientNIF: e.target.value }))}
              placeholder="245 678 901"
              className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 bg-white border border-slate-300 focus:outline-none focus:border-emerald-600"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Data de Início Prevista</label>
            <input
              type="date"
              value={convertForm.startDate}
              onChange={(e) => setConvertForm((p) => ({ ...p, startDate: e.target.value }))}
              className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 bg-white border border-slate-300 focus:outline-none focus:border-emerald-600"
            />
          </div>
          <div className="flex gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowConvert(null)}
              className="flex-1 py-2.5 rounded-[4px] text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2 disabled:opacity-60 transition-all shadow-md shadow-emerald-600/20"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar e Abrir Obra →'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
