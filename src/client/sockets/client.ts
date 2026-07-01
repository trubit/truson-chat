import { io, Socket } from 'socket.io-client';
import { useSocketStore } from '@/store/socketStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

type EventCallback = (...args: unknown[]) => void;

class SocketManager {
  private socket: Socket | null = null;

  connect(token: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket?.disconnect();

    const { setConnecting, setConnected, setSocketId, incrementReconnect, resetReconnect } =
      useSocketStore.getState();

    setConnecting(true);

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 30_000,
      randomizationFactor: 0.5,
      timeout: 20_000,
    });

    this.socket.on('connect', () => {
      setConnected(true);
      setSocketId(this.socket?.id ?? null);
      resetReconnect();
    });

    this.socket.on('disconnect', (reason) => {
      setConnected(false);
      setSocketId(null);
      if (reason === 'io server disconnect') {
        setConnecting(false);
      }
    });

    this.socket.on('connect_error', () => {
      setConnecting(false);
      incrementReconnect();
    });

    this.socket.on('reconnect_attempt', () => {
      setConnecting(true);
    });

    this.socket.on('reconnect', () => {
      setConnected(true);
      setSocketId(this.socket?.id ?? null);
      resetReconnect();
    });

    this.socket.on('reconnect_failed', () => {
      setConnecting(false);
      setConnected(false);
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      const { setConnected, setConnecting, setSocketId } = useSocketStore.getState();
      setConnected(false);
      setConnecting(false);
      setSocketId(null);
    }
  }

  on(event: string, callback: EventCallback): void {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: EventCallback): void {
    this.socket?.off(event, callback);
  }

  emit(event: string, ...args: unknown[]): void {
    if (!this.socket?.connected) {
      console.warn(`[SocketManager] Cannot emit "${event}": socket not connected.`);
      return;
    }
    this.socket.emit(event, ...args);
  }

  emitWithAck<T = unknown>(event: string, ...args: unknown[]): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error(`Cannot emit "${event}": socket not connected.`));
        return;
      }
      this.socket.emit(event, ...args, (response: T) => resolve(response));
    });
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  get id(): string | undefined {
    return this.socket?.id;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketManager = new SocketManager();
