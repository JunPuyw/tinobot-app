"use client";

import { useState, useMemo, useCallback } from "react";
const Card = ({ children, className }: any) => (
  <div className={`rounded-2xl border border-border bg-card shadow-sm ${className || ""}`}>
    {children}
  </div>
);
import useSWR from "swr";

interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
}

function formatPrice(price: string): string {
  const num = parseFloat(price);
  if (isNaN(num) || num === 0) return "Free";
  if (num < 0.000001) return `$${(num * 1_000_000).toFixed(2)}/M`;
  return `$${(num * 1_000_000).toFixed(2)}/M`;
}

function formatContext(ctx: number): string {
  if (!ctx) return "—";
  if (ctx >= 1_000_000) return `${(ctx / 1_000_000).toFixed(1)}M`;
  if (ctx >= 1_000) return `${(ctx / 1_000).toFixed(0)}K`;
  return `${ctx}`;
}

function getProviderFromId(id: string): string {
  const prefix = id.split("/")[0];
  const map: Record<string, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    google: "Google",
    meta: "Meta",
    mistral: "Mistral",
    deepseek: "DeepSeek",
    qwen: "Qwen",
    cohere: "Cohere",
    "x-ai": "xAI",
    perplexity: "Perplexity",
    nvidia: "NVIDIA",
    microsoft: "Microsoft",
    "01-ai": "01.AI",
    moonshotai: "Moonshot",
    "nousresearch": "NousResearch",
  };
  return (map as any)[prefix.toLowerCase()] || prefix;
}

function getProviderColor(id: string): string {
  const prefix = id.split("/")[0].toLowerCase();
  const colors: Record<string, string> = {
    openai: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    anthropic: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    google: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    meta: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    mistral: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    deepseek: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    "x-ai": "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    qwen: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    moonshotai: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  };
  return colors[prefix] || "bg-primary/10 text-primary border-primary/20";
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

function CopyModelId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [id]);

  return (
    <button
      onClick={handleCopy}
      title="Copy model ID"
      className="flex items-center gap-1 mt-0.5 max-w-full group/copy"
    >
      <p className="text-[11px] text-text-muted font-mono truncate">{id}</p>
      <span className={`material-symbols-outlined text-[13px] shrink-0 transition-colors ${copied ? "text-success" : "text-text-muted opacity-0 group-hover/copy:opacity-100"}`}>
        {copied ? "check" : "content_copy"}
      </span>
    </button>
  );
}

export default function ModelShopPage() {
  const [search, setSearch] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string>("all");

  const { data, isLoading, error } = useSWR<{ models: OpenRouterModel[]; error?: string }>(
    "/api/openrouter/models",
    fetcher
  );

  const models = useMemo(() => data?.models || [], [data?.models]);

  const providers = useMemo(() => {
    const set = new Set(models.map((m: any) => getProviderFromId(m.id)));
    return ["all", ...Array.from(set).sort()];
  }, [models]);

  const filtered = useMemo(() => {
    return models.filter((m: any) => {
      const matchSearch =
        !search ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.id.toLowerCase().includes(search.toLowerCase()) ||
        m.description?.toLowerCase().includes(search.toLowerCase());
      const matchProvider =
        selectedProvider === "all" || getProviderFromId(m.id) === selectedProvider;
      return matchSearch && matchProvider;
    });
  }, [models, search, selectedProvider]);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-4xl font-bold tracking-tight text-text-main">OpenRouter Models</h1>
        <p className="text-lg text-text-muted mt-1">
          Khám phá toàn bộ các model có sẵn qua OpenRouter.
        </p>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[20px]">
            search
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm model..."
            value={search}
            onChange={(e: any) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary/50 transition-colors text-sm"
          />
        </div>
        <select
          value={selectedProvider}
          onChange={(e: any) => setSelectedProvider(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-surface border border-border text-text-main focus:outline-none focus:border-primary/50 transition-colors text-sm min-w-[160px]"
        >
          {providers.map(p => (
            <option key={p} value={p}>
              {p === "all" ? "Tất cả providers" : p}
            </option>
          ))}
        </select>
      </div>

      {/* Stats bar */}
      {!isLoading && !error && models.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <span className="material-symbols-outlined text-[16px] text-primary">auto_awesome</span>
          <span>
            Hiển thị <span className="font-semibold text-text-main">{filtered.length}</span> /{" "}
            <span className="font-semibold text-text-main">{models.length}</span> models
          </span>
        </div>
      )}

      {/* Error state */}
      {error || data?.error ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center gap-4 border-dashed">
          <span className="material-symbols-outlined text-6xl text-text-muted opacity-20">
            cloud_off
          </span>
          <div>
            <p className="text-xl font-bold text-text-main">Không thể tải danh sách model</p>
            <p className="text-sm text-text-muted mt-1">
              {data?.error || "Vui lòng kiểm tra cấu hình OpenRouter API key trong Admin Settings."}
            </p>
          </div>
        </Card>
      ) : isLoading ? (
        /* Loading skeleton */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-[200px] rounded-2xl bg-card/50 animate-pulse border border-border" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center gap-4 border-dashed">
          <span className="material-symbols-outlined text-6xl text-text-muted opacity-20">
            search_off
          </span>
          <div>
            <p className="text-xl font-bold text-text-main">Không tìm thấy model</p>
            <p className="text-sm text-text-muted mt-1">Thử thay đổi từ khóa hoặc bộ lọc.</p>
          </div>
        </Card>
      ) : (
        /* Model grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(model => {
            const provider = getProviderFromId(model.id);
            const providerColor = getProviderColor(model.id);
            const promptPrice = formatPrice(model.pricing.prompt);
            const completionPrice = formatPrice(model.pricing.completion);
            const isFree = promptPrice === "Free" && completionPrice === "Free";

            return (
              <Card
                key={model.id}
                className="group flex flex-col gap-3 p-5 hover:border-primary/40 transition-all hover:shadow-md"
              >
                {/* Top row: provider badge + free badge */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${providerColor}`}
                  >
                    {provider}
                  </span>
                  {isFree && (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-success/10 text-success border border-success/20">
                      FREE
                    </span>
                  )}
                </div>

                {/* Model name */}
                <div>
                  <h3 className="font-semibold text-text-main text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {model.name}
                  </h3>
                  <CopyModelId id={model.id} />
                </div>

                {/* Description */}
                {model.description && (
                  <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
                    {model.description}
                  </p>
                )}

                {/* Stats */}
                <div className="mt-auto pt-3 border-t border-border grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium">Context</p>
                    <p className="text-xs font-bold text-text-main mt-0.5">
                      {formatContext(model.context_length)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium">Input</p>
                    <p className="text-xs font-bold text-text-main mt-0.5">{promptPrice}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium">Output</p>
                    <p className="text-xs font-bold text-text-main mt-0.5">{completionPrice}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
