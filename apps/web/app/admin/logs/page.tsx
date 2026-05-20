"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then(r => r.json());
const Skeleton = ({ className }: { className?: string }) => (
  <div className={`bg-surface-hover rounded-md animate-pulse ${className}`} />
);

type LogEntry = {
  id: string;
  requestedModel: string;
  usedModel: string | null;
  success: boolean;
  rotated: boolean;
  totalAttempts: number;
  attempts: any[];
  timestamp: string;
};

export default function AdminLogsPage() {
  const { data, isLoading } = useSWR<{ log: LogEntry[] }>("/api/router/log", fetcher, {
    refreshInterval: 15000,
  });
  const logs = data?.log || [];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-main flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-500">route</span>
          Router Audit Log
        </h1>
        <p className="text-text-muted text-sm mt-1">Last 50 routing decisions — auto-refreshes every 15s</p>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface/40">
                {["Time", "Requested Model", "Used Model", "Result", "Attempts", "Rotated"].map(h => (
                  <th key={h} className="px-5 py-4 font-bold text-text-muted uppercase text-[10px] tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-5 py-4"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-4xl opacity-10">receipt_long</span>
                      <p className="italic">No log entries yet</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((entry) => (
                  <tr key={entry.id} className="hover:bg-primary/[0.02] transition-colors group">
                    <td className="px-5 py-4 text-[11px] text-text-muted whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-text-main">{entry.requestedModel}</td>
                    <td className="px-5 py-4 font-mono text-xs text-text-muted">{entry.usedModel || "—"}</td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full flex items-center gap-1 w-fit ${
                        entry.success
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-red-500/10 text-red-500"
                      }`}>
                        <span className="material-symbols-outlined text-[12px]">
                          {entry.success ? "check_circle" : "cancel"}
                        </span>
                        {entry.success ? "OK" : "Failed"}
                      </span>
                    </td>
                    <td className="px-5 py-4 tabular-nums text-center text-text-muted font-medium">{entry.totalAttempts}</td>
                    <td className="px-5 py-4">
                      {entry.rotated ? (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">Yes</span>
                      ) : (
                        <span className="text-text-muted text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
