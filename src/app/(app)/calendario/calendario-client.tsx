'use client'

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
  X,
  Loader2,
  StickyNote,
  HardHat,
  FolderKanban,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { createNote } from '@/server/actions/notes'

interface CalProject {
  id: string
  title: string
  clientName: string
  status: string
  startDate: string | null
  endDate: string | null
}

interface CalTranche {
  id: string
  description: string
  amount: number
  dueDate: string
  status: string
  projectId: string
  project: { title: string }
}

interface CalLead { id: string; clientName: string; status: string; createdAt: string }

interface Props {
  projects: CalProject[]
  tranches: CalTranche[]
  leads: CalLead[]
}

type CalEvent = {
  id: string
  label: string
  type: 'project-start' | 'project-end' | 'tranche' | 'note'
  color: string
  href?: string
  subLabel?: string
  isNote?: boolean
}

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DAYS_FULL = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const DAYS_MOBILE = ['D','S','T','Q','Q','S','S']

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function parseKey(key: string) {
  const [y,m,d] = key.split('-').map(Number)
  return new Date(y, m-1, d, 12)
}

export function CalendarioClient({ projects, tranches, leads }: Props) {
  const today = new Date()
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState<string | null>(toDateKey(today))
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [noteForm, setNoteForm] = useState({ title: '', content: '', projectId: '', leadId: '' })
  const [isPending, startTransition] = useTransition()
  const [savedNotes, setSavedNotes] = useState<{key: string; label: string}[]>([])

  function prevMonth() { setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth()-1, 1)) }
  function nextMonth() { setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 1)) }
  function goToday()   { setViewDate(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDay(toDateKey(today)) }

  // Build event map
  const eventMap = useMemo(() => {
    const map: Record<string, CalEvent[]> = {}
    function add(key: string, ev: CalEvent) { if (!map[key]) map[key]=[]; map[key].push(ev) }

    for (const p of projects) {
      if (p.startDate) add(toDateKey(new Date(p.startDate)), { id:`ps-${p.id}`, label:`▶ ${p.title}`, type:'project-start', color:'#3b82f6', href:`/obras/${p.id}`, subLabel:p.clientName })
      if (p.endDate)   add(toDateKey(new Date(p.endDate)),   { id:`pe-${p.id}`, label:`■ ${p.title}`, type:'project-end',   color:'#8b5cf6', href:`/obras/${p.id}`, subLabel:'Fim previsto' })
    }
    for (const t of tranches) {
      const color = t.status === 'PAGO' ? '#10b981' : t.status === 'ATRASADO' ? '#ef4444' : '#f59e0b'
      add(toDateKey(new Date(t.dueDate)), { id:`tr-${t.id}`, label:`€ ${t.project.title}`, type:'tranche', color, href:`/obras/${t.projectId}`, subLabel:formatCurrency(t.amount) })
    }
    for (const n of savedNotes) {
      add(n.key, { id:`note-${n.key}`, label:`📌 ${n.label}`, type:'note', color:'#f59e0b', isNote:true })
    }
    return map
  }, [projects, tranches, savedNotes])

  // Calendar grid
  const calDays = useMemo(() => {
    const year = viewDate.getFullYear(), month = viewDate.getMonth()
    const daysInMonth = new Date(year, month+1, 0).getDate()
    const firstDay = new Date(year, month, 1).getDay()
    const days: (null | {date:Date; key:string})[] = []
    for (let i=0; i<firstDay; i++) days.push(null)
    for (let d=1; d<=daysInMonth; d++) {
      const date = new Date(year, month, d)
      days.push({ date, key: toDateKey(date) })
    }
    return days
  }, [viewDate])

  const todayKey = toDateKey(today)
  const selectedEvents = selectedDay ? (eventMap[selectedDay] || []) : []

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault()
    if (!noteForm.content.trim() || !selectedDay) return
    startTransition(async () => {
      const eventDate = parseKey(selectedDay)
      await createNote({
        title: noteForm.title || undefined,
        content: noteForm.content,
        projectId: noteForm.projectId || undefined,
        leadId: noteForm.leadId || undefined,
        eventDate,
      })
      setSavedNotes(prev => [...prev, { key: selectedDay, label: noteForm.title || noteForm.content.slice(0,20) }])
      setNoteForm({ title:'', content:'', projectId:'', leadId:'' })
      setShowCreateModal(false)
    })
  }

  const selectedDateLabel = selectedDay
    ? parseKey(selectedDay).toLocaleDateString('pt-PT', { weekday:'long', day:'numeric', month:'long' })
    : ''

  const inputClass = 'bank-input text-sm'

  return (
    <div className="space-y-4 animate-fade-in max-w-[1280px] mx-auto pb-10">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Agenda</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {MONTHS[viewDate.getMonth()]} <span className="text-slate-500 font-light">{viewDate.getFullYear()}</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { if (selectedDay) setShowCreateModal(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all ios-interactive shadow-sm shadow-blue-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Adicionar Evento</span>
            <span className="sm:hidden">Evento</span>
          </button>
          <button onClick={goToday} className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.09] transition-all border border-white/[0.06]">
            Hoje
          </button>
          <button onClick={prevMonth} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={nextMonth} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend — compact */}
      <div className="glass-card px-3 py-2 flex items-center gap-3 flex-wrap text-[10px] sm:text-xs overflow-x-auto">
        {[
          { color:'#3b82f6', label:'Início Obra' },
          { color:'#8b5cf6', label:'Fim Previsto' },
          { color:'#f59e0b', label:'Tranche Pend.' },
          { color:'#10b981', label:'Tranche Paga' },
          { color:'#ef4444', label:'Em Atraso' },
          { color:'#f59e0b', label:'📌 Nota/Evento' },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1 whitespace-nowrap">
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background:l.color }} />
            <span className="text-slate-400">{l.label}</span>
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

        {/* ─── Calendar Grid ─── */}
        <div className="lg:col-span-3 glass-card p-2 sm:p-3">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_FULL.map((d, i) => (
              <div key={d} className="text-center py-1">
                <span className="hidden sm:inline text-[10px] font-bold text-slate-500 uppercase">{d}</span>
                <span className="sm:hidden text-[10px] font-bold text-slate-500 uppercase">{DAYS_MOBILE[i]}</span>
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-0.5">
            {calDays.map((cell, i) => {
              if (!cell) return <div key={`e-${i}`} />
              const events = eventMap[cell.key] || []
              const isToday = cell.key === todayKey
              const isSelected = cell.key === selectedDay
              return (
                <button
                  key={cell.key}
                  onClick={() => setSelectedDay(cell.key)}
                  className={cn(
                    'cal-day p-1 text-left relative',
                    isSelected ? 'bg-blue-500/10 border-blue-500/30' : 'border-transparent'
                  )}
                >
                  {/* Date number */}
                  <div
                    className={cn(
                      'w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full text-[10px] sm:text-xs font-semibold mb-0.5',
                      isToday ? 'bg-blue-500 text-white' : 'text-slate-400'
                    )}
                  >
                    {cell.date.getDate()}
                  </div>
                  {/* Events */}
                  <div className="space-y-0.5">
                    {events.slice(0,2).map(ev => (
                      <div
                        key={ev.id}
                        className="cal-event"
                        style={{ background: ev.color+'20', color: ev.color }}
                      >
                        <span className="hidden sm:inline">{ev.label}</span>
                        <span className="sm:hidden">●</span>
                      </div>
                    ))}
                    {events.length > 2 && (
                      <div className="text-[8px] sm:text-[9px] text-slate-500 font-semibold pl-0.5">+{events.length-2}</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ─── Day Panel ─── */}
        <div className="glass-card p-4 flex flex-col gap-3 h-fit">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dia selecionado</p>
              <p className="text-sm font-bold text-white mt-0.5 capitalize">{selectedDateLabel || '—'}</p>
            </div>
            {selectedDay && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex-shrink-0 p-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-all"
                title="Adicionar evento neste dia"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {selectedEvents.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-600">
              <CalendarDays className="w-7 h-7 mx-auto mb-2 opacity-20" />
              Sem eventos
            </div>
          ) : (
            <div className="space-y-1.5">
              {selectedEvents.map(ev => (
                ev.href ? (
                  <Link
                    key={ev.id}
                    href={ev.href}
                    className="flex items-start gap-2 p-2.5 rounded-lg hover:bg-white/[0.04] transition-all group"
                    style={{ borderLeft: `3px solid ${ev.color}` }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate group-hover:text-blue-300 transition-colors">{ev.label}</p>
                      {ev.subLabel && <p className="text-[10px] text-slate-500 mt-0.5">{ev.subLabel}</p>}
                    </div>
                    <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-white flex-shrink-0 mt-0.5" />
                  </Link>
                ) : (
                  <div
                    key={ev.id}
                    className="flex items-start gap-2 p-2.5 rounded-lg"
                    style={{ borderLeft: `3px solid ${ev.color}` }}
                  >
                    <p className="text-xs font-semibold text-white truncate">{ev.label}</p>
                  </div>
                )
              ))}
            </div>
          )}

          {/* Upcoming tranches */}
          <div className="mt-1 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-2">Próximas Tranches</p>
            {tranches
              .filter(t => t.status !== 'PAGO' && new Date(t.dueDate) >= today)
              .slice(0, 4)
              .map(t => (
                <Link key={t.id} href={`/obras/${t.projectId}`}
                  className="flex items-center justify-between py-1.5 px-1 hover:bg-white/[0.03] rounded transition-all group"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-slate-300 truncate max-w-[120px] group-hover:text-white transition-colors">{t.project.title}</p>
                    <p className="text-[9px] text-slate-600">{new Date(t.dueDate).toLocaleDateString('pt-PT')}</p>
                  </div>
                  <span className="text-[10px] font-bold ml-1 flex-shrink-0" style={{ color: t.status==='ATRASADO'?'#ef4444':'#f59e0b' }}>
                    {formatCurrency(t.amount)}
                  </span>
                </Link>
              ))}
            {tranches.filter(t => t.status!=='PAGO' && new Date(t.dueDate)>=today).length === 0 && (
              <p className="text-[10px] text-slate-600 text-center py-2">Sem tranches pendentes</p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Event Creation Modal ─── */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target===e.currentTarget) setShowCreateModal(false) }}>
          <div className="modal-box p-5 sm:p-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nova Nota / Evento</p>
                <p className="text-base font-bold text-white mt-0.5 capitalize">{selectedDateLabel}</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06] transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Título</label>
                <input
                  placeholder="Ex: Reunião com cliente, Compra de material..."
                  value={noteForm.title}
                  onChange={e => setNoteForm(p => ({ ...p, title: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Descrição <span className="text-red-400">*</span></label>
                <textarea
                  required
                  placeholder="Detalhes do evento ou nota..."
                  value={noteForm.content}
                  onChange={e => setNoteForm(p => ({ ...p, content: e.target.value }))}
                  rows={3}
                  className={`${inputClass} resize-none`}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    <HardHat className="w-3 h-3 inline mr-1 text-blue-400" />Obra
                  </label>
                  <select
                    value={noteForm.projectId}
                    onChange={e => setNoteForm(p => ({ ...p, projectId: e.target.value, leadId:'' }))}
                    className={inputClass}
                  >
                    <option value="">Sem associação</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    <FolderKanban className="w-3 h-3 inline mr-1 text-purple-400" />Lead
                  </label>
                  <select
                    value={noteForm.leadId}
                    onChange={e => setNoteForm(p => ({ ...p, leadId: e.target.value, projectId:'' }))}
                    className={inputClass}
                  >
                    <option value="">Sem associação</option>
                    {leads.map(l => <option key={l.id} value={l.id}>{l.clientName}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium text-slate-400 border border-white/[0.08] hover:text-white hover:border-white/[0.15] transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || !noteForm.content.trim()}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white ios-interactive flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
                >
                  {isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />A guardar...</> : <>
                    <StickyNote className="w-3.5 h-3.5" />Guardar Evento</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
