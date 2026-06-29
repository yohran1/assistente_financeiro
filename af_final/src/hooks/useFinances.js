import { useState, useEffect, useCallback } from 'react'
import { subscribeToChanges } from '../lib/realtime'
import {
  getProfile,
  getTransactions,
  getFinancialSummary,
  getCategories,
  getRecurringExpenses,
  getWallets,
  getActiveInstallments,
  updateAccountBalance,
  updateCreditCard,
  payCreditCardInvoice,
  addTransaction,
  addPurchase,
  updateTransaction,
  deleteTransaction,
  addWallet,
  updateWallet,
  deleteWallet,
} from '../services/finances'
import { computeAvailableCreditLimit } from '../lib/balanceImpact'
import { computeProjectedCreditCardInvoice, isNextInvoicePreviewEligible } from '../lib/creditCardBilling'

export function useFinances() {
  const [profile, setProfile] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState(null)
  const [categories, setCategories] = useState([])
  const [recurringExpenses, setRecurringExpenses] = useState([])
  const [activeInstallments, setActiveInstallments] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])
  const [wallets, setWallets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const loadAll = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [p, t, s, c, r, w, inst, recent] = await Promise.all([
        getProfile(),
        getTransactions({ month, year }),
        getFinancialSummary(month, year),
        getCategories(),
        getRecurringExpenses(),
        getWallets(),
        getActiveInstallments(),
        getTransactions({ limit: 150 }),
      ])
      setProfile(p)
      setTransactions(t)
      setSummary(s)
      setCategories(c)
      setRecurringExpenses(r)
      setWallets(w)
      setActiveInstallments(inst)
      setRecentTransactions(recent)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Realtime — atualiza transações automaticamente
  useEffect(() => {
    // Usa o singleton de realtime para registrar apenas uma subscription
    let mounted = true
    const unsubscribe = subscribeToChanges(() => {
      if (!mounted) return
      // Protege contra atualizações depois de desmontar
      loadAll().catch(err => console.error('loadAll error', err))
    })

    return () => { mounted = false; unsubscribe() }
  }, [loadAll])

  // Ações
  const handleUpdateBalance = async (value) => {
    const updated = await updateAccountBalance(value)
    setProfile(prev => ({
      ...prev,
      account_balance: Number(updated.account_balance) || 0,
    }))
    return updated
  }

  const handleUpdateCreditCard = async (data) => {
    const updated = await updateCreditCard(data)
    setProfile(prev => ({
      ...prev,
      credit_card_balance: Number(updated.credit_card_balance) || 0,
      credit_card_limit: Number(updated.credit_card_limit) || 0,
      credit_card_closing_day: updated.credit_card_closing_day ?? null,
      credit_card_due_day: updated.credit_card_due_day ?? null,
    }))
    return updated
  }

  const handleAddTransaction = async (data) => {
    const tx = await addTransaction(data)
    await loadAll() // Recarrega resumo
    return tx
  }

  const handleUpdateTransaction = async (id, data) => {
    const tx = await updateTransaction(id, data)
    setTransactions(prev => prev.map(t => t.id === id ? tx : t))
    await loadAll()
    return tx
  }

  const handleDeleteTransaction = async (id) => {
    await deleteTransaction(id)
    setTransactions(prev => prev.filter(t => t.id !== id))
    await loadAll()
  }

  const handleAddWallet = async (data) => {
    const w = await addWallet(data)
    setWallets(prev => [...prev, w])
    return w
  }

  const handleUpdateWallet = async (id, data) => {
    const w = await updateWallet(id, data)
    setWallets(prev => prev.map(x => x.id === id ? w : x))
    return w
  }

  const handleDeleteWallet = async (id) => {
    await deleteWallet(id)
    setWallets(prev => prev.filter(w => w.id !== id))
  }

  const handleAddPurchase = async (data) => {
    const result = await addPurchase(data)
    await loadAll()
    return result
  }

  const handlePayCreditCardInvoice = async () => {
    const result = await payCreditCardInvoice()
    setProfile(prev => ({
      ...prev,
      account_balance: Number(result.profile.account_balance) || 0,
      credit_card_balance: Number(result.profile.credit_card_balance) || 0,
      credit_card_invoice_paid_at: result.profile.credit_card_invoice_paid_at ?? null,
    }))
    await loadAll()
    return result
  }

  const walletsIncludedTotal = wallets
    .filter(w => w.include_in_total)
    .reduce((sum, w) => sum + (Number(w.balance) || 0), 0)

  const closingDay = profile?.credit_card_closing_day
  const showNextInvoicePreview = isNextInvoicePreviewEligible({
    closingDay,
    creditCardBalance: profile?.credit_card_balance,
    invoicePaidAt: profile?.credit_card_invoice_paid_at,
  })
  const projectedCreditCardInvoice = closingDay && showNextInvoicePreview
    ? computeProjectedCreditCardInvoice({
        transactions: recentTransactions,
        activeInstallments,
        recurringExpenses,
        closingDay,
        baseBalance: 0,
      })
    : { items: [], total: 0 }

  const availableCreditLimit = computeAvailableCreditLimit(
    profile?.credit_card_limit,
    activeInstallments,
  )

  return {
    profile,
    transactions,
    summary,
    categories,
    recurringExpenses,
    activeInstallments,
    projectedCreditCardInvoice,
    availableCreditLimit,
    wallets,
    walletsIncludedTotal,
    loading,
    error,
    month,
    year,
    setMonth,
    setYear,
    refresh: loadAll,
    updateBalance: handleUpdateBalance,
    updateCreditCard: handleUpdateCreditCard,
    addTransaction: handleAddTransaction,
    addPurchase: handleAddPurchase,
    payCreditCardInvoice: handlePayCreditCardInvoice,
    updateTransaction: handleUpdateTransaction,
    deleteTransaction: handleDeleteTransaction,
    addWallet: handleAddWallet,
    updateWallet: handleUpdateWallet,
    deleteWallet: handleDeleteWallet,
  }
}
