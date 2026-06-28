import type { MBTAStop, NearbyArrival } from './geo-types';
import type { TrackerVehicle } from './types';
import { modeLabel, directionLabel, bearingLabel, formatRelativeTimestamp } from './formatters';

export type RouteAccent = {
  accent: string;
  soft: string;
  text: string;
};

export const ROUTE_ACCENTS: Record<string, RouteAccent> = {
  red:      { accent: '#da291c', soft: 'rgba(218, 41, 28, 0.14)',  text: '#8a1d15' },
  orange:   { accent: '#ed8b00', soft: 'rgba(237, 139, 0, 0.18)',  text: '#8a4f00' },
  blue:     { accent: '#003da5', soft: 'rgba(0, 61, 165, 0.14)',   text: '#0b3276' },
  green:    { accent: '#00843d', soft: 'rgba(0, 132, 61, 0.14)',   text: '#0d5a31' },
  silver:   { accent: '#7c878e', soft: 'rgba(124, 135, 142, 0.18)',text: '#4b5560' },
  mattapan: { accent: '#da291c', soft: 'rgba(218, 41, 28, 0.14)',  text: '#8a1d15' },
};

export function routeAccent(routeId: string | null, mode: TrackerVehicle['mode']): RouteAccent {
  const id = (routeId ?? '').toLowerCase();

  if (id.startsWith('green')) return ROUTE_ACCENTS.green;
  if (ROUTE_ACCENTS[id]) return ROUTE_ACCENTS[id];

  if (mode === 'subway')       return { accent: '#003da5', soft: 'rgba(0, 61, 165, 0.16)',    text: '#002d7c' };
  if (mode === 'bus')          return { accent: '#ffc72c', soft: 'rgba(255, 199, 44, 0.22)', text: '#1f2937' };
  if (mode === 'commuter-rail')return { accent: '#80276c', soft: 'rgba(128, 39, 108, 0.16)', text: '#5e1c50' };
  if (mode === 'ferry')        return { accent: '#0284c7', soft: 'rgba(2, 132, 199, 0.16)',  text: '#075985' };

  return { accent: '#1d4ed8', soft: 'rgba(29, 78, 216, 0.14)', text: '#1e40af' };
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Fetch official MBTA predictions for a stop using the Predictions API.
 * Returns real arrival data, or an empty array on any failure — never fabricates.
 */
export async function fetchStopPredictions(
  stopId: string,
  apiKey?: string
): Promise<NearbyArrival[]> {
  try {
    const params = new URLSearchParams({
      'filter[stop]': stopId,
      include: 'route,vehicle',
      sort: 'arrival_time',
      'page[limit]': '6'
    });

    const headers: HeadersInit = { Accept: 'application/vnd.api+json' };
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    const response = await fetch(`https://api-v3.mbta.com/predictions?${params}`, { headers });
    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as {
      data?: Array<{
        attributes?: { arrival_time?: string | null; departure_time?: string | null };
        relationships?: {
          route?: { data?: { id?: string } };
          vehicle?: { data?: { id?: string } | null };
        };
      }>;
      included?: Array<{
        type?: string;
        id?: string;
        attributes?: { short_name?: string; long_name?: string; type?: number };
      }>;
    };

    const routeLabels = new Map<string, string>();
    const routeTypes = new Map<string, number>();
    for (const item of data.included ?? []) {
      if (item.type === 'route' && item.id) {
        routeLabels.set(item.id, item.attributes?.short_name || item.attributes?.long_name || item.id);
        if (item.attributes?.type !== undefined) {
          routeTypes.set(item.id, item.attributes.type);
        }
      }
    }

    const now = Date.now();
    const arrivals: NearbyArrival[] = [];

    for (const prediction of data.data ?? []) {
      const timeStr = prediction.attributes?.arrival_time ?? prediction.attributes?.departure_time;
      if (!timeStr) continue;

      const arrivalSeconds = Math.round((new Date(timeStr).getTime() - now) / 1000);
      if (arrivalSeconds < 0 || arrivalSeconds > 3600) continue;

      const routeId = prediction.relationships?.route?.data?.id ?? null;
      const vehicleId = prediction.relationships?.vehicle?.data?.id ?? 'unknown';
      const rtype = routeId ? (routeTypes.get(routeId) ?? 3) : 3;

      arrivals.push({
        vehicleId,
        routeId,
        routeLabel: routeId ? (routeLabels.get(routeId) ?? routeId) : null,
        mode: rtype === 0 || rtype === 1 ? 'subway' : rtype === 2 ? 'commuter-rail' : rtype === 4 ? 'ferry' : 'bus',
        arrivalSeconds,
        confidenceSeconds: 30,
        wheelchairAccessible: false,
        hasAudioAnnouncements: false
      });
    }

    return arrivals.slice(0, 5);
  } catch {
    return [];
  }
}

/** Shown immediately while predictions are being fetched. */
export function buildStopPopupLoadingHtml(stop: MBTAStop): string {
  return `
    <div class="stop-popup">
      <h4>${escapeHtml(stop.name)}</h4>
      <p class="stop-popup-meta">Stop ID: ${escapeHtml(stop.id)}</p>
      <p class="stop-popup-meta">${stop.wheelchairAccessible ? 'Wheelchair accessible' : 'Accessibility info unavailable'}</p>
      <p class="stop-popup-loading">Loading arrivals…</p>
    </div>
  `;
}

export function buildStopPopupHtml(stop: MBTAStop, arrivals: NearbyArrival[]): string {
  const arrivalsHtml =
    arrivals.length > 0
      ? `<ul class="stop-popup-arrivals">${arrivals
          .map((a) => {
            const mins = Math.max(0, Math.round(a.arrivalSeconds / 60));
            const label = escapeHtml(a.routeLabel ?? a.routeId ?? '?');
            return `<li><strong>${label}</strong> in ${mins} min</li>`;
          })
          .join('')}</ul>`
      : '<p class="stop-popup-muted">No scheduled arrivals in the next hour.</p>';

  return `
    <div class="stop-popup">
      <h4>${escapeHtml(stop.name)}</h4>
      <p class="stop-popup-meta">Stop ID: ${escapeHtml(stop.id)}</p>
      <p class="stop-popup-meta">${stop.wheelchairAccessible ? 'Wheelchair accessible' : 'Accessibility info unavailable'}</p>
      ${arrivalsHtml}
    </div>
  `;
}

export function buildVehiclePopupHtml(vehicle: TrackerVehicle): string {
  const accent = routeAccent(vehicle.routeId, vehicle.mode);
  const route    = escapeHtml(vehicle.routeLabel ?? vehicle.routeId ?? 'Unknown route');
  const mode     = escapeHtml(modeLabel(vehicle.mode));
  const vehicleId= escapeHtml(vehicle.id);
  const direction= escapeHtml(directionLabel(vehicle.directionId));
  const heading  = escapeHtml(bearingLabel(vehicle.bearing));
  const stop     = escapeHtml(vehicle.stopId ?? 'Stop unavailable');
  const sequence = vehicle.stopSequence === null ? 'N/A' : String(vehicle.stopSequence);
  const freshness= escapeHtml(formatRelativeTimestamp(vehicle.timestamp));

  return `
    <div class="vehicle-popup" style="--vehicle-accent:${accent.accent}; --vehicle-accent-soft:${accent.soft}; --vehicle-accent-text:${accent.text};">
      <div class="vehicle-popup-top">
        <strong class="vehicle-popup-route">${route}</strong>
        <span class="vehicle-popup-mode">${mode}</span>
      </div>
      <p class="vehicle-popup-freshness">${freshness}</p>
      <dl class="vehicle-popup-grid">
        <div><dt>Vehicle</dt><dd>${vehicleId}</dd></div>
        <div><dt>Direction</dt><dd>${direction}</dd></div>
        <div><dt>Heading</dt><dd>${heading}</dd></div>
        <div><dt>Next stop</dt><dd>${stop}</dd></div>
        <div><dt>Stop seq</dt><dd>${sequence}</dd></div>
        <div><dt>Location</dt><dd>${vehicle.lat.toFixed(4)}, ${vehicle.lon.toFixed(4)}</dd></div>
      </dl>
    </div>
  `;
}

export function buildClusterPopupHtml(count: number): string {
  return `
    <div class="vehicle-popup" style="--vehicle-accent:#0f172a; --vehicle-accent-soft:rgba(15, 23, 42, 0.12); --vehicle-accent-text:#0f172a;">
      <div class="vehicle-popup-top">
        <strong class="vehicle-popup-route">${count} live vehicles</strong>
        <span class="vehicle-popup-mode">Cluster</span>
      </div>
      <p class="vehicle-popup-freshness">Zoom in or click to expand this area.</p>
    </div>
  `;
}
