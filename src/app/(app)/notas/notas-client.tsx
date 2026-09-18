'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  StickyNote,
  Plus,
  Trash2,
  Search,
  X,
  Loader2,
  Link as LinkIcon,
  HardHat,
  FolderKanban,
  Edit3,
} from 'lucide-react'
import { createNote, updateNote, deleteNote } from '@/server/actions/notes'
import { formatDate, cn } from '@/lib/utils'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Modal } from '@/components/ui/modal'

type Author = { id: string; name: string; color: string; image?: string | null } | null

type Note = {
  id: string
  title: string | null
  content: string
  createdAt: Date
  lead: { id: string; clientName: string } | null
  project: { id: string; title: string } | null
  createdBy?: Author
}

interface Props {
  notes: Note[]
  projects: { id: string; title: string }[]
  leads: { id: string; clientName: string }[]
}

const inputClass = 'bank-input text-sm'

export function NotasClient({ notes: initial, projects, leads }: Props) {
  const [notes, setNotes] = useState(initial)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [form, setForm] = useState({
    title: '',
    content: '',
    projectId: '',
    leadId: '',
  })
  const [editForm, setEditForm] = useState({
    title: '',
    content: '',
    projectId: '',
    leadId: '',
  })
  const [isPending, startTransition] = useTransition()

  const filtered = notes.filter(
    (n) =>
      (n.title || '').toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
  )

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const note = await createNote({
        title: form.title || undefined,
        content: form.content,
        projectId: form.projectId || undefined,
        leadId: form.leadId || undefined,
      })
      setNotes((prev) => [note as any, ...prev])
      setForm({ title: '', content: '', projectId: '', leadId: '' })
      setShowForm(false)
    })
  }

  function openEditModal(note: Note) {
    setEditingNote(note)
    setEditForm({
      title: note.title || '',
      content: note.content,
      projectId: note.project?.id || '',
      leadId: note.lead?.id || '',
    })
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editingNote || !editForm.content.trim()) return

    startTransition(async () => {
      const updated = await updateNote(editingNote.id, {
        title: editForm.title || undefined,
        content: editForm.content,
        projectId: editForm.projectId || null,
        leadId: editForm.leadId || null,
      })

      setNotes((prev) =>
        prev.map((n) => (n.id === editingNote.id ? (updated as any) : n))
      )
      setEditingNote(null)
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminar esta nota?')) return
    startTransition(async () => {
      await deleteNote(id)
      setNotes((prev) => prev.filter((n) => n.id !== id))
    })
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Search & Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white border border-slate-200 shadow-sm rounded-[4px]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por título ou conteúdo..."
            className="w-full pl-9 pr-8 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-amber-600"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-3">
          <span className="text-xs text-slate-500 font-medium">
            <span className="text-slate-900 font-bold">{filtered.length}</span> notas
          </span>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Nota</span>
          </button>
        </div>
      </div>

      {/* Create Modal (Portal) */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Nova Nota"
        subtitle="Registar apontamento interno ou nota de obra/lead"
        icon={<StickyNote className="w-5 h-5 text-amber-600" />}
        maxWidth="md"
      >
        <form onSubmit={handleCreate} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Título (Opcional)</label>
            <input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Ex: Reunião com arquiteto, Orçamento adicional..."
              className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-300 focus:outline-none focus:border-amber-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Conteúdo <span className="text-red-600">*</span>
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
              placeholder="Escreva os apontamentos e detalhes da nota..."
              rows={4}
              required
              className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-300 resize-none focus:outline-none focus:border-amber-600"
              autoFocus
            />
          </div>

          {/* Associations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <HardHat className="w-3.5 h-3.5 text-blue-600" /> Associar a Obra
              </label>
              <select
                value={form.projectId}
                onChange={(e) => setForm((p) => ({ ...p, projectId: e.target.value, leadId: '' }))}
                className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 bg-white border border-slate-300 focus:outline-none focus:border-amber-600"
              >
                <option value="">Nenhuma obra</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <FolderKanban className="w-3.5 h-3.5 text-purple-600" /> Associar a Lead / CRM
              </label>
              <select
                value={form.leadId}
                onChange={(e) => setForm((p) => ({ ...p, leadId: e.target.value, projectId: '' }))}
                className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 bg-white border border-slate-300 focus:outline-none focus:border-amber-600"
              >
                <option value="">Nenhuma lead</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.clientName}
                  </option>
                ))}
              </select>
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
              disabled={isPending || !form.content.trim()}
              className="flex-1 py-2.5 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-amber-600 hover:bg-amber-700 flex items-center justify-center gap-2 disabled:opacity-60 transition-all shadow-md shadow-amber-600/20"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar Nota'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={Boolean(editingNote)}
        onClose={() => setEditingNote(null)}
        title="Editar Nota"
        subtitle="Atualizar apontamento ou associações"
        icon={<StickyNote className="w-5 h-5 text-amber-600" />}
        maxWidth="md"
      >
        <form onSubmit={handleUpdate} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Título (Opcional)</label>
            <input
              value={editForm.title}
              onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Ex: Reunião com arquiteto, Orçamento adicional..."
              className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-300 focus:outline-none focus:border-amber-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Conteúdo <span className="text-red-600">*</span>
            </label>
            <textarea
              value={editForm.content}
              onChange={(e) => setEditForm((p) => ({ ...p, content: e.target.value }))}
              placeholder="Escreva os apontamentos e detalhes da nota..."
              rows={4}
              required
              className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-300 resize-none focus:outline-none focus:border-amber-600"
              autoFocus
            />
          </div>

          {/* Associations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <HardHat className="w-3.5 h-3.5 text-blue-600" /> Associar a Obra
              </label>
              <select
                value={editForm.projectId}
                onChange={(e) => setEditForm((p) => ({ ...p, projectId: e.target.value, leadId: '' }))}
                className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 bg-white border border-slate-300 focus:outline-none focus:border-amber-600"
              >
                <option value="">Nenhuma obra</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <FolderKanban className="w-3.5 h-3.5 text-purple-600" /> Associar a Lead / CRM
              </label>
              <select
                value={editForm.leadId}
                onChange={(e) => setEditForm((p) => ({ ...p, leadId: e.target.value, projectId: '' }))}
                className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 bg-white border border-slate-300 focus:outline-none focus:border-amber-600"
              >
                <option value="">Nenhuma lead</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.clientName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setEditingNote(null)}
              className="flex-1 py-2.5 rounded-[4px] text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !editForm.content.trim()}
              className="flex-1 py-2.5 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-amber-600 hover:bg-amber-700 flex items-center justify-center gap-2 disabled:opacity-60 transition-all shadow-md shadow-amber-600/20"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Atualizar Nota'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Notes list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white border border-slate-200 rounded-[4px] shadow-xs">
          <StickyNote className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">{search ? 'Nenhuma nota encontrada' : 'Sem notas ainda'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((note) => (
            <div
              key={note.id}
              className="p-4 sm:p-5 rounded-[4px] bg-white border border-slate-200 hover:border-amber-400 transition-all group relative flex flex-col justify-between shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  {note.title ? (
                    <p className="text-sm font-bold text-slate-900 pr-6 leading-snug">{note.title}</p>
                  ) : (
                    <div />
                  )}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
                    <button
                      type="button"
                      onClick={() => openEditModal(note)}
                      className="text-slate-400 hover:text-amber-600 p-1 transition-all cursor-pointer"
                      title="Editar nota"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(note.id)}
                      className="text-slate-400 hover:text-red-600 p-1 transition-all cursor-pointer"
                      title="Eliminar nota"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{note.content}</p>
              </div>

              <div
                className="mt-4 pt-3 flex items-center justify-between gap-2 border-t border-slate-100"
              >
                {/* Author + Date */}
                <div className="flex items-center gap-1.5">
                  {note.createdBy && (
                    <UserAvatar
                      name={note.createdBy.name}
                      color={note.createdBy.color}
                      image={note.createdBy.image}
                      size={18}
                    />
                  )}
                  <p className="text-[10.5px] font-medium text-slate-400">{formatDate(note.createdAt)}</p>
                </div>

                {/* Links */}
                <div className="flex items-center gap-2">
                  {note.project && (
                    <Link
                      href={`/obras/${note.project.id}`}
                      className="flex items-center gap-1 text-[10.5px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-[3px] border border-blue-200 hover:bg-blue-100 transition-colors"
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span className="truncate max-w-[100px]">{note.project.title}</span>
                    </Link>
                  )}
                  {note.lead && (
                    <Link
                      href={`/leads`}
                      className="flex items-center gap-1 text-[10.5px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-[3px] border border-purple-200 hover:bg-purple-100 transition-colors"
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span className="truncate max-w-[100px]">{note.lead.clientName}</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
