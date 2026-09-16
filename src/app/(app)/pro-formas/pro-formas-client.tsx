'use client'

import { useState, useTransition } from 'react'
import {
  FileText, Plus, Search, X, Upload, Loader2, Trash2, Download,
  ExternalLink, Copy, Check, FileCheck, Layers, BookOpen, Sparkles
} from 'lucide-react'
import { GeneralTemplate, deleteGeneralTemplate } from '@/server/actions/templates'
import { Modal } from '@/components/ui/modal'
import { formatDate, cn } from '@/lib/utils'

const CATEGORIES = [
  'Todos',
  'Pró-Formas',
  'Autos de Medição',
  'Contratos & Minutas',
  'Termos & Garantias',
]

export function ProFormasClient({ initialTemplates }: { initialTemplates: GeneralTemplate[] }) {
  const [templates, setTemplates] = useState<GeneralTemplate[]>(initialTemplates)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [modalCategory, setModalCategory] = useState('Pró-Formas')
  const [modalDescription, setModalDescription] = useState('')
  const [modalFile, setModalFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Filter templates
  const filtered = templates.filter((tpl) => {
    if (selectedCategory !== 'Todos' && tpl.category !== selectedCategory) {
      return false
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchTitle = tpl.title.toLowerCase().includes(q)
      const matchDesc = tpl.description.toLowerCase().includes(q)
      const matchFile = tpl.fileName.toLowerCase().includes(q)
      return matchTitle || matchDesc || matchFile
    }
    return true
  })

  const proFormasCount = templates.filter((t) => t.category === 'Pró-Formas').length
  const autosCount = templates.filter((t) => t.category === 'Autos de Medição').length
  const contratosCount = templates.filter((t) => t.category === 'Contratos & Minutas' || t.category === 'Termos & Garantias').length

  function handleCopyLink(fileUrl: string, id: string) {
    const fullUrl = `${window.location.origin}${fileUrl}`
    navigator.clipboard.writeText(fullUrl)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!modalFile || !modalTitle.trim()) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', modalFile)
    formData.append('title', modalTitle.trim())
    formData.append('category', modalCategory)
    formData.append('description', modalDescription.trim())

    try {
      const res = await fetch('/api/upload-template', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.template) {
        setTemplates((prev) => [data.template, ...prev])
        setShowModal(false)
        setModalTitle('')
        setModalDescription('')
        setModalCategory('Pró-Formas')
        setModalFile(null)
      } else {
        alert(data.error || 'Erro ao carregar modelo')
      }
    } catch (err) {
      console.error('Upload error:', err)
      alert('Erro de comunicação ao carregar modelo')
    } finally {
      setIsUploading(false)
    }
  }

  function handleDelete(id: string) {
    if (!confirm('Tem a certeza que deseja remover este modelo da biblioteca geral?')) return

    startTransition(async () => {
      await deleteGeneralTemplate(id)
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    })
  }

  function getBadgeColor(category: string) {
    switch (category) {
      case 'Pró-Formas':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'Autos de Medição':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'Contratos & Minutas':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'Termos & Garantias':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200'
    }
  }

  function getFileExtBadge(fileName: string) {
    const ext = fileName.split('.').pop()?.toUpperCase() || 'DOC'
    if (ext === 'PDF') return 'bg-red-50 text-red-700 border-red-200'
    if (ext === 'XLSX' || ext === 'XLS') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (ext === 'DOCX' || ext === 'DOC') return 'bg-blue-50 text-blue-700 border-blue-200'
    return 'bg-slate-50 text-slate-700 border-slate-200'
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white border border-slate-200 rounded-[4px] shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              Biblioteca Central de Minutas
            </span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Documentos Gerais & Exemplos Tipo
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Faturas Pró-Forma & Documentos Modelo
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Repositório de modelos e minutas de uso geral. Documentos exemplo prontos para descarregar, preencher e utilizar nas propostas, adiantamentos e cobranças da empresa (não associados a nenhuma obra específica).
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-[4px] shadow-sm transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Adicionar Modelo</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-[4px] p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Total de Modelos</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{templates.length}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Minutas e ficheiros no repositório</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-[4px]">
            <BookOpen className="w-5 h-5 text-slate-700" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[4px] p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-0.5">Minutas Pró-Forma</p>
            <p className="text-2xl font-bold text-blue-600 tracking-tight">{proFormasCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Adiantamentos, tranches e fechos</p>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-[4px]">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[4px] p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-0.5">Autos & Contratos Tipo</p>
            <p className="text-2xl font-bold text-emerald-600 tracking-tight">{autosCount + contratosCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Medições e termos de garantia</p>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-[4px]">
            <Layers className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-[4px] p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-[3px] transition-all whitespace-nowrap border',
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  {cat}
                </button>
              )
            })}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px] sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar modelo ou minuta..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-[3px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-[4px] p-12 text-center shadow-sm">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Nenhum modelo encontrado</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search
              ? 'Nenhum resultado corresponde aos termos da pesquisa.'
              : 'Ainda não existem modelos registados nesta categoria.'}
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-[4px]"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar Primeiro Modelo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((tpl) => {
            const ext = tpl.fileName.split('.').pop()?.toUpperCase() || 'DOC'
            const isDefault = tpl.isDefault

            return (
              <div
                key={tpl.id}
                className="bg-white border border-slate-200 rounded-[4px] p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all group"
              >
                <div>
                  {/* Card Header: Category & File format */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-[3px] text-[10px] font-bold uppercase tracking-wider border',
                        getBadgeColor(tpl.category)
                      )}
                    >
                      {tpl.category}
                    </span>

                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-[3px] text-[10px] font-bold font-mono tracking-wider border uppercase',
                        getFileExtBadge(tpl.fileName)
                      )}
                    >
                      {ext} • {tpl.fileSize || 'DOC'}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-sm font-bold text-slate-900 leading-snug tracking-tight mb-2 group-hover:text-blue-600 transition-colors">
                    {tpl.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-3 mb-4 leading-relaxed">
                    {tpl.description}
                  </p>
                </div>

                {/* Card Footer: Metadata & Actions */}
                <div className="pt-3 border-t border-slate-100 mt-auto">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-3">
                    <span className="truncate max-w-[170px]" title={tpl.fileName}>
                      {tpl.fileName}
                    </span>
                    <span>{formatDate(tpl.createdAt)}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {/* Direct Download */}
                    <a
                      href={tpl.fileUrl}
                      download={tpl.fileName}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-[3px] transition-all active:scale-95 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descarregar</span>
                    </a>

                    {/* Open/Preview */}
                    <a
                      href={tpl.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Pré-visualizar documento"
                      className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-[3px] transition-colors border border-slate-200"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    {/* Copy Link */}
                    <button
                      onClick={() => handleCopyLink(tpl.fileUrl, tpl.id)}
                      title="Copiar link direto"
                      className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-[3px] transition-colors border border-slate-200"
                    >
                      {copiedId === tpl.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(tpl.id)}
                      disabled={isPending}
                      title="Eliminar este modelo"
                      className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-[3px] transition-colors border border-slate-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Adicionar Novo Modelo Geral */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          if (!isUploading) setShowModal(false)
        }}
        title="Adicionar Novo Modelo / Minuta Geral"
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-[4px] text-xs text-blue-800 leading-relaxed">
            <strong>Biblioteca de Documentos Tipo:</strong> Este ficheiro ficará disponível como minuta/exemplo de utilização geral para toda a equipa (não associado a nenhuma obra).
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Nome do Modelo / Minuta *
            </label>
            <input
              type="text"
              required
              value={modalTitle}
              onChange={(e) => setModalTitle(e.target.value)}
              placeholder="Ex: Minuta Fatura Pró-Forma - Materiais Especiais"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-[4px] text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Categoria *
            </label>
            <select
              value={modalCategory}
              onChange={(e) => setModalCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-[4px] text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors cursor-pointer"
            >
              <option value="Pró-Formas">Pró-Formas (Faturas / Adiantamentos / Fechos)</option>
              <option value="Autos de Medição">Autos de Medição / Folhas de Cálculo</option>
              <option value="Contratos & Minutas">Contratos & Minutas de Empreitada</option>
              <option value="Termos & Garantias">Termos & Garantias / Declarações de Quitação</option>
              <option value="Outros Modelos">Outros Modelos & Fichas Tipo</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Descrição & Instruções de Uso
            </label>
            <textarea
              rows={3}
              value={modalDescription}
              onChange={(e) => setModalDescription(e.target.value)}
              placeholder="Descreva quando e como deve ser utilizado este modelo exemplo..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-[4px] text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Ficheiro do Modelo (PDF, Word, Excel, Imagem) *
            </label>
            <input
              type="file"
              required
              onChange={(e) => setModalFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-[3px] file:border-0 file:text-xs file:font-bold file:uppercase file:tracking-wider file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer cursor-pointer border border-slate-300 rounded-[4px] p-1.5 bg-slate-50"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-100 rounded-[4px] transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isUploading || !modalFile || !modalTitle.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-[4px] shadow-sm transition-all active:scale-95"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>A guardar...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Guardar Modelo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
