import { useState, useEffect } from 'react'

/** Calcula bottom/height do painel fixo acima do teclado virtual (iOS/Android). */
export function computeMobilePanelLayout(innerHeight, vv) {
  if (!vv) return { bottom: 0, height: null }
  const bottom = Math.max(0, innerHeight - vv.height - vv.offsetTop)
  return { bottom, height: vv.height }
}

/** Acompanha visualViewport para reposicionar painéis fixos no mobile. */
export function useMobileViewport(active) {
  const [layout, setLayout] = useState({ bottom: 0, height: null })

  useEffect(() => {
    if (!active || typeof window === 'undefined') {
      setLayout({ bottom: 0, height: null })
      return
    }

    const isMobile = window.matchMedia('(max-width: 767px)').matches
    if (!isMobile) {
      setLayout({ bottom: 0, height: null })
      return
    }

    const vv = window.visualViewport
    if (!vv) return

    const update = () => {
      setLayout(computeMobilePanelLayout(window.innerHeight, vv))
    }

    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [active])

  return layout
}
