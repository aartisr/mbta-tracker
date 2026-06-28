import { vehicles, wsRetryIn, wsStatus } from './store';
import { resolveRealtimeSocketUrl } from './tracker/realtime-url';
const map=new Map();

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectTick: ReturnType<typeof setInterval> | null = null;
let reconnectAttempts = 0;

const MAX_BACKOFF_MS = 30000;

function resolveWsUrl(){
  return resolveRealtimeSocketUrl(null);
}

function nextBackoffMs(){
  const base = Math.min(1000 * (2 ** reconnectAttempts), MAX_BACKOFF_MS);
  const jitter = Math.floor(Math.random() * 250);
  reconnectAttempts += 1;
  return base + jitter;
}

function scheduleReconnect(){
  if (reconnectTimer) return;
  wsStatus.set('reconnecting');
  const delay = nextBackoffMs();
  let remainingMs = delay;
  wsRetryIn.set(Math.ceil(remainingMs / 1000));

  if (reconnectTick) {
    clearInterval(reconnectTick);
    reconnectTick = null;
  }

  reconnectTick = setInterval(() => {
    remainingMs = Math.max(remainingMs - 1000, 0);
    wsRetryIn.set(Math.ceil(remainingMs / 1000));
    if (remainingMs === 0 && reconnectTick) {
      clearInterval(reconnectTick);
      reconnectTick = null;
    }
  }, 1000);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    wsRetryIn.set(0);
    if (reconnectTick) {
      clearInterval(reconnectTick);
      reconnectTick = null;
    }
    connect();
  }, delay);
}

function connect(){
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  wsStatus.set('connecting');
  wsRetryIn.set(0);
  const socket = new WebSocket(resolveWsUrl());
  ws = socket;

  socket.onopen = () => {
    reconnectAttempts = 0;
    wsStatus.set('open');
    wsRetryIn.set(0);
    if (reconnectTick) {
      clearInterval(reconnectTick);
      reconnectTick = null;
    }
  };

  socket.onmessage = (e) => {
    try {
      const updates = JSON.parse(e.data);
      for (const v of updates) {
        map.set(v.id, v);
      }
      vehicles.set(new Map(map));
    } catch {
      // Ignore malformed payloads and keep the connection alive.
    }
  };

  socket.onclose = () => {
    if (ws === socket) {
      ws = null;
    }
    wsStatus.set('closed');
    scheduleReconnect();
  };

  socket.onerror = () => {
    try {
      socket.close();
    } catch {
      // Ignore close errors.
    }
  };
}

export function startWS(){
  connect();
}
