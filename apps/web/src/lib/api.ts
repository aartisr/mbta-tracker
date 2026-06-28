import { browser } from '$app/environment';

const PUBLIC_API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL as string | undefined;

export function getApiBaseUrl(): string {
  const configured = PUBLIC_API_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  if (browser && typeof window !== 'undefined') {
    return window.location.origin;
  }

  return 'http://localhost:5173';
}

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalizedPath, getApiBaseUrl()).toString();
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), init);
}
