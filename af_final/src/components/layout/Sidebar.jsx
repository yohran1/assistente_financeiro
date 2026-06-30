/**
 * Sidebar — visível em md+ (desktop/tablet).
 * No mobile é substituída pelo BottomNav.
 */
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CreditCard, TrendingUp, Settings,
  LogOut, ChevronLeft, ChevronRight, Wallet, Smartphone,
} from 'lucide-react'
import { useState } from 'react'
import { signOut }  from '../../services/auth'
import { useAuth }  from '../../hooks/useAuth'
import toast        from 'react-hot-toast'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard'      },
  { to: '/expenses',  icon: CreditCard,      label: 'Gastos'         },
  { to: '/analytics', icon: TrendingUp,      label: 'Relatórios'     },
  { to: '/profile',   icon: Settings,        label: 'Perfil'         },
  { to: '/instalar',  icon: Smartphone,      label: 'Instalar Mobile' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { user } = useAuth()
  const navigate  = useNavigate()

  const handleLogout = async () => {
    try { await signOut(); navigate('/login') }
    catch { toast.error('Erro ao sair') }
  }

  const initials = user?.user_metadata?.name
    ? user.user_metadata.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0]?.toUpperCase() ?? 'U')

  return (
    <aside
      role="navigation"
      aria-label="Menu lateral"
      className={`
        relative flex flex-col h-full
        bg-[#0d0d14] border-r border-white/[0.06]
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-[68px]' : 'w-[232px]'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-white/[0.06] h-16 flex-shrink-0">
        <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-600/20">
          <Wallet size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="leading-tight overflow-hidden">
            <p className="font-semibold text-sm text-white tracking-tight whitespace-nowrap">Assistente</p>
            <p className="text-xs text-white/40 font-normal whitespace-nowrap">Financeiro</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-xl
              transition-all duration-200
              ${isActive
                ? 'bg-brand-600/15 text-brand-400'
                : 'text-white/50 hover:text-white/80 hover:bg-white/[0.05]'
              }
            `}
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className="flex-shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                {!collapsed && (
                  <span className="text-sm font-medium truncate">{label}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="p-2.5 border-t border-white/[0.06] space-y-0.5 flex-shrink-0">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl min-w-0">
          <div className="w-7 h-7 rounded-full bg-brand-600/25 border border-brand-500/20 flex items-center justify-center text-xs font-semibold text-brand-400 flex-shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/80 truncate">
                {user?.user_metadata?.name || 'Usuário'}
              </p>
              <p className="text-xs text-white/30 truncate">{user?.email}</p>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          aria-label="Sair da conta"
          className="
            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
            text-white/40 hover:text-red-400 hover:bg-red-500/10
            transition-all duration-200 touch-press
          "
        >
          <LogOut size={17} className="flex-shrink-0" />
          {!collapsed && <span className="text-sm">Sair</span>}
        </button>
      </div>

      {/* Botão collapse */}
      <button
        onClick={() => setCollapsed(v => !v)}
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        className="
          absolute -right-3 top-[4.5rem]
          w-6 h-6 rounded-full
          bg-[#1a1a2e] border border-white/10
          flex items-center justify-center
          text-white/40 hover:text-white/70
          transition-all duration-200 z-10
        "
      >
        {collapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
      </button>
    </aside>
  )
}
