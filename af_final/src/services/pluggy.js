import { supabase } from '../lib/supabase'

function getHttpStatus(error) {
  return error?.context?.status ?? error?.status ?? null
}

/**
 * Solicita connect token Pluggy via edge function (Fase E — skeleton).
 * Retorna { ok, status, message, data } sem expor chaves no frontend.
 */
export async function requestPluggyConnectToken() {
  const { data, error } = await supabase.functions.invoke('pluggy', {
    body: { action: 'connect-token' },
  })

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
