'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/** Get the current user id from session (nullable) */
async function getCurrentUserId(): Promise<string | undefined> {
  const session = await getServerSession(authOptions)
  return (session?.user as { id?: string } | undefined)?.id ?? undefined
}

export async function getNotes() {
  return prisma.note.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      lead: true,
      project: true,
      createdBy: { select: { id: true, name: true, color: true, image: true } },
    },
  })
}

export async function createNote(data: {
  title?: string
  content: string
  leadId?: string
  projectId?: string
  eventDate?: string | Date
}) {
  const createdById = await getCurrentUserId()
  const note = await prisma.note.create({
    data: {
      ...data,
      eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
      createdById,
    },
    include: {
      lead: true,
      project: true,
      createdBy: { select: { id: true, name: true, color: true, image: true } },
    },
  })
  revalidatePath('/notas')
  revalidatePath('/leads')
  if (note.leadId) revalidatePath(`/leads/${note.leadId}`)
  if (note.projectId) revalidatePath(`/obras/${note.projectId}`)
  revalidatePath('/dashboard')
  return note
}

export async function updateNote(
  id: string,
  data: { title?: string; content: string; leadId?: string | null; projectId?: string | null }
) {
  const note = await prisma.note.update({
    where: { id },
    data,
    include: {
      lead: true,
      project: true,
      createdBy: { select: { id: true, name: true, color: true, image: true } },
    },
  })
  revalidatePath('/notas')
  revalidatePath('/leads')
  if (note.leadId) revalidatePath(`/leads/${note.leadId}`)
  if (note.projectId) revalidatePath(`/obras/${note.projectId}`)
  revalidatePath('/dashboard')
  return note
}

export async function deleteNote(id: string) {
  try {
    const note = await prisma.note.delete({ where: { id } })
    revalidatePath('/notas')
    revalidatePath('/leads')
    if (note.leadId) revalidatePath(`/leads/${note.leadId}`)
    if (note.projectId) revalidatePath(`/obras/${note.projectId}`)
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting note:', error)
    throw new Error(error?.message || 'Erro ao eliminar nota')
  }
}
