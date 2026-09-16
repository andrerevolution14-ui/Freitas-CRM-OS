import { requireAuth } from '@/lib/session'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { MobileTabBar } from '@/components/layout/mobile-tab-bar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireAuth()

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#eaedf2] text-slate-900 relative">
      <Sidebar />
      <Header />
      <main className="ml-0 md:ml-[220px] pt-14 pb-[calc(5rem+max(env(safe-area-inset-bottom,0px),8px))] md:pb-10 min-h-screen w-full max-w-full overflow-x-hidden">
        <div className="p-3.5 sm:p-5 lg:p-7 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
      <MobileTabBar />
    </div>
  )
}
