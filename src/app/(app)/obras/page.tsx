import { getProjects } from '@/server/actions/projects'
import { ObrasClient } from './obras-client'

export const revalidate = 10

export default async function ObrasPage() {
  const projects = await getProjects()
  return <ObrasClient projects={projects as any} />
}
