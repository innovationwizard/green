'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Home, Plus, Clock, Wallet, RefreshCw, LogOut } from 'lucide-react'

interface InstallerNavProps {
  userName: string
}

export default function InstallerNav({ userName }: InstallerNavProps) {
  const pathname = usePathname()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  const navItems = [
    { href: '/installer/eventos', label: 'Mis Eventos', icon: Home },
    { href: '/installer/eventos/nuevo', label: 'Nuevo Evento', icon: Plus },
    { href: '/installer/temporizador', label: 'Temporizador', icon: Clock },
    { href: '/installer/caja', label: 'Mi Caja', icon: Wallet },
    { href: '/installer/sincronizar', label: 'Sincronizar', icon: RefreshCw },
  ]

  return (
    <nav className="bg-white border-b sticky top-0 z-10">
      <div className="px-4 py-3 flex justify-between items-center">
        <div className="font-semibold">GREEN APP</div>
        <div className="text-sm text-muted-foreground">{userName}</div>
      </div>
      <div className="flex overflow-x-auto border-t">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-2 px-2 text-xs ${
                isActive
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-center">{item.label}</span>
            </Link>
          )
        })}
        <button
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center py-2 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-5 h-5 mb-1" />
          <span>Salir</span>
        </button>
      </div>
    </nav>
  )
}

