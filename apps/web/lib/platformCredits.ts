import { getPrisma } from "@/lib/prisma";
import { logPlatformFlow } from "@/lib/platformFlowLog";
import { fetchPlatformUpstream } from "@/lib/platformUpstreams";

type ModelPricing = {
  mode?: string;
  input?: number | null;
  output?: number | null;
  fixed_price_vnd?: number | null;
};

type CatalogModel = {
  model_id?: string;
  id?: string;
  model?: string;
  pricing?: ModelPricing;
};

type ResolvedPricingMode = "FREE" | "REQUEST" | "TOKEN";

function roundCredits(value: number) {
  return Math.round(value * 1_000_000_000_000) / 1_000_000_000_000;
}

function getUsageLogDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function incrementClientDailyUsage(tx: any, clientId: string, tokensUsed: number) {
  const logDate = getUsageLogDate();
  await tx.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS client_daily_usage (
      id TEXT NOT NULL PRIMARY KEY,
      client_id TEXT NOT NULL,
      log_date TEXT NOT NULL,
      tokens_used INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await tx.$executeRaw`
    CREATE UNIQUE INDEX IF NOT EXISTS client_daily_usage_client_id_log_date_key
    ON client_daily_usage (client_id, log_date)
  `;
  await tx.$executeRaw`
    INSERT INTO client_daily_usage (id, client_id, log_date, tokens_used, created_at, updated_at)
    VALUES (${`${clientId}-${logDate}`}, ${clientId}, ${logDate}, ${tokensUsed}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (client_id, log_date)
    DO UPDATE SET
      tokens_used = client_daily_usage.tokens_used + excluded.tokens_used,
      updated_at = CURRENT_TIMESTAMP
  `;
}

function normalizeCatalog(payload: any): CatalogModel[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.models)) return payload.models;
  return [];
}

function findCatalogModel(models: CatalogModel[], model: string) {
  return models.find((entry) => [entry.model_id, entry.id, entry.model].includes(model));
}

function resolvePricingMode(pricing: ModelPricing): ResolvedPricingMode {
  if (pricing.mode?.toUpperCase() === "REQUEST") {
    if (pricing.fixed_price_vnd === null || pricing.fixed_price_vnd === undefined) {
      throw new Error("REQUEST pricing is missing fixed_price_vnd");
    }
    return Number(pricing.fixed_price_vnd) === 0 ? "FREE" : "REQUEST";
  }

  if (
    pricing.input === null ||
    pricing.input === undefined ||
    pricing.output === null ||
    pricing.output === undefined
  ) {
    throw new Error("TOKEN pricing is missing input or output price");
  }
  return Number(pricing.input) === 0 && Number(pricing.output) === 0 ? "FREE" : "TOKEN";
}

function calculateBaseCredits(
  payload: any,
  pricing: ModelPricing,
  vndUsdRate: number,
  pricingMode: ResolvedPricingMode,
) {
  if (pricingMode === "FREE") return 0;
  if (pricingMode === "REQUEST") return Number(pricing.fixed_price_vnd) / vndUsdRate;

  const promptTokens = Number(payload?.usage?.prompt_tokens);
  const completionTokens = Number(payload?.usage?.completion_tokens);
  if (!Number.isFinite(promptTokens) || !Number.isFinite(completionTokens)) {
    throw new Error("Token usage is missing from upstream response");
  }

  return (
    promptTokens * Number(pricing.input || 0) +
    completionTokens * Number(pricing.output || 0)
  ) / 1_000_000;
}

export async function chargePlatformUsage(
  userId: string,
  model: string,
  payload: any,
  flowId: string,
) {
  const prisma = getPrisma();
  const catalogStartedAt = Date.now();
  logPlatformFlow(flowId, "pricing.catalog.start", { model });
  const [settings, catalogResponse] = await Promise.all([
    prisma.gatewaySetting.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    }),
    fetchPlatformUpstream("management/models/text", {
      method: "GET",
      headers: { Accept: "application/json" },
    }),
  ]);

  if (!catalogResponse.ok) {
    throw new Error(`Failed to fetch model pricing (${catalogResponse.status})`);
  }

  const catalog = normalizeCatalog(await catalogResponse.json());
  logPlatformFlow(flowId, "pricing.catalog.complete", {
    model,
    status: catalogResponse.status,
    modelCount: catalog.length,
    durationMs: Date.now() - catalogStartedAt,
  });
  const catalogModel = findCatalogModel(catalog, model);
  if (!catalogModel?.pricing) throw new Error(`Pricing not found for model: ${model}`);
  const pricing = catalogModel.pricing;
  const pricingMode = resolvePricingMode(pricing);
  logPlatformFlow(flowId, "pricing.model.matched", {
    model,
    pricingMode,
    fixedPriceVnd: pricing.fixed_price_vnd ?? null,
    inputPrice: pricing.input ?? null,
    outputPrice: pricing.output ?? null,
  });

  const baseCredits = roundCredits(calculateBaseCredits(payload, pricing, settings.vndUsdRate, pricingMode));
  const markupCredits = roundCredits(baseCredits * (settings.platformMarkupPercent / 100));
  const chargedCredits = roundCredits(baseCredits + markupCredits);
  const promptTokens = Number(payload?.usage?.prompt_tokens || 0);
  const completionTokens = Number(payload?.usage?.completion_tokens || 0);
  logPlatformFlow(flowId, "credits.calculated", {
    model,
    pricingMode,
    promptTokens,
    completionTokens,
    baseCredits,
    markupPercent: settings.platformMarkupPercent,
    markupCredits,
    chargedCredits,
  });

  const creditsRemaining = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({
      where: { id: userId, credits: { gte: chargedCredits } },
      data: { credits: { decrement: chargedCredits } },
    });
    if (updated.count === 0) throw new Error("User has insufficient credits");

    await tx.platformUsage.create({
      data: {
        userId,
        model,
        pricingMode,
        promptTokens,
        completionTokens,
        baseCredits,
        markupPercent: settings.platformMarkupPercent,
        chargedCredits,
      },
    });
    await incrementClientDailyUsage(tx, userId, promptTokens + completionTokens);
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { credits: true },
    });
    return roundCredits(user.credits);
  });
  logPlatformFlow(flowId, "credits.debited", {
    model,
    pricingMode,
    chargedCredits,
    creditsRemaining,
  });

  return {
    pricingMode,
    baseCredits,
    markupPercent: settings.platformMarkupPercent,
    markupCredits,
    chargedCredits,
    creditsRemaining,
  };
}
