import { prisma } from '../src/lib/prisma'
import bcrypt from 'bcryptjs'

async function main() {
  console.log('🌱 A popular a base de dados...')

  // ── Criar os dois utilizadores reais ──────────────────────────────────────
  const andreHash = await bcrypt.hash('andre100', 12)
  const andre = await prisma.user.upsert({
    where: { email: 'andre@freitasrenovacoes.pt' },
    update: { color: '#4f7ef8', image: '/avatar-andre.jpg' },
    create: {
      name: 'André Queiros',
      email: 'andre@freitasrenovacoes.pt',
      password: andreHash,
      role: 'ADMIN',
      color: '#4f7ef8',
      image: '/avatar-andre.jpg',
    },
  })

  const jorgeHash = await bcrypt.hash('jorge100', 12)
  const jorge = await prisma.user.upsert({
    where: { email: 'jorge@freitasrenovacoes.pt' },
    update: { color: '#a78bfa', image: '/avatar-jorge.jpg' },
    create: {
      name: 'Jorge Freitas',
      email: 'jorge@freitasrenovacoes.pt',
      password: jorgeHash,
      role: 'ADMIN',
      color: '#a78bfa',
      image: '/avatar-jorge.jpg',
    },
  })

  // ── Subempreiteiros ────────────────────────────────────────────────────────
  const sub1 = await prisma.subcontractor.create({
    data: {
      name: 'António Silva',
      companyName: 'Silva Canalizações Lda.',
      phone: '912 345 678',
      specialty: 'PICHELEIRO_CANALIZADOR',
      rating: 5,
      dailyRate: 280,
      notes: 'Excelente profissional, muito pontual.',
      isAvailable: false,
    },
  })

  const sub2 = await prisma.subcontractor.create({
    data: {
      name: 'João Ferreira',
      companyName: null,
      phone: '934 567 890',
      specialty: 'ELETRICISTA',
      rating: 4,
      dailyRate: 250,
      notes: 'Certificado pela DGEG. Trabalho limpo.',
      isAvailable: true,
    },
  })

  const sub3 = await prisma.subcontractor.create({
    data: {
      name: 'Manuel Costa',
      companyName: 'Costa & Filhos Construção',
      phone: '962 111 222',
      specialty: 'PEDREIRO',
      rating: 5,
      dailyRate: 220,
      notes: 'Especialista em pavimentos e revestimentos.',
      isAvailable: false,
    },
  })

  await prisma.subcontractor.create({
    data: {
      name: 'Ricardo Lopes',
      companyName: null,
      phone: '916 777 888',
      specialty: 'PINTOR',
      rating: 4,
      dailyRate: 180,
      notes: 'Especialista em tinta decorativa e estuque.',
      isAvailable: true,
    },
  })

  // ── Leads ──────────────────────────────────────────────────────────────────
  const lead1 = await prisma.lead.create({
    data: {
      clientName: 'Jorge Pato',
      phone: '915 999 000',
      email: 'jorge.pato@gmail.com',
      address: 'Rua da Costa Nova, 45, Ílhavo',
      source: 'Meta Ads',
      status: 'CONTRATO_ASSINADO',
      estimatedValue: 85000,
      createdById: andre.id,
    },
  })

  await prisma.lead.create({
    data: {
      clientName: 'Maria Sousa',
      phone: '919 123 456',
      email: 'maria.sousa@outlook.pt',
      address: 'Av. Dr. Lourenço Peixinho, 201, Aveiro',
      source: 'Referência',
      status: 'VISITA_AGENDADA',
      estimatedValue: 32000,
      createdById: jorge.id,
    },
  })

  await prisma.lead.create({
    data: {
      clientName: 'Paulo Rodrigues',
      phone: '936 543 210',
      email: null,
      address: 'Rua das Flores, 8, Coimbra',
      source: 'Google Ads',
      status: 'ORCAMENTO_ENVIADO',
      estimatedValue: 55000,
      createdById: andre.id,
    },
  })

  await prisma.lead.create({
    data: {
      clientName: 'Ana Mota',
      phone: '912 000 111',
      email: 'ana.mota@empresa.pt',
      address: 'Rua do Rossio, 12, Viseu',
      source: 'Instagram',
      status: 'NOVA_LEAD',
      estimatedValue: 18000,
      createdById: jorge.id,
    },
  })

  // ── Obras ──────────────────────────────────────────────────────────────────
  const project1 = await prisma.project.create({
    data: {
      leadId: lead1.id,
      title: 'Remodelação Completa - Jorge Pato',
      clientName: 'Jorge Pato',
      clientNIF: '245 678 901',
      address: 'Rua da Costa Nova, 45, Ílhavo',
      contractValue: 85000,
      startDate: new Date('2024-03-01'),
      endDate: new Date('2024-07-31'),
      status: 'EM_EXECUCAO',
      createdById: jorge.id,
    },
  })

  await prisma.expense.createMany({
    data: [
      { projectId: project1.id, description: 'Azulejos Cerâmica Porto 60x60', amount: 3800, category: 'MATERIAL', date: new Date('2024-03-10') },
      { projectId: project1.id, description: 'Canalização WC 1 e WC 2 — António Silva', amount: 4200, category: 'SUBEMPREITEIRO', date: new Date('2024-03-18') },
      { projectId: project1.id, description: 'Argamassa e cimento Weber', amount: 1200, category: 'MATERIAL', date: new Date('2024-03-22') },
      { projectId: project1.id, description: 'Instalação elétrica completa — João Ferreira', amount: 5500, category: 'SUBEMPREITEIRO', date: new Date('2024-04-05') },
      { projectId: project1.id, description: 'Tinta Robbialac 15L x 20 latas', amount: 680, category: 'MATERIAL', date: new Date('2024-04-12') },
      { projectId: project1.id, description: 'Licença de obras na Câmara Municipal', amount: 850, category: 'LICENCAS_E_TAXAS', date: new Date('2024-02-28') },
    ],
  })

  await prisma.clientTranche.createMany({
    data: [
      { projectId: project1.id, description: '1ª Tranche — Adjudicação (30%)', percentage: 30, amount: 25500, dueDate: new Date('2024-03-01'), paidDate: new Date('2024-03-03'), status: 'PAGO' },
      { projectId: project1.id, description: '2ª Tranche — Estrutural (40%)', percentage: 40, amount: 34000, dueDate: new Date('2024-05-01'), paidDate: new Date('2024-05-04'), status: 'PAGO' },
      { projectId: project1.id, description: '3ª Tranche — Conclusão (30%)', percentage: 30, amount: 25500, dueDate: new Date('2024-07-31'), paidDate: null, status: 'PENDENTE' },
    ],
  })

  await prisma.subcontractorPayment.createMany({
    data: [
      { projectId: project1.id, subcontractorId: sub1.id, phaseDescription: 'Canalização WC 1, WC 2 e cozinha', amount: 4200, dueDate: new Date('2024-04-01'), paidDate: new Date('2024-04-02'), status: 'PAGO' },
      { projectId: project1.id, subcontractorId: sub2.id, phaseDescription: 'Instalação elétrica completa + quadro', amount: 5500, dueDate: new Date('2024-05-15'), paidDate: null, status: 'ATRASADO' },
    ],
  })

  const project2 = await prisma.project.create({
    data: {
      title: 'Renovação Apartamento T3 — Mário Fonseca',
      clientName: 'Mário Fonseca',
      clientNIF: '234 567 890',
      address: 'Rua Alexandre Herculano, 78, Porto',
      contractValue: 42000,
      startDate: new Date('2024-04-15'),
      endDate: new Date('2024-06-30'),
      status: 'CONCLUIDA',
      createdById: andre.id,
    },
  })

  await prisma.expense.createMany({
    data: [
      { projectId: project2.id, description: 'Pavimento flutuante Kronopol', amount: 2800, category: 'MATERIAL', date: new Date('2024-04-20') },
      { projectId: project2.id, description: 'Pintura completa do apartamento', amount: 3200, category: 'SUBEMPREITEIRO', date: new Date('2024-05-10') },
      { projectId: project2.id, description: 'Alvenaria e estuque interior', amount: 4500, category: 'SUBEMPREITEIRO', date: new Date('2024-05-20') },
      { projectId: project2.id, description: 'Material diverso (parafusos, silicone, massa corrida)', amount: 420, category: 'MATERIAL', date: new Date('2024-05-25') },
    ],
  })

  await prisma.clientTranche.createMany({
    data: [
      { projectId: project2.id, description: '1ª Tranche — Início (50%)', percentage: 50, amount: 21000, dueDate: new Date('2024-04-15'), paidDate: new Date('2024-04-15'), status: 'PAGO' },
      { projectId: project2.id, description: '2ª Tranche — Conclusão (50%)', percentage: 50, amount: 21000, dueDate: new Date('2024-06-30'), paidDate: new Date('2024-07-02'), status: 'PAGO' },
    ],
  })

  await prisma.subcontractorPayment.create({
    data: { projectId: project2.id, subcontractorId: sub3.id, phaseDescription: 'Alvenaria, estuque e acabamentos gerais', amount: 4500, dueDate: new Date('2024-06-01'), paidDate: new Date('2024-06-03'), status: 'PAGO' },
  })

  await prisma.project.create({
    data: {
      title: 'Moradia Unifamiliar — Família Santos',
      clientName: 'Pedro Santos',
      clientNIF: '256 789 012',
      address: 'Rua do Outeiro, 5, Águeda',
      contractValue: 125000,
      startDate: new Date('2024-08-01'),
      endDate: new Date('2024-12-31'),
      status: 'EM_PLANEAMENTO',
      createdById: jorge.id,
    },
  })

  // ── Notas rápidas (com autor) ──────────────────────────────────────────────
  await prisma.note.createMany({
    data: [
      {
        title: 'Reunião Freitas — Agenda',
        content: 'Verificar estado dos projetos pendentes. Ligar ao António Silva para confirmar disponibilidade para agosto.',
        projectId: null,
        leadId: null,
        createdById: andre.id,
      },
      {
        title: 'Material em falta — Costa Nova',
        content: 'Faltam 15 caixas de azulejo 30x60 branco brilhante. Pedir orçamento na Leroy Merlin e Maxmat.',
        projectId: project1.id,
        leadId: null,
        createdById: jorge.id,
      },
      {
        title: 'WhatsApp Sra. Maria Sousa',
        content: 'Pediu para adiar a visita para a semana de 20 de maio. Quer ver opções de cozinha em aberto.',
        projectId: null,
        leadId: null,
        createdById: andre.id,
      },
    ],
  })

  console.log('✅ Base de dados populada com sucesso!')
  console.log('📧 Login 1: andre@freitasrenovacoes.pt  | 🔑 andre100')
  console.log('📧 Login 2: jorge@freitasrenovacoes.pt  | 🔑 jorge100')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
