import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401, headers: CORS_HEADERS })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers: CORS_HEADERS })
    }

    const clientId = Deno.env.get('PLUGGY_CLIENT_ID')
    const clientSecret = Deno.env.get('PLUGGY_CLIENT_SECRET')
    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: 'Pluggy não configurado no servidor' }), { status: 503, headers: CORS_HEADERS })
    }

    const body = await req.json().catch(() => ({}))
    const action = body.action ?? 'connect-token'

    if (action === 'connect-token') {
      // TODO Fase E: trocar por chamada real à API Pluggy
      return new Response(JSON.stringify({
        message: 'Skeleton Pluggy — configure PLUGGY_CLIENT_ID/SECRET e implemente POST https://api.pluggy.ai/connect_token',
        userId: user.id,
      }), { status: 501, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })
    }

    if (action === 'sync') {
      return new Response(JSON.stringify({
        message: 'Skeleton sync — cron diário (~03:00) varrerá item_id ativos',
        synced: 0,
      }), { status: 501, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }), { status: 400, headers: CORS_HEADERS })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: CORS_HEADERS })
  }
})
