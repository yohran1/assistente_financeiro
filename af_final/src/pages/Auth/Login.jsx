import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Wallet } from 'lucide-react'
import { signIn } from '../../services/auth'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import toast from 'react-hot-toast'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await signIn(data)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message || 'Erro ao entrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen min-h-dvh bg-[#09090e] flex items-center justify-center p-4">
      {/* Glow de fundo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-brand-600 mb-4 shadow-lg shadow-brand-600/30">
            <Wallet size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-white">Bem-vindo de volta</h1>
          <p className="text-white/40 text-sm mt-1">Entre para acessar suas finanças</p>
        </div>

        {/* Form */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-3xl p-6 space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              label="Email"
              type="email"
              placeholder="seu@email.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Senha"
              type="password"
              placeholder="Sua senha"
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                Esqueci a senha
              </Link>
            </div>

            <Button type="submit" size="lg" className="w-full" loading={loading}>
              Entrar
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-white/40 mt-6">
          Não tem conta?{' '}
          <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
            Criar conta grátis
          </Link>
        </p>
      </div>
    </div>
  )
}
