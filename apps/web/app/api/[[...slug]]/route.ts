export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { OAUTH_PROVIDERS, APIKEY_PROVIDERS, FREE_PROVIDERS, FREE_TIER_PROVIDERS, PROVIDER_MODELS } from "@/lib/aimodel";
import { getAdminUser as getSharedAdminUser } from "@/lib/adminUser";
import { hashPassword, verifyPassword } from "@/lib/password";
import { randomBytes } from "node:crypto";

const API_KEY_PREFIX = "sk-tinobot";
const VALID_COMBO_NAME = /^[a-zA-Z0-9_.-]+$/;

function isLocalAppUrl(value: string | undefined) {
  return !value || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(value);
}

function getPublicAppUrl(req: NextRequest) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!isLocalAppUrl(configuredUrl)) return configuredUrl!.replace(/\/$/, "");

  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || req.headers.get("host") || req.nextUrl.host;
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwardedProto || (host.includes("localhost") ? req.nextUrl.protocol.replace(":", "") : "https");

  return `${proto}://${host}`.replace(/\/$/, "");
}

function getSafeRedirectPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/usage";
  return value;
}

function generateApiKey() {
  return `${API_KEY_PREFIX}-${randomBytes(24).toString("hex")}`;
}

function parseComboModels(models: string) {
  try {
    const parsed = JSON.parse(models);
    return Array.isArray(parsed) ? parsed.filter((model): model is string => typeof model === "string") : [];
  } catch {
    return [];
  }
}

function normalizeComboInput(body: any) {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const models = Array.isArray(body?.models)
    ? body.models.map((model: unknown) => typeof model === "string" ? model.trim() : "").filter(Boolean)
    : [];

  if (!name) return { error: "Combo name is required" };
  if (!VALID_COMBO_NAME.test(name)) return { error: "Combo name may only contain letters, numbers, -, _, and ." };
  if (models.length === 0) return { error: "Add at least one fallback model" };

  return { name, models };
}

function serializeCombo(combo: { id: string; name: string; models: string; createdAt: Date; updatedAt: Date }) {
  return { ...combo, models: parseComboModels(combo.models) };
}

function buildLocalModelCatalog() {
  const providerByAlias = new Map<string, string>();

  for (const provider of Object.values(FREE_PROVIDERS)) {
    providerByAlias.set(provider.alias, provider.id);
  }
  for (const provider of Object.values(FREE_TIER_PROVIDERS)) {
    providerByAlias.set(provider.alias, provider.id);
  }
  for (const provider of Object.values(OAUTH_PROVIDERS)) {
    providerByAlias.set(provider.alias, provider.id);
  }
  for (const provider of Object.values(APIKEY_PROVIDERS)) {
    providerByAlias.set(provider.alias, provider.id);
  }

  const models: Record<string, { provider: string; providerAlias: string; name?: string }> = {};

  for (const [alias, entries] of Object.entries(PROVIDER_MODELS)) {
    const providerId = providerByAlias.get(alias) || alias;
    for (const entry of entries) {
      if (!entry?.id) continue;
      models[entry.id] = {
        provider: providerId,
        providerAlias: alias,
        name: entry.name,
      };
    }
  }

  const data = Object.entries(models)
    .map(([id, meta]) => ({
      id,
      model: id,
      name: meta.name || id,
      provider: meta.provider,
      providerAlias: meta.providerAlias,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { models, data };
}

function getUsageStartDate(period: string) {
  const now = Date.now();
  const hours = period === "24h" ? 24 : period === "30d" ? 24 * 30 : 24 * 7;
  return new Date(now - hours * 60 * 60 * 1000);
}

function formatUsageDay(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function withRuntimeRole<T extends { email?: string; role?: string } | null>(user: T): T {
  if (!user?.email) return user;
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim()).filter(Boolean);
  if (adminEmails.includes(user.email)) {
    (user as any).role = "admin";
  }
  return user;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const resolvedParams = await params;
  const path = "/" + (resolvedParams.slug?.join("/") || "");
  const searchParams = req.nextUrl.searchParams;

  // -- AUTH: Get User --
  async function getUser() {
    const token = req.cookies.get("auth-token")?.value;
    if (!token) return null;
    const user = await prisma.user.findUnique({ where: { id: token } });
    if (user) {
      const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim());
      if (ADMIN_EMAILS.includes(user.email)) {
        user.role = "admin";
      }
    }
    return user;
  }

  // --- GOOGLE OAUTH ---
  if (path === "/auth/user/google") {
    const appUrl = getPublicAppUrl(req);
    const redirectUrl = getSafeRedirectPath(searchParams.get("redirect"));
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const callbackUri = `${appUrl}/api/auth/user/google/callback`;
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUri)}&response_type=code&scope=email%20profile&state=${encodeURIComponent(redirectUrl)}`;
    return NextResponse.redirect(authUrl);
  }

  if (path === "/auth/user/google/callback") {
    const appUrl = getPublicAppUrl(req);
    const code = searchParams.get("code");
    const state = getSafeRedirectPath(searchParams.get("state"));
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
    const callbackUri = `${appUrl}/api/auth/user/google/callback`;

    if (!code) return NextResponse.redirect(`${appUrl}/login?error=NoCode`);

    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code, client_id: clientId, client_secret: clientSecret, redirect_uri: callbackUri, grant_type: "authorization_code"
        })
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        console.error("[Google OAuth] Token exchange failed", {
          status: tokenRes.status,
          error: tokenData?.error,
          description: tokenData?.error_description,
          callbackUri,
        });
        throw new Error(tokenData?.error || "Google token exchange failed");
      }
      
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const profile = await userRes.json();
      
      if (!profile.email) throw new Error("No email");

      let user = await prisma.user.findFirst({
        where: { OR: [{ googleId: profile.id }, { email: profile.email }] }
      });
      
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: profile.email,
            name: profile.name,
            googleId: profile.id,
            apiKeys: {
              create: { name: "Default Key", key: generateApiKey(), prefix: API_KEY_PREFIX }
            }
          }
        });
      } else if (!user.googleId) {
        user = await prisma.user.update({ where: { id: user.id }, data: { googleId: profile.id } });
      }

      const res = NextResponse.redirect(`${appUrl}${state}`);
      res.cookies.set("auth-token", user.id, {
        httpOnly: true,
        secure: appUrl.startsWith("https://") || process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
      });
      return res;
    } catch (e) {
      console.error("[Google OAuth] Callback failed", e);
      return NextResponse.redirect(`${appUrl}/login?error=OAuthFailed`);
    }
  }

  // --- API HANDLERS ---
  if (path === "/auth/user/logout") {
    const res = NextResponse.json({ success: true });
    res.cookies.delete("auth-token");
    return res;
  }

  if (path === "/auth/user/me") {
    const user = await getUser();
    if (user) return NextResponse.json({ user });
    return NextResponse.json({ user: null }, { status: 401 });
  }

  if (path === "/auth/user/combos") {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const combos = await prisma.modelCombo.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ combos: combos.map(serializeCombo) });
  }

  if (path === "/auth/user/api-keys" || path === "/auth/user/keys") {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const keys = await prisma.apiKey.findMany({ where: { userId: user.id } });
    return NextResponse.json({ keys });
  }

  if (path === "/auth/user/providers") {
    const user = await getUser();
    const connections = await prisma.providerConnection.findMany({
      where: user ? { userId: user.id } : {}
    });
    const normalized = connections.map((c: any) => {
      if (c.authType && c.authType !== "apikey") return c;
      const isOAuth = !!(OAUTH_PROVIDERS as any)[c.provider] || c.provider === "kiro" || c.provider === "iflow";
      return { ...c, authType: isOAuth ? "oauth" : "apikey" };
    });
    return NextResponse.json({ connections: normalized });
  }

  if (path === "/providers") {
    return NextResponse.json({ OAUTH_PROVIDERS, APIKEY_PROVIDERS, FREE_PROVIDERS, FREE_TIER_PROVIDERS, PROVIDER_MODELS });
  }

  if (path === "/models/availability") {
    const allProviderIds = [...Object.keys(FREE_PROVIDERS), ...Object.keys(FREE_TIER_PROVIDERS), ...Object.keys(OAUTH_PROVIDERS), ...Object.keys(APIKEY_PROVIDERS)];
    return NextResponse.json({ models: allProviderIds.map(id => ({ provider: id, model: "default-model", status: "available" })), unavailableCount: 0 });
  }

  if (path === "/models") {
    const catalog = buildLocalModelCatalog();
    return NextResponse.json(catalog);
  }

  if (path === "/models/alias") return NextResponse.json({ aliases: {} });
  if (path === "/provider-nodes") return NextResponse.json({ nodes: [] });
  if (path === "/proxy-pools") return NextResponse.json({ pools: [] });
  if (path === "/settings") return NextResponse.json({ settings: {} });
  if (path === "/auth/user/usage/stats") {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const startDate = getUsageStartDate(searchParams.get("period") || "7d");
    const usages = await prisma.platformUsage.findMany({
      where: { userId: user.id, createdAt: { gte: startDate } },
      orderBy: { createdAt: "desc" },
    });
    const byModel: Record<string, any> = {};

    for (const usage of usages) {
      const provider = usage.model.includes("/") ? usage.model.split("/")[0] : "platform";
      const item = byModel[usage.model] || {
        rawModel: usage.model,
        provider,
        requests: 0,
        promptTokens: 0,
        completionTokens: 0,
        cost: 0,
        lastUsed: usage.createdAt.toISOString(),
      };
      item.requests += 1;
      item.promptTokens += usage.promptTokens;
      item.completionTokens += usage.completionTokens;
      item.cost += usage.chargedCredits;
      if (usage.createdAt > new Date(item.lastUsed)) item.lastUsed = usage.createdAt.toISOString();
      byModel[usage.model] = item;
    }

    return NextResponse.json({
      totalRequests: usages.length,
      totalCost: usages.reduce((sum, usage) => sum + usage.chargedCredits, 0),
      totalPromptTokens: usages.reduce((sum, usage) => sum + usage.promptTokens, 0),
      totalCompletionTokens: usages.reduce((sum, usage) => sum + usage.completionTokens, 0),
      byModel,
    });
  }
  if (path === "/auth/user/usage/chart") {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const startDate = getUsageStartDate(searchParams.get("period") || "7d");
    const usages = await prisma.platformUsage.findMany({
      where: { userId: user.id, createdAt: { gte: startDate } },
      orderBy: { createdAt: "asc" },
    });
    const byDay = new Map<string, { label: string; tokens: number; cost: number }>();

    for (const usage of usages) {
      const label = formatUsageDay(usage.createdAt);
      const item = byDay.get(label) || { label, tokens: 0, cost: 0 };
      item.tokens += usage.promptTokens + usage.completionTokens;
      item.cost += usage.chargedCredits;
      byDay.set(label, item);
    }

    return NextResponse.json([...byDay.values()]);
  }
  if (path === "/auth/user/usage/history") {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const startDate = getUsageStartDate(searchParams.get("period") || "7d");
    const usages = await prisma.platformUsage.findMany({
      where: { userId: user.id, createdAt: { gte: startDate } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      items: usages.map((usage) => ({
        id: usage.id,
        model: usage.model,
        pricingMode: usage.pricingMode,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.promptTokens + usage.completionTokens,
        baseCredits: usage.baseCredits,
        markupPercent: usage.markupPercent,
        chargedCredits: usage.chargedCredits,
        createdAt: usage.createdAt.toISOString(),
      })),
    });
  }
  if (path === "/auth/user/workspaces") {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({
      workspaces: [{
        id: `user-${user.id}`,
        name: "Personal",
        type: "personal",
        role: "owner",
        credits: user.credits,
        budgetLimitUSD: 0,
        usedUSD: 0,
        reservedUSD: 0,
      }],
    });
  }

  // --- Router status ---
  if (path === "/router/log") {
    const logs = await prisma.routerLog.findMany({ orderBy: { timestamp: "desc" }, take: 50 });
    const mappedLogs = logs.map((l: any) => ({ ...l, attempts: JSON.parse(l.attempts) }));
    return NextResponse.json({ log: mappedLogs });
  }

  if (path === "/router/keys/status") {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const connections = await prisma.providerConnection.findMany({ where: { userId: user.id } });
    const { getKeyStatuses } = await import("@/lib/router");
    return NextResponse.json({ statuses: getKeyStatuses(connections as any[]) });
  }

  // --- ADMIN ROUTES ---
  if (path.startsWith("/admin/")) {
    const adminUser = await getSharedAdminUser();
    if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (path === "/admin/stats") {
      const [totalUsers, totalKeys, totalConnections, bannedUsers, totalLogs] = await Promise.all([
        prisma.user.count(),
        prisma.apiKey.count(),
        prisma.providerConnection.count(),
        prisma.user.count({ where: { isBanned: true } as any }),
        prisma.routerLog.count(),
      ]);
      return NextResponse.json({ totalUsers, totalKeys, totalConnections, bannedUsers, totalLogs });
    }

    if (path === "/admin/users") {
      const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
      const limit = Math.min(100, parseInt(searchParams.get("limit") || "20"));
      const search = searchParams.get("search") || "";
      const where = search ? { OR: [{ email: { contains: search } }, { name: { contains: search } }] } : {};
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { apiKeys: true, connections: true } } },
        }),
        prisma.user.count({ where }),
      ]);
      return NextResponse.json({ users, total, page, limit, pages: Math.ceil(total / limit) });
    }

    if (path === "/admin/keys") {
      const keys = await prisma.apiKey.findMany({
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      return NextResponse.json({ keys });
    }

    const userMatch = path.match(/^\/admin\/users\/([^/]+)$/);
    if (userMatch) {
      const id = userMatch[1];
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          apiKeys: { orderBy: { createdAt: "desc" } },
          connections: { orderBy: { createdAt: "desc" } },
        },
      });
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
      return NextResponse.json({ user });
    }
  }

  return NextResponse.json({ data: null, message: "Mock catch-all GET" });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const resolvedParams = await params;
  const path = "/" + (resolvedParams.slug?.join("/") || "");
  const body = await req.json().catch(() => ({}));

  async function getUser() {
    const token = req.cookies.get("auth-token")?.value;
    if (!token) return null;
    const user = await prisma.user.findUnique({ where: { id: token } });
    if (user) {
      const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim());
      if (ADMIN_EMAILS.includes(user.email)) {
        user.role = "admin";
      }
    }
    return user;
  }

  if (path === "/auth/user/login") {
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim());
    if (ADMIN_EMAILS.includes(user.email)) {
      user.role = "admin";
    }

    const res = NextResponse.json({ token: user.id, user });
    res.cookies.set("auth-token", user.id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 7 * 24 * 60 * 60 });
    return res;
  }

  if (path === "/auth/user/register") {
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const password = String(body.password || "");
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (user) return NextResponse.json({ error: "Exists" }, { status: 400 });
    user = await prisma.user.create({
      data: {
        email,
        name: name || email.split("@")[0] || "User",
        passwordHash: hashPassword(password),
        apiKeys: { create: { name: "Default Key", key: generateApiKey(), prefix: API_KEY_PREFIX } }
      }
    });
    withRuntimeRole(user);
    const res = NextResponse.json({ token: user.id, user });
    res.cookies.set("auth-token", user.id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 7 * 24 * 60 * 60 });
    return res;
  }

  if (path === "/auth/user/api-keys") {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const newKey = await prisma.apiKey.create({
      data: { userId: user.id, name: body.name || "Untitled Key", key: generateApiKey(), prefix: API_KEY_PREFIX }
    });
    return NextResponse.json(newKey);
  }

  if (path === "/auth/user/combos") {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const input = normalizeComboInput(body);
    if ("error" in input) return NextResponse.json({ error: input.error }, { status: 400 });

    try {
      const combo = await prisma.modelCombo.create({
        data: { userId: user.id, name: input.name, models: JSON.stringify(input.models) },
      });
      return NextResponse.json({ combo: serializeCombo(combo) }, { status: 201 });
    } catch {
      return NextResponse.json({ error: "A combo with this name already exists" }, { status: 409 });
    }
  }

  if (path === "/auth/user/providers") {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const newConn = await prisma.providerConnection.create({
      data: { userId: user.id, ...body }
    });
    return NextResponse.json({ success: true, connection: newConn });
  }

  if (path === "/auth/user/providers/validate") {
    return NextResponse.json({ valid: true });
  }

  if (path.match(/^\/router\/keys\/.+\/reset$/)) {
    const id = path.split("/")[3];
    const conn = await prisma.providerConnection.update({
      where: { id },
      data: { testStatus: "unknown", lastError: null, lastErrorAt: null, errorCode: null }
    });
    return NextResponse.json({ success: true, connection: conn });
  }

  return NextResponse.json({ error: "Not found POST" }, { status: 404 });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const resolvedParams = await params;
  const path = "/" + (resolvedParams.slug?.join("/") || "");
  const body = await req.json().catch(() => ({}));

  async function getUser() {
    const token = req.cookies.get("auth-token")?.value;
    return token ? prisma.user.findUnique({ where: { id: token } }) : null;
  }

  const comboMatch = path.match(/^\/auth\/user\/combos\/([^/]+)$/);
  if (comboMatch) {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const input = normalizeComboInput(body);
    if ("error" in input) return NextResponse.json({ error: input.error }, { status: 400 });
    const existing = await prisma.modelCombo.findFirst({ where: { id: comboMatch[1], userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Combo not found" }, { status: 404 });

    try {
      const combo = await prisma.modelCombo.update({
        where: { id: existing.id },
        data: { name: input.name, models: JSON.stringify(input.models) },
      });
      return NextResponse.json({ combo: serializeCombo(combo) });
    } catch {
      return NextResponse.json({ error: "A combo with this name already exists" }, { status: 409 });
    }
  }

  if (path.match(/^\/auth\/user\/providers\/.+$/)) {
    const id = path.split("/")[4];
    await prisma.providerConnection.update({ where: { id }, data: body });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Not found PUT" }, { status: 404 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const resolvedParams = await params;
  const path = "/" + (resolvedParams.slug?.join("/") || "");
  const body = await req.json().catch(() => ({}));

  async function getUser() {
    const token = req.cookies.get("auth-token")?.value;
    if (!token) return null;
    const user = await prisma.user.findUnique({ where: { id: token } });
    if (user) {
      const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim());
      if (ADMIN_EMAILS.includes(user.email)) user.role = "admin";
    }
    return user;
  }

  if (path.startsWith("/admin/")) {
    const adminUser = await getSharedAdminUser();
    if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userMatch = path.match(/^\/admin\/users\/([^/]+)$/);
    if (userMatch) {
      const id = userMatch[1];
      const { isBanned, role, name, credits } = body;
      const updated = await prisma.user.update({
        where: { id },
        data: {
          ...(typeof isBanned === "boolean" ? { isBanned } : {}),
          ...(role ? { role } : {}),
          ...(name ? { name } : {}),
          ...(typeof credits === "number" && credits >= 0 ? { credits } : {}),
        },
      });
      return NextResponse.json({ success: true, user: updated });
    }
  }

  return NextResponse.json({ error: "Not found PATCH" }, { status: 404 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const resolvedParams = await params;
  const path = "/" + (resolvedParams.slug?.join("/") || "");

  async function getUser() {
    const token = req.cookies.get("auth-token")?.value;
    return token ? prisma.user.findUnique({ where: { id: token } }) : null;
  }

  const comboMatch = path.match(/^\/auth\/user\/combos\/([^/]+)$/);
  if (comboMatch) {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const deleted = await prisma.modelCombo.deleteMany({ where: { id: comboMatch[1], userId: user.id } });
    if (deleted.count === 0) return NextResponse.json({ error: "Combo not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  }

  if (path === "/router/log") {
    await prisma.routerLog.deleteMany();
    return NextResponse.json({ success: true });
  }

  if (path.match(/^\/auth\/user\/providers\/.+$/)) {
    const id = path.split("/")[4];
    await prisma.providerConnection.delete({ where: { id } });
    return NextResponse.json({ success: true });
  }
  
  if (path.match(/^\/auth\/user\/api-keys\/.+$/)) {
    const id = path.split("/")[4];
    await prisma.apiKey.delete({ where: { id } });
    return NextResponse.json({ success: true });
  }

  if (path.startsWith("/admin/")) {
    const adminUser = await getSharedAdminUser();
    if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const keyMatch = path.match(/^\/admin\/users\/([^/]+)\/keys\/([^/]+)$/);
    if (keyMatch) {
      const keyId = keyMatch[2];
      await prisma.apiKey.delete({ where: { id: keyId } });
      return NextResponse.json({ success: true });
    }

    const userMatch = path.match(/^\/admin\/users\/([^/]+)$/);
    if (userMatch) {
      const id = userMatch[1];
      await prisma.apiKey.deleteMany({ where: { userId: id } });
      await prisma.providerConnection.deleteMany({ where: { userId: id } });
      await prisma.user.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }
  }

  return NextResponse.json({ error: "Not found DELETE" }, { status: 404 });
}
