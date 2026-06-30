import { useState, useEffect, useCallback } from 'react'

function detectStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
  )
}

function detectIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
}

/**
 * Hook para instalação PWA: beforeinstallprompt (Android/Chrome) e detecção standalone.
 */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled]       = useState(detectStandalone)
  const [isIos]                             = useState(detectIos)
  const [isStandalone, setIsStandalone]     = useState(detectStandalone)

  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    const mq = window.matchMedia('(display-mode: standalone)')
    const onDisplayChange = (ev) => {
      setIsStandalone(ev.matches)
      setIsInstalled(ev.matches)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    mq.addEventListener('change', onDisplayChange)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      mq.removeEventListener('change', onDisplayChange)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    if (outcome === 'accepted') setIsInstalled(true)
    return outcome === 'accepted'
  }, [deferredPrompt])

  return {
    canInstall: !!deferredPrompt,
    isInstalled,
    isIos,
    isStandalone,
    promptInstall,
  }
}
