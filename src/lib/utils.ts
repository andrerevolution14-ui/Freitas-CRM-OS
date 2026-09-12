import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function calcMargin(contractValue: number, totalExpenses: number): number {
  if (contractValue === 0) return 0
  const profit = contractValue - totalExpenses
  return (profit / contractValue) * 100
}

export function getMarginColor(margin: number): string {
  if (margin >= 25) return 'text-emerald-400'
  if (margin >= 15) return 'text-amber-400'
  return 'text-red-400'
}

export function getMarginBg(margin: number): string {
  if (margin >= 25) return 'bg-emerald-400/10 border-emerald-400/30'
  if (margin >= 15) return 'bg-amber-400/10 border-amber-400/30'
  return 'bg-red-400/10 border-red-400/30'
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    NOVA_LEAD: 'Nova Lead',
    VISITA_AGENDADA: 'Visita Agendada',
    ORCAMENTO_ENVIADO: 'Orçamento Enviado',
    CONTRATO_ASSINADO: 'Contrato Assinado',
    PERDIDA: 'Perdida',
    EM_PLANEAMENTO: 'Em Planeamento',
    EM_EXECUCAO: 'Em Execução',
    PAUSADA: 'Pausada',
    CONCLUIDA: 'Concluída',
    PENDENTE: 'Pendente',
    PAGO: 'Pago',
    ATRASADO: 'Atrasado',
    MATERIAL: 'Material',
    MAO_DE_OBRA: 'Mão de Obra',
    SUBEMPREITEIRO: 'Subempreiteiro',
    LICENCAS_E_TAXAS: 'Licenças e Taxas',
    GERAL_OVERHEAD: 'Geral / Overhead',
    PEDREIRO: 'Pedreiro',
    PICHELEIRO_CANALIZADOR: 'Picheleiro / Canalizador',
    ELETRICISTA: 'Eletricista',
    PINTOR: 'Pintor',
    CARPINTEIRO: 'Carpinteiro',
    PLADURISTA: 'Pladurista',
    CAPOTISTA: 'Capotista',
    OUTRO: 'Outro',
  }
  return labels[status] || status
}
