import type { TrackerWidgetConfig } from './types';

const DEFAULT_CENTER: [number, number] = [-71.0589, 42.3601];
const DEFAULT_MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

export const DEFAULT_TRACKER_CONFIG: TrackerWidgetConfig = {
  title: 'MBTA Live',
  subtitle: 'Realtime transit tracker',
  wsUrl: null,
  mapStyle: DEFAULT_MAP_STYLE,
  center: DEFAULT_CENTER,
  zoom: 11.25,
  focusAddress: null,
  showList: true,
  showAlerts: true,
  showSearch: true,
  embedded: false
};

function parseBoolean(value: string | null, fallback: boolean): boolean {
  if (value === null) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function parseNumber(value: string | null, fallback: number): number {
  if (value === null) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseCenter(value: string | null): [number, number] | null {
  if (!value) return null;
  const parts = value.split(',').map((entry) => Number(entry.trim()));
  if (parts.length !== 2 || parts.some((entry) => !Number.isFinite(entry))) {
    return null;
  }
  return [parts[0], parts[1]];
}

function parseWsUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const resolved = new URL(value, 'http://localhost');
    if (resolved.protocol === 'ws:' || resolved.protocol === 'wss:') {
      return resolved.toString();
    }

    if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
      resolved.protocol = resolved.protocol === 'http:' ? 'ws:' : 'wss:';
      return resolved.toString();
    }
  } catch {
    return null;
  }

  return null;
}

export function createTrackerConfig(url: URL, embedded = false): TrackerWidgetConfig {
  const center = parseCenter(url.searchParams.get('center')) ?? DEFAULT_CENTER;
  const title = url.searchParams.get('title')?.trim() || DEFAULT_TRACKER_CONFIG.title;
  const subtitle = url.searchParams.get('subtitle')?.trim() || DEFAULT_TRACKER_CONFIG.subtitle;

  return {
    title,
    subtitle,
    wsUrl: parseWsUrl(url.searchParams.get('ws')),
    mapStyle: url.searchParams.get('style')?.trim() || DEFAULT_TRACKER_CONFIG.mapStyle,
    center,
    zoom: parseNumber(url.searchParams.get('zoom'), embedded ? 10.75 : DEFAULT_TRACKER_CONFIG.zoom),
    focusAddress: null,
    showList: parseBoolean(url.searchParams.get('list'), DEFAULT_TRACKER_CONFIG.showList),
    showAlerts: parseBoolean(url.searchParams.get('alerts'), DEFAULT_TRACKER_CONFIG.showAlerts),
    showSearch: parseBoolean(url.searchParams.get('search'), DEFAULT_TRACKER_CONFIG.showSearch),
    embedded: parseBoolean(url.searchParams.get('embed'), embedded)
  };
}

export function getDefaultMapCenter(): [number, number] {
  return DEFAULT_CENTER;
}
