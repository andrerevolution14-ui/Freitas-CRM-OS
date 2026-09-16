import { getAllProFormas, getProjects } from '@/server/actions/projects'
import { ProFormasClient } from './pro-formas-client'

export const metadata = {
  title: 'Faturas Pró-Forma | Freitas OS',
  description: 'Gestão centralizada de faturas pró-forma e documentos comerciais da Freitas Renovações',
}

export const revalidate = 0

export default async function ProFormasPage() {
  const [documents, projects] = await Promise.all([
    getAllProFormas(),
    getProjects(),
  ])

  return <ProFormasClient initialDocuments={documents as any} projects={projects as any} />
}
