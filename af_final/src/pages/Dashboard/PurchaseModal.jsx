import { useState, useMemo } from 'react'
import { useFinances } from '../../hooks/useFinances'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { CurrencyInput } from '../../components/ui/CurrencyInput'
import toast from 'react-hot-toast'

export function PurchaseModal({ onClose, onSave }) {
  const { categories } = useFinances()
  const [description, setDescription] = useState('')
  const [store, setStore] = useState('')
  const [totalAmount, setTotalAmount] = useState(null)
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [isInstallment, setIsInstallment] = useState(false)
  const [installmentsTotal, setInstallmentsTotal] = useState('2')
  const [installmentAmount, setInstallmentAmount] = useState(null)
  const [inProgress, setInProgress] = useState(false)
  const [installmentsPaid, setInstallmentsPaid] = useState('0')
  const [saving, setSaving] = useState(false)

  const computedTotal = useMemo(() => {
    const per = Number(installmentAmount) || 0
    const n = parseInt(installmentsTotal, 10) || 0
    if (isInstallment && per > 0 && n > 0) return per * n
    return Number(totalAmount) || 0
  }, [isInstallment, installmentAmount, installmentsTotal, totalAmount])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!description.trim()) { toast.error('Nome da compra obrigatório'); return }

    let amount = totalAmount
    if (isInstallment) {
      const per = Number(installmentAmount)
      const n = parseInt(installmentsTotal, 10)
      if (!per || per <= 0) { toast.error('Valor da parcela obrigatório'); return }
      if (!n || n < 2) { toast.error('Informe ao menos 2 parcelas'); return }
      amount = per * n
    } else if (!amount || amount <= 0) {
      toast.error('Valor total obrigatório')
      return
    }

    setSaving(true)
    try {
      await onSave({
        description: description.trim(),
        amount,
        type: 'expense',
        categoryId: categoryId || null,
        date,
        store: store.trim() || null,
        purchaseType: isInstallment ? 'installment' : 'one_off',
        installmentsTotal: isInstallment ? parseInt(installmentsTotal, 10) : null,
        installmentsPaid: isInstallment && inProgress ? parseInt(installmentsPaid, 10) || 0 : 0,
        installmentAmount: isInstallment ? Number(installmentAmount) : null,
        inProgress: isInstallment && inProgress,
      })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Adicionar compra">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Nome da compra" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Notebook, Geladeira..." />
        <Input label="Loja (opcional)" value={store} onChange={e => setStore(e.target.value)} placeholder="Ex: Magazine Luiza" />

        {!isInstallment && (
          <CurrencyInput label="Valor total" value={totalAmount} onChange={setTotalAmount} />
        )}

        <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
          <input type="checkbox" checked={isInstallment} onChange={e => setIsInstallment(e.target.checked)} className="rounded" />
          Compra parcelada
        </label>

        {isInstallment && (
          <div className="space-y-3 pl-1 border-l-2 border-brand-500/30 ml-1">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Nº de parcelas" type="number" min={2} max={60} value={installmentsTotal} onChange={e => setInstallmentsTotal(e.target.value)} />
              <CurrencyInput label="Valor da parcela" value={installmentAmount} onChange={setInstallmentAmount} />
            </div>
            <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
              <input type="checkbox" checked={inProgress} onChange={e => setInProgress(e.target.checked)} className="rounded" />
              Já possui parcelamento em andamento?
            </label>
            {inProgress && (
              <Input
                label="Parcelas já pagas"
                type="number"
                min={0}
                max={parseInt(installmentsTotal, 10) || 60}
                value={installmentsPaid}
                onChange={e => setInstallmentsPaid(e.target.value)}
                hint={`Ex: 3 de ${installmentsTotal}`}
              />
            )}
            {computedTotal > 0 && (
              <p className="text-xs text-white/40">
                Total da compra: {computedTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                {installmentAmount && installmentsTotal && (
                  <> · {installmentsTotal}x de {Number(installmentAmount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</>
                )}
              </p>
            )}
          </div>
        )}

        <Select label="Categoria (opcional)" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
          <option value="">Sem categoria</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Input label="Data" type="date" value={date} onChange={e => setDate(e.target.value)} />

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="flex-1" loading={saving}>Salvar compra</Button>
        </div>
      </form>
    </Modal>
  )
}
