import { create } from 'zustand';

interface SocketState {
  isConnected: boolean;
  isConnecting: boolean;
  socketId: string | null;
  reconnectAttempts: number;
}

interface SocketActions {
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setSocketId: (socketId: string | null) => void;
  incrementReconnect: () => void;
  resetReconnect: () => void;
}

type SocketStore = SocketState & SocketActions;

export const useSocketStore = create<SocketStore>((set) => ({
  isConnected: false,
  isConnecting: false,
  socketId: null,
  reconnectAttempts: 0,

  setConnected: (isConnected) =>
    set({ isConnected, isConnecting: isConnected ? false : undefined }),

  setConnecting: (isConnecting) => set({ isConnecting }),

  setSocketId: (socketId) => set({ socketId }),

  incrementReconnect: () => set((state) => ({ reconnectAttempts: state.reconnectAttempts + 1 })),

  resetReconnect: () => set({ reconnectAttempts: 0 }),
}));
