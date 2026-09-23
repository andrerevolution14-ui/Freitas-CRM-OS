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
  Landmark,
  CheckCircle2,
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
  provisionalProfit?: number | null
  andrePaid?: boolean
  jorgePaid?: boolean
  profitShareSettled?: boolean
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
  completedProjectsCount?: number
  completedReceivedRevenue?: number
  completedExpenses?: number
  andreShare?: number
  jorgeShare?: number
  andreSettled?: number
  jorgeSettled?: number
  pendingReceivables: number
  pendingPayables: number
  paidReceivables?: number
  paidExpenses?: number
  paidSubcontractors?: number
  totalCashOut?: number
  bankBalance?: number
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
  { status: 'VISITA_AGENDADA', color: '#8b5cf6' },
  { status: 'ORCAMENTO_ENVIADO', color: '#f59e0b' },
  { status: 'CONTRATO_ASSINADO', color: '#10b981' },
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
      const bankBalance = stats.bankBalance ?? ((stats.paidReceivables ?? 0) - (stats.totalCashOut ?? 0))
      const andreShare = stats.andreShare ?? (stats.totalProfit > 0 ? stats.totalProfit * 0.4 : 0)
      const jorgeShare = stats.jorgeShare ?? (stats.totalProfit > 0 ? stats.totalProfit * 0.6 : 0)
      const andreSettled = stats.andreSettled ?? 0
      const jorgeSettled = stats.jorgeSettled ?? 0
      const completedCount = stats.completedProjectsCount ?? stats.projects.filter(p => p.status === 'CONCLUIDA').length

      return {
        revenue: stats.totalRevenue,
        expenses: stats.totalExpenses,
        profit: stats.totalProfit,
        margin: stats.avgMargin,
        activeProjects: stats.activeProjectCount,
        totalProjects: stats.projectCount,
        completedProjectsCount: completedCount,
        andreShare,
        jorgeShare,
        andreSettled,
        jorgeSettled,
        pendingReceivables: stats.pendingReceivables,
        pendingPayables: stats.pendingPayables,
        paidReceivables: stats.paidReceivables ?? 0,
        paidExpenses: stats.paidExpenses ?? 0,
        paidSubcontractors: stats.paidSubcontractors ?? 0,
        totalCashOut: stats.totalCashOut ?? 0,
        bankBalance: bankBalance,
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

    // Lucro Bruto estritamente de contratos concluídos e recebidos no range
    const fCompletedProjects = fProjects.filter((p) => p.status === 'CONCLUIDA')
    const completedReceived = fCompletedProjects
      .flatMap((p) => p.clientTranches || [])
      .filter((t) => t.status === 'PAGO' || t.paidDate != null)
      .reduce((sum, t) => sum + t.amount, 0)
    const completedExp = fCompletedProjects
      .flatMap((p) => p.expenses || [])
      .reduce((sum, e) => sum + e.amount, 0)
    const profit = completedReceived - completedExp
    const margin = completedReceived > 0 ? (profit / completedReceived) * 100 : 0

    // Partilha 40% André / 60% Jorge
    const andreShare = profit > 0 ? profit * 0.4 : 0
    const jorgeShare = profit > 0 ? profit * 0.6 : 0

    const andreSettled = fCompletedProjects
      .filter((p) => p.andrePaid)
      .reduce((sum, p) => {
        const rec = (p.clientTranches || []).filter((t) => t.status === 'PAGO' || t.paidDate != null).reduce((s, t) => s + t.amount, 0)
        const exp = (p.expenses || []).reduce((s, e) => s + e.amount, 0)
        const pr = rec - exp
        return sum + (pr > 0 ? pr * 0.4 : 0)
      }, 0)
    const jorgeSettled = fCompletedProjects
      .filter((p) => p.jorgePaid)
      .reduce((sum, p) => {
        const rec = (p.clientTranches || []).filter((t) => t.status === 'PAGO' || t.paidDate != null).reduce((s, t) => s + t.amount, 0)
        const exp = (p.expenses || []).reduce((s, e) => s + e.amount, 0)
        const pr = rec - exp
        return sum + (pr > 0 ? pr * 0.6 : 0)
      }, 0)

    // Tranches in range
    const fTranches = (stats.rawTranches || []).filter((t) => new Date(t.dueDate) >= cutoffDate)
    const paidReceivables = fTranches
      .filter((t) => t.status === 'PAGO' || t.paidDate != null)
      .reduce((sum, t) => sum + t.amount, 0)
    const pendingReceivables = fTranches
      .filter((t) => t.status !== 'PAGO')
      .reduce((sum, t) => sum + t.amount, 0)

    // Subcontractor payments in range
    const fSubPayments = (stats.rawSubPayments || []).filter((p) => new Date(p.dueDate) >= cutoffDate)
    const paidSubcontractors = fSubPayments
      .filter((p) => p.status === 'PAGO' || p.paidDate != null)
      .reduce((sum, p) => sum + p.amount, 0)
    const pendingPayables = fSubPayments
      .filter((p) => p.status !== 'PAGO')
      .reduce((sum, p) => sum + p.amount, 0)

    const totalCashOut = totalExpenses + paidSubcontractors
    const bankBalance = paidReceivables - totalCashOut

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
      completedProjectsCount: fCompletedProjects.length,
      andreShare,
      jorgeShare,
      andreSettled,
      jorgeSettled,
      pendingReceivables,
      pendingPayables,
      paidReceivables,
      paidExpenses: totalExpenses,
      paidSubcontractors,
      totalCashOut,
      bankBalance,
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
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
          <span className="text-[11px] font-semibold text-slate-500 px-1.5 hidden lg:flex items-center gap-1 whitespace-nowrap">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Atalhos:
          </span>
          <Link
            href="/obras"
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-[4px] text-[11px] sm:text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-all whitespace-nowrap"
          >
            <HardHat className="w-3 h-3 text-blue-600" />
            <span>Obras ({stats.projectCount})</span>
          </Link>
          <Link
            href="/leads"
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-[4px] text-[11px] sm:text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-all whitespace-nowrap"
          >
            <FolderKanban className="w-3 h-3 text-purple-600" />
            <span>CRM ({leads.length})</span>
          </Link>
          <Link
            href="/subempreiteiros"
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-[4px] text-[11px] sm:text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-all whitespace-nowrap"
          >
            <Users className="w-3 h-3 text-amber-600" />
            <span>Equipa</span>
          </Link>
          <Link
            href="/notas"
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-[4px] text-[11px] sm:text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-all whitespace-nowrap"
          >
            <StickyNote className="w-3 h-3 text-amber-600" />
            <span>Notas</span>
          </Link>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          <Link
            href="/leads"
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-[4px] text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 transition-all whitespace-nowrap shadow-sm"
          >
            <Plus className="w-3 h-3" />
            <span>+ Lead</span>
          </Link>
          <Link
            href="/obras"
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-[4px] text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 transition-all whitespace-nowrap shadow-sm"
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
          className="flex items-center justify-between p-3.5 sm:p-4 rounded-[4px] border border-red-200 bg-red-50 hover:bg-red-100 transition-all group ios-interactive"
        >
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[4px] bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-red-900">
                {filteredData.overdueCount} pagamentos pendentes fora do prazo!
              </p>
              <p className="text-[11px] sm:text-xs text-red-700 mt-0.5">
                Clica aqui para abrir as Obras e regularizar os valores em atraso.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-red-600 group-hover:text-red-800 transition-colors flex-shrink-0 pl-2">
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
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[4px] bg-blue-50 border border-blue-200 flex items-center justify-center">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(filteredData.revenue)}
            </p>
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 mt-1">Faturação Total</p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-xs text-slate-500">
            <span>{filteredData.totalProjects} obras</span>
            <span className="text-blue-600 font-medium">Ver →</span>
          </div>
        </Link>

        {/* Custos Totais */}
        <Link
          href="/obras"
          className="glass-card glass-card-hover p-4 sm:p-5 flex flex-col justify-between group ios-interactive"
        >
          <div>
            <div className="flex items-start justify-between mb-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[4px] bg-amber-50 border border-amber-200 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 transition-colors" />
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(filteredData.expenses)}
            </p>
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 mt-1">Custos Totais</p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-xs text-slate-500">
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
                  'w-9 h-9 sm:w-10 sm:h-10 rounded-[4px] flex items-center justify-center border',
                  filteredData.profit >= 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                )}
              >
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(filteredData.profit)}
            </p>
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 mt-1">Lucro Bruto Real</p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-xs text-slate-500">
            <span>{filteredData.completedProjectsCount} {filteredData.completedProjectsCount === 1 ? 'obra concluída' : 'obras concluídas'}</span>
            <span className={cn('font-semibold', filteredData.profit >= 0 ? 'text-emerald-700' : 'text-red-700')}>
              Só recebido
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
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[4px] bg-purple-50 border border-purple-200 flex items-center justify-center">
                <HardHat className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 transition-colors" />
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
              {filteredData.activeProjects}
            </p>
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 mt-1">Obras em Execução</p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-xs text-slate-500">
            <span>Em estaleiro</span>
            <span className="text-purple-600 font-medium">Ativo →</span>
          </div>
        </Link>
      </div>

      {/* ── CARTÃO: PARTILHA DE RESULTADOS (40% ANDRÉ / 60% JORGE) ── */}
      <div className="rounded-[4px] bg-white border border-slate-200 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-[4px] bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-xs">
                %
              </div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Partilha de Resultados dos Sócios (40% / 60%)
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-[3px] bg-slate-100 text-slate-700 border border-slate-200">
                {filteredData.completedProjectsCount} {filteredData.completedProjectsCount === 1 ? 'Contrato Concluído' : 'Contratos Concluídos'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Calculado estritamente sobre contratos realmente fechados, terminados e valores recebidos ({formatCurrency(filteredData.profit)} de lucro total apurado).
            </p>
          </div>

          <Link
            href="/obras"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 self-start md:self-auto"
          >
            Ver & Assinalar por Obra →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* André Queirós - 40% */}
          <div className="p-4 rounded-[4px] bg-slate-50/70 border border-slate-200 relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    AQ
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">André Queirós</h3>
                    <span className="text-[10.5px] font-bold text-blue-600 uppercase tracking-wider">Quota: 40%</span>
                  </div>
                </div>

                <span
                  className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-[3px] border uppercase tracking-wider',
                    filteredData.andreShare > 0 && filteredData.andreSettled >= filteredData.andreShare
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  )}
                >
                  {filteredData.andreShare > 0 && filteredData.andreSettled >= filteredData.andreShare
                    ? 'Liquidado'
                    : 'Pendente'}
                </span>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200/60 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Valor Correspondente (40%):</span>
                  <span className="font-bold text-slate-900">{formatCurrency(filteredData.andreShare)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Já Assinalado / Liquidado:</span>
                  <span className="font-semibold text-emerald-600">{formatCurrency(filteredData.andreSettled)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200/60 font-medium">
                  <span className="text-slate-700">A Liquidar:</span>
                  <span className={cn('font-bold', filteredData.andreShare - filteredData.andreSettled > 0 ? 'text-amber-600' : 'text-slate-400')}>
                    {formatCurrency(Math.max(0, filteredData.andreShare - filteredData.andreSettled))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Jorge Freitas - 60% */}
          <div className="p-4 rounded-[4px] bg-slate-50/70 border border-slate-200 relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    JF
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Jorge Freitas</h3>
                    <span className="text-[10.5px] font-bold text-purple-600 uppercase tracking-wider">Quota: 60%</span>
                  </div>
                </div>

                <span
                  className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-[3px] border uppercase tracking-wider',
                    filteredData.jorgeShare > 0 && filteredData.jorgeSettled >= filteredData.jorgeShare
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  )}
                >
                  {filteredData.jorgeShare > 0 && filteredData.jorgeSettled >= filteredData.jorgeShare
                    ? 'Liquidado'
                    : 'Pendente'}
                </span>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200/60 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Valor Correspondente (60%):</span>
                  <span className="font-bold text-slate-900">{formatCurrency(filteredData.jorgeShare)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Já Assinalado / Liquidado:</span>
                  <span className="font-semibold text-emerald-600">{formatCurrency(filteredData.jorgeSettled)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200/60 font-medium">
                  <span className="text-slate-700">A Liquidar:</span>
                  <span className={cn('font-bold', filteredData.jorgeShare - filteredData.jorgeSettled > 0 ? 'text-amber-600' : 'text-slate-400')}>
                    {formatCurrency(Math.max(0, filteredData.jorgeShare - filteredData.jorgeSettled))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PROMINENTE E NO TOPO: NOTAS RÁPIDAS + MARGEM GLOBAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* WIDGET DE NOTAS RÁPIDAS */}
        <div className="lg:col-span-2 glass-card p-5 sm:p-6 flex flex-col justify-between border-amber-200 bg-amber-50/20">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[4px] bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
                  <StickyNote className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                    Notas Rápidas do Estaleiro
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[3px] bg-amber-100 text-amber-800 border border-amber-200">
                      Prioridade
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">Apontamentos imediatos, recados e materiais a encomendar</p>
                </div>
              </div>

              <Link
                href="/notas"
                className="text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 transition-colors flex-shrink-0"
              >
                Ver Todas ({notes.length}) <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Quick Note Input Form */}
            <div className="mb-4">
              {!isAddingNote ? (
                <button
                  onClick={() => setIsAddingNote(true)}
                  className="w-full py-2.5 px-3.5 rounded-[4px] text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 flex items-center justify-center gap-2 transition-all ios-interactive shadow-xs"
                >
                  <Plus className="w-4 h-4 text-amber-600" />
                  + Escrever Nova Nota Imediata Aqui
                </button>
              ) : (
                <form
                  onSubmit={handleCreateNote}
                  className="space-y-2 p-3.5 rounded-[4px] bg-white border border-amber-300 shadow-lg animate-fade-in"
                >
                  <input
                    type="text"
                    placeholder="Título da nota (ex: Ligar ao serralheiro, Faltam azulejos...)"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-[4px] text-xs text-slate-900 placeholder-slate-400 bg-white border border-slate-300 focus:outline-none focus:border-amber-600"
                  />
                  <textarea
                    placeholder="Escreve aqui o apontamento..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-[4px] text-xs text-slate-900 placeholder-slate-400 bg-white border border-slate-300 resize-none focus:outline-none focus:border-amber-600"
                    autoFocus
                  />
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingNote(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isPending || !noteContent.trim()}
                      className="px-4 py-1.5 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/20 transition-all disabled:opacity-50"
                    >
                      {isPending ? 'A guardar...' : 'Guardar Nota'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Recent Notes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              {notes.slice(0, 4).map((note) => {
                const author = note.createdBy
                return (
                  <div
                    key={note.id}
                    className="p-3 sm:p-3.5 rounded-[4px] bg-white border border-slate-200 hover:border-amber-400 transition-all flex flex-col justify-between min-w-0 w-full shadow-xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-xs font-bold text-slate-900 truncate min-w-0 flex-1">
                          {note.title || 'Nota sem título'}
                        </p>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-slate-400 hover:text-red-600 p-1 -mr-1 -mt-1 transition-colors flex-shrink-0"
                          title="Eliminar nota"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed break-words line-clamp-3">
                        {note.content}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-500">
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {author && (
                          <UserAvatar
                            name={author.name}
                            color={author.color}
                            image={author.image}
                            size={18}
                          />
                        )}
                        <span className="font-semibold text-slate-700">{author?.name?.split(' ')[0] || 'Autor'}</span>
                        <span className="text-slate-400">· {formatDate(note.createdAt)}</span>
                      </div>
                      {note.project && (
                        <Link
                          href={`/obras/${note.project.id}`}
                          className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 hover:underline truncate max-w-[120px] font-semibold"
                        >
                          🏷️ {note.project.title}
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}

              {notes.length === 0 && (
                <div className="sm:col-span-2 text-center py-6 text-xs text-slate-400">
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
                <span className="text-sm font-semibold text-slate-900">Margem Média Global</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 transition-transform group-hover:translate-x-1" />
            </div>
            <div className="flex items-baseline gap-3">
              <span className={cn('text-5xl font-extrabold tracking-tight', marginColor)}>
                {filteredData.margin.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-500">sobre faturação</span>
            </div>

            <div className="mt-5 h-2 rounded-[2px] bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-[2px] transition-all duration-700 ease-out"
                style={{
                  width: `${Math.min(Math.max(filteredData.margin, 0), 100)}%`,
                  background:
                    filteredData.margin >= 25 ? '#10b981' : filteredData.margin >= 15 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              {filteredData.margin >= 25
                ? '✓ Margem Saudável (>25%)'
                : filteredData.margin >= 15
                ? '⚠ Margem Aceitável'
                : '✗ Atenção aos Custos'}
            </span>
            <span className="text-blue-600 font-medium group-hover:underline">Auditar Obras →</span>
          </div>
        </Link>
      </div>

      {/* ── CARTÃO: CASH FLOW REAL & CONCILIAÇÃO BANCÁRIA ── */}
      <div className="relative overflow-hidden rounded-[4px] bg-white border border-emerald-300 p-3.5 sm:p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-[4px] bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 flex-shrink-0">
              <Landmark className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Saldo Bancário Previsto (Cash Flow Real)
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-700">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Conciliação Bancária
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                Valor exato que deve constar no banco (Entradas Pagas − Saídas Pagas)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
            <span
              className={cn(
                'text-2xl sm:text-3xl font-black tracking-tight',
                filteredData.bankBalance >= 0 ? 'text-slate-900' : 'text-red-600'
              )}
            >
              {formatCurrency(filteredData.bankBalance)}
            </span>
            <Link
              href="/obras"
              prefetch={true}
              className="px-2.5 py-1.5 rounded-[4px] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold transition-all inline-flex items-center gap-1"
            >
              <span>Ver Tranches</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 4 Compact Breakdown Pills */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-3 pt-2.5 border-t border-slate-100 text-[11px]">
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-[4px] bg-slate-50 border border-slate-200">
            <span className="text-slate-500">📥 Entradas Reais:</span>
            <span className="font-bold text-emerald-700">+{formatCurrency(filteredData.paidReceivables)}</span>
          </div>
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-[4px] bg-slate-50 border border-slate-200">
            <span className="text-slate-500">📤 Saídas Reais:</span>
            <span className="font-bold text-amber-700">-{formatCurrency(filteredData.totalCashOut)}</span>
          </div>
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-[4px] bg-slate-50 border border-slate-200">
            <span className="text-slate-500">⏳ Prev. a Entrar:</span>
            <span className="font-bold text-blue-700">+{formatCurrency(filteredData.pendingReceivables)}</span>
          </div>
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-[4px] bg-slate-50 border border-slate-200">
            <span className="text-slate-500">⏳ Prev. a Sair:</span>
            <span className="font-bold text-purple-700">-{formatCurrency(filteredData.pendingPayables)}</span>
          </div>
        </div>
      </div>

      {/* Middle Section: Fluxo de Caixa + Pipeline Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Fluxo de Caixa Pendente */}
        <div className="lg:col-span-2 glass-card p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">Fluxo de Caixa & Tesouraria</h3>
                <p className="text-xs text-slate-500 mt-0.5">Valores pendentes com atalhos diretos</p>
              </div>
              <span className="text-[11px] px-2.5 py-1 rounded-[3px] bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                {TIME_RANGES.find((r) => r.id === timeRange)?.label}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Link
                href="/obras"
                className="p-4 rounded-[4px] bg-emerald-50/70 border border-emerald-200 hover:bg-emerald-100/70 transition-all group ios-interactive flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-emerald-800">A Receber (Clientes)</span>
                    <ChevronRight className="w-4 h-4 text-emerald-600/60 group-hover:text-emerald-800 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-2xl font-extrabold text-emerald-700">
                    {formatCurrency(filteredData.pendingReceivables)}
                  </p>
                </div>
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  Tranches de clientes pendentes →
                </p>
              </Link>

              <Link
                href="/subempreiteiros"
                className="p-4 rounded-[4px] bg-red-50/70 border border-red-200 hover:bg-red-100/70 transition-all group ios-interactive flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-red-800">A Pagar (Subempreiteiros)</span>
                    <ChevronRight className="w-4 h-4 text-red-600/60 group-hover:text-red-800 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-2xl font-extrabold text-red-700">
                    {formatCurrency(filteredData.pendingPayables)}
                  </p>
                </div>
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  Pagamentos a parceiros pendentes →
                </p>
              </Link>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Saldo Líquido Previsto:</span>
            <span
              className={cn(
                'text-base font-bold',
                filteredData.pendingReceivables - filteredData.pendingPayables >= 0
                  ? 'text-emerald-700'
                  : 'text-red-700'
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
                <h3 className="text-sm sm:text-base font-bold text-slate-900">Pipeline de Vendas</h3>
                <p className="text-xs text-slate-500 mt-0.5">Funil comercial</p>
              </div>
              <Link
                href="/leads"
                className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1 transition-colors"
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
                      <span className="text-slate-700 group-hover:text-slate-900 transition-colors flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                        {item.label}
                      </span>
                      <span className="font-bold text-slate-900 px-2 py-0.5 rounded-[3px] bg-slate-100 border border-slate-200 text-[11px]">
                        {item.count}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-[2px] overflow-hidden">
                      <div
                        className="h-full rounded-[2px] transition-all duration-500"
                        style={{ width: `${pct}%`, background: item.color }}
                      />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Total de Leads ativas:</span>
            <span className="font-bold text-slate-900">{filteredData.leads.length} contactos</span>
          </div>
        </div>
      </div>

      {/* Obras em Destaque */}
      <div className="glass-card p-3.5 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs sm:text-base font-bold text-slate-900">Obras em Curso & Recentes</h3>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">Histórico e obras ativas</p>
          </div>
          <Link
            href="/obras"
            className="text-[11px] sm:text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
          >
            Ver Todas ({stats.projectCount}) <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
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
                className="py-2 sm:py-3.5 flex items-center justify-between gap-2.5 group hover:bg-slate-50 px-1.5 sm:px-2 rounded-[4px] transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-[4px] bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0">
                    <HardHat className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                      {project.title}
                    </p>
                    <p className="text-[10px] sm:text-xs text-slate-500 truncate">
                      {project.clientName} · {project.address}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 text-right">
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-900">
                      {formatCurrency(project.contractValue)}
                    </p>
                    <p className={cn('text-[9.5px] sm:text-xs font-semibold', mColor)}>
                      {margin.toFixed(0)}% margem
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-800 transition-all group-hover:translate-x-0.5" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
