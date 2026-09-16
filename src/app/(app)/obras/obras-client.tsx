'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, X, HardHat, MapPin, Euro, Calendar, Loader2, Trash2, TrendingUp, FileText, Upload } from 'lucide-react'
import { createProject, deleteProject } from '@/server/actions/projects'
import { formatCurrency, formatDate, getStatusLabel, getMarginColor, calcMargin, cn } from '@/lib/utils'
import { Modal } from '@/components/ui/modal'
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
  const [showProFormaModal, setShowProFormaModal] = useState(false)
  const [proFormaObraId, setProFormaObraId] = useState(initial[0]?.id || '')
  const [proFormaFile, setProFormaFile] = useState<File | null>(null)
  const [proFormaTitle, setProFormaTitle] = useState('')
  const [proFormaAmount, setProFormaAmount] = useState('')
  const [isUploadingProForma, setIsUploadingProForma] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    title: '', clientName: '', clientNIF: '', address: '',
    contractValue: '', startDate: '', endDate: '', status: 'EM_PLANEAMENTO' as ProjectStatus,
  })

  async function handleUploadProForma(e: React.FormEvent) {
    e.preventDefault()
    if (!proFormaFile || !proFormaTitle.trim() || !proFormaObraId) return
    setIsUploadingProForma(true)

    const finalTitle = `[Pró-Forma] ${proFormaTitle.trim()}${proFormaAmount ? ` (${formatCurrency(parseFloat(proFormaAmount))})` : ''}`

    const formData = new FormData()
    formData.append('file', proFormaFile)
    formData.append('title', finalTitle)
    formData.append('projectId', proFormaObraId)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.document) {
        setShowProFormaModal(false)
        setProFormaFile(null)
        setProFormaTitle('')
        setProFormaAmount('')
        router.push(`/obras/${proFormaObraId}?tab=documentos`)
      }
    } catch (err) {
      console.error('Upload error:', err)
    } finally {
      setIsUploadingProForma(false)
    }
  }

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
      {/* Top Search & Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white border border-slate-200 shadow-sm rounded-[4px]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar por título, cliente ou morada..."
            className="w-full pl-9 pr-8 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-blue-600"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="text-xs text-slate-500 font-medium px-1">
          A exibir <span className="text-slate-900 font-bold">{filtered.length}</span> de <span className="text-slate-900 font-bold">{projects.length}</span> obras
        </div>
      </div>

      {/* Main Action & Metrics Bar (Image 2 Style) */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-slate-200 shadow-sm rounded-[4px]">
        <div className="flex items-center gap-5 flex-wrap">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total em Carteira</div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(projects.reduce((acc, p) => acc + p.contractValue, 0))}
            </div>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden sm:block" />
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Em Execução</div>
            <div className="text-xl sm:text-2xl font-bold text-blue-600 tracking-tight">
              {projects.filter(p => p.status === 'EM_EXECUCAO').length} <span className="text-xs text-slate-500 font-normal">obras</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status filter segments */}
          <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-1 rounded-[4px]">
            {[{ value: 'ALL', label: 'TODAS' }, ...STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label.toUpperCase() }))].map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value as ProjectStatus | 'ALL')}
                className={cn(
                  'px-2.5 py-1.5 rounded-[3px] text-[11px] font-bold tracking-wider transition-all',
                  statusFilter === opt.value
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setProFormaObraId(projects[0]?.id || '')
              setProFormaFile(null)
              setProFormaTitle('')
              setProFormaAmount('')
              setShowProFormaModal(true)
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[4px] text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all active:scale-95 shadow-xs"
          >
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>+ Pró-Forma</span>
          </button>

          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Obra</span>
          </button>
        </div>
      </div>

      {/* Grid of rectangular cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(project => {
          const totalExpenses = project.expenses.reduce((s, e) => s + e.amount, 0)
          const profit = project.contractValue - totalExpenses
          const margin = calcMargin(project.contractValue, totalExpenses)
          const marginColor = getMarginColor(margin)
          const received = project.clientTranches.filter(t => t.status === 'PAGO').reduce((s, t) => s + t.amount, 0)
          const pctReceived = project.contractValue > 0 ? (received / project.contractValue) * 100 : 0

          return (
            <div
              key={project.id}
              className="bg-white border border-slate-200 hover:border-blue-500 rounded-[4px] p-4 sm:p-5 group cursor-pointer transition-all duration-150 shadow-sm relative flex flex-col justify-between"
              onClick={() => router.push(`/obras/${project.id}`)}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-8 h-8 rounded-[4px] flex items-center justify-center flex-shrink-0"
                      style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}
                    >
                      <HardHat className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-[3px] font-bold uppercase tracking-wider', STATUS_BADGE[project.status])}>
                      {getStatusLabel(project.status)}
                    </span>
                  </div>
                  <button
                    onClick={e => handleDelete(project.id, e)}
                    className="opacity-80 sm:opacity-0 sm:group-hover:opacity-100 text-slate-400 hover:text-red-600 transition-all p-1"
                    title="Eliminar obra"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mb-1 leading-snug truncate">{project.title}</h3>
                <p className="text-xs text-slate-500 mb-3 truncate">{project.clientName}</p>

                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                    <span className="truncate">{project.address}</span>
                  </div>
                  {(project.startDate || project.endDate) && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                      {formatDate(project.startDate)} → {formatDate(project.endDate)}
                    </div>
                  )}
                </div>
              </div>

              <div>
                {/* Financial summary box */}
                <div className="p-3 rounded-[4px] bg-slate-50 border border-slate-200 space-y-2 mb-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Contrato</span>
                    <span className="text-slate-900 font-bold">{formatCurrency(project.contractValue)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Custos Reais</span>
                    <span className="text-red-600 font-semibold">{formatCurrency(totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1.5 border-t border-slate-200">
                    <span className="text-slate-500 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-emerald-600" /> Lucro
                    </span>
                    <span className={cn('font-bold', profit >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                      {formatCurrency(profit)} <span className={cn('text-[11px]', marginColor)}>({margin.toFixed(1)}%)</span>
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1 font-medium">
                    <span>Recebido</span>
                    <span className="text-slate-900 font-bold">{pctReceived.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 border border-slate-200 rounded-[2px] overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.min(pctReceived, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-14 px-4 bg-white border border-slate-200 rounded-[4px] shadow-xs flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-[4px] bg-blue-50 border border-blue-200 flex items-center justify-center mb-3">
            <HardHat className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            {search ? 'Nenhuma obra encontrada' : 'Sem obras registadas'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mb-4">
            {search ? 'Tente ajustar os termos de pesquisa ou o filtro de estado.' : 'Comece por adicionar uma nova obra para controlar tranches, despesas, margens e subempreiteiros.'}
          </p>
          {!search && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Obra
            </button>
          )}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Nova Obra"
        subtitle="Registar novo projeto de renovação ou construção"
        icon={<HardHat className="w-5 h-5 text-blue-600" />}
        maxWidth="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {[
              { label: 'Título da Obra *', key: 'title', type: 'text', placeholder: 'Ex: Remodelação T3 - Baixa', col: 2 },
              { label: 'Nome do Cliente *', key: 'clientName', type: 'text', placeholder: 'João Silva', col: 1 },
              { label: 'NIF do Cliente', key: 'clientNIF', type: 'text', placeholder: '123 456 789', col: 1 },
              { label: 'Morada Completa *', key: 'address', type: 'text', placeholder: 'Rua das Flores, 12, Porto', col: 2 },
              { label: 'Valor do Contrato (€) *', key: 'contractValue', type: 'number', placeholder: '50000', col: 1 },
              { label: 'Estado Inicial', key: 'status', type: 'select', placeholder: '', col: 1 },
              { label: 'Data de Início Prevista', key: 'startDate', type: 'date', placeholder: '', col: 1 },
              { label: 'Data de Conclusão Prevista', key: 'endDate', type: 'date', placeholder: '', col: 1 },
            ].map(field => (
              <div key={field.key} className={field.col === 2 ? 'sm:col-span-2' : ''}>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{field.label}</label>
                {field.type === 'select' ? (
                  <select
                    value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value as ProjectStatus }))}
                    className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 bg-white border border-slate-300 focus:outline-none focus:border-blue-600"
                  >
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    required={field.label.includes('*')}
                    value={(form as Record<string, string>)[field.key]}
                    onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-300 focus:outline-none focus:border-blue-600"
                  />
                )}
              </div>
            ))}
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
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Obra'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Adicionar Pró-Forma Direta */}
      <Modal
        isOpen={showProFormaModal}
        onClose={() => setShowProFormaModal(false)}
        title="Adicionar Fatura Pró-Forma"
        subtitle="Registar e arquivar documento pró-forma numa obra"
        icon={<FileText className="w-5 h-5 text-indigo-600" />}
        maxWidth="md"
      >
        <form onSubmit={handleUploadProForma} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Selecionar Obra de Destino <span className="text-red-500">*</span>
            </label>
            <select
              value={proFormaObraId}
              onChange={(e) => setProFormaObraId(e.target.value)}
              className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 bg-white border border-slate-300 focus:outline-none focus:border-indigo-600 cursor-pointer"
              required
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.clientName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Ficheiro Anexo (PDF, Imagem ou Word) <span className="text-red-500">*</span>
            </label>
            <label className={cn(
              "border-2 border-dashed rounded-[4px] p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all",
              proFormaFile ? "border-indigo-400 bg-indigo-50/50" : "border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-slate-100/60"
            )}>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) {
                    setProFormaFile(f)
                    if (!proFormaTitle.trim()) {
                      const cleanName = f.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")
                      setProFormaTitle(cleanName)
                    }
                  }
                }}
              />
              {proFormaFile ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[4px] bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-900 truncate max-w-[240px]">{proFormaFile.name}</p>
                    <p className="text-[11px] text-slate-500">{(proFormaFile.size / 1024).toFixed(1)} KB · Clique para alterar</p>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Identificação / Nº Pró-Forma <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={proFormaTitle}
                onChange={(e) => setProFormaTitle(e.target.value)}
                placeholder="Ex: Pró-Forma 02/2026"
                className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-300 focus:outline-none focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Valor da Pró-Forma (€)
              </label>
              <input
                type="number"
                step="any"
                value={proFormaAmount}
                onChange={(e) => setProFormaAmount(e.target.value)}
                placeholder="Ex: 5000"
                className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-300 focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

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
              disabled={isUploadingProForma || !proFormaFile || !proFormaTitle.trim() || !proFormaObraId}
              className="flex-1 py-2.5 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isUploadingProForma ? (
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
