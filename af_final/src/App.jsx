import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './hooks/useAuth'

// Layouts
import { AppLayout } from './components/layout/AppLayout'

// Auth pages (eager loaded para velocidade)
import Login         from './pages/Auth/Login'
import Register      from './pages/Auth/Register'
import ConfirmEmail  from './pages/Auth/ConfirmEmail'
import ForgotPassword from './pages/Auth/ForgotPassword'

// App pages (lazy loaded)
const Dashboard  = lazy(() => import('./pages/Dashboard'))
const Expenses   = lazy(() => import('./pages/Expenses'))
const Analytics  = lazy(() => import('./pages/Analytics'))
const Profile       = lazy(() => import('./pages/Profile'))
const InstallMobile = lazy(() => import('./pages/InstallMobile'))

// Loading placeholder
const PageLoader = () => (
  <div className="min-h-screen bg-[#09090e] flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-white/10 border-t-brand-500 rounded-full animate-spin" />
      <p className="text-white/50 text-sm">Carregando...</p>
    </div>
  </div>
)

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rotas públicas */}
          <Route path="/login"           element={<Login />} />
          <Route path="/register"        element={<Register />} />
          <Route path="/auth/confirm"    element={<ConfirmEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Rotas protegidas com lazy loading */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard"  element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
            <Route path="/expenses"   element={<Suspense fallback={<PageLoader />}><Expenses /></Suspense>} />
            <Route path="/analytics"  element={<Suspense fallback={<PageLoader />}><Analytics /></Suspense>} />
            <Route path="/profile"        element={<Suspense fallback={<PageLoader />}><Profile /></Suspense>} />
            <Route path="/instalar"       element={<Suspense fallback={<PageLoader />}><InstallMobile /></Suspense>} />
            <Route path="/install-mobile" element={<Navigate to="/instalar" replace />} />
          </Route>

          {/* Redirect raiz */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-center"
        containerStyle={{ top: 'max(16px, env(safe-area-inset-top))' }}
        toastOptions={{
          duration: 3500,
          style: {
            background: '#1a1a2e',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '1rem',
            fontSize: '14px',
            maxWidth: '340px',
          },
          success: { iconTheme: { primary: '#34d399', secondary: '#1a1a2e' } },
          error: { iconTheme: { primary: '#f87171', secondary: '#1a1a2e' } },
        }}
      />
    </AuthProvider>
  )
}
