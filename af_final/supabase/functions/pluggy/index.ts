import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PLUGGY_API = 'https://api.pluggy.ai'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-pluggy-webhook-secret',
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

async function handleWebhook(req: Request, body: Record<string, unknown>): Promise<Response> {
  const expectedSecret = Deno.env.get('PLUGGY_WEBHOOK_SECRET')
  const providedSecret =
    req.headers.get('x-pluggy-webhook-secret') ??
    (typeof body.webhookSecret === 'string' ? body.webhookSecret : null)

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return jsonResponse({ error: 'Webhook não autorizado' }, 401)
  }

  const event = body.event ?? body.type ?? 'unknown'
  const itemId = body.itemId ?? (body.data as Record<string, unknown> | undefined)?.itemId ?? null

  // Stub: futuro processamento atualizará status e disparará sync de contas/transações.
  console.log('[pluggy/webhook]', { event, itemId })

  return jsonResponse({
    received: true,
    event,
    itemId,
    message: 'Webhook recebido — processamento assíncrono pendente',
  })
}

async function syncUserConnections(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  apiKey: string | null,
) {
  const { data: connections, error } = await supabase
    .from('pluggy_connections')
    .select('id, item_id, status, last_sync_at')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (error) {
    return { error: error.message, status: 500 as const }
  }

  const items = (connections ?? []).map((conn) => ({
    connectionId: conn.id,
    itemId: conn.item_id,
    lastSyncAt: conn.last_sync_at,
    // Placeholder para cron: GET /accounts?itemId=… e GET /transactions depois
    syncStatus: apiKey ? 'pending' : 'skipped_no_api_key',
    message: 'Importação de saldos e transações será implementada na próxima etapa',
  }))

  return {
    synced: 0,
    pending: items.length,
    items,
    cronHint: 'Agende POST pluggy { action: sync-all } com SB_SERVICE_ROLE_KEY para sync diário',
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const action = body.action ?? 'connect-token'

    if (action === 'webhook') {
      return handleWebhook(req, body)
    }

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

    if (action === 'connect-token') {
      if (!clientId || !clientSecret) {
        return jsonResponse({ error: 'Pluggy não configurado no servidor' }, 503)
      }
      try {
        const apiKey = await getPluggyApiKey(clientId, clientSecret)
        const accessToken = await createConnectToken(apiKey, user.id, body.itemId)
        return jsonResponse({ accessToken })
      } catch (e) {
        const mapped = mapPluggyError(e)
        return jsonResponse({ error: mapped.error }, mapped.status)
      }
    }

    if (action === 'save-connection') {
      const itemId = body.itemId
      if (typeof itemId !== 'string' || !itemId.trim()) {
        return jsonResponse({ error: 'itemId obrigatório' }, 400)
      }

      const { data: connection, error: upsertError } = await supabase
        .from('pluggy_connections')
        .upsert(
          {
            user_id: user.id,
            item_id: itemId.trim(),
            status: 'active',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,item_id' },
        )
        .select('id, item_id, status, last_sync_at, created_at')
        .single()

      if (upsertError) {
        return jsonResponse({ error: upsertError.message }, 500)
      }

      return jsonResponse({ connection })
    }

    if (action === 'sync') {
      let apiKey: string | null = null
      if (clientId && clientSecret) {
        try {
          apiKey = await getPluggyApiKey(clientId, clientSecret)
        } catch {
          apiKey = null
        }
      }

      const result = await syncUserConnections(supabase, user.id, apiKey)
      if ('error' in result && result.error) {
        return jsonResponse({ error: result.error }, result.status)
      }

      return jsonResponse(result)
    }

    if (action === 'sync-all') {
      const serviceKey = Deno.env.get('SB_SERVICE_ROLE_KEY')
      const cronSecret = Deno.env.get('PLUGGY_CRON_SECRET')
      if (!serviceKey || body.cronSecret !== cronSecret) {
        return jsonResponse({ error: 'Não autorizado para sync em lote' }, 403)
      }

      const admin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        serviceKey,
      )

      const { data: connections, error } = await admin
        .from('pluggy_connections')
        .select('id, user_id, item_id, status')
        .eq('status', 'active')

      if (error) {
        return jsonResponse({ error: error.message }, 500)
      }

      let apiKey: string | null = null
      if (clientId && clientSecret) {
        try {
          apiKey = await getPluggyApiKey(clientId, clientSecret)
        } catch {
          apiKey = null
        }
      }

      const byUser = new Map<string, typeof connections>()
      for (const conn of connections ?? []) {
        const list = byUser.get(conn.user_id) ?? []
        list.push(conn)
        byUser.set(conn.user_id, list)
      }

      const batches = []
      for (const [userId, userConns] of byUser) {
        batches.push({
          userId,
          items: userConns.map((c) => ({
            connectionId: c.id,
            itemId: c.item_id,
            syncStatus: apiKey ? 'pending' : 'skipped_no_api_key',
          })),
        })
      }

      return jsonResponse({
        users: batches.length,
        connections: connections?.length ?? 0,
        synced: 0,
        message: 'Sync em lote — estrutura pronta para cron; importação de dados pendente',
        batches,
      })
    }

    return jsonResponse({ error: 'Ação inválida' }, 400)
  } catch (e) {
    return jsonResponse({ error: String(e?.message ?? e) }, 500)
  }
})
