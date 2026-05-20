/**
 * TinoBot AI Gateway — Smart Key Router
 *
 * Architecture:
 *   Client ─────────────► TinoBot Server (our proxy) ─────────────► Provider A / B / C
 *                (Bearer: system-api-key)              (Bearer: provider-api-key)
 *
 * Client NEVER calls providers directly.
 * All traffic passes through our server which:
 *   1. Validates the system API key
 *   2. Selects the best provider key via Smart Router
 *   3. Forwards the request to the actual provider
 *   4. Returns the response back to the client
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                     ROUTING STRATEGY                           │
 * │                                                                 │
 * │  Provider A (n keys, sorted by priority)                       │
 * │    Key 1 ──429──► Key 2 ──429──► Key 3 ──429──► Key N         │
 * │                                              │                  │
 * │                                           all exhausted         │
 * │                                              ▼                  │
 * │  Provider B (fallback, n keys)                                  │
 * │    Key 1 ──429──► Key 2 ──429──► ...                           │
 * │                                              │                  │
 * │                                           all exhausted         │
 * │                                              ▼                  │
 * │  Provider C → ... → 503 if nothing works                       │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Key state machine:
 *   ACTIVE ──429──► RATE_LIMITED (cooldown: 60s) ──cooldown ends──► ACTIVE
 *   ACTIVE ──401──► INVALID (permanent until manually re-enabled)
 *   ACTIVE ──5xx──► ACTIVE (retry with next key, no permanent state change)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type Connection = {
  id: string;
  provider: string;   // e.g. "openai", "anthropic", "qwen"
  name: string;
  apiKey: string;
  priority: number;   // lower = higher priority (1 = first tried)
  isActive: boolean;
  // Runtime state (managed by router, not persisted to DB in mock)
  rateLimitedUntil?: number;  // epoch ms
  invalidKey?: boolean;
};

export type AttemptStatus = "success" | "rate_limited" | "invalid_key" | "server_error" | "network_error";

export type RouteAttempt = {
  connectionId: string;
  connectionName: string;
  provider: string;
  modelUsed: string;
  status: AttemptStatus;
  httpStatus?: number;
  errorMessage?: string;
  durationMs: number;
  timestamp: number;
};

export type RouteResult = {
  success: boolean;
  response?: any;          // The forwarded provider response
  usedConnection?: Connection;
  usedModel: string;
  attempts: RouteAttempt[];
  rotatedKey: boolean;     // true if had to switch keys within same provider
  rotatedProvider: boolean;// true if had to switch to a different provider
  totalDurationMs: number;
};

// ─── Provider fallback groups ─────────────────────────────────────────────────
// When all keys for provider X are exhausted, try these providers in order.
// They must support compatible API format (OpenAI-compatible or Anthropic-compatible).

const FALLBACK_CHAIN: Record<string, string[]> = {
  openai:    ["openai", "azure", "groq", "openrouter", "iflow"],
  anthropic: ["anthropic", "bedrock", "vertex-partner", "openrouter"],
  google:    ["google", "vertex", "vertex-partner", "openrouter"],
  qwen:      ["qwen", "iflow", "dashscope", "openrouter"],
  deepseek:  ["deepseek", "iflow", "openrouter"],
  mistral:   ["mistral", "openrouter"],
  groq:      ["groq", "openai", "openrouter"],
  glm:       ["glm", "iflow", "openrouter"],
  cohere:    ["cohere", "openrouter"],
  kimi:      ["kimi", "iflow", "openrouter"],
  gemini:    ["gemini", "google", "openrouter"],
};

// ─── Key state management ─────────────────────────────────────────────────────

const RATE_LIMIT_COOLDOWN_MS = 60_000; // 1 minute

function isKeyAvailable(conn: Connection): boolean {
  if (!conn.isActive) return false;
  if (conn.invalidKey) return false;
  if (conn.rateLimitedUntil && conn.rateLimitedUntil > Date.now()) return false;
  return true;
}

function markRateLimited(conn: Connection): void {
  conn.rateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
}

function markInvalid(conn: Connection): void {
  conn.invalidKey = true;
}

function getAvailableKeys(connections: Connection[], provider: string): Connection[] {
  return connections
    .filter(c => c.provider === provider && isKeyAvailable(c))
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
}

// ─── Provider API call (the actual proxied forward) ───────────────────────────
//
// In production: this would use fetch() to call the real provider endpoint.
// The request body/headers are forwarded as-is (OpenAI-compatible format).
// In mock: we simulate various failure scenarios.

const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  deepseek: "https://api.deepseek.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
  google: "https://generativelanguage.googleapis.com/v1beta/openai",
  openrouter: "https://openrouter.ai/api/v1",
  groq: "https://api.groq.com/openai/v1",
  mistral: "https://api.mistral.ai/v1",
  together: "https://api.together.xyz/v1",
  siliconflow: "https://api.siliconflow.cn/v1",
  qwen: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  iflow: "https://api.iflow.run/v1",
  xai: "https://api.x.ai/v1",
  perplexity: "https://api.perplexity.ai",
  fireworks: "https://api.fireworks.ai/inference/v1",
  nebius: "https://api.studio.nebius.ai/v1",
  hyperbolic: "https://api.hyperbolic.xyz/v1",
  ollama: "http://localhost:11434/v1",
  "ollama-local": "http://localhost:11434/v1",
};

async function forwardToProvider(
  connection: Connection,
  model: string,
  messages: any[],
): Promise<{ ok: boolean; httpStatus: number; data: any; durationMs: number }> {
  const start = Date.now();
  const nameLower = (connection.name || "").toLowerCase();

  // Simulate: name contains "limit" / "rate" → 429
  if (nameLower.includes("limit") || nameLower.includes("rate")) {
    const durationMs = Date.now() - start;
    return {
      ok: false, httpStatus: 429, durationMs,
      data: { error: { message: "Rate limit exceeded. Please retry after 60s.", type: "rate_limit_error", code: "rate_limit_exceeded" } }
    };
  }

  // Simulate: name contains "invalid" / "bad" / "expired" → 401
  if (nameLower.includes("invalid") || nameLower.includes("bad") || nameLower.includes("expired")) {
    const durationMs = Date.now() - start;
    return {
      ok: false, httpStatus: 401, durationMs,
      data: { error: { message: "Invalid API key", type: "auth_error", code: "invalid_api_key" } }
    };
  }

  // Simulate: name contains "error" / "down" → 500
  if (nameLower.includes("error") || nameLower.includes("down")) {
    const durationMs = Date.now() - start;
    return {
      ok: false, httpStatus: 500, durationMs,
      data: { error: { message: "Internal server error from provider", type: "server_error" } }
    };
  }

  const provider = connection.provider;
  const baseUrl = PROVIDER_BASE_URLS[provider];

  if (!baseUrl) {
    // Fallback to mock data if provider has no base URL configured
    const durationMs = Date.now() - start;
    return {
      ok: true,
      httpStatus: 200,
      durationMs,
      data: buildSuccessResponse(connection, model, messages)
    };
  }

  // Clean up model name:
  // If model starts with "provider/", strip it (e.g. "openrouter/google/gemma-4..." -> "google/gemma-4...")
  let cleanModel = model;
  if (model.startsWith(`${provider}/`)) {
    cleanModel = model.slice(provider.length + 1);
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${connection.apiKey}`,
      },
      body: JSON.stringify({
        model: cleanModel,
        messages: messages,
      }),
    });

    const durationMs = Date.now() - start;
    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = { error: { message: `Failed to parse upstream response JSON: ${e}` } };
    }

    return {
      ok: response.ok,
      httpStatus: response.status,
      data,
      durationMs
    };
  } catch (error: any) {
    const durationMs = Date.now() - start;
    return {
      ok: false,
      httpStatus: 500,
      durationMs,
      data: { error: { message: `Upstream connection failed: ${error.message}` } }
    };
  }
}

function buildSuccessResponse(conn: Connection, model: string, messages: any[]): any {
  const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
  const userContent = lastUserMsg?.content || "";

  return {
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{
      index: 0,
      message: {
        role: "assistant",
        content: [
          `✅ **[Gateway Response]**`,
          ``,
          `Tin nhắn của bạn: "${userContent.slice(0, 80)}${userContent.length > 80 ? "..." : ""}"`,
          ``,
          `📡 **Kết nối:** ${conn.name}`,
          `🏭 **Provider:** ${conn.provider}`,
          `🤖 **Model:** ${model}`,
          `🔑 **Key (masked):** ${conn.apiKey.slice(0, 6)}••••••`,
          `⏱ **Priority:** #${conn.priority}`,
          ``,
          `*(Đây là response giả lập — production sẽ trả về nội dung thật từ ${conn.provider})*`,
        ].join("\n")
      },
      finish_reason: "stop"
    }],
    usage: {
      prompt_tokens: Math.floor(userContent.length / 4) + 20,
      completion_tokens: 80,
      total_tokens: Math.floor(userContent.length / 4) + 100
    },
    // TinoBot gateway metadata (stripped before returning to client in production if needed)
    _gateway: {
      connectionId: conn.id,
      connectionName: conn.name,
      provider: conn.provider,
      routedModel: model,
    }
  };
}

// ─── Core router ──────────────────────────────────────────────────────────────

export async function routeRequest(
  allConnections: Connection[],
  requestedModel: string,
  messages: any[],
): Promise<RouteResult> {
  const startTime = Date.now();
  const attempts: RouteAttempt[] = [];

  // Parse provider + model-name from "provider/model-name"
  const [requestedProvider, ...modelParts] = requestedModel.includes("/")
    ? requestedModel.split("/")
    : [requestedModel, requestedModel];
  const modelName = modelParts.join("/") || requestedProvider;

  // Build the ordered list of providers to try
  const providerChain = [
    requestedProvider,
    ...(FALLBACK_CHAIN[requestedProvider || ""] || []).filter((p: string) => p !== requestedProvider)
  ].filter((p): p is string => p !== undefined);

  let rotatedKey = false;
  let rotatedProvider = false;
  let firstProvider = true;

  for (const provider of providerChain) {
    if (!firstProvider) rotatedProvider = true;
    firstProvider = false;

    const availableKeys = getAvailableKeys(allConnections, provider);
    if (availableKeys.length === 0) continue;

    let firstKeyForProvider = true;

    for (const connection of availableKeys) {
      if (!firstKeyForProvider) rotatedKey = true;
      firstKeyForProvider = false;

      // The model to use on this provider.
      // If same provider: use as requested. If fallback: map model name.
      const modelToCall = provider === requestedProvider
        ? requestedModel
        : `${provider}/${modelName}`;

      let attempt: RouteAttempt;

      try {
        const result = await forwardToProvider(connection, modelToCall, messages);

        attempt = {
          connectionId: connection.id,
          connectionName: connection.name,
          provider,
          modelUsed: modelToCall,
          httpStatus: result.httpStatus,
          durationMs: result.durationMs,
          timestamp: Date.now(),
          status: "success"
        };

        if (result.ok) {
          attempts.push(attempt);
          return {
            success: true,
            response: result.data,
            usedConnection: connection,
            usedModel: modelToCall,
            attempts,
            rotatedKey,
            rotatedProvider,
            totalDurationMs: Date.now() - startTime,
          };
        }

        // ── Handle failures ──────────────────────────────────────────
        if (result.httpStatus === 429) {
          markRateLimited(connection);
          attempt.status = "rate_limited";
          attempt.errorMessage = result.data?.error?.message;
          rotatedKey = true;
        } else if (result.httpStatus === 401 || result.httpStatus === 403) {
          markInvalid(connection);
          attempt.status = "invalid_key";
          attempt.errorMessage = result.data?.error?.message;
          rotatedKey = true;
        } else {
          attempt.status = "server_error";
          attempt.errorMessage = result.data?.error?.message;
          rotatedKey = true;
        }

      } catch (err: any) {
        attempt = {
          connectionId: connection.id,
          connectionName: connection.name,
          provider,
          modelUsed: modelToCall,
          status: "network_error",
          errorMessage: err.message,
          durationMs: Date.now() - startTime,
          timestamp: Date.now(),
        };
        rotatedKey = true;
      }

      attempts.push(attempt);
      // Continue to next key in this provider
    }
    // All keys in this provider exhausted → try next provider in chain
  }

  // Total exhaustion — return failure with full audit trail
  return {
    success: false,
    usedModel: requestedModel,
    attempts,
    rotatedKey,
    rotatedProvider,
    totalDurationMs: Date.now() - startTime,
  };
}

// ─── Key status reporter (for UI) ─────────────────────────────────────────────

export function getKeyStatuses(connections: Connection[]): any[] {
  const now = Date.now();
  return connections.map(c => ({
    id: c.id,
    name: c.name,
    provider: c.provider,
    priority: c.priority,
    status: !c.isActive
      ? "disabled"
      : c.invalidKey
        ? "invalid"
        : c.rateLimitedUntil && c.rateLimitedUntil > now
          ? "rate_limited"
          : "active",
    rateLimitedUntilMs: c.rateLimitedUntil || null,
    cooldownRemainingMs: c.rateLimitedUntil ? Math.max(0, c.rateLimitedUntil - now) : 0,
  }));
}
