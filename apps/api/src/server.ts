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

dotenv.config();

const app = express();
app.use(requestId());
const port = process.env.PORT || 3001;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:20128";

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
                key: `tnb_sk_live_${Math.random().toString(36).substring(7)}`,
                prefix: "sk_live"
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
          apiKeys: { create: { name: "Default Key", key: `tnb_sk_live_${Math.random().toString(36).substring(7)}`, prefix: "sk_live" } } 
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
            key: `tnb_sk_live_${Math.random().toString(36).substring(7)}`,
            prefix: "sk_live"
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
        key: `tnb_sk_live_${Math.random().toString(36).substring(7)}`,
        prefix: "sk_live"
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

app.get("/api/providers", (req: Request, res: Response) => {
  res.json({
    OAUTH_PROVIDERS,
    APIKEY_PROVIDERS,
    FREE_PROVIDERS,
    FREE_TIER_PROVIDERS,
    PROVIDER_MODELS
  });
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
import type { Connection } from "./router";

let routerLog: any[] = [];  // keeps the last N routing decisions for the UI

app.post("/v1/chat/completions", async (req: Request, res: Response) => {
  const { model, messages } = req.body;
  const auth = req.headers.authorization;

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

  if (!model) {
    return res.status(400).json({ error: { message: "Missing required field: model" } });
  }

  // Fetch real connections for this user
  const connectionsFromDb = await prisma.providerConnection.findMany({
    where: { userId: keyRecord.userId, isActive: true }
  });

  // Cast to Connection type for the router
  const connections: Connection[] = connectionsFromDb as any[];

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
    return res.json(result.response);
  }

  // Build friendly error with full audit log
  const failedReasons = result.attempts.map(a =>
    `  • [${a.provider}] ${a.connectionName}: ${a.status}${a.errorMessage ? ` — ${a.errorMessage}` : ""}`
  ).join("\n");

  return res.status(503).json({
    error: {
      message: `All keys exhausted for model "${model}". Tried ${result.attempts.length} connection(s).`,
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
