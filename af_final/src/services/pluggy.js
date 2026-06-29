import { supabase } from '../lib/supabase'

const PLUGGY_CDN = 'https://cdn.pluggy.ai/pluggy-connect/v2.8.2/pluggy-connect.js'

let pluggyScriptPromise = null

function getHttpStatus(error) {
  return error?.context?.status ?? error?.status ?? null
}

function loadPluggyConnectSdk() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Pluggy Connect só funciona no navegador'))
  }
  if (window.PluggyConnect) {
    return Promise.resolve(window.PluggyConnect)
  }
  if (!pluggyScriptPromise) {
    pluggyScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = PLUGGY_CDN
      script.async = true
      script.onload = () => {
        if (window.PluggyConnect) resolve(window.PluggyConnect)
        else reject(new Error('SDK Pluggy não carregou corretamente'))
      }
      script.onerror = () => reject(new Error('Falha ao carregar o widget Pluggy Connect'))
      document.head.appendChild(script)
    })
  }
  return pluggyScriptPromise
}

/**
 * Abre o widget Pluggy Connect com o accessToken obtido no backend.
 */
export async function openPluggyConnect(accessToken, callbacks = {}) {
  const PluggyConnect = await loadPluggyConnectSdk()
  const widget = new PluggyConnect({
    connectToken: accessToken,
    includeSandbox: import.meta.env.DEV,
    language: 'pt',
    onSuccess: (data) => callbacks.onSuccess?.(data),
    onError: (error) => callbacks.onError?.(error),
    onClose: () => callbacks.onClose?.(),
  })
  widget.init()
  return widget
}

/** Extrai item_id do payload onSuccess do Pluggy Connect. */
export function extractPluggyItemId(successData) {
  const id = successData?.item?.id ?? successData?.id ?? successData?.itemId
  return typeof id === 'string' && id.length > 0 ? id : null
}

/**
 * Solicita connect token Pluggy via edge function.
 * Retorna { ok, status, message, accessToken, data } sem expor chaves no frontend.
 */
export async function requestPluggyConnectToken(itemId) {
  const body = { action: 'connect-token' }
  if (itemId) body.itemId = itemId

  const { data, error } = await supabase.functions.invoke('pluggy', { body })

  const httpStatus = getHttpStatus(error)

  if (httpStatus === 501) {
    return {
      ok: false,
      status: 501,
      message: data?.message ?? 'Integração Open Finance em desenvolvimento.',
      data,
    }
  }

  if (httpStatus === 503) {
    return {
      ok: false,
      status: 503,
      message: data?.error ?? 'Open Finance indisponível no servidor.',
      data,
    }
  }

  if (httpStatus === 502) {
    return {
      ok: false,
      status: 502,
      message: data?.error ?? 'Não foi possível iniciar a conexão com o banco.',
      data,
    }
  }

  if (error) {
    throw new Error(data?.error ?? error.message ?? 'Erro ao conectar com Open Finance')
  }

  return {
    ok: true,
    status: 200,
    accessToken: data?.accessToken ?? null,
    message: null,
    data,
  }
}

/** Persiste item_id via edge function após sucesso no widget. */
export async function savePluggyConnection(itemId) {
  const { data, error } = await supabase.functions.invoke('pluggy', {
    body: { action: 'save-connection', itemId },
  })

  const httpStatus = getHttpStatus(error)
  if (httpStatus === 400 || httpStatus === 500) {
    throw new Error(data?.error ?? 'Não foi possível salvar a conexão bancária')
  }
  if (error) {
    throw new Error(data?.error ?? error.message ?? 'Erro ao salvar conexão')
  }

  return data?.connection ?? data
}

/** Lista conexões Pluggy do usuário autenticado (RLS). */
export async function fetchPluggyConnections() {
  const { data, error } = await supabase
    .from('pluggy_connections')
    .select('id, item_id, status, last_sync_at, created_at')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}
