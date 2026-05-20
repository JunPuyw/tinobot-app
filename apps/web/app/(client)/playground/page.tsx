"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());

type Message = { role: "user" | "assistant"; content: string; _gateway?: any };

type AttemptStatus = "success" | "rate_limited" | "invalid_key" | "server_error" | "network_error";

type RouteAttempt = {
  connectionName: string; provider: string; modelUsed: string;
  status: AttemptStatus; httpStatus?: number; errorMessage?: string; durationMs: number;
};

type RouterLogEntry = {
  id: string; requestedModel: string; usedModel: string;
  success: boolean; rotatedKey: boolean; rotatedProvider: boolean;
  totalAttempts: number; attempts: RouteAttempt[];
  timestamp: string; totalDurationMs: number;
};

type KeyStatus = {
  id: string; name: string; provider: string; priority: number;
  status: "active" | "rate_limited" | "invalid" | "disabled";
  cooldownRemainingMs: number;
};

const ATTEMPT_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  success:       { bg: "bg-green-500/10",  text: "text-green-400",  icon: "check_circle" },
  rate_limited:  { bg: "bg-yellow-500/10", text: "text-yellow-400", icon: "timer" },
  invalid_key:   { bg: "bg-red-500/10",    text: "text-red-400",    icon: "key_off" },
  server_error:  { bg: "bg-red-500/10",    text: "text-red-400",    icon: "error" },
  network_error: { bg: "bg-orange-500/10", text: "text-orange-400", icon: "wifi_off" },
};

const KEY_STATUS_STYLES: Record<string, { dot: string; label: string }> = {
  active:       { dot: "bg-green-400",  label: "Active" },
  rate_limited: { dot: "bg-yellow-400 animate-pulse", label: "Rate Limited" },
  invalid:      { dot: "bg-red-400",    label: "Invalid" },
  disabled:     { dot: "bg-gray-500",   label: "Disabled" },
};

function CooldownTimer({ ms }: { ms: number }) {
  const [remaining, setRemaining] = useState(ms);
  useEffect(() => {
    if (remaining <= 0) return;
    const t = setInterval(() => setRemaining(r => Math.max(0, r - 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  if (remaining <= 0) return <span className="text-green-400 text-[10px]">Ready</span>;
  return <span className="text-yellow-400 text-[10px]">{Math.ceil(remaining / 1000)}s</span>;
}

export default function PlaygroundPage() {
  const { activeWorkspace } = useWorkspace();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Chào bạn! Chọn model và gửi tin nhắn để test **Smart Key Router**.\n\nRouter sẽ tự động xoay key khi bị rate-limit, không làm gián đoạn trải nghiệm của bạn." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("openai/gpt-4o-mini");
  const [systemPrompt, setSystemPrompt] = useState("You are a helpful assistant.");
  const [routerLog, setRouterLog] = useState<RouterLogEntry[]>([]);
  const [keyStatuses, setKeyStatuses] = useState<KeyStatus[]>([]);
  const [activeTab, setActiveTab] = useState<"chat" | "log" | "keys">("chat");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: keysData } = useSWR<{ keys: any[] }>(
    activeWorkspace ? `/api/auth/user/keys` : null, fetcher, { refreshInterval: 0 }
  );
  const keys = keysData?.keys || [];

  const { data: modelsData } = useSWR("/api/models", fetcher);
  const modelOptions = Object.keys(modelsData?.models || {});

  useEffect(() => {
    if (keys.length > 0 && !selectedKey) setSelectedKey(keys[0].key);
  }, [keys, selectedKey]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const refreshLog = useCallback(async () => {
    const [logRes, statusRes] = await Promise.all([
      fetch("/api/router/log"),
      fetch("/api/router/keys/status"),
    ]);
    const logData = await logRes.json();
    const statusData = await statusRes.json();
    setRouterLog(logData.log || []);
    setKeyStatuses(statusData.statuses || []);
  }, []);

  // Poll key statuses every 5s so cooldown timers stay accurate
  useEffect(() => {
    refreshLog();
    const interval = setInterval(refreshLog, 5000);
    return () => clearInterval(interval);
  }, [refreshLog]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading || !selectedKey) return;

    const userMsg: Message = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${selectedKey}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: "system", content: systemPrompt }, ...newMessages],
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const assistantMsg: Message = {
          role: "assistant",
          content: data.choices?.[0]?.message?.content || "(no content)",
          _gateway: data._gateway,
        };
        setMessages([...newMessages, assistantMsg]);
      } else {
        const errMsg = data.error?.message || "Unknown error";
        const attempts: RouteAttempt[] = data.error?.attempts || [];
        const auditLines = attempts.map(a =>
          `• [${a.provider}] ${a.connectionName} → ${a.status}${a.errorMessage ? `: ${a.errorMessage}` : ""}`
        ).join("\n");
        setMessages([...newMessages, {
          role: "assistant",
          content: `❌ **Gateway Error:** ${errMsg}${auditLines ? `\n\n**Attempted:**\n${auditLines}` : ""}`
        }]);
      }
    } catch (err: any) {
      setMessages([...newMessages, { role: "assistant", content: `❌ Network error: ${err.message}` }]);
    } finally {
      setLoading(false);
      await refreshLog();
    }
  };

  const handleResetKey = async (keyId: string) => {
    await fetch(`/api/router/keys/${keyId}/reset`, { method: "POST" });
    await refreshLog();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-main">API Playground</h1>
          <p className="text-sm text-text-muted mt-1">
            Smart Key Router — tự động xoay key/provider, không gián đoạn người dùng.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
            <span className="size-1.5 rounded-full bg-green-400 animate-pulse" />
            Gateway Live
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        {/* Sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto">
          <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Configuration</p>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">System API Key</label>
              <select value={selectedKey} onChange={e => setSelectedKey(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs outline-none focus:ring-2 focus:ring-primary/50">
                {keys.length === 0 && <option value="">No keys</option>}
                {keys.map((k: any) => <option key={k.id} value={k.key}>{k.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Model</label>
              <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs outline-none focus:ring-2 focus:ring-primary/50">
                {modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">System Prompt</label>
              <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} rows={3}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
            </div>

            <button onClick={() => setMessages([{ role: "assistant", content: "Chat cleared." }])}
              className="flex items-center justify-center gap-1.5 rounded-xl h-8 px-3 text-xs border border-border hover:bg-surface transition-colors">
              <span className="material-symbols-outlined text-[14px]">delete</span> Clear Chat
            </button>
          </div>

          {/* Flow explanation */}
          <div className="rounded-2xl border border-border bg-card/50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Routing Flow</p>
            <div className="flex flex-col gap-1 text-[11px] text-text-muted">
              {[
                ["route", "Client → /v1/chat (System Key)"],
                ["hub", "Gateway validates & routes"],
                ["key", "Provider A → Key 1"],
                ["cached", "429 → Key 2 → Key N"],
                ["swap_horiz", "Exhausted → Provider B"],
                ["check_circle", "Success → Response"],
              ].map(([icon, text]) => (
                <div key={icon} className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[13px] text-primary mt-0.5 shrink-0">{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main panel */}
        <div className="lg:col-span-3 flex flex-col rounded-2xl border border-border bg-card overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-border shrink-0">
            {([
              { id: "chat", label: "💬 Chat" },
              { id: "log", label: "🔁 Router Log", badge: routerLog.length },
              { id: "keys", label: "🔑 Key Status", badge: keyStatuses.filter(k => k.status !== "active").length },
            ] as const).map(tab => (
              <button key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:text-text-main"
                }`}>
                {tab.label}
                {!!tab.badge && (
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] bg-primary text-white">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Chat tab */}
          {activeTab === "chat" && (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 custom-scrollbar">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary text-white rounded-tr-none"
                        : "bg-muted/50 text-text-main rounded-tl-none border border-border/50"
                    }`}>
                      {msg.content}
                      {msg._gateway && (
                        <div className="mt-2 pt-2 border-t border-border/40 text-[10px] text-text-muted flex gap-3 flex-wrap">
                          <span>Provider: <b>{msg._gateway.provider}</b></span>
                          <span>Key: <b>{msg._gateway.connectionName}</b></span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-muted/50 rounded-2xl rounded-tl-none border border-border/50 px-4 py-3 flex gap-1 items-center">
                      {[0, 200, 400].map(d => (
                        <div key={d} className="size-1.5 bg-primary/40 rounded-full animate-bounce"
                          style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-border bg-card/50 shrink-0">
                <form onSubmit={handleSend} className="flex gap-3">
                  <input value={input} onChange={e => setInput(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                    disabled={loading} />
                  <button type="submit"
                    disabled={!input.trim() || !selectedKey || loading}
                    className="inline-flex items-center justify-center rounded-xl bg-primary text-white h-10 px-5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors">
                    {loading
                      ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      : <span className="material-symbols-outlined text-[18px]">send</span>}
                  </button>
                </form>
              </div>
            </>
          )}

          {/* Router Log tab */}
          {activeTab === "log" && (
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
              {routerLog.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-text-muted gap-2">
                  <span className="material-symbols-outlined text-4xl opacity-30">route</span>
                  <p className="text-sm">Chưa có request. Gửi tin nhắn trong tab Chat.</p>
                </div>
              ) : routerLog.map(entry => (
                <div key={entry.id} className={`rounded-xl border p-4 flex flex-col gap-2 text-sm ${
                  entry.success ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"
                }`}>
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        entry.success ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                      }`}>{entry.success ? "✅ SUCCESS" : "❌ FAILED"}</span>
                      {entry.rotatedKey && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">🔑 Key rotated</span>}
                      {entry.rotatedProvider && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">🔀 Provider rotated</span>}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-text-muted">
                      <span>{entry.totalDurationMs}ms total</span>
                      <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  {/* Model info */}
                  <div className="flex gap-4 text-xs text-text-muted flex-wrap">
                    <span>Requested: <code className="text-text-main bg-surface px-1 rounded">{entry.requestedModel}</code></span>
                    {entry.usedModel !== entry.requestedModel && (
                      <span>Used: <code className="text-primary bg-primary/10 px-1 rounded">{entry.usedModel}</code></span>
                    )}
                    <span className="text-text-muted">{entry.totalAttempts} attempt(s)</span>
                  </div>

                  {/* Attempt chain */}
                  {entry.attempts.length > 0 && (
                    <div className="flex flex-col gap-1 mt-1">
                      {entry.attempts.map((a, i) => {
                        const style = ATTEMPT_STYLES[a.status] || ATTEMPT_STYLES.server_error;
                        return (
                          <div key={i} className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg ${style.bg}`}>
                            <span className={`material-symbols-outlined text-[14px] shrink-0 ${style.text}`}>{style.icon}</span>
                            <span className={`font-mono font-bold w-24 shrink-0 ${style.text}`}>{a.status}</span>
                            <span className="font-medium text-text-main">{a.connectionName}</span>
                            <span className="text-text-muted">({a.provider})</span>
                            <span className="ml-auto text-text-muted shrink-0">{a.durationMs}ms</span>
                            {a.errorMessage && (
                              <span className="text-[10px] text-text-muted truncate max-w-[180px]" title={a.errorMessage}>
                                {a.errorMessage}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Key Status tab */}
          {activeTab === "keys" && (
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
              {keyStatuses.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-text-muted gap-2">
                  <span className="material-symbols-outlined text-4xl opacity-30">key</span>
                  <p className="text-sm">Chưa có provider key nào. Vào Providers để thêm key.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-text-muted">{keyStatuses.length} key(s) configured — auto-refreshes every 5s</p>
                    <button onClick={refreshLog}
                      className="flex items-center gap-1 text-xs text-text-muted hover:text-text-main transition-colors">
                      <span className="material-symbols-outlined text-[14px]">refresh</span> Refresh
                    </button>
                  </div>

                  {/* Group by provider */}
                  {Object.entries(
                    keyStatuses.reduce((acc: Record<string, KeyStatus[]>, k) => {
                      (acc[k.provider] ??= []).push(k);
                      return acc;
                    }, {})
                  ).map(([provider, keys]) => (
                    <div key={provider} className="rounded-xl border border-border bg-card/50 overflow-hidden">
                      <div className="px-4 py-2 bg-surface/50 border-b border-border flex items-center gap-2">
                        <span className="text-xs font-bold text-text-main uppercase">{provider}</span>
                        <span className="text-[10px] text-text-muted">{keys.length} key(s)</span>
                        <div className="ml-auto flex gap-1">
                          {["active", "rate_limited", "invalid", "disabled"].map(s => {
                            const count = keys.filter(k => k.status === s).length;
                            if (!count) return null;
                            const style = KEY_STATUS_STYLES[s];
                            return (
                              <span key={s} className="flex items-center gap-1 text-[10px] text-text-muted">
                                <span className={`size-1.5 rounded-full ${style.dot}`} />
                                {count} {style.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex flex-col divide-y divide-border">
                        {keys.sort((a, b) => a.priority - b.priority).map(key => {
                          const style = KEY_STATUS_STYLES[key.status];
                          return (
                            <div key={key.id} className="flex items-center gap-3 px-4 py-2.5">
                              <span className="text-[10px] font-mono text-text-muted w-4 shrink-0">#{key.priority}</span>
                              <span className={`size-2 rounded-full shrink-0 ${style.dot}`} />
                              <span className="text-sm font-medium text-text-main flex-1 truncate">{key.name}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                key.status === "active" ? "bg-green-500/10 text-green-400" :
                                key.status === "rate_limited" ? "bg-yellow-500/10 text-yellow-400" :
                                "bg-red-500/10 text-red-400"
                              }`}>{style.label}</span>
                              {key.status === "rate_limited" && (
                                <CooldownTimer ms={key.cooldownRemainingMs} />
                              )}
                              {(key.status === "rate_limited" || key.status === "invalid") && (
                                <button
                                  onClick={() => handleResetKey(key.id)}
                                  className="text-[10px] text-primary hover:underline shrink-0">
                                  Reset
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
