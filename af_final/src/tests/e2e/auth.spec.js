import { test, expect } from '@playwright/test'

test.describe('Autenticação', () => {
  test('página de login renderiza corretamente', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Bem-vindo de volta')).toBeVisible()
    await expect(page.getByPlaceholder('seu@email.com')).toBeVisible()
  })

  test('exibe erro com credenciais inválidas', async ({ page }) => {
    await page.route('**/auth/v1/token?grant_type=password', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid login credentials' }),
      })
    })

    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.fill('[placeholder="seu@email.com"]', 'invalido@teste.com')
    await page.fill('[placeholder="Sua senha"]', 'senhaerrada')
    await page.click('button[type="submit"]')
    await expect(page.getByText(/email ou senha/i)).toBeVisible({ timeout: 5000 })
  })

  test('navega para cadastro', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.click('text=Criar conta grátis')
    await expect(page).toHaveURL('/register')
  })
})
