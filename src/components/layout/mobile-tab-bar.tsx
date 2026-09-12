'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FolderKanban,
  HardHat,
  CalendarDays,
  StickyNote,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/leads', label: 'CRM', icon: FolderKanban },
  { href: '/obras', label: 'Obras', icon: HardHat },
  { href: '/calendario', label: 'Agenda', icon: CalendarDays },
  { href: '/notas', label: 'Notas', icon: StickyNote },
]

export function MobileTabBar() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 h-16 z-40 px-2 flex items-center justify-around"
      style={{
        background: 'rgba(12, 14, 20, 0.88)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.4)',
      }}
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ios-interactive',
              isActive ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
            )}
          >
            <div
              className={cn(
                'p-1 rounded-xl transition-all',
                isActive && 'bg-blue-500/15'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive ? 'text-blue-400' : 'text-slate-400')} />
            </div>
            <span className={cn('text-[10px] font-medium tracking-tight', isActive ? 'font-semibold text-blue-400' : 'text-slate-400')}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
