const PWA_NEED_REFRESH = 'pwa:need-refresh'

let applyUpdate = null

export function initPwaUpdate() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      applyUpdate = registerSW({
        immediate: true,
        onNeedRefresh() {
          window.dispatchEvent(new CustomEvent(PWA_NEED_REFRESH))
        },
      })
    })
    .catch(() => {})
}

export function onPwaNeedRefresh(callback) {
  const handler = () => callback()
  window.addEventListener(PWA_NEED_REFRESH, handler)
  return () => window.removeEventListener(PWA_NEED_REFRESH, handler)
}

export function applyPwaUpdate() {
  applyUpdate?.(true)
}
