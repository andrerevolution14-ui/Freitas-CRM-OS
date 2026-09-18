'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Loader2 } from 'lucide-react'
import { updateLead } from '@/server/actions/leads'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/utils'

const SOURCES = [
  'Meta Ads',
  'Google Ads',
  'Recomendação',
  'Website',
  'Passa-a-palavra',
  'Outro',
]

interface EditLeadButtonProps {
  lead: {
    id: string
    clientName: string
    phone: string
    email?: string | null
    address: string
    source?: string | null
    estimatedValue?: number | null
    urgency?: string | null
    status: string
  }
}

export function EditLeadButton({ lead }: EditLeadButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState({
    clientName: lead.clientName,
    phone: lead.phone,
    email: lead.email || '',
    address: lead.address,
    source: lead.source || 'Meta Ads',
    estimatedValue: lead.estimatedValue ? String(lead.estimatedValue) : '',
    urgency: lead.urgency || 'Sem pressa',
    status: lead.status,
  })

  function handleOpen() {
    setForm({
      clientName: lead.clientName,
      phone: lead.phone,
      email: lead.email || '',
      address: lead.address,
      source: lead.source || 'Meta Ads',
      estimatedValue: lead.estimatedValue ? String(lead.estimatedValue) : '',
      urgency: lead.urgency || 'Sem pressa',
      status: lead.status,
    })
    setIsOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.clientName.trim() || !form.phone.trim() || !form.address.trim()) {
      alert('Por favor preencha o nome, telefone e morada.')
      return
    }

    startTransition(async () => {
      try {
        await updateLead(lead.id, {
          clientName: form.clientName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          address: form.address.trim(),
          source: form.source,
          estimatedValue: form.estimatedValue ? parseFloat(form.estimatedValue) : null,
          urgency: form.urgency,
          status: form.status,
        })
        setIsOpen(false)
        router.refresh()
      } catch (err: any) {
        console.error('Error updating lead:', err)
        alert(err?.message || 'Erro ao atualizar dados da lead')
      }
    })
  }

  return (
    <>
      <button
        onClick={handleOpen}
        title="Editar dados desta lead"
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-blue-700 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-[4px] shadow-2xs transition-all uppercase tracking-wider"
      >
        <Pencil className="w-3.5 h-3.5 text-blue-600" />
        <span>Editar Lead</span>
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Editar Negócio / Lead"
        subtitle={`Atualizar informação de ${lead.clientName}`}
        icon={<Pencil className="w-5 h-5 text-blue-600" />}
      >
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {[
            { label: 'Nome do Cliente / Oportunidade *', key: 'clientName', type: 'text', placeholder: 'Ex: Sofia Ribeiro', required: true },
            { label: 'Telefone de Contacto *', key: 'phone', type: 'tel', placeholder: '912 345 678', required: true },
            { label: 'Email', key: 'email', type: 'email', placeholder: 'sofia@exemplo.pt', required: false },
            { label: 'Morada da Obra *', key: 'address', type: 'text', placeholder: 'Rua Principal, 45, Porto', required: true },
            { label: 'Valor Estimado do Negócio (€)', key: 'estimatedValue', type: 'number', placeholder: '45000', required: false },
          ].map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{field.label}</label>
              <input
                type={field.type}
                required={field.required}
                placeholder={field.placeholder}
                value={(form as Record<string, string>)[field.key]}
                onChange={(e) => setForm((p) => ({ ...p, [field.key]: e.target.value }))}
                className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-white border border-slate-300 focus:outline-none focus:border-blue-600"
              />
            </div>
          ))}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Canal de Origem</label>
              <select
                value={form.source}
                onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))}
                className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 bg-white border border-slate-300 focus:outline-none focus:border-blue-600"
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fase da Oportunidade</label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full px-3 py-2 rounded-[4px] text-xs sm:text-sm text-slate-900 bg-white border border-slate-300 focus:outline-none focus:border-blue-600 font-semibold"
              >
                <option value="NOVA_LEAD">Leads (Nova Lead)</option>
                <option value="VISITA_AGENDADA">Visita (Agendada / Realizada)</option>
                <option value="ORCAMENTO_ENVIADO">Orçamento Enviado</option>
                <option value="CONTRATO_ASSINADO">Fechado / Ganho</option>
                <option value="PERDIDA">Perdida</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Urgência do Negócio</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'Imediatamente', label: 'Imediatamente', color: 'border-red-300 text-red-700 bg-red-50/70', active: 'ring-2 ring-red-500 bg-red-100/90 font-extrabold' },
                { value: 'Curto prazo', label: 'Curto prazo', color: 'border-amber-300 text-amber-700 bg-amber-50/70', active: 'ring-2 ring-amber-500 bg-amber-100/90 font-extrabold' },
                { value: 'Sem pressa', label: 'Sem pressa', color: 'border-slate-300 text-slate-700 bg-slate-50', active: 'ring-2 ring-slate-500 bg-slate-200 font-extrabold' },
              ].map((urg) => (
                <button
                  key={urg.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, urgency: urg.value }))}
                  className={cn(
                    'py-2 px-2 text-xs font-semibold rounded-[4px] border transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer',
                    urg.color,
                    form.urgency === urg.value && urg.active
                  )}
                >
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full',
                      urg.value === 'Imediatamente' ? 'bg-red-600' : urg.value === 'Curto prazo' ? 'bg-amber-500' : 'bg-slate-400'
                    )}
                  />
                  <span>{urg.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 py-2.5 rounded-[4px] text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 rounded-[4px] text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-60 transition-all shadow-md shadow-blue-600/20"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>A guardar...</span>
                </>
              ) : (
                'Guardar Alterações'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
