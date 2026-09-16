import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { createGeneralTemplate } from '@/server/actions/templates'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const category = (formData.get('category') as string) || 'Pró-Formas'
    const description = (formData.get('description') as string) || ''

    if (!file || !title) {
      return NextResponse.json({ error: 'Ficheiro e título são obrigatórios' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'templates')
    await mkdir(uploadDir, { recursive: true })

    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filename = `${Date.now()}-${safeName}`
    const filepath = join(uploadDir, filename)
    await writeFile(filepath, buffer)

    const fileUrl = `/uploads/templates/${filename}`

    // Calculate readable file size
    const sizeInKb = Math.round(file.size / 1024)
    const fileSize = sizeInKb > 1024 ? `${(sizeInKb / 1024).toFixed(1)} MB` : `${sizeInKb} KB`

    const template = await createGeneralTemplate({
      title,
      category,
      description,
      fileUrl,
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      fileSize,
    })

    return NextResponse.json({ success: true, template })
  } catch (error) {
    console.error('Template upload error:', error)
    return NextResponse.json({ error: 'Erro ao carregar modelo' }, { status: 500 })
  }
}
