export const runtime = "nodejs";

import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { routeRequest, type Connection } from "@/lib/router";
import { PROVIDER_MODELS } from "@/lib/aimodel";
import { fetchPlatformUpstream, PlatformUpstreamConfigurationError } from "@/lib/platformUpstreams";
import { chargePlatformUsage } from "@/lib/platformCredits";
import { logPlatformFlow, logPlatformFlowError } from "@/lib/platformFlowLog";

const PLATFORM_TIMEOUT_MS = 30_000;

function getBearerToken(headerValue: string | null): string | null {
  if (!headerValue) return null;
  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function parseComboModels(models: string) {
  try {
    const parsed = JSON.parse(models);
    return Array.isArray(parsed) ? parsed.filter((model): model is string => typeof model === "string") : [];
  } catch {
    return [];
  }
}

const SYSTEM_FALLBACK_MODELS: Record<string, string> = {
  openai: "gpt-4o-mini",
  gemini: "gemini-2.5-flash",
  google: "gemini-2.5-flash",
  deepseek: "deepseek-chat",
  groq: "llama-3.3-70b-versatile",
  xai: "grok-4-fast-reasoning",
  mistral: "mistral-large-latest",
  glm: "glm-4.7",
  qwen: "qwen3-coder-flash",
  iflow: "qwen3-coder-plus",
};

function getSystemFallbackModel(provider: string) {
  const configuredModel = SYSTEM_FALLBACK_MODELS[provider];
  if (configuredModel) return `${provider}/${configuredModel}`;

  const providerModels = (PROVIDER_MODELS as Record<string, Array<{ id: string; type?: string }>>)[provider] || [];
  const textModel = providerModels.find((entry) => !entry.type || entry.type === "llm");
  return textModel ? `${provider}/${textModel.id}` : null;
}

function buildSystemModelsToTry(requestedModel: string, connections: Connection[]) {
  const requestedProvider = requestedModel.split("/")[0];
  const models = [requestedModel];
  const providers = [...new Set(connections.map((connection) => connection.provider))];

  for (const provider of providers) {
    if (provider === requestedProvider) continue;
    const fallbackModel = getSystemFallbackModel(provider);
    if (fallbackModel) models.push(fallbackModel);
  }

  return [...new Set(models)];
}

function getAttemptedModels(attempts: Array<{ modelUsed: string }>) {
  return [...new Set(attempts.map((attempt) => attempt.modelUsed))];
}

async function getUserFromRequest(req: NextRequest, apiKey: string | null) {
  if (apiKey) {
    const keyRecord = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: { user: true },
    });

    return keyRecord ? { user: keyRecord.user, userId: keyRecord.userId, keyRecord } : null;
  }

  const authToken = req.cookies.get("auth-token")?.value;
  if (!authToken) return null;

  const user = await prisma.user.findUnique({
    where: { id: authToken },
  });

  return user ? { user, userId: user.id, keyRecord: null } : null;
}

async function forwardPlatformRequest(
  body: Record<string, any>,
  userId: string,
  flowId: string,
) {
  const { modelSource: _modelSource, provider: _provider, workspaceId: _workspaceId, ...upstreamBody } = body;
  const rawModel = typeof body.model === "string" ? body.model.trim() : "";
  const provider = typeof body.provider === "string" ? body.provider.trim() : "";
  const upstreamModel = provider && !rawModel.startsWith(`${provider}/`)
    ? `${provider}/${rawModel}`
    : rawModel;
  upstreamBody.model = upstreamModel;

  const upstreamStartedAt = Date.now();
  logPlatformFlow(flowId, "upstream.chat.start", {
    model: upstreamBody.model,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PLATFORM_TIMEOUT_MS);
  let upstreamResponse: Response;

  try {
    upstreamResponse = await fetchPlatformUpstream("chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(upstreamBody),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  const contentType = upstreamResponse.headers.get("content-type") || "application/json";
  const rawBody = await upstreamResponse.text();
  logPlatformFlow(flowId, "upstream.chat.complete", {
    model: upstreamBody.model,
    status: upstreamResponse.status,
    contentType,
    durationMs: Date.now() - upstreamStartedAt,
  });

  if (!rawBody) {
    return new NextResponse(null, {
      status: upstreamResponse.status,
      headers: { "Content-Type": contentType },
    });
  }

  if (!contentType.includes("application/json")) {
    return new NextResponse(rawBody, {
      status: upstreamResponse.status,
      headers: { "Content-Type": contentType },
    });
  }

  const payload = JSON.parse(rawBody);
  const charge = upstreamResponse.ok
    ? await chargePlatformUsage(userId, String(upstreamBody.model || ""), payload, flowId)
    : null;
  const mergedPayload =
    payload && typeof payload === "object"
      ? {
          ...payload,
          _gateway: {
            ...(payload._gateway || {}),
            mode: "platform",
            ...(charge || {}),
          },
        }
      : payload;

  return NextResponse.json(mergedPayload, { status: upstreamResponse.status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const resolvedParams = await params;
  const path = "/" + (resolvedParams.slug?.join("/") || "");

  if (path !== "/chat/completions") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const apiKey = getBearerToken(req.headers.get("authorization"));
  const body = (await req.json().catch(() => null)) as Record<string, any> | null;
  const model = typeof body?.model === "string" ? body.model.trim() : "";
  const messages = Array.isArray(body?.messages) ? body.messages : null;
  const modelSource = typeof body?.modelSource === "string" ? body.modelSource.trim().toLowerCase() : "";
  const flowId = req.headers.get("x-request-id") || randomUUID();
  const requestStartedAt = Date.now();
  if (!model || !messages) {
    return NextResponse.json(
      { error: { message: "Request must include model and messages" } },
      { status: 400 },
    );
  }

  const authContext = await getUserFromRequest(req, apiKey);

  if (!authContext) {
    return NextResponse.json(
      { error: { message: "Unauthorized" } },
      { status: 401 },
    );
  }

  if (authContext.user.isBanned) {
    return NextResponse.json(
      { error: { message: "User is banned" } },
      { status: 403 },
    );
  }

  if (modelSource === "platform") {
    logPlatformFlow(flowId, "request.received", {
      path,
      model,
      messageCount: messages.length,
      stream: body?.stream === true,
      userId: authContext.userId,
      creditsBefore: authContext.user.credits,
    });
    if (body?.stream === true) {
      logPlatformFlow(flowId, "request.rejected", {
        model,
        reason: "Platform billing currently requires stream=false",
      });
      return NextResponse.json(
        { error: { message: "Platform billing currently requires stream=false" } },
        { status: 400 },
      );
    }
    if (Number(authContext.user.credits || 0) <= 0) {
      logPlatformFlow(flowId, "request.rejected", {
        model,
        reason: "User has insufficient credits",
      });
      return NextResponse.json(
        { error: { message: "User has insufficient credits" } },
        { status: 402 },
      );
    }

    try {
      const response = await forwardPlatformRequest(body || {}, authContext.userId, flowId);
      logPlatformFlow(flowId, "request.complete", {
        model,
        status: response.status,
        durationMs: Date.now() - requestStartedAt,
      });
      return response;
    } catch (error: any) {
      logPlatformFlowError(flowId, "request.failed", {
        model,
        message: error?.message || "Platform upstream request failed",
        durationMs: Date.now() - requestStartedAt,
      });
      return NextResponse.json(
        { error: { message: error?.name === "AbortError" ? `Platform upstream timeout after ${PLATFORM_TIMEOUT_MS}ms` : error?.message || "Platform upstream request failed" } },
        {
          status: error?.name === "AbortError"
            ? 504
            : error?.message === "User has insufficient credits"
            ? 402
            : error instanceof PlatformUpstreamConfigurationError ? 500 : 502,
        },
      );
    }
  }

  const connections = await prisma.providerConnection.findMany({
    where: {
      userId: authContext.userId,
      isActive: true,
    },
    orderBy: { priority: "asc" },
  });

  if (connections.length === 0) {
    return NextResponse.json(
      { error: { message: "No active provider connections configured" } },
      { status: 400 },
    );
  }

  const routerConnections = connections.map(
    (connection): Connection => ({
      id: connection.id,
      provider: connection.provider,
      name: connection.name || `${connection.provider}-${connection.id.slice(0, 6)}`,
      apiKey: connection.apiKey || "",
      priority: connection.priority,
      isActive: connection.isActive,
    }),
  );
  const combo = await prisma.modelCombo.findUnique({
    where: { userId_name: { userId: authContext.userId, name: model } },
  });
  const comboModels = combo ? parseComboModels(combo.models) : [];
  const modelsToTry = comboModels.length > 0
    ? comboModels
    : modelSource === "system"
      ? buildSystemModelsToTry(model, routerConnections)
      : [model];
  let routeResult = await routeRequest(routerConnections, modelsToTry[0]!, messages);

  for (const fallbackModel of modelsToTry.slice(1)) {
    if (routeResult.success) break;
    const fallbackResult = await routeRequest(routerConnections, fallbackModel, messages);
    routeResult = {
      ...fallbackResult,
      attempts: [...routeResult.attempts, ...fallbackResult.attempts],
      rotatedProvider: routeResult.rotatedProvider || fallbackResult.rotatedProvider || true,
      rotatedKey: routeResult.rotatedKey || fallbackResult.rotatedKey,
      totalDurationMs: routeResult.totalDurationMs + fallbackResult.totalDurationMs,
    };
  }

  await prisma.routerLog.create({
    data: {
      requestedModel: model,
      usedModel: routeResult.success ? routeResult.usedModel : null,
      success: routeResult.success,
      rotated: routeResult.rotatedKey || routeResult.rotatedProvider,
      totalAttempts: routeResult.attempts.length,
      attempts: JSON.stringify(routeResult.attempts),
    },
  });

  if (!routeResult.success || !routeResult.response) {
    const attemptedModels = getAttemptedModels(routeResult.attempts);
    const exhaustedSystemFallback = modelSource === "system";
    return NextResponse.json(
      {
        error: {
          message: exhaustedSystemFallback
            ? `All system fallback models exhausted. Tried ${attemptedModels.length} model(s); none completed the request.`
            : "No available provider connection could complete the request",
          type: exhaustedSystemFallback ? "system_fallback_exhausted" : "no_available_keys",
          attemptedModels,
          failures: routeResult.attempts.map((attempt) => ({
            model: attempt.modelUsed,
            provider: attempt.provider,
            connection: attempt.connectionName,
            status: attempt.status,
            httpStatus: attempt.httpStatus,
            reason: attempt.errorMessage,
          })),
          attempts: routeResult.attempts,
        },
      },
      { status: 503 },
    );
  }

  const responseBody = {
    ...routeResult.response,
    _gateway: {
      ...(routeResult.response?._gateway || {}),
      connectionId: routeResult.usedConnection?.id,
      connectionName: routeResult.usedConnection?.name,
      provider: routeResult.usedConnection?.provider,
      routedModel: routeResult.usedModel,
      totalDurationMs: routeResult.totalDurationMs,
      rotatedKey: routeResult.rotatedKey,
      rotatedProvider: routeResult.rotatedProvider,
      attemptedModels: getAttemptedModels(routeResult.attempts),
    },
  };

  return NextResponse.json(responseBody);
}
