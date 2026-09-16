import { getLead } from '@/server/actions/leads'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Phone, Mail, MapPin, Euro, Calendar } from 'lucide-react'
import { formatCurrency, formatDate, getStatusLabel, cn } from '@/lib/utils'
import type { LeadStatus } from '@prisma/client'

const STATUS_COLOR: Record<LeadStatus, string> = {
  NOVA_LEAD: 'badge-blue',
  VISITA_AGENDADA: 'badge-purple',
  ORCAMENTO_ENVIADO: 'badge-yellow',
  CONTRATO_ASSINADO: 'badge-green',
  PERDIDA: 'badge-red',
}

import { DeleteLeadButton } from './delete-lead-button'

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const lead = await getLead(id)
  if (!lead) notFound()

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-[4px] shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/leads" className="text-slate-400 hover:text-slate-900 transition-colors p-1.5 hover:bg-slate-100 rounded-[3px]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{lead.clientName}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={cn('text-[10.5px] px-2 py-0.5 rounded-[3px] font-bold uppercase tracking-wider', STATUS_COLOR[lead.status as LeadStatus] || 'badge-gray')}>
                {getStatusLabel(lead.status)}
              </span>
              <span className="text-xs text-slate-500 font-medium">{lead.source}</span>
              {lead.project && (
                <Link href={`/obras/${lead.project.id}`} className="text-xs font-bold text-blue-600 hover:underline">
                  → Ver Obra associada
                </Link>
              )}
            </div>
          </div>
        </div>
        <DeleteLeadButton leadId={lead.id} clientName={lead.clientName} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-[4px] p-5 space-y-4 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Informação do Cliente</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-slate-400" />
              <a href={`tel:${lead.phone}`} className="text-slate-800 hover:text-blue-600 transition-colors font-medium">{lead.phone}</a>
            </div>
            {lead.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-slate-400" />
                <a href={`mailto:${lead.email}`} className="text-slate-800 hover:text-blue-600 transition-colors font-medium">{lead.email}</a>
              </div>
            )}
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
              <span className="text-slate-800">{lead.address}</span>
            </div>
            {lead.estimatedValue && (
              <div className="flex items-center gap-3 text-sm">
                <Euro className="w-4 h-4 text-slate-400" />
                <span className="text-emerald-600 font-bold">{formatCurrency(lead.estimatedValue)}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500 text-xs">Criado em {formatDate(lead.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[4px] p-5 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Notas do Cliente ({lead.notes.length})</h2>
          {lead.notes.length === 0 ? (
            <p className="text-sm text-slate-500 py-3">Sem notas ainda.</p>
          ) : (
            <div className="space-y-3">
              {lead.notes.map(note => (
                <div key={note.id} className="p-3.5 rounded-[4px] bg-slate-50 border border-slate-200">
                  {note.title && <p className="text-xs font-bold text-slate-900 mb-1">{note.title}</p>}
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                  <p className="text-[10.5px] text-slate-400 mt-2">{formatDate(note.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
