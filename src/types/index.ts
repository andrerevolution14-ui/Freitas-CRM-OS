export type LeadStatus =
  | 'NOVA_LEAD'
  | 'VISITA_AGENDADA'
  | 'ORCAMENTO_ENVIADO'
  | 'CONTRATO_ASSINADO'
  | 'PERDIDA'

export type LeadUrgency = 'Imediatamente' | 'Curto prazo' | 'Sem pressa'

export type ProjectStatus =
  | 'EM_PLANEAMENTO'
  | 'EM_EXECUCAO'
  | 'PAUSADA'
  | 'CONCLUIDA'

export type ExpenseCategory =
  | 'MATERIAL'
  | 'MAO_DE_OBRA'
  | 'SUBEMPREITEIRO'
  | 'LICENCAS_E_TAXAS'
  | 'GERAL_OVERHEAD'

export type PaymentStatus =
  | 'PENDENTE'
  | 'PAGO'
  | 'ATRASADO'

export type Specialty =
  | 'PEDREIRO'
  | 'PICHELEIRO_CANALIZADOR'
  | 'ELETRICISTA'
  | 'PINTOR'
  | 'CARPINTEIRO'
  | 'PLADURISTA'
  | 'CAPOTISTA'
  | 'OUTRO'

declare module '@prisma/client' {
  export type LeadStatus =
    | 'NOVA_LEAD'
    | 'VISITA_AGENDADA'
    | 'ORCAMENTO_ENVIADO'
    | 'CONTRATO_ASSINADO'
    | 'PERDIDA'

  export type ProjectStatus =
    | 'EM_PLANEAMENTO'
    | 'EM_EXECUCAO'
    | 'PAUSADA'
    | 'CONCLUIDA'

  export type ExpenseCategory =
    | 'MATERIAL'
    | 'MAO_DE_OBRA'
    | 'SUBEMPREITEIRO'
    | 'LICENCAS_E_TAXAS'
    | 'GERAL_OVERHEAD'

  export type PaymentStatus =
    | 'PENDENTE'
    | 'PAGO'
    | 'ATRASADO'

  export type Specialty =
    | 'PEDREIRO'
    | 'PICHELEIRO_CANALIZADOR'
    | 'ELETRICISTA'
    | 'PINTOR'
    | 'CARPINTEIRO'
    | 'PLADURISTA'
    | 'CAPOTISTA'
    | 'OUTRO'
}
