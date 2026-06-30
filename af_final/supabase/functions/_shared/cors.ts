export const LOCAL_DEV_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
]

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

export function resolveCorsOrigin(requestOrigin?: string): string {
  const allowed = parseAllowedOrigins()
  if (allowed.includes("*")) return "*"
  if (requestOrigin) {
    if (allowed.includes(requestOrigin)) return requestOrigin
    if (isVercelAppOrigin(requestOrigin)) return requestOrigin
  }
  const productionOrigin = allowed.find((o) => !LOCAL_DEV_ORIGINS.includes(o))
  return productionOrigin || allowed[0] || "*"
}

export function buildCorsHeaders(
  origin?: string,
  options: {
    methods?: string
    extraHeaders?: Record<string, string>
  } = {},
) {
  const { methods = "POST, OPTIONS", extraHeaders = {} } = options
  return {
    "Access-Control-Allow-Headers":
      extraHeaders["Access-Control-Allow-Headers"] ??
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": methods,
    ...extraHeaders,
    "Access-Control-Allow-Origin": resolveCorsOrigin(origin),
  }
}
