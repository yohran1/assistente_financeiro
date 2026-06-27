import { describe, it, expect, vi } from 'vitest'

// Mock do Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

import { signIn } from '../services/auth'
import { supabase } from '../lib/supabase'

describe('Auth Service', () => {
  it('signIn chama supabase com email lowercase', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ data: { user: {} }, error: null })
    await signIn({ email: 'TESTE@EMAIL.COM', password: '12345678' })
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'teste@email.com',
      password: '12345678',
    })
  })

  it('signIn lança erro com mensagem genérica em login inválido', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials' },
    })
    await expect(signIn({ email: 'a@b.com', password: 'errado' }))
      .rejects.toThrow('Email ou senha incorretos')
  })
})
