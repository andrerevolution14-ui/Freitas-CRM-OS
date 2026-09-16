'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  FileText, Plus, Search, X, Upload, Loader2, Trash2, ExternalLink,
  HardHat, Calendar, Euro, Filter, ArrowUpRight
} from 'lucide-react'
import { deleteDocument } from '@/server/actions/projects'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { Modal } from '@/components/ui/modal'

type ProFormaDoc = {
  id: string
  projectId: string
  title: string
  fileUrl: string
  fileType: string
  createdAt: string | Date
  project: {
    id: string
    title: string
    clientName: string
    address: string
    status: string
  }
}

type ProjectSummary = {
  id: string
  title: string
  clientName: string
}

export function ProFormasClient({
  initialDocuments,
  projects,
}: {
  initialDocuments: ProFormaDoc[]
  projects: ProjectSummary[]
}) {
  const [documents, setDocuments] = useState(initialDocuments)
  const [search, setSearch] = useState('')
  const [selectedProject, setSelectedProject] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PRO_FORMA' | 'GERAL'>('PRO_FORMA')
  const [isPending, startTransition] = useTransition()

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [modalProjectId, setModalProjectId] = useState(projects[0]?.id || '')
  const [modalFile, setModalFile] = useState<File | null>(null)
  const [modalTitle, setModalTitle] = useState('')
  const [modalAmount, setModalAmount] = useState('')
  const [modalIsProForma, setModalIsProForma] = useState(true)
  const [isUploading, setIsUploading] = useState(false)

  // Filtered docs
  const filtered = documents.filter((doc) => {
    const isPro = doc.title.toLowerCase().includes('pró-forma') || doc.title.toLowerCase().includes('proforma')
    if (typeFilter === 'PRO_FORMA' && !isPro) return false
    if (typeFilter === 'GERAL' && isPro) return false
    if (selectedProject !== 'ALL' && doc.projectId !== selectedProject) return false

    if (search.trim()) {
      const q = search.toLowerCase()
      const matchTitle = doc.title.toLowerCase().includes(q)
      const matchClient = doc.project?.clientName?.toLowerCase().includes(q)
      const matchProject = doc.project?.title?.toLowerCase().includes(q)
      return matchTitle || matchClient || matchProject
    }
    return true
  })

  // Extract amounts from pro-forma titles
  const totalProFormasCount = documents.filter(d =>
    d.title.toLowerCase().includes('pró-forma') || d.title.toLowerCase().includes('proforma')
  ).length

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!modalFile || !modalTitle.trim() || !modalProjectId) return
    setIsUploading(true)

    const finalTitle = modalIsProForma
      ? `[Pró-Forma] ${modalTitle.trim()}${modalAmount ? ` (${formatCurrency(parseFloat(modalAmount))})` : ''}`
      : modalTitle.trim()

    const formData = new FormData()
    formData.append('file', modalFile)
    formData.append('title', finalTitle)
    formData.append('projectId', modalProjectId)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.document) {
        const foundProject = projects.find(p => p.id === modalProjectId)
        const newDoc: ProFormaDoc = {
          ...data.document,
          project: {
            id: modalProjectId,
            title: foundProject?.title || 'Obra',
            clientName: foundProject?.clientName || 'Cliente',
            address: '',
            status: 'EM_EXECUCAO',
          },
        }
        setDocuments(prev => [newDoc, ...prev])
        setShowModal(false)
        setModalFile(null)
        setModalTitle('')
        setModalAmount('')
      }
    } catch (err) {
      console.error('Upload error:', err)
    } finally {
      setIsUploading(false)
    }
  }

  async function handleDelete(id: string, projectId: string) {
    if (!confirm('Tem a certeza de que pretende eliminar este documento?')) return
    startTransition(async () => {
      await deleteDocument(id, projectId)
      setDocuments(prev => prev.filter(d => d.id !== id))
    })
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-white border border-slate-200 shadow-xs rounded-[4px]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por número, descrição, obra ou cliente..."
            className="w-full pl-9 pr-8 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-indigo-600"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Obra Filter Dropdown */}
          <div className="flex items-center gap-1 text-xs">
            <HardHat className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-2.5 py-2 rounded-[4px] text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-indigo-600 cursor-pointer"
            >
              <option value="ALL">Todas as Obras ({projects.length})</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-slate-500 font-medium px-1">
            <span className="text-slate-900 font-bold">{filtered.length}</span> ficheiros
          </div>
        </div>
      </div>

      {/* Main Action & Metrics Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-slate-200 shadow-xs rounded-[4px]">
        <div className="flex items-center gap-5 sm:gap-8 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-8 bg-indigo-600 rounded-[2px]" />
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Faturas Pró-Forma</div>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {totalProFormasCount} <span className="text-xs font-normal text-slate-500">registadas</span>
              </div>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-3">
            <div className="w-2.5 h-8 bg-blue-500 rounded-[2px]" />
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Documentos Gerais</div>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {documents.length - totalProFormasCount} <span className="text-xs font-normal text-slate-500">ficheiros</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Segmented Filter */}
          <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-1 rounded-[4px]">
            <button
              onClick={() => setTypeFilter('PRO_FORMA')}
              className={cn(
                'px-3 py-1.5 rounded-[3px] text-xs font-bold tracking-wider transition-all',
                typeFilter === 'PRO_FORMA'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              )}
            >
              📄 Só Pró-Formas
            </button>
            <button
              onClick={() => setTypeFilter('ALL')}
              className={cn(
                'px-3 py-1.5 rounded-[3px] text-xs font-bold tracking-wider transition-all',
                typeFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              )}
            >
              Todos
            </button>
            <button
              onClick={() => setTypeFilter('GERAL')}
              className={cn(
                'px-3 py-1.5 rounded-[3px] text-xs font-bold tracking-wider transition-all',
                typeFilter === 'GERAL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              )}
            >
              📑 Outros Docs
            </button>
          </div>

          <button
            onClick={() => {
              setModalProjectId(projects[0]?.id || '')
              setModalFile(null)
              setModalTitle('')
              setModalAmount('')
              setModalIsProForma(true)
              setShowModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Pró-Forma</span>
          </button>
        </div>
      </div>

      {/* Grid of Documents */}
      {filtered.length === 0 ? (
        <div className="text-center py-14 px-4 bg-white border border-slate-200 rounded-[4px] shadow-xs flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-[4px] bg-indigo-50 border border-indigo-200 flex items-center justify-center mb-3 text-indigo-600">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            {search ? 'Nenhum documento encontrado' : 'Sem faturas pró-forma registadas'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mb-4">
            {search
              ? 'Tente alterar os termos da pesquisa ou selecionar outra obra.'
              : 'Registe e faça upload de faturas pró-forma ou orçamentos associados às obras em curso.'}
          </p>
          <button
            onClick={() => {
              setModalProjectId(projects[0]?.id || '')
              setModalFile(null)
              setModalTitle('')
              setModalAmount('')
              setModalIsProForma(true)
              setShowModal(true)
            }}
            className="px-4 py-2 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar Primeira Pró-Forma
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map((doc) => {
            const isPro = doc.title.toLowerCase().includes('pró-forma') || doc.title.toLowerCase().includes('proforma')
            return (
              <div
                key={doc.id}
                className={cn(
                  'p-4 rounded-[4px] border flex flex-col justify-between gap-3 shadow-xs transition-all',
                  isPro
                    ? 'bg-white border-indigo-200 hover:border-indigo-400 hover:shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={cn(
                        'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[3px] border',
                        isPro
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      )}
                    >
                      {isPro ? 'Fatura Pró-Forma' : 'Documento Geral'}
                    </span>
                    <span className="text-[10.5px] text-slate-400 font-medium">
                      {formatDate(doc.createdAt)}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug mb-2" title={doc.title}>
                    {doc.title}
                  </h4>

                  {doc.project && (
                    <Link
                      href={`/obras/${doc.project.id}?tab=proformas`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors py-0.5"
                    >
                      <HardHat className="w-3.5 h-3.5 text-blue-500" />
                      <span className="truncate max-w-[220px]">{doc.project.title}</span>
                      <ArrowUpRight className="w-3 h-3 text-slate-400" />
                    </Link>
                  )}
                  {doc.project?.clientName && (
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      Cliente: {doc.project.clientName}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-1">
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-bold uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-blue-700 border border-slate-200 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir Ficheiro</span>
                  </a>

                  <button
                    onClick={() => handleDelete(doc.id, doc.projectId)}
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

      {/* Modal: Adicionar Pró-Forma */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Registar Fatura Pró-Forma"
        subtitle="Upload e arquivamento de documento pró-forma numa obra"
        icon={<FileText className="w-5 h-5 text-indigo-600" />}
        maxWidth="md"
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Selecionar Obra <span className="text-red-500">*</span>
            </label>
            <select
              value={modalProjectId}
              onChange={(e) => setModalProjectId(e.target.value)}
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
                    if (!modalTitle.trim()) {
                      const cleanName = f.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")
                      setModalTitle(cleanName)
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Identificação / Nº Pró-Forma <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={modalTitle}
                onChange={(e) => setModalTitle(e.target.value)}
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
                value={modalAmount}
                onChange={(e) => setModalAmount(e.target.value)}
                placeholder="Ex: 5000"
                className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-300 focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="flex-1 py-2.5 rounded-[4px] text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-300 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isUploading || !modalFile || !modalTitle.trim() || !modalProjectId}
              className="flex-1 py-2.5 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isUploading ? (
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
