'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import { deleteLead } from '@/server/actions/leads'

export function DeleteLeadButton({ leadId, clientName }: { leadId: string; clientName: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    if (!confirm(`Tem a certeza que deseja eliminar o contacto de "${clientName}" permanentemente?`)) return
    startTransition(async () => {
      await deleteLead(leadId)
      router.push('/leads')
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      title="Eliminar este contacto"
      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-[4px] border border-slate-200 transition-colors flex items-center justify-center disabled:opacity-50"
    >
      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
    </button>
  )
}
