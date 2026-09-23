import { requireAuth } from '@/lib/session'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { MobileTabBar } from '@/components/layout/mobile-tab-bar'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireAuth()

  return (
    <div className="min-h-screen bg-[#eaedf2] text-slate-900 relative">
      <Sidebar />
      <Header />
      <main className="ml-0 md:ml-[220px] pt-14 pb-[calc(5.5rem+max(env(safe-area-inset-bottom,0px),8px))] md:pb-12 min-h-screen flex flex-col justify-between">
        <div className="p-3.5 sm:p-5 lg:p-7 max-w-7xl mx-auto w-full flex-1">
          {children}
        </div>

        {/* Executive App Footer & Backlink */}
        <footer className="max-w-7xl mx-auto w-full px-3.5 sm:px-5 lg:px-7 pt-6 pb-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>
            Freitas OS · Sistema Oficial de Gestão do{' '}
            <a
              href="https://grupofreitasrenovacoes.pt"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-slate-800 hover:text-blue-600 transition-colors underline underline-offset-2"
              title="Grupo Freitas Renovações — Remodelações e Construção"
            >
              Grupo Freitas Renovações
            </a>
          </p>

          <div className="flex items-center gap-3 text-[11.5px]">
            <a
              href="https://grupofreitasrenovacoes.pt"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 font-medium transition-colors"
            >
              <span>grupofreitasrenovacoes.pt</span>
              <span aria-hidden="true">↗</span>
            </a>
            <span className="text-slate-300">·</span>
            <span className="font-mono text-slate-400">v4.0</span>
          </div>
        </footer>
      </main>
      <MobileTabBar />
    </div>
  )
}
