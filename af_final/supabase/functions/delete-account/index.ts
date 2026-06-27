// Edge Function: Exclusão de conta (LGPD)
// SUPABASE_URL e SUPABASE_ANON_KEY são injetados automaticamente pelo Supabase
// SB_SERVICE_ROLE_KEY é setado manualmente via supabase secrets set

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "DELETE, OPTIONS",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== "DELETE") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  }

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Não autorizado" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  }

  // SUPABASE_URL e SUPABASE_ANON_KEY são injetados automaticamente
  const supabaseUrl  = Deno.env.get("SUPABASE_URL")!
  const anonKey      = Deno.env.get("SUPABASE_ANON_KEY")!
  // SB_SERVICE_ROLE_KEY foi setado manualmente (prefixo SUPABASE_ bloqueado pelo CLI)
  const serviceKey   = Deno.env.get("SB_SERVICE_ROLE_KEY")!

  // Verifica identidade do usuário
  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error } = await supabaseUser.auth.getUser()
  if (error || !user) {
    return new Response(JSON.stringify({ error: "Token inválido" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  }

  // Admin client para deletar o usuário
  const supabaseAdmin = createClient(supabaseUrl, serviceKey)

  try {
    // CASCADE no banco apaga profiles, transactions, categories, recurring_expenses
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (deleteError) throw deleteError

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("Erro ao deletar conta:", err)
    return new Response(JSON.stringify({ error: "Erro ao excluir conta" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  }
})
