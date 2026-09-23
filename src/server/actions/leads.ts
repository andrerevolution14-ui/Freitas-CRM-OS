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
  provisionalProfit?: number
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
    email: string | null
    address: string
    source: string
    estimatedValue: number | null
    provisionalProfit: number | null
    andrePaid: boolean
    jorgePaid: boolean
    profitShareSettled: boolean
    status: string
    urgency: string
  }>
) {
  try {
    const updatePayload: any = { ...data }
    if ('estimatedValue' in updatePayload) {
      if (
        updatePayload.estimatedValue === '' ||
        updatePayload.estimatedValue === null ||
        updatePayload.estimatedValue === undefined
      ) {
        updatePayload.estimatedValue = null
      } else {
        const parsed = Number(updatePayload.estimatedValue)
        updatePayload.estimatedValue = isNaN(parsed) ? null : parsed
      }
    }
    if ('provisionalProfit' in updatePayload) {
      if (
        updatePayload.provisionalProfit === '' ||
        updatePayload.provisionalProfit === null ||
        updatePayload.provisionalProfit === undefined
      ) {
        updatePayload.provisionalProfit = null
      } else {
        const parsed = Number(updatePayload.provisionalProfit)
        updatePayload.provisionalProfit = isNaN(parsed) ? null : parsed
      }
    }
    if ('email' in updatePayload && !updatePayload.email) {
      updatePayload.email = null
    }

    if (('andrePaid' in updatePayload || 'jorgePaid' in updatePayload) && !('profitShareSettled' in updatePayload)) {
      const current = await prisma.lead.findUnique({ where: { id }, select: { andrePaid: true, jorgePaid: true } })
      const nextAndre = 'andrePaid' in updatePayload ? !!updatePayload.andrePaid : current?.andrePaid
      const nextJorge = 'jorgePaid' in updatePayload ? !!updatePayload.jorgePaid : current?.jorgePaid
      updatePayload.profitShareSettled = !!(nextAndre && nextJorge)
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: updatePayload,
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
  } catch (error: any) {
    console.error('Error updating lead:', error)
    throw new Error(error?.message || 'Erro ao atualizar lead')
  }
}

export async function updateLeadStatus(id: string, status: string) {
  try {
    const lead = await prisma.lead.update({ where: { id }, data: { status } })
    revalidatePath('/leads')
    revalidatePath('/dashboard')
    return lead
  } catch (error: any) {
    console.error('Error updating lead status:', error)
    throw new Error(error?.message || 'Erro ao atualizar estado da lead')
  }
}

export async function deleteLead(id: string) {
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Delete all notes attached to this lead
      await tx.note.deleteMany({ where: { leadId: id } })
      // 2. Unlink any project referencing this lead so the Obra is not broken or blocking
      await tx.project.updateMany({
        where: { leadId: id },
        data: { leadId: null },
      })
      // 3. Delete the lead itself
      await tx.lead.delete({ where: { id } })
    })

    revalidatePath('/leads')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting lead:', error)
    throw new Error(error?.message || 'Erro ao eliminar lead')
  }
}

function sanitizeDate(date?: Date | string | null): Date | undefined {
  if (!date) return undefined
  const d = typeof date === 'string' ? new Date(date) : date
  if (!(d instanceof Date) || isNaN(d.getTime())) return undefined
  const year = d.getFullYear()
  if (year < 1970 || year > 2100) return undefined
  return d
}

export async function toggleLeadProfitShare(
  id: string,
  data: {
    andrePaid?: boolean
    jorgePaid?: boolean
    profitShareSettled?: boolean
  }
) {
  const current = await prisma.lead.findUnique({ where: { id } })
  if (!current) throw new Error('Lead não encontrada')

  const nextAndre = data.andrePaid !== undefined ? data.andrePaid : current.andrePaid
  const nextJorge = data.jorgePaid !== undefined ? data.jorgePaid : current.jorgePaid
  const nextSettled =
    data.profitShareSettled !== undefined
      ? data.profitShareSettled
      : nextAndre && nextJorge

  const updated = await prisma.lead.update({
    where: { id },
    data: {
      andrePaid: nextAndre,
      jorgePaid: nextJorge,
      profitShareSettled: nextSettled,
    },
  })
  revalidatePath('/leads')
  revalidatePath(`/leads/${id}`)
  revalidatePath('/dashboard')
  return updated
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
      provisionalProfit: lead.provisionalProfit,
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
