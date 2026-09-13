import { getLeads } from '@/server/actions/leads'
import { LeadsClient } from './leads-client'

export const revalidate = 10

export default async function LeadsPage() {
  const leads = await getLeads()
  return <LeadsClient leads={leads as any} />
}
