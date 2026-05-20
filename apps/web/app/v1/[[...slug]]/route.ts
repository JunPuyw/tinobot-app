export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { routeRequest } from "@/lib/router";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const resolvedParams = await params;
  const path = "/" + (resolvedParams.slug?.join("/") || "");

  if (path === "/chat/completions") {
    const body = await req.json().catch(() => ({}));
    const { model, messages } = body;
    const auth = req.headers.get("authorization");

    if (!auth || !auth.startsWith("Bearer ")) {
      return NextResponse.json({ error: { message: "Missing or invalid Authorization header. Use: Bearer <system-api-key>" } }, { status: 401 });
    }

    const systemKey = auth.replace("Bearer ", "");
    
    // Find user by system key
    const keyRecord = await prisma.apiKey.findUnique({
      where: { key: systemKey },
      include: { user: true }
    });

    if (!keyRecord) {
      return NextResponse.json({ error: { message: "Invalid system API key" } }, { status: 401 });
    }

    if (!model) {
      return NextResponse.json({ error: { message: "Missing required field: model" } }, { status: 400 });
    }

    // Fetch real connections for this user
    const connectionsFromDb = await prisma.providerConnection.findMany({
      where: { userId: keyRecord.userId, isActive: true }
    });

    const connections: any[] = connectionsFromDb as any[];

    const result = await routeRequest(connections, model, messages || []);

    // Persist to routing log in DB
    try {
      await prisma.routerLog.create({
        data: {
          requestedModel: model,
          usedModel: result.usedModel,
          success: result.success,
          rotated: result.rotatedKey || result.rotatedProvider,
          totalAttempts: result.attempts.length,
          attempts: JSON.stringify(result.attempts)
        }
      });
    } catch (logError) {
      console.error("Failed to save router log:", logError);
    }

    if (result.success) {
      return NextResponse.json(result.response);
    }

    // Build friendly error with full audit log
    const failedReasons = result.attempts.map((a: any) =>
      `  • [${a.provider}] ${a.connectionName}: ${a.status}${a.errorMessage ? ` — ${a.errorMessage}` : ""}`
    ).join("\n");

    return NextResponse.json({
      error: {
        message: `All keys exhausted for model "${model}". Tried ${result.attempts.length} connection(s).`,
        type: "no_available_keys",
        attempts: result.attempts
      },
      _debug: {
        failedReasons,
        hint: `Add more API keys in Providers → ${model.split("/")[0]} or check rate-limit cooldowns.`
      }
    }, { status: 503 });
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
