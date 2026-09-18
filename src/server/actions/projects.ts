'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import type { ProjectStatus, ExpenseCategory, PaymentStatus } from '@prisma/client'

export async function getProjects() {
  return prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      expenses: true,
      clientTranches: true,
      subPayments: { include: { subcontractor: true } },
      _count: { select: { documents: true, notes: true } },
    },
  })
}

export async function getProject(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      expenses: { orderBy: { date: 'desc' } },
      clientTranches: { orderBy: { dueDate: 'asc' } },
      subPayments: { include: { subcontractor: true }, orderBy: { dueDate: 'asc' } },
      documents: { orderBy: { createdAt: 'desc' } },
      notes: { orderBy: { createdAt: 'desc' } },
      lead: true,
    },
  })
}

function sanitizeDate(date?: Date | string | null): Date | undefined {
  if (!date) return undefined
  const d = typeof date === 'string' ? new Date(date) : date
  if (!(d instanceof Date) || isNaN(d.getTime())) return undefined
  const year = d.getFullYear()
  // Valid realistic range for Postgres TIMESTAMP
  if (year < 1970 || year > 2100) return undefined
  return d
}

export async function createProject(data: {
  title: string
  clientName: string
  clientNIF?: string
  address: string
  contractValue: number
  startDate?: Date | string
  endDate?: Date | string
  status?: ProjectStatus
}) {
  const project = await prisma.project.create({
    data: {
      ...data,
      startDate: sanitizeDate(data.startDate),
      endDate: sanitizeDate(data.endDate),
    },
  })
  revalidatePath('/obras')
  return project
}

export async function updateProject(id: string, data: Partial<{
  title: string
  clientName: string
  clientNIF: string
  address: string
  contractValue: number
  startDate: Date | string
  endDate: Date | string
  status: ProjectStatus
}>) {
  const updateData = { ...data }
  if ('startDate' in updateData) updateData.startDate = sanitizeDate(updateData.startDate)
  if ('endDate' in updateData) updateData.endDate = sanitizeDate(updateData.endDate)

  const project = await prisma.project.update({ where: { id }, data: updateData as any })
  revalidatePath('/obras')
  revalidatePath(`/obras/${id}`)
  return project
}

export async function deleteProject(id: string) {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.note.deleteMany({ where: { projectId: id } })
      await tx.document.deleteMany({ where: { projectId: id } })
      await tx.expense.deleteMany({ where: { projectId: id } })
      await tx.clientTranche.deleteMany({ where: { projectId: id } })
      await tx.subcontractorPayment.deleteMany({ where: { projectId: id } })
      await tx.project.delete({ where: { id } })
    })

    revalidatePath('/obras')
    revalidatePath('/dashboard')
    revalidatePath('/pro-formas')
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting project:', error)
    throw new Error(error?.message || 'Erro ao eliminar obra')
  }
}

// Expenses
export async function createExpense(data: {
  projectId: string
  description: string
  amount: number
  category: ExpenseCategory
  date?: Date | string
  receiptUrl?: string
}) {
  const expense = await prisma.expense.create({
    data: {
      ...data,
      date: sanitizeDate(data.date) || new Date(),
    },
  })
  revalidatePath(`/obras/${data.projectId}`)
  return expense
}

export async function deleteExpense(id: string, projectId: string) {
  try {
    await prisma.expense.delete({ where: { id } })
    revalidatePath(`/obras/${projectId}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting expense:', error)
    throw new Error(error?.message || 'Erro ao eliminar despesa')
  }
}

// Tranches
export async function createClientTranche(data: {
  projectId: string
  description: string
  percentage: number
  amount: number
  dueDate: Date | string
}) {
  const tranche = await prisma.clientTranche.create({
    data: {
      ...data,
      dueDate: sanitizeDate(data.dueDate) || new Date(),
    },
  })
  revalidatePath(`/obras/${data.projectId}`)
  return tranche
}

export async function updateTrancheStatus(id: string, status: PaymentStatus, projectId: string, paidDate?: Date | string) {
  const tranche = await prisma.clientTranche.update({
    where: { id },
    data: { status, paidDate: status === 'PAGO' ? (sanitizeDate(paidDate) || new Date()) : null },
  })
  revalidatePath(`/obras/${projectId}`)
  return tranche
}

export async function deleteClientTranche(id: string, projectId: string) {
  try {
    await prisma.clientTranche.delete({ where: { id } })
    revalidatePath(`/obras/${projectId}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting tranche:', error)
    throw new Error(error?.message || 'Erro ao eliminar tranche')
  }
}

// Documents
export async function createDocument(data: {
  projectId: string
  title: string
  fileUrl: string
  fileType: string
}) {
  const doc = await prisma.document.create({ data })
  revalidatePath(`/obras/${data.projectId}`)
  revalidatePath('/pro-formas')
  return doc
}

export async function deleteDocument(id: string, projectId?: string) {
  try {
    let resolvedProjectId = projectId
    if (!resolvedProjectId) {
      const doc = await prisma.document.findUnique({ where: { id }, select: { projectId: true } })
      resolvedProjectId = doc?.projectId
    }

    await prisma.document.delete({ where: { id } })

    if (resolvedProjectId) {
      revalidatePath(`/obras/${resolvedProjectId}`)
    }
    revalidatePath('/pro-formas')
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting document:', error)
    throw new Error(error?.message || 'Erro ao eliminar documento')
  }
}

export async function getAllProFormas() {
  const docs = await prisma.document.findMany({
    include: {
      project: {
        select: {
          id: true,
          title: true,
          clientName: true,
          address: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  return docs
}

// Dashboard stats
export async function getDashboardStats() {
  const projects = await prisma.project.findMany({
    include: {
      expenses: true,
      clientTranches: true,
      subPayments: { include: { subcontractor: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const expenses = projects.flatMap((p) => p.expenses)
  const clientTranches = projects.flatMap((p) => p.clientTranches)
  const subPayments = projects.flatMap((p) => p.subPayments)

  const totalRevenue = projects.reduce((s, p) => s + p.contractValue, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const totalProfit = totalRevenue - totalExpenses
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

  const pendingReceivables = clientTranches
    .filter((t) => t.status !== 'PAGO')
    .reduce((s, t) => s + t.amount, 0)

  const pendingPayables = subPayments
    .filter((p) => p.status !== 'PAGO')
    .reduce((s, p) => s + p.amount, 0)

  const paidReceivables = clientTranches
    .filter((t) => t.status === 'PAGO' || t.paidDate != null)
    .reduce((s, t) => s + t.amount, 0)

  const paidExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const paidSubcontractors = subPayments
    .filter((p) => p.status === 'PAGO' || p.paidDate != null)
    .reduce((s, p) => s + p.amount, 0)

  const totalCashOut = paidExpenses + paidSubcontractors
  const bankBalance = paidReceivables - totalCashOut

  const overdueReceivables = clientTranches.filter(
    (t) => t.status === 'ATRASADO' || (t.status === 'PENDENTE' && new Date(t.dueDate) < new Date())
  )
  const overduePayables = subPayments.filter(
    (p) => p.status === 'ATRASADO' || (p.status === 'PENDENTE' && new Date(p.dueDate) < new Date())
  )

  return {
    totalRevenue,
    totalExpenses,
    totalProfit,
    avgMargin,
    pendingReceivables,
    pendingPayables,
    paidReceivables,
    paidExpenses,
    paidSubcontractors,
    totalCashOut,
    bankBalance,
    overdueCount: overdueReceivables.length + overduePayables.length,
    projectCount: projects.length,
    activeProjectCount: projects.filter((p) => p.status === 'EM_EXECUCAO').length,
    projects: projects.map((p) => ({
      id: p.id,
      title: p.title,
      clientName: p.clientName,
      address: p.address,
      contractValue: p.contractValue,
      totalExpenses: p.expenses.reduce((s, e) => s + e.amount, 0),
      status: p.status,
      startDate: p.startDate,
      endDate: p.endDate,
      createdAt: p.createdAt,
      expenses: p.expenses.map((e) => ({
        id: e.id,
        amount: e.amount,
        date: e.date,
        category: e.category,
      })),
      clientTranches: p.clientTranches.map((t) => ({
        id: t.id,
        amount: t.amount,
        status: t.status,
        dueDate: t.dueDate,
        paidDate: t.paidDate,
      })),
    })),
    rawExpenses: expenses.map((e) => ({
      id: e.id,
      projectId: e.projectId,
      amount: e.amount,
      date: e.date,
      category: e.category,
      description: e.description,
    })),
    rawTranches: clientTranches.map((t) => ({
      id: t.id,
      projectId: t.projectId,
      amount: t.amount,
      status: t.status,
      dueDate: t.dueDate,
      paidDate: t.paidDate,
    })),
    rawSubPayments: subPayments.map((p) => ({
      id: p.id,
      projectId: p.projectId,
      amount: p.amount,
      status: p.status,
      dueDate: p.dueDate,
      paidDate: p.paidDate,
      subcontractorName: p.subcontractor?.name || 'Subempreiteiro',
    })),
  }
}
