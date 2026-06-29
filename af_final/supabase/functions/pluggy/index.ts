import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PLUGGY_API = 'https://api.pluggy.ai'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

async function getPluggyApiKey(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch(`${PLUGGY_API}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = typeof data?.message === 'string' ? data.message : 'Falha ao autenticar na Pluggy'
    throw new Error(`pluggy_auth:${res.status}:${message}`)
  }

  const apiKey = data?.apiKey
  if (typeof apiKey !== 'string' || !apiKey) {
    throw new Error('pluggy_auth:502:Resposta inválida da Pluggy')
  }

  return apiKey
}

async function createConnectToken(
  apiKey: string,
  userId: string,
  itemId?: string,
): Promise<string> {
  const payload: Record<string, unknown> = {
    options: { clientUserId: userId },
  }

  const webhookUrl = Deno.env.get('PLUGGY_WEBHOOK_URL')
  if (webhookUrl) {
    ;(payload.options as Record<string, unknown>).webhookUrl = webhookUrl
  }

  if (itemId) payload.itemId = itemId

  const res = await fetch(`${PLUGGY_API}/connect_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify(payload),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = typeof data?.message === 'string' ? data.message : 'Falha ao criar connect token'
    throw new Error(`pluggy_token:${res.status}:${message}`)
  }

  const accessToken = data?.accessToken
  if (typeof accessToken !== 'string' || !accessToken) {
    throw new Error('pluggy_token:502:Resposta inválida da Pluggy')
  }

  return accessToken
}

function mapPluggyError(err: unknown): { status: number; error: string } {
  const raw = err instanceof Error ? err.message : String(err)
  const match = raw.match(/^pluggy_(?:auth|token):(\d{3}):(.+)$/)
  if (!match) {
    return { status: 500, error: 'Erro interno ao conectar com Open Finance' }
  }

  const pluggyStatus = Number(match[1])
  if (pluggyStatus === 401 || pluggyStatus === 403) {
    return { status: 503, error: 'Open Finance indisponível — credenciais Pluggy inválidas no servidor' }
  }

  return { status: 502, error: 'Não foi possível iniciar a conexão com o banco. Tente novamente.' }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Não autenticado' }, 401)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return jsonResponse({ error: 'Token inválido' }, 401)
    }

    const clientId = Deno.env.get('PLUGGY_CLIENT_ID')
    const clientSecret = Deno.env.get('PLUGGY_CLIENT_SECRET')
    if (!clientId || !clientSecret) {
      return jsonResponse({ error: 'Pluggy não configurado no servidor' }, 503)
    }

    const body = await req.json().catch(() => ({}))
    const action = body.action ?? 'connect-token'

    if (action === 'connect-token') {
      try {
        const apiKey = await getPluggyApiKey(clientId, clientSecret)
        const accessToken = await createConnectToken(apiKey, user.id, body.itemId)
        return jsonResponse({ accessToken })
      } catch (e) {
        const mapped = mapPluggyError(e)
        return jsonResponse({ error: mapped.error }, mapped.status)
      }
    }

    if (action === 'sync') {
      return jsonResponse({
        message: 'Sync ainda não implementado — cron diário varrerá item_id ativos',
        synced: 0,
      }, 501)
    }

    return jsonResponse({ error: 'Ação inválida' }, 400)
  } catch (e) {
    return jsonResponse({ error: String(e?.message ?? e) }, 500)
  }
})
