"use client";

import { useEffect, useMemo, useState } from "react";
import { translate } from "@/i18n/runtime";

type Model = {
  id?: string;
  model_id?: string;
  name?: string;
  model?: string;
  provider?: string;
  providerAlias?: string;
  supplier?: string;
  type?: string;
  description?: string;
  context_window?: number;
  max_output_tokens?: number;
  supports_vision?: boolean;
  released_at?: string;
  rate_limits?: {
    rpm?: number | null;
    rpd?: number | null;
    tpm?: number | null;
    tpd?: number | null;
  };
  pricing?: {
    mode?: string;
    currency?: string;
    unit?: string;
    input?: number | null;
    output?: number | null;
    fixed_price_vnd?: number | null;
    cache_read?: number | null;
    cache_write?: number | null;
    reasoning?: number | null;
  };
  discount?: {
    percent?: number | null;
    all_plans?: Record<string, number | null>;
  };
  created?: number;
  [key: string]: unknown;
};

type PublicSettings = {
  modelOriginalPriceMultiplier?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeModels(data: unknown): Model[] {
  if (Array.isArray(data)) return data;
  if (!isRecord(data)) return [];
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.models)) return data.models;
  if (isRecord(data.models)) {
    return Object.entries(data.models).map(([id, meta]) => {
      const modelMeta = isRecord(meta) ? meta : {};
      return {
      id,
      model: id,
        name: typeof modelMeta.name === "string" ? modelMeta.name : id,
        provider: typeof modelMeta.provider === "string" ? modelMeta.provider : undefined,
        providerAlias:
          typeof modelMeta.providerAlias === "string" ? modelMeta.providerAlias : undefined,
      };
    });
  }
  return [];
}

function titleFromModel(model: Model) {
  return (
    model.name || model.model_id || model.id || model.model || "Unknown model"
  );
}

function subtitleFromModel(model: Model) {
  return model.model_id || model.id || model.model || model.name || "";
}

function formatTokens(value?: number | null) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPrice(value?: number | null, currency = "USD") {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: value < 1 ? 3 : 2,
  }).format(value);
}

function formatVnd(value?: number | null) {
  if (value === null || value === undefined) return "-";
  return `${new Intl.NumberFormat("vi-VN").format(value)} VNĐ`;
}

function isFreeTokenModel(model: Model) {
  return (
    model.pricing?.mode !== "REQUEST" &&
    model.pricing?.input === 0 &&
    model.pricing?.output === 0
  );
}

function formatReleasedAt(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("vi-VN");
}

function hasValue(value: unknown): value is number | string {
  return value !== null && value !== undefined && value !== "";
}

function modelHasDiscount(model: Model) {
  if (hasValue(model.discount?.percent) && Number(model.discount.percent) > 0) {
    return true;
  }
  return Object.values(model.discount?.all_plans || {}).some(
    (value) => hasValue(value) && Number(value) > 0,
  );
}

function shouldShowOriginalPrice(value: number | null | undefined, multiplier: number) {
  return multiplier > 1 && typeof value === "number" && value > 0;
}

export default function ModelsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [modelOriginalPriceMultiplier, setModelOriginalPriceMultiplier] = useState(1);
  const [query, setQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [discountOnly, setDiscountOnly] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchModels = async () => {
    try {
      setLoading(true);
      setError(null);

      const [response, settingsResponse] = await Promise.all([
        fetch("/api/v1/management/models/text", {
          cache: "no-store",
        }),
        fetch("/api/settings", {
          cache: "no-store",
        }),
      ]);
      if (!response.ok) throw new Error("Failed to fetch models");

      const data = await response.json();
      setModels(normalizeModels(data));
      if (settingsResponse.ok) {
        const settings = (await settingsResponse.json()) as PublicSettings;
        setModelOriginalPriceMultiplier(
          Math.max(1, Number(settings.modelOriginalPriceMultiplier || 1)),
        );
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const providerOptions = useMemo(() => {
    const providers = new Set<string>();
    for (const model of models) {
      if (model.provider) providers.add(model.provider);
    }
    return ["all", ...Array.from(providers).sort((a, b) => a.localeCompare(b))];
  }, [models]);

  const discountedCount = useMemo(
    () => models.filter((model) => modelHasDiscount(model)).length,
    [models],
  );

  const filteredModels = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return models.filter((model) => {
      const matchesKeyword =
        !keyword ||
        titleFromModel(model).toLowerCase().includes(keyword) ||
        subtitleFromModel(model).toLowerCase().includes(keyword) ||
        String(model.provider || "")
          .toLowerCase()
          .includes(keyword);

      const matchesProvider =
        providerFilter === "all" ||
        (model.provider || "unknown") === providerFilter;

      const matchesDiscount = !discountOnly || modelHasDiscount(model);

      return matchesKeyword && matchesProvider && matchesDiscount;
    });
  }, [discountOnly, models, providerFilter, query]);

  const handleCopy = async (model: Model) => {
    const value = subtitleFromModel(model);
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(value);
      window.setTimeout(() => {
        setCopiedId((current) => (current === value ? null : current));
      }, 1600);
    } catch (error) {
      console.error("Copy failed", error);
    }
  };

  return (
    <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 sm:gap-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 overflow-hidden">
        <div className="absolute left-0 top-8 h-44 w-44 rounded-full bg-primary/10 blur-3xl sm:h-60 sm:w-60" />
        <div className="absolute right-[8%] top-0 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl sm:h-56 sm:w-56" />
      </div>

      <section className="overflow-hidden rounded-[28px] border border-border/60 bg-card/70 shadow-xl backdrop-blur">
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end lg:p-8">
          <div className="space-y-4">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 sm:h-16 sm:w-16">
              <span className="material-symbols-outlined text-[28px] sm:text-[32px]">
                dataset
              </span>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-text-main sm:text-4xl">
                {translate("Available Models")}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-text-muted sm:text-base">
                Browse the live Beeknoee model catalog used by Tinobot,
                including capabilities, token limits, pricing, and plan
                discounts.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                Total Models
              </p>
              <p className="mt-2 text-2xl font-bold text-text-main">
                {models.length}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                Providers
              </p>
              <p className="mt-2 text-2xl font-bold text-text-main">
                {Math.max(providerOptions.length - 1, 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                Discounted
              </p>
              <p className="mt-2 text-2xl font-bold text-text-main">
                {discountedCount}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_220px_160px_140px]">
        <label className="relative block">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted material-symbols-outlined">
            search
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by model name, id, or provider"
            className="h-12 w-full rounded-2xl border border-border bg-card pl-12 pr-4 text-sm text-text-main outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
          />
        </label>

        <select
          value={providerFilter}
          onChange={(event) => setProviderFilter(event.target.value)}
          className="h-12 rounded-2xl border border-border bg-card px-4 text-sm text-text-main outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
        >
          {providerOptions.map((provider) => (
            <option key={provider} value={provider} className="text-black">
              {provider === "all" ? "All providers" : provider}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setDiscountOnly((value) => !value)}
          className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition ${
            discountOnly
              ? "border-amber-400/40 bg-amber-500/15 text-amber-300"
              : "border-border bg-card text-text-muted hover:border-amber-400/40 hover:text-amber-300"
          }`}
          aria-pressed={discountOnly}
        >
          <span className="material-symbols-outlined text-[18px]">
            sell
          </span>
          Đang giảm giá
        </button>

        <button
          onClick={fetchModels}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          <span
            className={`material-symbols-outlined text-[18px] ${loading ? "animate-spin" : ""}`}
          >
            refresh
          </span>
          {translate("Refresh")}
        </button>
      </section>

      {error && (
        <section className="rounded-[24px] border border-red-500/20 bg-red-500/5 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-base font-semibold text-red-400">
                Unable to load models
              </p>
              <p className="mt-1 text-sm text-red-300/80">{error}</p>
            </div>
            <button
              onClick={fetchModels}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-red-400/20 px-4 text-sm font-medium text-red-300 transition hover:bg-red-500/10"
            >
              {translate("Retry")}
            </button>
          </div>
        </section>
      )}

      {!error && (
        <section className="rounded-[28px] border border-border/60 bg-card/70 p-4 shadow-xl backdrop-blur sm:p-6">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 9 }).map((_, index) => (
                <div
                  key={index}
                  className="h-36 animate-pulse rounded-2xl border border-border/50 bg-background/50"
                />
              ))}
            </div>
          ) : filteredModels.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-background/40 px-6 text-center">
              <span className="material-symbols-outlined text-5xl text-text-muted/60">
                search_off
              </span>
              <div>
                <p className="text-lg font-semibold text-text-main">
                  {translate("No models found")}
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  Adjust your search keyword or provider filter.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredModels.map((model, index) => {
                const modelId = subtitleFromModel(model);
                const isCopied = copiedId === modelId;
                const hasDiscount = modelHasDiscount(model);
                const discountLabel =
                  hasValue(model.discount?.percent) &&
                  Number(model.discount.percent) > 0
                    ? `-${model.discount.percent}%`
                    : "Sale";
                const hasTags =
                  !!model.provider ||
                  !!model.type ||
                  !!model.supports_vision ||
                  (!!model.supplier && model.supplier !== model.provider);
                const hasStats =
                  hasValue(model.context_window) ||
                  hasValue(model.max_output_tokens);
                const hasRequestPricing =
                  model.pricing?.mode === "REQUEST" &&
                  hasValue(model.pricing.fixed_price_vnd);
                const hasTokenPricing =
                  model.pricing?.mode !== "REQUEST" &&
                  (
                    hasValue(model.pricing?.input) ||
                    hasValue(model.pricing?.output) ||
                    hasValue(model.pricing?.cache_read) ||
                    hasValue(model.pricing?.cache_write) ||
                    hasValue(model.pricing?.reasoning)
                  );
                const hasPricing = hasRequestPricing || hasTokenPricing;
                const rateLimits = [
                  ["TPM", model.rate_limits?.tpm],
                  ["RPM", model.rate_limits?.rpm],
                  ["TPD", model.rate_limits?.tpd],
                  ["RPD", model.rate_limits?.rpd],
                ].filter(([, value]) => hasValue(value));

                return (
                  <article
                    key={model.model_id || model.id || model.name || index}
                    className="group flex flex-col rounded-2xl border border-border/50 bg-surface transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 overflow-hidden"
                  >
                    {/* Card Header */}
                    <div className="p-4 pb-3 flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <span className="material-symbols-outlined text-[18px]">
                          smart_toy
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h2 className="text-sm font-semibold leading-snug text-text-main line-clamp-1">
                            {titleFromModel(model)}
                          </h2>
                          {hasDiscount && (
                            <span className="shrink-0 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                              {discountLabel}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-text-muted font-mono line-clamp-1 break-all">
                          {modelId}
                        </p>
                      </div>
                    </div>

                    {/* Tags */}
                    {hasTags && <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                      {model.provider && (
                        <span className="rounded-md border border-border/70 bg-surface-hover px-2 py-0.5 text-[11px] font-medium text-text-muted">
                          {model.provider}
                        </span>
                      )}
                      {model.type && (
                        <span className="rounded-md border border-border/70 bg-surface-hover px-2 py-0.5 text-[11px] text-text-muted">
                          {model.type}
                        </span>
                      )}
                      {model.supports_vision && (
                        <span className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                          Vision
                        </span>
                      )}
                      {model.supplier && model.supplier !== model.provider && (
                        <span className="rounded-md border border-border/70 bg-surface-hover px-2 py-0.5 text-[11px] text-text-muted">
                          {model.supplier}
                        </span>
                      )}
                    </div>}

                    {hasStats && <>
                      {/* Divider */}
                      <div className="mx-4 border-t border-border/40" />

                      {/* Stats Row */}
                      <div className="px-4 py-3 grid grid-cols-2 gap-3">
                      {hasValue(model.context_window) && <div>
                        <p className="text-[10px] uppercase tracking-wider text-text-muted mb-0.5">
                          Context
                        </p>
                        <p className="text-sm font-semibold text-text-main">
                          {formatTokens(model.context_window)}
                        </p>
                      </div>}
                      {hasValue(model.max_output_tokens) && <div>
                        <p className="text-[10px] uppercase tracking-wider text-text-muted mb-0.5">
                          Max output
                        </p>
                        <p className="text-sm font-semibold text-text-main">
                          {formatTokens(model.max_output_tokens)}
                        </p>
                      </div>}
                      </div>
                    </>}

                    {/* Pricing */}
                    {model.pricing && hasPricing && (
                      <>
                        <div className="mx-4 border-t border-border/40" />
                        <div className="px-4 py-3">
                          <p className="text-[10px] uppercase tracking-wider text-text-muted mb-2">
                            Pricing
                            {model.pricing.unit
                              ? ` · ${model.pricing.unit.replace(/_/g, " ")}`
                              : ""}
                          </p>
                          {hasRequestPricing ? (
                            <div className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2">
                              <p className="text-[10px] uppercase tracking-wider text-text-muted">
                                Giá /request
                              </p>
                              <p className="mt-1 text-base font-bold text-primary">
                                {shouldShowOriginalPrice(
                                  model.pricing.fixed_price_vnd,
                                  modelOriginalPriceMultiplier,
                                ) && (
                                  <span className="mr-2 text-xs font-medium text-text-muted line-through">
                                    {formatVnd(
                                      Number(model.pricing.fixed_price_vnd) *
                                        modelOriginalPriceMultiplier,
                                    )}
                                  </span>
                                )}
                                {formatVnd(model.pricing.fixed_price_vnd)}
                              </p>
                            </div>
                          ) : isFreeTokenModel(model) ? (
                            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                              <p className="text-[10px] uppercase tracking-wider text-emerald-400">
                                Token pricing
                              </p>
                              <p className="mt-1 text-base font-bold text-emerald-400">
                                Free
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                              {hasValue(model.pricing.input) && <div className="flex items-center justify-between">
                                <span className="text-text-muted">Input</span>
                                <span className="font-medium text-text-main">
                                  {shouldShowOriginalPrice(
                                    model.pricing.input,
                                    modelOriginalPriceMultiplier,
                                  ) && (
                                    <span className="mr-1 text-[10px] font-normal text-text-muted line-through">
                                      {formatPrice(
                                        Number(model.pricing.input) *
                                          modelOriginalPriceMultiplier,
                                        model.pricing.currency,
                                      )}
                                    </span>
                                  )}
                                  {formatPrice(
                                    model.pricing.input,
                                    model.pricing.currency,
                                  )}
                                </span>
                              </div>}
                              {hasValue(model.pricing.output) && <div className="flex items-center justify-between">
                                <span className="text-text-muted">Output</span>
                                <span className="font-medium text-text-main">
                                  {shouldShowOriginalPrice(
                                    model.pricing.output,
                                    modelOriginalPriceMultiplier,
                                  ) && (
                                    <span className="mr-1 text-[10px] font-normal text-text-muted line-through">
                                      {formatPrice(
                                        Number(model.pricing.output) *
                                          modelOriginalPriceMultiplier,
                                        model.pricing.currency,
                                      )}
                                    </span>
                                  )}
                                  {formatPrice(
                                    model.pricing.output,
                                    model.pricing.currency,
                                  )}
                                </span>
                              </div>}
                              {model.pricing.cache_read !== null &&
                                model.pricing.cache_read !== undefined && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-text-muted">
                                      Cache read
                                    </span>
                                    <span className="font-medium text-text-main">
                                      {shouldShowOriginalPrice(
                                        model.pricing.cache_read,
                                        modelOriginalPriceMultiplier,
                                      ) && (
                                        <span className="mr-1 text-[10px] font-normal text-text-muted line-through">
                                          {formatPrice(
                                            Number(model.pricing.cache_read) *
                                              modelOriginalPriceMultiplier,
                                            model.pricing.currency,
                                          )}
                                        </span>
                                      )}
                                      {formatPrice(
                                        model.pricing.cache_read,
                                        model.pricing.currency,
                                      )}
                                    </span>
                                  </div>
                                )}
                              {model.pricing.cache_write !== null &&
                                model.pricing.cache_write !== undefined && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-text-muted">
                                      Cache write
                                    </span>
                                    <span className="font-medium text-text-main">
                                      {shouldShowOriginalPrice(
                                        model.pricing.cache_write,
                                        modelOriginalPriceMultiplier,
                                      ) && (
                                        <span className="mr-1 text-[10px] font-normal text-text-muted line-through">
                                          {formatPrice(
                                            Number(model.pricing.cache_write) *
                                              modelOriginalPriceMultiplier,
                                            model.pricing.currency,
                                          )}
                                        </span>
                                      )}
                                      {formatPrice(
                                        model.pricing.cache_write,
                                        model.pricing.currency,
                                      )}
                                    </span>
                                  </div>
                                )}
                              {model.pricing.reasoning !== null &&
                                model.pricing.reasoning !== undefined && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-text-muted">
                                      Reasoning
                                    </span>
                                    <span className="font-medium text-text-main">
                                      {shouldShowOriginalPrice(
                                        model.pricing.reasoning,
                                        modelOriginalPriceMultiplier,
                                      ) && (
                                        <span className="mr-1 text-[10px] font-normal text-text-muted line-through">
                                          {formatPrice(
                                            Number(model.pricing.reasoning) *
                                              modelOriginalPriceMultiplier,
                                            model.pricing.currency,
                                          )}
                                        </span>
                                      )}
                                      {formatPrice(
                                        model.pricing.reasoning,
                                        model.pricing.currency,
                                      )}
                                    </span>
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Spacer pushes footer to bottom */}
                    <div className="flex-1" />

                    {/* Footer */}
                    <div className="mx-4 border-t border-border/40" />
                    <div className="px-4 py-3 flex items-center justify-between gap-2">
                      <div className="text-[11px] text-text-muted space-y-0.5">
                        {rateLimits.length > 0 && (
                          <p>
                            {rateLimits
                              .map(([label, value]) => `${label} ${formatTokens(value as number)}`)
                              .join(" · ")}
                          </p>
                        )}
                        {formatReleasedAt(model.released_at) && (
                          <p>Released {formatReleasedAt(model.released_at)}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleCopy(model)}
                        className={`shrink-0 inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-medium transition-all ${
                          isCopied
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : "border-border/70 bg-surface-hover text-text-muted hover:border-primary/40 hover:text-primary"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {isCopied ? "check" : "content_copy"}
                        </span>
                        {isCopied ? "Copied" : "Copy ID"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
