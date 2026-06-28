import { apiUrl } from '$lib/api';

export type DataSource = 'network' | 'cache';

interface CacheEnvelope<T> {
  data: T;
  fetchedAt: number;
}

export interface ResilientFetchResult<T> {
  data: T;
  source: DataSource;
  fetchedAt: number;
  staleAgeMs: number;
}

export interface ResilientFetchOptions {
  init?: RequestInit;
  cacheTtlMs?: number;
}

function hasStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function readCache<T>(cacheKey: string): CacheEnvelope<T> | null {
  if (!hasStorage()) {
    return null;
  }

  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (typeof parsed?.fetchedAt !== 'number') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeCache<T>(cacheKey: string, envelope: CacheEnvelope<T>): void {
  if (!hasStorage()) {
    return;
  }

  try {
    localStorage.setItem(cacheKey, JSON.stringify(envelope));
  } catch {
    // Ignore storage quota errors.
  }
}

export function formatAgeMinutes(ms: number): string {
  const mins = Math.max(1, Math.round(ms / 60000));
  return `${mins} min`;
}

export async function fetchJsonWithOfflineFallback<T>(
  cacheKey: string,
  url: string,
  options: ResilientFetchOptions = {}
): Promise<ResilientFetchResult<T>> {
  const now = Date.now();
  const { init, cacheTtlMs = 0 } = options;
  const cached = readCache<T>(cacheKey);
  const resolvedUrl = url.startsWith('/api/') ? apiUrl(url) : url;

  try {
    const response = await fetch(resolvedUrl, init);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as T;
    writeCache(cacheKey, {
      data,
      fetchedAt: now
    });

    return {
      data,
      source: 'network',
      fetchedAt: now,
      staleAgeMs: 0
    };
  } catch (error) {
    if (cached) {
      const staleAgeMs = Math.max(0, now - cached.fetchedAt);
      if (cacheTtlMs <= 0 || staleAgeMs <= cacheTtlMs * 6) {
        return {
          data: cached.data,
          source: 'cache',
          fetchedAt: cached.fetchedAt,
          staleAgeMs
        };
      }
    }

    throw error;
  }
}
