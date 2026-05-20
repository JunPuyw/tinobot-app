import { create } from "zustand";

interface ProviderConnection {
  id: string;
  provider: string;
  authType: string;
  isActive: boolean;
  testStatus?: string;
  lastError?: string;
  lastErrorAt?: string;
  errorCode?: string;
  name?: string;
  priority?: number;
  [key: string]: any;
}

interface ProviderNode {
  id: string;
  name?: string;
  type: string;
  apiType?: string;
  baseUrl?: string;
  [key: string]: any;
}

interface ProviderState {
  connections: ProviderConnection[];
  nodes: ProviderNode[];
  loading: boolean;
  refreshing: boolean;
  error: any;
  lastFetched: number | null;
  
  fetchIfStale: (workspaceId?: string, force?: boolean) => Promise<void>;
  refresh: (workspaceId?: string) => Promise<void>;
  setConnections: (fn: any) => void;
  setNodes: (fn: any) => void;
}

const useProviderStore = create<ProviderState>((set, get) => ({
  connections: [],
  nodes: [],
  loading: false,
  refreshing: false,
  error: null,
  lastFetched: null,

  fetchIfStale: async (workspaceId, force = false) => {
    const { lastFetched, loading, refreshing } = get();
    const now = Date.now();
    
    // Only fetch if forced or haven't fetched in last 30 seconds
    if (!force && lastFetched && (now - lastFetched < 30000)) {
      return;
    }

    if (loading || refreshing) return;

    set({ loading: true });
    try {
      const headers: any = {};
      if (workspaceId) headers["X-Workspace-Id"] = workspaceId;

      const [connRes, nodesRes] = await Promise.all([
        fetch("/api/auth/user/providers", { headers, cache: "no-store" }),
        fetch("/api/provider-nodes", { cache: "no-store" })
      ]);

      const connData = await connRes.json();
      const nodesData = await nodesRes.json();

      set({ 
        connections: connData.connections || [], 
        nodes: nodesData.nodes || [],
        lastFetched: now,
        error: null 
      });
    } catch (err) {
      set({ error: err });
    } finally {
      set({ loading: false });
    }
  },

  refresh: async (workspaceId) => {
    set({ refreshing: true });
    try {
      const headers: any = {};
      if (workspaceId) headers["X-Workspace-Id"] = workspaceId;

      const res = await fetch("/api/auth/user/providers", { headers, cache: "no-store" });
      const data = await res.json();

      set({ 
        connections: data.connections || [], 
        lastFetched: Date.now(),
        error: null 
      });
    } catch (err) {
      set({ error: err });
    } finally {
      set({ refreshing: false });
    }
  },

  setConnections: (fn) => set((state) => ({ 
    connections: typeof fn === 'function' ? fn(state.connections) : fn 
  })),
  
  setNodes: (fn) => set((state) => ({ 
    nodes: typeof fn === 'function' ? fn(state.nodes) : fn 
  })),
}));

export default useProviderStore;
