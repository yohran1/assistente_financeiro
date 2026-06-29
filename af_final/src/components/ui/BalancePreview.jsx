import { balanceImpactForTransaction, balanceImpactForRecurring } from '../../lib/balanceImpact'

const fmt = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Prévia dos saldos após salvar (conta, cartão e líquido). */
export function BalancePreview({
  accountBalance = 0,
  walletsIncludedTotal = 0,
  creditCardBalance = 0,
  draftTransaction,
  draftRecurring,
}) {
  const txImpact = balanceImpactForTransaction(draftTransaction)
  const recImpact = draftRecurring ? balanceImpactForRecurring(draftRecurring) : { account: 0, creditCard: 0 }
  const accountDelta = txImpact.account + recImpact.account
  const cardDelta = txImpact.creditCard + recImpact.creditCard

  if (!draftTransaction && !draftRecurring) return null
  if (accountDelta === 0 && cardDelta === 0) return null

  const accountTotal = (Number(accountBalance) || 0) + (Number(walletsIncludedTotal) || 0)
  const projectedAccount = accountTotal + accountDelta
  const projectedCard = (Number(creditCardBalance) || 0) + cardDelta
  const projectedNet = projectedAccount - projectedCard

  return (
    <div
      className="rounded-xl border border-brand-500/25 bg-brand-500/10 px-3.5 py-3 text-sm"
      aria-live="polite"
    >
      <p className="text-white/50 text-xs mb-1">Após salvar</p>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/70">Saldo em conta</span>
          <span className="font-semibold mono-number text-white">{fmt(projectedAccount)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/70">Fatura do cartão</span>
          <span className="font-semibold mono-number text-orange-300">{fmt(projectedCard)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/10">
          <span className="text-white/70">Saldo líquido (conta − cartão)</span>
          <span className={`font-semibold mono-number ${projectedNet >= 0 ? 'text-brand-300' : 'text-red-400'}`}>
            {fmt(projectedNet)}
          </span>
        </div>
      </div>
    </div>
  )
}
