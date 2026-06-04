"use client";

import { useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import useSWR from "swr";
const useWorkspaceSWR = <T,>(url: string | null) => {
  const { activeWorkspace } = useWorkspace();
  const fetcher = async (url: string) => {
    const res = await fetch(url, {
      headers: { "X-Workspace-Id": activeWorkspace?.id || "" }
    });
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json() as Promise<T>;
  };
  return useSWR<T>(activeWorkspace && url ? url : null, fetcher);
};

const Card = ({ children, className, title, padding }: any) => (
  <div className={`rounded-2xl border border-border bg-card shadow-sm ${className || ""}`}>
    {title && (
      <div className="flex flex-col gap-1.5 p-6 pb-0">
        <h3 className="font-semibold leading-none tracking-tight">{title}</h3>
      </div>
    )}
    <div className={padding === "none" ? "" : title ? "p-6 pt-4" : className && !className.includes("p-") ? "p-6" : ""}>{children}</div>
  </div>
);

const Badge = ({ children, className, variant = "primary", size = "md" }: any) => {
  const variants = {
    primary: "bg-primary/10 text-primary",
    info: "bg-blue-500/10 text-blue-500",
  };
  const sizes = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-0.5 text-xs",
  };
  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${variants[variant as keyof typeof variants] || variants.primary} ${sizes[size as keyof typeof sizes] || sizes.md} ${className || ""}`}>
      {children}
    </span>
  );
};

const Spinner = ({ size = "md", className }: any) => (
  <span className={`material-symbols-outlined animate-spin ${size === "sm" ? "text-[16px]" : "text-[24px]"} ${className || ""}`}>progress_activity</span>
);

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`bg-muted rounded-md animate-pulse ${className}`} />
);
import dynamic from "next/dynamic";

const UsageChart = dynamic(() => import("./components/UsageChart"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-surface/5 rounded-2xl animate-pulse">
      Loading Chart...
    </div>
  ),
});

const PERIODS = [
  { value: "24h", label: "24 Hours" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
];

const fmt = (n: number) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n;
};

const fmtCost = (n: number) => "$" + (n || 0).toFixed(2);
const fmtCredits = (n: number) => (n || 0).toFixed(6).replace(/\.?0+$/, "") + " credits";

type UsageModelItem = {
  rawModel: string;
  provider: string;
  requests: number;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  lastUsed?: string;
};

type UsageStats = {
  totalRequests: number;
  totalCost: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  byModel: Record<string, UsageModelItem>;
};

type UsageHistoryItem = {
  id: string;
  model: string;
  pricingMode: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  baseCredits: number;
  markupPercent: number;
  chargedCredits: number;
  createdAt: string;
};

export default function UserUsagePage() {
  const { activeWorkspace } = useWorkspace();
  const [period, setPeriod] = useState("7d");
  const [viewMode, setViewMode] = useState("tokens");

  const { data: stats, isLoading: statsLoading, isValidating: statsValidating } =
    useWorkspaceSWR<UsageStats>(`/api/auth/user/usage/stats?period=${period}`);

  const { data: chartData, isLoading: chartLoading, isValidating: chartValidating } =
    useWorkspaceSWR<any[]>(`/api/auth/user/usage/chart?period=${period}`);

  const { data: historyData, isLoading: historyLoading } =
    useWorkspaceSWR<{ items: UsageHistoryItem[] }>(`/api/auth/user/usage/history?period=${period}`);

  const isLoading = statsLoading || chartLoading;
  const isFetching = (statsValidating || chartValidating) && !isLoading;
  const hasChartData = (chartData || []).some((d: any) => d.tokens > 0 || d.cost > 0);

  const periodSelector = (
    <div className="flex items-center gap-2 bg-surface/50 backdrop-blur-sm p-1 rounded-xl border border-border self-start">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => setPeriod(p.value)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${period === p.value
            ? "bg-primary text-white shadow-lg shadow-primary/20"
            : "text-text-muted hover:text-text-main hover:bg-surface"
            }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      {/* Header — always visible */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-main">Usage Analytics</h1>
          <p className="text-text-muted mt-2 font-medium">
            Real-time monitoring for your account activity
          </p>
        </div>
        {periodSelector}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-6 rounded-2xl border border-border/50 bg-card/20 animate-pulse">
              <Skeleton className="h-3 w-24 mb-4" />
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-16 rounded-full" />
            </div>
          ))
        ) : (
          <>
            <StatCard label="Total Requests" value={fmt(stats?.totalRequests || 0)} icon="api" color="blue" />
            <StatCard
              label="Platform Credits Used"
              value={fmtCredits(stats?.totalCost || 0)}
              icon="account_balance_wallet"
              color="amber"
              subValue={`${fmt(stats?.totalRequests || 0)} API calls`}
            />
            <StatCard 
              label="System Credits" 
              value={fmtCredits(activeWorkspace?.credits || 0)} 
              icon="payments" 
              color="emerald" 
              subValue="Prepaid balance" 
            />
            <StatCard label="Token Volume" value={fmt((stats?.totalPromptTokens || 0) + (stats?.totalCompletionTokens || 0))} icon="data_usage" color="indigo" subValue="Total processed" />
          </>
        )}
      </div>

      {/* Chart Section */}
      <Card className="p-6 relative overflow-hidden group border-border/50 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-bold flex items-center gap-3 text-text-main">
            <span className="material-symbols-outlined text-primary bg-primary/10 p-1.5 rounded-lg">analytics</span>
            Timeline Visualization
          </h3>
          <div className="flex items-center gap-1 bg-surface/50 rounded-xl p-1 border border-border/50">
            <button
              onClick={() => setViewMode("tokens")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === "tokens" ? "bg-primary text-white shadow-md shadow-primary/20" : "text-text-muted hover:text-text-main hover:bg-surface"
                }`}
            >
              Tokens
            </button>
            <button
              onClick={() => setViewMode("cost")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === "cost" ? "bg-primary text-white shadow-md shadow-primary/20" : "text-text-muted hover:text-text-main hover:bg-surface"
                }`}
            >
              Credits
            </button>
          </div>
        </div>

        <div className="h-[320px] w-full relative">
          {isFetching && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/20 backdrop-blur-[1px] rounded-xl">
              <Spinner size="sm" className='' />
            </div>
          )}

          {isLoading ? (
            <Skeleton className="h-full w-full rounded-xl" />
          ) : !hasChartData ? (
            <div className="h-full flex flex-col items-center justify-center bg-surface/10 rounded-2xl border-2 border-dashed border-border/50 text-text-muted">
              <span className="material-symbols-outlined text-5xl mb-3 opacity-10">show_chart</span>
              <p className="text-sm font-medium italic">No activity detected yet</p>
            </div>
          ) : (
            <UsageChart chartData={chartData} viewMode={viewMode} fmt={fmt} fmtCost={fmtCredits} />
          )}
        </div>
      </Card>

      {/* Usage Table */}
      <Card title="Workspace Activity Logs" padding="none" className="border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface/30">
                <th className="px-6 py-5 font-bold text-text-muted uppercase text-[11px] tracking-widest">Model Interface</th>
                <th className="px-6 py-5 font-bold text-text-muted uppercase text-[11px] tracking-widest">Source Node</th>
                <th className="px-6 py-5 font-bold text-text-muted uppercase text-[11px] tracking-widest text-right">Calls</th>
                <th className="px-6 py-5 font-bold text-text-muted uppercase text-[11px] tracking-widest text-right">Volume</th>
                <th className="px-6 py-5 font-bold text-text-muted uppercase text-[11px] tracking-widest text-right">Credits</th>
                <th className="px-6 py-5 font-bold text-text-muted uppercase text-[11px] tracking-widest text-right">Last Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-5"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-6 py-5"><Skeleton className="h-5 w-20 rounded-full" /></td>
                    <td className="px-6 py-5 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                    <td className="px-6 py-5 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    <td className="px-6 py-5 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    <td className="px-6 py-5 text-right"><Skeleton className="h-4 w-24 ml-auto" /></td>
                  </tr>
                ))
              ) : Object.keys(stats?.byModel || {}).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-4xl opacity-10">history</span>
                      <p className="italic font-medium">No activity records found for the selected period.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                Object.values((stats?.byModel as any) || {}).map((item: any, i: number) => (
                  <tr key={i} className="hover:bg-primary/[0.02] transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-text-main group-hover:text-primary transition-colors">{item.rawModel}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <Badge variant="info" size="sm" className="font-bold uppercase tracking-tighter">{item.provider}</Badge>
                    </td>
                    <td className="px-6 py-5 text-right tabular-nums font-medium">{fmt(item.requests)}</td>
                    <td className="px-6 py-5 text-right tabular-nums">
                      <div className="flex flex-col items-end">
                        <span className="text-text-main font-bold">{fmt(item.promptTokens + item.completionTokens)}</span>
                        <span className="text-[10px] text-text-muted opacity-70">{fmt(item.promptTokens)} i / {fmt(item.completionTokens)} o</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right text-amber-600 dark:text-amber-500 font-bold tabular-nums">
                      {fmtCredits(item.cost)}
                    </td>
                    <td className="px-6 py-5 text-right text-text-muted text-[11px] font-medium whitespace-nowrap">
                      {item.lastUsed ? new Date(item.lastUsed).toLocaleString() : "Never"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Credit Charge History" padding="none" className="border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface/30">
                <th className="px-6 py-5 font-bold text-text-muted uppercase text-[11px] tracking-widest">Time</th>
                <th className="px-6 py-5 font-bold text-text-muted uppercase text-[11px] tracking-widest">Model</th>
                <th className="px-6 py-5 font-bold text-text-muted uppercase text-[11px] tracking-widest">Pricing</th>
                <th className="px-6 py-5 font-bold text-text-muted uppercase text-[11px] tracking-widest text-right">Tokens</th>
                <th className="px-6 py-5 font-bold text-text-muted uppercase text-[11px] tracking-widest text-right">Base</th>
                <th className="px-6 py-5 font-bold text-text-muted uppercase text-[11px] tracking-widest text-right">Markup</th>
                <th className="px-6 py-5 font-bold text-text-muted uppercase text-[11px] tracking-widest text-right">Charged</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {historyLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-5"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-6 py-5"><Skeleton className="h-4 w-44" /></td>
                    <td className="px-6 py-5"><Skeleton className="h-5 w-20 rounded-full" /></td>
                    <td className="px-6 py-5 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    <td className="px-6 py-5 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    <td className="px-6 py-5 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    <td className="px-6 py-5 text-right"><Skeleton className="h-4 w-24 ml-auto" /></td>
                  </tr>
                ))
              ) : (historyData?.items || []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-4xl opacity-10">receipt_long</span>
                      <p className="italic font-medium">No credit charges found for the selected period.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                (historyData?.items || []).map((item) => (
                  <tr key={item.id} className="hover:bg-primary/[0.02] transition-colors">
                    <td className="px-6 py-5 text-text-muted text-[11px] font-medium whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-5 font-bold text-text-main">{item.model}</td>
                    <td className="px-6 py-5">
                      <Badge variant="info" size="sm" className="font-bold uppercase">{item.pricingMode}</Badge>
                    </td>
                    <td className="px-6 py-5 text-right tabular-nums">
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-text-main">{fmt(item.totalTokens)}</span>
                        <span className="text-[10px] text-text-muted opacity-70">{fmt(item.promptTokens)} i / {fmt(item.completionTokens)} o</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right tabular-nums">{fmtCredits(item.baseCredits)}</td>
                    <td className="px-6 py-5 text-right tabular-nums">{item.markupPercent}%</td>
                    <td className="px-6 py-5 text-right text-amber-600 dark:text-amber-500 font-bold tabular-nums">
                      {fmtCredits(item.chargedCredits)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  subValue,
}: {
  label: string;
  value: any;
  icon: string;
  color: string;
  subValue?: string;
}) {
  const colors = {
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-blue-500/5",
    amber: "bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-amber-500/5",
    indigo: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20 shadow-indigo-500/5",
    emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/5",
  };

  return (
    <Card className="relative overflow-hidden group hover:translate-y-[-4px] transition-all duration-300 border-border/50 shadow-sm hover:shadow-lg">
      <div className="flex items-start justify-between relative z-10">
        <div className="flex flex-col">
          <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-1 opacity-70">{label}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-text-main tracking-tight group-hover:text-primary transition-colors">{value}</h3>
          </div>
          {subValue && (
            <p className="text-[11px] text-text-muted mt-2 font-bold tracking-tight bg-surface px-2 py-0.5 rounded-full border border-border/50 inline-block self-start">
              {subValue}
            </p>
          )}
        </div>
        <div className={`p-2.5 rounded-2xl border-2 shadow-md ${colors[color as keyof typeof colors] || colors.blue}`}>
          <span className="material-symbols-outlined text-[24px] group-hover:scale-125 transition-transform">{icon}</span>
        </div>
      </div>
      <div className="absolute -right-6 -bottom-6 opacity-[0.05] rotate-12 transition-all duration-500 group-hover:rotate-0 group-hover:scale-110">
        <span className="material-symbols-outlined text-[100px]">{icon}</span>
      </div>
    </Card>
  );
}
