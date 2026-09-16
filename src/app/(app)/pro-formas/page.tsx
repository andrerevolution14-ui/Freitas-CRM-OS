import { getGeneralTemplates } from '@/server/actions/templates'
import { ProFormasClient } from './pro-formas-client'

export const metadata = {
  title: 'Biblioteca de Pró-Formas & Modelos Gerais | Freitas OS',
  description: 'Repositório central de minutas, faturas pró-forma tipo e documentos modelo da Freitas Renovações',
}

export const revalidate = 0

export default async function ProFormasPage() {
  const templates = await getGeneralTemplates()
  return <ProFormasClient initialTemplates={templates} />
}
