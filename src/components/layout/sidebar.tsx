'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  FolderKanban,
  HardHat,
  Users,
  StickyNote,
  LogOut,
  CalendarDays,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserAvatar } from '@/components/ui/user-avatar'

const navItems = [
  { href: '/dashboard', label: 'Dashboard',      icon: LayoutDashboard, color: 'text-blue-400' },
  { href: '/leads',     label: 'Pipeline CRM',   icon: FolderKanban,    color: 'text-purple-400' },
  { href: '/obras',     label: 'Obras',          icon: HardHat,         color: 'text-blue-400' },
  { href: '/subempreiteiros', label: 'Equipa',   icon: Users,           color: 'text-amber-400' },
  { href: '/calendario',label: 'Calendário',     icon: CalendarDays,    color: 'text-emerald-400' },
  { href: '/notas',     label: 'Notas',          icon: StickyNote,      color: 'text-amber-400' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const user = session?.user as { name?: string; email?: string; color?: string; image?: string } | undefined

  return (
    <aside
      className="hidden md:flex fixed left-0 top-0 h-screen w-[220px] flex-col z-40"
      style={{
        background: 'linear-gradient(180deg, #0b0d15 0%, #080a11 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo */}
      <div
        className="px-4 py-4 flex flex-col items-center justify-center gap-1.5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="relative w-[150px] h-[52px] flex items-center justify-center">
          <Image
            src="/logo.png"
            alt="Freitas Renovações"
            width={150}
            height={52}
            className="object-contain w-full h-full filter drop-shadow-[0_2px_8px_rgba(255,255,255,0.08)]"
            priority
          />
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">Gestão de Obras</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-[4px] text-[13px] font-medium transition-all duration-150 group',
                isActive
                  ? 'sidebar-item-active text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              )}
            >
              <Icon
                className={cn(
                  'w-[15px] h-[15px] flex-shrink-0',
                  isActive ? item.color : 'text-slate-600 group-hover:text-slate-400'
                )}
              />
              <span className="flex-1 leading-none">{item.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-2.5 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.055)' }}>
        <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
          <UserAvatar
            name={user?.name}
            color={user?.color}
            image={user?.image}
            size={30}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-white truncate leading-none">{user?.name || 'Admin'}</p>
            <p className="text-[10px] text-slate-500 truncate mt-0.5">{user?.email || ''}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-2.5 px-3 py-2 w-full rounded-[4px] text-[12px] font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/8 transition-all duration-150"
        >
          <LogOut className="w-3.5 h-3.5" />
          Terminar Sessão
        </button>
      </div>
    </aside>
  )
}
