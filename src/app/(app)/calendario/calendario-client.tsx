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
import { Modal } from '@/components/ui/modal'

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
            <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Agenda</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {MONTHS[viewDate.getMonth()]} <span className="text-slate-400 font-light">{viewDate.getFullYear()}</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { if (selectedDay) setShowCreateModal(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-sm shadow-blue-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Adicionar Evento</span>
            <span className="sm:hidden">Evento</span>
          </button>
          <button onClick={goToday} className="px-3 py-1.5 rounded-[4px] text-xs font-semibold uppercase text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-all border border-slate-200">
            Hoje
          </button>
          <button onClick={prevMonth} className="p-1.5 rounded-[4px] text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all border border-slate-200">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={nextMonth} className="p-1.5 rounded-[4px] text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all border border-slate-200">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend — compact rectangular */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-[4px] px-3 py-2 flex items-center gap-3 flex-wrap text-[10px] sm:text-xs overflow-x-auto">
        {[
          { color:'#2563eb', label:'Início Obra' },
          { color:'#7c3aed', label:'Fim Previsto' },
          { color:'#d97706', label:'Tranche Pend.' },
          { color:'#059669', label:'Tranche Paga' },
          { color:'#dc2626', label:'Em Atraso' },
          { color:'#d97706', label:'📌 Nota/Evento' },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1 whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-[2px] flex-shrink-0" style={{ background:l.color }} />
            <span className="text-slate-600 font-medium">{l.label}</span>
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

        {/* ─── Calendar Grid ─── */}
        <div className="lg:col-span-3 bg-white border border-slate-200 shadow-sm rounded-[4px] p-2 sm:p-3">
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
                    'cal-day p-1 text-left relative rounded-[4px] border',
                    isSelected ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500/30' : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  {/* Date number */}
                  <div
                    className={cn(
                      'w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-[3px] text-[10px] sm:text-xs font-bold mb-0.5',
                      isToday ? 'bg-blue-600 text-white' : 'text-slate-700'
                    )}
                  >
                    {cell.date.getDate()}
                  </div>
                  {/* Events */}
                  <div className="space-y-0.5">
                    {events.slice(0,2).map(ev => (
                      <div
                        key={ev.id}
                        className="cal-event rounded-[2px]"
                        style={{ background: ev.color+'18', color: ev.color }}
                      >
                        <span className="hidden sm:inline">{ev.label}</span>
                        <span className="sm:hidden">●</span>
                      </div>
                    ))}
                    {events.length > 2 && (
                      <div className="text-[8px] sm:text-[9px] text-slate-400 font-semibold pl-0.5">+{events.length-2}</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ─── Day Panel ─── */}
        <div className="glass-card p-4 flex flex-col gap-3 h-fit shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dia selecionado</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5 capitalize">{selectedDateLabel || '—'}</p>
            </div>
            {selectedDay && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex-shrink-0 p-1.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all border border-blue-200"
                title="Adicionar evento neste dia"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {selectedEvents.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">
              <CalendarDays className="w-7 h-7 mx-auto mb-2 opacity-30" />
              Sem eventos
            </div>
          ) : (
            <div className="space-y-1.5">
              {selectedEvents.map(ev => (
                ev.href ? (
                  <Link
                    key={ev.id}
                    href={ev.href}
                    className="flex items-start gap-2 p-2.5 rounded hover:bg-slate-50 border border-slate-200 transition-all group"
                    style={{ borderLeft: `3px solid ${ev.color}` }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{ev.label}</p>
                      {ev.subLabel && <p className="text-[10px] text-slate-500 mt-0.5">{ev.subLabel}</p>}
                    </div>
                    <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-slate-800 flex-shrink-0 mt-0.5" />
                  </Link>
                ) : (
                  <div
                    key={ev.id}
                    className="flex items-start gap-2 p-2.5 rounded border border-slate-200 bg-slate-50"
                    style={{ borderLeft: `3px solid ${ev.color}` }}
                  >
                    <p className="text-xs font-semibold text-slate-900 truncate">{ev.label}</p>
                  </div>
                )
              ))}
            </div>
          )}

          {/* Upcoming tranches */}
          <div className="mt-1 pt-3 border-t border-slate-100">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Próximas Tranches</p>
            {tranches
              .filter(t => t.status !== 'PAGO' && new Date(t.dueDate) >= today)
              .slice(0, 4)
              .map(t => (
                <Link key={t.id} href={`/obras/${t.projectId}`}
                  className="flex items-center justify-between py-1.5 px-1 hover:bg-slate-50 rounded transition-all group"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-slate-700 truncate max-w-[120px] group-hover:text-blue-600 transition-colors">{t.project.title}</p>
                    <p className="text-[9px] text-slate-400">{new Date(t.dueDate).toLocaleDateString('pt-PT')}</p>
                  </div>
                  <span className="text-[10px] font-bold ml-1 flex-shrink-0" style={{ color: t.status==='ATRASADO'?'#dc2626':'#d97706' }}>
                    {formatCurrency(t.amount)}
                  </span>
                </Link>
              ))}
            {tranches.filter(t => t.status!=='PAGO' && new Date(t.dueDate)>=today).length === 0 && (
              <p className="text-[10px] text-slate-400 text-center py-2">Sem tranches pendentes</p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Event Creation Modal (Portal) ─── */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nova Nota / Evento"
        subtitle={selectedDateLabel ? selectedDateLabel.toUpperCase() : undefined}
        icon={<StickyNote className="w-5 h-5 text-amber-600" />}
        maxWidth="md"
      >
        <form onSubmit={handleCreateEvent} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Título (Opcional)</label>
            <input
              placeholder="Ex: Reunião com cliente, Entrega de material..."
              value={noteForm.title}
              onChange={e => setNoteForm(p => ({ ...p, title: e.target.value }))}
              className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-300 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Descrição <span className="text-red-600">*</span>
            </label>
            <textarea
              required
              placeholder="Detalhes do evento, notas de visita ou lembretes..."
              value={noteForm.content}
              onChange={e => setNoteForm(p => ({ ...p, content: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-300 resize-none focus:outline-none focus:border-blue-600"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                <HardHat className="w-3.5 h-3.5 inline mr-1 text-blue-600" />Obra
              </label>
              <select
                value={noteForm.projectId}
                onChange={e => setNoteForm(p => ({ ...p, projectId: e.target.value, leadId:'' }))}
                className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 bg-white border border-slate-300 focus:outline-none focus:border-blue-600"
              >
                <option value="">Sem associação</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                <FolderKanban className="w-3.5 h-3.5 inline mr-1 text-purple-600" />Lead / CRM
              </label>
              <select
                value={noteForm.leadId}
                onChange={e => setNoteForm(p => ({ ...p, leadId: e.target.value, projectId:'' }))}
                className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 bg-white border border-slate-300 focus:outline-none focus:border-blue-600"
              >
                <option value="">Sem associação</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.clientName}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="flex-1 py-2.5 rounded-[4px] text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !noteForm.content.trim()}
              className="flex-1 py-2.5 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-md shadow-blue-600/20"
            >
              {isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />A guardar...</> : <>
                <StickyNote className="w-3.5 h-3.5" />Guardar Evento</>}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
