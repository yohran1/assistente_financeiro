import { lazy, Suspense, useState, useEffect, useRef } from 'react'
import { Pencil, TrendingUp, TrendingDown, Wallet, CreditCard, Plus, Calendar, Trash2 } from 'lucide-react'
import { useFinances }       from '../../hooks/useFinances'
import { Card, CardHeader }  from '../../components/ui/Card'
import { Button }            from '../../components/ui/Button'
import { Select }            from '../../components/ui/Select'
import { Modal }             from '../../components/ui/Modal'
import { ConfirmDialog }     from '../../components/ui/ConfirmDialog'
import { Input }             from '../../components/ui/Input'
import { CurrencyInput }     from '../../components/ui/CurrencyInput'
import { ChatWidget }        from '../../components/chat/ChatWidget'
import { TransactionModal }  from './TransactionModal'
import { PurchaseModal }     from './PurchaseModal'
import { getCreditCardBillingStatus } from '../../lib/creditCardBilling'
import { formatPurchaseLabel, formatInstallmentInvoiceStatus } from '../../lib/balanceImpact'
import toast from 'react-hot-toast'

const ExpensePieChart = lazy(() => import('../../components/charts/ExpensePieChart').then(m => ({ default: m.ExpensePieChart })))
const BalanceBarChart = lazy(() => import('../../components/charts/BalanceBarChart').then(m => ({ default: m.BalanceBarChart })))

const ChartLoader = () => (
  <div className="h-56 bg-white/[0.03] rounded-2xl flex items-center justify-center">
    <div className="text-white/30 text-sm">Carregando...</div>
  </div>
)

const fmt = (v) => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v)
  return Number.isFinite(n) ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'
}

function StatusBar({ label, pct, color, overdue }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-white/35 uppercase tracking-wide">{label}</span>
        <span className={`text-[10px] ${overdue ? 'text-red-400' : 'text-white/40'}`}>{pct.label}</span>
      </div>
      <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct.pct}%`, background: overdue ? '#f87171' : color }}
        />
      </div>
    </div>
  )
}

function BalanceCard({ label, value, icon: Icon, onEdit, onAction, actionLabel, color = 'brand' }) {
  const palettes = {
    brand:   { card: 'from-brand-600/15 to-transparent border-brand-500/15', icon: 'bg-brand-500/15 text-brand-400' },
    emerald: { card: 'from-emerald-600/15 to-transparent border-emerald-500/15', icon: 'bg-emerald-500/15 text-emerald-400' },
    orange:  { card: 'from-orange-600/15 to-transparent border-orange-500/15', icon: 'bg-orange-500/15 text-orange-400' },
  }
  const p = palettes[color] ?? palettes.brand
  return (
    <div className={`rounded-3xl p-5 bg-gradient-to-br border ${p.card} relative`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${p.icon}`}>
          <Icon size={18} aria-hidden="true" />
        </div>
        <div className="flex items-center gap-1 -mt-1 -mr-1">
          {onAction && (
            <button
              type="button"
              onClick={onAction}
              className="px-2.5 py-1.5 rounded-xl text-[11px] font-medium text-emerald-300 bg-emerald-500/15 border border-emerald-500/25 hover:bg-emerald-500/25 transition-all touch-press"
            >
              {actionLabel}
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              aria-label={`Editar ${label}`}
              className="p-2 rounded-xl hover:bg-white/10 text-white/25 hover:text-white/60 transition-all touch-press"
            >
              <Pencil size={13} />
            </button>
          )}
        </div>
      </div>
      <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl sm:text-2xl font-semibold text-white mono-number">{fmt(value)}</p>
    </div>
  )
}

function CreditCardCard({
  value,
  closingDay,
  dueDay,
  accountBalance,
  creditLimit,
  availableLimit,
  projectedInvoice,
  onEdit,
  onPayInvoice,
  paying,
}) {
  const billing = getCreditCardBillingStatus({ closingDay, dueDay })
  const balance = Number(value) || 0
  const account = Number(accountBalance) || 0

  return (
    <div className="rounded-3xl p-5 bg-gradient-to-br from-orange-600/15 to-transparent border border-orange-500/15 relative">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-orange-500/15 text-orange-400">
          <CreditCard size={18} aria-hidden="true" />
        </div>
        <div className="flex items-center gap-1 -mt-1 -mr-1">
          {balance > 0 && (
            <button
              type="button"
              onClick={onPayInvoice}
              disabled={paying}
              aria-label="Pagar fatura do cartão"
              className="px-2.5 py-1.5 rounded-xl text-[11px] font-medium text-orange-300 bg-orange-500/15 border border-orange-500/25 hover:bg-orange-500/25 hover:text-orange-200 transition-all touch-press disabled:opacity-50"
            >
              {paying ? 'Pagando…' : 'Pagar Fatura'}
            </button>
          )}
          <button
            onClick={onEdit}
            aria-label="Editar cartão de crédito"
            className="p-2 rounded-xl hover:bg-white/10 text-white/25 hover:text-white/60 transition-all touch-press"
          >
            <Pencil size={13} />
          </button>
        </div>
      </div>
      <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-1">Cartão de crédito</p>
      <p className={`text-xl sm:text-2xl font-semibold text-white mono-number mb-1 transition-all duration-500 ${paying ? 'text-orange-200' : ''}`}>
        {fmt(value)}
      </p>
      {creditLimit > 0 && (
        <p className="text-[11px] text-white/35 mb-3">
          Limite disponível: <span className="text-orange-300/90 mono-number">{fmt(availableLimit)}</span>
          <span className="text-white/25"> / {fmt(creditLimit)}</span>
        </p>
      )}
      {billing.closing && billing.due ? (
        <div className="space-y-2.5 mb-3">
          <StatusBar label="Fecha fatura" pct={billing.closing} color="#fb923c" />
          <StatusBar label="Prazo final" pct={billing.due} color="#fbbf24" overdue={billing.due.overdue} />
        </div>
      ) : (
        <p className="text-[11px] text-white/30 mb-3">Configure fechamento e vencimento no editar</p>
      )}
      {projectedInvoice?.items?.length > 0 && (
        <div className="border-t border-white/[0.06] pt-3 mt-1">
          <p className="text-[10px] text-white/35 uppercase tracking-wide mb-2">Próxima fatura (prevista)</p>
          <p className="text-sm font-semibold text-orange-300 mono-number mb-2">{fmt(projectedInvoice.total)}</p>
          <div className="space-y-1.5 max-h-28 overflow-y-auto">
            {projectedInvoice.items.map(item => (
              <div key={`${item.kind}-${item.id}`} className="flex items-center justify-between text-[11px] gap-2">
                <div className="min-w-0">
                  <p className="text-white/70 truncate">{item.description}{item.store ? ` · ${item.store}` : ''}</p>
                  <p className="text-white/30">{item.label}</p>
                </div>
                <span className="text-orange-300/80 mono-number flex-shrink-0">{fmt(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {balance > 0 && account < balance && (
        <p className="text-[10px] text-red-400/80 mt-2">Saldo em conta insuficiente para pagar a fatura</p>
      )}
    </div>
  )
}

function StatCard({ label, value, positive, subtitle, actions = [] }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3.5 flex flex-col gap-2">
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          {positive
            ? <TrendingUp  size={13} className="text-emerald-400 flex-shrink-0" />
            : <TrendingDown size={13} className="text-red-400 flex-shrink-0" />
          }
          <span className="text-xs text-white/40 truncate">{label}</span>
        </div>
        <p className={`text-base font-semibold mono-number ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
          {fmt(value)}
        </p>
        {subtitle && <p className="text-[10px] text-white/30 mt-0.5 capitalize">{subtitle}</p>}
      </div>
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
          {actions.map(({ label: btnLabel, onClick, variant = 'secondary' }) => (
            <button
              key={btnLabel}
              type="button"
              onClick={onClick}
              className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all touch-press ${
                variant === 'danger'
                  ? 'text-red-300 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20'
                  : 'text-white/60 bg-white/[0.05] border border-white/10 hover:bg-white/10 hover:text-white/80'
              }`}
            >
              {btnLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function WalletsPanel({ wallets, onAdd, onUpdate, onDelete }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [balance, setBalance] = useState(null)
  const [includeInTotal, setIncludeInTotal] = useState(true)
  const [saving, setSaving] = useState(false)

  const saveWallet = async () => {
    if (!name.trim()) { toast.error('Nome da carteira obrigatório'); return }
    setSaving(true)
    try {
      await onAdd({ name: name.trim(), balance: balance ?? 0, includeInTotal })
      setAdding(false)
      setName('')
      setBalance(null)
      setIncludeInTotal(true)
      toast.success('Sub-carteira criada')
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-white/80">Sub-carteiras</h2>
        <Button size="sm" variant="secondary" onClick={() => setAdding(v => !v)}>
          <Plus size={14} /> Criar sub-carteira
        </Button>
      </div>
      {adding && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 mb-3 space-y-3">
          <Input label="Nome" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Multibenefício" />
          <CurrencyInput label="Saldo" value={balance} onChange={setBalance} />
          <label className="flex items-center justify-between text-sm text-white/70">
            <span>Somar ao saldo atual</span>
            <button
              type="button"
              role="switch"
              aria-checked={includeInTotal}
              onClick={() => setIncludeInTotal(v => !v)}
              className={`w-11 h-6 rounded-full transition-colors ${includeInTotal ? 'bg-brand-500' : 'bg-white/20'} relative`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${includeInTotal ? 'left-5' : 'left-0.5'}`} />
            </button>
          </label>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setAdding(false)}>Cancelar</Button>
            <Button className="flex-1" loading={saving} onClick={saveWallet}>Salvar</Button>
          </div>
        </div>
      )}
      {wallets.length === 0 ? (
        <p className="text-xs text-white/30">Nenhuma sub-carteira. Ex.: cartão multibenefício.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {wallets.map(w => (
            <div key={w.id} className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5">
              <div>
                <p className="text-sm text-white">{w.name}</p>
                <p className="text-xs text-white/35">{w.include_in_total ? 'Soma ao saldo' : 'Separada'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold mono-number text-white">{fmt(w.balance)}</span>
                <button
                  type="button"
                  aria-label={`Alternar somar ${w.name}`}
                  onClick={() => onUpdate(w.id, { includeInTotal: !w.include_in_total })}
                  className={`text-[10px] px-2 py-1 rounded-lg border ${w.include_in_total ? 'border-brand-500/40 text-brand-300' : 'border-white/10 text-white/40'}`}
                >
                  {w.include_in_total ? 'ON' : 'OFF'}
                </button>
                <button
                  type="button"
                  aria-label={`Excluir ${w.name}`}
                  onClick={() => onDelete(w.id)}
                  className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const {
    profile, summary, wallets, walletsIncludedTotal, projectedCreditCardInvoice, availableCreditLimit, loading, error,
    month, year, setMonth, setYear,
    updateBalance, updateCreditCard, addTransaction, addPurchase: savePurchase, payCreditCardInvoice,
    depositToSavings, withdrawFromSavings, transferInvestmentToIncome, deleteMonthIncome,
    addWallet, updateWallet, deleteWallet,
  } = useFinances()

  const [editBalance,    setEditBalance]    = useState(false)
  const [editCard,       setEditCard]       = useState(false)
  const [addTxModal,     setAddTxModal]     = useState(false)
  const [txDefaultType,  setTxDefaultType]  = useState('expense')
  const [addPurchase,    setAddPurchase]    = useState(false)
  const [confirmPayCard, setConfirmPayCard] = useState(false)
  const [confirmClearIncome, setConfirmClearIncome] = useState(false)
  const [savingsModal,   setSavingsModal]   = useState(null) // 'deposit' | 'withdraw'
  const [transferInvModal, setTransferInvModal] = useState(false)
  const [quickAmount,    setQuickAmount]    = useState(null)
  const [quickDesc,      setQuickDesc]      = useState('')
  const [payAnimating,   setPayAnimating]   = useState(false)
  const [displayAccount, setDisplayAccount] = useState(null)
  const [displayCard,    setDisplayCard]    = useState(null)
  const animRef = useRef(null)
  const [newBalance,     setNewBalance]     = useState(null)
  const [newCardBalance, setNewCardBalance] = useState(null)
  const [newCardLimit,   setNewCardLimit]   = useState(null)
  const [newClosingDay,  setNewClosingDay]  = useState('')
  const [newDueDay,      setNewDueDay]      = useState('')
  const [saving,         setSaving]         = useState(false)

  const accountTotal = (Number(profile?.account_balance) || 0) + walletsIncludedTotal
  const cardBalance = Number(profile?.credit_card_balance) || 0
  const shownAccount = displayAccount ?? accountTotal
  const shownCard = displayCard ?? cardBalance
  const netBalance = shownAccount - shownCard
  const monthName  = new Date(year, month - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
  const savingsBalance = Number(profile?.savings_balance) || 0
  const investmentBalance = Number(profile?.investment_balance) || 0

  useEffect(() => {
    if (!payAnimating) {
      setDisplayAccount(null)
      setDisplayCard(null)
    }
  }, [accountTotal, cardBalance, payAnimating])

  const animatePayment = (fromAccount, toAccount, fromCard, toCard) => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    setPayAnimating(true)
    setDisplayAccount(fromAccount)
    setDisplayCard(fromCard)
    const start = performance.now()
    const duration = 900

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const ease = 1 - Math.pow(1 - t, 3)
      setDisplayAccount(fromAccount + (toAccount - fromAccount) * ease)
      setDisplayCard(fromCard + (toCard - fromCard) * ease)
      if (t < 1) {
        animRef.current = requestAnimationFrame(tick)
      } else {
        setPayAnimating(false)
        setDisplayAccount(null)
        setDisplayCard(null)
      }
    }
    animRef.current = requestAnimationFrame(tick)
  }

  const openCardEdit = () => {
    setNewCardBalance(profile?.credit_card_balance)
    setNewCardLimit(profile?.credit_card_limit)
    setNewClosingDay(profile?.credit_card_closing_day ?? '')
    setNewDueDay(profile?.credit_card_due_day ?? '')
    setEditCard(true)
  }

  const saveBalance = async () => {
    if (newBalance == null) { toast.error('Informe o saldo'); return }
    setSaving(true)
    try { await updateBalance(newBalance); setEditBalance(false); toast.success('Saldo atualizado') }
    catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const saveCard = async () => {
    const hasValue = newCardBalance != null || newCardLimit != null
    const hasDates = newClosingDay !== '' || newDueDay !== ''
    if (!hasValue && !hasDates) { toast.error('Preencha ao menos um campo'); return }
    setSaving(true)
    try {
      await updateCreditCard({
        balance: newCardBalance,
        limit: newCardLimit,
        closingDay: newClosingDay !== '' ? newClosingDay : undefined,
        dueDay: newDueDay !== '' ? newDueDay : undefined,
      })
      setEditCard(false)
      toast.success('Cartão atualizado')
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const openTxModal = (type) => {
    setTxDefaultType(type)
    setAddTxModal(true)
  }

  const handleQuickSavings = async () => {
    if (!quickAmount || quickAmount <= 0) { toast.error('Informe o valor'); return }
    setSaving(true)
    try {
      if (savingsModal === 'deposit') {
        await depositToSavings(quickAmount, quickDesc || 'Depósito na poupança')
        toast.success('Valor incluído na poupança')
      } else {
        await withdrawFromSavings(quickAmount, quickDesc || 'Resgate da poupança')
        toast.success('Valor retirado da poupança')
      }
      setSavingsModal(null)
      setQuickAmount(null)
      setQuickDesc('')
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handleTransferInvestment = async () => {
    if (!quickAmount || quickAmount <= 0) { toast.error('Informe o valor'); return }
    setSaving(true)
    try {
      await transferInvestmentToIncome(quickAmount, quickDesc || 'Resgate de investimento')
      toast.success('Valor transferido para receitas')
      setTransferInvModal(false)
      setQuickAmount(null)
      setQuickDesc('')
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handleClearMonthIncome = async () => {
    setSaving(true)
    setConfirmClearIncome(false)
    try {
      const count = await deleteMonthIncome()
      toast.success(count > 0 ? `${count} receita(s) removida(s) do mês` : 'Nenhuma receita no mês')
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handlePayInvoice = async () => {
    const payAmount = cardBalance
    const afterAccount = accountTotal - payAmount
    setSaving(true)
    setConfirmPayCard(false)
    animatePayment(accountTotal, afterAccount, payAmount, 0)
    try {
      const result = await payCreditCardInvoice()
      const parcels = result.installmentUpdates?.length || 0
      toast.success(
        parcels > 0
          ? `Fatura paga · saldo em conta: ${fmt(afterAccount)} · ${parcels} parcela${parcels === 1 ? '' : 's'} avançada${parcels === 1 ? '' : 's'}`
          : `Fatura paga · saldo em conta: ${fmt(afterAccount)}`,
      )
    } catch (e) {
      setPayAnimating(false)
      setDisplayAccount(null)
      setDisplayCard(null)
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 animate-pulse">
      <div className="skeleton h-8 w-40 rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[...Array(3)].map((_,i) => <div key={i} className="skeleton h-28 rounded-3xl" />)}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_,i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
      </div>
      <div className="skeleton h-64 rounded-3xl" />
    </div>
  )

  if (error) return (
    <div className="p-8 text-center">
      <p className="text-red-400 mb-4">Erro ao carregar: {error}</p>
      <Button onClick={() => window.location.reload()} variant="secondary">Tentar novamente</Button>
    </div>
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">

      {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-white">Dashboard</h1>
          <p className="text-white/40 text-sm mt-0.5 capitalize truncate">{monthName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            icon={Calendar}
            compact
            value={`${year}-${month}`}
            onChange={(e) => { const [y,m] = e.target.value.split('-'); setYear(+y); setMonth(+m) }}
            aria-label="Selecionar mês"
            className="w-auto min-w-[10.5rem] sm:min-w-[11.5rem]"
          >
            {Array.from({ length: 12 }, (_, i) => {
              const d = new Date(year, i)
              return (
                <option key={i} value={`${year}-${i+1}`}>
                  {d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                </option>
              )
            })}
          </Select>
          <Button onClick={() => setAddPurchase(true)} size="md">
            <Plus size={15} aria-hidden="true" />
            <span className="hidden sm:inline">Adicionar compra</span>
            <span className="sm:hidden">Compra</span>
          </Button>
          <Button onClick={() => setAddTxModal(true)} size="md" variant="secondary" className="hidden sm:inline-flex">
            <Plus size={15} aria-hidden="true" />
            Receita / outro
          </Button>
        </div>
      </div>

      {/* Cards de saldo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <BalanceCard
          label="Saldo em conta"
          value={shownAccount}
          icon={Wallet}
          color="emerald"
          onEdit={() => { setNewBalance(profile?.account_balance); setEditBalance(true) }}
          onAction={() => { setQuickAmount(null); setQuickDesc(''); setSavingsModal('deposit') }}
          actionLabel="Incluir na poupança"
        />
        <CreditCardCard
          value={shownCard}
          closingDay={profile?.credit_card_closing_day}
          dueDay={profile?.credit_card_due_day}
          accountBalance={shownAccount}
          creditLimit={Number(profile?.credit_card_limit) || 0}
          availableLimit={availableCreditLimit}
          projectedInvoice={projectedCreditCardInvoice}
          onEdit={openCardEdit}
          onPayInvoice={() => setConfirmPayCard(true)}
          paying={saving || payAnimating}
        />
        <BalanceCard label="Saldo líquido" value={netBalance} icon={TrendingUp} color="brand" />
      </div>
      <p className="text-[11px] text-white/30 mb-4 -mt-2">
        Saldo líquido = saldo em conta (+ sub-carteiras ON) − fatura do cartão
      </p>

      <WalletsPanel
        wallets={wallets}
        onAdd={addWallet}
        onUpdate={updateWallet}
        onDelete={async (id) => { await deleteWallet(id); toast.success('Sub-carteira removida') }}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
        <StatCard
          label="Receitas"
          value={summary?.totalIncome}
          positive
          subtitle="Total do mês selecionado"
          actions={[
            { label: 'Registrar receita', onClick: () => openTxModal('income') },
            { label: 'Limpar receitas do mês', onClick: () => setConfirmClearIncome(true), variant: 'danger' },
          ]}
        />
        <StatCard
          label="Gastos"
          value={summary?.totalExpenses}
          positive={false}
          subtitle="Total do mês selecionado"
        />
        <StatCard
          label="Investimentos"
          value={investmentBalance}
          positive
          actions={[
            { label: 'Adicionar', onClick: () => openTxModal('investment') },
            { label: 'Incluir em receitas', onClick: () => { setQuickAmount(null); setQuickDesc(''); setTransferInvModal(true) } },
          ]}
        />
        <StatCard
          label="Poupança"
          value={savingsBalance}
          positive
          actions={[
            { label: 'Retirar da poupança', onClick: () => { setQuickAmount(null); setQuickDesc(''); setSavingsModal('withdraw') } },
          ]}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-white">Gastos por categoria</h2>
            <p className="text-xs text-white/30">Distribuição do mês</p>
          </CardHeader>
          <Suspense fallback={<ChartLoader />}>
            <ExpensePieChart data={summary?.byCategory} />
          </Suspense>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-white">Resumo financeiro</h2>
            <p className="text-xs text-white/30">Entradas vs saídas</p>
          </CardHeader>
          <Suspense fallback={<ChartLoader />}>
            <BalanceBarChart summary={summary} />
          </Suspense>
        </Card>
      </div>

      {summary?.items?.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-sm font-semibold text-white">Gastos do mês (detalhe)</h2>
            <p className="text-xs text-white/30">Todas as despesas registradas no período</p>
          </CardHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {summary.items.map(item => (
              <div key={item.id} className="flex items-center justify-between text-sm py-2 border-b border-white/[0.04] last:border-0">
                <div className="min-w-0">
                  <p className="text-white truncate">{item.description}{item.store ? ` · ${item.store}` : ''}</p>
                  <p className="text-[11px] text-white/35">
                    {item.purchaseType === 'installment'
                      ? `${formatPurchaseLabel(item)} ${formatInstallmentInvoiceStatus(item, { cardBalance })} · ${Number(item.installmentAmount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/parcela`
                      : item.paymentSource === 'credit_card' ? 'Cartão à vista' : 'À vista (conta)'}
                  </p>
                </div>
                <span className="text-red-400 mono-number flex-shrink-0 ml-2">
                  -{fmt(item.purchaseType === 'installment' ? item.installmentAmount || item.amount : item.amount)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modais */}
      <Modal isOpen={editBalance} onClose={() => setEditBalance(false)} title="Atualizar saldo em conta">
        <div className="space-y-4">
          <CurrencyInput label="Saldo atual da conta" value={newBalance} onChange={setNewBalance} />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setEditBalance(false)}>Cancelar</Button>
            <Button className="flex-1" loading={saving} onClick={saveBalance}>Salvar</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={editCard} onClose={() => setEditCard(false)} title="Atualizar cartão de crédito">
        <div className="space-y-4">
          <CurrencyInput label="Fatura atual" value={newCardBalance} onChange={setNewCardBalance} />
          <CurrencyInput label="Limite do cartão" value={newCardLimit} onChange={setNewCardLimit} />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Dia de fechamento"
              type="number"
              min={1}
              max={31}
              placeholder="Ex: 5"
              value={newClosingDay}
              onChange={e => setNewClosingDay(e.target.value)}
              hint="Dia em que a fatura fecha"
            />
            <Input
              label="Dia de vencimento"
              type="number"
              min={1}
              max={31}
              placeholder="Ex: 12"
              value={newDueDay}
              onChange={e => setNewDueDay(e.target.value)}
              hint="Dia limite para pagamento"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setEditCard(false)}>Cancelar</Button>
            <Button className="flex-1" loading={saving} onClick={saveCard}>Salvar</Button>
          </div>
        </div>
      </Modal>

      {addTxModal && (
        <TransactionModal
          defaultType={txDefaultType}
          onClose={() => setAddTxModal(false)}
          onSave={async (data) => { await addTransaction(data); setAddTxModal(false); toast.success('Transação adicionada') }}
        />
      )}

      {addPurchase && (
        <PurchaseModal
          onClose={() => setAddPurchase(false)}
          onSave={async (data) => { await savePurchase(data); setAddPurchase(false); toast.success('Compra registrada') }}
        />
      )}

      <ConfirmDialog
        isOpen={confirmPayCard}
        onCancel={() => setConfirmPayCard(false)}
        onConfirm={handlePayInvoice}
        title="Pagar fatura atual?"
        message={`Valor da fatura: ${fmt(cardBalance)}. Será debitado da conta (saldo após pagamento: ${fmt(accountTotal - cardBalance)}).`}
        confirmLabel="Pagar Fatura"
        cancelLabel="Cancelar"
      />

      <ConfirmDialog
        isOpen={confirmClearIncome}
        onCancel={() => setConfirmClearIncome(false)}
        onConfirm={handleClearMonthIncome}
        title="Limpar receitas do mês?"
        message={`Todas as receitas de ${monthName} serão excluídas e o saldo em conta será ajustado.`}
        confirmLabel="Limpar receitas"
        cancelLabel="Cancelar"
      />

      <Modal
        isOpen={!!savingsModal}
        onClose={() => setSavingsModal(null)}
        title={savingsModal === 'deposit' ? 'Incluir na poupança' : 'Retirar da poupança'}
      >
        <div className="space-y-4">
          <CurrencyInput label="Valor" value={quickAmount} onChange={setQuickAmount} />
          <Input
            label="Descrição (opcional)"
            value={quickDesc}
            onChange={e => setQuickDesc(e.target.value)}
            placeholder={savingsModal === 'deposit' ? 'Depósito na poupança' : 'Resgate da poupança'}
          />
          {savingsModal === 'withdraw' && (
            <p className="text-xs text-white/40">Saldo disponível na poupança: {fmt(savingsBalance)}</p>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setSavingsModal(null)}>Cancelar</Button>
            <Button className="flex-1" loading={saving} onClick={handleQuickSavings}>Confirmar</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={transferInvModal}
        onClose={() => setTransferInvModal(false)}
        title="Transferir investimento para receitas"
      >
        <div className="space-y-4">
          <CurrencyInput label="Valor" value={quickAmount} onChange={setQuickAmount} />
          <Input
            label="Descrição (opcional)"
            value={quickDesc}
            onChange={e => setQuickDesc(e.target.value)}
            placeholder="Resgate de investimento"
          />
          <p className="text-xs text-white/40">Saldo em investimentos: {fmt(investmentBalance)}</p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setTransferInvModal(false)}>Cancelar</Button>
            <Button className="flex-1" loading={saving} onClick={handleTransferInvestment}>Transferir</Button>
          </div>
        </div>
      </Modal>

      <ChatWidget />
    </div>
  )
}
