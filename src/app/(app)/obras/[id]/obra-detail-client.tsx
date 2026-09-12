'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, TrendingUp, TrendingDown, Wallet, FileText, StickyNote,
  Plus, Trash2, X, Loader2, Check, Clock, AlertTriangle, Upload,
  MapPin, Calendar, User, Receipt, Star, Euro
} from 'lucide-react'
import {
  createExpense, deleteExpense, createClientTranche, updateTrancheStatus,
  deleteClientTranche, createDocument, deleteDocument, updateProject
} from '@/server/actions/projects'
import { createSubcontractorPayment, updateSubPaymentStatus } from '@/server/actions/subcontractors'
import { createNote, deleteNote } from '@/server/actions/notes'
import { formatCurrency, formatDate, getStatusLabel, getMarginColor, getMarginBg, calcMargin, cn } from '@/lib/utils'
import type { ExpenseCategory, PaymentStatus, ProjectStatus } from '@prisma/client'

const TABS = [
  { id: 'overview', label: 'Visão Geral', icon: Wallet },
  { id: 'financeiro', label: 'Financeiro', icon: TrendingUp },
  { id: 'despesas', label: 'Despesas', icon: Receipt },
  { id: 'tranches', label: 'Tranches', icon: Clock },
  { id: 'documentos', label: 'Documentos', icon: FileText },
  { id: 'notas', label: 'Notas', icon: StickyNote },
]

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'MATERIAL', label: 'Material' },
  { value: 'MAO_DE_OBRA', label: 'Mão de Obra' },
  { value: 'SUBEMPREITEIRO', label: 'Subempreiteiro' },
  { value: 'LICENCAS_E_TAXAS', label: 'Licenças e Taxas' },
  { value: 'GERAL_OVERHEAD', label: 'Geral / Overhead' },
]

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'EM_PLANEAMENTO', label: 'Em Planeamento' },
  { value: 'EM_EXECUCAO', label: 'Em Execução' },
  { value: 'PAUSADA', label: 'Pausada' },
  { value: 'CONCLUIDA', label: 'Concluída' },
]

const PAYMENT_BADGE = (status: PaymentStatus | string) => {
  if (status === 'PAGO') return 'badge-green'
  if (status === 'ATRASADO') return 'badge-red'
  return 'badge-yellow'
}

type Project = Awaited<ReturnType<typeof import('@/server/actions/projects').getProject>>
type Subcontractor = { id: string; name: string; specialty: string }

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

export function ObraDetailClient({ project: initialProject, subcontractors }: { project: NonNullable<Project>; subcontractors: Subcontractor[] }) {
  const [project, setProject] = useState(initialProject)
  const [activeTab, setActiveTab] = useState('overview')
  const [isPending, startTransition] = useTransition()

  // Computed financials
  const totalExpenses = project.expenses.reduce((s, e) => s + e.amount, 0)
  const profit = project.contractValue - totalExpenses
  const margin = calcMargin(project.contractValue, totalExpenses)
  const marginColor = getMarginColor(margin)
  const marginBg = getMarginBg(margin)
  const received = project.clientTranches.filter(t => t.status === 'PAGO').reduce((s, t) => s + t.amount, 0)
  const subPaid = project.subPayments.filter(p => p.status === 'PAGO').reduce((s, p) => s + p.amount, 0)

  // Forms
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', category: 'MATERIAL' as ExpenseCategory, date: '' })
  const [trancheForm, setTrancheForm] = useState({ description: '', percentage: '', amount: '', dueDate: '' })
  const [subPayForm, setSubPayForm] = useState({ subcontractorId: '', phaseDescription: '', amount: '', dueDate: '' })
  const [noteForm, setNoteForm] = useState({ title: '', content: '' })
  const [docForm, setDocForm] = useState({ title: '' })
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [showTrancheForm, setShowTrancheForm] = useState(false)
  const [showSubPayForm, setShowSubPayForm] = useState(false)
  const [showNoteForm, setShowNoteForm] = useState(false)

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const expense = await createExpense({
        projectId: project.id,
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount),
        category: expenseForm.category,
        date: expenseForm.date ? new Date(expenseForm.date) : undefined,
      })
      setProject(p => ({ ...p, expenses: [expense, ...p.expenses] }))
      setExpenseForm({ description: '', amount: '', category: 'MATERIAL', date: '' })
      setShowExpenseForm(false)
    })
  }

  async function handleDeleteExpense(id: string) {
    startTransition(async () => {
      await deleteExpense(id, project.id)
      setProject(p => ({ ...p, expenses: p.expenses.filter(e => e.id !== id) }))
    })
  }

  async function handleAddTranche(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const t = await createClientTranche({
        projectId: project.id,
        description: trancheForm.description,
        percentage: parseFloat(trancheForm.percentage),
        amount: parseFloat(trancheForm.amount),
        dueDate: new Date(trancheForm.dueDate),
      })
      setProject(p => ({ ...p, clientTranches: [...p.clientTranches, t] }))
      setTrancheForm({ description: '', percentage: '', amount: '', dueDate: '' })
      setShowTrancheForm(false)
    })
  }

  async function handleTrancheStatus(id: string, status: PaymentStatus) {
    startTransition(async () => {
      const t = await updateTrancheStatus(id, status, project.id)
      setProject(p => ({ ...p, clientTranches: p.clientTranches.map(x => x.id === id ? { ...x, ...t } : x) }))
    })
  }

  async function handleDeleteTranche(id: string) {
    startTransition(async () => {
      await deleteClientTranche(id, project.id)
      setProject(p => ({ ...p, clientTranches: p.clientTranches.filter(t => t.id !== id) }))
    })
  }

  async function handleAddSubPay(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const p2 = await createSubcontractorPayment({
        projectId: project.id,
        subcontractorId: subPayForm.subcontractorId,
        phaseDescription: subPayForm.phaseDescription,
        amount: parseFloat(subPayForm.amount),
        dueDate: new Date(subPayForm.dueDate),
      })
      const sub = subcontractors.find(s => s.id === subPayForm.subcontractorId)
      setProject(p => ({ ...p, subPayments: [...p.subPayments, { ...p2, subcontractor: sub as any }] }))
      setSubPayForm({ subcontractorId: '', phaseDescription: '', amount: '', dueDate: '' })
      setShowSubPayForm(false)
    })
  }

  async function handleSubPayStatus(id: string, status: PaymentStatus) {
    startTransition(async () => {
      await updateSubPaymentStatus(id, status, project.id)
      setProject(p => ({ ...p, subPayments: p.subPayments.map(x => x.id === id ? { ...x, status } : x) }))
    })
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const note = await createNote({ title: noteForm.title || undefined, content: noteForm.content, projectId: project.id })
      setProject(p => ({ ...p, notes: [note, ...p.notes] }))
      setNoteForm({ title: '', content: '' })
      setShowNoteForm(false)
    })
  }

  async function handleDeleteNote(id: string) {
    startTransition(async () => {
      await deleteNote(id)
      setProject(p => ({ ...p, notes: p.notes.filter(n => n.id !== id) }))
    })
  }

  async function handleStatusChange(status: ProjectStatus) {
    startTransition(async () => {
      await updateProject(project.id, { status })
      setProject(p => ({ ...p, status }))
    })
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !docForm.title) return
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', docForm.title)
    formData.append('projectId', project.id)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.document) {
        setProject(p => ({ ...p, documents: [data.document, ...p.documents] }))
        setDocForm({ title: '' })
      }
    } catch {}
  }

  async function handleDeleteDoc(id: string) {
    startTransition(async () => {
      await deleteDocument(id, project.id)
      setProject(p => ({ ...p, documents: p.documents.filter(d => d.id !== id) }))
    })
  }

  const expensesByCategory = EXPENSE_CATEGORIES.map(cat => ({
    ...cat,
    total: project.expenses.filter(e => e.category === cat.value).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.total > 0)

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Link href="/obras" className="text-slate-400 hover:text-white transition-colors mt-1">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white leading-snug">{project.title}</h1>
            <p className="text-sm text-slate-400 mt-0.5">{project.clientName}</p>
          </div>
        </div>
        <select value={project.status} onChange={e => handleStatusChange(e.target.value as ProjectStatus)}
          className="px-3 py-1.5 rounded-lg text-sm text-white focus:outline-none"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Financial KPIs row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Valor do Contrato', value: formatCurrency(project.contractValue), color: 'text-blue-400', icon: Wallet },
          { label: 'Custos Totais', value: formatCurrency(totalExpenses), color: 'text-red-400', icon: TrendingDown },
          { label: 'Lucro Bruto', value: formatCurrency(profit), color: profit >= 0 ? 'text-emerald-400' : 'text-red-400', icon: TrendingUp },
          { label: `Margem (${margin.toFixed(1)}%)`, value: margin.toFixed(1) + '%', color: marginColor, icon: TrendingUp },
        ].map(kpi => (
          <div key={kpi.label} className="glass-card p-4">
            <p className="text-xs text-slate-500 mb-1">{kpi.label}</p>
            <p className={cn('text-lg font-bold', kpi.color)}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn('flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap rounded-t-lg',
                activeTab === tab.id ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5')}>
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab: Visão Geral */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Section title="Informação do Projeto">
            <div className="space-y-3">
              {[
                { icon: User, label: 'Cliente', value: project.clientName },
                { icon: User, label: 'NIF', value: project.clientNIF || '—' },
                { icon: MapPin, label: 'Morada', value: project.address },
                { icon: Calendar, label: 'Início', value: formatDate(project.startDate) },
                { icon: Calendar, label: 'Conclusão', value: formatDate(project.endDate) },
                { icon: Euro, label: 'Contrato', value: formatCurrency(project.contractValue) },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-3 text-sm">
                  <row.icon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span className="text-slate-400 w-20 flex-shrink-0">{row.label}</span>
                  <span className="text-slate-200">{row.value}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Resumo Financeiro">
            <div className={cn('p-4 rounded-xl mb-4', marginBg)}>
              <p className="text-xs text-slate-400 mb-1">Margem Atual</p>
              <p className={cn('text-3xl font-bold', marginColor)}>{margin.toFixed(1)}%</p>
              <div className="h-2 bg-white/10 rounded-full mt-2 overflow-hidden">
                <div className="h-full rounded-full" style={{
                  width: `${Math.min(margin, 100)}%`,
                  background: margin >= 25 ? '#34d399' : margin >= 15 ? '#fbbf24' : '#f87171',
                }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Recebido do cliente</span>
                <span className="text-emerald-400 font-medium">{formatCurrency(received)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Pago a subempreit.</span>
                <span className="text-red-400 font-medium">{formatCurrency(subPaid)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-slate-400">Saldo operacional</span>
                <span className={cn('font-semibold', (received - subPaid) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {formatCurrency(received - subPaid)}
                </span>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* Tab: Financeiro */}
      {activeTab === 'financeiro' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card p-5 text-center">
              <p className="text-xs text-slate-500 mb-2">Valor do Contrato</p>
              <p className="text-2xl font-bold text-blue-400">{formatCurrency(project.contractValue)}</p>
            </div>
            <div className="glass-card p-5 text-center">
              <p className="text-xs text-slate-500 mb-2">Custos Totais</p>
              <p className="text-2xl font-bold text-red-400">{formatCurrency(totalExpenses)}</p>
            </div>
            <div className={cn('glass-card p-5 text-center', marginBg)}>
              <p className="text-xs text-slate-500 mb-2">Lucro Bruto</p>
              <p className={cn('text-2xl font-bold', marginColor)}>{formatCurrency(profit)}</p>
              <p className={cn('text-sm mt-1', marginColor)}>{margin.toFixed(1)}% margem</p>
            </div>
          </div>

          {/* Expense breakdown by category */}
          <Section title="Custos por Categoria">
            {expensesByCategory.length === 0 ? (
              <p className="text-sm text-slate-500">Sem despesas registadas</p>
            ) : (
              <div className="space-y-3">
                {expensesByCategory.map(cat => {
                  const pct = totalExpenses > 0 ? (cat.total / totalExpenses) * 100 : 0
                  return (
                    <div key={cat.value}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-300">{cat.label}</span>
                        <span className="text-white font-medium">{formatCurrency(cat.total)} <span className="text-slate-500 text-xs">({pct.toFixed(0)}%)</span></span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Section>

          {/* Sub payments summary */}
          <Section title="Pagamentos a Subempreiteiros" action={
            <button onClick={() => setShowSubPayForm(true)}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </button>
          }>
            {showSubPayForm && (
              <form onSubmit={handleAddSubPay} className="p-4 sm:p-5 rounded-2xl mb-4 space-y-3 bg-[#121624] border border-blue-500/30 shadow-2xl animate-fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1">Subempreiteiro *</label>
                    <select required value={subPayForm.subcontractorId} onChange={e => setSubPayForm(p => ({ ...p, subcontractorId: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm text-white bg-[#191e30] border border-white/15 focus:outline-none">
                      <option value="">Selecionar...</option>
                      {subcontractors.map(s => <option key={s.id} value={s.id} className="bg-[#121624]">{s.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1">Fase / Descrição *</label>
                    <input required value={subPayForm.phaseDescription} onChange={e => setSubPayForm(p => ({ ...p, phaseDescription: e.target.value }))}
                      placeholder="Ex: Canalização WC 1 e WC 2"
                      className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 bg-[#191e30] border border-white/15 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Valor (€) *</label>
                    <input required type="number" value={subPayForm.amount} onChange={e => setSubPayForm(p => ({ ...p, amount: e.target.value }))}
                      placeholder="2500"
                      className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 bg-[#191e30] border border-white/15 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Data de Vencimento *</label>
                    <input required type="date" value={subPayForm.dueDate} onChange={e => setSubPayForm(p => ({ ...p, dueDate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm text-white bg-[#191e30] border border-white/15 focus:outline-none" />
                  </div>
                </div>
                <div className="flex gap-2.5 pt-1">
                  <button type="button" onClick={() => setShowSubPayForm(false)} className="flex-1 py-2 rounded-xl text-xs text-slate-400 hover:text-white border border-white/15">Cancelar</button>
                  <button type="submit" disabled={isPending} className="flex-1 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/20">
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Guardar'}
                  </button>
                </div>
              </form>
            )}
            {project.subPayments.length === 0 ? (
              <p className="text-sm text-slate-500">Sem pagamentos a subempreiteiros.</p>
            ) : (
              <div className="space-y-2">
                {project.subPayments.map(pay => (
                  <div key={pay.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{pay.subcontractor.name}</p>
                      <p className="text-xs text-slate-400 truncate">{pay.phaseDescription}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Venc.: {formatDate(pay.dueDate)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-white">{formatCurrency(pay.amount)}</p>
                      <select value={pay.status} onChange={e => handleSubPayStatus(pay.id, e.target.value as PaymentStatus)}
                        className={cn('text-xs px-2 py-0.5 rounded-full mt-1 font-medium focus:outline-none cursor-pointer', PAYMENT_BADGE(pay.status))}
                        style={{ background: 'transparent' }}>
                        <option value="PENDENTE">Pendente</option>
                        <option value="PAGO">Pago</option>
                        <option value="ATRASADO">Atrasado</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}

      {/* Tab: Despesas */}
      {activeTab === 'despesas' && (
        <Section title={`Despesas (${project.expenses.length})`} action={
          <button onClick={() => setShowExpenseForm(true)}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
        }>
          {showExpenseForm && (
            <form onSubmit={handleAddExpense} className="p-4 sm:p-5 rounded-2xl mb-4 space-y-3 bg-[#121624] border border-blue-500/30 shadow-2xl animate-fade-in">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">Descrição *</label>
                  <input required value={expenseForm.description} onChange={e => setExpenseForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Ex: Azulejos 60x60 brancos"
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 bg-[#191e30] border border-white/15 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Valor (€) *</label>
                  <input required type="number" value={expenseForm.amount} onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="500"
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 bg-[#191e30] border border-white/15 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Data</label>
                  <input type="date" value={expenseForm.date} onChange={e => setExpenseForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm text-white bg-[#191e30] border border-white/15 focus:outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">Categoria</label>
                  <select value={expenseForm.category} onChange={e => setExpenseForm(p => ({ ...p, category: e.target.value as ExpenseCategory }))}
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm text-white bg-[#191e30] border border-white/15 focus:outline-none">
                    {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value} className="bg-[#121624]">{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2.5 pt-1">
                <button type="button" onClick={() => setShowExpenseForm(false)} className="flex-1 py-2 rounded-xl text-xs text-slate-400 hover:text-white border border-white/15">Cancelar</button>
                <button type="submit" disabled={isPending} className="flex-1 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/20">
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Guardar'}
                </button>
              </div>
            </form>
          )}
          {project.expenses.length === 0 ? (
            <p className="text-sm text-slate-500">Sem despesas registadas</p>
          ) : (
            <div className="overflow-hidden rounded-lg" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Descrição', 'Categoria', 'Data', 'Valor', ''].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {project.expenses.map(exp => (
                    <tr key={exp.id} className="table-row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-4 py-3 text-sm text-white">{exp.description}</td>
                      <td className="px-4 py-3"><span className="badge-blue text-xs px-2 py-0.5 rounded-full">{getStatusLabel(exp.category)}</span></td>
                      <td className="px-4 py-3 text-xs text-slate-400">{formatDate(exp.date)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-red-400">{formatCurrency(exp.amount)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDeleteExpense(exp.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-white">Total</td>
                    <td className="px-4 py-3 text-sm font-bold text-red-400">{formatCurrency(totalExpenses)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {/* Tab: Tranches */}
      {activeTab === 'tranches' && (
        <div className="space-y-4">
          <Section title="Tranches do Cliente" action={
            <button onClick={() => setShowTrancheForm(true)}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </button>
          }>
            {showTrancheForm && (
              <form onSubmit={handleAddTranche} className="p-4 sm:p-5 rounded-2xl mb-4 space-y-3 bg-[#121624] border border-emerald-500/30 shadow-2xl animate-fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1">Descrição *</label>
                    <input required value={trancheForm.description} onChange={e => setTrancheForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Ex: 1ª Tranche — Adjudicação (30%)"
                      className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 bg-[#191e30] border border-white/15 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Percentagem (%)</label>
                    <input type="number" value={trancheForm.percentage} onChange={e => setTrancheForm(p => ({ ...p, percentage: e.target.value }))}
                      placeholder="30"
                      className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 bg-[#191e30] border border-white/15 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Valor (€) *</label>
                    <input required type="number" value={trancheForm.amount} onChange={e => setTrancheForm(p => ({ ...p, amount: e.target.value }))}
                      placeholder="15000"
                      className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 bg-[#191e30] border border-white/15 focus:outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1">Data de Vencimento *</label>
                    <input required type="date" value={trancheForm.dueDate} onChange={e => setTrancheForm(p => ({ ...p, dueDate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm text-white bg-[#191e30] border border-white/15 focus:outline-none" />
                  </div>
                </div>
                <div className="flex gap-2.5 pt-1">
                  <button type="button" onClick={() => setShowTrancheForm(false)} className="flex-1 py-2 rounded-xl text-xs text-slate-400 hover:text-white border border-white/15">Cancelar</button>
                  <button type="submit" disabled={isPending} className="flex-1 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20">
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Guardar'}
                  </button>
                </div>
              </form>
            )}
            {project.clientTranches.length === 0 ? (
              <p className="text-sm text-slate-500">Sem tranches definidas</p>
            ) : (
              <div className="space-y-2">
                {project.clientTranches.map(t => {
                  const isOverdue = t.status === 'PENDENTE' && new Date(t.dueDate) < new Date()
                  return (
                    <div key={t.id} className={cn('flex items-center gap-3 p-3 rounded-lg', isOverdue && 'border border-red-500/20')}
                      style={{ background: isOverdue ? 'rgba(248,113,113,0.05)' : 'rgba(255,255,255,0.03)' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium">{t.description}</p>
                        <p className="text-xs text-slate-400">Vencimento: {formatDate(t.dueDate)}</p>
                        {t.paidDate && <p className="text-xs text-emerald-400">Pago em: {formatDate(t.paidDate)}</p>}
                        {isOverdue && <p className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Em atraso</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-white mb-1">{formatCurrency(t.amount)}</p>
                        {t.percentage > 0 && <p className="text-xs text-slate-500 mb-1">{t.percentage}%</p>}
                        <select value={t.status} onChange={e => handleTrancheStatus(t.id, e.target.value as PaymentStatus)}
                          className={cn('text-xs px-2 py-0.5 rounded-full font-medium focus:outline-none cursor-pointer', PAYMENT_BADGE(t.status))}
                          style={{ background: 'transparent' }}>
                          <option value="PENDENTE">Pendente</option>
                          <option value="PAGO">Pago</option>
                          <option value="ATRASADO">Atrasado</option>
                        </select>
                      </div>
                      <button onClick={() => handleDeleteTranche(t.id)} className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
                <div className="flex justify-between text-sm pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-slate-400">Total Recebido</span>
                  <span className="text-emerald-400 font-semibold">{formatCurrency(received)} / {formatCurrency(project.contractValue)}</span>
                </div>
              </div>
            )}
          </Section>
        </div>
      )}

      {/* Tab: Documentos */}
      {activeTab === 'documentos' && (
        <Section title={`Documentos (${project.documents.length})`}>
          <div className="flex items-end gap-3 mb-4">
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1">Título do documento</label>
              <input value={docForm.title} onChange={e => setDocForm({ title: e.target.value })}
                placeholder="Ex: Contrato Assinado, Caderneta Predial..."
                className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <label className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all',
              docForm.title ? 'text-white' : 'text-slate-500 cursor-not-allowed')}
              style={{ background: docForm.title ? 'linear-gradient(135deg, #4f7ef8, #7c67f5)' : 'rgba(255,255,255,0.05)' }}>
              <Upload className="w-4 h-4" />
              Upload
              <input type="file" className="hidden" disabled={!docForm.title} onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
            </label>
          </div>
          {project.documents.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sem documentos ainda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {project.documents.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg group" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{doc.title}</p>
                    <p className="text-xs text-slate-500">{doc.fileType} · {formatDate(doc.createdAt)}</p>
                  </div>
                  <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Ver</a>
                  <button onClick={() => handleDeleteDoc(doc.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Tab: Notas */}
      {activeTab === 'notas' && (
        <Section title={`Notas da Obra (${project.notes.length})`} action={
          <button onClick={() => setShowNoteForm(!showNoteForm)}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
        }>
          {showNoteForm && (
            <form onSubmit={handleAddNote} className="p-4 sm:p-5 rounded-2xl mb-4 space-y-3 bg-[#121624] border border-amber-500/30 shadow-2xl animate-fade-in">
              <input value={noteForm.title} onChange={e => setNoteForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Título (opcional)"
                className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 bg-[#191e30] border border-white/15 focus:outline-none focus:border-amber-500" />
              <textarea required value={noteForm.content} onChange={e => setNoteForm(p => ({ ...p, content: e.target.value }))}
                placeholder="Nota sobre alterações, decisões no terreno, mensagens WhatsApp..."
                rows={4} className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 bg-[#191e30] border border-white/15 resize-none focus:outline-none focus:border-amber-500" />
              <div className="flex gap-2.5 pt-1">
                <button type="button" onClick={() => setShowNoteForm(false)} className="flex-1 py-2 rounded-xl text-xs text-slate-400 hover:text-white border border-white/15">Cancelar</button>
                <button type="submit" disabled={isPending} className="flex-1 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 shadow-md shadow-amber-600/20">
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Guardar Nota'}
                </button>
              </div>
            </form>
          )}
          {project.notes.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <StickyNote className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sem notas ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {project.notes.map(note => (
                <div key={note.id} className="p-4 rounded-xl group relative" style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.1)' }}>
                  {note.title && <p className="text-sm font-semibold text-white mb-1">{note.title}</p>}
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{note.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-slate-600">{formatDate(note.createdAt)}</p>
                    <button onClick={() => handleDeleteNote(note.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}
    </div>
  )
}
