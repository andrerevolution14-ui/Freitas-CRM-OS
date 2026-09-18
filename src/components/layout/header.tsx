'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { StickyNote, X, Plus, Loader2, LogOut, Users, ShieldCheck, ChevronDown, FileText, Globe, ExternalLink } from 'lucide-react'
import { createNote } from '@/server/actions/notes'
import { useSession, signOut } from 'next-auth/react'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Modal } from '@/components/ui/modal'

export function Header({ title }: { title?: string }) {
  const [showNotesWidget, setShowNotesWidget] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [noteTitle, setNoteTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const { data: session } = useSession()
  const user = session?.user as { name?: string; email?: string; color?: string; image?: string; role?: string } | undefined

  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

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
    <header className="fixed top-0 left-0 md:left-[220px] right-0 h-14 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs px-3.5 sm:px-5 lg:px-7">
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between h-full">
        {/* Left: mobile logo + desktop title */}
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/dashboard" className="md:hidden relative w-[105px] h-[38px] flex items-center justify-start flex-shrink-0">
            <Image
              src="/logo.png"
              alt="Freitas Renovações"
              width={105}
              height={38}
              className="object-contain object-left w-full h-full"
              priority
            />
          </Link>
          <h1 className="hidden md:block text-[13px] font-bold text-slate-800 tracking-tight truncate">
            {title || 'Freitas OS'}
          </h1>
        </div>

        {/* Right: quick note + user avatar button */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <button
            onClick={() => setShowNotesWidget(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-all active:scale-95 uppercase tracking-wider"
          >
            <StickyNote className="w-3.5 h-3.5 text-amber-600" />
            <span>+ Nota</span>
          </button>

          {/* User profile dropdown trigger */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu((v) => !v)}
              className="flex items-center gap-1.5 p-0.5 rounded-[4px] hover:ring-2 hover:ring-blue-500/40 transition-all active:scale-95"
              aria-label="Menu do utilizador"
            >
              <UserAvatar
                name={user?.name}
                color={user?.color}
                image={user?.image}
                size={32}
                className="ring-1 ring-slate-200 shadow-sm"
              />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div
                className="absolute right-0 top-11 w-64 bg-white border border-slate-200 rounded-[4px] p-3 shadow-xl z-50 animate-fade-in text-slate-900"
                style={{ boxShadow: '0 12px 30px rgba(0,0,0,0.12)' }}
              >
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 px-1">
                  <UserAvatar
                    name={user?.name}
                    color={user?.color}
                    image={user?.image}
                    size={38}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{user?.name || 'Administrador'}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email || ''}</p>
                    <span className="inline-flex items-center gap-1 mt-1 text-[9.5px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-[3px] border border-blue-200">
                      <ShieldCheck size={11} /> Admin
                    </span>
                  </div>
                </div>

                <div className="py-2 space-y-1">
                  {/* Mobile direct link to Equipa / Subempreiteiros */}
                  <Link
                    href="/subempreiteiros"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-[3px] text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  >
                    <Users className="w-4 h-4 text-amber-600" />
                    <span>Equipa & Subempreiteiros</span>
                  </Link>

                  <Link
                    href="/pro-formas"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-[3px] text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>Modelos & Pró-Formas</span>
                  </Link>

                  <a
                    href="https://grupofreitasrenovacoes.pt"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center justify-between px-2.5 py-2 rounded-[3px] text-xs font-semibold text-blue-700 hover:text-blue-800 hover:bg-blue-50 transition-colors"
                    title="Visitar Website do Grupo Freitas Renovações"
                  >
                    <span className="flex items-center gap-2.5">
                      <Globe className="w-4 h-4 text-blue-600" />
                      <span>Website Oficial</span>
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                  </a>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[3px] text-xs font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 text-red-600" />
                    <span>Terminar Sessão</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Note Modal (Portal) */}
      <Modal
        isOpen={showNotesWidget}
        onClose={() => setShowNotesWidget(false)}
        title="Criar Nota Rápida"
        subtitle="Registar apontamento ou recado"
        icon={<StickyNote className="w-4 h-4 text-amber-600" />}
        maxWidth="sm"
      >
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Título da nota (opcional)"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-300 focus:outline-none focus:border-blue-600"
            autoFocus
          />
          <textarea
            placeholder="Escreve o teu apontamento ou recado aqui..."
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-300 resize-none focus:outline-none focus:border-blue-600"
          />

          <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowNotesWidget(false)}
              className="flex-1 py-2 rounded-[4px] text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveNote}
              disabled={saving || !noteContent.trim()}
              className="flex-1 py-2 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-500 active:scale-98 shadow-md shadow-amber-600/20 transition-all disabled:opacity-50"
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
      </Modal>
    </header>
  )
}
