import { getLeads, getDeletedLeads } from '@/server/actions/leads'
import { LeadsClient } from './leads-client'

export const revalidate = 10

export default async function LeadsPage() {
  const [leads, deletedLeads] = await Promise.all([
    getLeads(),
    getDeletedLeads(),
  ])
  return <LeadsClient leads={leads as any} initialDeletedLeads={deletedLeads as any} />
}
