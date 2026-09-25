import { getNotes } from '@/server/actions/notes'
import { prisma } from '@/lib/prisma'
import { NotasClient } from './notas-client'

export const metadata = { title: 'Notas — Freitas OS' }
export const revalidate = 10

export default async function NotasPage() {
  const [notes, projects, leads] = await Promise.all([
    getNotes(),
    prisma.project.findMany({
      select: { id: true, title: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.lead.findMany({
      where: { deletedAt: null },
      select: { id: true, clientName: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return <NotasClient notes={notes as any} projects={projects} leads={leads} />
}
