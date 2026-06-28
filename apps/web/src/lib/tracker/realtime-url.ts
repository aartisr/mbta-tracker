const DEFAULT_LOCAL_WS_URL = 'ws://localhost:8080';
const DEFAULT_PROD_WS_URL = 'wss://mbta-realtime-worker.ravikumar-raman.workers.dev/ws';

export function normalizeSocketUrl(candidate: string | null | undefined): string | null {
  if (!candidate) {
    return null;
  }

  if (candidate.startsWith('ws://') || candidate.startsWith('wss://')) {
    return candidate;
  }

  if (candidate.startsWith('http://')) {
    return candidate.replace('http://', 'ws://');
  }

  if (candidate.startsWith('https://')) {
    return candidate.replace('https://', 'wss://');
  }

  return candidate;
}

export function resolveRealtimeSocketUrl(preferred?: string | null): string {
  const configured = normalizeSocketUrl(preferred) ?? normalizeSocketUrl(import.meta.env.PUBLIC_WS_URL ?? null);
  if (configured) {
    return configured;
  }

  if (typeof window === 'undefined') {
    return DEFAULT_LOCAL_WS_URL;
  }

  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return `ws://${host}:8080`;
  }

  return DEFAULT_PROD_WS_URL;
}
