'use server'

import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
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

const DATA_FILE_PATH = join(process.cwd(), 'src', 'data', 'general-templates.json')

export async function getGeneralTemplates(): Promise<GeneralTemplate[]> {
  try {
    const raw = await readFile(DATA_FILE_PATH, 'utf-8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.error('Error reading templates file:', err)
    return []
  }
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
  await mkdir(join(process.cwd(), 'src', 'data'), { recursive: true })
  await writeFile(DATA_FILE_PATH, JSON.stringify(updated, null, 2), 'utf-8')

  revalidatePath('/pro-formas')
  return newTemplate
}

export async function deleteGeneralTemplate(id: string): Promise<boolean> {
  const current = await getGeneralTemplates()
  const filtered = current.filter((t) => t.id !== id)
  await writeFile(DATA_FILE_PATH, JSON.stringify(filtered, null, 2), 'utf-8')

  revalidatePath('/pro-formas')
  return true
}
