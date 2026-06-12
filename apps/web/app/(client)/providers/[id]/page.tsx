"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import PropTypes from "prop-types";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
const Card = ({ children, className, title, subtitle, padding }: any) => (
  <div className={`rounded-2xl border bg-card shadow-sm ${className || "border-border"} flex flex-col h-full`}>
    {(title || subtitle) && (
      <div className="flex flex-col gap-1.5 p-6 pb-0">
        {title && <h3 className="font-semibold leading-none tracking-tight">{title}</h3>}
        {subtitle && <p className="text-sm text-text-muted">{subtitle}</p>}
      </div>
    )}
    <div className={`flex-1 ${padding === "xs" ? "p-3" : padding === "none" ? "" : title || subtitle ? "p-6 pt-4" : className && !className.includes("p-") ? "p-6" : ""}`}>{children}</div>
  </div>
);

const CardSkeleton = () => (
  <div className="rounded-2xl border border-border bg-card p-6 animate-pulse">
    <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
    <div className="h-4 bg-muted rounded w-full mb-2"></div>
    <div className="h-4 bg-muted rounded w-2/3"></div>
  </div>
);

const Badge = ({ children, className, variant = "primary", size = "md", dot }: any) => {
  const variants = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-500",
    error: "bg-red-500/10 text-red-500",
    default: "bg-surface text-text-muted",
    info: "bg-blue-500/10 text-blue-500",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variants[variant as keyof typeof variants] || variants.primary} ${className || ""}`}>
      {dot && <span className={`mr-1.5 size-1.5 rounded-full ${variant === "success" ? "bg-emerald-500" : "bg-red-500"}`}></span>}
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

const Select = ({ className, label, options, ...props }: any) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-semibold text-text-muted">{label}</label>}
    <select className={`flex h-10 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${className || ""}`} {...props}>
      {options?.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

const Toggle = ({ checked, onChange, title }: any) => (
  <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} title={title} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${checked ? "bg-primary" : "bg-border/50"}`}>
    <span className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
  </button>
);

const Modal = ({ isOpen, onClose, title, children, size }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in p-4">
      <div className={`bg-card rounded-2xl w-full ${size === "full" ? "max-w-5xl h-[90vh]" : "max-w-lg"} shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 flex flex-col`}>
        <div className="flex justify-between items-center p-4 border-b border-border shrink-0">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-surface text-text-muted transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

const OAuthModal = ({ isOpen, onClose, onSuccess, providerId }: any) => isOpen ? (
  <Modal isOpen={isOpen} onClose={onClose} title="OAuth">
    <div className="p-4 flex flex-col gap-4 text-center text-text-muted">
      <p>OAuth integration for {providerId}</p>
      <Button onClick={() => onSuccess({ name: `${providerId} OAuth`, apiKey: `mock_oauth_${Date.now()}` })} fullWidth>
        Simulate OAuth Authorize
      </Button>
    </div>
  </Modal>
) : null;
const KiroOAuthWrapper = ({ children }: any) => <>{children}</>;
const CursorAuthModal = ({ isOpen, onClose, onSuccess }: any) => isOpen ? <Modal isOpen={isOpen} onClose={onClose} title="Cursor Auth"><div className="p-4 text-center text-text-muted">Cursor Auth UI</div></Modal> : null;
const IFlowCookieModal = ({ isOpen, onClose, onSuccess }: any) => isOpen ? <Modal isOpen={isOpen} onClose={onClose} title="Cookie Auth"><div className="p-4 text-center text-text-muted">Cookie Auth UI</div></Modal> : null;
const GitLabAuthModal = ({ isOpen, onClose, onSuccess }: any) => isOpen ? <Modal isOpen={isOpen} onClose={onClose} title="GitLab Auth"><div className="p-4 text-center text-text-muted">GitLab Auth UI</div></Modal> : null;
// Constants are now fetched from API
const getProviderAlias = (id: string) => id;
const isOpenAICompatibleProvider = (id: string) => id === "openai-compatible";
const isAnthropicCompatibleProvider = (id: string) => id === "anthropic-compatible";
const getModelsByProviderId = (id: string): any[] => [];
const fetchSuggestedModels = async (fetcher: any) => [];
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
// import { fetchSuggestedModels } from "@/shared/utils/providerModelsFetcher";
import useProviderStore from "@/store/providerStore";
import { useWorkspace } from "@/context/WorkspaceContext";

export default function ProviderDetailPage() {
  const params = useParams() as { id: string; };
  const router = useRouter();
  const { activeWorkspace, user } = useWorkspace();
  const providerId = params.id;
  const { 
    connections: allConnections, 
    nodes: allNodes, 
    loading: storeLoading, 
    fetchIfStale, 
    refresh,
    setConnections: setAllConnections,
    setNodes: setAllNodes 
  } = useProviderStore();

  const connections = useMemo(() => allConnections.filter((c: any) => c.provider === providerId), [allConnections, providerId]);
  const providerNode = useMemo(() => allNodes.find((n: any) => n.id === providerId), [allNodes, providerId]);
  const [loading, setLoading] = useState(true);
  const [connectionsLoaded, setConnectionsLoaded] = useState(false);
  const [proxyPools, setProxyPools] = useState<any[]>([]);
  const [showOAuthModal, setShowOAuthModal] = useState(false);
  const [showIFlowCookieModal, setShowIFlowCookieModal] = useState(false);
  const [showAddApiKeyModal, setShowAddApiKeyModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditNodeModal, setShowEditNodeModal] = useState(false);
  const [showBulkProxyModal, setShowBulkProxyModal] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<any>(null);
  const [modelAliases, setModelAliases] = useState<Record<string, string>>({});
  const [headerImgError, setHeaderImgError] = useState(false);
  const [modelTestResults, setModelTestResults] = useState<Record<string, string>>({});
  const [modelsTestError, setModelsTestError] = useState("");
  const [testingModelId, setTestingModelId] = useState<string | null>(null);
  const [showAddCustomModel, setShowAddCustomModel] = useState(false);
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>([]);
  const [bulkProxyPoolId, setBulkProxyPoolId] = useState("__none__");
  const [bulkUpdatingProxy, setBulkUpdatingProxy] = useState(false);
  const [providerStrategy, setProviderStrategy] = useState<string | null>(null); // null = use global, "round-robin" = override
  const [providerStickyLimit, setProviderStickyLimit] = useState("");
  const [providerSettings, setProviderSettings] = useState<any>(null); // cached settings from fetchConnections
  const [suggestedModels, setSuggestedModels] = useState<any[]>([]);
  const [kiloFreeModels, setKiloFreeModels] = useState<any[]>([]);
  const { copied, copy } = useCopyToClipboard();

  const [providerConfigs, setProviderConfigs] = useState<any>({
    OAUTH_PROVIDERS: {},
    APIKEY_PROVIDERS: {},
    FREE_PROVIDERS: {},
    FREE_TIER_PROVIDERS: {}
  });

  const [configsLoaded, setConfigsLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/providers')
      .then(res => res.json())
      .then(data => {
        setProviderConfigs(data);
        setConfigsLoaded(true);
      })
      .catch(err => console.error("Failed to load providers config", err));
  }, []);

  useEffect(() => {
    if (configsLoaded && connectionsLoaded) {
      setLoading(false);
    }
  }, [configsLoaded, connectionsLoaded]);

  const { OAUTH_PROVIDERS, APIKEY_PROVIDERS, FREE_PROVIDERS, FREE_TIER_PROVIDERS, PROVIDER_MODELS } = providerConfigs;

  const providerInfo: any = providerNode
    ? {
      id: providerNode.id,
      name: providerNode.name || (providerNode.type === "anthropic-compatible" ? "Anthropic Compatible" : "OpenAI Compatible"),
      color: providerNode.type === "anthropic-compatible" ? "#D97757" : "#10A37F",
      textIcon: providerNode.type === "anthropic-compatible" ? "AC" : "OC",
      apiType: providerNode.apiType,
      baseUrl: providerNode.baseUrl,
      type: providerNode.type,
    }
    : (OAUTH_PROVIDERS?.[providerId] || APIKEY_PROVIDERS?.[providerId] || FREE_PROVIDERS?.[providerId] || FREE_TIER_PROVIDERS?.[providerId]);

  const isOAuth = !!OAUTH_PROVIDERS?.[providerId] || providerId === "kiro" || providerId === "iflow";
  const providerAlias = providerInfo?.alias || getProviderAlias(providerId);
  const models = (PROVIDER_MODELS && providerAlias) ? (PROVIDER_MODELS[providerAlias] || []) : [];

  const isOpenAICompatible = isOpenAICompatibleProvider(providerId);
  const isAnthropicCompatible = isAnthropicCompatibleProvider(providerId);
  const isCompatible = isOpenAICompatible || isAnthropicCompatible;

  const providerStorageAlias = isCompatible ? providerId : providerAlias;
  const providerDisplayAlias = isCompatible
    ? (providerNode?.prefix || providerId)
    : providerAlias;

  // Define callbacks BEFORE the useEffect that uses them
  const fetchAliasesLock = useRef(false);
  const fetchAliases = useCallback(async () => {
    if (fetchAliasesLock.current) return;
    fetchAliasesLock.current = true;
    try {
      const res = await fetch("/api/models/alias");
      const data: any = await res.json();
      if (res.ok) {
        setModelAliases(data.aliases || {});
      }
    } catch (error) {
      console.log("Error fetching aliases:", error);
    } finally {
      setTimeout(() => { fetchAliasesLock.current = false; }, 500);
    }
  }, []);

  // Fetch free models from Kilo API for kilocode provider
  useEffect(() => {
    if (providerId !== "kilocode") return;
    fetch("/api/auth/user/providers/kilo/free-models")
      .then((res: any) => res.json())
      .then((data: any) => { if (data.models?.length) setKiloFreeModels(data.models); })
      .catch(() => { });
  }, [providerId]);

  const fetchConnections = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      await fetchIfStale(activeWorkspace.id, true);
      
      // Still need proxy pools and settings locally or could move to store later
      const headers = { "X-Workspace-Id": activeWorkspace?.id || "" };
      const [proxyPoolsRes, settingsRes] = await Promise.all([
        fetch("/api/proxy-pools?isActive=true", { cache: "no-store" }),
        fetch("/api/settings", { cache: "no-store" }),
      ]);
      const proxyPoolsData = proxyPoolsRes.ok ? await proxyPoolsRes.json() : { proxyPools: [] };
      const settingsData = settingsRes.ok ? await settingsRes.json() : {};
      const isAdmin = (user as any)?.role === "admin";

      if (proxyPoolsRes.ok) {
        setProxyPools(proxyPoolsData.proxyPools || []);
      }

      if (isAdmin) {
        setProviderSettings(settingsData);
        const override = (settingsData.providerStrategies || {})[providerId] || {};
        setProviderStrategy(override.fallbackStrategy || null);
        setProviderStickyLimit(override.stickyRoundRobinLimit != null ? String(override.stickyRoundRobinLimit) : "1");
      }
    } catch (error) {
      console.log("Error fetching connections:", error);
    } finally {
      setConnectionsLoaded(true);
      setLoading(false);
    }
  }, [providerId, activeWorkspace?.id, configsLoaded, fetchIfStale, user]); 

  const handleUpdateNode = async (formData: any) => {
    try {
      const res = await fetch(`/api/provider-nodes/${providerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchIfStale(activeWorkspace?.id, true);
        setShowEditNodeModal(false);
      }
    } catch (error) {
      console.log("Error updating provider node:", error);
    }
  };

  const saveProviderStrategy = async (strategy: any, stickyLimit: any) => {
    try {
      const current = (providerSettings?.providerStrategies) || {};

      // Build override: null strategy means remove override, use global
      const override: any = {};
      if (strategy) override.fallbackStrategy = strategy;
      if (strategy === "round-robin" && stickyLimit !== "") {
        override.stickyRoundRobinLimit = Number(stickyLimit) || 3;
      }

      const updated = { ...current };
      if (Object.keys(override).length === 0) {
        delete updated[providerId];
      } else {
        updated[providerId] = override;
      }

      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerStrategies: updated }),
      });

      // Keep cached settings in sync so subsequent saves use the latest value
      setProviderSettings((prev: any) => ({
        ...(prev || {}),
        providerStrategies: updated,
      }));
    } catch (error) {
      console.log("Error saving provider strategy:", error);
    }
  };

  const handleRoundRobinToggle = (enabled: boolean) => {
    const strategy = enabled ? "round-robin" : null;
    const sticky = enabled ? (providerStickyLimit || "1") : providerStickyLimit;
    if (enabled && !providerStickyLimit) setProviderStickyLimit("1");
    setProviderStrategy(strategy);
    saveProviderStrategy(strategy, sticky);
  };

  const handleStickyLimitChange = (value: string) => {
    setProviderStickyLimit(value);
    saveProviderStrategy("round-robin", value);
  };

  useEffect(() => {
    fetchConnections();
    fetchAliases();
  }, [fetchConnections, fetchAliases]);

  // Fetch suggested models from provider's public API (if configured)
  useEffect(() => {
    const fetcher = (OAUTH_PROVIDERS[providerId] || APIKEY_PROVIDERS[providerId] || FREE_PROVIDERS[providerId] || FREE_TIER_PROVIDERS[providerId])?.modelsFetcher;
    if (!fetcher) return;
    fetchSuggestedModels(fetcher).then(setSuggestedModels);
  }, [providerId]);

  const handleSetAlias = async (modelId: string, alias: string, providerAliasOverride = providerAlias) => {
    const fullModel = `${providerAliasOverride}/${modelId}`;
    try {
      const res = await fetch("/api/models/alias", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Id": activeWorkspace?.id || ""
        },
        body: JSON.stringify({ model: fullModel, alias }),
      });
      if (res.ok) {
        await fetchAliases();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to set alias");
      }
    } catch (error) {
      console.log("Error setting alias:", error);
    }
  };

  const handleDeleteAlias = async (alias: string) => {
    try {
      const res = await fetch(`/api/models/alias?alias=${encodeURIComponent(alias)}`, {
        method: "DELETE",
        headers: { "X-Workspace-Id": activeWorkspace?.id || "" }
      });
      if (res.ok) {
        await fetchAliases();
      }
    } catch (error) {
      console.log("Error deleting alias:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!activeWorkspace) return;
    if (!confirm("Delete this connection?")) return;
    try {
      const res = await fetch(`/api/auth/user/providers/${id}`, {
        method: "DELETE",
        headers: { "X-Workspace-Id": activeWorkspace?.id || "" }
      });
      if (res.ok) {
        setAllConnections((prev: any[]) => prev.filter((c: any) => c.id !== id));
      }
    } catch (error) {
      console.log("Error deleting connection:", error);
    }
  };

  const handleResetHealth = async (id: string) => {
    if (!activeWorkspace) return;
    try {
      const res = await fetch(`/api/auth/user/providers/${id}/reset-health`, {
        method: "POST",
        headers: { "X-Workspace-Id": activeWorkspace?.id || "" }
      });
      if (res.ok) {
        await fetchConnections();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to reset health status");
      }
    } catch (error) {
      console.log("Error resetting health status:", error);
    }
  };

  const handleOAuthSuccess = () => {
    fetchConnections();
    setShowOAuthModal(false);
  };

  const handleIFlowCookieSuccess = () => {
    fetchConnections();
    setShowIFlowCookieModal(false);
  };

  const handleSaveApiKey = async (formData: any) => {
    if (!activeWorkspace) return;
    try {
      const authType = isOAuth ? "oauth" : "apikey";
      const res = await fetch("/api/auth/user/providers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Id": activeWorkspace?.id || ""
        },
        body: JSON.stringify({ provider: providerId, authType, ...formData }),
      });
      if (res.ok) {
        await fetchConnections();
        setShowAddApiKeyModal(false);
      }
    } catch (error) {
      console.log("Error saving connection:", error);
    }
  };

  const handleUpdateConnection = async (formData: any) => {
    if (!activeWorkspace) return;
    try {
      const res = await fetch(`/api/auth/user/providers/${selectedConnection!.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Id": activeWorkspace?.id || ""
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        await fetchConnections();
        setShowEditModal(false);
      }
    } catch (error) {
      console.log("Error updating connection:", error);
    }
  };

  const handleUpdateConnectionStatus = async (id: string, isActive: boolean) => {
    if (!activeWorkspace) return;
    try {
      const res = await fetch(`/api/auth/user/providers/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Id": activeWorkspace?.id || ""
        },
        body: JSON.stringify({ isActive }),
      });
      if (res.ok) {
        setAllConnections((prev: any[]) => prev.map((c: any) => c.id === id ? { ...c, isActive } : c));
      }
    } catch (error) {
      console.log("Error updating connection status:", error);
    }
  };

  const handleSwapPriority = async (index1: number, index2: number) => {
    const conn1 = connections[index1];
    const conn2 = connections[index2];
    if (!conn1 || !conn2) return;

    // Optimistic update state
    const newConnections = [...allConnections];
    const index1InAll = allConnections.findIndex((c: any) => c.id === conn1.id);
    const index2InAll = allConnections.findIndex((c: any) => c.id === conn2.id);
    
    if (index1InAll === -1 || index2InAll === -1) return;

    const tmp = newConnections[index1InAll];
    newConnections[index1InAll] = newConnections[index2InAll]!;
    newConnections[index2InAll] = tmp!;
    setAllConnections(newConnections);

    try {
      const headers = {
        "Content-Type": "application/json",
        "X-Workspace-Id": activeWorkspace?.id || ""
      };
      await Promise.all([
        fetch(`/api/auth/user/providers/${conn1.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ priority: index1 }),
        }),
        fetch(`/api/auth/user/providers/${conn2.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ priority: index2 }),
        }),
      ]);
    } catch (error) {
      console.log("Error swapping priority:", error);
      await fetchConnections();
    }
  };

  const selectedConnections = connections.filter((conn) => selectedConnectionIds.includes(conn.id));
  const allSelected = connections.length > 0 && selectedConnectionIds.length === connections.length;

  const toggleSelectConnection = (connectionId: string) => {
    setSelectedConnectionIds((prev) => (
      prev.includes(connectionId)
        ? prev.filter((id) => id !== connectionId)
        : [...prev, connectionId]
    ));
  };

  const toggleSelectAllConnections = () => {
    if (allSelected) {
      setSelectedConnectionIds([]);
      return;
    }
    setSelectedConnectionIds(connections.map((conn: any) => conn.id));
  };

  const clearSelection = () => {
    setSelectedConnectionIds([]);
    setBulkProxyPoolId("__none__");
  };

  useEffect(() => {
    setSelectedConnectionIds((prev: any[]) => prev.filter((id) => connections.some((conn: any) => conn.id === id)));
  }, [connections]);

  const selectedProxySummary = (() => {
    if (selectedConnections.length === 0) return "";
    const poolIds = new Set(selectedConnections.map((conn: any) => conn.providerSpecificData?.proxyPoolId || "__none__"));
    if (poolIds.size === 1) {
      const onlyId = [...poolIds][0];
      if (onlyId === "__none__") return "All selected currently unbound";
      const pool = proxyPools.find((p: any) => p.id === onlyId);
      return `All selected currently bound to ${pool?.name || onlyId}`;
    }
    return "Selected connections have mixed proxy bindings";
  })();

  const openBulkProxyModal = () => {
    if (selectedConnections.length === 0) return;
    const uniquePoolIds = [...new Set(selectedConnections.map((conn: any) => conn.providerSpecificData?.proxyPoolId || "__none__"))] as string[];
    setBulkProxyPoolId(uniquePoolIds.length === 1 ? (uniquePoolIds[0] || "__none__") : "__none__");
    setShowBulkProxyModal(true);
  };

  const closeBulkProxyModal = () => {
    if (bulkUpdatingProxy) return;
    setShowBulkProxyModal(false);
  };

  const handleBulkApplyProxyPool = async () => {
    if (selectedConnectionIds.length === 0) return;

    const proxyPoolId = bulkProxyPoolId === "__none__" ? null : bulkProxyPoolId;
    setBulkUpdatingProxy(true);
    try {
      const results = [];
      for (const connectionId of selectedConnectionIds) {
        try {
          const res = await fetch(`/api/auth/user/providers/${connectionId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-Workspace-Id": activeWorkspace?.id || ""
            },
            body: JSON.stringify({ proxyPoolId }),
          });
          results.push(res.ok);
        } catch (e: any) {
          console.log("Error applying bulk proxy pool for", connectionId, e);
          results.push(false);
        }
      }

      const failedCount = results.filter((ok) => !ok).length;
      if (failedCount > 0) {
        alert(`Updated with ${failedCount} failed request(s).`);
      }

      await fetchConnections();
      clearSelection();
      setShowBulkProxyModal(false);
    } catch (error) {
      console.log("Error applying bulk proxy pool:", error);
    } finally {
      setBulkUpdatingProxy(false);
    }
  };


  const isSelected = (connectionId: string) => selectedConnectionIds.includes(connectionId);

  const connectionsList = (
    <div className="flex flex-col divide-y divide-black/[0.03] dark:divide-white/[0.03]">
      {connections
        .map((conn: any, index: number) => (
          <div key={conn.id} className="flex items-stretch">
            <div className="flex-1 min-w-0">
              <ConnectionRow
                connection={conn}
                proxyPools={proxyPools}
                isOAuth={isOAuth}
                isFirst={index === 0}
                isLast={index === connections.length - 1}
                onMoveUp={() => handleSwapPriority(index, index - 1)}
                onMoveDown={() => handleSwapPriority(index, index + 1)}
                onToggleActive={(isActive: boolean) => handleUpdateConnectionStatus(conn.id, isActive)}
                onUpdateProxy={async (proxyPoolId: string | null) => {
                  try {
                    const res = await fetch(`/api/auth/user/providers/${conn.id}`, {
                      method: "PUT",
                      headers: {
                        "Content-Type": "application/json",
                        "X-Workspace-Id": activeWorkspace?.id || ""
                      },
                      body: JSON.stringify({ proxyPoolId: proxyPoolId || null }),
                    });
                    if (res.ok) {
                      setAllConnections((prev: any[]) => prev.map(c =>
                        c.id === conn.id
                          ? { ...c, providerSpecificData: { ...c.providerSpecificData, proxyPoolId: proxyPoolId || null } }
                          : c
                      ));
                    }
                  } catch (error) {
                    console.log("Error updating proxy:", error);
                  }
                }}
                onEdit={() => {
                  setSelectedConnection(conn);
                  setShowEditModal(true);
                }}
                onDelete={() => handleDelete(conn.id)}
                onResetHealth={() => handleResetHealth(conn.id)}
              />
            </div>
          </div>
        ))}
    </div>
  );

  const bulkProxyOptions = [
    { value: "__none__", label: "None" },
    ...proxyPools.map((pool) => ({ value: pool.id, label: pool.name })),
  ];

  const bulkHint = selectedConnectionIds.length === 0
    ? "Select one or more connections, then click Proxy Action."
    : selectedProxySummary;

  const canApplyBulkProxy = selectedConnectionIds.length > 0 && !bulkUpdatingProxy;

  const bulkActionModal = (
    <Modal
      isOpen={showBulkProxyModal}
      onClose={closeBulkProxyModal}
      title={`Proxy Action (${selectedConnectionIds.length} selected)`}
    >
      <div className="flex flex-col gap-4">
        <Select
          label="Proxy Pool"
          value={bulkProxyPoolId}
          onChange={(e: any) => setBulkProxyPoolId(e.target.value)}
          options={bulkProxyOptions}
          placeholder="None"
        />

        <p className="text-xs text-text-muted">{bulkHint}</p>
        <p className="text-xs text-text-muted">Selecting None will unbind selected connections from proxy pool.</p>

        <div className="flex gap-2">
          <Button onClick={handleBulkApplyProxyPool} fullWidth disabled={!canApplyBulkProxy}>
            {bulkUpdatingProxy ? "Applying..." : "Apply"}
          </Button>
          <Button onClick={closeBulkProxyModal} variant="ghost" fullWidth disabled={bulkUpdatingProxy}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );

  const handleTestModel = async (modelId: string) => {
    if (testingModelId) return;
    setTestingModelId(modelId);
    try {
      const res = await fetch("/api/models/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: `${providerStorageAlias}/${modelId}` }),
      });
      const data = await res.json();
      setModelTestResults((prev) => ({ ...prev, [modelId]: data.ok ? "ok" : "error" }));
      setModelsTestError(data.ok ? "" : (data.error || "Model not reachable"));
    } catch {
      setModelTestResults((prev) => ({ ...prev, [modelId]: "error" }));
      setModelsTestError("Network error");
    } finally {
      setTestingModelId(null);
    }
  };

  const renderModelsSection = () => {
    if (isCompatible) {
      return (
        <CompatibleModelsSection
          providerStorageAlias={providerStorageAlias}
          providerDisplayAlias={providerDisplayAlias}
          modelAliases={modelAliases}
          copied={copied}
          onCopy={copy}
          onSetAlias={handleSetAlias}
          onDeleteAlias={handleDeleteAlias}
          connections={connections}
          isAnthropic={isAnthropicCompatible}
          activeWorkspace={activeWorkspace}
        />
      );
    }
    // Combine hardcoded models with Kilo free models (deduplicated)
    const displayModels = [
      ...models,
      ...kiloFreeModels.filter((fm: any) => !models.some((m: any) => m.id === fm.id)),
    ];
    // Custom models added by user (stored as aliases: modelId → providerAlias/modelId)
    const customModels = Object.entries(modelAliases as Record<string, string>)
      .filter(([alias, fullModel]) => {
        const prefix = `${providerStorageAlias}/`;
        if (!(fullModel as string).startsWith(prefix)) return false;
        const modelId = (fullModel as string).slice(prefix.length);
        // Only show if not already in hardcoded list
        // For passthroughModels, include all aliases (model IDs may contain slashes like "anthropic/claude-3")
        if (providerInfo.passthroughModels) return !models.some((m: any) => m.id === modelId);
        return !models.some((m: any) => m.id === modelId) && alias === modelId;
      })
      .map(([alias, fullModel]) => ({
        id: (fullModel as string).slice(`${providerStorageAlias}/`.length),
        alias,
        fullModel: fullModel as string,
      }));

    return (
      <div className="flex flex-wrap gap-3 p-2">
        {displayModels.map((model) => {
          const fullModel = `${providerStorageAlias}/${model.id}`;
          const oldFormatModel = `${providerId}/${model.id}`;
          const existingAlias = Object.entries(modelAliases as Record<string, string>).find(
            ([, m]) => m === fullModel || m === oldFormatModel
          )?.[0];
          return (
            <ModelRow
              key={model.id}
              model={model}
              fullModel={`${providerDisplayAlias}/${model.id}`}
              alias={existingAlias}
              copied={copied}
              onCopy={copy}
              onDeleteAlias={() => existingAlias && handleDeleteAlias(existingAlias)}
              testStatus={modelTestResults[model.id] as any}
              onTest={connections.length > 0 ? () => handleTestModel(model.id) : undefined}
              isTesting={testingModelId === model.id}
              isFree={model.isFree}
              isCustom={false}
            />
          );
        })}

        {/* Custom models inline */}
        {customModels.map((model) => (
          <ModelRow
            key={model.id}
            model={{ id: model.id }}
            fullModel={`${providerDisplayAlias}/${model.id}`}
            alias={model.alias}
            copied={copied}
            onCopy={copy}
            onDeleteAlias={() => handleDeleteAlias(model.alias)}
            testStatus={modelTestResults[model.id]}
            onTest={connections.length > 0 ? () => handleTestModel(model.id) : undefined}
            isTesting={testingModelId === model.id}
            isCustom={true}
            isFree={false}
          />
        ))}

        {/* Add model button — inline, same style as model chips */}
        <button
          onClick={() => setShowAddCustomModel(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-black/15 dark:border-white/15 text-xs text-text-muted hover:text-primary hover:border-primary/40 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Add Model
        </button>

        {/* Suggested models from provider API — show only models not yet added */}
        {suggestedModels.length > 0 && (() => {
          const addedFullModels = new Set(Object.values(modelAliases));
          const notAdded = suggestedModels.filter(
            (m) => !addedFullModels.has(`${providerStorageAlias}/${m.id}`)
          );
          if (notAdded.length === 0) return null;
          return (
            <div className="w-full mt-2">
              <p className="text-xs text-text-muted mb-2">Suggested free models (≥200k context):</p>
              <div className="flex flex-wrap gap-2">
                {notAdded.map((m) => (
                  <button
                    key={m.id}
                    onClick={async () => {
                      const alias = m.id.split("/").pop();
                      await handleSetAlias(m.id, alias, providerStorageAlias);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-black/10 dark:border-white/10 text-xs text-text-muted hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors"
                    title={`${m.name} · ${(m.contextLength / 1000).toFixed(0)}k ctx`}
                  >
                    <span className="material-symbols-outlined text-[13px]">add</span>
                    {m.id.split("/").pop()}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  if (loading || !configsLoaded) {
    return (
      <div className="flex flex-col gap-8">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!providerInfo) {
    return (
      <div className="text-center py-20">
        <p className="text-text-muted">Provider not found</p>
        <Link href="/providers" className="text-primary mt-4 inline-block">
          Back to Providers
        </Link>
      </div>
    );
  }

  // Determine icon path: OpenAI Compatible providers use specialized icons
  const getHeaderIconPath = () => {
    if (isOpenAICompatible && providerInfo.apiType) {
      return providerInfo.apiType === "responses" ? "/providers/oai-r.png" : "/providers/oai-cc.png";
    }
    if (isAnthropicCompatible) {
      return "/providers/anthropic-m.png";
    }
    return `/providers/${providerInfo.id}.png`;
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <Link
          href="/providers"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary transition-colors mb-4"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back to Providers
        </Link>
        <div className="flex items-center gap-4">
          <div
            className="rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${providerInfo.color}15` }}
          >
            {headerImgError ? (
              <span className="text-sm font-bold" style={{ color: providerInfo.color }}>
                {providerInfo.textIcon || providerInfo.id.slice(0, 2).toUpperCase()}
              </span>
            ) : (
              <Image
                src={getHeaderIconPath()}
                alt={providerInfo.name}
                width={48}
                height={48}
                className="object-contain rounded-lg max-w-[48px] max-h-[48px]"
                sizes="48px"
                onError={() => setHeaderImgError(true)}
              />
            )}
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{providerInfo.name}</h1>
            <p className="text-text-muted">
              {connections.length} connection{connections.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </div>

      {providerInfo.deprecated && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05]">
          <span className="material-symbols-outlined text-[16px] text-text-muted mt-0.5 shrink-0">info</span>
          <p className="text-xs text-text-muted leading-relaxed">{providerInfo.deprecationNotice}</p>
        </div>
      )}

      {providerInfo.notice && !providerInfo.deprecated && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05]">
          <span className="material-symbols-outlined text-[16px] text-text-muted shrink-0">info</span>
          <p className="text-xs text-text-muted leading-relaxed">{providerInfo.notice.text}</p>
          {providerInfo.notice.apiKeyUrl && (
            <a
              href={providerInfo.notice.apiKeyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline shrink-0"
            >
              Get API Key →
            </a>
          )}
        </div>
      )}

      {isCompatible && providerNode && (
        <Card>
          <div className="flex items-center justify-between mb-4 p-2">
            <div>
              <h2 className="text-lg font-semibold">{isAnthropicCompatible ? "Anthropic Compatible Details" : "OpenAI Compatible Details"}</h2>
              <p className="text-sm text-text-muted">
                {isAnthropicCompatible ? "Messages API" : (providerNode.apiType === "responses" ? "Responses API" : "Chat Completions")} · {(providerNode.baseUrl || "").replace(/\/$/, "")}/
                {isAnthropicCompatible ? "messages" : (providerNode.apiType === "responses" ? "responses" : "chat/completions")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                icon="add"
                onClick={() => setShowAddApiKeyModal(true)}
              >
                Add
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon="edit"
                onClick={() => setShowEditNodeModal(true)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon="delete"
                onClick={async () => {
                  if (!confirm(`Delete this ${isAnthropicCompatible ? "Anthropic" : "OpenAI"} Compatible node?`)) return;
                  try {
                    const res = await fetch(`/api/provider-nodes/${providerId}`, { method: "DELETE" });
                    if (res.ok) {
                      router.push("/providers");
                    }
                  } catch (error) {
                    console.log("Error deleting provider node:", error);
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </div>
          {connections.length > 0 && (
            <p className="text-sm text-text-muted">
              Add multiple keys to this node for automatic rotation and high availability.
            </p>
          )}
        </Card>
      )}

      {/* Connections */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Connections</h2>
          {/* Round Robin toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted font-medium">Round Robin</span>
            <Toggle
              checked={providerStrategy === "round-robin"}
              onChange={handleRoundRobinToggle}
            />
            {providerStrategy === "round-robin" && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-text-muted">Sticky:</span>
                <input
                  type="number"
                  min={1}
                  value={providerStickyLimit}
                  onChange={(e) => handleStickyLimitChange(e.target.value)}
                  placeholder="1"
                  className="w-14 px-2 py-1 text-xs border border-border rounded-md bg-background focus:outline-none focus:border-primary"
                />
              </div>
            )}
          </div>
        </div>

        {connections.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
              <span className="material-symbols-outlined text-[32px]">{isOAuth ? "lock" : "key"}</span>
            </div>
            <p className="text-text-main font-medium mb-1">No connections yet</p>
            <p className="text-sm text-text-muted mb-4">Add your first connection to get started</p>
            {!isCompatible && (
              <div className="flex gap-2 justify-center">
                {providerId === "iflow" && (
                  <Button icon="cookie" variant="secondary" onClick={() => setShowIFlowCookieModal(true)}>
                    Cookie Auth
                  </Button>
                )}
                <Button icon="add" onClick={() => isOAuth ? setShowOAuthModal(true) : setShowAddApiKeyModal(true)}>
                  {providerId === "iflow" ? "OAuth" : "Add Connection"}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            {connectionsList}
            {!isCompatible && (
              <div className="flex gap-2 mt-4">
                {providerId === "iflow" && (
                  <Button
                    size="sm"
                    icon="cookie"
                    variant="secondary"
                    onClick={() => setShowIFlowCookieModal(true)}
                    title="Add connection using browser cookie"
                  >
                    Cookie
                  </Button>
                )}
                <Button
                  size="sm"
                  icon="add"
                  onClick={() => isOAuth ? setShowOAuthModal(true) : setShowAddApiKeyModal(true)}
                >
                  Add
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Models */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {"Available Models"}
          </h2>
        </div>
        {!!modelsTestError && (
          <p className="text-xs text-red-500 mb-3 break-words">{modelsTestError}</p>
        )}
        {renderModelsSection()}
      </Card>

      {/* Chat Preview Section */}
      {connections.length > 0 && (
        <ChatPreview
          activeWorkspace={activeWorkspace}
          providerStorageAlias={providerStorageAlias}
          models={models}
          kiloFreeModels={kiloFreeModels}
          modelAliases={modelAliases}
          providerInfo={providerInfo}
        />
      )}

      {bulkActionModal}

      {/* Modals */}
      {providerId === "kiro" ? (
        <KiroOAuthWrapper
          isOpen={showOAuthModal}
          providerInfo={providerInfo}
          onSuccess={handleOAuthSuccess}
          onClose={() => setShowOAuthModal(false)}
        />
      ) : providerId === "cursor" ? (
        <CursorAuthModal
          isOpen={showOAuthModal}
          onSuccess={handleOAuthSuccess}
          onClose={() => setShowOAuthModal(false)}
        />
      ) : providerId === "gitlab" ? (
        <GitLabAuthModal
          isOpen={showOAuthModal}
          providerInfo={providerInfo}
          onSuccess={handleSaveApiKey}
          onClose={() => setShowOAuthModal(false)}
        />
      ) : (
        <OAuthModal
          isOpen={showOAuthModal}
          onClose={() => setShowOAuthModal(false)}
          onSuccess={handleSaveApiKey}
          providerId={providerId}
        />
      )}
      {providerId === "iflow" && (
        <IFlowCookieModal
          isOpen={showIFlowCookieModal}
          onSuccess={handleIFlowCookieSuccess}
          onClose={() => setShowIFlowCookieModal(false)}
        />
      )}
      <AddApiKeyModal
        isOpen={showAddApiKeyModal}
        provider={providerId}
        providerName={providerInfo.name}
        isCompatible={isCompatible}
        isAnthropic={isAnthropicCompatible}
        proxyPools={proxyPools}
        noAuth={providerInfo?.noAuth}
        onSave={handleSaveApiKey}
        onClose={() => setShowAddApiKeyModal(false)}
      />
      <EditConnectionModal
        isOpen={showEditModal}
        connection={selectedConnection}
        proxyPools={proxyPools}
        onSave={handleUpdateConnection}
        onClose={() => setShowEditModal(false)}
      />
      {isCompatible && (
        <EditCompatibleNodeModal
          isOpen={showEditNodeModal}
          node={providerNode}
          onSave={handleUpdateNode}
          onClose={() => setShowEditNodeModal(false)}
          isAnthropic={isAnthropicCompatible}
        />
      )}
      {!isCompatible && (
        <AddCustomModelModal
          isOpen={showAddCustomModel}
          providerAlias={providerStorageAlias}
          providerDisplayAlias={providerDisplayAlias}
          onSave={async (modelId: string) => {
            // For passthrough providers (OpenRouter), use last segment as alias to avoid slash conflicts
            const alias = providerInfo?.passthroughModels
              ? modelId.split("/").pop()
              : modelId;
            await handleSetAlias(modelId, alias!, providerStorageAlias);
            setShowAddCustomModel(false);
          }}
          onClose={() => setShowAddCustomModel(false)}
        />
      )}
    </div>
  );
}

function ModelRow({ model, fullModel, alias, copied, onCopy, testStatus, isCustom, isFree, onDeleteAlias, onTest, isTesting }: any) {
  const borderColor = testStatus === "ok"
    ? "border-green-500/40"
    : testStatus === "error"
      ? "border-red-500/40"
      : "border-border";

  const iconColor = testStatus === "ok"
    ? "#22c55e"
    : testStatus === "error"
      ? "#ef4444"
      : undefined;

  return (
    <div className={`group px-3 py-2 rounded-lg border ${borderColor} hover:bg-sidebar/50`}>
      <div className="flex items-center gap-2">
        <span
          className="material-symbols-outlined text-base"
          style={iconColor ? { color: iconColor } : undefined}
        >
          {testStatus === "ok" ? "check_circle" : testStatus === "error" ? "cancel" : "smart_toy"}
        </span>
        <code className="text-xs text-text-muted font-mono bg-sidebar px-1.5 py-0.5 rounded">{fullModel}</code>
        {onTest && (
          <div className="relative group/btn">
            <button
              onClick={onTest}
              disabled={isTesting}
              className={`p-0.5 hover:bg-sidebar rounded text-text-muted hover:text-primary transition-opacity ${isTesting ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
            >
              <span className="material-symbols-outlined text-sm" style={isTesting ? { animation: "spin 1s linear infinite" } : undefined}>
                {isTesting ? "progress_activity" : "science"}
              </span>
            </button>
            <span className="pointer-events-none absolute mt-1 top-5 left-1/2 -translate-x-1/2 text-[10px] text-text-muted whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity">
              {isTesting ? "Testing..." : "Test"}
            </span>
          </div>
        )}
        <div className="relative group/btn">
          <button
            onClick={() => onCopy(fullModel, `model-${model.id}`)}
            className="p-0.5 hover:bg-sidebar rounded text-text-muted hover:text-primary"
          >
            <span className="material-symbols-outlined text-sm">
              {copied === `model-${model.id}` ? "check" : "content_copy"}
            </span>
          </button>
          <span className="pointer-events-none absolute mt-1 top-5 left-1/2 -translate-x-1/2 text-[10px] text-text-muted whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity">
            {copied === `model-${model.id}` ? "Copied!" : "Copy"}
          </span>
        </div>
        {isCustom && (
          <button
            onClick={onDeleteAlias}
            className="p-0.5 hover:bg-red-500/10 rounded text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
            title="Remove custom model"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        )}
      </div>
    </div>
  );
}

ModelRow.propTypes = {
  model: PropTypes.shape({
    id: PropTypes.string.isRequired,
  }).isRequired,
  fullModel: PropTypes.string.isRequired,
  alias: PropTypes.string,
  copied: PropTypes.string,
  onCopy: PropTypes.func.isRequired,
  testStatus: PropTypes.oneOf(["ok", "error"]),
  isCustom: PropTypes.bool,
  isFree: PropTypes.bool,
  onDeleteAlias: PropTypes.func,
  onTest: PropTypes.func,
  isTesting: PropTypes.bool,
};

function PassthroughModelsSection({ providerAlias, modelAliases, copied, onCopy, onSetAlias, onDeleteAlias }: any) {
  const [newModel, setNewModel] = useState("");
  const [adding, setAdding] = useState(false);

  // Filter aliases for this provider - models are persisted via alias
  const providerAliases = Object.entries(modelAliases).filter(
    ([, model]) => (model as string).startsWith(`${providerAlias}/`)
  );

  const allModels = providerAliases.map(([alias, fullModel]) => ({
    modelId: (fullModel as string).replace(`${providerAlias}/`, ""),
    fullModel,
    alias,
  }));

  // Generate default alias from modelId (last part after /)
  const generateDefaultAlias = (modelId: string): string => {
    const parts = modelId.split("/");
    return parts[parts.length - 1] || "";
  };

  const handleAdd = async () => {
    if (!newModel.trim() || adding) return;
    const modelId = newModel.trim();
    const defaultAlias = generateDefaultAlias(modelId);

    // Check if alias already exists
    if (modelAliases[defaultAlias as string]) {
      alert(`Alias "${defaultAlias}" already exists. Please use a different model or edit existing alias.`);
      return;
    }

    setAdding(true);
    try {
      await onSetAlias(modelId, defaultAlias);
      setNewModel("");
    } catch (error) {
      console.log("Error adding model:", error);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-muted">
        OpenRouter supports any model. Add models and create aliases for quick access.
      </p>

      {/* Add new model */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor="new-model-input" className="text-xs text-text-muted mb-1 block">Model ID (from OpenRouter)</label>
          <input
            id="new-model-input"
            type="text"
            value={newModel}
            onChange={(e) => setNewModel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="anthropic/claude-3-opus"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-primary"
          />
        </div>
        <Button size="sm" icon="add" onClick={handleAdd} disabled={!newModel.trim() || adding}>
          {adding ? "Adding..." : "Add"}
        </Button>
      </div>

      {/* Models list */}
      {allModels.length > 0 && (
        <div className="flex flex-col gap-3">
          {allModels.map(({ modelId, fullModel, alias }) => (
            <PassthroughModelRow
              key={fullModel as string}
              modelId={modelId}
              fullModel={fullModel as string}
              copied={copied}
              onCopy={onCopy}
              onDeleteAlias={() => onDeleteAlias(alias)}
              onTest={undefined}
              testStatus={undefined}
              isTesting={false}
              isFree={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

PassthroughModelsSection.propTypes = {
  providerAlias: PropTypes.string.isRequired,
  modelAliases: PropTypes.object.isRequired,
  copied: PropTypes.string,
  onCopy: PropTypes.func.isRequired,
  onSetAlias: PropTypes.func.isRequired,
  onDeleteAlias: PropTypes.func.isRequired,
};

function PassthroughModelRow({ modelId, fullModel, copied, onCopy, onDeleteAlias, onTest, testStatus, isTesting, isFree }: any) {
  const borderColor = testStatus === "ok"
    ? "border-green-500/40"
    : testStatus === "error"
      ? "border-red-500/40"
      : "border-border";

  const iconColor = testStatus === "ok"
    ? "#22c55e"
    : testStatus === "error"
      ? "#ef4444"
      : undefined;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${borderColor} hover:bg-sidebar/50`}>
      <span
        className="material-symbols-outlined text-base text-text-muted"
        style={iconColor ? { color: iconColor } : undefined}
      >
        {testStatus === "ok" ? "check_circle" : testStatus === "error" ? "cancel" : "smart_toy"}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{modelId}</p>

        <div className="flex items-center gap-1 mt-1">
          <code className="text-xs text-text-muted font-mono bg-sidebar px-1.5 py-0.5 rounded">{fullModel}</code>
          {isFree && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400">Free</span>
          )}
          <div className="relative group/btn">
            <button
              onClick={() => onCopy(fullModel, `model-${modelId}`)}
              className="p-0.5 hover:bg-sidebar rounded text-text-muted hover:text-primary"
            >
              <span className="material-symbols-outlined text-sm">
                {copied === `model-${modelId}` ? "check" : "content_copy"}
              </span>
            </button>
            <span className="pointer-events-none absolute top-5 left-1/2 -translate-x-1/2 text-[10px] text-text-muted whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity">
              {copied === `model-${modelId}` ? "Copied!" : "Copy"}
            </span>
          </div>
          {onTest && (
            <div className="relative group/btn">
              <button
                onClick={onTest}
                disabled={isTesting}
                className="p-0.5 hover:bg-sidebar rounded text-text-muted hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-sm" style={isTesting ? { animation: "spin 1s linear infinite" } : undefined}>
                  {isTesting ? "progress_activity" : "science"}
                </span>
              </button>
              <span className="pointer-events-none absolute top-5 left-1/2 -translate-x-1/2 text-[10px] text-text-muted whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity">
                {isTesting ? "Testing..." : "Test"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={onDeleteAlias}
        className="p-1 hover:bg-red-50 rounded text-red-500"
        title="Remove model"
      >
        <span className="material-symbols-outlined text-sm">delete</span>
      </button>
    </div>
  );
}

PassthroughModelRow.propTypes = {
  modelId: PropTypes.string.isRequired,
  fullModel: PropTypes.string.isRequired,
  copied: PropTypes.string,
  onCopy: PropTypes.func.isRequired,
  onDeleteAlias: PropTypes.func.isRequired,
  onTest: PropTypes.func,
  testStatus: PropTypes.oneOf(["ok", "error"]),
  isTesting: PropTypes.bool,
};

function CompatibleModelsSection({ providerStorageAlias, providerDisplayAlias, modelAliases, copied, onCopy, onSetAlias, onDeleteAlias, connections, isAnthropic, activeWorkspace }: any) {
  const [newModel, setNewModel] = useState("");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [testingModelId, setTestingModelId] = useState<string | null>(null);
  const [modelTestResults, setModelTestResults] = useState<Record<string, string>>({});

  const handleTestModel = async (modelId: string) => {
    if (testingModelId) return;
    setTestingModelId(modelId);
    try {
      const res = await fetch("/api/models/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Id": activeWorkspace?.id || ""
        },
        body: JSON.stringify({ model: `${providerStorageAlias}/${modelId}` }),
      });
      const data = await res.json();
      setModelTestResults((prev) => ({ ...prev, [modelId]: data.ok ? "ok" : "error" }));
    } catch {
      setModelTestResults((prev) => ({ ...prev, [modelId]: "error" }));
    } finally {
      setTestingModelId(null);
    }
  };

  const providerAliases = Object.entries(modelAliases).filter(
    ([, model]) => (model as string).startsWith(`${providerStorageAlias}/`)
  );

  const allModels = providerAliases.map(([alias, fullModel]) => ({
    modelId: (fullModel as string).replace(`${providerStorageAlias}/`, ""),
    fullModel,
    alias,
  }));

  const generateDefaultAlias = (modelId: string) => {
    const parts = modelId.split("/");
    return parts[parts.length - 1];
  };

  const resolveAlias = (modelId: string) => {
    const fullModel = `${providerStorageAlias}/${modelId}`;
    // Skip if this exact model already has an alias
    if (Object.values(modelAliases).includes(fullModel)) return null;
    const baseAlias = generateDefaultAlias(modelId);
    if (!modelAliases[baseAlias as string]) return baseAlias;
    const prefixedAlias = `${providerDisplayAlias}-${baseAlias}`;
    if (!modelAliases[prefixedAlias]) return prefixedAlias;
    return null;
  };

  const handleAdd = async () => {
    if (!newModel.trim() || adding) return;
    const modelId = newModel.trim();
    const resolvedAlias = resolveAlias(modelId);
    if (!resolvedAlias) {
      alert("All suggested aliases already exist. Please choose a different model or remove conflicting aliases.");
      return;
    }

    setAdding(true);
    try {
      await onSetAlias(modelId, resolvedAlias, providerStorageAlias);
      setNewModel("");
    } catch (error) {
      console.log("Error adding model:", error);
    } finally {
      setAdding(false);
    }
  };

  const handleImport = async () => {
    if (importing) return;
    const activeConnection = connections.find((conn: any) => conn.isActive !== false);
    if (!activeConnection) return;

    setImporting(true);
    try {
      const res = await fetch(`/api/auth/user/providers/${activeConnection.id}/models`);
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to import models");
        return;
      }
      const models = data.models || [];
      if (models.length === 0) {
        alert("No models returned from /models.");
        return;
      }
      let importedCount = 0;
      for (const model of models) {
        const modelId = model.id || model.name || model.model;
        if (!modelId) continue;
        const resolvedAlias = resolveAlias(modelId);
        if (!resolvedAlias) continue;
        await onSetAlias(modelId, resolvedAlias, providerStorageAlias);
        importedCount += 1;
      }
      if (importedCount === 0) {
        alert("No new models were added.");
      }
    } catch (error) {
      console.log("Error importing models:", error);
    } finally {
      setImporting(false);
    }
  };

  const canImport = connections.some((conn: any) => conn.isActive !== false);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-muted">
        Add {isAnthropic ? "Anthropic" : "OpenAI"}-compatible models manually or import them from the /models endpoint.
      </p>

      <div className="flex items-end gap-2 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <label htmlFor="new-compatible-model-input" className="text-xs text-text-muted mb-1 block">Model ID</label>
          <input
            id="new-compatible-model-input"
            type="text"
            value={newModel}
            onChange={(e) => setNewModel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder={isAnthropic ? "claude-3-opus-20240229" : "gpt-4o"}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-primary"
          />
        </div>
        <Button size="sm" icon="add" onClick={handleAdd} disabled={!newModel.trim() || adding}>
          {adding ? "Adding..." : "Add"}
        </Button>
        <Button size="sm" variant="secondary" icon="download" onClick={handleImport} disabled={!canImport || importing}>
          {importing ? "Importing..." : "Import from /models"}
        </Button>
      </div>

      {!canImport && (
        <p className="text-xs text-text-muted">
          Add a connection to enable importing models.
        </p>
      )}

      {allModels.length > 0 && (
        <div className="flex flex-col gap-3">
          {allModels.map(({ modelId, fullModel, alias }) => (
            <PassthroughModelRow
              key={fullModel as string}
              modelId={modelId}
              fullModel={`${providerDisplayAlias}/${modelId}`}
              copied={copied}
              onCopy={onCopy}
              onDeleteAlias={() => onDeleteAlias(alias)}
              onTest={connections.length > 0 ? () => handleTestModel(modelId) : undefined}
              testStatus={modelTestResults[modelId] as any}
              isTesting={testingModelId === modelId}
              isFree={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

CompatibleModelsSection.propTypes = {
  providerStorageAlias: PropTypes.string.isRequired,
  providerDisplayAlias: PropTypes.string.isRequired,
  modelAliases: PropTypes.object.isRequired,
  copied: PropTypes.string,
  onCopy: PropTypes.func.isRequired,
  onSetAlias: PropTypes.func.isRequired,
  onDeleteAlias: PropTypes.func.isRequired,
  connections: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    isActive: PropTypes.bool,
  })).isRequired,
  activeWorkspace: PropTypes.object,
  isAnthropic: PropTypes.bool,
};

function CooldownTimer({ until }: any) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const updateRemaining = () => {
      const diff = new Date(until).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining("");
        return;
      }
      const secs = Math.floor(diff / 1000);
      if (secs < 60) {
        setRemaining(`${secs}s`);
      } else if (secs < 3600) {
        setRemaining(`${Math.floor(secs / 60)}m ${secs % 60}s`);
      } else {
        const hrs = Math.floor(secs / 3600);
        const mins = Math.floor((secs % 3600) / 60);
        setRemaining(`${hrs}h ${mins}m`);
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [until]);

  if (!remaining) return null;

  return (
    <span className="text-xs text-orange-500 font-mono">
      ⏱ {remaining}
    </span>
  );
}

CooldownTimer.propTypes = {
  until: PropTypes.string.isRequired,
};

// --- Chat Preview Component ---
function ChatPreview({ activeWorkspace, providerStorageAlias, models, kiloFreeModels, modelAliases, providerInfo }: any) {
  const [selectedModel, setSelectedModel] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const availableModels = [
    ...models,
    ...kiloFreeModels.filter((fm: any) => !models.some((m: any) => m.id === fm.id)),
    ...Object.entries(modelAliases)
      .filter(([, fullModel]) => (fullModel as string).startsWith(`${providerStorageAlias}/`))
      .map(([alias, fullModel]) => ({ id: (fullModel as string).split("/").pop(), alias }))
  ].filter((m: any, i, self: any[]) => self.findIndex(t => t.id === m.id) === i);

  useEffect(() => {
    if (availableModels.length > 0 && !selectedModel) {
      setSelectedModel((availableModels[0] as any).id);
    }
  }, [availableModels, selectedModel]);

  const scrollToBottom = () => {
    (messagesEndRef.current as any)?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: any) => {
    if (e) e.preventDefault();
    if (!input.trim() || sending || !selectedModel) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev: any[]) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Id": activeWorkspace?.id || ""
        },
        body: JSON.stringify({
          model: selectedModel,
          provider: providerStorageAlias,
          modelSource: "platform",
          messages: [...messages, userMessage],
          stream: false
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessages((prev: any[]) => [...prev, data.choices[0].message]);
      } else {
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: `Error: ${data.error?.message || data.error || "Failed to get response"}`
        }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${(err as any).message}`, isError: true }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card title="Chat Preview" icon="chat_bubble" className="border-primary/20">
      <div className="flex flex-col h-[500px]">
        <div className="p-3 border-b border-border bg-sidebar/5 flex items-center gap-3">
          <div className="text-xs font-medium text-text-muted uppercase tracking-wider shrink-0">Test Model</div>
          <select
            value={selectedModel}
            onChange={(e: any) => setSelectedModel(e.target.value)}
            className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary"
          >
            {availableModels.map(m => (
              <option key={m.id} value={m.id}>{m.alias || m.id}</option>
            ))}
          </select>
          <Button variant="ghost" size="sm" onClick={() => setMessages([])} disabled={messages.length === 0}>Clear</Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-sidebar/5">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-text-muted gap-2 opacity-50">
              <span className="material-symbols-outlined text-4xl">smart_toy</span>
              <p className="text-sm">Start a conversation to test your connection.</p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user"
                  ? "bg-primary text-white rounded-tr-none"
                  : "bg-background border border-border rounded-tl-none"
                  }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-border">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e: any) => setInput(e.target.value)}
              placeholder={`Send a message to ${selectedModel}...`}
              disabled={sending}
              className="flex-1 bg-sidebar/50 border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary"
            />
            <Button type="submit" icon="send" loading={sending} disabled={!input.trim() || sending}>Send</Button>
          </form>
        </div>
      </div>
    </Card>
  );
}

function ConnectionRow({ connection, proxyPools, isOAuth, isFirst, isLast, onMoveUp, onMoveDown, onToggleActive, onUpdateProxy, onEdit, onDelete, onResetHealth }: any) {
  const [showProxyDropdown, setShowProxyDropdown] = useState<boolean>(false);
  const [updatingProxy, setUpdatingProxy] = useState<boolean>(false);
  const proxyDropdownRef = useRef<HTMLDivElement>(null);

  const proxyPoolMap = new Map((proxyPools || []).map((pool: any) => [pool.id, pool]));
  const boundProxyPoolId = connection.providerSpecificData?.proxyPoolId || null;
  const boundProxyPool: any = boundProxyPoolId ? proxyPoolMap.get(boundProxyPoolId) : null;
  const hasLegacyProxy = connection.providerSpecificData?.connectionProxyEnabled === true && !!connection.providerSpecificData?.connectionProxyUrl;
  const hasAnyProxy = !!boundProxyPoolId || hasLegacyProxy;
  const proxyDisplayText = boundProxyPool
    ? `Pool: ${boundProxyPool.name}`
    : boundProxyPoolId
      ? `Pool: ${boundProxyPoolId} (inactive/missing)`
      : hasLegacyProxy
        ? `Legacy: ${connection.providerSpecificData?.connectionProxyUrl}`
        : "";

  let maskedProxyUrl = "";
  if (boundProxyPool?.proxyUrl || connection.providerSpecificData?.connectionProxyUrl) {
    const rawProxyUrl = boundProxyPool?.proxyUrl || connection.providerSpecificData?.connectionProxyUrl;
    try {
      const parsed = new URL(rawProxyUrl);
      maskedProxyUrl = `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}`;
    } catch {
      maskedProxyUrl = rawProxyUrl;
    }
  }

  const noProxyText = boundProxyPool?.noProxy || connection.providerSpecificData?.connectionNoProxy || "";

  let proxyBadgeVariant = "default";
  if (boundProxyPool?.isActive === true) {
    proxyBadgeVariant = "success";
  } else if (boundProxyPoolId || hasLegacyProxy) {
    proxyBadgeVariant = "error";
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showProxyDropdown) return;
    const handler = (e: MouseEvent) => {
      if (proxyDropdownRef.current && !proxyDropdownRef.current.contains(e.target as Node)) {
        setShowProxyDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showProxyDropdown]);

  const handleSelectProxy = async (poolId: string) => {
    setUpdatingProxy(true);
    try {
      await onUpdateProxy(poolId === "__none__" ? null : poolId);
    } finally {
      setUpdatingProxy(false);
      setShowProxyDropdown(false);
    }
  };

  const displayName = isOAuth
    ? connection.name || connection.email || connection.displayName || "OAuth Account"
    : connection.name;

  // Use useState + useEffect for impure Date.now() to avoid calling during render
  const [isCooldown, setIsCooldown] = useState<boolean>(false);

  // Get earliest model lock timestamp (useEffect handles the Date.now() comparison)
  const modelLockUntil = Object.entries(connection)
    .filter(([k]) => k.startsWith("modelLock_"))
    .map(([, v]) => v)
    .filter(v => !!v)
    .sort()[0] || null;

  useEffect(() => {
    const checkCooldown = () => {
      const until = Object.entries(connection)
        .filter(([k]) => k.startsWith("modelLock_"))
        .map(([, v]) => v)
        .filter(v => v && new Date(v as any).getTime() > Date.now())
        .sort()[0] || null;
      setIsCooldown(!!until);
    };

    checkCooldown();
    const interval = modelLockUntil ? setInterval(checkCooldown, 1000) : null;
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [modelLockUntil, connection]);

  // Determine effective status (override unavailable if cooldown expired)
  const effectiveStatus = (connection.testStatus === "unavailable" && !isCooldown)
    ? "active"  // Cooldown expired → treat as active
    : connection.testStatus;

  const getStatusVariant = () => {
    if (connection.isActive === false) return "default";
    if (effectiveStatus === "active" || effectiveStatus === "success") return "success";
    if (effectiveStatus === "error" || effectiveStatus === "expired" || effectiveStatus === "unavailable") return "error";
    return "default";
  };

  return (
    <div className={`group flex items-center justify-between p-3 rounded-lg hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors ${connection.isActive === false ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Priority arrows */}
        <div className="flex flex-col">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className={`p-0.5 rounded ${isFirst ? "text-text-muted/30 cursor-not-allowed" : "hover:bg-sidebar text-text-muted hover:text-primary"}`}
          >
            <span className="material-symbols-outlined text-sm">keyboard_arrow_up</span>
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className={`p-0.5 rounded ${isLast ? "text-text-muted/30 cursor-not-allowed" : "hover:bg-sidebar text-text-muted hover:text-primary"}`}
          >
            <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
          </button>
        </div>
        <span className="material-symbols-outlined text-base text-text-muted">
          {isOAuth ? "lock" : "key"}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{displayName}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={getStatusVariant() as any} size="sm" dot>
              {connection.isActive === false ? "disabled" : (effectiveStatus || "Unknown")}
            </Badge>
            {hasAnyProxy && (
              <Badge variant={proxyBadgeVariant as any} size="sm">
                Proxy
              </Badge>
            )}
            {isCooldown && connection.isActive !== false && <CooldownTimer until={modelLockUntil} />}
            {connection.lastError && connection.isActive !== false && (
              <span className="text-xs text-red-500 truncate max-w-[300px]" title={connection.lastError}>
                {connection.lastError}
              </span>
            )}
            <span className="text-xs text-text-muted">#{connection.priority}</span>
            {connection.globalPriority && (
              <span className="text-xs text-text-muted">Auto: {connection.globalPriority}</span>
            )}
          </div>
          {hasAnyProxy && (
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-text-muted truncate max-w-[420px]" title={proxyDisplayText}>
                {proxyDisplayText}
              </span>
              {maskedProxyUrl && (
                <code className="text-[10px] font-mono bg-black/5 dark:bg-white/5 px-1 py-0.5 rounded text-text-muted">
                  {maskedProxyUrl}
                </code>
              )}
              {noProxyText && (
                <span className="text-[11px] text-text-muted truncate max-w-[320px]" title={noProxyText}>
                  no_proxy: {noProxyText}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {/* Proxy button with inline dropdown */}
          {(proxyPools || []).length > 0 && (
            <div className="relative" ref={proxyDropdownRef}>
              <button
                onClick={() => setShowProxyDropdown((v) => !v)}
                className={`flex flex-col items-center px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${hasAnyProxy ? "text-primary" : "text-text-muted hover:text-primary"}`}
                disabled={updatingProxy}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {updatingProxy ? "progress_activity" : "lan"}
                </span>
                <span className="text-[10px] leading-tight">Proxy</span>
              </button>
              {showProxyDropdown && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-bg border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
                  <button
                    onClick={() => handleSelectProxy("__none__")}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 ${!boundProxyPoolId ? "text-primary font-medium" : "text-text-main"}`}
                  >
                    None
                  </button>
                  {(proxyPools || []).map((pool: any) => (
                    <button
                      key={pool.id}
                      onClick={() => handleSelectProxy(pool.id)}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 ${boundProxyPoolId === pool.id ? "text-primary font-medium" : "text-text-main"}`}
                    >
                      {pool.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button onClick={onEdit} className="flex flex-col items-center px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-text-muted hover:text-primary">
            <span className="material-symbols-outlined text-[18px]">edit</span>
            <span className="text-[10px] leading-tight">Edit</span>
          </button>
          <button onClick={onDelete} className="flex flex-col items-center px-2 py-1 rounded hover:bg-red-500/10 text-red-500">
            <span className="material-symbols-outlined text-[18px]">delete</span>
            <span className="text-[10px] leading-tight">Delete</span>
          </button>

          {(connection.lastError || isCooldown || effectiveStatus === "unavailable" || effectiveStatus === "error") && (
            <button
              onClick={onResetHealth}
              className="flex flex-col items-center px-2 py-1 rounded hover:bg-green-500/10 text-green-600 dark:text-green-400"
              title="Reset health status (Clear errors and cooldown)"
            >
              <span className="material-symbols-outlined text-[18px]">temp_preferences_custom</span>
              <span className="text-[10px] leading-tight">Refresh</span>
            </button>
          )}
        </div>
        <Toggle
          size="sm"
          checked={connection.isActive ?? true}
          onChange={onToggleActive}
          title={(connection.isActive ?? true) ? "Disable connection" : "Enable connection"}
        />
      </div>
    </div>
  );
}

ConnectionRow.propTypes = {
  connection: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    email: PropTypes.string,
    displayName: PropTypes.string,
    modelLockUntil: PropTypes.string,
    testStatus: PropTypes.string,
    isActive: PropTypes.bool,
    lastError: PropTypes.string,
    priority: PropTypes.number,
    globalPriority: PropTypes.number,
  }).isRequired,
  proxyPools: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    proxyUrl: PropTypes.string,
    noProxy: PropTypes.string,
    isActive: PropTypes.bool,
  })),
  isOAuth: PropTypes.bool.isRequired,
  isFirst: PropTypes.bool.isRequired,
  isLast: PropTypes.bool.isRequired,
  onMoveUp: PropTypes.func.isRequired,
  onMoveDown: PropTypes.func.isRequired,
  onToggleActive: PropTypes.func.isRequired,
  onUpdateProxy: PropTypes.func,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onResetHealth: PropTypes.func,
};

function AddApiKeyModal({ isOpen, provider, providerName, isCompatible, isAnthropic, proxyPools, noAuth, onSave, onClose }: any) {
  const NONE_PROXY_POOL_VALUE = "__none__";

  const [isBulk, setIsBulk] = useState(false);
  const [formData, setFormData] = useState({
    name: `${providerName || provider} Key`,
    apiKey: "",
    priority: 1,
    proxyPoolId: NONE_PROXY_POOL_VALUE,
  });
  const [bulkKeys, setBulkKeys] = useState("");
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { activeWorkspace } = useWorkspace();
  const handleValidate = async () => {
    if (!activeWorkspace || isBulk) return;
    setValidating(true);
    try {
      const res = await fetch("/api/auth/user/providers/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Id": activeWorkspace?.id || ""
        },
        body: JSON.stringify({ provider, apiKey: formData.apiKey }),
      });
      const data = await res.json();
      setValidationResult(data.valid ? "success" : "failed");
    } catch {
      setValidationResult("failed");
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async () => {
    if (!provider) return;
    
    if (!isBulk && !formData.apiKey && !noAuth) return;
    if (isBulk && !bulkKeys.trim()) return;

    setSaving(true);
    try {
      if (isBulk) {
        const keys = bulkKeys.split("\n").map(k => k.trim()).filter(k => !!k);
        for (let i = 0; i < keys.length; i++) {
          await onSave({
            name: `${formData.name} #${i + 1}`,
            apiKey: keys[i],
            priority: formData.priority,
            proxyPoolId: formData.proxyPoolId === NONE_PROXY_POOL_VALUE ? null : formData.proxyPoolId,
            testStatus: "unknown",
          });
        }
      } else {
        let isValid = false;
        try {
          setValidating(true);
          const res = await fetch("/api/auth/user/providers/validate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Workspace-Id": activeWorkspace?.id || ""
            },
            body: JSON.stringify({ provider, apiKey: formData.apiKey }),
          });
          const data = await res.json();
          isValid = !!data.valid;
        } catch {
          // ignore validation error
        } finally {
          setValidating(false);
        }

        await onSave({
          name: formData.name,
          apiKey: formData.apiKey,
          priority: formData.priority,
          proxyPoolId: formData.proxyPoolId === NONE_PROXY_POOL_VALUE ? null : formData.proxyPoolId,
          testStatus: isValid ? "active" : "unknown",
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!provider) return null;

  return (
    <Modal isOpen={isOpen} title={`Add ${providerName || provider} API Key`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-text-muted">Mode</label>
          <div className="flex bg-surface p-1 rounded-lg border border-border">
            <button 
              onClick={() => setIsBulk(false)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${!isBulk ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text-main"}`}
            >
              Single
            </button>
            <button 
              onClick={() => setIsBulk(true)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${isBulk ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text-main"}`}
            >
              Bulk Add
            </button>
          </div>
        </div>

        <Input
          label="Base Name"
          value={formData.name}
          onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g. My Key"
        />

        {isBulk ? (
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-xs font-semibold text-text-muted">API Keys (One per line)</label>
            <textarea
              className="flex min-h-[120px] w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={bulkKeys}
              onChange={(e) => setBulkKeys(e.target.value)}
              placeholder="sk-...\nsk-...\nsk-..."
            />
            <p className="text-[10px] text-text-muted">Each key will be added as a separate connection with automatic numbering.</p>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              label="API Key"
              type="password"
              value={formData.apiKey}
              onChange={(e: any) => setFormData({ ...formData, apiKey: e.target.value })}
              className="flex-1"
            />
            {!noAuth && (
              <div className="pt-6">
                <Button onClick={handleValidate} disabled={!formData.apiKey || validating || saving} variant="secondary">
                  {validating ? "..." : "Check"}
                </Button>
              </div>
            )}
          </div>
        )}

        {validationResult && !isBulk && (
          <Badge variant={validationResult === "success" ? "success" : "error"}>
            {validationResult === "success" ? "Valid" : "Invalid"}
          </Badge>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Priority"
            type="number"
            value={formData.priority}
            onChange={(e: any) => setFormData({ ...formData, priority: Number.parseInt(e.target.value) || 1 })}
          />
          <Select
            label="Proxy Pool"
            value={formData.proxyPoolId}
            onChange={(e: any) => setFormData({ ...formData, proxyPoolId: e.target.value })}
            options={[
              { value: NONE_PROXY_POOL_VALUE, label: "None" },
              ...(proxyPools || []).map((pool: any) => ({ value: pool.id, label: pool.name })),
            ]}
          />
        </div>

        <div className="flex gap-2 mt-2">
          <Button onClick={handleSubmit} fullWidth disabled={saving || (!isBulk && !formData.apiKey && !noAuth) || (isBulk && !bulkKeys.trim())}>
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button onClick={onClose} variant="ghost" fullWidth disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

AddApiKeyModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  provider: PropTypes.string,
  providerName: PropTypes.string,
  isCompatible: PropTypes.bool,
  isAnthropic: PropTypes.bool,
  proxyPools: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
  })),
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

function EditConnectionModal({ isOpen, connection, proxyPools, onSave, onClose }: any) {
  const { activeWorkspace } = useWorkspace();
  const [formData, setFormData] = useState({
    name: "",
    priority: 1,
    apiKey: "",
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (connection) {
      setFormData({
        name: connection.name || "",
        priority: connection.priority || 1,
        apiKey: "",
      });
      setTestResult(null);
      setValidationResult(null);
    }
  }, [connection]);

  const handleTest = async () => {
    if (!connection?.provider) return;
    if (!activeWorkspace) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/auth/user/providers/${connection.id}/test`, {
        method: "POST",
        headers: { "X-Workspace-Id": activeWorkspace?.id || "" }
      });
      const data = await res.json();
      setTestResult(data.valid ? "success" : "failed");
    } catch {
      setTestResult("failed");
    } finally {
      setTesting(false);
    }
  };

  const handleValidate = async () => {
    if (!connection?.provider || !formData.apiKey) return;
    if (!activeWorkspace) return;
    setValidating(true);
    setValidationResult(null);
    try {
      const res = await fetch("/api/auth/user/providers/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Id": activeWorkspace?.id || ""
        },
        body: JSON.stringify({ provider: connection.provider, apiKey: formData.apiKey }),
      });
      const data = await res.json();
      setValidationResult(data.valid ? "success" : "failed");
    } catch {
      setValidationResult("failed");
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const updates: any = {
        name: formData.name,
        priority: formData.priority,
      };
      if (!isOAuth && formData.apiKey) {
        updates.apiKey = formData.apiKey;
        let isValid = validationResult === "success";
        if (!isValid) {
          try {
            setValidating(true);
            setValidationResult(null);
            const res = await fetch("/api/auth/user/providers/validate", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Workspace-Id": activeWorkspace?.id || ""
              },
              body: JSON.stringify({ provider: connection.provider, apiKey: formData.apiKey }),
            });
            const data = await res.json();
            isValid = !!data.valid;
            setValidationResult(isValid ? "success" : "failed");
          } catch {
            setValidationResult("failed");
          } finally {
            setValidating(false);
          }
        }
        if (isValid) {
          updates.testStatus = "active";
          updates.lastError = null;
          updates.lastErrorAt = null;
        }
      }
      await onSave(updates);
    } finally {
      setSaving(false);
    }
  };

  if (!connection) return null;

  const isOAuth = connection.authType === "oauth";
  const isCompatible = isOpenAICompatibleProvider(connection.provider) || isAnthropicCompatibleProvider(connection.provider);

  return (
    <Modal isOpen={isOpen} title="Edit Connection" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Input
          label="Name"
          value={formData.name}
          onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
          placeholder={isOAuth ? "Account name" : "Production Key"}
        />
        {isOAuth && connection.email && (
          <div className="bg-sidebar/50 p-3 rounded-lg">
            <p className="text-sm text-text-muted mb-1">Email</p>
            <p className="font-medium">{connection.email}</p>
          </div>
        )}
        <Input
          label="Priority"
          type="number"
          value={formData.priority}
          onChange={(e: any) => setFormData({ ...formData, priority: Number.parseInt(e.target.value) || 1 })}
        />

        {!isOAuth && (
          <>
            <div className="flex gap-2">
              <Input
                label="API Key"
                type="password"
                value={formData.apiKey}
                onChange={(e: any) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder="Enter new API key"
                hint="Leave blank to keep the current API key."
                className="flex-1"
              />
              <div className="pt-6">
                <Button onClick={handleValidate} disabled={!formData.apiKey || validating || saving} variant="secondary">
                  {validating ? "Checking..." : "Check"}
                </Button>
              </div>
            </div>
            {validationResult && (
              <Badge variant={validationResult === "success" ? "success" : "error"}>
                {validationResult === "success" ? "Valid" : "Invalid"}
              </Badge>
            )}
          </>
        )}

        {/* Test Connection */}
        {!isCompatible && (
          <div className="flex items-center gap-3">
            <Button onClick={handleTest} variant="secondary" disabled={testing}>
              {testing ? "Testing..." : "Test Connection"}
            </Button>
            {testResult && (
              <Badge variant={testResult === "success" ? "success" : "error"}>
                {testResult === "success" ? "Valid" : "Failed"}
              </Badge>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleSubmit} fullWidth disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          <Button onClick={onClose} variant="ghost" fullWidth>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}

EditConnectionModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  connection: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    email: PropTypes.string,
    priority: PropTypes.number,
    authType: PropTypes.string,
    provider: PropTypes.string,
    providerSpecificData: PropTypes.object,
  }),
  proxyPools: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
  })),
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

function EditCompatibleNodeModal({ isOpen, node, onSave, onClose, isAnthropic }: any) {
  const { activeWorkspace } = useWorkspace();
  const [formData, setFormData] = useState({
    name: "",
    prefix: "",
    apiType: "chat",
    baseUrl: "https://api.openai.com/v1",
  });
  const [saving, setSaving] = useState(false);
  const [checkKey, setCheckKey] = useState("");
  const [checkModelId, setCheckModelId] = useState("");
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<string | null>(null);

  useEffect(() => {
    if (node) {
      setFormData({
        name: node.name || "",
        prefix: node.prefix || "",
        apiType: node.apiType || "chat",
        baseUrl: node.baseUrl || (isAnthropic ? "https://api.anthropic.com/v1" : "https://api.openai.com/v1"),
      });
    }
  }, [node, isAnthropic]);

  const apiTypeOptions = [
    { value: "chat", label: "Chat Completions" },
    { value: "responses", label: "Responses API" },
  ];

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.prefix.trim() || !formData.baseUrl.trim()) return;
    setSaving(true);
    try {
      const payload: any = {
        name: formData.name,
        prefix: formData.prefix,
        baseUrl: formData.baseUrl,
      };
      if (!isAnthropic) {
        payload.apiType = formData.apiType;
      }
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    try {
      const res = await fetch("/api/provider-nodes/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Id": activeWorkspace?.id || "ws_system"
        },
        body: JSON.stringify({
          baseUrl: formData.baseUrl,
          apiKey: checkKey,
          type: isAnthropic ? "anthropic-compatible" : "openai-compatible",
          modelId: checkModelId.trim() || undefined
        }),
      });
      const data = await res.json();
      setValidationResult(data.valid ? "success" : "failed");
    } catch {
      setValidationResult("failed");
    } finally {
      setValidating(false);
    }
  };

  if (!node) return null;

  return (
    <Modal isOpen={isOpen} title={`Edit ${isAnthropic ? "Anthropic" : "OpenAI"} Compatible`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Input
          label="Name"
          value={formData.name}
          onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
          placeholder={`${isAnthropic ? "Anthropic" : "OpenAI"} Compatible (Prod)`}
          hint="Required. A friendly label for this node."
        />
        <Input
          label="Prefix"
          value={formData.prefix}
          onChange={(e: any) => setFormData({ ...formData, prefix: e.target.value })}
          placeholder={isAnthropic ? "ac-prod" : "oc-prod"}
          hint="Required. Used as the provider prefix for model IDs."
        />
        {!isAnthropic && (
          <Select
            label="API Type"
            options={apiTypeOptions}
            value={formData.apiType}
            onChange={(e: any) => setFormData({ ...formData, apiType: e.target.value })}
          />
        )}
        <Input
          label="Base URL"
          value={formData.baseUrl}
          onChange={(e: any) => setFormData({ ...formData, baseUrl: e.target.value })}
          placeholder={isAnthropic ? "https://api.anthropic.com/v1" : "https://api.openai.com/v1"}
          hint={`Use the base URL (ending in /v1) for your ${isAnthropic ? "Anthropic" : "OpenAI"}-compatible API.`}
        />
        <div className="flex gap-2">
          <Input
            label="API Key (for Check)"
            type="password"
            value={checkKey}
            onChange={(e: any) => setCheckKey(e.target.value)}
            className="flex-1"
          />
          <div className="pt-6">
            <Button onClick={handleValidate} disabled={!checkKey || validating || !formData.baseUrl.trim()} variant="secondary">
              {validating ? "Checking..." : "Check"}
            </Button>
          </div>
        </div>
        <Input
          label="Model ID (optional)"
          value={checkModelId}
          onChange={(e: any) => setCheckModelId(e.target.value)}
          placeholder="e.g. my-model-id"
          hint="If provider lacks /models endpoint, enter a model ID to validate via chat/completions instead."
        />
        {validationResult && (
          <Badge variant={validationResult === "success" ? "success" : "error"}>
            {validationResult === "success" ? "Valid" : "Invalid"}
          </Badge>
        )}
        <div className="flex gap-2">
          <Button onClick={handleSubmit} fullWidth disabled={!formData.name.trim() || !formData.prefix.trim() || !formData.baseUrl.trim() || saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button onClick={onClose} variant="ghost" fullWidth>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

EditCompatibleNodeModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  node: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    prefix: PropTypes.string,
    apiType: PropTypes.string,
    baseUrl: PropTypes.string,
  }),
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  isAnthropic: PropTypes.bool,
};

function AddCustomModelModal({ isOpen, providerAlias, providerDisplayAlias, onSave, onClose }: any) {
  const { activeWorkspace } = useWorkspace();
  const [modelId, setModelId] = useState("");
  const [testStatus, setTestStatus] = useState<string | null>(null); // null | "testing" | "ok" | "error"
  const [testError, setTestError] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) { setModelId(""); setTestStatus(null); setTestError(""); }
  }, [isOpen]);

  const handleTest = async () => {
    if (!modelId.trim()) return;
    if (!activeWorkspace) return;
    setTestStatus("testing");
    setTestError("");
    try {
      const res = await fetch("/api/models/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Id": activeWorkspace?.id || ""
        },
        body: JSON.stringify({ model: `${providerAlias}/${modelId.trim()}` }),
      });
      const data = await res.json();
      setTestStatus(data.ok ? "ok" : "error");
      setTestError(data.error || "");
    } catch (err) {
      setTestStatus("error");
      setTestError((err as any).message);
    }
  };

  const handleSave = async () => {
    if (!modelId.trim() || saving) return;
    setSaving(true);
    try {
      await onSave(modelId.trim());
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: any) => {
    if (e.key === "Enter") handleTest();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Custom Model">
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Model ID</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={modelId}
              onChange={(e: any) => { setModelId(e.target.value); setTestStatus(null); setTestError(""); }}
              onKeyDown={handleKeyDown}
              placeholder="e.g. claude-opus-4-5"
              className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-primary"
              autoFocus
            />
            <Button
              variant="secondary"
              icon="science"
              loading={testStatus === "testing"}
              onClick={handleTest}
              disabled={!modelId.trim() || testStatus === "testing"}
            >
              {testStatus === "testing" ? "Testing..." : "Test"}
            </Button>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Sent to provider as: <code className="font-mono bg-sidebar px-1 rounded">{modelId.trim() || "model-id"}</code>
          </p>
        </div>

        {/* Test result */}
        {testStatus === "ok" && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <span className="material-symbols-outlined text-base">check_circle</span>
            Model is reachable
          </div>
        )}
        {testStatus === "error" && (
          <div className="flex items-start gap-2 text-sm text-red-500">
            <span className="material-symbols-outlined text-base shrink-0">cancel</span>
            <span>{testError || "Model not reachable"}</span>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button onClick={onClose} variant="ghost" fullWidth size="sm">Cancel</Button>
          <Button
            onClick={handleSave}
            fullWidth
            size="sm"
            disabled={!modelId.trim() || saving}
          >
            {saving ? "Adding..." : "Add Model"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

AddCustomModelModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  providerAlias: PropTypes.string.isRequired,
  providerDisplayAlias: PropTypes.string.isRequired,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

