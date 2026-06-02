"use client";

import { useEffect, useState } from "react";
const Card = ({ children, className, padding }: any) => (
  <div className={`rounded-2xl border bg-card shadow-sm ${className || "border-border"} ${padding === "xs" ? "p-3" : padding === "md" ? "p-6" : padding === "none" ? "" : "p-6"}`}>
    {children}
  </div>
);

const CardSkeleton = () => (
  <div className="rounded-2xl border border-border bg-card p-6 animate-pulse">
    <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
    <div className="h-4 bg-muted rounded w-full mb-2"></div>
    <div className="h-4 bg-muted rounded w-2/3"></div>
  </div>
);

const Badge = ({ children, className, variant = "primary" }: any) => {
  const variants = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-500",
    error: "bg-red-500/10 text-red-500",
    default: "bg-surface text-text-muted",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${variants[variant as keyof typeof variants] || variants.primary} ${className || ""}`}>
      {children}
    </span>
  );
};

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

const Input = ({ className, label, error, ...props }: any) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-semibold text-text-muted">{label}</label>}
    <input className={`flex h-10 w-full rounded-xl border bg-transparent px-3 py-2 text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${error ? "border-red-500" : "border-border"} ${className || ""}`} {...props} />
    {error && <span className="text-[10px] text-red-500">{error}</span>}
  </div>
);

const Modal = ({ isOpen, onClose, title, children }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in p-4">
      <div className={`bg-card rounded-2xl w-full max-w-lg shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 flex flex-col`}>
        <div className="flex justify-between items-center p-4 border-b border-border shrink-0">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-surface text-text-muted transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

const useCopyToClipboard = () => {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };
  return { copied, copy };
};

const fetcher = (url: string) => fetch(url).then(async (response) => {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
});

const useApiSWR = <T,>(url: string | null) => {
  const { data, error, isLoading, mutate } = useSWR<T>(url, fetcher);
  return { data, error, isLoading, mutate };
};

const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(" ");

import useSWR from "swr";

function ModelSelectModal({ isOpen, onClose, onSelect, selectedModels = [], title }: any) {
  const [query, setQuery] = useState("");
  const { data, isLoading } = useApiSWR<{ data?: any[] }>("/api/models");
  const models = (data?.data || [])
    .map((model: any) => ({
      ...model,
      value: model.model.startsWith(`${model.provider}/`) ? model.model : `${model.provider}/${model.model}`,
    }))
    .filter((model: any) => {
      const normalizedQuery = query.trim().toLowerCase();
      return !normalizedQuery || `${model.name} ${model.value} ${model.provider}`.toLowerCase().includes(normalizedQuery);
    });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col gap-4">
        <Input
          value={query}
          onChange={(event: any) => setQuery(event.target.value)}
          placeholder="Search models..."
        />
        <div className="max-h-80 overflow-y-auto flex flex-col gap-2">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-text-muted">Loading models...</p>
          ) : models.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">No matching models found.</p>
          ) : models.map((model: any) => {
            const selected = selectedModels.includes(model.value);
            return (
              <button
                key={model.value}
                type="button"
                disabled={selected}
                onClick={() => {
                  onSelect(model);
                  onClose();
                }}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-left hover:border-primary/50 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-text-main">{model.name}</span>
                  <code className="block truncate text-xs text-text-muted">{model.value}</code>
                </span>
                <Badge variant={selected ? "success" : "default"}>{selected ? "Added" : model.provider}</Badge>
              </button>
            );
          })}
        </div>
        <Button variant="secondary" onClick={onClose} fullWidth>Close</Button>
      </div>
    </Modal>
  );
}

// Validate combo name: only a-z, A-Z, 0-9, -, _, .
const VALID_NAME_REGEX = /^[a-zA-Z0-9_.-]+$/;

export default function UserCombosPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCombo, setEditingCombo] = useState<any>(null);
  const { copied, copy } = useCopyToClipboard();
  const { data: combosData, isLoading: combosLoading, mutate: mutateCombos } =
    useApiSWR<{ combos: any[] }>("/api/auth/user/combos");

  const combos = combosData?.combos || [];
  const loading = combosLoading;

  const handleCreate = async (data: any) => {
    try {
      const res = await fetch("/api/auth/user/combos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await mutateCombos();
        setShowCreateModal(false);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create combo");
      }
    } catch (error) {
      console.log("Error creating combo:", error);
    }
  };

  const handleUpdate = async (id: string, data: any) => {
    try {
      const res = await fetch(`/api/auth/user/combos/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await mutateCombos();
        setEditingCombo(null);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update combo");
      }
    } catch (error) {
      console.log("Error updating combo:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this combo?")) return;
    try {
      const res = await fetch(`/api/auth/user/combos/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        mutateCombos({ combos: combos.filter((c: any) => c.id !== id) }, false);
      }
    } catch (error) {
      console.log("Error deleting combo:", error);
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-main tracking-tight">Model Combos</h1>
          <p className="text-sm text-text-muted mt-2">
            Manage reusable fallback chains for your API models.
          </p>
        </div>
        <Button variant="primary" icon="add" onClick={() => setShowCreateModal(true)}>
          Create Combo
        </Button>
      </div>

      {/* Combos List */}
      {loading ? (
        <div className="flex flex-col gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : combos.length === 0 ? (
        <Card className="border-2 border-dashed border-border/50 bg-bg/30">
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 text-primary mb-6 shadow-inner">
              <span className="material-symbols-outlined text-[40px]">layers</span>
            </div>
            <p className="text-xl font-bold text-text-main mb-2">No combos yet</p>
            <p className="text-sm text-text-muted mb-8 max-w-sm mx-auto">
              Combine multiple models into a single virtual endpoint with automatic fallback.
            </p>
            <Button variant="primary" icon="add" onClick={() => setShowCreateModal(true)}>
              Initialize First Combo
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {combos.map((combo: any) => (
            <ComboCard
              key={combo.id}
              combo={combo}
              copied={copied}
              onCopy={copy}
              onEdit={() => setEditingCombo(combo)}
              onDelete={() => handleDelete(combo.id)}
            />
          ))}
        </div>
      )}

      {/* Forms */}
      <ComboFormModal
        isOpen={showCreateModal}
        combo={null}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreate}
      />

      <ComboFormModal
        isOpen={!!editingCombo}
        combo={editingCombo}
        onClose={() => setEditingCombo(null)}
        onSave={(data: any) => editingCombo && handleUpdate(editingCombo.id, data)}
      />
    </div>
  );
}

function ComboCard({ combo, copied, onCopy, onEdit, onDelete }: any) {
  return (
    <Card padding="md" className="group border border-border/50 hover:border-primary/40 hover:bg-primary/[0.01] transition-all relative overflow-hidden shadow-sm hover:shadow-md">
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-5 flex-1 min-w-0">
          <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[24px]">layers</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <code className="text-base font-bold font-mono text-text-main truncate">{combo.name}</code>
              <Badge variant="default" className="text-[10px] uppercase tracking-tighter py-0">Combo</Badge>
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {combo.models.length === 0 ? (
                <span className="text-xs text-text-muted italic">No fallback models defined</span>
              ) : (
                combo.models.map((model: any, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-surface/50 px-2.5 py-1 rounded-lg border border-border shadow-xs">
                      <span className="text-[10px] font-bold text-text-muted">{index + 1}</span>
                      <code className="text-xs font-mono text-text-main">
                        {model}
                      </code>
                    </div>
                    {index < combo.models.length - 1 && (
                      <span className="material-symbols-outlined text-[16px] text-text-muted opacity-50">arrow_forward</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 shrink-0 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onCopy(combo.name, `combo-${combo.id}`)}
            className="flex flex-col items-center p-2 rounded-xl hover:bg-primary/10 text-text-muted hover:text-primary transition-all"
            title="Copy combo name"
          >
            <span className="material-symbols-outlined text-[20px]">
              {copied === `combo-${combo.id}` ? "check" : "content_copy"}
            </span>
            <span className="text-[9px] font-bold uppercase mt-0.5">Copy</span>
          </button>
          <button
            onClick={onEdit}
            className="flex flex-col items-center p-2 rounded-xl hover:bg-primary/10 text-text-muted hover:text-primary transition-all"
            title="Edit"
          >
            <span className="material-symbols-outlined text-[20px]">edit</span>
            <span className="text-[9px] font-bold uppercase mt-0.5">Edit</span>
          </button>
          <button
            onClick={onDelete}
            className="flex flex-col items-center p-2 rounded-xl hover:bg-red-500/10 text-text-muted hover:text-red-500 transition-all font-bold"
            title="Delete"
          >
            <span className="material-symbols-outlined text-[20px]">delete</span>
            <span className="text-[9px] uppercase mt-0.5">Del</span>
          </button>
        </div>
      </div>
    </Card>
  );
}

function ModelItem({ index, model, isFirst, isLast, onEdit, onMoveUp, onMoveDown, onRemove }: any) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(model);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== model) onEdit(trimmed);
    else setDraft(model);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") { setDraft(model); setEditing(false); }
  };

  return (
    <div className="group flex items-center gap-3 px-3 py-2 rounded-xl bg-surface/30 hover:bg-surface border border-border transition-all">
      <span className="text-xs font-bold text-text-muted w-4 text-center shrink-0">{index + 1}</span>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 px-2 py-1 text-xs font-mono bg-bg border border-primary/50 rounded-lg outline-none text-text-main shadow-inner"
        />
      ) : (
        <div
          className="flex-1 min-w-0 px-2 py-1 text-xs font-mono text-text-main truncate cursor-text hover:bg-primary/5 rounded-lg transition-colors"
          onClick={() => setEditing(true)}
        >
          {model}
        </div>
      )}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onMoveUp} disabled={isFirst} className={cn("p-1.5 rounded-lg transition-all", isFirst ? "text-text-muted/20" : "text-text-muted hover:text-primary hover:bg-primary/10")}>
          <span className="material-symbols-outlined text-[18px]">expand_less</span>
        </button>
        <button onClick={onMoveDown} disabled={isLast} className={cn("p-1.5 rounded-lg transition-all", isLast ? "text-text-muted/20" : "text-text-muted hover:text-primary hover:bg-primary/10")}>
          <span className="material-symbols-outlined text-[18px]">expand_more</span>
        </button>
        <button onClick={onRemove} className="p-1.5 hover:bg-red-500/10 rounded-lg text-text-muted hover:text-red-500 transition-all">
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>
    </div>
  );
}

function ComboFormModal({ isOpen, combo, onClose, onSave }: any) {
  const [name, setName] = useState(combo?.name || "");
  const [models, setModels] = useState(combo?.models || []);
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        setName(combo?.name || "");
        setModels(combo?.models || []);
      }, 0);
    }
  }, [isOpen, combo]);

  const validateName = (value: string) => {
    if (!value.trim()) { setNameError("Name is required"); return false; }
    if (!VALID_NAME_REGEX.test(value)) { setNameError("Only a-z, 0-9, -, _, . allowed"); return false; }
    setNameError(""); return true;
  };

  const handleSave = async () => {
    if (!validateName(name)) return;
    setSaving(true);
    await onSave({ name: name.trim(), models });
    setSaving(false);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={combo ? `Edit Combo` : `Create Combo`}>
        <div className="flex flex-col gap-6 pt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted ml-1">Combo Name (Used as &apos;model&apos; in API)</label>
            <Input value={name} onChange={(e: any) => setName(e.target.value)} placeholder="e.g. gpt-4-fallback" error={nameError} />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted ml-1 mb-2 block">Fallback Priority List</label>
            <div className="flex flex-col gap-2 min-h-[50px]">
              {models.map((model: any, index: number) => (
                <ModelItem
                  key={index} index={index} model={model} isFirst={index === 0} isLast={index === models.length - 1}
                  onEdit={(v: any) => { const m = [...models]; m[index] = v; setModels(m); }}
                  onMoveUp={() => { if (index === 0) return; const m = [...models];[m[index - 1], m[index]] = [m[index], m[index - 1]]; setModels(m); }}
                  onMoveDown={() => { if (index === models.length - 1) return; const m = [...models];[m[index], m[index + 1]] = [m[index + 1], m[index]]; setModels(m); }}
                  onRemove={() => setModels(models.filter((_: any, i: number) => i !== index))}
                />
              ))}
              {models.length === 0 && (
                <div className="py-4 text-center text-xs text-text-muted italic border-border/50 border rounded-xl">
                  Add at least one model to start
                </div>
              )}
            </div>
            <button onClick={() => setShowModelSelect(true)} className="w-full mt-4 py-3 border border-dashed border-primary/30 rounded-xl text-xs font-bold text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 group">
              <span className="material-symbols-outlined text-[20px] group-hover:scale-125 transition-transform">add_circle</span> Add Model to Chain
            </button>
          </div>

          <div className="flex gap-3 pt-4 border-t border-border/50">
            <Button onClick={onClose} variant="secondary" fullWidth>Cancel</Button>
            <Button onClick={handleSave} variant="primary" fullWidth disabled={saving || !name.trim() || models.length === 0}>
              {saving ? "Saving..." : combo ? "Update Combo" : "Create Combo"}
            </Button>
          </div>
        </div>
      </Modal>

      <ModelSelectModal
        isOpen={showModelSelect}
        onClose={() => setShowModelSelect(false)}
        onSelect={(m: any) => { if (!models.includes(m.value)) setModels([...models, m.value]); }}
        selectedModels={models}
        title="Add Model to Fallback"
      />
    </>
  );
}
