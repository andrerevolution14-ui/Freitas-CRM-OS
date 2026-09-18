'use server'

import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { revalidatePath } from 'next/cache'

export interface GeneralTemplate {
  id: string
  title: string
  category: string
  description: string
  fileUrl: string
  fileName: string
  fileType: string
  fileSize: string
  isDefault?: boolean
  createdAt: string
}

const DEFAULT_TEMPLATES: GeneralTemplate[] = [
  {
    id: "tpl-1",
    title: "Minuta Fatura Pró-Forma - Adiantamento Inicial (30%)",
    category: "Pró-Formas",
    description: "Modelo oficial de fatura pró-forma para requisição de sinal e adjudicação inicial da empreitada. Preencher com dados fiscais do cliente e dados da conta bancária.",
    fileUrl: "/templates/minuta_proforma_adiantamento_inicial.pdf",
    fileName: "minuta_proforma_adiantamento_inicial.pdf",
    fileType: "application/pdf",
    fileSize: "142 KB",
    isDefault: true,
    createdAt: "2026-01-15T10:00:00.000Z"
  },
  {
    id: "tpl-2",
    title: "Minuta Fatura Pró-Forma - Tranche Intermédia de Execução",
    category: "Pró-Formas",
    description: "Exemplo padrão para cobrança de tranches parciais condicionadas à conclusão de fases (demolições, instalações especiais, acabamentos).",
    fileUrl: "/templates/minuta_proforma_tranche_intermedia.pdf",
    fileName: "minuta_proforma_tranche_intermedia.pdf",
    fileType: "application/pdf",
    fileSize: "138 KB",
    isDefault: true,
    createdAt: "2026-01-20T11:30:00.000Z"
  },
  {
    id: "tpl-3",
    title: "Minuta Fatura Pró-Forma - Fecho de Obra & Garantia (10%)",
    category: "Pró-Formas",
    description: "Modelo para emissão de documento pró-forma de saldo final aquando da receção provisória da obra e entrega das chaves.",
    fileUrl: "/templates/minuta_proforma_fecho_obra.pdf",
    fileName: "minuta_proforma_fecho_obra.pdf",
    fileType: "application/pdf",
    fileSize: "156 KB",
    isDefault: true,
    createdAt: "2026-02-01T09:15:00.000Z"
  },
  {
    id: "tpl-4",
    title: "Modelo de Auto de Medição & Validação de Trabalhos",
    category: "Autos de Medição",
    description: "Ficha técnica em Excel para discriminar quantidades executadas no terreno vs orçamentadas, a anexar à fatura pró-forma para aprovação do cliente ou fiscalização.",
    fileUrl: "/templates/modelo_auto_medicao_trabalhos.xlsx",
    fileName: "modelo_auto_medicao_trabalhos.xlsx",
    fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    fileSize: "84 KB",
    isDefault: true,
    createdAt: "2026-02-10T14:00:00.000Z"
  },
  {
    id: "tpl-5",
    title: "Minuta Tipo de Contrato de Empreitada e Renovação",
    category: "Contratos & Minutas",
    description: "Contrato base padrão para obras particulares. Inclui cláusulas de prazo, condições de pagamento em tranches, penalidades e plano de trabalhos.",
    fileUrl: "/templates/minuta_tipo_contrato_empreitada.docx",
    fileName: "minuta_tipo_contrato_empreitada.docx",
    fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    fileSize: "195 KB",
    isDefault: true,
    createdAt: "2026-02-15T16:20:00.000Z"
  },
  {
    id: "tpl-6",
    title: "Termo de Garantia & Declaração de Quitação Pós-Obra",
    category: "Termos & Garantias",
    description: "Documento final assinado após receção definitiva para atestar a liquidação total de valores e formalizar o período de garantia legal de 5 anos.",
    fileUrl: "/templates/termo_garantia_e_quitacao.pdf",
    fileName: "termo_garantia_e_quitacao.pdf",
    fileType: "application/pdf",
    fileSize: "112 KB",
    isDefault: true,
    createdAt: "2026-02-22T08:45:00.000Z"
  }
]

const DATA_FILE_PATH = join(process.cwd(), 'src', 'data', 'general-templates.json')

export async function getGeneralTemplates(): Promise<GeneralTemplate[]> {
  try {
    const raw = await readFile(DATA_FILE_PATH, 'utf-8')
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed
    }
  } catch {
    // If file doesn't exist yet, we will write and return defaults below
  }

  try {
    await mkdir(dirname(DATA_FILE_PATH), { recursive: true })
    await writeFile(DATA_FILE_PATH, JSON.stringify(DEFAULT_TEMPLATES, null, 2), 'utf-8')
  } catch (err) {
    console.error('Error seeding default templates:', err)
  }

  return DEFAULT_TEMPLATES
}

export async function createGeneralTemplate(data: {
  title: string
  category: string
  description: string
  fileUrl: string
  fileName: string
  fileType: string
  fileSize: string
}): Promise<GeneralTemplate> {
  const current = await getGeneralTemplates()
  const newTemplate: GeneralTemplate = {
    id: `tpl-${Date.now()}`,
    title: data.title.trim(),
    category: data.category.trim() || 'Pró-Formas',
    description: data.description.trim() || 'Modelo exemplo para consulta e utilização nas atividades da empresa.',
    fileUrl: data.fileUrl,
    fileName: data.fileName,
    fileType: data.fileType,
    fileSize: data.fileSize,
    isDefault: false,
    createdAt: new Date().toISOString(),
  }

  const updated = [newTemplate, ...current]
  await mkdir(dirname(DATA_FILE_PATH), { recursive: true })
  await writeFile(DATA_FILE_PATH, JSON.stringify(updated, null, 2), 'utf-8')

  revalidatePath('/pro-formas')
  return newTemplate
}

export async function deleteGeneralTemplate(id: string): Promise<boolean> {
  try {
    const current = await getGeneralTemplates()
    const filtered = current.filter((t) => t.id !== id)
    await mkdir(dirname(DATA_FILE_PATH), { recursive: true })
    await writeFile(DATA_FILE_PATH, JSON.stringify(filtered, null, 2), 'utf-8')

    revalidatePath('/pro-formas')
    return true
  } catch (error: any) {
    console.error('Error deleting general template:', error)
    throw new Error(error?.message || 'Erro ao eliminar minuta pró-forma')
  }
}
