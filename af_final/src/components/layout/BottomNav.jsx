/**
 * Navegação inferior para mobile — substitui a Sidebar em telas pequenas.
 * Segue padrão iOS/Android com ícones + labels e indicador de rota ativa.
 */
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, CreditCard, TrendingUp, Settings } from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Início'     },
  { to: '/expenses',  icon: CreditCard,      label: 'Gastos'     },
  { to: '/analytics', icon: TrendingUp,      label: 'Relatórios' },
  { to: '/profile',   icon: Settings,        label: 'Perfil'     },
]

export function BottomNav() {
  return (
    <nav
      role="navigation"
      aria-label="Navegação principal"
      className="
        fixed bottom-0 left-0 right-0 z-30
        bg-[#0d0d14]/95 border-t border-white/[0.07]
        backdrop-blur-xl -webkit-backdrop-filter
        bottom-nav-safe
        flex items-center justify-around
        px-2 pt-2
        md:hidden
      "
      style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}
    >
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `
            flex flex-col items-center justify-center gap-0.5
            flex-1 py-1 px-1 rounded-2xl
            transition-all duration-200
            min-w-0 touch-press
            ${isActive ? 'text-brand-400' : 'text-white/40'}
          `}
        >
          {({ isActive }) => (
            <>
              <div className={`
                p-1.5 rounded-xl transition-all duration-200
                ${isActive ? 'bg-brand-600/20' : ''}
              `}>
                <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
              </div>
              <span className="text-[10px] font-medium leading-none tracking-tight">
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
