'use client'

import { useState } from 'react'
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'

const REASON_PRESETS = [
  'Cliente desistiu',
  'Orçamento recusado / Preço alto',
  'Contacto inválido / Sem resposta',
  'Fora de raio geográfico',
  'Lead duplicada',
  'Optou por outro concorrente',
]

interface DeleteLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => Promise<void> | void
  clientName: string
  isPending?: boolean
}

export function DeleteLeadModal({
  isOpen,
  onClose,
  onConfirm,
  clientName,
  isPending = false,
}: DeleteLeadModalProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  function handleSelectPreset(preset: string) {
    setError('')
    if (!reason.trim()) {
      setReason(preset)
    } else if (!reason.includes(preset)) {
      setReason((prev) => `${prev.trim()} - ${preset}`)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = reason.trim()
    if (!trimmed) {
      setError('Por favor, indique a razão ou justificação para eliminar esta lead.')
      return
    }
    setError('')
    await onConfirm(trimmed)
    setReason('')
  }

  function handleClose() {
    if (isPending) return
    setError('')
    setReason('')
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Mover Lead para o Lixo"
      subtitle={`Lead: ${clientName}`}
      icon={<Trash2 className="w-5 h-5 text-rose-600" />}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate-600 bg-rose-50/60 p-2.5 rounded border border-rose-200/80 leading-relaxed">
          Esta ação irá retirar a lead <strong className="text-slate-900">&quot;{clientName}&quot;</strong> do funil de vendas e arquivá-la na aba <span className="font-semibold text-rose-700">Lixo</span>.
        </p>

        {/* Reason Presets */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Motivos comuns (clique para preencher):
          </label>
          <div className="flex flex-wrap gap-1.5">
            {REASON_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`text-[11px] px-2.5 py-1 rounded-[4px] border transition-colors ${
                  reason.includes(preset)
                    ? 'bg-rose-50 border-rose-300 text-rose-700 font-semibold'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                }`}
              >
                + {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Reason Textarea */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1.5">
            Razão / Justificação da eliminação <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              if (error) setError('')
            }}
            rows={3}
            autoFocus
            placeholder="Ex: Cliente informou que adiou a obra para o próximo ano devido ao orçamento..."
            className={`w-full px-3 py-2 text-xs text-slate-900 placeholder-slate-400 bg-white border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition-all ${
              error ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
            }`}
          />
          {error && (
            <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </p>
          )}
          <p className="text-[10.5px] text-slate-400 mt-1">
            Esta justificação ficará visível diretamente na lista da Lixeira para fácil consulta.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-[4px] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-98 rounded-[4px] transition-all flex items-center gap-2 shadow-sm shadow-rose-600/30 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>A mover...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Mover para o Lixo</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
