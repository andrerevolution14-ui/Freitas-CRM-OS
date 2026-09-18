'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

async function getCurrentUserId(): Promise<string | undefined> {
  const session = await getServerSession(authOptions)
  return (session?.user as { id?: string } | undefined)?.id ?? undefined
}

export async function getLeads() {
  return prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      project: true,
      notes: {
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { id: true, name: true, color: true, image: true } } },
      },
      _count: { select: { notes: true } },
      createdBy: { select: { id: true, name: true, color: true } },
    },
  })
}

export async function getLead(id: string) {
  return prisma.lead.findUnique({
    where: { id },
    include: {
      notes: {
        include: { createdBy: { select: { id: true, name: true, color: true, image: true } } },
        orderBy: { createdAt: 'desc' },
      },
      project: true,
      createdBy: { select: { id: true, name: true, color: true } },
    },
  })
}

export async function createLead(data: {
  clientName: string
  phone: string
  email?: string
  address: string
  source?: string
  estimatedValue?: number
  status?: string
  urgency?: string
}) {
  const createdById = await getCurrentUserId()
  const lead = await prisma.lead.create({
    data: {
      ...data,
      urgency: data.urgency || 'Sem pressa',
      createdById,
    },
    include: {
      project: true,
      notes: {
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { id: true, name: true, color: true, image: true } } },
      },
      _count: { select: { notes: true } },
      createdBy: { select: { id: true, name: true, color: true } },
    },
  })
  revalidatePath('/leads')
  revalidatePath('/dashboard')
  return lead
}

export async function updateLead(
  id: string,
  data: Partial<{
    clientName: string
    phone: string
    email: string
    address: string
    source: string
    estimatedValue: number
    status: string
    urgency: string
  }>
) {
  const lead = await prisma.lead.update({
    where: { id },
    data,
    include: {
      project: true,
      notes: {
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { id: true, name: true, color: true, image: true } } },
      },
      _count: { select: { notes: true } },
      createdBy: { select: { id: true, name: true, color: true } },
    },
  })
  revalidatePath('/leads')
  revalidatePath(`/leads/${id}`)
  revalidatePath('/dashboard')
  return lead
}

export async function updateLeadStatus(id: string, status: string) {
  const lead = await prisma.lead.update({ where: { id }, data: { status } })
  revalidatePath('/leads')
  revalidatePath('/dashboard')
  return lead
}

export async function deleteLead(id: string) {
  await prisma.lead.delete({ where: { id } })
  revalidatePath('/leads')
}

function sanitizeDate(date?: Date | string | null): Date | undefined {
  if (!date) return undefined
  const d = typeof date === 'string' ? new Date(date) : date
  if (!(d instanceof Date) || isNaN(d.getTime())) return undefined
  const year = d.getFullYear()
  if (year < 1970 || year > 2100) return undefined
  return d
}

export async function convertLeadToProject(
  leadId: string,
  projectData: {
    title: string
    contractValue: number
    startDate?: Date | string
    clientNIF?: string
  }
) {
  const createdById = await getCurrentUserId()
  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead) throw new Error('Lead não encontrada')

  const project = await prisma.project.create({
    data: {
      leadId,
      title: projectData.title,
      clientName: lead.clientName,
      clientNIF: projectData.clientNIF,
      address: lead.address,
      contractValue: projectData.contractValue,
      startDate: sanitizeDate(projectData.startDate),
      status: 'EM_PLANEAMENTO',
      createdById,
    },
  })

  await prisma.lead.update({
    where: { id: leadId },
    data: { status: 'CONTRATO_ASSINADO' },
  })

  revalidatePath('/leads')
  revalidatePath('/obras')
  revalidatePath('/dashboard')
  return project
}
