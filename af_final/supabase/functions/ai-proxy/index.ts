// Supabase Edge Function — Proxy seguro para IA
// SUPABASE_URL e SUPABASE_ANON_KEY são injetados automaticamente
// GEMINI_API_KEY, GROQ_API_KEY, SB_SERVICE_ROLE_KEY e ALLOWED_ORIGIN são setados via CLI

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const DEFAULT_ORIGINS = Array.from(new Set([
  'http://localhost:3000',
  'http://localhost:3001',
  ...(Deno.env.get('ALLOWED_ORIGIN') || '').split(',').map((origin) => origin.trim()).filter(Boolean),
]))
const CORS_BASE_HEADERS = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
}

function buildCorsHeaders(origin?: string) {
  const allowedOrigin = origin && DEFAULT_ORIGINS.includes(origin)
    ? origin
    : origin && DEFAULT_ORIGINS.length === 0
      ? origin
      : DEFAULT_ORIGINS[0]

  return {
    ...CORS_BASE_HEADERS,
    "Access-Control-Allow-Origin": allowedOrigin,
  }
}

// Rate limiting simples em memória (por usuário)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT   = 20
const RATE_WINDOW  = 60000

function checkRateLimit(userId: string): boolean {
  const now   = Date.now()
  const entry = rateLimitMap.get(userId)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

// Lê uma lista de chaves de um provedor. Aceita "<NOME>S" (várias, separadas
// por vírgula) com fallback para "<NOME>" (uma só). Permite failover entre
// chaves reservas quando uma estoura o limite (429) ou falha.
function getApiKeys(baseName: string): string[] {
  const multi = Deno.env.get(`${baseName}S`) || ""
  const single = Deno.env.get(baseName) || ""
  const all = `${multi},${single}`
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
  return Array.from(new Set(all))
}

// ── Gemini ───────────────────────────────────────────────────
async function callGemini(messages: any[], context: any, apiKey: string): Promise<string> {
  const systemPrompt = buildSystemPrompt(context)
  const contents = messages
    .filter(m => m.role !== "system")
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }))

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7, topP: 0.9 },
        safetySettings: [
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ],
      }),
    }
  )

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`Gemini error ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta"
}

// ── Groq (fallback) ──────────────────────────────────────────
async function callGroq(messages: any[], context: any, apiKey: string): Promise<string> {
  const systemPrompt = buildSystemPrompt(context)
  const allMessages  = [
    { role: "system", content: systemPrompt },
    ...messages.filter(m => m.role !== "system"),
  ]

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: allMessages,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`Groq error ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || "Sem resposta"
}

function buildSystemPrompt(context: any): string {
  return `Você é um assistente financeiro pessoal inteligente e amigável em português brasileiro.

CONTEXTO FINANCEIRO DO USUÁRIO:
- Saldo em conta: R$ ${(context.accountBalance || 0).toFixed(2)}
- Fatura do cartão: R$ ${(context.creditCardBalance || 0).toFixed(2)}
- Total de receitas (mês): R$ ${(context.totalIncome || 0).toFixed(2)}
- Total de gastos (mês): R$ ${(context.totalExpenses || 0).toFixed(2)}
- Categorias disponíveis: ${(context.categories || []).map((c: any) => c.name).join(", ") || "Nenhuma"}

INSTRUÇÕES:
- Responda sempre em português brasileiro de forma clara e objetiva
- Quando o usuário pedir para registrar algo, diga que você inseriu e peça para ele verificar
- Dê conselhos financeiros personalizados baseados no contexto acima
- Seja proativo em identificar padrões de gastos
- Máximo 3 parágrafos por resposta
- Use emojis moderadamente para tornar a conversa mais amigável`
}

// ── Router com failover automático entre múltiplas chaves ────
// Tenta cada chave do Gemini em ordem; se todas falharem (ex.: cota 429),
// tenta cada chave do Groq. Assim o sistema não trava quando uma IA atinge
// o limite — basta cadastrar chaves reservas em GEMINI_API_KEYS / GROQ_API_KEYS.
async function routeAI(messages: any[], context: any): Promise<string> {
  const geminiKeys = getApiKeys("GEMINI_API_KEY")
  const groqKeys = getApiKeys("GROQ_API_KEY")

  if (geminiKeys.length === 0 && groqKeys.length === 0) {
    throw new Error("Nenhuma chave de IA configurada. Defina GEMINI_API_KEYS ou GROQ_API_KEYS nas secrets do Supabase.")
  }

  const providers: Array<{ name: string; keys: string[]; call: (k: string) => Promise<string> }> = [
    { name: "Gemini", keys: geminiKeys, call: (k) => callGemini(messages, context, k) },
    { name: "Groq", keys: groqKeys, call: (k) => callGroq(messages, context, k) },
  ]

  for (const provider of providers) {
    for (let i = 0; i < provider.keys.length; i++) {
      try {
        return await provider.call(provider.keys[i])
      } catch (err) {
        console.warn(`${provider.name} chave #${i + 1} falhou: ${(err as Error).message}`)
      }
    }
  }

  throw new Error("Assistente temporariamente indisponível")
}

// ── Handler principal ─────────────────────────────────────────
serve(async (req) => {
  const origin = req.headers.get("origin") || undefined
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: buildCorsHeaders(origin) })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" },
    })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" },
      })
    }

    // SUPABASE_URL e SUPABASE_ANON_KEY são injetados automaticamente
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" },
      })
    }

    if (!checkRateLimit(user.id)) {
      return new Response(JSON.stringify({ error: "Muitas requisições. Aguarde um momento." }), {
        status: 429,
        headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" },
      })
    }

    const body = await req.json()
    const { messages, context } = body
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Mensagens inválidas" }), {
        status: 400,
        headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" },
      })
    }

    const trimmedMessages = messages.slice(-20)
    const content = await routeAI(trimmedMessages, context || {})

    return new Response(JSON.stringify({ content }), {
      status: 200,
      headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" },
    })

  } catch (error) {
    console.error("Edge function error:", error)
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Erro interno" }),
      {
        status: 500,
        headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" },
      }
    )
  }
})
