import { Outlet, Navigate } from 'react-router-dom'
import { Sidebar }    from './Sidebar'
import { BottomNav }  from './BottomNav'
import { useAuth }    from '../../hooks/useAuth'

export function AppLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen min-h-dvh bg-[#0a0a0f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-white/10 border-t-brand-500 rounded-full animate-spin-slow" />
          <p className="text-white/40 text-sm">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen h-dvh bg-[#09090e] overflow-hidden">

      {/* Sidebar — visível apenas em md+ */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Conteúdo principal */}
      <main
        className="
          flex-1 overflow-y-auto overflow-x-hidden
          pb-20 md:pb-0
        "
        id="main-content"
      >
        <Outlet />
      </main>

      {/* Bottom Nav — visível apenas em mobile */}
      <BottomNav />

    </div>
  )
}
