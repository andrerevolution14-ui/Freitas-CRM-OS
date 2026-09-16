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
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-2 flex items-center justify-around"
      style={{
        background: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid #dbe1ea',
        boxShadow: '0 -2px 12px rgba(0, 0, 0, 0.05)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 6px)',
        height: 'calc(3.85rem + max(env(safe-area-inset-bottom, 0px), 6px))',
      }}
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-150 active:scale-95 select-none',
              isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
            )}
          >
            <div
              className={cn(
                'p-1.5 rounded-[4px] transition-all',
                isActive ? 'bg-blue-50 shadow-xs' : 'bg-transparent'
              )}
            >
              <Icon className={cn('w-5 h-5 transition-transform', isActive ? 'text-blue-600 scale-105' : 'text-slate-400')} />
            </div>
            <span className={cn('text-[10px] tracking-tight leading-tight', isActive ? 'font-bold text-blue-600' : 'font-medium text-slate-500')}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
