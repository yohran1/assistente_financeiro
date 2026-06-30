// Supabase Edge Function — Proxy seguro para IA
// SUPABASE_URL e SUPABASE_ANON_KEY são injetados automaticamente
// GEMINI_API_KEY, GROQ_API_KEY, SB_SERVICE_ROLE_KEY e ALLOWED_ORIGIN são setados via CLI

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const LOCAL_DEV_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
]

const CORS_BASE_HEADERS = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function parseAllowedOrigins(): string[] {
  const raw = (Deno.env.get("ALLOWED_ORIGIN") || "").trim()
  if (raw === "*") return ["*"]
  const fromEnv = raw.split(",").map((origin) => origin.trim()).filter(Boolean)
  return Array.from(new Set([...LOCAL_DEV_ORIGINS, ...fromEnv]))
}

/** Preview deploys Vercel (*.vercel.app) — permitidos sem listar cada URL. */
function isVercelAppOrigin(origin: string): boolean {
  try {
    const { protocol, hostname } = new URL(origin)
    return protocol === "https:" && hostname.endsWith(".vercel.app")
  } catch {
    return false
  }
}

function resolveCorsOrigin(requestOrigin?: string): string {
  const allowed = parseAllowedOrigins()
  if (allowed.includes("*")) return "*"
  if (requestOrigin) {
    if (allowed.includes(requestOrigin)) return requestOrigin
    if (isVercelAppOrigin(requestOrigin)) return requestOrigin
  }
  const productionOrigin = allowed.find((o) => !LOCAL_DEV_ORIGINS.includes(o))
  return productionOrigin || allowed[0] || "*"
}

function buildCorsHeaders(origin?: string) {
  return {
    ...CORS_BASE_HEADERS,
    "Access-Control-Allow-Origin": resolveCorsOrigin(origin),
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
  const keys: string[] = []
  const multi = Deno.env.get(`${baseName}S`) || ""
  const single = Deno.env.get(baseName) || ""
  keys.push(
    ...`${multi},${single}`.split(",").map((k) => k.trim()).filter(Boolean),
  )
  for (let i = 2; i <= 5; i++) {
    const extra = Deno.env.get(`${baseName}_${i}`)
    if (extra?.trim()) keys.push(extra.trim())
  }
  return Array.from(new Set(keys))
}

function isRetryableProviderError(err: unknown): boolean {
  const msg = String((err as Error)?.message || err).toLowerCase()
  return (
    msg.includes("429") ||
    msg.includes("503") ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("resource_exhausted") ||
    msg.includes("too many requests") ||
    msg.includes("error 401") ||
    msg.includes("error 403")
  )
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
  return `Voce e um assistente financeiro pessoal em portugues brasileiro.

CONTEXTO FINANCEIRO:
- Saldo em conta: R$ ${(context.accountBalance || 0).toFixed(2)}
- Fatura do cartao: R$ ${(context.creditCardBalance || 0).toFixed(2)}
- Receitas do mes: R$ ${(context.totalIncome || 0).toFixed(2)}
- Gastos do mes: R$ ${(context.totalExpenses || 0).toFixed(2)}
- Categorias: ${(context.categories || []).map((c: any) => c.name).join(", ") || "Nenhuma"}

REGRAS DE RESPOSTA:
- Respostas curtas e objetivas (maximo 2 paragrafos curtos)
- NUNCA use markdown: sem asteriscos, hashtags, backticks ou listas com hifen
- Texto simples, direto, amigavel
- Sem emojis excessivos (no maximo 1)

REGISTRO DE TRANSACOES:
Quando o usuario pedir para registrar gasto, receita ou compra, inclua UMA linha no final:
ACTION: {"type":"add_expense","description":"descricao","amount":50.00,"payment_source":"account"}
Tipos validos: add_expense, add_income, add_purchase
payment_source: account ou credit_card
purchase_type (add_purchase): one_off ou installment
Confirme brevemente o que foi registrado e peca para o usuario conferir no dashboard.`
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^[-*]\s+/gm, "")
    .trim()
}

function parseAiResponse(raw: string): { content: string; action: Record<string, unknown> | null } {
  const match = raw.match(/ACTION:\s*(\{[\s\S]*?\})/i)
  if (!match) return { content: stripMarkdown(raw), action: null }
  try {
    const action = JSON.parse(match[1])
    const content = stripMarkdown(raw.replace(match[0], "").trim())
    return { content, action }
  } catch {
    return { content: stripMarkdown(raw), action: null }
  }
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
        const message = (err as Error).message
        console.warn(`${provider.name} chave #${i + 1} falhou: ${message}`)
        const hasMoreKeys = i < provider.keys.length - 1
        const hasFallbackProvider = provider.name === "Gemini" && groqKeys.length > 0
        if (!isRetryableProviderError(err) && !hasMoreKeys && !hasFallbackProvider) {
          throw err
        }
      }
    }
  }

  throw new Error("Assistente temporariamente indisponível")
}

// ── Handler principal ─────────────────────────────────────────
serve(async (req) => {
  const origin = req.headers.get("origin") || undefined
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: buildCorsHeaders(origin) })
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
    const rawContent = await routeAI(trimmedMessages, context || {})
    const { content, action } = parseAiResponse(rawContent)

    return new Response(JSON.stringify({ content, action }), {
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
