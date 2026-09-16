'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ArrowLeft, TrendingUp, TrendingDown, Wallet, FileText, StickyNote,
  Plus, Trash2, X, Loader2, Check, Clock, AlertTriangle, Upload,
  MapPin, Calendar, User, Receipt, Star, Euro, FileUp
} from 'lucide-react'
import {
  createExpense, deleteExpense, createClientTranche, updateTrancheStatus,
  deleteClientTranche, createDocument, deleteDocument, updateProject
} from '@/server/actions/projects'
import { createSubcontractorPayment, updateSubPaymentStatus } from '@/server/actions/subcontractors'
import { createNote, deleteNote } from '@/server/actions/notes'
import { formatCurrency, formatDate, getStatusLabel, getMarginColor, getMarginBg, calcMargin, cn } from '@/lib/utils'
import { Modal } from '@/components/ui/modal'
import type { ExpenseCategory, PaymentStatus, ProjectStatus } from '@prisma/client'

const TABS = [
  { id: 'overview', label: 'Visão Geral', icon: Wallet },
  { id: 'financeiro', label: 'Financeiro', icon: TrendingUp },
  { id: 'despesas', label: 'Despesas', icon: Receipt },
  { id: 'tranches', label: 'Tranches', icon: Clock },
  { id: 'documentos', label: 'Pró-Formas & Docs', icon: FileText },
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
    <div className="bg-white border border-slate-200 rounded-[4px] p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

export function ObraDetailClient({ project: initialProject, subcontractors }: { project: NonNullable<Project>; subcontractors: Subcontractor[] }) {
  const [project, setProject] = useState(initialProject)
  const searchParams = useSearchParams()
  const initialTab = searchParams?.get('tab') || 'overview'
  const [activeTab, setActiveTab] = useState(initialTab)
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
  const [docForm, setDocForm] = useState({ title: '', isProForma: true, amount: '' })
  const [isUploadingDoc, setIsUploadingDoc] = useState(false)
  const [docFilter, setDocFilter] = useState<'ALL' | 'PRO_FORMA' | 'DOCS'>('ALL')
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [showTrancheForm, setShowTrancheForm] = useState(false)
  const [showSubPayForm, setShowSubPayForm] = useState(false)
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [showProFormaModal, setShowProFormaModal] = useState(false)
  const [modalFile, setModalFile] = useState<File | null>(null)
  const [modalDocForm, setModalDocForm] = useState({ title: '', isProForma: true, amount: '', category: 'CLIENTE' })

  async function handleModalUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!modalFile || !modalDocForm.title.trim()) return
    setIsUploadingDoc(true)

    const finalTitle = modalDocForm.isProForma
      ? `[Pró-Forma] ${modalDocForm.title.trim()}${modalDocForm.amount ? ` (${formatCurrency(parseFloat(modalDocForm.amount))})` : ''}`
      : modalDocForm.title.trim()

    const formData = new FormData()
    formData.append('file', modalFile)
    formData.append('title', finalTitle)
    formData.append('projectId', project.id)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.document) {
        setProject(p => ({ ...p, documents: [data.document, ...p.documents] }))
        setShowProFormaModal(false)
        setModalFile(null)
        setModalDocForm({ title: '', isProForma: true, amount: '', category: 'CLIENTE' })
      }
    } catch (err) {
      console.error('Upload error:', err)
    } finally {
      setIsUploadingDoc(false)
    }
  }

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
    if (!file || !docForm.title.trim()) return
    setIsUploadingDoc(true)

    const finalTitle = docForm.isProForma
      ? `[Pró-Forma] ${docForm.title.trim()}${docForm.amount ? ` (${formatCurrency(parseFloat(docForm.amount))})` : ''}`
      : docForm.title.trim()

    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', finalTitle)
    formData.append('projectId', project.id)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.document) {
        setProject(p => ({ ...p, documents: [data.document, ...p.documents] }))
        setDocForm({ title: '', isProForma: true, amount: '' })
      }
    } catch (err) {
      console.error('Upload error:', err)
    } finally {
      setIsUploadingDoc(false)
      // reset file input
      e.target.value = ''
    }
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
      <div className="flex items-start justify-between gap-4 flex-wrap p-4 bg-white border border-slate-200 rounded-[4px] shadow-sm">
        <div className="flex items-start gap-3">
          <Link href="/obras" className="text-slate-400 hover:text-slate-900 transition-colors mt-1 p-1 hover:bg-slate-100 rounded-[3px]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-snug tracking-tight">{project.title}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{project.clientName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setModalDocForm({ title: '', isProForma: true, amount: '', category: 'CLIENTE' })
              setModalFile(null)
              setShowProFormaModal(true)
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all active:scale-95"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>+ Pró-Forma</span>
          </button>
          <select value={project.status} onChange={e => handleStatusChange(e.target.value as ProjectStatus)}
            className="px-3 py-2 rounded-[4px] text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-50 border border-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer">
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label.toUpperCase()}</option>)}
          </select>
        </div>
      </div>

      {/* Financial KPIs row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'VALOR DO CONTRATO', value: formatCurrency(project.contractValue), color: 'text-blue-600', icon: Wallet },
          { label: 'CUSTOS TOTAIS', value: formatCurrency(totalExpenses), color: 'text-red-600', icon: TrendingDown },
          { label: 'LUCRO BRUTO', value: formatCurrency(profit), color: profit >= 0 ? 'text-emerald-600' : 'text-red-600', icon: TrendingUp },
          { label: `MARGEM REAL (${margin.toFixed(1)}%)`, value: margin.toFixed(1) + '%', color: marginColor, icon: TrendingUp },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white border border-slate-200 rounded-[4px] p-4 shadow-sm">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 mb-1">{kpi.label}</p>
            <p className={cn('text-lg font-bold tracking-tight', kpi.color)}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs — Rectangular Enterprise Segmented */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 p-1 bg-white border border-slate-200 rounded-[4px] shadow-sm">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap rounded-[3px]',
                isActive ? 'text-white bg-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              )}>
              <Icon className="w-3.5 h-3.5" />
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
                  <row.icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-500 w-20 flex-shrink-0">{row.label}</span>
                  <span className="text-slate-800 font-medium">{row.value}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Resumo Financeiro">
            <div className={cn('p-4 rounded-[4px] mb-4 border', marginBg)}>
              <p className="text-xs text-slate-600 mb-1 font-semibold uppercase tracking-wider">Margem Atual</p>
              <p className={cn('text-3xl font-bold', marginColor)}>{margin.toFixed(1)}%</p>
              <div className="h-2 bg-slate-200 rounded-[2px] mt-2 overflow-hidden">
                <div className="h-full rounded-[2px]" style={{
                  width: `${Math.min(margin, 100)}%`,
                  background: margin >= 25 ? '#10b981' : margin >= 15 ? '#f59e0b' : '#ef4444',
                }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Recebido do cliente</span>
                <span className="text-emerald-600 font-semibold">{formatCurrency(received)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Pago a subempreit.</span>
                <span className="text-red-600 font-semibold">{formatCurrency(subPaid)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                <span className="text-slate-600 font-medium">Saldo operacional</span>
                <span className={cn('font-bold', (received - subPaid) >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                  {formatCurrency(received - subPaid)}
                </span>
              </div>
            </div>
          </Section>

          {/* Section: Faturas Pró-Forma & Documentos */}
          <div className="md:col-span-2">
            <Section
              title={`Faturas Pró-Forma & Documentos (${project.documents.length})`}
              action={
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModalDocForm({ title: '', isProForma: true, amount: '', category: 'CLIENTE' })
                      setModalFile(null)
                      setShowProFormaModal(true)
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Pró-Forma</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('documentos')}
                    className="text-xs font-bold uppercase tracking-wider text-blue-600 hover:text-blue-800 px-2 py-1 hover:bg-blue-50 rounded-[3px] transition-colors"
                  >
                    Ver Todos ({project.documents.length}) →
                  </button>
                </div>
              }
            >
              {project.documents.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-[4px] bg-slate-50 border border-dashed border-slate-200">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-indigo-400" />
                  <p className="text-xs text-slate-800 font-bold">Nenhuma fatura pró-forma ou documento anexado</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 mb-3">Registe aqui as pró-formas emitidas ao cliente ou recebidas para a obra.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setModalDocForm({ title: '', isProForma: true, amount: '', category: 'CLIENTE' })
                      setModalFile(null)
                      setShowProFormaModal(true)
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Primeira Pró-Forma</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {project.documents.slice(0, 6).map(doc => {
                    const isPro = doc.title.toLowerCase().includes('pró-forma') || doc.title.toLowerCase().includes('proforma')
                    return (
                      <div
                        key={doc.id}
                        className={cn(
                          'p-3 rounded-[4px] border flex flex-col justify-between gap-2 shadow-xs transition-all',
                          isPro ? 'bg-indigo-50/40 border-indigo-200 hover:border-indigo-300' : 'bg-white border-slate-200 hover:border-slate-300'
                        )}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className={cn(
                            'w-7 h-7 rounded-[4px] flex items-center justify-center flex-shrink-0 text-xs font-bold',
                            isPro ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'
                          )}>
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 truncate" title={doc.title}>
                              {doc.title}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {formatDate(doc.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-1">
                          <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-[2px]', isPro ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600')}>
                            {isPro ? 'Pró-Forma' : 'Documento'}
                          </span>
                          <div className="flex items-center gap-2">
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider"
                            >
                              Abrir ↗
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDeleteDoc(doc.id)}
                              className="text-slate-400 hover:text-red-600 p-0.5"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Section>
          </div>
        </div>
      )}

      {/* Tab: Financeiro */}
      {activeTab === 'financeiro' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-[4px] p-5 text-center shadow-sm">
              <p className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wider">Valor do Contrato</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(project.contractValue)}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-[4px] p-5 text-center shadow-sm">
              <p className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wider">Custos Totais</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
            </div>
            <div className={cn('bg-white border border-slate-200 rounded-[4px] p-5 text-center shadow-sm', marginBg)}>
              <p className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wider">Lucro Bruto</p>
              <p className={cn('text-2xl font-bold', marginColor)}>{formatCurrency(profit)}</p>
              <p className={cn('text-sm mt-1 font-semibold', marginColor)}>{margin.toFixed(1)}% margem</p>
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
                        <span className="text-slate-700 font-medium">{cat.label}</span>
                        <span className="text-slate-900 font-bold">{formatCurrency(cat.total)} <span className="text-slate-400 text-xs font-normal">({pct.toFixed(0)}%)</span></span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-[2px] overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-[2px]" style={{ width: `${pct}%` }} />
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm">
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </button>
          }>
            <Modal
              isOpen={showSubPayForm}
              onClose={() => setShowSubPayForm(false)}
              title="Adicionar Pagamento a Subempreiteiro"
              subtitle={project.title}
              maxWidth="md"
            >
              <form onSubmit={handleAddSubPay} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Subempreiteiro *</label>
                  <select required value={subPayForm.subcontractorId} onChange={e => setSubPayForm(p => ({ ...p, subcontractorId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 bg-white border border-slate-300 focus:outline-none focus:border-blue-500">
                    <option value="">Selecionar...</option>
                    {subcontractors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Fase / Descrição *</label>
                  <input required value={subPayForm.phaseDescription} onChange={e => setSubPayForm(p => ({ ...p, phaseDescription: e.target.value }))}
                    placeholder="Ex: Canalização WC 1 e WC 2"
                    className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-300 focus:outline-none focus:border-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Valor (€) *</label>
                    <input required type="number" value={subPayForm.amount} onChange={e => setSubPayForm(p => ({ ...p, amount: e.target.value }))}
                      placeholder="2500"
                      className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-300 focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Data de Vencimento *</label>
                    <input required type="date" value={subPayForm.dueDate} onChange={e => setSubPayForm(p => ({ ...p, dueDate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 bg-white border border-slate-300 focus:outline-none focus:border-blue-500" />
                  </div>
                </div>
                <div className="flex gap-2.5 pt-3 border-t border-slate-200">
                  <button type="button" onClick={() => setShowSubPayForm(false)} className="flex-1 py-2.5 rounded-[4px] text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-300 hover:bg-slate-50 transition-colors">Cancelar</button>
                  <button type="submit" disabled={isPending} className="flex-1 py-2.5 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/20">
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Guardar Pagamento'}
                  </button>
                </div>
              </form>
            </Modal>

            {project.subPayments.length === 0 ? (
              <p className="text-sm text-slate-500 py-2">Sem pagamentos a subempreiteiros.</p>
            ) : (
              <div className="space-y-2">
                {project.subPayments.map(pay => (
                  <div key={pay.id} className="flex items-center gap-3 p-3 rounded-[4px] bg-slate-50 border border-slate-200">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900 font-bold truncate">{pay.subcontractor.name}</p>
                      <p className="text-xs text-slate-500 truncate">{pay.phaseDescription}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Venc.: {formatDate(pay.dueDate)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-slate-900">{formatCurrency(pay.amount)}</p>
                      <select value={pay.status} onChange={e => handleSubPayStatus(pay.id, e.target.value as PaymentStatus)}
                        className={cn('text-[10.5px] px-2 py-0.5 rounded-[3px] mt-1 font-bold uppercase focus:outline-none cursor-pointer', PAYMENT_BADGE(pay.status))}
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm">
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
        }>
          <Modal
            isOpen={showExpenseForm}
            onClose={() => setShowExpenseForm(false)}
            title="Registar Nova Despesa"
            subtitle={project.title}
            maxWidth="md"
          >
            <form onSubmit={handleAddExpense} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Descrição *</label>
                <input required value={expenseForm.description} onChange={e => setExpenseForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Ex: Azulejos 60x60 brancos"
                  className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-300 focus:outline-none focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Valor (€) *</label>
                  <input required type="number" value={expenseForm.amount} onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="500"
                    className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-300 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Data</label>
                  <input type="date" value={expenseForm.date} onChange={e => setExpenseForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 bg-white border border-slate-300 focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Categoria</label>
                <select value={expenseForm.category} onChange={e => setExpenseForm(p => ({ ...p, category: e.target.value as ExpenseCategory }))}
                  className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 bg-white border border-slate-300 focus:outline-none focus:border-blue-500">
                  {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="flex gap-2.5 pt-3 border-t border-slate-200">
                <button type="button" onClick={() => setShowExpenseForm(false)} className="flex-1 py-2.5 rounded-[4px] text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-300 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={isPending} className="flex-1 py-2.5 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 flex items-center justify-center gap-2 shadow-md shadow-blue-600/20">
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Guardar Despesa'}
                </button>
              </div>
            </form>
          </Modal>

          {project.expenses.length === 0 ? (
            <p className="text-sm text-slate-500 py-3">Sem despesas registadas.</p>
          ) : (
            <div className="overflow-x-auto rounded-[4px] border border-slate-200 shadow-sm">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {['DESCRIÇÃO', 'CATEGORIA', 'DATA', 'VALOR', ''].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[10.5px] font-bold tracking-wider text-slate-600 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {project.expenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                      <td className="px-4 py-3 text-xs sm:text-sm font-semibold text-slate-900">{exp.description}</td>
                      <td className="px-4 py-3"><span className="badge-blue text-[10.5px] px-2 py-0.5 rounded-[3px] font-bold uppercase">{getStatusLabel(exp.category)}</span></td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDate(exp.date)}</td>
                      <td className="px-4 py-3 text-xs sm:text-sm font-bold text-red-600">{formatCurrency(exp.amount)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDeleteExpense(exp.id)} className="text-slate-400 hover:text-red-600 transition-colors p-1" title="Eliminar">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50">
                    <td colSpan={3} className="px-4 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900">Total de Despesas</td>
                    <td className="px-4 py-3 text-xs sm:text-sm font-bold text-red-600">{formatCurrency(totalExpenses)}</td>
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-sm">
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </button>
          }>
            <Modal
              isOpen={showTrancheForm}
              onClose={() => setShowTrancheForm(false)}
              title="Adicionar Tranche do Cliente"
              subtitle={project.title}
              maxWidth="md"
            >
              <form onSubmit={handleAddTranche} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Descrição *</label>
                  <input required value={trancheForm.description} onChange={e => setTrancheForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Ex: 1ª Tranche — Adjudicação (30%)"
                    className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-300 focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Percentagem (%)</label>
                    <input type="number" value={trancheForm.percentage} onChange={e => setTrancheForm(p => ({ ...p, percentage: e.target.value }))}
                      placeholder="30"
                      className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-300 focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Valor (€) *</label>
                    <input required type="number" value={trancheForm.amount} onChange={e => setTrancheForm(p => ({ ...p, amount: e.target.value }))}
                      placeholder="15000"
                      className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-300 focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Data de Vencimento *</label>
                  <input required type="date" value={trancheForm.dueDate} onChange={e => setTrancheForm(p => ({ ...p, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 bg-white border border-slate-300 focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="flex gap-2.5 pt-3 border-t border-slate-200">
                  <button type="button" onClick={() => setShowTrancheForm(false)} className="flex-1 py-2.5 rounded-[4px] text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-300 hover:bg-slate-50 transition-colors">Cancelar</button>
                  <button type="submit" disabled={isPending} className="flex-1 py-2.5 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20">
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Guardar Tranche'}
                  </button>
                </div>
              </form>
            </Modal>

            {project.clientTranches.length === 0 ? (
              <p className="text-sm text-slate-500 py-3">Sem tranches definidas.</p>
            ) : (
              <div className="space-y-2">
                {project.clientTranches.map(t => {
                  const isOverdue = t.status === 'PENDENTE' && new Date(t.dueDate) < new Date()
                  return (
                    <div key={t.id} className={cn('flex items-center gap-3 p-3 rounded-[4px] bg-slate-50 border border-slate-200', isOverdue && 'border-red-300 bg-red-50/60')}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900 font-bold">{t.description}</p>
                        <p className="text-xs text-slate-500">Vencimento: {formatDate(t.dueDate)}</p>
                        {t.paidDate && <p className="text-xs text-emerald-600 font-medium">Pago em: {formatDate(t.paidDate)}</p>}
                        {isOverdue && <p className="text-xs text-red-600 font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Em atraso</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-slate-900 mb-1">{formatCurrency(t.amount)}</p>
                        {t.percentage > 0 && <p className="text-xs text-slate-500 font-medium mb-1">{t.percentage}%</p>}
                        <select value={t.status} onChange={e => handleTrancheStatus(t.id, e.target.value as PaymentStatus)}
                          className={cn('text-[10.5px] px-2 py-0.5 rounded-[3px] font-bold uppercase focus:outline-none cursor-pointer', PAYMENT_BADGE(t.status))}
                          style={{ background: 'transparent' }}>
                          <option value="PENDENTE">Pendente</option>
                          <option value="PAGO">Pago</option>
                          <option value="ATRASADO">Atrasado</option>
                        </select>
                      </div>
                      <button onClick={() => handleDeleteTranche(t.id)} className="text-slate-400 hover:text-red-600 transition-colors flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
                <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                  <span className="text-slate-500 font-medium">Total Recebido</span>
                  <span className="text-emerald-600 font-bold">{formatCurrency(received)} / {formatCurrency(project.contractValue)}</span>
                </div>
              </div>
            )}
          </Section>
        </div>
      )}

      {/* Tab: Pró-Formas & Documentos */}
      {activeTab === 'documentos' && (() => {
        const proFormas = project.documents.filter(d => d.title.toLowerCase().includes('pró-forma') || d.title.toLowerCase().includes('proforma'))
        const generalDocs = project.documents.filter(d => !d.title.toLowerCase().includes('pró-forma') && !d.title.toLowerCase().includes('proforma'))
        const visibleDocs = docFilter === 'PRO_FORMA' ? proFormas : docFilter === 'DOCS' ? generalDocs : project.documents

        return (
          <Section
            title={`Pró-Formas & Documentos (${project.documents.length})`}
            action={
              <button
                type="button"
                onClick={() => {
                  setModalDocForm({ title: '', isProForma: true, amount: '', category: 'CLIENTE' })
                  setModalFile(null)
                  setShowProFormaModal(true)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Pró-Forma</span>
              </button>
            }
          >
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-[4px]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pró-Formas</div>
                <div className="text-lg font-bold text-indigo-700 mt-0.5">{proFormas.length} emitidas</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-[4px]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Outros Documentos</div>
                <div className="text-lg font-bold text-blue-700 mt-0.5">{generalDocs.length} ficheiros</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-[4px] col-span-2 sm:col-span-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Ficheiros</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">{project.documents.length} registados</div>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 mb-4 pb-3 border-b border-slate-200 overflow-x-auto">
              <button
                type="button"
                onClick={() => setDocFilter('ALL')}
                className={cn(
                  'px-3 py-1.5 rounded-[3px] text-xs font-bold uppercase tracking-wider transition-all',
                  docFilter === 'ALL' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                )}
              >
                Todos ({project.documents.length})
              </button>
              <button
                type="button"
                onClick={() => setDocFilter('PRO_FORMA')}
                className={cn(
                  'px-3 py-1.5 rounded-[3px] text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5',
                  docFilter === 'PRO_FORMA' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                )}
              >
                <span>📄 Pró-Formas</span>
                <span className="px-1.5 py-0.2 rounded-[2px] text-[10px] bg-white/30">{proFormas.length}</span>
              </button>
              <button
                type="button"
                onClick={() => setDocFilter('DOCS')}
                className={cn(
                  'px-3 py-1.5 rounded-[3px] text-xs font-bold uppercase tracking-wider transition-all',
                  docFilter === 'DOCS' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                )}
              >
                📑 Outros Documentos ({generalDocs.length})
              </button>
            </div>

            {/* Upload Box — Tailored for Pró-Formas */}
            <div className="p-4 rounded-[4px] bg-slate-50 border border-slate-200 mb-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  Carregar Documento / Fatura Pró-Forma
                </span>
                <div className="flex items-center gap-1 bg-slate-200 p-0.5 rounded-[3px] border border-slate-300 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setDocForm(p => ({ ...p, isProForma: true }))}
                    className={cn(
                      'px-2.5 py-1 rounded-[2px] font-bold uppercase tracking-wider transition-all text-[10px]',
                      docForm.isProForma ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    📄 Pró-Forma
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocForm(p => ({ ...p, isProForma: false }))}
                    className={cn(
                      'px-2.5 py-1 rounded-[2px] font-bold uppercase tracking-wider transition-all text-[10px]',
                      !docForm.isProForma ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    📑 Geral
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    {docForm.isProForma ? 'Descrição / Nº da Pró-Forma *' : 'Título do Documento *'}
                  </label>
                  <input
                    value={docForm.title}
                    onChange={e => setDocForm(p => ({ ...p, title: e.target.value }))}
                    placeholder={docForm.isProForma ? 'Ex: Pró-Forma 01/2026 - Tranche Demolições' : 'Ex: Contrato Assinado, Planta...'}
                    className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {docForm.isProForma ? (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">Valor da Pró-Forma (€)</label>
                    <input
                      type="number"
                      step="any"
                      value={docForm.amount}
                      onChange={e => setDocForm(p => ({ ...p, amount: e.target.value }))}
                      placeholder="Ex: 15000"
                      className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-300 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">Tipo</label>
                    <div className="px-3 py-2 rounded-[4px] text-xs text-slate-600 bg-white border border-slate-300">
                      Documento Geral
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <p className="text-[11px] text-slate-500">Suporta PDF, Imagens (JPG, PNG) e DOCX.</p>
                <label
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-[4px] text-xs font-bold uppercase tracking-wider cursor-pointer transition-all',
                    docForm.title.trim() && !isUploadingDoc
                      ? 'text-white bg-blue-600 hover:bg-blue-500 shadow-sm active:scale-95'
                      : 'text-slate-400 bg-slate-200 cursor-not-allowed border border-slate-300'
                  )}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploadingDoc ? 'A enviar...' : 'Selecionar & Enviar Ficheiro'}</span>
                  <input
                    type="file"
                    disabled={!docForm.title.trim() || isUploadingDoc}
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>

            {visibleDocs.length === 0 ? (
              <div className="text-center py-10 rounded-[4px] bg-slate-50 border border-dashed border-slate-200">
                <FileText className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="text-xs text-slate-600 font-medium">Nenhum documento encontrado nesta categoria.</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Utilize o formulário acima para anexar ficheiros.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {visibleDocs.map(doc => {
                  const isPro = doc.title.toLowerCase().includes('pró-forma') || doc.title.toLowerCase().includes('proforma')
                  return (
                    <div
                      key={doc.id}
                      className={cn(
                        'flex items-center justify-between gap-3 p-3.5 rounded-[4px] border transition-all shadow-xs',
                        isPro
                          ? 'bg-indigo-50/40 border-indigo-200 hover:border-indigo-300'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-[4px] flex items-center justify-center flex-shrink-0',
                            isPro ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-50 text-blue-700'
                          )}
                        >
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[280px] sm:max-w-md">
                              {doc.title}
                            </p>
                            {isPro && (
                              <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 uppercase">
                                Pró-Forma
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {doc.fileType.split('/')[1]?.toUpperCase() || 'DOCUMENTO'} · Adicionado a {formatDate(doc.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-[4px] text-xs font-bold uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-blue-700 border border-slate-200 transition-all inline-flex items-center gap-1"
                        >
                          <span>Abrir</span>
                        </a>
                        <button
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="p-1.5 rounded-[4px] text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                          title="Eliminar documento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Section>
        )
      })()}

      {/* Tab: Notas */}
      {activeTab === 'notas' && (
        <Section title={`Notas da Obra (${project.notes.length})`} action={
          <button onClick={() => setShowNoteForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-amber-600 hover:bg-amber-500 transition-colors shadow-sm">
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
        }>
          <Modal
            isOpen={showNoteForm}
            onClose={() => setShowNoteForm(false)}
            title="Nova Nota da Obra"
            subtitle={project.title}
            maxWidth="md"
          >
            <form onSubmit={handleAddNote} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Título (Opcional)</label>
                <input value={noteForm.title} onChange={e => setNoteForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Ex: Reunião no local, Alteração de materiais..."
                  className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-300 focus:outline-none focus:border-amber-500" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Conteúdo da Nota <span className="text-red-500">*</span>
                </label>
                <textarea required value={noteForm.content} onChange={e => setNoteForm(p => ({ ...p, content: e.target.value }))}
                  placeholder="Nota sobre alterações, decisões no terreno, mensagens WhatsApp..."
                  rows={4} className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-300 resize-none focus:outline-none focus:border-amber-500" />
              </div>
              <div className="flex gap-2.5 pt-3 border-t border-slate-200">
                <button type="button" onClick={() => setShowNoteForm(false)} className="flex-1 py-2.5 rounded-[4px] text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-300 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={isPending} className="flex-1 py-2.5 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-amber-600 hover:bg-amber-500 shadow-md shadow-amber-600/20">
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Guardar Nota'}
                </button>
              </div>
            </form>
          </Modal>

          {project.notes.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <StickyNote className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Sem notas ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {project.notes.map(note => (
                <div key={note.id} className="p-4 rounded-[4px] bg-white border border-slate-200 group relative shadow-xs">
                  {note.title && <p className="text-sm font-bold text-slate-900 mb-1">{note.title}</p>}
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                    <p className="text-[11px] text-slate-400">{formatDate(note.createdAt)}</p>
                    <button onClick={() => handleDeleteNote(note.id)}
                      className="opacity-80 sm:opacity-0 sm:group-hover:opacity-100 text-slate-400 hover:text-red-600 transition-all p-1"
                      title="Eliminar nota">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Modal: Adicionar Fatura Pró-Forma / Documento */}
      <Modal
        isOpen={showProFormaModal}
        onClose={() => setShowProFormaModal(false)}
        title="Adicionar Fatura Pró-Forma / Documento"
        subtitle={`Registar documento ou pró-forma para ${project.title}`}
        icon={<FileText className="w-5 h-5 text-indigo-600" />}
        maxWidth="md"
      >
        <form onSubmit={handleModalUpload} className="space-y-4">
          {/* Document type switcher */}
          <div className="flex items-center p-1 bg-slate-100 rounded-[4px] border border-slate-200">
            <button
              type="button"
              onClick={() => setModalDocForm(p => ({ ...p, isProForma: true }))}
              className={cn(
                'flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-[3px] transition-all flex items-center justify-center gap-1.5',
                modalDocForm.isProForma ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <span>📄 Fatura Pró-Forma</span>
            </button>
            <button
              type="button"
              onClick={() => setModalDocForm(p => ({ ...p, isProForma: false }))}
              className={cn(
                'flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-[3px] transition-all flex items-center justify-center gap-1.5',
                !modalDocForm.isProForma ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <span>📑 Documento Geral</span>
            </button>
          </div>

          {/* File selector dropzone */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Ficheiro Anexo (PDF, Imagem ou Word) <span className="text-red-500">*</span>
            </label>
            <label className={cn(
              "border-2 border-dashed rounded-[4px] p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all",
              modalFile ? "border-indigo-400 bg-indigo-50/50" : "border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-slate-100/60"
            )}>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) {
                    setModalFile(f)
                    if (!modalDocForm.title.trim()) {
                      const cleanName = f.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")
                      setModalDocForm(p => ({ ...p, title: cleanName }))
                    }
                  }
                }}
              />
              {modalFile ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[4px] bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-900 truncate max-w-[240px]">{modalFile.name}</p>
                    <p className="text-[11px] text-slate-500">{(modalFile.size / 1024).toFixed(1)} KB · Clique para alterar</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="w-7 h-7 mx-auto text-slate-400" />
                  <p className="text-xs font-bold text-slate-700">Clique para selecionar ficheiro</p>
                  <p className="text-[11px] text-slate-400">PDF, JPG, PNG ou DOCX</p>
                </div>
              )}
            </label>
          </div>

          {/* Form fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                {modalDocForm.isProForma ? 'Identificação / Número da Pró-Forma *' : 'Título do Documento *'}
              </label>
              <input
                type="text"
                required
                value={modalDocForm.title}
                onChange={(e) => setModalDocForm(p => ({ ...p, title: e.target.value }))}
                placeholder={modalDocForm.isProForma ? 'Ex: Pró-Forma nº 03/2026 - Carpintarias' : 'Ex: Contrato assinado, Plantas...'}
                className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-300 focus:outline-none focus:border-indigo-600"
              />
            </div>

            {modalDocForm.isProForma && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Valor da Pró-Forma (€)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={modalDocForm.amount}
                    onChange={(e) => setModalDocForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="Ex: 8500"
                    className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-300 focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Entidade / Origem
                  </label>
                  <select
                    value={modalDocForm.category}
                    onChange={(e) => setModalDocForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 bg-white border border-slate-300 focus:outline-none focus:border-indigo-600"
                  >
                    <option value="CLIENTE">Cliente (Recebimento)</option>
                    <option value="SUBEMPREITEIRO">Subempreiteiro / Mão de Obra</option>
                    <option value="FORNECEDOR">Fornecedor / Material</option>
                    <option value="OUTRO">Outro</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowProFormaModal(false)}
              className="flex-1 py-2.5 rounded-[4px] text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-300 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isUploadingDoc || !modalFile || !modalDocForm.title.trim()}
              className="flex-1 py-2.5 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isUploadingDoc ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>A enviar...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Carregar Pró-Forma</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
