import { supabase } from './supabase'

let channel = null
let listeners = new Set()
let pending = false
let debounceTimer = null

function ensureChannel() {
  if (channel) return channel

  function handlePayload(payload) {
    pending = true
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      if (!pending) return
      pending = false
      listeners.forEach(cb => {
        try { cb(payload) } catch (e) { console.error('listener error', e) }
      })
    }, 200)
  }

  // Cria um canal único para toda a aplicação
  channel = supabase
    .channel('shared-finance-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, handlePayload)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, handlePayload)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'recurring_expenses' }, handlePayload)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, handlePayload)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, handlePayload)
    .subscribe()

  return channel
}

export function subscribeToChanges(cb) {
  if (typeof cb !== 'function') throw new Error('callback obrigatório')
  ensureChannel()
  listeners.add(cb)

  // Retorno para cancelar a inscrição desta callback
  return () => {
    listeners.delete(cb)
    if (listeners.size === 0 && channel) {
      clearTimeout(debounceTimer)
      supabase.removeChannel(channel)
      channel = null
    }
  }
}
