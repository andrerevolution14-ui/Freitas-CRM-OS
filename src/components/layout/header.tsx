'use client'

import { useState } from 'react'
import Image from 'next/image'
import { StickyNote, X, Plus, Loader2 } from 'lucide-react'
import { createNote } from '@/server/actions/notes'
import { useSession } from 'next-auth/react'
import { UserAvatar } from '@/components/ui/user-avatar'

export function Header({ title }: { title?: string }) {
  const [showNotesWidget, setShowNotesWidget] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [noteTitle, setNoteTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const { data: session } = useSession()
  const user = session?.user as { name?: string; color?: string; image?: string } | undefined

  async function handleSaveNote() {
    if (!noteContent.trim()) return
    setSaving(true)
    await createNote({ title: noteTitle || undefined, content: noteContent })
    setNoteContent('')
    setNoteTitle('')
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 1500)
    setTimeout(() => setShowNotesWidget(false), 1800)
  }

  return (
    <header className="fixed top-0 left-0 md:left-[220px] right-0 h-14 flex items-center justify-between pl-3 pr-3.5 sm:px-6 z-30 bg-[#07090e]/95 backdrop-blur-md border-b border-white/[0.07]">
      {/* Left: mobile large logo + desktop title */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="md:hidden relative w-[105px] h-[38px] flex items-center justify-start flex-shrink-0">
          <Image
            src="/logo.png"
            alt="Freitas Renovações"
            width={105}
            height={38}
            className="object-contain object-left w-full h-full filter drop-shadow-[0_2px_8px_rgba(255,255,255,0.08)]"
            priority
          />
        </div>
        <h1 className="hidden md:block text-[13px] font-semibold text-slate-200 tracking-tight truncate">
          {title || 'Freitas OS'}
        </h1>
      </div>

      {/* Right: quick note + user avatar */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <button
          onClick={() => setShowNotesWidget(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 transition-all active:scale-95"
        >
          <StickyNote className="w-3.5 h-3.5 text-amber-400" />
          <span>+ Nota</span>
        </button>

        {/* User avatar */}
        <UserAvatar
          name={user?.name}
          color={user?.color}
          image={user?.image}
          size={32}
          className="ring-1 ring-white/20 shadow-sm"
        />
      </div>

      {/* Solid Opaque Centered Modal for Quick Note */}
      {showNotesWidget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNotesWidget(false)
          }}
        >
          <div className="w-full max-w-sm bg-[#121624] border border-white/20 rounded-2xl p-5 shadow-2xl text-left">
            <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-white/[0.08]">
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-amber-400" />
                Criar Nota Rápida
              </p>
              <button
                onClick={() => setShowNotesWidget(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <input
                type="text"
                placeholder="Título da nota (opcional)"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs text-white placeholder-slate-500 bg-[#191e30] border border-white/15 focus:outline-none focus:border-amber-500"
                autoFocus
              />
              <textarea
                placeholder="Escreve o teu apontamento ou recado aqui..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 rounded-xl text-xs text-white placeholder-slate-500 bg-[#191e30] border border-white/15 resize-none focus:outline-none focus:border-amber-500"
              />

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowNotesWidget(false)}
                  className="flex-1 py-2 rounded-xl text-xs text-slate-400 hover:text-white border border-white/10 hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveNote}
                  disabled={saving || !noteContent.trim()}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:opacity-90 active:scale-95 shadow-lg shadow-amber-600/20 transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      A guardar...
                    </>
                  ) : saved ? (
                    '✓ Guardado!'
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Guardar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
