import { balanceDeltaForTransaction } from '../../lib/balanceImpact'

const fmt = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Prévia do saldo em conta e líquido após uma transação (sem persistir). */
export function BalancePreview({
  accountBalance = 0,
  walletsIncludedTotal = 0,
  creditCardBalance = 0,
  draftTransaction,
}) {
  const delta = balanceDeltaForTransaction(draftTransaction)
  if (!draftTransaction || delta === 0) return null

  const accountTotal = (Number(accountBalance) || 0) + (Number(walletsIncludedTotal) || 0)
  const projectedAccount = accountTotal + delta
  const projectedNet = projectedAccount - (Number(creditCardBalance) || 0)

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
          <span className="text-white/70">Saldo líquido</span>
          <span className={`font-semibold mono-number ${projectedNet >= 0 ? 'text-brand-300' : 'text-red-400'}`}>
            {fmt(projectedNet)}
          </span>
        </div>
      </div>
    </div>
  )
}
