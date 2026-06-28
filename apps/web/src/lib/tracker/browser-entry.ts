import { installTrackerBootstrap } from './bootstrap';
import { DEFAULT_TRACKER_CONFIG } from './config';
import type { TrackerWidgetConfig } from './types';

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return undefined;
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseCenter(value: string | undefined): [number, number] | undefined {
  if (!value) return undefined;
  const parts = value.split(',').map((entry) => Number(entry.trim()));
  if (parts.length !== 2 || !parts.every((entry) => Number.isFinite(entry))) {
    return undefined;
  }
  return [parts[0], parts[1]];
}

function parseScriptConfig(script: HTMLScriptElement | null): Partial<TrackerWidgetConfig> {
  if (!script) {
    return {};
  }

  const config: Partial<TrackerWidgetConfig> = {};
  const ws = script.dataset.wsUrl ?? script.dataset.ws;

  if (script.dataset.title) config.title = script.dataset.title;
  if (script.dataset.subtitle) config.subtitle = script.dataset.subtitle;
  if (ws) config.wsUrl = ws;
  if (script.dataset.mapStyle) config.mapStyle = script.dataset.mapStyle;

  const center = parseCenter(script.dataset.center);
  if (center) config.center = center;

  const zoom = parseNumber(script.dataset.zoom);
  if (zoom !== undefined) config.zoom = zoom;

  const list = parseBoolean(script.dataset.list);
  if (list !== undefined) config.showList = list;

  const alerts = parseBoolean(script.dataset.alerts);
  if (alerts !== undefined) config.showAlerts = alerts;

  const search = parseBoolean(script.dataset.search);
  if (search !== undefined) config.showSearch = search;

  const embedded = parseBoolean(script.dataset.embed);
  if (embedded !== undefined) config.embedded = embedded;

  return config;
}

function createAutoHost(script: HTMLScriptElement | null): HTMLElement {
  const host = document.createElement('div');
  host.dataset.mbtaTracker = 'auto';
  host.style.width = '100%';
  host.style.maxWidth = '960px';
  host.style.margin = '16px auto';

  if (script?.parentNode) {
    script.parentNode.insertBefore(host, script);
  } else {
    document.body.appendChild(host);
  }

  return host;
}

function bootstrapOneLiner() {
  const script = (document.currentScript instanceof HTMLScriptElement
    ? document.currentScript
    : null);

  installTrackerBootstrap(window);

  const existingHosts = Array.from(document.querySelectorAll<HTMLElement>('[data-mbta-tracker]'));
  if (existingHosts.length > 0) {
    window.MBTATracker?.mountTrackerAuto();
    return;
  }

  const host = createAutoHost(script);
  const config = {
    ...DEFAULT_TRACKER_CONFIG,
    ...parseScriptConfig(script)
  };

  window.MBTATracker?.mountTracker({ target: host, config });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => bootstrapOneLiner(), { once: true });
  } else {
    bootstrapOneLiner();
  }
}
