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
} from 'lucide-react'
import { createNote, deleteNote } from '@/server/actions/notes'
import { formatDate, cn } from '@/lib/utils'
import { UserAvatar } from '@/components/ui/user-avatar'

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
  const [form, setForm] = useState({
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

  async function handleDelete(id: string) {
    startTransition(async () => {
      await deleteNote(id)
      setNotes((prev) => prev.filter((n) => n.id !== id))
    })
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <StickyNote className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Freitas OS · Notas
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Notas</h1>
          <p className="text-sm text-slate-400 mt-1">{notes.length} notas registadas</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white ios-interactive"
          style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
        >
          <Plus className="w-4 h-4" /> Nova Nota
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar notas..."
          className="w-full pl-9 pr-4 py-2 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none bg-[#16181f] border border-white/10"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="p-5 space-y-3 animate-fade-in rounded-2xl bg-[#121624] border border-amber-500/30 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-white flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-yellow-400" /> Nova Nota
            </p>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          <input
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Título (opcional)"
            className={inputClass}
          />

          <textarea
            value={form.content}
            onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
            placeholder="Escreve a tua nota..."
            rows={4}
            required
            className={cn(inputClass, 'resize-none')}
          />

          {/* Associations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Project association */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                <HardHat className="w-3 h-3 text-blue-400" /> Associar a Obra (opcional)
              </label>
              <select
                value={form.projectId}
                onChange={(e) => setForm((p) => ({ ...p, projectId: e.target.value, leadId: '' }))}
                className={inputClass}
              >
                <option value="">Nenhuma obra</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Lead association */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                <FolderKanban className="w-3 h-3 text-purple-400" /> Associar a Lead / Cliente (opcional)
              </label>
              <select
                value={form.leadId}
                onChange={(e) => setForm((p) => ({ ...p, leadId: e.target.value, projectId: '' }))}
                className={inputClass}
              >
                <option value="">Nenhum lead</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.clientName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white border border-white/10 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 shadow-md shadow-amber-600/20 flex items-center gap-2 disabled:opacity-60 transition-all"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Guardar Nota'}
            </button>
          </div>
        </form>
      )}

      {/* Notes list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <StickyNote className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{search ? 'Nenhuma nota encontrada' : 'Sem notas ainda'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map((note) => (
            <div
              key={note.id}
              className="p-4 sm:p-5 rounded-2xl bg-[#121624] border border-white/10 hover:border-amber-500/30 transition-all group relative min-w-0 w-full"
            >
              {/* Delete */}
              <button
                onClick={() => handleDelete(note.id)}
                className="absolute top-3 right-3 text-slate-500 sm:opacity-0 sm:group-hover:opacity-100 hover:text-red-400 p-1 transition-all"
                title="Eliminar nota"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {note.title && (
                <p className="text-sm font-semibold text-white mb-2 pr-6">{note.title}</p>
              )}
              <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{note.content}</p>

              <div
                className="mt-4 pt-3 flex items-center justify-between gap-2"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
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
                  <p className="text-[10px] text-slate-600">{formatDate(note.createdAt)}</p>
                </div>

                {/* Links */}
                <div className="flex items-center gap-2">
                  {note.project && (
                    <Link
                      href={`/obras/${note.project.id}`}
                      className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span className="truncate max-w-[90px]">{note.project.title}</span>
                    </Link>
                  )}
                  {note.lead && (
                    <Link
                      href={`/leads`}
                      className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      <LinkIcon className="w-3 h-3" />
                      {note.lead.clientName}
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
