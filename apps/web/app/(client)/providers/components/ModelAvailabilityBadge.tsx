"use client";

/**
 * ModelAvailabilityBadge — compact inline status indicator
 *
 * Shows green when all models are operational, or amber/red when there are
 * issues, with a hover popover for details and cooldown clearing.
 * Uses SWR so multiple instances on the same page share a single fetch.
 */

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
const Button = ({ children, className, variant = "primary", size = "md", loading, fullWidth, disabled, icon, ...props }: any) => {
  const baseStyle = "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    primary: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
    secondary: "border border-border bg-transparent shadow-sm hover:bg-surface",
    ghost: "bg-transparent hover:bg-surface text-text-muted hover:text-text-main",
  };
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-9 px-4 py-2",
    lg: "h-11 px-8 py-3",
  };
  return (
    <button className={`${baseStyle} ${variants[variant as keyof typeof variants] || variants.primary} ${sizes[size as keyof typeof sizes] || sizes.md} ${fullWidth ? "w-full" : ""} ${className || ""}`} disabled={loading || disabled} {...props}>
      {loading && <span className="material-symbols-outlined animate-spin mr-2 text-[16px]">progress_activity</span>}
      {!loading && icon && <span className="material-symbols-outlined mr-1.5 text-[16px]">{icon}</span>}
      {children}
    </button>
  );
};
import { useNotificationStore } from "../../../../store/notificationStore";

const STATUS_CONFIG = {
  available: { icon: "check_circle", color: "#22c55e", label: "Available" },
  cooldown: { icon: "schedule", color: "#f59e0b", label: "Cooldown" },
  unavailable: { icon: "error", color: "#ef4444", label: "Unavailable" },
  unknown: { icon: "help", color: "#6b7280", label: "Unknown" },
};
type Model = {
  provider: string;
  model: string;
  status: "available" | "cooldown" | "unavailable" | "unknown";
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ModelAvailabilityBadge() {
  const { data, isLoading, mutate } = useSWR("/api/models/availability", fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: false,
    dedupingInterval: 10000, // All instances share one request within 10s
  });
  const [expanded, setExpanded] = useState(false);
  const [clearing, setClearing] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const notify = useNotificationStore() as any;

  // Close popover on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setExpanded(false);
    };
    if (expanded) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [expanded]);

  const handleClearCooldown = async (provider: string, model: string) => {
    setClearing(`${provider}:${model}`);
    try {
      const res = await fetch("/api/models/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clearCooldown", provider, model }),
      });
      if (res.ok) {
        notify.success(`Cooldown cleared for ${model}`);
        await mutate();
      } else {
        notify.error("Failed to clear cooldown");
      }
    } catch {
      notify.error("Failed to clear cooldown");
    } finally {
      setClearing(null);
    }
  };

  if (isLoading) return null;
  const models = (data?.models as any[]) || [];
  const unavailableCount = data?.unavailableCount || models.filter((m: any) => m.status !== "available").length;
  const isHealthy = unavailableCount === 0;

  // Group unhealthy models by provider
  const byProvider: Record<string, Model[]> = {};

  (models as Model[]).forEach((m) => {
    if (m.status === "available") return;

    const key = m.provider || "unknown";
    if (!byProvider[key]) byProvider[key] = [];

    byProvider[key].push(m);
  });

  return (
    <div className="relative" ref={ref}>
      {/* <button
        onClick={() => setExpanded(!expanded)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
          isHealthy
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/15"
            : "bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/15"
        }`}
      >
        <span className="material-symbols-outlined text-[14px]">
          {isHealthy ? "verified" : "warning"}
        </span>
        {isHealthy
          ? "All models operational"
          : `${unavailableCount} model${unavailableCount !== 1 ? "s" : ""} with issues`}
      </button> */}

      {expanded && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg">
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-outlined text-[16px]"
                style={{ color: isHealthy ? "#22c55e" : "#f59e0b" }}
              >
                {isHealthy ? "verified" : "warning"}
              </span>
              <span className="text-sm font-semibold text-text-main">Model Status</span>
            </div>
            <button
              onClick={mutate}
              className="p-1 rounded-lg hover:bg-surface text-text-muted hover:text-text-main transition-colors"
              title="Refresh"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
            </button>
          </div>

          <div className="px-4 py-3 max-h-60 overflow-y-auto">
            {isHealthy ? (
              <p className="text-sm text-text-muted text-center py-2">
                All models are responding normally.
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {Object.entries(byProvider).map(([provider, provModels]) => (
                  <div key={provider}>
                    <p className="text-xs font-semibold text-text-main mb-1.5 capitalize">{provider}</p>
                    <div className="flex flex-col gap-1">
                      {provModels.map((m) => {
                        const status = STATUS_CONFIG[m.status] || STATUS_CONFIG.unknown;
                        const isClearing = clearing === `${m.provider}:${m.model}`;
                        return (
                          <div
                            key={`${m.provider}-${m.model}`}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-surface/30"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className="material-symbols-outlined text-[14px] shrink-0"
                                style={{ color: status.color }}
                              >
                                {status.icon}
                              </span>
                              <span className="font-mono text-xs text-text-main truncate">{m.model}</span>
                            </div>
                            {m.status === "cooldown" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleClearCooldown(m.provider, m.model)}
                                disabled={isClearing}
                                className="text-[10px] px-1.5! py-0.5! ml-2"
                              >
                                {isClearing ? "..." : "Clear"}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
