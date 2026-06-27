import { supabase } from '../lib/supabase'
import DOMPurify from 'dompurify'

/**
 * Cadastra novo usuário com confirmação de email
 */
export async function signUp({ email, password, name }) {
  const cleanName = DOMPurify.sanitize(name.trim())
  const cleanEmail = email.trim().toLowerCase()

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: { name: cleanName },
      emailRedirectTo: `${window.location.origin}/auth/confirm`,
    },
  })

  if (error) throw error
  return data
}

/**
 * Login com email e senha
 */
export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (error) {
    // Mensagem genérica para não vazar informação
    if (error.message.includes('Invalid login')) {
      throw new Error('Email ou senha incorretos')
    }
    throw error
  }

  return data
}

/**
 * Logout — revoga token no servidor
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  // Limpa qualquer estado local
  localStorage.removeItem('af_theme')
}

/**
 * Solicita redefinição de senha
 */
export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo: `${window.location.origin}/auth/reset-password` }
  )
  if (error) throw error
}

/**
 * Atualiza senha (após clicar no link do email)
 */
export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

/**
 * Atualiza perfil do usuário
 */
export async function updateProfile({ name, email }) {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  if (!session?.user?.id) throw new Error('Não autenticado')

  const userId = session.user.id
  const updates = {}
  if (name) updates.data = { name: DOMPurify.sanitize(name.trim()) }
  if (email) updates.email = email.trim().toLowerCase()

  let authResult = null
  if (Object.keys(updates).length > 0) {
    const { data, error } = await supabase.auth.updateUser(updates)
    if (error) throw error
    authResult = data
  }

  if (name) {
    const cleanName = DOMPurify.sanitize(name.trim())
    const { data, error } = await supabase
      .from('profiles')
      .update({ name: cleanName, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single()
    if (error) throw error
    return { auth: authResult, profile: data }
  }

  return authResult
}

/**
 * Deleta conta e todos os dados (LGPD)
 */
export async function deleteAccount() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Não autenticado')

  // Chama Edge Function que deleta dados em cascata + auth.user
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  )

  if (!response.ok) throw new Error('Erro ao deletar conta')
  await signOut()
}

/**
 * Exporta todos os dados do usuário (LGPD)
 */
export async function exportUserData() {
  const [profileResponse, transactionsResponse, recurringResponse, categoriesResponse] = await Promise.all([
    supabase.from('profiles').select('*').single(),
    supabase.from('transactions').select('*').order('created_at', { ascending: false }),
    supabase.from('recurring_expenses').select('*').order('created_at', { ascending: false }),
    supabase.from('categories').select('*').order('created_at', { ascending: false }),
  ])

  if (profileResponse.error) throw profileResponse.error
  if (transactionsResponse.error) throw transactionsResponse.error
  if (recurringResponse.error) throw recurringResponse.error
  if (categoriesResponse.error) throw categoriesResponse.error

  return {
    exportedAt: new Date().toISOString(),
    profile: profileResponse.data,
    transactions: transactionsResponse.data ?? [],
    recurringExpenses: recurringResponse.data ?? [],
    categories: categoriesResponse.data ?? [],
  }
}
