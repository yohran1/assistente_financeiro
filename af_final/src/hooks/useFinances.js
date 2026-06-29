import { useState, useEffect, useCallback } from 'react'
import { subscribeToChanges } from '../lib/realtime'
import {
  getProfile,
  getTransactions,
  getFinancialSummary,
  getCategories,
  getRecurringExpenses,
  updateAccountBalance,
  updateCreditCard,
  addTransaction,
  updateTransaction,
  deleteTransaction,
} from '../services/finances'

export function useFinances() {
  const [profile, setProfile] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState(null)
  const [categories, setCategories] = useState([])
  const [recurringExpenses, setRecurringExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const loadAll = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [p, t, s, c, r] = await Promise.all([
        getProfile(),
        getTransactions({ month, year }),
        getFinancialSummary(month, year),
        getCategories(),
        getRecurringExpenses(),
      ])
      setProfile(p)
      setTransactions(t)
      setSummary(s)
      setCategories(c)
      setRecurringExpenses(r)
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

  return {
    profile,
    transactions,
    summary,
    categories,
    recurringExpenses,
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
    updateTransaction: handleUpdateTransaction,
    deleteTransaction: handleDeleteTransaction,
  }
}
