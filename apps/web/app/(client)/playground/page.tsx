"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { useWorkspace } from "@/context/WorkspaceContext";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Message = {
  role: "user" | "assistant";
  content: string;
  _gateway?: { provider?: string; connectionName?: string };
};

type AttemptStatus =
  | "success"
  | "rate_limited"
  | "invalid_key"
  | "server_error"
  | "network_error";

type RouteAttempt = {
  connectionName: string;
  provider: string;
  modelUsed: string;
  status: AttemptStatus;
  httpStatus?: number;
  errorMessage?: string;
  durationMs: number;
};

type RouterLogEntry = {
  id: string;
  requestedModel: string;
  usedModel: string;
  success: boolean;
  rotatedKey: boolean;
  rotatedProvider: boolean;
  totalAttempts: number;
  attempts: RouteAttempt[];
  timestamp: string;
  totalDurationMs: number;
};

type KeyStatus = {
  id: string;
  name: string;
  provider: string;
  priority: number;
  status: "active" | "rate_limited" | "invalid" | "disabled";
  cooldownRemainingMs: number;
};

type Tab = {
  id: "chat" | "log" | "keys";
  label: string;
  badge?: number;
};

const ATTEMPT_STYLES: Record<AttemptStatus, { bg: string; text: string; icon: string }> = {
  success: { bg: "bg-green-500/10", text: "text-green-400", icon: "check_circle" },
  rate_limited: { bg: "bg-yellow-500/10", text: "text-yellow-400", icon: "timer" },
  invalid_key: { bg: "bg-red-500/10", text: "text-red-400", icon: "key_off" },
  server_error: { bg: "bg-red-500/10", text: "text-red-400", icon: "error" },
  network_error: { bg: "bg-orange-500/10", text: "text-orange-400", icon: "wifi_off" },
};

const KEY_STATUS_STYLES: Record<KeyStatus["status"], { dot: string; label: string }> = {
  active: { dot: "bg-green-400", label: "Active" },
  rate_limited: { dot: "bg-yellow-400 animate-pulse", label: "Rate Limited" },
  invalid: { dot: "bg-red-400", label: "Invalid" },
  disabled: { dot: "bg-gray-500", label: "Disabled" },
};

function CooldownTimer({ ms }: { ms: number }) {
  const [remaining, setRemaining] = useState(ms);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [remaining]);

  if (remaining <= 0) {
    return <span className="text-[10px] text-green-400">Ready</span>;
  }

  return <span className="text-[10px] text-yellow-400">{Math.ceil(remaining / 1000)}s</span>;
}

export default function PlaygroundPage() {
  const { activeWorkspace } = useWorkspace();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Chon model va gui tin nhan de test Smart Key Router. Router se tu dong xoay key/provider khi can.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("openai/gpt-4o-mini");
  const [systemPrompt, setSystemPrompt] = useState("You are a helpful assistant.");
  const [routerLog, setRouterLog] = useState<RouterLogEntry[]>([]);
  const [keyStatuses, setKeyStatuses] = useState<KeyStatus[]>([]);
  const [activeTab, setActiveTab] = useState<Tab["id"]>("chat");

  const { data: keysData } = useSWR<{ keys: Array<{ id: string; key: string; name: string }> }>(
    activeWorkspace ? "/api/auth/user/keys" : null,
    fetcher,
    { refreshInterval: 0 },
  );
  const { data: modelsData } = useSWR<{ models?: Record<string, unknown> }>("/api/models", fetcher);

  const keys = keysData?.keys ?? [];
  const modelOptions = Object.keys(modelsData?.models ?? {});
  const tabs: Tab[] = [
    { id: "chat", label: "Chat" },
    { id: "log", label: "Router Log", badge: routerLog.length },
    { id: "keys", label: "Key Status", badge: keyStatuses.filter((key) => key.status !== "active").length },
  ];

  useEffect(() => {
    if (keys.length > 0 && !selectedKey) {
      setSelectedKey(keys[0]?.key ?? "");
    }
  }, [keys, selectedKey]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const refreshLog = useCallback(async () => {
    const [logRes, statusRes] = await Promise.all([
      fetch("/api/router/log"),
      fetch("/api/router/keys/status"),
    ]);
    const logData = await logRes.json();
    const statusData = await statusRes.json();
    setRouterLog(logData.log ?? []);
    setKeyStatuses(statusData.statuses ?? []);
  }, []);

  useEffect(() => {
    refreshLog();
    const timer = setInterval(refreshLog, 5000);
    return () => clearInterval(timer);
  }, [refreshLog]);

  const handleSend = useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault();
      if (!input.trim() || loading || !selectedKey) return;

      const userMessage: Message = { role: "user", content: input };
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setInput("");
      setLoading(true);

      try {
        const response = await fetch("/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${selectedKey}`,
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [{ role: "system", content: systemPrompt }, ...nextMessages],
          }),
        });

        const data = await response.json();
        if (response.ok) {
          setMessages([
            ...nextMessages,
            {
              role: "assistant",
              content: data.choices?.[0]?.message?.content || "(no content)",
              _gateway: data._gateway,
            },
          ]);
        } else {
          const attempts: RouteAttempt[] = data.error?.attempts ?? [];
          const audit = attempts
            .map(
              (attempt) =>
                `- [${attempt.provider}] ${attempt.connectionName}: ${attempt.status}${attempt.errorMessage ? ` - ${attempt.errorMessage}` : ""}`,
            )
            .join("\n");
          setMessages([
            ...nextMessages,
            {
              role: "assistant",
              content: `Gateway error: ${data.error?.message || "Unknown error"}${audit ? `\n\nAttempts:\n${audit}` : ""}`,
            },
          ]);
        }
      } catch (error: any) {
        setMessages([
          ...nextMessages,
          { role: "assistant", content: `Network error: ${error.message}` },
        ]);
      } finally {
        setLoading(false);
        await refreshLog();
      }
    },
    [input, loading, messages, refreshLog, selectedKey, selectedModel, systemPrompt],
  );

  const handleResetKey = useCallback(async (keyId: string) => {
    await fetch(`/api/router/keys/${keyId}/reset`, { method: "POST" });
    await refreshLog();
  }, [refreshLog]);

  return (
    <div className="flex h-[calc(100vh-180px)] flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-main">API Playground</h1>
          <p className="mt-1 text-sm text-text-muted">
            Test routing, key rotation, and provider fallback from one screen.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">
          <span className="size-1.5 rounded-full bg-green-400 animate-pulse" />
          Gateway Live
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="flex flex-col gap-4 overflow-y-auto lg:col-span-1">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">System API Key</label>
                <select
                  value={selectedKey}
                  onChange={(event) => setSelectedKey(event.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {keys.length === 0 && <option value="">No keys</option>}
                  {keys.map((key) => (
                    <option key={key.id} value={key.key}>
                      {key.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Model</label>
                <select
                  value={selectedModel}
                  onChange={(event) => setSelectedModel(event.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {modelOptions.map((modelId) => (
                    <option key={modelId} value={modelId}>
                      {modelId}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">System Prompt</label>
                <textarea
                  value={systemPrompt}
                  onChange={(event) => setSystemPrompt(event.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <button
                onClick={() => setMessages([{ role: "assistant", content: "Chat cleared." }])}
                className="flex h-8 items-center justify-center gap-1.5 rounded-xl border border-border px-3 text-xs transition-colors hover:bg-surface"
              >
                <span className="material-symbols-outlined text-[14px]">delete</span>
                Clear Chat
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card lg:col-span-3">
          <div className="flex border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:text-text-main"
                }`}
              >
                {tab.label}
                {!!tab.badge && (
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-white">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {activeTab === "chat" && (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
                <div className="flex flex-col gap-4">
                  {messages.map((message, index) => (
                    <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                          message.role === "user"
                            ? "rounded-tr-none bg-primary text-white"
                            : "rounded-tl-none border border-border/50 bg-muted/50 text-text-main"
                        }`}
                      >
                        {message.content}
                        {message._gateway && (
                          <div className="mt-2 flex flex-wrap gap-3 border-t border-border/40 pt-2 text-[10px] text-text-muted">
                            <span>Provider: <b>{message._gateway.provider}</b></span>
                            <span>Key: <b>{message._gateway.connectionName}</b></span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-1 rounded-2xl rounded-tl-none border border-border/50 bg-muted/50 px-4 py-3">
                        {[0, 200, 400].map((delay) => (
                          <div
                            key={delay}
                            className="size-1.5 animate-bounce rounded-full bg-primary/40"
                            style={{ animationDelay: `${delay}ms` }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-border bg-card/50 p-4">
                <form onSubmit={handleSend} className="flex gap-3">
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || !selectedKey || loading}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {loading ? "Sending..." : "Send"}
                  </button>
                </form>
              </div>
            </>
          )}

          {activeTab === "log" && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-3">
                {routerLog.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-text-muted">
                    <span className="material-symbols-outlined text-4xl opacity-30">route</span>
                    <p className="text-sm">No requests yet. Send a message in Chat.</p>
                  </div>
                ) : (
                  routerLog.map((entry) => (
                    <div
                      key={entry.id}
                      className={`rounded-xl border p-4 text-sm ${
                        entry.success ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full px-2 py-0.5 text-xs font-bold">
                            {entry.success ? "SUCCESS" : "FAILED"}
                          </span>
                          {entry.rotatedKey && <span className="text-xs text-yellow-400">Key rotated</span>}
                          {entry.rotatedProvider && <span className="text-xs text-orange-400">Provider rotated</span>}
                        </div>
                        <div className="text-[10px] text-text-muted">
                          {entry.totalDurationMs}ms total · {new Date(entry.timestamp).toLocaleTimeString()}
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-text-muted">
                        <span>Requested: <code className="rounded bg-surface px-1 text-text-main">{entry.requestedModel}</code></span>
                        {entry.usedModel !== entry.requestedModel && (
                          <span>Used: <code className="rounded bg-primary/10 px-1 text-primary">{entry.usedModel}</code></span>
                        )}
                        <span>{entry.totalAttempts} attempt(s)</span>
                      </div>

                      {entry.attempts.length > 0 && (
                        <div className="mt-3 flex flex-col gap-1">
                          {entry.attempts.map((attempt, index) => {
                            const style = ATTEMPT_STYLES[attempt.status];
                            return (
                              <div key={index} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs ${style.bg}`}>
                                <span className={`material-symbols-outlined text-[14px] ${style.text}`}>{style.icon}</span>
                                <span className={`w-24 font-mono font-bold ${style.text}`}>{attempt.status}</span>
                                <span className="font-medium text-text-main">{attempt.connectionName}</span>
                                <span className="text-text-muted">({attempt.provider})</span>
                                <span className="ml-auto shrink-0 text-text-muted">{attempt.durationMs}ms</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "keys" && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs text-text-muted">{keyStatuses.length} key(s) configured</p>
                <button
                  onClick={refreshLog}
                  className="flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-text-main"
                >
                  <span className="material-symbols-outlined text-[14px]">refresh</span>
                  Refresh
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {Object.entries(
                  keyStatuses.reduce((accumulator: Record<string, KeyStatus[]>, key) => {
                    (accumulator[key.provider] ??= []).push(key);
                    return accumulator;
                  }, {}),
                ).map(([provider, providerKeys]) => (
                  <div key={provider} className="overflow-hidden rounded-xl border border-border bg-card/50">
                    <div className="flex items-center gap-2 border-b border-border bg-surface/50 px-4 py-2">
                      <span className="text-xs font-bold uppercase text-text-main">{provider}</span>
                      <span className="text-[10px] text-text-muted">{providerKeys.length} key(s)</span>
                      <div className="ml-auto flex gap-2">
                        {(["active", "rate_limited", "invalid", "disabled"] as const).map((status) => {
                          const count = providerKeys.filter((key) => key.status === status).length;
                          if (!count) return null;
                          const style = KEY_STATUS_STYLES[status];
                          return (
                            <span key={status} className="flex items-center gap-1 text-[10px] text-text-muted">
                              <span className={`size-1.5 rounded-full ${style.dot}`} />
                              {count} {style.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-col divide-y divide-border">
                      {[...providerKeys].sort((a, b) => a.priority - b.priority).map((key) => {
                        const style = KEY_STATUS_STYLES[key.status];
                        return (
                          <div key={key.id} className="flex items-center gap-3 px-4 py-2.5">
                            <span className="w-4 shrink-0 text-[10px] font-mono text-text-muted">#{key.priority}</span>
                            <span className={`size-2 shrink-0 rounded-full ${style.dot}`} />
                            <span className="flex-1 truncate text-sm font-medium text-text-main">{key.name}</span>
                            <span className="text-xs text-text-muted">{style.label}</span>
                            {key.status === "rate_limited" && <CooldownTimer ms={key.cooldownRemainingMs} />}
                            {(key.status === "rate_limited" || key.status === "invalid") && (
                              <button
                                onClick={() => handleResetKey(key.id)}
                                className="shrink-0 text-[10px] text-primary hover:underline"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
