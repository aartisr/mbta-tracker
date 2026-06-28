/**
 * Realtime Transport Layer
 * 
 * Abstraction for different realtime data delivery mechanisms (WebSocket, SSE, polling).
 * Enables swappable implementations without changing consumer code.
 */

export type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed' | 'error';

export interface TransportMessage {
  vehicles?: unknown[];
  trips?: unknown[];
  alerts?: unknown[];
  timestamp: number;
}

export interface RealtimeTransport {
  /**
   * Establish connection to realtime data source
   */
  connect(): Promise<void>;

  /**
   * Close connection gracefully
   */
  disconnect(): void;

  /**
   * Register event listener
   */
  on(event: 'data' | 'error' | 'close', handler: (payload: any) => void): () => void;

  /**
   * Get current connection status
   */
  status(): ConnectionStatus;

  /**
   * Get time since last successful connection
   */
  lastOpenedAt(): number | null;
}

export interface TransportConfig {
  url: string;
  retryMs?: number;
  maxRetryMs?: number;
  timeout?: number;
}

/**
 * Base class for transport implementations
 * Handles common concerns: reconnection, event dispatch, status tracking
 */
export abstract class BaseTransport implements RealtimeTransport {
  protected listeners = new Map<string, Set<(payload: any) => void>>();
  protected currentStatus: ConnectionStatus = 'idle';
  protected lastOpenedAtTime: number | null = null;
  protected retryAttempts = 0;
  protected maxRetryMs = 30000;
  protected retryMs = 1000;

  constructor(protected config: TransportConfig) {
    this.retryMs = config.retryMs ?? 1000;
    this.maxRetryMs = config.maxRetryMs ?? 30000;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): void;

  on(event: 'data' | 'error' | 'close', handler: (payload: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const set = this.listeners.get(event)!;
    set.add(handler);

    // Return unsubscribe function
    return () => {
      set.delete(handler);
    };
  }

  protected emit(event: string, payload: any): void {
    this.listeners.get(event)?.forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        console.error(`Transport event handler error (${event}):`, error);
      }
    });
  }

  protected setStatus(status: ConnectionStatus): void {
    if (this.currentStatus !== status) {
      this.currentStatus = status;
      if (status === 'open') {
        this.lastOpenedAtTime = Date.now();
        this.retryAttempts = 0;
      }
    }
  }

  status(): ConnectionStatus {
    return this.currentStatus;
  }

  lastOpenedAt(): number | null {
    return this.lastOpenedAtTime;
  }

  protected getBackoffMs(): number {
    const base = Math.min(1000 * Math.pow(2, this.retryAttempts), this.maxRetryMs);
    const jitter = Math.floor(Math.random() * 250);
    return base + jitter;
  }
}

/**
 * WebSocket transport implementation
 */
export class WebSocketTransport extends BaseTransport {
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTick: ReturnType<typeof setInterval> | null = null;
  private started = false;

  async connect(): Promise<void> {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.started = true;
    this.setStatus('connecting');

    try {
      this.socket = new WebSocket(this.config.url);

      this.socket.onopen = () => {
        this.setStatus('open');
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(String(event.data)) as TransportMessage;
          this.emit('data', message);
        } catch (error) {
          this.emit('error', new Error(`Failed to parse message: ${error}`));
        }
      };

      this.socket.onerror = () => {
        this.setStatus('error');
        this.emit('error', new Error('WebSocket transport error'));
      };

      this.socket.onclose = () => {
        this.setStatus('closed');
        this.emit('close', undefined);
        this.scheduleReconnect();
      };
    } catch (error) {
      this.setStatus('error');
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.started = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.reconnectTick) {
      clearInterval(this.reconnectTick);
      this.reconnectTick = null;
    }

    if (this.socket) {
      try {
        this.socket.close(1000, 'disconnect');
      } catch {
        // Ignore errors on already-closed socket
      }
      this.socket = null;
    }

    this.setStatus('closed');
  }

  private scheduleReconnect(): void {
    if (!this.started || this.reconnectTimer) {
      return;
    }

    this.setStatus('reconnecting');
    const delay = this.getBackoffMs();
    this.retryAttempts += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.started) {
        void this.connect();
      }
    }, delay);

    // Tick down reconnect timer for UI feedback
    if (this.reconnectTick) {
      clearInterval(this.reconnectTick);
    }

    let remaining = delay;
    this.reconnectTick = setInterval(() => {
      remaining -= 1000;
      if (remaining <= 0 && this.reconnectTick) {
        clearInterval(this.reconnectTick);
        this.reconnectTick = null;
      }
    }, 1000);
  }
}

/**
 * Server-Sent Events transport implementation
 * Useful for unidirectional realtime updates
 */
export class SSETransport extends BaseTransport {
  private eventSource: EventSource | null = null;
  private started = false;

  async connect(): Promise<void> {
    if (this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) {
      return;
    }

    this.started = true;
    this.setStatus('connecting');

    try {
      this.eventSource = new EventSource(this.config.url);

      this.eventSource.onopen = () => {
        this.setStatus('open');
      };

      this.eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as TransportMessage;
          this.emit('data', message);
        } catch (error) {
          this.emit('error', new Error(`Failed to parse SSE message: ${error}`));
        }
      };

      this.eventSource.onerror = () => {
        this.setStatus('error');
        this.emit('error', new Error('SSE transport error'));
        this.eventSource?.close();
        this.scheduleReconnect();
      };
    } catch (error) {
      this.setStatus('error');
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.started = false;
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.setStatus('closed');
  }

  private scheduleReconnect(): void {
    if (!this.started) {
      return;
    }

    this.setStatus('reconnecting');
    const delay = this.getBackoffMs();
    this.retryAttempts += 1;

    setTimeout(() => {
      if (this.started) {
        void this.connect();
      }
    }, delay);
  }
}
