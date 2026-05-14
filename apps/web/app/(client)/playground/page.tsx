"use client";

import { useState, useEffect, useRef } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
const Card = ({ children, className, title }: any) => (
  <div className={`rounded-2xl border border-border bg-card shadow-sm ${className || ""}`}>
    {title && (
      <div className="flex flex-col gap-1.5 p-6 pb-0">
        <h3 className="font-semibold leading-none tracking-tight">{title}</h3>
      </div>
    )}
    <div className={title ? "p-6 pt-4" : "p-6"}>{children}</div>
  </div>
);

const Button = ({ children, className, variant = "primary", size = "md", loading, fullWidth, disabled, icon, ...props }: any) => {
  const baseStyle = "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    primary: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
    secondary: "border border-border bg-transparent shadow-sm hover:bg-surface",
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

const Badge = ({ children, className, variant = "primary" }: any) => {
  const variants = {
    primary: "bg-primary/10 text-primary",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variants[variant as keyof typeof variants] || variants.primary} ${className || ""}`}>
      {children}
    </span>
  );
};
import useSWR from "swr";
const useWorkspaceSWR = <T,>(url: string | null) => {
  const { activeWorkspace } = useWorkspace();
  const fetcher = (u: string) => fetch(u, { headers: { "X-Workspace-Id": activeWorkspace?.id || "" } }).then(r => r.json());
  const { data, error, isLoading, mutate } = useSWR<T>(url && activeWorkspace ? url : null, fetcher);
  return { data, error, isLoading, mutate };
};
import { translate } from "@/i18n/runtime";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

export default function PlaygroundPage() {
  const { activeWorkspace } = useWorkspace();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Chào bạn! Tôi là API Playground. Hãy chọn API Key và Model để bắt đầu test nhé." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("openai/gpt-4o-mini");
  const [systemPrompt, setSystemPrompt] = useState("You are a helpful assistant.");
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch API Keys for this workspace
  const { data: keysData } = useWorkspaceSWR<{ keys: any[] }>("/api/auth/user/keys");
  const keys = keysData?.keys || [];

  // Fetch Models
  const { data: modelsData } = useSWR("/api/models", (url: string) => fetch(url).then(r => r.json()));
  const models = modelsData?.models || {};
  const modelOptions = Object.keys(models).map(m => ({ value: m, label: m }));

  useEffect(() => {
    if (keys.length > 0 && !selectedKey) {
      setSelectedKey(keys[0].key);
    }
  }, [keys, selectedKey]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading || !selectedKey) return;

    const userMsg: Message = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const chatMessages = [
        { role: "system", content: systemPrompt },
        ...newMessages
      ];

      const res = await fetch("/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${selectedKey}`
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: chatMessages,
          stream: false // Start with non-stream for simplicity
        })
      });

      const data = await res.json();
      
      if (res.ok) {
        const assistantMsg = data.choices?.[0]?.message;
        if (assistantMsg) {
          setMessages([...newMessages, assistantMsg]);
        }
      } else {
        setMessages([...newMessages, { role: "assistant", content: `Error: ${data.error?.message || data.error || "Unknown error"}` }]);
      }
    } catch (error: any) {
      setMessages([...newMessages, { role: "assistant", content: `Error: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-main">API Playground</h1>
          <p className="text-sm text-text-muted mt-1">Thử nghiệm các API Key và Model trực tiếp trên giao diện.</p>
        </div>
        <Badge variant="primary" className="bg-primary/10 text-primary border-primary/20">v1/chat/completions</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        {/* Sidebar Controls */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <Card className="p-4 flex flex-col gap-4" title="Configuration">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Select API Key</label>
              <select 
                value={selectedKey} 
                onChange={(e: any) => setSelectedKey(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:ring-2 focus:ring-primary/50 outline-none"
              >
                {keys.length === 0 && <option value="">No keys available</option>}
                {keys.map((k: any) => (
                  <option key={k.id} value={k.key}>{k.name} ({k.key.slice(0, 8)}...)</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Select Model</label>
              <select 
                value={selectedModel} 
                onChange={(e: any) => setSelectedModel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:ring-2 focus:ring-primary/50 outline-none"
              >
                {modelOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">System Prompt</label>
              <textarea 
                value={systemPrompt}
                onChange={(e: any) => setSystemPrompt(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:ring-2 focus:ring-primary/50 outline-none resize-none"
              />
            </div>

            <Button 
              variant="secondary" 
              icon="delete" 
              onClick={() => setMessages([{ role: "assistant", content: "Chat cleared." }])}
              fullWidth
              size="sm"
            >
              Clear Chat
            </Button>
          </Card>
        </div>

        {/* Chat Interface */}
        <Card className="lg:col-span-3 flex flex-col overflow-hidden p-0 relative">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar"
          >
            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-primary text-white rounded-tr-none' 
                    : 'bg-muted/50 text-text-main rounded-tl-none border border-border/50'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted/50 text-text-main rounded-2xl rounded-tl-none border border-border/50 px-4 py-3 text-sm shadow-sm flex gap-1 items-center">
                  <div className="size-1.5 bg-primary/40 rounded-full animate-bounce" />
                  <div className="size-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="size-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-border bg-card/50 backdrop-blur-md">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <input 
                value={input}
                onChange={(e: any) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                disabled={loading}
              />
              <Button 
                type="submit" 
                variant="primary" 
                icon="send" 
                loading={loading}
                disabled={!input.trim() || !selectedKey}
              >
                Send
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
