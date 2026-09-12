'use client'

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  HardHat,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Calendar,
  ChevronRight,
  FolderKanban,
  Users,
  StickyNote,
  Plus,
  Trash2,
  Clock,
  Sparkles,
} from 'lucide-react'
import { formatCurrency, formatDate, getMarginColor, getMarginBg, cn, getStatusLabel } from '@/lib/utils'
import { createNote, deleteNote } from '@/server/actions/notes'
import { UserAvatar } from '@/components/ui/user-avatar'

type TimeRange = '24H' | '7D' | '1M' | '3M' | '1Y' | 'ALL'

interface ProjectItem {
  id: string
  title: string
  clientName: string
  address: string
  contractValue: number
  totalExpenses: number
  status: string
  startDate: Date | string | null
  endDate: Date | string | null
  createdAt: Date | string
  expenses: { id: string; amount: number; date: Date | string; category: string }[]
  clientTranches: { id: string; amount: number; status: string; dueDate: Date | string; paidDate?: Date | string | null }[]
}

interface RawExpense {
  id: string
  projectId: string
  amount: number
  date: Date | string
  category: string
  description: string
}

interface RawTranche {
  id: string
  projectId: string
  amount: number
  status: string
  dueDate: Date | string
  paidDate?: Date | string | null
}

interface RawSubPayment {
  id: string
  projectId: string
  amount: number
  status: string
  dueDate: Date | string
  paidDate?: Date | string | null
  subcontractorName: string
}

interface Stats {
  totalRevenue: number
  totalExpenses: number
  totalProfit: number
  avgMargin: number
  pendingReceivables: number
  pendingPayables: number
  overdueCount: number
  projectCount: number
  activeProjectCount: number
  projects: ProjectItem[]
  rawExpenses?: RawExpense[]
  rawTranches?: RawTranche[]
  rawSubPayments?: RawSubPayment[]
}

interface Lead {
  id: string
  clientName: string
  status: string
  estimatedValue: number | null
  createdAt: Date | string
}

interface Note {
  id: string
  title: string | null
  content: string
  createdAt: Date | string
  lead?: { id: string; clientName: string } | null
  project?: { id: string; title: string } | null
  createdBy?: { id: string; name: string; color: string; image?: string | null } | null
}

interface Props {
  stats: Stats
  leads: Lead[]
  initialNotes: Note[]
}

const TIME_RANGES: { id: TimeRange; label: string }[] = [
  { id: '24H', label: 'Hoje (24h)' },
  { id: '7D', label: '7 Dias' },
  { id: '1M', label: 'Este Mês' },
  { id: '3M', label: '3 Meses' },
  { id: '1Y', label: 'Este Ano' },
  { id: 'ALL', label: 'Histórico' },
]

const LEAD_STATUS_ORDER = [
  { status: 'NOVA_LEAD', color: '#4f7ef8' },
  { status: 'VISITA_AGENDADA', color: '#a78bfa' },
  { status: 'ORCAMENTO_ENVIADO', color: '#fbbf24' },
  { status: 'CONTRATO_ASSINADO', color: '#34d399' },
  { status: 'PERDIDA', color: '#f87171' },
]

export function DashboardClient({ stats, leads, initialNotes }: Props) {
  const router = useRouter()
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL')
  const [notes, setNotes] = useState<Note[]>(initialNotes || [])
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Compute cutoff date for the selected time range
  const cutoffDate = useMemo(() => {
    if (timeRange === 'ALL') return null
    const now = new Date()
    if (timeRange === '24H') {
      return new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }
    if (timeRange === '7D') {
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }
    if (timeRange === '1M') {
      return new Date(now.getFullYear(), now.getMonth(), 1)
    }
    if (timeRange === '3M') {
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    }
    if (timeRange === '1Y') {
      return new Date(now.getFullYear(), 0, 1)
    }
    return null
  }, [timeRange])

  // Filtered stats based on active time range
  const filteredData = useMemo(() => {
    if (!cutoffDate) {
      return {
        revenue: stats.totalRevenue,
        expenses: stats.totalExpenses,
        profit: stats.totalProfit,
        margin: stats.avgMargin,
        activeProjects: stats.activeProjectCount,
        totalProjects: stats.projectCount,
        pendingReceivables: stats.pendingReceivables,
        pendingPayables: stats.pendingPayables,
        overdueCount: stats.overdueCount,
        projects: stats.projects,
        leads: leads,
      }
    }

    // Filter projects created or active in the range
    const fProjects = stats.projects.filter((p) => {
      const pDate = new Date(p.createdAt || p.startDate || 0)
      return pDate >= cutoffDate
    })

    // Expenses in range
    const fExpenses = (stats.rawExpenses || []).filter((e) => new Date(e.date) >= cutoffDate)
    const totalExpenses = fExpenses.reduce((sum, e) => sum + e.amount, 0)

    // Revenue in range (from projects started/created in range)
    const totalRevenue = fProjects.reduce((sum, p) => sum + p.contractValue, 0)
    const profit = totalRevenue - totalExpenses
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0

    // Tranches in range
    const fTranches = (stats.rawTranches || []).filter((t) => new Date(t.dueDate) >= cutoffDate)
    const pendingReceivables = fTranches
      .filter((t) => t.status !== 'PAGO')
      .reduce((sum, t) => sum + t.amount, 0)

    // Subcontractor payments in range
    const fSubPayments = (stats.rawSubPayments || []).filter((p) => new Date(p.dueDate) >= cutoffDate)
    const pendingPayables = fSubPayments
      .filter((p) => p.status !== 'PAGO')
      .reduce((sum, p) => sum + p.amount, 0)

    const now = new Date()
    const overdueCount =
      fTranches.filter((t) => t.status === 'ATRASADO' || (t.status === 'PENDENTE' && new Date(t.dueDate) < now)).length +
      fSubPayments.filter((p) => p.status === 'ATRASADO' || (p.status === 'PENDENTE' && new Date(p.dueDate) < now)).length

    const fLeads = leads.filter((l) => new Date(l.createdAt) >= cutoffDate)

    return {
      revenue: totalRevenue,
      expenses: totalExpenses,
      profit: profit,
      margin: margin,
      activeProjects: fProjects.filter((p) => p.status === 'EM_EXECUCAO').length,
      totalProjects: fProjects.length,
      pendingReceivables,
      pendingPayables,
      overdueCount,
      projects: fProjects.length > 0 ? fProjects : stats.projects.slice(0, 5),
      leads: fLeads,
    }
  }, [cutoffDate, stats, leads])

  const marginColor = getMarginColor(filteredData.margin)
  const marginBg = getMarginBg(filteredData.margin)

  // Leads breakdown
  const leadsByStatus = useMemo(() => {
    return LEAD_STATUS_ORDER.map(({ status, color }) => ({
      status,
      label: getStatusLabel(status),
      color,
      count: filteredData.leads.filter((l) => l.status === status).length,
    }))
  }, [filteredData.leads])

  // Quick note creation directly from dashboard
  async function handleCreateNote(e: React.FormEvent) {
    e.preventDefault()
    if (!noteContent.trim()) return
    startTransition(async () => {
      const created = await createNote({
        title: noteTitle.trim() || undefined,
        content: noteContent.trim(),
      })
      setNotes((prev) => [created as any, ...prev])
      setNoteTitle('')
      setNoteContent('')
      setIsAddingNote(false)
    })
  }

  async function handleDeleteNote(id: string) {
    startTransition(async () => {
      await deleteNote(id)
      setNotes((prev) => prev.filter((n) => n.id !== id))
    })
  }

  return (
    <div className="space-y-5 sm:space-y-7 animate-fade-in max-w-[1400px] mx-auto pb-10">
      {/* iOS Top Bar: Title + Segmented Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Freitas OS · Gestão de Obras
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">
            Dashboard
          </h1>
        </div>

        {/* Time Filter - Centered and compact */}
        <div className="w-full sm:w-auto overflow-x-auto pb-1 flex justify-start sm:justify-end">
          <div className="ios-segmented">
            {TIME_RANGES.map((range) => (
              <button
                key={range.id}
                onClick={() => setTimeRange(range.id)}
                className={cn(
                  'ios-segment-btn text-[11px] sm:text-xs py-1 sm:py-1.5 px-2.5 sm:px-3',
                  timeRange === range.id && 'ios-segment-btn-active'
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Hub / Shortcuts Bar - Compact on mobile */}
      <div className="glass-card p-2 sm:p-2.5 flex items-center justify-between gap-2 overflow-x-auto w-full">
        <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap">
          <span className="text-[11px] font-semibold text-slate-400 px-1.5 hidden lg:flex items-center gap-1 whitespace-nowrap">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            Atalhos:
          </span>
          <Link
            href="/obras"
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-medium text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 transition-all whitespace-nowrap"
          >
            <HardHat className="w-3 h-3 text-blue-400" />
            <span>Obras ({stats.projectCount})</span>
          </Link>
          <Link
            href="/leads"
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-medium text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 transition-all whitespace-nowrap"
          >
            <FolderKanban className="w-3 h-3 text-purple-400" />
            <span>CRM ({leads.length})</span>
          </Link>
          <Link
            href="/subempreiteiros"
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-medium text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 transition-all whitespace-nowrap"
          >
            <Users className="w-3 h-3 text-yellow-400" />
            <span>Equipa</span>
          </Link>
          <Link
            href="/notas"
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-medium text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 transition-all whitespace-nowrap"
          >
            <StickyNote className="w-3 h-3 text-amber-400" />
            <span>Notas</span>
          </Link>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          <Link
            href="/leads"
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all whitespace-nowrap"
          >
            <Plus className="w-3 h-3" />
            <span>+ Lead</span>
          </Link>
          <Link
            href="/obras"
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 transition-all whitespace-nowrap"
          >
            <Plus className="w-3 h-3" />
            <span>+ Obra</span>
          </Link>
        </div>
      </div>

      {/* Overdue alert with direct hyperlink */}
      {filteredData.overdueCount > 0 && (
        <Link
          href="/obras"
          className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/15 transition-all group ios-interactive"
        >
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-white">
                {filteredData.overdueCount} pagamentos pendentes fora do prazo!
              </p>
              <p className="text-[11px] sm:text-xs text-red-300/80 mt-0.5">
                Clica aqui para abrir as Obras e regularizar os valores em atraso.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-red-300 group-hover:text-white transition-colors flex-shrink-0 pl-2">
            <span className="hidden sm:inline">Resolver</span>
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      )}

      {/* KPI Cards Grid - 2 cols on mobile for immediate overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Faturação Total */}
        <Link
          href="/obras"
          className="glass-card glass-card-hover p-4 sm:p-5 flex flex-col justify-between group ios-interactive"
        >
          <div>
            <div className="flex items-start justify-between mb-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 transition-colors" />
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">
              {formatCurrency(filteredData.revenue)}
            </p>
            <p className="text-[11px] sm:text-xs font-medium text-slate-400 mt-1">Faturação Total</p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] sm:text-xs text-slate-500">
            <span>{filteredData.totalProjects} obras</span>
            <span className="text-blue-400 font-medium">Ver →</span>
          </div>
        </Link>

        {/* Custos Totais */}
        <Link
          href="/obras"
          className="glass-card glass-card-hover p-4 sm:p-5 flex flex-col justify-between group ios-interactive"
        >
          <div>
            <div className="flex items-start justify-between mb-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">
              {formatCurrency(filteredData.expenses)}
            </p>
            <p className="text-[11px] sm:text-xs font-medium text-slate-400 mt-1">Custos Totais</p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] sm:text-xs text-slate-500">
            <span>Mat. + Sub.</span>
            <span className="text-amber-400 font-medium">Ver →</span>
          </div>
        </Link>

        {/* Lucro Bruto */}
        <Link
          href="/obras"
          className="glass-card glass-card-hover p-4 sm:p-5 flex flex-col justify-between group ios-interactive"
        >
          <div>
            <div className="flex items-start justify-between mb-2">
              <div
                className={cn(
                  'w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center border',
                  filteredData.profit >= 0
                    ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400'
                    : 'bg-red-500/15 border-red-500/25 text-red-400'
                )}
              >
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">
              {formatCurrency(filteredData.profit)}
            </p>
            <p className="text-[11px] sm:text-xs font-medium text-slate-400 mt-1">Lucro Bruto</p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] sm:text-xs text-slate-500">
            <span>Rentabilidade</span>
            <span className={cn('font-semibold', filteredData.profit >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {filteredData.profit >= 0 ? '+ Lucro' : '- Défice'}
            </span>
          </div>
        </Link>

        {/* Obras Ativas */}
        <Link
          href="/obras"
          className="glass-card glass-card-hover p-4 sm:p-5 flex flex-col justify-between group ios-interactive"
        >
          <div>
            <div className="flex items-start justify-between mb-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center">
                <HardHat className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 transition-colors" />
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">
              {filteredData.activeProjects}
            </p>
            <p className="text-[11px] sm:text-xs font-medium text-slate-400 mt-1">Obras em Execução</p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] sm:text-xs text-slate-500">
            <span>Em estaleiro</span>
            <span className="text-purple-400 font-medium">Ativo →</span>
          </div>
        </Link>
      </div>

      {/* PROMINENTE E NO TOPO: NOTAS RÁPIDAS + MARGEM GLOBAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* WIDGET DE NOTAS RÁPIDAS (COLOCADO NO TOPO DO DASHBOARD COMO SOLICITADO) */}
        <div className="lg:col-span-2 glass-card p-5 sm:p-6 flex flex-col justify-between border-amber-500/20 bg-amber-500/[0.02]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
                  <StickyNote className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    Notas Rápidas do Estaleiro
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25">
                      Prioridade
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Apontamentos imediatos, recados e materiais a encomendar</p>
                </div>
              </div>

              <Link
                href="/notas"
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors flex-shrink-0"
              >
                Ver Todas ({notes.length}) <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Quick Note Input Form */}
            <div className="mb-4">
              {!isAddingNote ? (
                <button
                  onClick={() => setIsAddingNote(true)}
                  className="w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-2 transition-all ios-interactive"
                >
                  <Plus className="w-4 h-4 text-amber-400" />
                  + Escrever Nova Nota Imediata Aqui
                </button>
              ) : (
                <form
                  onSubmit={handleCreateNote}
                  className="space-y-2 p-3.5 rounded-2xl bg-[#121624] border border-amber-500/40 shadow-2xl animate-fade-in"
                >
                  <input
                    type="text"
                    placeholder="Título da nota (ex: Ligar ao serralheiro, Faltam azulejos...)"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs text-white placeholder-slate-500 bg-[#191e30] border border-white/10 focus:outline-none focus:border-amber-500"
                  />
                  <textarea
                    placeholder="Escreve aqui o apontamento..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl text-xs text-white placeholder-slate-500 bg-[#191e30] border border-white/10 resize-none focus:outline-none focus:border-amber-500"
                    autoFocus
                  />
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingNote(false)}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isPending || !noteContent.trim()}
                      className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 shadow-md shadow-amber-600/20 transition-all disabled:opacity-50"
                    >
                      {isPending ? 'A guardar...' : 'Guardar Nota'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Recent Notes Grid (Responsive: 1 col on mobile, 2 cols on tablet/desktop) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              {notes.slice(0, 4).map((note) => {
                const author = note.createdBy
                return (
                  <div
                    key={note.id}
                    className="p-3 sm:p-3.5 rounded-xl bg-[#121624] border border-white/[0.08] hover:border-amber-500/30 transition-all flex flex-col justify-between min-w-0 w-full"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-xs font-bold text-white truncate min-w-0 flex-1">
                          {note.title || 'Nota sem título'}
                        </p>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-slate-500 hover:text-red-400 p-1 -mr-1 -mt-1 transition-colors flex-shrink-0"
                          title="Eliminar nota"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed break-words line-clamp-3">
                        {note.content}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-400">
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {author && (
                          <UserAvatar
                            name={author.name}
                            color={author.color}
                            image={author.image}
                            size={18}
                          />
                        )}
                        <span className="font-medium text-slate-300">{author?.name?.split(' ')[0] || 'Autor'}</span>
                        <span className="text-slate-500">· {formatDate(note.createdAt)}</span>
                      </div>
                      {note.project && (
                        <Link
                          href={`/obras/${note.project.id}`}
                          className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 hover:text-blue-300 truncate max-w-[120px] font-medium"
                        >
                          🏷️ {note.project.title}
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}

              {notes.length === 0 && (
                <div className="sm:col-span-2 text-center py-6 text-xs text-slate-500">
                  Nenhuma nota registada ainda. Escreve a primeira no botão em cima!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Margem Média Global */}
        <Link
          href="/obras"
          className={cn('glass-card p-5 sm:p-6 flex flex-col justify-between group ios-interactive', marginBg)}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className={cn('w-5 h-5', marginColor)} />
                <span className="text-sm font-semibold text-white">Margem Média Global</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-transform group-hover:translate-x-1" />
            </div>
            <div className="flex items-baseline gap-3">
              <span className={cn('text-5xl font-extrabold tracking-tight', marginColor)}>
                {filteredData.margin.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-400">sobre faturação</span>
            </div>

            <div className="mt-5 h-2.5 rounded-full bg-white/10 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.min(Math.max(filteredData.margin, 0), 100)}%`,
                  background:
                    filteredData.margin >= 25 ? '#34d399' : filteredData.margin >= 15 ? '#fbbf24' : '#f87171',
                }}
              />
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
            <span>
              {filteredData.margin >= 25
                ? '✓ Margem Saudável (>25%)'
                : filteredData.margin >= 15
                ? '⚠ Margem Aceitável'
                : '✗ Atenção aos Custos'}
            </span>
            <span className="text-blue-400 font-medium group-hover:underline">Auditar Obras →</span>
          </div>
        </Link>
      </div>

      {/* Middle Section: Fluxo de Caixa + Pipeline Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Fluxo de Caixa Pendente (A Receber & A Pagar com Links Diretos) */}
        <div className="lg:col-span-2 glass-card p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">Fluxo de Caixa & Tesouraria</h3>
                <p className="text-xs text-slate-400 mt-0.5">Valores pendentes com atalhos diretos</p>
              </div>
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 text-slate-300 font-medium border border-white/10">
                {TIME_RANGES.find((r) => r.id === timeRange)?.label}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* A Receber -> Clica e vai para Obras */}
              <Link
                href="/obras"
                className="p-4 rounded-2xl bg-emerald-500/[0.07] border border-emerald-500/20 hover:bg-emerald-500/[0.12] transition-all group ios-interactive flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-emerald-300">A Receber (Clientes)</span>
                    <ChevronRight className="w-4 h-4 text-emerald-400/60 group-hover:text-emerald-300 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-2xl font-extrabold text-emerald-400">
                    {formatCurrency(filteredData.pendingReceivables)}
                  </p>
                </div>
                <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                  Tranches de clientes pendentes →
                </p>
              </Link>

              {/* A Pagar -> Clica e vai para Subempreiteiros */}
              <Link
                href="/subempreiteiros"
                className="p-4 rounded-2xl bg-red-500/[0.07] border border-red-500/20 hover:bg-red-500/[0.12] transition-all group ios-interactive flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-red-300">A Pagar (Subempreiteiros)</span>
                    <ChevronRight className="w-4 h-4 text-red-400/60 group-hover:text-red-300 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-2xl font-extrabold text-red-400">
                    {formatCurrency(filteredData.pendingPayables)}
                  </p>
                </div>
                <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                  Pagamentos a parceiros pendentes →
                </p>
              </Link>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <span className="text-slate-400">Saldo Líquido Previsto:</span>
            <span
              className={cn(
                'text-base font-bold',
                filteredData.pendingReceivables - filteredData.pendingPayables >= 0
                  ? 'text-emerald-400'
                  : 'text-red-400'
              )}
            >
              {formatCurrency(filteredData.pendingReceivables - filteredData.pendingPayables)}
            </span>
          </div>
        </div>

        {/* Lead Funnel with direct link to /leads */}
        <div className="glass-card p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">Pipeline de Vendas</h3>
                <p className="text-xs text-slate-400 mt-0.5">Funil comercial</p>
              </div>
              <Link
                href="/leads"
                className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
              >
                Abrir CRM <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3 mt-1">
              {leadsByStatus.map((item) => {
                const maxCount = Math.max(...leadsByStatus.map((l) => l.count), 1)
                const pct = (item.count / maxCount) * 100
                return (
                  <Link key={item.status} href="/leads" className="block group ios-interactive">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-300 group-hover:text-white transition-colors flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                        {item.label}
                      </span>
                      <span className="font-bold text-white px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px]">
                        {item.count}
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: item.color }}
                      />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <span className="text-slate-400">Total de Leads ativas:</span>
            <span className="font-bold text-white">{filteredData.leads.length} contactos</span>
          </div>
        </div>
      </div>

      {/* Obras em Destaque (com Hiperligação Direta para cada Obra) */}
      <div className="glass-card p-3.5 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs sm:text-base font-bold text-white">Obras em Curso & Recentes</h3>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">Histórico e obras ativas</p>
          </div>
          <Link
            href="/obras"
            className="text-[11px] sm:text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            Ver Todas ({stats.projectCount}) <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-white/[0.06]">
          {filteredData.projects.slice(0, 5).map((project) => {
            const margin =
              project.contractValue > 0
                ? ((project.contractValue - project.totalExpenses) / project.contractValue) * 100
                : 0
            const mColor = getMarginColor(margin)

            return (
              <Link
                key={project.id}
                href={`/obras/${project.id}`}
                className="py-2 sm:py-3.5 flex items-center justify-between gap-2.5 group hover:bg-white/[0.02] px-1.5 sm:px-2 rounded-xl transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <HardHat className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                      {project.title}
                    </p>
                    <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                      {project.clientName} · {project.address}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 text-right">
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-white">
                      {formatCurrency(project.contractValue)}
                    </p>
                    <p className={cn('text-[9.5px] sm:text-xs font-semibold', mColor)}>
                      {margin.toFixed(0)}% margem
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-white transition-all group-hover:translate-x-0.5" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
