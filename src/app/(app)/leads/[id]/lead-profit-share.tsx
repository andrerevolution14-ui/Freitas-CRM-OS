'use client'

import { useState, useTransition } from 'react'
import { formatCurrency, cn } from '@/lib/utils'
import { toggleLeadProfitShare } from '@/server/actions/leads'

interface LeadProfitShareProps {
  leadId: string
  provisionalProfit: number | null
  initialAndrePaid: boolean
  initialJorgePaid: boolean
  initialProfitShareSettled: boolean
}

export function LeadProfitShareSection({
  leadId,
  provisionalProfit,
  initialAndrePaid,
  initialJorgePaid,
  initialProfitShareSettled,
}: LeadProfitShareProps) {
  const [andrePaid, setAndrePaid] = useState(initialAndrePaid)
  const [jorgePaid, setJorgePaid] = useState(initialJorgePaid)
  const [profitShareSettled, setProfitShareSettled] = useState(initialProfitShareSettled)
  const [isPending, startTransition] = useTransition()

  const profit = provisionalProfit ?? 0
  const andreShare = profit > 0 ? profit * 0.4 : 0
  const jorgeShare = profit > 0 ? profit * 0.6 : 0

  async function handleToggle(field: 'andrePaid' | 'jorgePaid' | 'profitShareSettled') {
    startTransition(async () => {
      try {
        const payload: any = {}
        if (field === 'andrePaid') {
          payload.andrePaid = !andrePaid
        }
        if (field === 'jorgePaid') {
          payload.jorgePaid = !jorgePaid
        }
        if (field === 'profitShareSettled') {
          const next = !profitShareSettled
          payload.profitShareSettled = next
          payload.andrePaid = next
          payload.jorgePaid = next
        }

        const res = await toggleLeadProfitShare(leadId, payload)
        setAndrePaid(res.andrePaid)
        setJorgePaid(res.jorgePaid)
        setProfitShareSettled(res.profitShareSettled)
      } catch (err: any) {
        console.error('Error updating lead profit share:', err)
        alert(err?.message || 'Erro ao atualizar partilha')
      }
    })
  }

  return (
    <div className="bg-white border border-slate-200 rounded-[4px] p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-[3px] bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">
              %
            </span>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Partilha de Lucro Provisório (40% / 60%)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {provisionalProfit != null
              ? `Calculado sobre o lucro provisório da lead (${formatCurrency(provisionalProfit)}).`
              : 'Nenhum lucro provisório definido ainda. Edite a lead para definir o valor.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-[10px] font-bold px-2 py-0.5 rounded-[3px] border uppercase tracking-wider',
              profitShareSettled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            )}
          >
            {profitShareSettled ? '✓ Liquidada' : '⏳ Pendente'}
          </span>
          <button
            type="button"
            disabled={isPending || profit <= 0}
            onClick={() => handleToggle('profitShareSettled')}
            className={cn(
              'px-2.5 py-1 rounded-[3px] text-xs font-semibold border transition-all active:scale-95 cursor-pointer disabled:opacity-40',
              profitShareSettled
                ? 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
            )}
          >
            {profitShareSettled ? 'Marcar Pendente' : 'Liquidar Tudo'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* André - 40% */}
        <div className="p-3.5 rounded-[4px] bg-slate-50 border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  AQ
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">André Queirós</h4>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">40%</span>
                </div>
              </div>
              <span
                className={cn(
                  'text-[9.5px] font-bold px-1.5 py-0.5 rounded-[2px] border uppercase tracking-wider',
                  andrePaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                )}
              >
                {andrePaid ? 'Liquidado' : 'Pendente'}
              </span>
            </div>

            <div className="text-xs space-y-1 pt-1.5 border-t border-slate-200/70">
              <div className="flex justify-between">
                <span className="text-slate-500">Valor Previsto:</span>
                <span className="font-bold text-slate-900">{formatCurrency(andreShare)}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={isPending || profit <= 0}
            onClick={() => handleToggle('andrePaid')}
            className={cn(
              'mt-3 w-full py-1.5 rounded-[3px] text-xs font-semibold border transition-all active:scale-95 cursor-pointer disabled:opacity-40',
              andrePaid
                ? 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
            )}
          >
            {andrePaid ? 'Desmarcar André' : 'Assinalar André'}
          </button>
        </div>

        {/* Jorge - 60% */}
        <div className="p-3.5 rounded-[4px] bg-slate-50 border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center">
                  JF
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Jorge Freitas</h4>
                  <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">60%</span>
                </div>
              </div>
              <span
                className={cn(
                  'text-[9.5px] font-bold px-1.5 py-0.5 rounded-[2px] border uppercase tracking-wider',
                  jorgePaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                )}
              >
                {jorgePaid ? 'Liquidado' : 'Pendente'}
              </span>
            </div>

            <div className="text-xs space-y-1 pt-1.5 border-t border-slate-200/70">
              <div className="flex justify-between">
                <span className="text-slate-500">Valor Previsto:</span>
                <span className="font-bold text-slate-900">{formatCurrency(jorgeShare)}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={isPending || profit <= 0}
            onClick={() => handleToggle('jorgePaid')}
            className={cn(
              'mt-3 w-full py-1.5 rounded-[3px] text-xs font-semibold border transition-all active:scale-95 cursor-pointer disabled:opacity-40',
              jorgePaid
                ? 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                : 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700'
            )}
          >
            {jorgePaid ? 'Desmarcar Jorge' : 'Assinalar Jorge'}
          </button>
        </div>
      </div>
    </div>
  )
}
