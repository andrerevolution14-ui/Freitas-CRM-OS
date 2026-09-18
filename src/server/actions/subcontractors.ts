'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import type { Specialty, PaymentStatus } from '@prisma/client'

export async function getSubcontractors() {
  return prisma.subcontractor.findMany({
    orderBy: { name: 'asc' },
    include: {
      payments: {
        include: { project: true },
        orderBy: { dueDate: 'desc' },
      },
    },
  })
}

export async function getSubcontractor(id: string) {
  return prisma.subcontractor.findUnique({
    where: { id },
    include: {
      payments: { include: { project: true }, orderBy: { dueDate: 'desc' } },
    },
  })
}

export async function createSubcontractor(data: {
  name: string
  companyName?: string
  phone: string
  specialty: Specialty
  rating?: number
  dailyRate?: number
  notes?: string
  isAvailable?: boolean
}) {
  const sub = await prisma.subcontractor.create({ data })
  revalidatePath('/subempreiteiros')
  return sub
}

export async function updateSubcontractor(id: string, data: Partial<{
  name: string
  companyName: string
  phone: string
  specialty: Specialty
  rating: number
  dailyRate: number
  notes: string
  isAvailable: boolean
}>) {
  const sub = await prisma.subcontractor.update({ where: { id }, data })
  revalidatePath('/subempreiteiros')
  return sub
}

export async function deleteSubcontractor(id: string) {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.subcontractorPayment.deleteMany({ where: { subcontractorId: id } })
      await tx.subcontractor.delete({ where: { id } })
    })
    revalidatePath('/subempreiteiros')
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting subcontractor:', error)
    throw new Error(error?.message || 'Erro ao eliminar subempreiteiro')
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

export async function createSubcontractorPayment(data: {
  projectId: string
  subcontractorId: string
  phaseDescription: string
  amount: number
  dueDate: Date | string
}) {
  const payment = await prisma.subcontractorPayment.create({
    data: {
      ...data,
      dueDate: sanitizeDate(data.dueDate) || new Date(),
    },
  })
  revalidatePath('/subempreiteiros')
  revalidatePath(`/obras/${data.projectId}`)
  return payment
}

export async function updateSubPaymentStatus(id: string, status: PaymentStatus, projectId: string, paidDate?: Date | string) {
  const payment = await prisma.subcontractorPayment.update({
    where: { id },
    data: { status, paidDate: status === 'PAGO' ? (sanitizeDate(paidDate) || new Date()) : null },
  })
  revalidatePath('/subempreiteiros')
  revalidatePath(`/obras/${projectId}`)
  return payment
}
