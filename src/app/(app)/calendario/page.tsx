import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/session'
import { CalendarioClient } from './calendario-client'

export const metadata = { title: 'Calendário — Freitas OS' }
export const revalidate = 10

export default async function CalendarioPage() {
  await requireAuth()

  const [projects, tranches, leads] = await Promise.all([
    prisma.project.findMany({
      select: { id: true, title: true, clientName: true, status: true, startDate: true, endDate: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.clientTranche.findMany({
      select: {
        id: true, description: true, amount: true, dueDate: true, status: true, projectId: true,
        project: { select: { title: true } },
      },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.lead.findMany({
      select: { id: true, clientName: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return (
    <CalendarioClient
      projects={projects as any}
      tranches={tranches as any}
      leads={leads as any}
    />
  )
}
