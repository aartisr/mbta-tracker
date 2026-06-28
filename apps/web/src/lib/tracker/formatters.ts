import type { TrackerAlert, TrackerTrip, TrackerVehicle } from './types';

export function modeLabel(mode: TrackerVehicle['mode']): string {
  return mode === 'commuter-rail' ? 'Commuter Rail' : mode.charAt(0).toUpperCase() + mode.slice(1);
}

export function directionLabel(directionId: number | null): string {
  if (directionId === null) {
    return 'Not reported';
  }
  return directionId === 0 ? 'Outbound' : directionId === 1 ? 'Inbound' : `Direction ${directionId}`;
}

export function bearingLabel(bearing: number): string {
  const normalized = ((bearing % 360) + 360) % 360;
  const compass = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(normalized / 45) % 8;
  return `${Math.round(normalized)}° ${compass[index]}`;
}

export function formatRelativeTimestamp(timestamp: string | null): string {
  if (!timestamp) {
    return 'Just now';
  }

  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) {
    return 'Live update';
  }

  const deltaSeconds = Math.max(0, Math.round((Date.now() - parsed) / 1000));
  if (deltaSeconds < 15) {
    return 'Updated moments ago';
  }
  if (deltaSeconds < 60) {
    return `Updated ${deltaSeconds}s ago`;
  }

  const minutes = Math.round(deltaSeconds / 60);
  if (minutes < 60) {
    return `Updated ${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);
  return `Updated ${hours}h ago`;
}

export function formatMinutes(minutes: number | null): string {
  if (minutes === null) {
    return 'Live';
  }
  if (minutes <= 0) {
    return 'Now';
  }
  return `${minutes} min`;
}

export function tripTitle(trip: TrackerTrip): string {
  return trip.routeLabel ?? trip.routeId ?? 'Unknown trip';
}

export function routeTitle(routeId: string | null, routeLabel: string | null): string {
  return routeLabel ?? routeId ?? 'Unknown route';
}

export function stopTitle(stopId: string | null): string {
  return stopId ?? 'Stop unavailable';
}

export function normalizeSearch(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function searchCandidates(value: string): string[] {
  const normalized = normalizeSearch(value);
  if (!normalized) {
    return [];
  }

  const stripped = normalized.replace(/[^a-z0-9 ]+/g, '').trim();
  const singular = normalized.endsWith('s') ? normalized.slice(0, -1).trim() : normalized;

  return Array.from(new Set([normalized, stripped, singular].filter((candidate) => candidate.length > 0)));
}

export function vehicleMatchesSearch(vehicle: TrackerVehicle, query: string): boolean {
  const candidates = searchCandidates(query);
  if (candidates.length === 0) {
    return true;
  }

  const haystack = [vehicle.routeId ?? '', vehicle.routeLabel ?? '', vehicle.id].join(' ').toLowerCase();
  return candidates.some((candidate) => haystack.includes(candidate));
}

export function alertTone(alert: TrackerAlert): string {
  return alert.severity === 'high'
    ? 'High'
    : alert.severity === 'medium'
      ? 'Medium'
      : alert.severity === 'low'
        ? 'Low'
        : 'Info';
}
