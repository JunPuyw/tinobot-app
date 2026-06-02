export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { routeRequest, type Connection } from "@/lib/router";
import { getWorkspacesByUser } from "@/lib/userDb";
import { fetchPlatformUpstream, PlatformUpstreamConfigurationError } from "@/lib/platformUpstreams";

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
  workspace: { id: string; name: string; credits?: number },
) {
  const { modelSource: _modelSource, provider: _provider, workspaceId: _workspaceId, ...upstreamBody } = body;

  const upstreamResponse = await fetchPlatformUpstream("chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(upstreamBody),
  });

  const contentType = upstreamResponse.headers.get("content-type") || "application/json";
  const rawBody = await upstreamResponse.text();

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
  const mergedPayload =
    payload && typeof payload === "object"
      ? {
          ...payload,
          _gateway: {
            ...(payload._gateway || {}),
            mode: "platform",
            workspaceId: workspace.id,
            workspaceName: workspace.name,
            creditsRemaining: workspace.credits || 0,
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
  const workspaceId =
    req.headers.get("x-workspace-id") ||
    (typeof body?.workspaceId === "string" ? body.workspaceId : "") ||
    "";

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
    const workspaces = await getWorkspacesByUser(authContext.userId);
    const activeWorkspace =
      workspaces.find((workspace) => workspace.id === workspaceId) ||
      workspaces[0] ||
      null;

    if (!activeWorkspace) {
      return NextResponse.json(
        { error: { message: "Workspace not found" } },
        { status: 404 },
      );
    }

    if ((activeWorkspace.credits || 0) <= 0) {
      return NextResponse.json(
        { error: { message: "Workspace het credits" } },
        { status: 402 },
      );
    }

    try {
      return await forwardPlatformRequest(body || {}, activeWorkspace);
    } catch (error: any) {
      return NextResponse.json(
        { error: { message: error?.message || "Platform upstream request failed" } },
        { status: error instanceof PlatformUpstreamConfigurationError ? 500 : 502 },
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
  const modelsToTry = comboModels.length > 0 ? comboModels : [model];
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
    return NextResponse.json(
      {
        error: {
          message: "No available provider connection could complete the request",
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
    },
  };

  return NextResponse.json(responseBody);
}
