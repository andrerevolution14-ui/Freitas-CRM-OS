import { getDashboardStats } from '@/server/actions/projects'
import { getLeads } from '@/server/actions/leads'
import { getNotes } from '@/server/actions/notes'
import { DashboardClient } from './dashboard-client'

export default async function DashboardPage() {
  const [stats, leads, notes] = await Promise.all([
    getDashboardStats(),
    getLeads(),
    getNotes(),
  ])

  return <DashboardClient stats={stats as any} leads={leads as any} initialNotes={notes as any} />
}
