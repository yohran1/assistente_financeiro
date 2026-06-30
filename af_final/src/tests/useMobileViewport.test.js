import { describe, it, expect } from 'vitest'
import { computeMobilePanelLayout } from '../lib/useMobileViewport'

describe('computeMobilePanelLayout', () => {
  it('retorna bottom 0 quando teclado fechado', () => {
    const vv = { height: 800, offsetTop: 0 }
    expect(computeMobilePanelLayout(800, vv)).toEqual({ bottom: 0, height: null, keyboardOpen: false })
  })

  it('eleva o painel quando teclado reduz visualViewport', () => {
    const vv = { height: 450, offsetTop: 0 }
    expect(computeMobilePanelLayout(800, vv)).toEqual({ bottom: 350, height: 450, keyboardOpen: true })
  })

  it('considera offsetTop do visualViewport (iOS)', () => {
    const vv = { height: 500, offsetTop: 50 }
    expect(computeMobilePanelLayout(800, vv)).toEqual({ bottom: 250, height: 500, keyboardOpen: true })
  })

  it('retorna layout neutro sem visualViewport', () => {
    expect(computeMobilePanelLayout(800, null)).toEqual({ bottom: 0, height: null, keyboardOpen: false })
  })
})
