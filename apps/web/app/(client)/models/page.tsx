"use client";

import { useEffect, useMemo, useState } from "react";
import { translate } from "@/i18n/runtime";

type Model = {
    id?: string;
    name?: string;
    model?: string;
    provider?: string;
    providerAlias?: string;
    created?: number;
    [key: string]: any;
};

function normalizeModels(data: any): Model[] {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (data?.models && typeof data.models === "object") {
        return Object.entries(data.models).map(([id, meta]: [string, any]) => ({
            id,
            model: id,
            name: meta?.name || id,
            provider: meta?.provider,
            providerAlias: meta?.providerAlias,
        }));
    }
    return [];
}

function titleFromModel(model: Model) {
    return model.name || model.id || model.model || "Unknown model";
}

function subtitleFromModel(model: Model) {
    return model.id || model.model || model.name || "";
}

export default function ModelsPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [models, setModels] = useState<Model[]>([]);
    const [query, setQuery] = useState("");
    const [providerFilter, setProviderFilter] = useState("all");
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const fetchModels = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch("/api/models", { cache: "no-store" });
            if (!response.ok) throw new Error("Failed to fetch models");

            const data = await response.json();
            setModels(normalizeModels(data));
        } catch (err: any) {
            setError(err.message || "Unknown error");
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

    const filteredModels = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        return models.filter((model) => {
            const matchesKeyword =
                !keyword ||
                titleFromModel(model).toLowerCase().includes(keyword) ||
                subtitleFromModel(model).toLowerCase().includes(keyword) ||
                String(model.provider || "").toLowerCase().includes(keyword);

            const matchesProvider =
                providerFilter === "all" || (model.provider || "unknown") === providerFilter;

            return matchesKeyword && matchesProvider;
        });
    }, [models, providerFilter, query]);

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
                            <span className="material-symbols-outlined text-[28px] sm:text-[32px]">dataset</span>
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-3xl font-bold tracking-tight text-text-main sm:text-4xl">
                                {translate("Available Models")}
                            </h1>
                            <p className="max-w-2xl text-sm leading-6 text-text-muted sm:text-base">
                                Browse the active model catalog used by Tinobot. The list is now served locally, so this screen stays responsive even when the external backend is unavailable.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                        <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                                Total Models
                            </p>
                            <p className="mt-2 text-2xl font-bold text-text-main">{models.length}</p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                                Providers
                            </p>
                            <p className="mt-2 text-2xl font-bold text-text-main">
                                {Math.max(providerOptions.length - 1, 0)}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_220px_140px]">
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
                        <option
                            key={provider}
                            value={provider}
                            className="text-black"
                        >
                            {provider === "all" ? "All providers" : provider}
                        </option>
                    ))}
                </select>

                <button
                    onClick={fetchModels}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                    <span className={`material-symbols-outlined text-[18px] ${loading ? "animate-spin" : ""}`}>
                        refresh
                    </span>
                    {translate("Refresh")}
                </button>
            </section>

            {error && (
                <section className="rounded-[24px] border border-red-500/20 bg-red-500/5 p-5 sm:p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-base font-semibold text-red-400">Unable to load models</p>
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
                            <span className="material-symbols-outlined text-5xl text-text-muted/60">search_off</span>
                            <div>
                                <p className="text-lg font-semibold text-text-main">{translate("No models found")}</p>
                                <p className="mt-1 text-sm text-text-muted">
                                    Adjust your search keyword or provider filter.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {filteredModels.map((model, index) => (
                                <article
                                    key={model.id || model.name || index}
                                    className="group flex min-h-[172px] flex-col justify-between rounded-2xl border border-border/60 bg-background/50 p-4 transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-background/70"
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex min-w-0 items-start gap-3">
                                                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                    <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <h2 className="line-clamp-2 text-sm font-semibold leading-5 text-text-main sm:text-base">
                                                        {titleFromModel(model)}
                                                    </h2>
                                                    <p className="mt-1 line-clamp-2 break-all text-xs text-text-muted">
                                                        {subtitleFromModel(model)}
                                                    </p>
                                                </div>
                                            </div>

                                            <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                                                live
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-text-muted">
                                                {model.provider || "unknown"}
                                            </span>
                                            {model.providerAlias && (
                                                <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-text-muted">
                                                    {model.providerAlias}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-end justify-between gap-3 border-t border-border/50 pt-4">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                                                Catalog Source
                                            </p>
                                            <p className="mt-1 text-sm text-text-main">Tinobot Local Registry</p>
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end gap-2">
                                            <button
                                                onClick={() => handleCopy(model)}
                                                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-medium text-text-main transition hover:border-primary/30 hover:text-primary"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">
                                                    {copiedId === subtitleFromModel(model) ? "check" : "content_copy"}
                                                </span>
                                                {copiedId === subtitleFromModel(model) ? "Copied" : "Copy ID"}
                                            </button>
                                            {model.created && (
                                                <p className="text-right text-[11px] text-text-muted">
                                                    {new Date(model.created * 1000).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}
