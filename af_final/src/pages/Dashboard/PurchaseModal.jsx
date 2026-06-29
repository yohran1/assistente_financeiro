import { useState, useMemo } from 'react'
import { Wallet, CreditCard, Layers, RefreshCw } from 'lucide-react'
import { useFinances } from '../../hooks/useFinances'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { CurrencyInput } from '../../components/ui/CurrencyInput'
import { BalancePreview } from '../../components/ui/BalancePreview'
import { purchaseKindLabel } from '../../lib/balanceImpact'
import toast from 'react-hot-toast'

const PURCHASE_KINDS = [
  {
    id: 'one_off_account',
    icon: Wallet,
    title: 'À vista',
    subtitle: 'Saldo em conta',
    desc: 'Debita o valor total da conta agora.',
  },
  {
    id: 'one_off_card',
    icon: CreditCard,
    title: 'Crédito à vista',
    subtitle: 'Cartão',
    desc: 'Entra na fatura do cartão; conta não muda.',
  },
  {
    id: 'installment_card',
    icon: Layers,
    title: 'Parcelado',
    subtitle: 'No cartão',
    desc: 'Primeira parcela entra na fatura; compromete o limite. Conta não muda na compra.',
  },
  {
    id: 'subscription',
    icon: RefreshCw,
    title: 'Assinatura',
    subtitle: 'Recorrente',
    desc: 'Mensalidade na conta ou no cartão.',
  },
]

export function PurchaseModal({ onClose, onSave }) {
  const { categories, profile, walletsIncludedTotal } = useFinances()
  const [step, setStep] = useState(1)
  const [purchaseKind, setPurchaseKind] = useState(null)
  const [description, setDescription] = useState('')
  const [store, setStore] = useState('')
  const [totalAmount, setTotalAmount] = useState(null)
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [installmentsTotal, setInstallmentsTotal] = useState('2')
  const [installmentAmount, setInstallmentAmount] = useState(null)
  const [inProgress, setInProgress] = useState(false)
  const [installmentsPaid, setInstallmentsPaid] = useState('0')
  const [subscriptionSource, setSubscriptionSource] = useState('account')
  const [dayOfMonth, setDayOfMonth] = useState(String(new Date().getDate()))
  const [saving, setSaving] = useState(false)

  const isInstallment = purchaseKind === 'installment_card'
  const isSubscription = purchaseKind === 'subscription'

  const computedTotal = useMemo(() => {
    const per = Number(installmentAmount) || 0
    const n = parseInt(installmentsTotal, 10) || 0
    if (isInstallment && per > 0 && n > 0) return per * n
    return Number(totalAmount) || 0
  }, [isInstallment, installmentAmount, installmentsTotal, totalAmount])

  const draftTransaction = useMemo(() => {
    if (isSubscription) return null
    if (isInstallment) {
      const per = Number(installmentAmount) || 0
      const n = parseInt(installmentsTotal, 10) || 0
      if (per <= 0 || n <= 0) return null
      const total = per * n
      const paid = inProgress ? parseInt(installmentsPaid, 10) || 0 : 0
      return {
        type: 'expense',
        amount: total,
        purchase_type: 'installment',
        payment_source: 'credit_card',
        installment_amount: per,
        installments_total: n,
        installments_paid: paid,
        in_progress: inProgress,
      }
    }
    const total = Number(totalAmount) || 0
    if (total <= 0) return null
    if (purchaseKind === 'one_off_card') {
      return { type: 'expense', amount: total, purchase_type: 'one_off', payment_source: 'credit_card' }
    }
    if (purchaseKind === 'one_off_account') {
      return { type: 'expense', amount: total, purchase_type: 'one_off', payment_source: 'account' }
    }
    return null
  }, [isInstallment, isSubscription, installmentAmount, installmentsTotal, totalAmount, inProgress, installmentsPaid, purchaseKind])

  const draftRecurring = useMemo(() => {
    if (!isSubscription) return null
    const amt = Number(totalAmount) || 0
    if (amt <= 0) return null
    return { amount: amt, payment_source: subscriptionSource }
  }, [isSubscription, totalAmount, subscriptionSource])

  const pickKind = (kind) => {
    setPurchaseKind(kind)
    setStep(2)
  }

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
      toast.error('Valor obrigatório')
      return
    }

    if (isSubscription) {
      const day = parseInt(dayOfMonth, 10)
      if (!day || day < 1 || day > 31) { toast.error('Dia inválido (1-31)'); return }
    }

    setSaving(true)
    try {
      if (isSubscription) {
        await onSave({
          isSubscription: true,
          description: description.trim(),
          amount,
          categoryId: categoryId || null,
          dayOfMonth: parseInt(dayOfMonth, 10),
          paymentSource: subscriptionSource,
        })
      } else if (purchaseKind === 'one_off_account') {
        await onSave({
          description: description.trim(),
          amount,
          type: 'expense',
          categoryId: categoryId || null,
          date,
          store: store.trim() || null,
          purchaseType: 'one_off',
          paymentSource: 'account',
        })
      } else if (purchaseKind === 'one_off_card') {
        await onSave({
          description: description.trim(),
          amount,
          type: 'expense',
          categoryId: categoryId || null,
          date,
          store: store.trim() || null,
          purchaseType: 'one_off',
          paymentSource: 'credit_card',
        })
      } else if (isInstallment) {
        await onSave({
          description: description.trim(),
          amount,
          type: 'expense',
          categoryId: categoryId || null,
          date,
          store: store.trim() || null,
          purchaseType: 'installment',
          paymentSource: 'credit_card',
          installmentsTotal: parseInt(installmentsTotal, 10),
          installmentsPaid: inProgress ? parseInt(installmentsPaid, 10) || 0 : 0,
          installmentAmount: Number(installmentAmount),
          inProgress: inProgress,
        })
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Adicionar compra">
      {step === 1 ? (
        <div className="space-y-3">
          <p className="text-sm text-white/50 mb-2">Como foi o pagamento?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PURCHASE_KINDS.map(({ id, icon: Icon, title, subtitle, desc }) => (
              <button
                key={id}
                type="button"
                onClick={() => pickKind(id)}
                className="text-left p-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-brand-500/30 transition-all touch-press"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-500/15 flex items-center justify-center text-brand-400 flex-shrink-0">
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-xs text-brand-300/80">{subtitle}</p>
                    <p className="text-[11px] text-white/35 mt-1">{desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <Button type="button" variant="secondary" className="w-full" onClick={onClose}>Cancelar</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-brand-300/90 font-medium">{purchaseKindLabel(purchaseKind)}</p>
            <button type="button" onClick={() => setStep(1)} className="text-xs text-white/40 hover:text-white/70">
              Alterar tipo
            </button>
          </div>

          <Input label="Nome da compra" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Notebook, Netflix..." />
          {!isSubscription && (
            <Input label="Loja (opcional)" value={store} onChange={e => setStore(e.target.value)} placeholder="Ex: Magazine Luiza" />
          )}

          {!isInstallment && (
            <CurrencyInput
              label={isSubscription ? 'Valor mensal' : 'Valor total'}
              value={totalAmount}
              onChange={setTotalAmount}
            />
          )}

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
                  Total na fatura: {computedTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  {installmentAmount && installmentsTotal && (
                    <> · {installmentsTotal}x de {Number(installmentAmount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</>
                  )}
                </p>
              )}
            </div>
          )}

          {isSubscription && (
            <>
              <Input
                label="Dia do mês"
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={e => setDayOfMonth(e.target.value)}
                hint="Dia em que a cobrança ocorre todo mês"
              />
              <Select label="Pagar com" value={subscriptionSource} onChange={e => setSubscriptionSource(e.target.value)}>
                <option value="account">Saldo em conta</option>
                <option value="credit_card">Cartão de crédito (fatura)</option>
              </Select>
            </>
          )}

          <Select label="Categoria (opcional)" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            <option value="">Sem categoria</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>

          {!isSubscription && (
            <Input label="Data" type="date" value={date} onChange={e => setDate(e.target.value)} />
          )}

          <BalancePreview
            accountBalance={profile?.account_balance}
            walletsIncludedTotal={walletsIncludedTotal}
            creditCardBalance={profile?.credit_card_balance}
            draftTransaction={draftTransaction}
            draftRecurring={draftRecurring}
          />

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={saving}>Salvar compra</Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
