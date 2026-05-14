import { create } from "zustand";

interface ProviderState {
  connections: any[];
  nodes: any[];
  loading: boolean;
  refreshing: boolean;
  error: any;
  fetchIfStale: (workspaceId?: string) => Promise<void>;
  setConnections: (fn: any) => void;
  setNodes: (fn: any) => void;
}

const useProviderStore = create<ProviderState>((set) => ({
  connections: [],
  nodes: [],
  loading: false,
  refreshing: false,
  error: null,
  fetchIfStale: async (workspaceId) => {
    // Logic to fetch connections if stale
  },
  setConnections: (fn) => set((state) => ({ 
    connections: typeof fn === 'function' ? fn(state.connections) : fn 
  })),
  setNodes: (fn) => set((state) => ({ 
    nodes: typeof fn === 'function' ? fn(state.nodes) : fn 
  })),
}));

export default useProviderStore;
