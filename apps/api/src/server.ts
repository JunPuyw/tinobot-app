import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import helmet from "helmet";
import requestId from "express-request-id";
import logger from "./lib/logger";
import { FREE_PROVIDERS, FREE_TIER_PROVIDERS, OAUTH_PROVIDERS, APIKEY_PROVIDERS, PROVIDER_MODELS } from "./aimodel";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import cookieParser from "cookie-parser";
import prisma from "./lib/prisma";
import { randomBytes } from "node:crypto";
import { fetchPlatformUpstream, PlatformUpstreamConfigurationError } from "./lib/platformUpstreams";

dotenv.config();

const API_KEY_PREFIX = "sk-tinobot";
const VALID_COMBO_NAME = /^[a-zA-Z0-9_.-]+$/;

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

async function getRequestUser(req: Request) {
  return (req.user || (req.cookies["auth-token"] ? await prisma.user.findUnique({ where: { id: req.cookies["auth-token"] } }) : null)) as any;
}

function normalizeRequestedModel(body: any) {
  const rawModel = typeof body?.model === "string" ? body.model.trim() : "";
  const modelSource =
    typeof body?.modelSource === "string"
      ? body.modelSource.trim().toLowerCase()
      : "auto";
  const explicitProvider =
    typeof body?.provider === "string" ? body.provider.trim() : "";
  const inferredProvider =
    !explicitProvider && rawModel.includes("/")
      ? rawModel.split("/")[0] || ""
      : "";
  const provider = explicitProvider || inferredProvider;

  if (!rawModel) {
    return { error: "Missing required field: model" };
  }

  if (modelSource === "platform" || modelSource === "connection") {
    if (!provider) {
      return { error: "provider is required when modelSource=platform" };
    }

    return {
      requestedModel: rawModel.startsWith(`${provider}/`)
        ? rawModel
        : `${provider}/${rawModel}`,
      requestedModelLabel: rawModel,
    };
  }

  return {
    requestedModel: rawModel,
    requestedModelLabel: rawModel,
  };
}

const app = express();
app.use(requestId());
const port = process.env.PORT || 3001;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:20128";
const PLATFORM_TIMEOUT_MS = 30_000;

app.use(helmet());
app.use(cors({
  origin: [APP_URL, "http://localhost:3000", "http://localhost:20128"],
  credentials: true,
}));
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || "tinobot-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === "production" }
}));

app.use(passport.initialize());
app.use(passport.session());

// --- Database is handled by Prisma ---

// --- Passport Configuration ---
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    callbackURL: `${APP_URL}/api/auth/user/google/callback`,
    passReqToCallback: true
  },
  async (req: any, accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) return done(new Error("No email found in Google profile"));

      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { googleId: profile.id },
            { email: email }
          ]
        }
      });
      
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: email,
            name: profile.displayName,
            googleId: profile.id,
            apiKeys: {
              create: {
                name: "Default Key",
                key: generateApiKey(),
                prefix: API_KEY_PREFIX
              }
            }
          }
        });
      } else if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId: profile.id }
        });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// --- Auth Routes ---
app.get("/api/auth/user/google", (req: Request, res: Response, next) => {
  const redirect = (req.query.redirect as string) || "/usage";
  passport.authenticate("google", { 
    scope: ["profile", "email"],
    state: redirect
  })(req, res, next);
});

app.get("/api/auth/user/google/callback", 
  passport.authenticate("google", { failureRedirect: `${APP_URL}/login?error=OAuthFailed` }),
  (req: Request, res: Response) => {
    const user = req.user as any;
    if (user) {
      // Set auth cookie so Next.js server can read it
      res.cookie("auth-token", user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }
    const redirect = req.query.state as string || "/usage";
    res.redirect(`${APP_URL}${redirect}`);
  }
);

app.get("/api/auth/user/logout", (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    res.clearCookie("auth-token");
    res.json({ success: true });
  });
});

// Basic health check
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Mock user data for FE calls
app.post("/api/auth/user/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    let user = await prisma.user.findUnique({ where: { email } });
    
    // Auto-create user for testing
    if (!user) {
      user = await prisma.user.create({
        data: { 
          email, 
          name: email.split("@")[0],
          apiKeys: { create: { name: "Default Key", key: generateApiKey(), prefix: API_KEY_PREFIX } }
        }
      });
    }

    const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim());
    if (ADMIN_EMAILS.includes(user.email)) {
      (user as any).role = "admin";
    }

    // Set auth cookie
    res.cookie("auth-token", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      token: user.id,
      user
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/auth/user/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "User already exists" });

    const user = await prisma.user.create({
      data: {
        email,
        name,
        apiKeys: {
          create: {
            name: "Default Key",
            key: generateApiKey(),
            prefix: API_KEY_PREFIX
          }
        }
      }
    });

    // Set auth cookie
    res.cookie("auth-token", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      token: user.id,
      user
    });
  } catch (error) {
    res.status(500).json({ error: "Registration failed" });
  }
});

app.get("/api/auth/user/me", async (req: Request, res: Response) => {
  try {
    // Priority: passport session (Google OAuth) → auth-token cookie (email/pw login) → 401
    const sessionUser = req.user as any;
    if (sessionUser) {
      return res.json({ user: sessionUser });
    }

    const tokenUserId = req.cookies["auth-token"];
    if (tokenUserId) {
      const user = await prisma.user.findUnique({ where: { id: tokenUserId } });
      if (user) {
        const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim());
        if (ADMIN_EMAILS.includes(user.email)) (user as any).role = "admin";
        return res.json({ user });
      }
    }

    return res.status(401).json({ user: null });
  } catch (error) {
    res.status(500).json({ error: "Internal error" });
  }
});

app.get("/api/auth/user/workspaces", (req: Request, res: Response) => {
  res.json({
    workspaces: [
      {
        id: "ws-main",
        name: "Main Workspace",
        role: "owner",
        credits: 100.0,
        budgetLimitUSD: 200,
        usedUSD: 25.5,
        reservedUSD: 0
      }
    ]
  });
});

app.patch("/api/auth/user/workspaces/:id", (req: Request, res: Response) => {
  res.json({ success: true, workspace: req.body });
});

app.get("/api/auth/user/api-keys", async (req: Request, res: Response) => {
  try {
    const user = (req.user || (req.cookies["auth-token"] ? await prisma.user.findUnique({ where: { id: req.cookies["auth-token"] } }) : null)) as any;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const keys = await prisma.apiKey.findMany({ where: { userId: user.id } });
    res.json({
      keys: keys.map((k: any) => ({ id: k.id, name: k.name, prefix: k.prefix, createdAt: k.createdAt }))
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch keys" });
  }
});

app.get("/api/auth/user/keys", async (req: Request, res: Response) => {
  try {
    const user = (req.user || (req.cookies["auth-token"] ? await prisma.user.findUnique({ where: { id: req.cookies["auth-token"] } }) : null)) as any;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const keys = await prisma.apiKey.findMany({ where: { userId: user.id } });
    res.json({ keys });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch keys" });
  }
});

app.post("/api/auth/user/api-keys", async (req: Request, res: Response) => {
  try {
    const user = (req.user || (req.cookies["auth-token"] ? await prisma.user.findUnique({ where: { id: req.cookies["auth-token"] } }) : null)) as any;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    
    const newKey = await prisma.apiKey.create({
      data: {
        userId: user.id,
        name: req.body.name || "Untitled Key",
        key: generateApiKey(),
        prefix: API_KEY_PREFIX
      }
    });
    
    res.json({
      key: newKey.key,
      id: newKey.id,
      name: newKey.name,
      prefix: newKey.prefix,
      createdAt: newKey.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to create key" });
  }
});

app.delete("/api/auth/user/api-keys/:id", (req: Request, res: Response) => {
  res.json({ success: true });
});

app.get("/api/auth/user/pending-invites", (req: Request, res: Response) => {
  res.json({ invites: [] });
});

app.get("/api/auth/user/combos", async (req: Request, res: Response) => {
  const user = await getRequestUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const combos = await prisma.modelCombo.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return res.json({ combos: combos.map(serializeCombo) });
});

app.post("/api/auth/user/combos", async (req: Request, res: Response) => {
  const user = await getRequestUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const input = normalizeComboInput(req.body);
  if ("error" in input) return res.status(400).json({ error: input.error });

  try {
    const combo = await prisma.modelCombo.create({
      data: { userId: user.id, name: input.name, models: JSON.stringify(input.models) },
    });
    return res.status(201).json({ combo: serializeCombo(combo) });
  } catch {
    return res.status(409).json({ error: "A combo with this name already exists" });
  }
});

app.put("/api/auth/user/combos/:id", async (req: Request, res: Response) => {
  const user = await getRequestUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const input = normalizeComboInput(req.body);
  if ("error" in input) return res.status(400).json({ error: input.error });
  const existing = await prisma.modelCombo.findFirst({ where: { id: req.params.id as string, userId: user.id } });
  if (!existing) return res.status(404).json({ error: "Combo not found" });

  try {
    const combo = await prisma.modelCombo.update({
      where: { id: existing.id },
      data: { name: input.name, models: JSON.stringify(input.models) },
    });
    return res.json({ combo: serializeCombo(combo) });
  } catch {
    return res.status(409).json({ error: "A combo with this name already exists" });
  }
});

app.delete("/api/auth/user/combos/:id", async (req: Request, res: Response) => {
  const user = await getRequestUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const deleted = await prisma.modelCombo.deleteMany({ where: { id: req.params.id as string, userId: user.id } });
  if (deleted.count === 0) return res.status(404).json({ error: "Combo not found" });
  return res.json({ success: true });
});

app.get("/api/providers", (req: Request, res: Response) => {
  res.json({
    OAUTH_PROVIDERS,
    APIKEY_PROVIDERS,
    FREE_PROVIDERS,
    FREE_TIER_PROVIDERS,
    PROVIDER_MODELS
  });
});
app.get("/api/models", async (req: Request, res: Response) => {
  try {
    const response = await fetchPlatformUpstream("models", {
        method: "GET",
        headers: {
          "content-type": "application/json",
        },
      });

    const data = await response.json();

    res.json(data);
  } catch (error: any) {
    console.error(error);

    res.status(500).json({
      error: "Failed to fetch models",
    });
  }
});
app.get("/api/models/availability", (req: Request, res: Response) => {
  const allProviderIds = [
    ...Object.keys(FREE_PROVIDERS),
    ...Object.keys(FREE_TIER_PROVIDERS),
    ...Object.keys(OAUTH_PROVIDERS),
    ...Object.keys(APIKEY_PROVIDERS)
  ];
  
  res.json({
    models: allProviderIds.map(id => ({ provider: id, model: "default-model", status: "available" })),
    unavailableCount: 0
  });
});

app.get("/api/models", (req: Request, res: Response) => {
  res.json({
    models: {
      "openai/gpt-4o-mini": { provider: "openai" },
      "openai/gpt-4o": { provider: "openai" },
      "anthropic/claude-3-haiku": { provider: "anthropic" },
      "google/gemini-pro": { provider: "google" },
      "qwen/qwen-max": { provider: "qwen" }
    }
  });
});

let mockConnections: any[] = [];

app.post("/api/auth/user/providers", async (req: Request, res: Response) => {
  try {
    const user = (req.user || (req.cookies["auth-token"] ? await prisma.user.findUnique({ where: { id: req.cookies["auth-token"] } }) : null)) as any;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const newConn = await prisma.providerConnection.create({
      data: {
        userId: user.id,
        ...req.body
      }
    });
    res.json({ success: true, connection: newConn });
  } catch (error) {
    res.status(500).json({ error: "Failed to create connection" });
  }
});

app.post("/api/auth/user/providers/validate", (req: Request, res: Response) => {
  res.json({ valid: true });
});

app.get("/api/auth/user/providers", async (req: Request, res: Response) => {
  try {
    const user = (req.user || (req.cookies["auth-token"] ? await prisma.user.findUnique({ where: { id: req.cookies["auth-token"] } }) : null)) as any;
    // For now, allow public fetching if needed, or enforce user check
    const connections = await prisma.providerConnection.findMany({
      where: user ? { userId: user.id } : {}
    });

    const normalized = connections.map((c: any) => {
      if (c.authType && c.authType !== "apikey") return c;
      const isOAuth = !!(OAUTH_PROVIDERS as any)[c.provider] || c.provider === "kiro" || c.provider === "iflow";
      return { ...c, authType: isOAuth ? "oauth" : "apikey" };
    });
    res.json({ connections: normalized });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch connections" });
  }
});

app.put("/api/auth/user/providers/:id", async (req: Request, res: Response) => {
  try {
    await prisma.providerConnection.update({
      where: { id: req.params.id as string },
      data: req.body
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update connection" });
  }
});

app.delete("/api/auth/user/providers/:id", async (req: Request, res: Response) => {
  try {
    await prisma.providerConnection.delete({
      where: { id: req.params.id as string }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete connection" });
  }
});

app.get("/api/proxy-pools", (req: Request, res: Response) => {
  res.json({ pools: [] });
});

app.get("/api/models/alias", (req: Request, res: Response) => {
  res.json({ aliases: {} });
});

app.get("/api/provider-nodes", (req: Request, res: Response) => {
  res.json({ nodes: [] });
});

app.get("/api/settings", (req: Request, res: Response) => {
  res.json({ settings: {} });
});

app.get("/api/admin/packages", (req: Request, res: Response) => {
  res.json({ packages: [] });
});

app.get("/api/payments/orders", (req: Request, res: Response) => {
  res.json({ orders: [] });
});

app.get("/api/auth/user/usage/stats", (req: Request, res: Response) => {
  res.json({
    totalRequests: 0,
    totalCost: 0,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    byModel: {}
  });
});

app.get("/api/auth/user/usage/chart", (req: Request, res: Response) => {
  res.json([]);
});

import { routeRequest, getKeyStatuses } from "./router";
import type { Connection, ExtraParams } from "./router";

let routerLog: any[] = [];  // keeps the last N routing decisions for the UI

app.post("/v1/chat/completions", async (req: Request, res: Response) => {
  // ── Extract standard + extended parameters ──────────────────────────────────
  const {
    model,
    messages,
    temperature,
    max_tokens,
    stream = false,
    media_resolution,   // Gemini: LOW | MEDIUM | HIGH
    thinking_level,     // Gemini 3+: LOW | MEDIUM | HIGH
    // Capture any other OpenAI-compatible params (top_p, frequency_penalty, etc.)
    ...otherParams
  } = req.body;

  const auth = req.headers.authorization;
  const normalized = normalizeRequestedModel(req.body);

  if ("error" in normalized) {
    return res.status(400).json({ error: { message: normalized.error } });
  }

  const { requestedModel, requestedModelLabel } = normalized;

  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: { message: "Missing or invalid Authorization header. Use: Bearer <system-api-key>" } });
  }

  const systemKey = auth.replace("Bearer ", "");

  // Find user by system key
  const keyRecord = await prisma.apiKey.findUnique({
    where: { key: systemKey },
    include: { user: true }
  });

  if (!keyRecord) {
    return res.status(401).json({ error: { message: "Invalid system API key" } });
  }

  if (req.body?.modelSource === "platform") {
    try {
      const { modelSource, provider, ...restBody } = req.body;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PLATFORM_TIMEOUT_MS);
      const upstreamResponse = await fetchPlatformUpstream("chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...restBody,
          model: requestedModel,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const contentType = upstreamResponse.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await upstreamResponse.json();
        return res.status(upstreamResponse.status).json(data);
      }

      const text = await upstreamResponse.text();
      return res
        .status(upstreamResponse.status)
        .type(contentType || "text/plain")
        .send(text);
    } catch (error: any) {
      if (error?.name === "AbortError") {
        return res.status(504).json({
          error: {
            message: `Platform upstream timeout after ${PLATFORM_TIMEOUT_MS}ms`,
          },
        });
      }

      return res.status(error instanceof PlatformUpstreamConfigurationError ? 500 : 502).json({
        error: {
          message: error?.message || "Failed to reach platform upstream",
        },
      });
    }
  }

  // Validate optional parameters
  if (temperature !== undefined && (typeof temperature !== "number" || temperature < 0 || temperature > 2)) {
    return res.status(400).json({ error: { message: "temperature must be a number between 0 and 2" } });
  }
  if (max_tokens !== undefined && (typeof max_tokens !== "number" || max_tokens < 1)) {
    return res.status(400).json({ error: { message: "max_tokens must be a positive integer" } });
  }
  if (media_resolution !== undefined && !["LOW", "MEDIUM", "HIGH"].includes(media_resolution)) {
    return res.status(400).json({ error: { message: "media_resolution must be LOW, MEDIUM, or HIGH" } });
  }
  if (thinking_level !== undefined && !["LOW", "MEDIUM", "HIGH"].includes(thinking_level)) {
    return res.status(400).json({ error: { message: "thinking_level must be LOW, MEDIUM, or HIGH" } });
  }

  // Fetch real connections for this user
  const connectionsFromDb = await prisma.providerConnection.findMany({
    where: { userId: keyRecord.userId, isActive: true }
  });

  const connections: Connection[] = connectionsFromDb as any[];

  // Build extra params to forward to the router / provider
  const extraParams: ExtraParams = {
    ...(temperature    !== undefined && { temperature }),
    ...(max_tokens     !== undefined && { max_tokens }),
    ...(stream         !== false     && { stream: true }),
    ...(media_resolution             && { media_resolution }),
    ...(thinking_level               && { thinking_level }),
    ...otherParams,
  };

  const combo = await prisma.modelCombo.findUnique({
    where: { userId_name: { userId: keyRecord.userId, name: requestedModel } },
  });
  const comboModels = combo ? parseComboModels(combo.models) : [];
  const modelsToTry = comboModels.length > 0 ? comboModels : [requestedModel];
  let result = await routeRequest(connections, modelsToTry[0]!, messages || [], extraParams);

  for (const fallbackModel of modelsToTry.slice(1)) {
    if (result.success) break;
    const fallbackResult = await routeRequest(connections, fallbackModel, messages || [], extraParams);
    result = {
      ...fallbackResult,
      attempts: [...result.attempts, ...fallbackResult.attempts],
      rotatedProvider: result.rotatedProvider || fallbackResult.rotatedProvider || true,
      rotatedKey: result.rotatedKey || fallbackResult.rotatedKey,
      totalDurationMs: result.totalDurationMs + fallbackResult.totalDurationMs,
    };
  }

  // ── Streaming path ──────────────────────────────────────────────────────────
  if (stream && result.success && result.rawResponse) {
    // Pipe the SSE stream from the upstream provider directly to the client
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");  // disable nginx buffering if present

    const body = result.rawResponse.body;
    if (body) {
      const reader = body.getReader();
      const decoder = new TextDecoder();

      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) { res.end(); break; }
            res.write(decoder.decode(value, { stream: true }));
          }
        } catch (err) {
          res.end();
        }
      };

      req.on("close", () => reader.cancel());
      pump();
    } else {
      res.end();
    }

    // Log asynchronously without awaiting
    prisma.routerLog.create({
      data: {
        requestedModel: requestedModelLabel,
        usedModel: result.usedModel,
        success: true,
        rotated: result.rotatedKey || result.rotatedProvider,
        totalAttempts: result.attempts.length,
        attempts: JSON.stringify(result.attempts)
      }
    }).catch((e: any) => console.error("Failed to save router log:", e));

    return;
  }

  // ── Non-streaming path ──────────────────────────────────────────────────────
  // Persist to routing log in DB
  try {
    await prisma.routerLog.create({
      data: {
        requestedModel: requestedModelLabel,
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
    return res.json(result.response);
  }

  // Build friendly error with full audit log
  const failedReasons = result.attempts.map(a =>
    `  • [${a.provider}] ${a.connectionName}: ${a.status}${a.errorMessage ? ` — ${a.errorMessage}` : ""}`
  ).join("\n");

  return res.status(503).json({
    error: {
      message: `All keys exhausted for model "${requestedModelLabel}". Tried ${result.attempts.length} connection(s).`,
      type: "no_available_keys",
      attempts: result.attempts
    },
    _debug: {
      failedReasons,
      hint: `Add more API keys in Providers → ${model.split("/")[0]} or check rate-limit cooldowns.`
    }
  });
});

// Router audit log — visible in Playground / debug UI
app.get("/api/router/log", async (req: Request, res: Response) => {
  try {
    const logs = await prisma.routerLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 50
    });
    const mappedLogs = logs.map((l: any) => ({
      ...l,
      attempts: JSON.parse(l.attempts)
    }));
    res.json({ log: mappedLogs });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

// Clear router log
app.delete("/api/router/log", async (req: Request, res: Response) => {
  try {
    await prisma.routerLog.deleteMany();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to clear logs" });
  }
});

// Live key status — shows which keys are active/rate-limited/invalid
app.get("/api/router/keys/status", async (req: Request, res: Response) => {
  try {
    const user = (req.user || (req.cookies["auth-token"] ? await prisma.user.findUnique({ where: { id: req.cookies["auth-token"] } }) : null)) as any;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const connections = await prisma.providerConnection.findMany({
      where: { userId: user.id }
    });
    res.json({ statuses: getKeyStatuses(connections as any[]) });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch status" });
  }
});

// Reset a specific key's rate-limit state (manual cooldown bypass)
app.post("/api/router/keys/:id/reset", async (req: Request, res: Response) => {
  try {
    const conn = await prisma.providerConnection.update({
      where: { id: req.params.id as string },
      data: {
        testStatus: "unknown",
        lastError: null,
        lastErrorAt: null,
        errorCode: null
      }
    });
    res.json({ success: true, connection: conn });
  } catch (error) {
    res.status(500).json({ error: "Failed to reset key" });
  }
});

// ─── Admin CMS ───────────────────────────────────────────────────────────────
// Simple guard: must be authenticated + have role "admin"
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim()).filter(Boolean);

async function requireAdmin(req: Request, res: Response): Promise<any | null> {
  const sessionUser = req.user as any;
  const cookieUserId = req.cookies?.["auth-token"];

  let user: any = null;
  if (sessionUser) {
    user = sessionUser;
  } else if (cookieUserId) {
    user = await prisma.user.findUnique({ where: { id: cookieUserId } });
  }

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  const isAdmin = user.role === "admin" || ADMIN_EMAILS.includes(user.email);
  if (!isAdmin) {
    res.status(403).json({ error: "Forbidden — Admin only" });
    return null;
  }

  return user;
}

// GET /api/admin/stats — overview numbers
app.get("/api/admin/stats", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    const [totalUsers, totalKeys, totalConnections, bannedUsers, totalLogs] = await Promise.all([
      prisma.user.count(),
      prisma.apiKey.count(),
      prisma.providerConnection.count(),
      prisma.user.count({ where: { isBanned: true } as any }),
      prisma.routerLog.count(),
    ]);
    res.json({ totalUsers, totalKeys, totalConnections, bannedUsers, totalLogs });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch admin stats" });
  }
});

// GET /api/admin/users — paginated user list
app.get("/api/admin/users", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    const page   = Math.max(1, parseInt(req.query.page   as string) || 1);
    const limit  = Math.min(100, parseInt(req.query.limit as string) || 20);
    const search = (req.query.search as string) || "";

    const where = search
      ? { OR: [{ email: { contains: search } }, { name: { contains: search } }] }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { apiKeys: true, connections: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// GET /api/admin/users/:id — user detail with keys & connections
app.get("/api/admin/users/:id", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id as string },
      include: {
        apiKeys: { orderBy: { createdAt: "desc" } },
        connections: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// PATCH /api/admin/users/:id — ban/unban, change role
app.patch("/api/admin/users/:id", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    const { isBanned, role, name } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.params.id as string },
      data: {
        ...(typeof isBanned === "boolean" ? { isBanned } : {}),
        ...(role ? { role } : {}),
        ...(name  ? { name  } : {}),
      },
    });
    res.json({ success: true, user: updated });
  } catch (error) {
    res.status(500).json({ error: "Failed to update user" });
  }
});

// DELETE /api/admin/users/:id — permanently delete user
app.delete("/api/admin/users/:id", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    // cascade: delete keys + connections first (SQLite has no cascade by default)
    await prisma.apiKey.deleteMany({ where: { userId: req.params.id as string } });
    await prisma.providerConnection.deleteMany({ where: { userId: req.params.id as string } });
    await prisma.user.delete({ where: { id: req.params.id as string } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// DELETE /api/admin/users/:id/keys/:keyId — revoke a specific key
app.delete("/api/admin/users/:id/keys/:keyId", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    await prisma.apiKey.delete({ where: { id: req.params.keyId as string } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete key" });
  }
});

// GET /api/admin/keys — all API keys across all users
app.get("/api/admin/keys", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    const keys = await prisma.apiKey.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    res.json({ keys });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch keys" });
  }
});

// ─── end Admin CMS ────────────────────────────────────────────────────────────

// Catch-all for missing API routes to return valid JSON
app.use("/api", (req: Request, res: Response) => {
  res.json({ data: null, message: "Mock catch-all" });
});

app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});
