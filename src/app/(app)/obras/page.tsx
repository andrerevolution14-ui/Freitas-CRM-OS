import { getProjects } from '@/server/actions/projects'
import { ObrasClient } from './obras-client'

export default async function ObrasPage() {
  const projects = await getProjects()
  return <ObrasClient projects={projects as any} />
}
