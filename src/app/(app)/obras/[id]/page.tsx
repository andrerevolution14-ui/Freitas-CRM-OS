import { getProject } from '@/server/actions/projects'
import { getSubcontractors } from '@/server/actions/subcontractors'
import { notFound } from 'next/navigation'
import { ObraDetailClient } from './obra-detail-client'

export default async function ObraDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [project, subcontractors] = await Promise.all([
    getProject(id),
    getSubcontractors(),
  ])
  if (!project) notFound()

  return <ObraDetailClient project={project} subcontractors={subcontractors} />
}
