import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail } from 'lucide-react'
import { resetPassword } from '../../services/auth'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import toast from 'react-hot-toast'

const schema = z.object({ email: z.string().email('Email inválido') })

export default function ForgotPassword() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, getValues, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async ({ email }) => {
    setLoading(true)
    try {
      await resetPassword(email)
      setSent(true)
    } catch {
      toast.error('Erro ao enviar email')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen min-h-dvh bg-[#09090e] flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center animate-slide-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-brand-600/20 border border-brand-500/30 mb-6">
            <Mail size={28} className="text-brand-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Email enviado!</h2>
          <p className="text-white/40 text-sm mb-2">Verifique sua caixa de entrada em</p>
          <p className="text-brand-400 font-medium mb-8">{getValues('email')}</p>
          <Link to="/login" className="text-sm text-white/40 hover:text-white transition-colors">
            Voltar ao login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen min-h-dvh bg-[#09090e] flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-white">Redefinir senha</h1>
          <p className="text-white/40 text-sm mt-1">Enviaremos um link para seu email</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-3xl p-6 space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Input
              label="Email da conta"
              type="email"
              placeholder="seu@email.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Button type="submit" size="lg" className="w-full mt-4" loading={loading}>
              Enviar link de redefinição
            </Button>
          </form>
        </div>
        <p className="text-center text-sm text-white/40 mt-6">
          <Link to="/login" className="text-brand-400 hover:text-brand-300 transition-colors">
            Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  )
}
