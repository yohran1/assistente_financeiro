import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFinances }    from '../../hooks/useFinances'
import { Modal }          from '../../components/ui/Modal'
import { Input }          from '../../components/ui/Input'
import { Select }         from '../../components/ui/Select'
import { Button }         from '../../components/ui/Button'
import { CurrencyInput }  from '../../components/ui/CurrencyInput'
import toast from 'react-hot-toast'

const schema = z.object({
  description: z.string().min(1, 'Descrição obrigatória'),
  type: z.enum(['income', 'expense', 'investment', 'saving']),
  date: z.string().min(1, 'Data obrigatória'),
})

const TYPES = [
  { value: 'income',     label: '📈 Receita',      activeClass: 'border-emerald-500 bg-emerald-500/15 text-emerald-300' },
  { value: 'expense',    label: '💳 Gasto',        activeClass: 'border-red-500 bg-red-500/15 text-red-300'             },
  { value: 'investment', label: '📊 Investimento', activeClass: 'border-purple-500 bg-purple-500/15 text-purple-300'    },
  { value: 'saving',     label: '🐷 Poupança',     activeClass: 'border-blue-500 bg-blue-500/15 text-blue-300'          },
]

export function TransactionModal({ onClose, onSave }) {
  const { categories } = useFinances()
  const [amount,     setAmount]     = useState(null)
  const [categoryId, setCategoryId] = useState('')
  const [saving,     setSaving]     = useState(false)
  const [amountError, setAmountError] = useState('')

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { type: 'expense', date: new Date().toISOString().split('T')[0] },
  })

  const selectedType = watch('type')

  const onSubmit = async (data) => {
    if (!amount || amount <= 0) {
      setAmountError('Valor deve ser maior que zero')
      return
    }
    setAmountError('')
    setSaving(true)
    try {
      await onSave({ ...data, amount, categoryId: categoryId || null })
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Nova transação">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Descrição"
          placeholder="Ex: Supermercado, Salário..."
          error={errors.description?.message}
          autoComplete="off"
          {...register('description')}
        />

        <CurrencyInput
          label="Valor"
          value={amount}
          onChange={(v) => { setAmount(v); if (v) setAmountError('') }}
          error={amountError}
        />

        {/* Seletor de tipo — radio buttons estilizados */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-white/70">Tipo</span>
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map(({ value, label, activeClass }) => {
              const isActive = selectedType === value
              return (
                <label key={value} className="cursor-pointer touch-press">
                  <input
                    type="radio"
                    value={value}
                    {...register('type')}
                    className="sr-only"
                  />
                  <div className={`
                    px-3 py-2.5 rounded-xl border text-sm font-medium text-center
                    transition-all duration-150 select-none min-h-[44px] flex items-center justify-center
                    ${isActive
                      ? activeClass
                      : 'border-white/10 bg-white/[0.05] text-white/50 hover:bg-white/10 hover:text-white/70'}
                  `}>
                    {label}
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        <Select
          label="Categoria (opcional)"
          value={categoryId}
          onChange={e => setCategoryId(e.target.value)}
        >
          <option value="">Sem categoria</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>

        <Input
          label="Data"
          type="date"
          error={errors.date?.message}
          {...register('date')}
        />

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" loading={saving}>
            Adicionar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
