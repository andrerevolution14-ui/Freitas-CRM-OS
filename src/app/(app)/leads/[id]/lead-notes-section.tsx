'use client'

import { useState, useTransition } from 'react'
import { Plus, StickyNote, Edit3, Trash2, Check, X, Loader2 } from 'lucide-react'
import { createNote, updateNote, deleteNote } from '@/server/actions/notes'
import { formatDate } from '@/lib/utils'
import { UserAvatar } from '@/components/ui/user-avatar'

type NoteItem = {
  id: string
  title: string | null
  content: string
  createdAt: Date | string
  createdBy?: { id: string; name: string; color: string; image?: string | null } | null
}

interface Props {
  leadId: string
  initialNotes: NoteItem[]
}

export function LeadNotesSection({ leadId, initialNotes }: Props) {
  const [notes, setNotes] = useState<NoteItem[]>(initialNotes)
  const [isAdding, setIsAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')

  const [isPending, startTransition] = useTransition()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newContent.trim()) return

    startTransition(async () => {
      const created = await createNote({
        title: newTitle.trim() || undefined,
        content: newContent.trim(),
        leadId,
      })
      setNotes((prev) => [created as any, ...prev])
      setNewTitle('')
      setNewContent('')
      setIsAdding(false)
    })
  }

  function startEditing(note: NoteItem) {
    setEditingId(note.id)
    setEditTitle(note.title || '')
    setEditContent(note.content)
  }

  function cancelEditing() {
    setEditingId(null)
    setEditTitle('')
    setEditContent('')
  }

  async function handleUpdate(id: string, e: React.FormEvent) {
    e.preventDefault()
    if (!editContent.trim()) return

    startTransition(async () => {
      const updated = await updateNote(id, {
        title: editTitle.trim() || undefined,
        content: editContent.trim(),
      })
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, title: updated.title, content: updated.content }
            : n
        )
      )
      setEditingId(null)
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
    <div className="bg-white border border-slate-200 rounded-[4px] p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-amber-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Notas do Cliente ({notes.length})
          </h2>
        </div>

        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-[3px] border border-amber-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Nota</span>
          </button>
        )}
      </div>

      {/* Add note form */}
      {isAdding && (
        <form onSubmit={handleCreate} className="p-3.5 rounded-[4px] bg-amber-50/60 border border-amber-200 space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Título (Opcional)
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ex: Reunião de alinhamento, telefonema..."
              className="w-full px-3 py-1.5 text-xs rounded-[4px] bg-white border border-slate-300 focus:outline-none focus:border-amber-600 text-slate-900"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Conteúdo da Nota *
            </label>
            <textarea
              required
              rows={3}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Escreva os apontamentos para esta lead..."
              className="w-full px-3 py-1.5 text-xs rounded-[4px] bg-white border border-slate-300 focus:outline-none focus:border-amber-600 text-slate-900 resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded bg-white border border-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !newContent.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded shadow-sm disabled:opacity-60 transition-all"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Guardar Nota</span>
            </button>
          </div>
        </form>
      )}

      {/* Notes list */}
      {notes.length === 0 && !isAdding ? (
        <div className="text-center py-8 text-slate-400">
          <StickyNote className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs font-medium">Sem notas registadas para esta lead.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="p-3.5 rounded-[4px] bg-slate-50 border border-slate-200 hover:border-amber-300 transition-all group"
            >
              {editingId === note.id ? (
                <form onSubmit={(e) => handleUpdate(note.id, e)} className="space-y-2.5">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Título da nota..."
                    className="w-full px-2.5 py-1.5 text-xs rounded bg-white border border-slate-300 focus:outline-none focus:border-amber-600 font-bold text-slate-900"
                  />
                  <textarea
                    required
                    rows={3}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded bg-white border border-slate-300 focus:outline-none focus:border-amber-600 text-slate-800 resize-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 rounded"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isPending || !editContent.trim()}
                      className="flex items-center gap-1 px-3 py-1 text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 rounded shadow-xs"
                    >
                      {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      <span>Guardar</span>
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
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEditing(note)}
                        className="p-1 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded"
                        title="Editar nota"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Eliminar nota"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed mt-1">
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
          ))}
        </div>
      )}
    </div>
  )
}
