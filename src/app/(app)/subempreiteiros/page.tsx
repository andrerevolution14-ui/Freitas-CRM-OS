import { getSubcontractors } from '@/server/actions/subcontractors'
import { SubempreiteiroClient } from './subempreiteiro-client'

export const revalidate = 10

export default async function SubempreiteirosPage() {
  const subs = await getSubcontractors()
  return <SubempreiteiroClient subcontractors={subs as any} />
}
