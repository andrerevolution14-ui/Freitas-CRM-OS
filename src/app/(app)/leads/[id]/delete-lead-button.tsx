'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, RotateCcw, Loader2 } from 'lucide-react'
import { deleteLead, restoreLead } from '@/server/actions/leads'
import { DeleteLeadModal } from '@/components/leads/delete-lead-modal'

export function DeleteLeadButton({
  leadId,
  clientName,
  isDeleted = false,
}: {
  leadId: string
  clientName: string
  isDeleted?: boolean
}) {
  const [showModal, setShowModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  async function handleConfirmDelete(reason: string) {
    startTransition(async () => {
      try {
        await deleteLead(leadId, reason)
        setShowModal(false)
        router.replace('/leads')
      } catch (err: any) {
        console.error('Error deleting lead:', err)
        alert(err?.message || 'Erro ao eliminar lead')
      }
    })
  }

  function handleRestore() {
    if (!confirm(`Deseja restaurar a lead de "${clientName}" para o funil ativo?`)) return
    startTransition(async () => {
      try {
        await restoreLead(leadId)
        router.refresh()
      } catch (err: any) {
        console.error('Error restoring lead:', err)
        alert(err?.message || 'Erro ao restaurar lead')
      }
    })
  }

  if (isDeleted) {
    return (
      <button
        onClick={handleRestore}
        disabled={isPending}
        title="Restaurar lead para o funil ativo"
        className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-[4px] border border-emerald-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
      >
        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
        <span>Restaurar Lead</span>
      </button>
    )
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={isPending}
        title="Mover lead para o lixo"
        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-[4px] border border-slate-200 transition-colors flex items-center justify-center disabled:opacity-50"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </button>

      <DeleteLeadModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleConfirmDelete}
        clientName={clientName}
        isPending={isPending}
      />
    </>
  )
}

