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
  StickyNote,
  Edit3,
  Check,
  Pencil,
} from 'lucide-react'
import {
  createLead,
  updateLead,
  updateLeadStatus,
  deleteLead,
  convertLeadToProject,
} from '@/server/actions/leads'
import { createNote, updateNote, deleteNote } from '@/server/actions/notes'
import { formatCurrency, formatDate, getStatusLabel, getUrgencyBadge, cn } from '@/lib/utils'
import { Modal } from '@/components/ui/modal'
import { UserAvatar } from '@/components/ui/user-avatar'
import type { LeadStatus } from '@prisma/client'

const CRM_COLUMNS: {
  status: LeadStatus
  title: string
  color: string
  dot: string
}[] = [
  {
    status: 'NOVA_LEAD',
    title: 'Leads',
    color: '#3b82f6',
    dot: 'bg-blue-500',
  },
  {
    status: 'VISITA_AGENDADA',
    title: 'Visita',
    color: '#8b5cf6',
    dot: 'bg-purple-500',
  },
  {
    status: 'ORCAMENTO_ENVIADO',
    title: 'Orçamento Enviado',
    color: '#f59e0b',
    dot: 'bg-amber-500',
  },
  {
    status: 'CONTRATO_ASSINADO',
    title: 'Fechado',
    color: '#10b981',
    dot: 'bg-emerald-500',
  },
]

type NoteItem = {
  id: string
  title: string | null
  content: string
  createdAt: Date | string
  createdBy?: { id: string; name: string; color: string; image?: string | null } | null
}

type Lead = {
  id: string
  clientName: string
  phone: string
  email: string | null
  address: string
  source: string
  status: LeadStatus
  urgency?: string | null
  estimatedValue: number | null
  provisionalProfit?: number | null
  andrePaid?: boolean
  jorgePaid?: boolean
  profitShareSettled?: boolean
  createdAt: Date
  project: { id: string } | null
  notes?: NoteItem[]
  _count?: { notes: number }
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
    provisionalProfit: '',
    urgency: 'Sem pressa',
  })
  const [convertForm, setConvertForm] = useState({
    title: '',
    contractValue: '',
    clientNIF: '',
    startDate: '',
  })

  // Direct CRM Notes Modal state
  const [activeNotesLead, setActiveNotesLead] = useState<Lead | null>(null)
  const [newNoteTitle, setNewNoteTitle] = useState('')
  const [newNoteContent, setNewNoteContent] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editNoteTitle, setEditNoteTitle] = useState('')
  const [editNoteContent, setEditNoteContent] = useState('')

  // Direct Lead Editing state
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [editForm, setEditForm] = useState({
    clientName: '',
    phone: '',
    email: '',
    address: '',
    source: 'Meta Ads',
    estimatedValue: '',
    provisionalProfit: '',
    urgency: 'Sem pressa',
    status: 'NOVA_LEAD',
  })

  function handleOpenEdit(lead: Lead, e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    setEditingLead(lead)
    setEditForm({
      clientName: lead.clientName,
      phone: lead.phone,
      email: lead.email || '',
      address: lead.address,
      source: lead.source || 'Meta Ads',
      estimatedValue: lead.estimatedValue ? String(lead.estimatedValue) : '',
      provisionalProfit: lead.provisionalProfit ? String(lead.provisionalProfit) : '',
      urgency: lead.urgency || 'Sem pressa',
      status: lead.status,
    })
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingLead) return
    if (!editForm.clientName.trim() || !editForm.phone.trim() || !editForm.address.trim()) {
      alert('Por favor preencha o nome, telefone e morada.')
      return
    }

    startTransition(async () => {
      try {
        const updated = await updateLead(editingLead.id, {
          clientName: editForm.clientName.trim(),
          phone: editForm.phone.trim(),
          email: editForm.email.trim() || null,
          address: editForm.address.trim(),
          source: editForm.source,
          estimatedValue: editForm.estimatedValue ? parseFloat(editForm.estimatedValue) : null,
          provisionalProfit: editForm.provisionalProfit ? parseFloat(editForm.provisionalProfit) : null,
          urgency: editForm.urgency,
          status: editForm.status,
        })

        const leadWithStatus: Lead = {
          ...editingLead,
          ...updated,
          status: updated.status as LeadStatus,
        }

        setLeads((prev) =>
          prev.map((l) => (l.id === editingLead.id ? leadWithStatus : l))
        )

        if (activeNotesLead?.id === editingLead.id) {
          setActiveNotesLead(leadWithStatus)
        }

        setEditingLead(null)
      } catch (err: any) {
        console.error('Error updating lead:', err)
        alert(err?.message || 'Erro ao guardar alterações da lead')
      }
    })
  }

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
        provisionalProfit: form.provisionalProfit ? parseFloat(form.provisionalProfit) : undefined,
        urgency: form.urgency,
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
        provisionalProfit: '',
        urgency: 'Sem pressa',
      })
      setShowForm(false)
    })
  }

  async function handleAddLeadNote(e: React.FormEvent) {
    e.preventDefault()
    if (!activeNotesLead || !newNoteContent.trim()) return

    startTransition(async () => {
      const created = await createNote({
        title: newNoteTitle.trim() || undefined,
        content: newNoteContent.trim(),
        leadId: activeNotesLead.id,
      })

      const updatedLeadNotes = [created as any, ...(activeNotesLead.notes || [])]
      const updatedLead = { ...activeNotesLead, notes: updatedLeadNotes }

      setActiveNotesLead(updatedLead)
      setLeads((prev) =>
        prev.map((l) => (l.id === activeNotesLead.id ? updatedLead : l))
      )
      setNewNoteTitle('')
      setNewNoteContent('')
    })
  }

  async function handleUpdateLeadNote(noteId: string, e: React.FormEvent) {
    e.preventDefault()
    if (!activeNotesLead || !editNoteContent.trim()) return

    startTransition(async () => {
      const updated = await updateNote(noteId, {
        title: editNoteTitle.trim() || undefined,
        content: editNoteContent.trim(),
      })

      const updatedLeadNotes = (activeNotesLead.notes || []).map((n) =>
        n.id === noteId ? { ...n, title: updated.title, content: updated.content } : n
      )
      const updatedLead = { ...activeNotesLead, notes: updatedLeadNotes }

      setActiveNotesLead(updatedLead)
      setLeads((prev) =>
        prev.map((l) => (l.id === activeNotesLead.id ? updatedLead : l))
      )
      setEditingNoteId(null)
    })
  }

  async function handleDeleteLeadNote(noteId: string) {
    if (!confirm('Eliminar esta nota?')) return
    startTransition(async () => {
      try {
        await deleteNote(noteId)
        if (!activeNotesLead) return
        const updatedLeadNotes = (activeNotesLead.notes || []).filter((n) => n.id !== noteId)
        const updatedLead = { ...activeNotesLead, notes: updatedLeadNotes }

        setActiveNotesLead(updatedLead)
        setLeads((prev) =>
          prev.map((l) => (l.id === activeNotesLead.id ? updatedLead : l))
        )
      } catch (err: any) {
        console.error('Error deleting note:', err)
        alert(err?.message || 'Erro ao eliminar nota')
      }
    })
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Eliminar esta lead permanentemente?')) return
    startTransition(async () => {
      try {
        await deleteLead(id)
        setLeads((prev) => prev.filter((l) => l.id !== id))
        if (activeNotesLead?.id === id) {
          setActiveNotesLead(null)
        }
      } catch (err: any) {
        console.error('Error deleting lead:', err)
        alert(err?.message || 'Erro ao eliminar lead')
      }
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
        <div className="flex lg:grid lg:grid-cols-4 gap-3 items-start overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none">
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
                  'w-[84vw] sm:w-[320px] lg:w-auto flex-shrink-0 snap-center lg:snap-align-none rounded-[4px] border transition-all flex flex-col min-h-[480px] lg:min-h-[560px] bg-[#f1f5f9]',
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
                    const urgBadge = getUrgencyBadge(lead.urgency)
                    const notesCount = lead.notes?.length || lead._count?.notes || 0

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
                        {/* Dot indicator, Urgency badge and Title */}
                        <div className="flex items-start gap-2">
                          <span
                            className={cn('w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0', dotInfo.color)}
                            title={dotInfo.label}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-bold text-slate-900 leading-snug truncate">
                                {lead.clientName}
                              </p>
                              <span
                                className={cn(
                                  'text-[9px] font-bold px-1.5 py-0.2 rounded-[2px] border leading-tight',
                                  urgBadge.bg,
                                  urgBadge.color,
                                  urgBadge.border
                                )}
                              >
                                {urgBadge.label}
                              </span>
                            </div>
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

                        {/* Provisional Profit and 40/60 Split Preview */}
                        {lead.provisionalProfit != null && (
                          <div className="flex items-center justify-between text-[10.5px] mt-1 pt-1 border-t border-slate-100/70">
                            <span className="font-semibold text-emerald-700">
                              Lucro: {formatCurrency(lead.provisionalProfit)}
                            </span>
                            <span className="text-[9.5px] text-slate-500 font-medium">
                              A: {formatCurrency(lead.provisionalProfit * 0.4)} | J: {formatCurrency(lead.provisionalProfit * 0.6)}
                            </span>
                          </div>
                        )}

                        {/* Quick action buttons on card footer */}
                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
                          <div className="flex items-center gap-1">
                            <a
                              href={`tel:${lead.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-slate-400 hover:text-amber-600 p-1 rounded hover:bg-amber-50 transition-colors"
                              title={`Ligar: ${lead.phone}`}
                            >
                              <Phone className="w-3.5 h-3.5 text-amber-600" />
                            </a>

                            {/* Direct Note Button on CRM Card */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveNotesLead(lead)
                              }}
                              className={cn(
                                'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors',
                                notesCount > 0
                                  ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                              )}
                              title="Notas da Lead no CRM"
                            >
                              <StickyNote className="w-3 h-3 text-amber-600" />
                              <span>{notesCount > 0 ? `${notesCount}` : '+ Nota'}</span>
                            </button>
                          </div>

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
                              type="button"
                              onClick={(e) => handleOpenEdit(lead, e)}
                              className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
                              title="Editar Lead diretamente"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

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
                  <th className="px-4 py-3">Urgência</th>
                  <th className="px-4 py-3">Origem</th>
                  <th className="px-4 py-3">Valor Estimado</th>
                  <th className="px-4 py-3">Lucro Prev. (40/60)</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((lead) => {
                  const urgBadge = getUrgencyBadge(lead.urgency)
                  const notesCount = lead.notes?.length || lead._count?.notes || 0
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => router.push(`/leads/${lead.id}`)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {lead.clientName}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{lead.phone}</td>
                      <td className="px-4 py-3 text-slate-500 truncate max-w-[200px]">{lead.address}</td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-[3px] text-[10.5px] font-bold border', urgBadge.bg, urgBadge.color, urgBadge.border)}>
                          {urgBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{lead.source}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {lead.estimatedValue ? formatCurrency(lead.estimatedValue) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {lead.provisionalProfit ? (
                          <div>
                            <span className="font-bold text-emerald-700">{formatCurrency(lead.provisionalProfit)}</span>
                            <div className="text-[10px] text-slate-500">
                              A: {formatCurrency(lead.provisionalProfit * 0.4)} | J: {formatCurrency(lead.provisionalProfit * 0.6)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-[3px] text-[10.5px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {getStatusLabel(lead.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setActiveNotesLead(lead)}
                            className={cn(
                              'flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-colors',
                              notesCount > 0
                                ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                            )}
                            title="Ver/Adicionar Notas"
                          >
                            <StickyNote className="w-3.5 h-3.5 text-amber-600" />
                            <span>{notesCount > 0 ? `${notesCount}` : '+ Nota'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleOpenEdit(lead, e)}
                            className="text-slate-400 hover:text-blue-600 p-1"
                            title="Editar Lead diretamente"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(lead.id, e)}
                            className="text-slate-400 hover:text-red-600 p-1"
                            title="Eliminar Lead"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
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
            { label: 'Lucro Provisório (€) (Previsão Partilha)', key: 'provisionalProfit', type: 'number', placeholder: 'Ex: 4000', required: false },
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
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Urgência do Negócio</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'Imediatamente', label: 'Imediatamente', color: 'border-red-300 text-red-700 bg-red-50/70', active: 'ring-2 ring-red-500 bg-red-100/90 font-extrabold' },
                { value: 'Curto prazo', label: 'Curto prazo', color: 'border-amber-300 text-amber-700 bg-amber-50/70', active: 'ring-2 ring-amber-500 bg-amber-100/90 font-extrabold' },
                { value: 'Sem pressa', label: 'Sem pressa', color: 'border-slate-300 text-slate-700 bg-slate-50', active: 'ring-2 ring-slate-500 bg-slate-200 font-extrabold' },
              ].map((urg) => (
                <button
                  key={urg.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, urgency: urg.value }))}
                  className={cn(
                    'py-2 px-2 text-xs font-semibold rounded-[4px] border transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer',
                    urg.color,
                    form.urgency === urg.value && urg.active
                  )}
                >
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full',
                      urg.value === 'Imediatamente' ? 'bg-red-600' : urg.value === 'Curto prazo' ? 'bg-amber-500' : 'bg-slate-400'
                    )}
                  />
                  <span>{urg.label}</span>
                </button>
              ))}
            </div>
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

      {/* ── DIRECT CRM LEAD NOTES MODAL ──────────────────────────────── */}
      <Modal
        isOpen={Boolean(activeNotesLead)}
        onClose={() => {
          setActiveNotesLead(null)
          setEditingNoteId(null)
          setNewNoteTitle('')
          setNewNoteContent('')
        }}
        title={`Notas — ${activeNotesLead?.clientName || ''}`}
        subtitle="Registar e consultar apontamentos diretamente no CRM"
        icon={<StickyNote className="w-5 h-5 text-amber-600" />}
        maxWidth="lg"
      >
        <div className="space-y-4">
          {/* Create note inside modal */}
          <form onSubmit={handleAddLeadNote} className="p-3.5 rounded-[4px] bg-amber-50/60 border border-amber-200 space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Adicionar Nota a esta Lead
            </p>
            <input
              type="text"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              placeholder="Título (Opcional, ex: Contacto telefónico, Pedido de revisão...)"
              className="w-full px-3 py-1.5 text-xs rounded-[4px] bg-white border border-slate-300 focus:outline-none focus:border-amber-600 text-slate-900"
            />
            <textarea
              required
              rows={3}
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Escreva os detalhes da nota aqui..."
              className="w-full px-3 py-1.5 text-xs rounded-[4px] bg-white border border-slate-300 focus:outline-none focus:border-amber-600 text-slate-900 resize-none"
            />
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isPending || !newNoteContent.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded shadow-sm disabled:opacity-60 transition-all cursor-pointer"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Gravar Nota no CRM</span>
              </button>
            </div>
          </form>

          {/* List of notes for active lead */}
          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Histórico de Notas ({activeNotesLead?.notes?.length || 0})
            </h4>

            {(!activeNotesLead?.notes || activeNotesLead.notes.length === 0) ? (
              <div className="text-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-[4px]">
                <StickyNote className="w-7 h-7 mx-auto mb-1.5 opacity-30" />
                <p className="text-xs">Esta lead ainda não tem notas registadas.</p>
              </div>
            ) : (
              activeNotesLead.notes.map((note) => (
                <div
                  key={note.id}
                  className="p-3 rounded-[4px] bg-slate-50 border border-slate-200 hover:border-amber-300 transition-all group"
                >
                  {editingNoteId === note.id ? (
                    <form onSubmit={(e) => handleUpdateLeadNote(note.id, e)} className="space-y-2">
                      <input
                        type="text"
                        value={editNoteTitle}
                        onChange={(e) => setEditNoteTitle(e.target.value)}
                        placeholder="Título da nota..."
                        className="w-full px-2.5 py-1 text-xs rounded bg-white border border-slate-300 focus:outline-none focus:border-amber-600 font-bold text-slate-900"
                      />
                      <textarea
                        required
                        rows={3}
                        value={editNoteContent}
                        onChange={(e) => setEditNoteContent(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs rounded bg-white border border-slate-300 focus:outline-none focus:border-amber-600 text-slate-800 resize-none"
                      />
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingNoteId(null)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 rounded cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={isPending || !editNoteContent.trim()}
                          className="flex items-center gap-1 px-3 py-1 text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 rounded shadow-xs cursor-pointer"
                        >
                          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          <span>Guardar Alterações</span>
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        {note.title ? (
                          <p className="text-xs font-bold text-slate-900 leading-snug">{note.title}</p>
                        ) : (
                          <span />
                        )}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNoteId(note.id)
                              setEditNoteTitle(note.title || '')
                              setEditNoteContent(note.content)
                            }}
                            className="p-1 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded cursor-pointer"
                            title="Editar nota"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLeadNote(note.id)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                            title="Eliminar nota"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed mt-1">
                        {note.content}
                      </p>

                      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-200/60 text-[10.5px] text-slate-400">
                        <div className="flex items-center gap-1.5">
                          {note.createdBy && (
                            <UserAvatar
                              name={note.createdBy.name}
                              color={note.createdBy.color}
                              image={note.createdBy.image}
                              size={16}
                            />
                          )}
                          <span>{note.createdBy?.name || 'Sistema'}</span>
                        </div>
                        <span>{formatDate(note.createdAt)}</span>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* ── EDIT LEAD DIRECT MODAL (Uses Portal Modal) ─────────────────── */}
      <Modal
        isOpen={Boolean(editingLead)}
        onClose={() => setEditingLead(null)}
        title="Editar Negócio / Lead"
        subtitle={`Atualizar dados comerciais de ${editingLead?.clientName || ''}`}
        icon={<Pencil className="w-5 h-5 text-blue-600" />}
      >
        <form onSubmit={handleSaveEdit} className="space-y-3.5">
          {[
            { label: 'Nome do Cliente / Oportunidade *', key: 'clientName', type: 'text', placeholder: 'Ex: Sofia Ribeiro', required: true },
            { label: 'Telefone de Contacto *', key: 'phone', type: 'tel', placeholder: '912 345 678', required: true },
            { label: 'Email', key: 'email', type: 'email', placeholder: 'sofia@exemplo.pt', required: false },
            { label: 'Morada da Obra *', key: 'address', type: 'text', placeholder: 'Rua Principal, 45, Porto', required: true },
            { label: 'Valor Estimado do Negócio (€)', key: 'estimatedValue', type: 'number', placeholder: '45000', required: false },
            { label: 'Lucro Provisório (€) (Previsão Partilha)', key: 'provisionalProfit', type: 'number', placeholder: 'Ex: 4000', required: false },
          ].map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{field.label}</label>
              <input
                type={field.type}
                required={field.required}
                placeholder={field.placeholder}
                value={(editForm as Record<string, string>)[field.key]}
                onChange={(e) => setEditForm((p) => ({ ...p, [field.key]: e.target.value }))}
                className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-300 focus:outline-none focus:border-blue-600"
              />
            </div>
          ))}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Canal de Origem</label>
              <select
                value={editForm.source}
                onChange={(e) => setEditForm((p) => ({ ...p, source: e.target.value }))}
                className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 bg-white border border-slate-300 focus:outline-none focus:border-blue-600"
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Estado / Coluna</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 bg-white border border-slate-300 focus:outline-none focus:border-blue-600 font-semibold"
              >
                <option value="NOVA_LEAD">Leads (Nova Oportunidade)</option>
                <option value="VISITA_AGENDADA">Visita (Agendada / Realizada)</option>
                <option value="ORCAMENTO_ENVIADO">Orçamento Enviado</option>
                <option value="CONTRATO_ASSINADO">Fechado / Ganho</option>
                <option value="PERDIDA">Perdida</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Urgência do Negócio</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'Imediatamente', label: 'Imediatamente', color: 'border-red-300 text-red-700 bg-red-50/70', active: 'ring-2 ring-red-500 bg-red-100/90 font-extrabold' },
                { value: 'Curto prazo', label: 'Curto prazo', color: 'border-amber-300 text-amber-700 bg-amber-50/70', active: 'ring-2 ring-amber-500 bg-amber-100/90 font-extrabold' },
                { value: 'Sem pressa', label: 'Sem pressa', color: 'border-slate-300 text-slate-700 bg-slate-50', active: 'ring-2 ring-slate-500 bg-slate-200 font-extrabold' },
              ].map((urg) => (
                <button
                  key={urg.value}
                  type="button"
                  onClick={() => setEditForm((p) => ({ ...p, urgency: urg.value }))}
                  className={cn(
                    'py-2 px-2 text-xs font-semibold rounded-[4px] border transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer',
                    urg.color,
                    editForm.urgency === urg.value && urg.active
                  )}
                >
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full',
                      urg.value === 'Imediatamente' ? 'bg-red-600' : urg.value === 'Curto prazo' ? 'bg-amber-500' : 'bg-slate-400'
                    )}
                  />
                  <span>{urg.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setEditingLead(null)}
              className="flex-1 py-2.5 rounded-[4px] text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-60 transition-all shadow-md shadow-blue-600/20"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>A guardar...</span>
                </>
              ) : (
                'Guardar Alterações'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
