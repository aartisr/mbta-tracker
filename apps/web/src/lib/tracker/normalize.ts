import type { TrackerAlert, TrackerMode, TrackerTrip, TrackerVehicle } from './types';
import { ModeService } from './services';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return isFiniteNumber(value) ? value : null;
}

function asNumberLike(value: unknown): number | null {
  if (isFiniteNumber(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function looksLikeFerryRoute(routeId: string | null): boolean {
  if (!routeId) {
    return false;
  }

  const id = routeId.trim().toLowerCase();
  return id.startsWith('boat-') || /^f\d+$/.test(id);
}

/**
 * Normalize mode using ModeService with fallback to legacy detection
 * ModeService implements a 5-level priority detection strategy
 */
function normalizeMode(
  modeValue: string | null,
  routeId: string | null,
  routeLabel: string | null,
  routeType: number | null
): TrackerMode {
  // Use ModeService for consistent, priority-based mode detection
  return ModeService.detectMode({
    mode: modeValue,
    routeId,
    routeLabel,
    routeType
  });
}

/**
 * @deprecated Use normalizeMode() instead, which uses ModeService
 * Kept for reference only - inferMode logic is now in ModeService
 */
function inferMode(routeId: string | null, label: string | null, routeType: number | null): TrackerMode {
  if (routeType !== null) {
    if (routeType === 4) {
      return 'ferry';
    }
    if (routeType === 2) {
      return 'commuter-rail';
    }
    if (routeType === 0 || routeType === 1) {
      return 'subway';
    }
    if (routeType === 3) {
      return 'bus';
    }
  }

  if (looksLikeFerryRoute(routeId)) {
    return 'ferry';
  }

  const candidate = `${routeId ?? ''} ${label ?? ''}`.toLowerCase();
  if (candidate.includes('red') || candidate.includes('orange') || candidate.includes('blue') || candidate.includes('green')) {
    return 'subway';
  }
  if (candidate.includes('cr-') || candidate.includes('commuter') || candidate.includes('rail')) {
    return 'commuter-rail';
  }
  if (candidate.includes('boat') || candidate.includes('ferry')) {
    return 'ferry';
  }
  if (candidate.length > 0) {
    return 'bus';
  }
  return 'all';
}

function collectStrings(...values: unknown[]): string | null {
  for (const value of values) {
    const next = asString(value);
    if (next) {
      return next;
    }
  }
  return null;
}

function normalizeVehicle(raw: unknown): TrackerVehicle | null {
  if (!isRecord(raw)) {
    return null;
  }

  const nested = isRecord(raw.vehicle) ? raw.vehicle : null;
  const position = isRecord(raw.position) ? raw.position : null;
  const routeId = collectStrings(raw.routeId, raw.route_id, raw.route, nested?.routeId, nested?.route_id, nested?.route);
  const routeLabel = collectStrings(raw.routeLabel, raw.route_label, raw.label, nested?.label, routeId);
  const routeType = asNumberLike(raw.routeType ?? raw.route_type ?? nested?.routeType ?? nested?.route_type);
  const lat = asNumber(raw.lat ?? nested?.lat ?? position?.latitude);
  const lon = asNumber(raw.lon ?? nested?.lon ?? position?.longitude);
  const id = collectStrings(raw.id, nested?.id);
  const bearingValue = asNumber(raw.bearing ?? nested?.bearing ?? position?.bearing);
  const stopId = collectStrings(raw.stopId, raw.stop_id, raw.currentStopId, raw.current_stop_id, nested?.stopId, nested?.stop_id);
  const stopSequence = asNumber(raw.stopSequence ?? raw.stop_sequence ?? raw.currentStopSequence ?? raw.current_stop_sequence);
  const directionId = asNumber(raw.directionId ?? raw.direction_id ?? nested?.directionId ?? nested?.direction_id);
  const headsign = collectStrings(raw.headsign, raw.tripHeadsign, raw.trip_headsign, raw.destination, raw.direction, nested?.headsign, nested?.trip_headsign);

  if (!id || lat === null || lon === null) {
    return null;
  }

  const modeValue = collectStrings(raw.mode, nested?.mode);

  return {
    id,
    routeId,
    routeLabel,
    routeType,
    mode: normalizeMode(modeValue, routeId, routeLabel, routeType),
    directionId,
    headsign,
    stopId,
    stopSequence,
    lat,
    lon,
    bearing: bearingValue ?? 0,
    timestamp: collectStrings(raw.timestamp, nested?.timestamp)
  };
}

function normalizeAlert(raw: unknown): TrackerAlert | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id = collectStrings(raw.id, raw.alertId, raw.alert_id);
  const title = collectStrings(raw.title, raw.header, raw.header_text, raw.name);
  const detail = collectStrings(raw.detail, raw.description, raw.description_text, raw.text);
  const severity = collectStrings(raw.severity, raw.effect);

  if (!id || !title) {
    return null;
  }

  return {
    id,
    title,
    detail,
    severity: severity === 'low' || severity === 'medium' || severity === 'high' ? severity : 'unknown'
  };
}

function normalizeTrip(raw: unknown): TrackerTrip | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id = collectStrings(raw.id, raw.trip_id, raw.tripId);
  const routeId = collectStrings(raw.routeId, raw.route_id, raw.route);
  const routeLabel = collectStrings(raw.routeLabel, raw.route_label, routeId);
  const headsign = collectStrings(raw.headsign, raw.direction, raw.destination, raw.tripHeadsign, raw.trip_headsign);
  const directionId = asNumber(raw.directionId ?? raw.direction_id);
  const stopId = collectStrings(raw.stopId, raw.stop_id, raw.currentStopId, raw.current_stop_id);
  const stopCount = asNumber(raw.stopCount ?? raw.stop_count);
  const etaMinutes = asNumber(raw.etaMinutes ?? raw.eta_minutes);
  const liveVehicleCount = asNumber(raw.liveVehicleCount ?? raw.live_vehicle_count);
  const scheduleRelationship = collectStrings(raw.scheduleRelationship, raw.schedule_relationship);

  if (!id) {
    return null;
  }

  return {
    id,
    routeId,
    routeLabel,
    headsign,
    mode: normalizeMode(null, routeId, routeLabel, null),
    directionId,
    stopId,
    etaMinutes,
    stopCount,
    liveVehicleCount: liveVehicleCount ?? 0,
    scheduleRelationship
  };
}

export function parseVehicleList(payload: unknown): TrackerVehicle[] {
  if (Array.isArray(payload)) {
    return payload.map(normalizeVehicle).filter((entry): entry is TrackerVehicle => entry !== null);
  }

  if (isRecord(payload)) {
    if (Array.isArray(payload.vehicles)) {
      return payload.vehicles.map(normalizeVehicle).filter((entry): entry is TrackerVehicle => entry !== null);
    }

    if (Array.isArray(payload.entities)) {
      return payload.entities.map(normalizeVehicle).filter((entry): entry is TrackerVehicle => entry !== null);
    }

    const single = normalizeVehicle(payload);
    return single ? [single] : [];
  }

  return [];
}

export function parseAlertList(payload: unknown): TrackerAlert[] {
  if (Array.isArray(payload)) {
    return payload.map(normalizeAlert).filter((entry): entry is TrackerAlert => entry !== null);
  }

  if (isRecord(payload)) {
    if (Array.isArray(payload.alerts)) {
      return payload.alerts.map(normalizeAlert).filter((entry): entry is TrackerAlert => entry !== null);
    }

    const single = normalizeAlert(payload);
    return single ? [single] : [];
  }

  return [];
}

export function parseTripList(payload: unknown): TrackerTrip[] {
  if (Array.isArray(payload)) {
    return payload.map(normalizeTrip).filter((entry): entry is TrackerTrip => entry !== null);
  }

  if (isRecord(payload)) {
    if (Array.isArray(payload.trips)) {
      return payload.trips.map(normalizeTrip).filter((entry): entry is TrackerTrip => entry !== null);
    }

    if (Array.isArray(payload.tripUpdates)) {
      return payload.tripUpdates.map(normalizeTrip).filter((entry): entry is TrackerTrip => entry !== null);
    }

    const single = normalizeTrip(payload);
    return single ? [single] : [];
  }

  return [];
}

export { normalizeVehicle as parseVehicle };

export function sortVehicles(vehicles: TrackerVehicle[]): TrackerVehicle[] {
  return [...vehicles].sort((left, right) => {
    const leftTime = left.timestamp ? Date.parse(left.timestamp) : 0;
    const rightTime = right.timestamp ? Date.parse(right.timestamp) : 0;
    if (rightTime !== leftTime) {
      return rightTime - leftTime;
    }
    return left.id.localeCompare(right.id);
  });
}

export function buildTripSummaries(vehicles: TrackerVehicle[]): TrackerTrip[] {
  const groups = new Map<string, TrackerTrip>();

  for (const vehicle of vehicles) {
    const key = vehicle.routeId ?? vehicle.routeLabel ?? vehicle.id;
    const existing = groups.get(key);
    const liveVehicleCount = (existing?.liveVehicleCount ?? 0) + 1;

    groups.set(key, {
      id: key,
      routeId: vehicle.routeId,
      routeLabel: vehicle.routeLabel,
      headsign: null,
      mode: vehicle.mode,
      directionId: vehicle.directionId,
      stopId: vehicle.stopId,
      etaMinutes: null,
      stopCount: existing?.stopCount ?? null,
      liveVehicleCount,
      scheduleRelationship: null
    });
  }

  return [...groups.values()].sort((left, right) => right.liveVehicleCount - left.liveVehicleCount);
}

export function mergeTripData(payload: unknown, vehicles: TrackerVehicle[]): TrackerTrip[] {
  const trips = parseTripList(payload);
  return trips.length > 0 ? trips : buildTripSummaries(vehicles);
}

export function mergeAlertData(payload: unknown): TrackerAlert[] {
  return parseAlertList(payload);
}
