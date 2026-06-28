import {
  getMissionCatalog,
  initializeMissionProgress,
  updateMissionProgress,
  buildLeaderboard
} from '../../../../packages/transit-core/src/phase4-missions';
import {
  hashUserId,
  recommendDepartureWindows,
  rankEmergencyAlternatives,
  summarizeCommutes
} from '../../../../packages/transit-core/src/phase3-commute';
import { estimateCrowdingPercent, scoreBoardingOption } from '../../../../packages/transit-core/src/phase2-forecast';
import { resolveRollout } from '../../../../packages/transit-core/src/rollout';
import { SearchQueryParser } from '../../../../packages/transit-core/src/search-parser';
import type { CloudflareApiState, CloudflareApiStateStore } from './cloudflare-state';
import { getDefaultCloudflareApiState } from './cloudflare-state';
import type {
  AddressResult,
  Alert,
  ArrivalForecast,
  BoardingSuggestionOption,
  BoardingSuggestionResponse,
  CommunityPost,
  CommunityPostsResponse,
  CommuteRecommendationResponse,
  CrowdingForecastPoint,
  EmergencyRerouteOption,
  EmergencyRerouteResponse,
  LeaderboardResponse,
  LandmarkResult,
  MissionFeedbackItem,
  MissionFeedbackResponse,
  MissionsResponse,
  MyCommutesResponse,
  PrivacyDashboardResponse,
  QueryType,
  RouteCrowdingForecastResponse,
  RouteCrowdingStopForecast,
  RouteResult,
  RouteStopInfo,
  RouteStopsResponse,
  SearchQuery,
  SearchResponse,
  SearchResult,
  StopArrivals,
  StopCrowdingForecastResponse,
  StopResult,
  VehicleInfoResponse,
  VehicleResult
} from './types';

const MBTA_API_BASE = 'https://api-v3.mbta.com';
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

const searchParser = new SearchQueryParser();

type Json = Record<string, unknown>;

type RoutePayload = {
  id: string;
  attributes?: {
    number?: string;
    name?: string;
    long_name?: string;
    description?: string;
    type?: number;
    direction_names?: string[];
  };
};

type StopPayload = {
  id: string;
  attributes?: {
    name?: string;
    code?: string;
    latitude?: number;
    longitude?: number;
    wheelchair_boarding?: 0 | 1 | 2;
    accessibility?: string[];
    parent_station?: string;
  };
};

type VehiclePayload = {
  id: string;
  attributes?: {
    route_id?: string;
    trip_id?: string;
    label?: string;
    latitude?: number;
    longitude?: number;
    occupancy_status?: string;
    current_status?: string;
  };
  relationships?: {
    route?: { data?: { id?: string } };
    trip?: { data?: { id?: string } };
    stop?: { data?: { id?: string } };
  };
};

type PredictionPayload = {
  id: string;
  attributes?: {
    arrival_time?: string;
    departure_time?: string;
    schedule_relationship?: string;
    status?: string;
    stop_sequence?: number;
  };
  relationships?: {
    stop?: { data?: { id?: string } | null };
    route?: { data?: { id?: string } | null };
    trip?: { data?: { id?: string } | null };
    vehicle?: { data?: { id?: string } | null };
  };
};

type MBTAResponse<T> = {
  data?: T;
  included?: Array<Json & { id?: string; type?: string; attributes?: { name?: string } }>;
  links?: { next?: string | null };
};

type PersistedPhase3State = {
  userCommutes: Record<string, ReturnType<typeof createSeedCommutes>>;
  privacyPreferences: Record<string, { opted_in: boolean; anonymize_after_days: number }>;
};

type PersistedPhase4State = {
  missionProgressByUser: Record<string, ReturnType<typeof initializeMissionProgress>>;
  feedbackItems: MissionFeedbackItem[];
  communityPosts: CommunityPost[];
};

type MetricBucket = {
  requests: number;
  failures: number;
  totalMs?: number;
};

type Metrics = {
  search: MetricBucket;
  stopArrivals: MetricBucket;
  routeStops: MetricBucket;
  vehicleInfo: MetricBucket;
  crowdingForecast: MetricBucket;
  boardingSuggestion: MetricBucket;
  myCommutes: MetricBucket;
  commuteRecommendation: MetricBucket;
  emergencyReroute: MetricBucket;
  privacyDashboard: MetricBucket;
  privacyConsent: MetricBucket;
  missions: MetricBucket;
  missionTracking: MetricBucket;
  leaderboard: MetricBucket;
  missionFeedback: MetricBucket;
  communityPosts: MetricBucket;
  rollout: MetricBucket;
  telemetry: MetricBucket;
};

const defaultMetrics = (): Metrics => ({
  search: { requests: 0, failures: 0, totalMs: 0 },
  stopArrivals: { requests: 0, failures: 0, totalMs: 0 },
  routeStops: { requests: 0, failures: 0, totalMs: 0 },
  vehicleInfo: { requests: 0, failures: 0, totalMs: 0 },
  crowdingForecast: { requests: 0, failures: 0, totalMs: 0 },
  boardingSuggestion: { requests: 0, failures: 0, totalMs: 0 },
  myCommutes: { requests: 0, failures: 0, totalMs: 0 },
  commuteRecommendation: { requests: 0, failures: 0, totalMs: 0 },
  emergencyReroute: { requests: 0, failures: 0, totalMs: 0 },
  privacyDashboard: { requests: 0, failures: 0, totalMs: 0 },
  privacyConsent: { requests: 0, failures: 0, totalMs: 0 },
  missions: { requests: 0, failures: 0, totalMs: 0 },
  missionTracking: { requests: 0, failures: 0, totalMs: 0 },
  leaderboard: { requests: 0, failures: 0, totalMs: 0 },
  missionFeedback: { requests: 0, failures: 0, totalMs: 0 },
  communityPosts: { requests: 0, failures: 0, totalMs: 0 },
  rollout: { requests: 0, failures: 0, totalMs: 0 },
  telemetry: { requests: 0, failures: 0, totalMs: 0 }
});

const state = {
  metrics: defaultMetrics(),
  telemetryBuffer: [] as Array<{
    ts: number;
    session_id: string;
    event: string;
    page?: string;
    meta?: Record<string, unknown>;
  }>,
  serverBootMs: Date.now(),
  featureEnabled: true,
  rolloutPercent: 100,
  rolloutSalt: 'mbta-search-mvp-v1'
};

let phase3State: PersistedPhase3State = getDefaultCloudflareApiState().phase3;
let phase4State: PersistedPhase4State = getDefaultCloudflareApiState().phase4;

const allRoutesCache = new Map<string, RouteResult>();
const allStopsCache = new Map<string, StopResult>();
let routeCacheLoadedAt = 0;
let stopCacheLoadedAt = 0;
const cacheTtlMs = 10 * 60 * 1000;

const modeMap: Record<number, RouteResult['mode']> = {
  0: 'subway',
  1: 'subway',
  2: 'rail',
  3: 'bus',
  4: 'ferry',
  5: 'cable_car',
  11: 'trolleybus'
};

function now(): number {
  return Date.now();
}

async function loadState(store?: CloudflareApiStateStore): Promise<CloudflareApiState> {
  if (!store) {
    return {
      phase3: phase3State,
      phase4: phase4State
    };
  }

  return store.load();
}

async function saveState(store: CloudflareApiStateStore | undefined, state: CloudflareApiState): Promise<void> {
  phase3State = state.phase3 as PersistedPhase3State;
  phase4State = state.phase4 as PersistedPhase4State;

  if (store) {
    await store.save(state);
  }
}

function recordMetric(key: keyof Metrics, ok = true, elapsedMs = 0): void {
  const bucket = state.metrics[key];
  bucket.requests += 1;
  if (!ok) {
    bucket.failures += 1;
  }
  if (bucket.totalMs !== undefined) {
    bucket.totalMs += elapsedMs;
  }
}

function asJson<T>(value: T): Response {
  return new Response(JSON.stringify(value), {
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'accept': 'application/json',
      'user-agent': 'mbta-tracker-cloudflare'
    },
    ...init
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return response.json() as Promise<T>;
}

function normalizeMode(routeType?: number): RouteResult['mode'] {
  if (typeof routeType === 'number' && routeType in modeMap) {
    return modeMap[routeType];
  }

  return 'bus';
}

function routeResultFromPayload(route: RoutePayload): RouteResult | null {
  const attrs = route.attributes;
  const number = String(attrs?.number || '').trim();
  const name = String(attrs?.name || attrs?.long_name || '').trim();
  if (!route.id || (!number && !name)) {
    return null;
  }

  return {
    type: 'route',
    route_id: route.id,
    route_number: number || route.id,
    route_name: name || number || route.id,
    mode: normalizeMode(attrs?.type),
    direction_names: attrs?.direction_names?.length ? attrs.direction_names : ['Outbound', 'Inbound'],
    confidence: 0.88,
    description: attrs?.description
  };
}

function stopResultFromPayload(stop: StopPayload): StopResult | null {
  const attrs = stop.attributes;
  if (!stop.id || !attrs?.name || typeof attrs.latitude !== 'number' || typeof attrs.longitude !== 'number') {
    return null;
  }

  return {
    type: 'stop',
    stop_id: stop.id,
    stop_name: attrs.name,
    stop_code: attrs.code,
    latitude: attrs.latitude,
    longitude: attrs.longitude,
    accessibility_features: attrs.accessibility,
    parent_stop_id: attrs.parent_station,
    confidence: 0.9
  };
}

function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function loadAllRoutes(): Promise<void> {
  if (now() - routeCacheLoadedAt < cacheTtlMs && allRoutesCache.size > 0) {
    return;
  }

  allRoutesCache.clear();
  const data = await fetchJson<MBTAResponse<RoutePayload[]>>(
    `${MBTA_API_BASE}/routes?filter[type]=0,1,2,3,4&fields[route]=number,name,long_name,description,type,direction_names&page[limit]=500`
  );

  for (const route of data.data || []) {
    const normalized = routeResultFromPayload(route);
    if (normalized) {
      allRoutesCache.set(normalized.route_id, normalized);
    }
  }

  routeCacheLoadedAt = now();
}

async function loadAllStops(): Promise<void> {
  if (now() - stopCacheLoadedAt < cacheTtlMs && allStopsCache.size > 0) {
    return;
  }

  allStopsCache.clear();
  let nextUrl: string | null =
    `${MBTA_API_BASE}/stops?filter[route_type]=0,1,2,3,4&fields[stop]=name,code,latitude,longitude,wheelchair_boarding,parent_station,accessibility&sort=name&page[limit]=500`;

  while (nextUrl) {
    const payload: MBTAResponse<StopPayload[]> = await fetchJson(nextUrl);
    for (const stop of payload.data || []) {
      const normalized = stopResultFromPayload(stop);
      if (normalized) {
        allStopsCache.set(normalized.stop_id, normalized);
      }
    }

    const links = payload.links;
    nextUrl = links?.next || null;
  }

  stopCacheLoadedAt = now();
}

function getCachedRoutes(): RouteResult[] {
  return Array.from(allRoutesCache.values());
}

function getCachedStops(): StopResult[] {
  return Array.from(allStopsCache.values());
}

function isAddressLike(query: string): boolean {
  return (
    /^\d+\s+/.test(query) ||
    /\b(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|pkwy|parkway)\b/.test(query) ||
    /\b(ma|massachusetts|boston|cambridge|somerville|malden|medford|quincy|brookline)\b/.test(query)
  );
}

async function searchRoutes(query: string): Promise<RouteResult[]> {
  await loadAllRoutes();
  const normalized = query.trim().toLowerCase();
  return getCachedRoutes()
    .filter((route) => {
      const combined = `${route.route_id} ${route.route_number} ${route.route_name} ${route.description || ''}`.toLowerCase();
      return combined.includes(normalized);
    })
    .slice(0, 5);
}

async function searchStops(query: string): Promise<StopResult[]> {
  await loadAllStops();
  const normalized = query.trim().toLowerCase();
  return getCachedStops()
    .filter((stop) => {
      const combined = `${stop.stop_id} ${stop.stop_name} ${stop.stop_code || ''}`.toLowerCase();
      return combined.includes(normalized);
    })
    .slice(0, 5);
}

async function searchVehicle(query: string): Promise<VehicleResult[]> {
  const clean = query.trim();
  if (!clean) {
    return [];
  }

  const vehicleId = clean.replace(/^(veh(?:icle)?|bus|#)\s*/i, '').trim();
  if (!vehicleId) {
    return [];
  }

  try {
    const payload = await fetchJson<MBTAResponse<VehiclePayload>>(
      `${MBTA_API_BASE}/vehicles/${encodeURIComponent(vehicleId)}?include=route,trip,stop&fields[vehicle]=route_id,trip_id,label,latitude,longitude`
    );
    const vehicle = payload.data;
    if (!vehicle || !vehicle.id) {
      return [];
    }

    const routeId = vehicle.relationships?.route?.data?.id || vehicle.attributes?.route_id || '';
    const route = allRoutesCache.get(routeId);
    return [
      {
        type: 'vehicle',
        vehicle_id: vehicle.id,
        route_id: routeId,
        route_number: route?.route_number || routeId || 'Unknown',
        trip_id: vehicle.relationships?.trip?.data?.id || vehicle.attributes?.trip_id || '',
        headsign: vehicle.attributes?.label || `Vehicle ${vehicle.id}`,
        current_stop_id: vehicle.relationships?.stop?.data?.id,
        next_stop_id: undefined,
        latitude: vehicle.attributes?.latitude,
        longitude: vehicle.attributes?.longitude,
        confidence: 0.88
      }
    ];
  } catch {
    return [];
  }
}

async function searchAddress(query: string): Promise<AddressResult[]> {
  await loadAllStops();
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '3',
    countrycodes: 'us'
  });

  const results = await fetchJson<Array<{ display_name: string; lat: string; lon: string }>>(
    `${NOMINATIM_BASE}/search?${params.toString()}`
  );

  return results.map((item) => {
    const latitude = Number(item.lat);
    const longitude = Number(item.lon);
    const nearby_stops = getCachedStops()
      .map((stop) => ({
        stop,
        distance: distanceKm(latitude, longitude, stop.latitude, stop.longitude)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5)
      .map(({ stop }) => stop);

    return {
      type: 'address',
      address: item.display_name,
      latitude,
      longitude,
      nearby_stops,
      distance_km: nearby_stops.length > 0 ? distanceKm(latitude, longitude, nearby_stops[0].latitude, nearby_stops[0].longitude) : 0,
      confidence: 0.78
    };
  });
}

async function searchLandmark(query: string): Promise<LandmarkResult[]> {
  const addresses = await searchAddress(query);
  return addresses.map((address) => ({
    type: 'landmark',
    landmark_name: address.address,
    latitude: address.latitude,
    longitude: address.longitude,
    nearby_stops: address.nearby_stops,
    confidence: 0.7
  }));
}

async function resolveSearch(query: SearchQuery): Promise<SearchResult[]> {
  switch (query.query_type) {
    case 'route':
      return searchRoutes(query.query_string);
    case 'stop':
      return searchStops(query.query_string);
    case 'address':
      return searchAddress(query.query_string);
    case 'vehicle':
      return searchVehicle(query.query_string);
    case 'landmark':
      return searchLandmark(query.query_string);
    default:
      return [];
  }
}

async function autocomplete(query: string, limit = 10): Promise<SearchResult[]> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  await Promise.all([loadAllRoutes(), loadAllStops()]);
  const results: SearchResult[] = [
    ...getCachedStops().filter((stop) => stop.stop_name.toLowerCase().includes(normalized)).slice(0, 5),
    ...getCachedRoutes().filter((route) => route.route_name.toLowerCase().includes(normalized)).slice(0, 5)
  ];

  if (isAddressLike(normalized)) {
    const addressResults = await searchAddress(query);
    results.unshift(...addressResults.slice(0, 4));
  }

  const deduped = new Map<string, SearchResult>();
  for (const result of results) {
    const key =
      result.type === 'route'
        ? `route:${result.route_id}`
        : result.type === 'stop'
          ? `stop:${result.stop_id}`
          : result.type === 'vehicle'
            ? `vehicle:${result.vehicle_id}`
            : result.type === 'address'
              ? `address:${result.address}`
              : `landmark:${result.landmark_name}`;
    if (!deduped.has(key)) {
      deduped.set(key, result);
    }
  }

  return Array.from(deduped.values()).slice(0, limit);
}

function mapPredictionToArrival(
  prediction: PredictionPayload,
  route: RouteResult,
  vehicle: VehiclePayload | null,
  nowMs: number
): ArrivalForecast | null {
  const arrivalTimestamp = prediction.attributes?.arrival_time || prediction.attributes?.departure_time;
  const arrivalTime = arrivalTimestamp ? new Date(arrivalTimestamp).getTime() : null;
  if (!arrivalTime || arrivalTime < nowMs) {
    return null;
  }

  return {
    trip_id: prediction.relationships?.trip?.data?.id || '',
    route_id: route.route_id,
    route_number: route.route_number,
    route_name: route.route_name,
    mode: route.mode,
    direction: 'Outbound',
    headsign: vehicle?.attributes?.label || route.route_name,
    vehicle_id: vehicle?.id,
    arrival_time: arrivalTime,
    eta_seconds: Math.floor((arrivalTime - nowMs) / 1000),
    scheduled_time: arrivalTime,
    delay_seconds: 0,
    is_live: Boolean(vehicle),
    platform: undefined,
    accessibility_icons: [],
    crowding_percent: vehicle?.attributes?.occupancy_status ? 65 : undefined,
    occupancy_status: vehicle?.attributes?.occupancy_status
  };
}

export async function getStopArrivals(stopId: string): Promise<StopArrivals | null> {
  try {
    const [stopResponse, predictionsResponse] = await Promise.all([
      fetchJson<MBTAResponse<StopPayload>>(
        `${MBTA_API_BASE}/stops/${encodeURIComponent(stopId)}?fields[stop]=name,latitude,longitude,accessibility`
      ),
      fetchJson<MBTAResponse<PredictionPayload[]>>(
        `${MBTA_API_BASE}/predictions?filter[stop]=${encodeURIComponent(stopId)}&include=trip,route,vehicle,stop&fields[prediction]=arrival_time,departure_time,schedule_relationship,status&fields[trip]=headsign,direction_id&fields[route]=number,name,type,direction_names&fields[vehicle]=label,latitude,longitude,occupancy_status,current_status&sort=arrival_time&page[limit]=100`
      )
    ]);

    const stop = stopResponse.data && stopResultFromPayload(stopResponse.data);
    if (!stop) {
      return null;
    }

    const predictions = predictionsResponse.data || [];
    const inbound: ArrivalForecast[] = [];
    const outbound: ArrivalForecast[] = [];
    const nowMs = now();

    for (const prediction of predictions) {
      const routeId = prediction.relationships?.route?.data?.id;
      if (!routeId) {
        continue;
      }

      const route = allRoutesCache.get(routeId) || {
        type: 'route',
        route_id: routeId,
        route_number: routeId,
        route_name: routeId,
        mode: 'bus',
        direction_names: ['Outbound', 'Inbound'],
        confidence: 0.5
      };

      const vehicleId = prediction.relationships?.vehicle?.data?.id || null;
      const vehicle = vehicleId
        ? (await fetchJson<MBTAResponse<VehiclePayload>>(
            `${MBTA_API_BASE}/vehicles/${encodeURIComponent(vehicleId)}?fields[vehicle]=label,latitude,longitude,occupancy_status,current_status`
          ).catch(() => null))?.data || null
        : null;

      const arrival = mapPredictionToArrival(prediction, route, vehicle, nowMs);
      if (!arrival) {
        continue;
      }

      if ((prediction.attributes?.stop_sequence ?? 0) % 2 === 0) {
        inbound.push(arrival);
      } else {
        outbound.push(arrival);
      }
    }

    inbound.sort((a, b) => a.arrival_time - b.arrival_time);
    outbound.sort((a, b) => a.arrival_time - b.arrival_time);

    const alerts: Alert[] = [];

    return {
      stop_id: stop.stop_id,
      stop_name: stop.stop_name,
      location: {
        latitude: stop.latitude,
        longitude: stop.longitude
      },
      inbound: inbound.slice(0, 10),
      outbound: outbound.slice(0, 10),
      alerts,
      last_updated: now()
    };
  } catch {
    return null;
  }
}

export async function getRouteStops(routeId: string, directionId?: number): Promise<RouteStopsResponse> {
  const params = new URLSearchParams({
    'filter[route]': routeId,
    'fields[stop]': 'name,latitude,longitude,wheelchair_boarding',
    'page[limit]': '300'
  });
  if (typeof directionId === 'number') {
    params.set('filter[direction_id]', String(directionId));
  }

  const [stopsResponse, vehiclesResponse, predictionsResponse] = await Promise.all([
    fetchJson<MBTAResponse<StopPayload[]>>(`${MBTA_API_BASE}/stops?${params.toString()}`),
    fetchJson<MBTAResponse<VehiclePayload[]>>(
      `${MBTA_API_BASE}/vehicles?filter[route]=${encodeURIComponent(routeId)}&fields[vehicle]=route_id,trip_id,label`
    ),
    fetchJson<MBTAResponse<PredictionPayload[]>>(
      `${MBTA_API_BASE}/predictions?filter[route]=${encodeURIComponent(routeId)}${typeof directionId === 'number' ? `&filter[direction_id]=${directionId}` : ''}&fields[prediction]=stop_sequence&fields[stop]=name&sort=stop_sequence&page[limit]=500`
    )
  ]);

  const stops = (stopsResponse.data || [])
    .map(stopResultFromPayload)
    .filter((value): value is StopResult => Boolean(value));
  const vehicles = vehiclesResponse.data || [];
  const predictions = predictionsResponse.data || [];
  const stopSequenceById = new Map<string, number>();

  for (const prediction of predictions) {
    const stopId = prediction.relationships?.stop?.data?.id;
    const sequence = prediction.attributes?.stop_sequence;
    if (!stopId || typeof sequence !== 'number') continue;
    const existing = stopSequenceById.get(stopId);
    if (existing === undefined || sequence < existing) {
      stopSequenceById.set(stopId, sequence);
    }
  }

  const vehicleIds = vehicles.map((vehicle) => vehicle.id).slice(0, 3);
  const stopsOut: RouteStopInfo[] = stops
    .sort((a, b) => {
      const seqA = stopSequenceById.get(a.stop_id);
      const seqB = stopSequenceById.get(b.stop_id);
      if (typeof seqA === 'number' && typeof seqB === 'number' && seqA !== seqB) return seqA - seqB;
      if (typeof seqA === 'number') return -1;
      if (typeof seqB === 'number') return 1;
      return a.stop_name.localeCompare(b.stop_name);
    })
    .map((stop, index) => ({
      stop_id: stop.stop_id,
      stop_name: stop.stop_name,
      sequence: index + 1,
      latitude: stop.latitude,
      longitude: stop.longitude,
      wheelchair_accessible: Boolean(stop.accessibility_features?.length),
      upcoming_vehicle_ids: vehicleIds
    }));

  return {
    route_id: routeId,
    direction_id: typeof directionId === 'number' ? directionId : undefined,
    stops: stopsOut,
    generated_at: now()
  };
}

export async function getVehicleInfo(vehicleId: string): Promise<VehicleInfoResponse | null> {
  try {
    const vehicleResponse = await fetchJson<MBTAResponse<VehiclePayload>>(
      `${MBTA_API_BASE}/vehicles/${encodeURIComponent(vehicleId)}?include=route,trip,stop&fields[vehicle]=label,latitude,longitude,occupancy_status,current_status`
    );
    const vehicle = vehicleResponse.data;
    if (!vehicle) {
      return null;
    }

    const routeId = vehicle.relationships?.route?.data?.id || vehicle.attributes?.route_id || '';
    const route = routeId ? allRoutesCache.get(routeId) : undefined;
    const routeNumber = route?.route_number || routeId || 'Unknown';
    const routeName = route?.route_name || routeId || 'Unknown';

    const predictionResponse = await fetchJson<MBTAResponse<PredictionPayload[]>>(
      `${MBTA_API_BASE}/predictions?filter[vehicle]=${encodeURIComponent(vehicleId)}&include=stop&fields[prediction]=arrival_time,departure_time&fields[stop]=name&sort=arrival_time&page[limit]=5`
    );

    const stopNameById = new Map<string, string>();
    for (const item of predictionResponse.included || []) {
      if (item.type === 'stop' && item.id && typeof item.attributes?.name === 'string') {
        stopNameById.set(item.id, item.attributes.name);
      }
    }

    const nowMs = now();
    const nextStops = (predictionResponse.data || [])
      .map((prediction) => {
        const stopId = prediction.relationships?.stop?.data?.id;
        const timestamp = prediction.attributes?.arrival_time || prediction.attributes?.departure_time;
        const arrivalTime = timestamp ? new Date(timestamp).getTime() : null;
        if (!stopId || !arrivalTime || arrivalTime <= nowMs) {
          return null;
        }

        return {
          stop_id: stopId,
          stop_name: stopNameById.get(stopId) || stopId,
          arrival_time: arrivalTime,
          eta_seconds: Math.max(0, Math.floor((arrivalTime - nowMs) / 1000))
        };
      })
      .filter((value): value is VehicleInfoResponse['next_stops'][number] => value !== null)
      .slice(0, 5);

    return {
      vehicle_id: vehicle.id,
      route_id: routeId,
      route_number: routeNumber,
      route_name: routeName,
      trip_id: vehicle.relationships?.trip?.data?.id || vehicle.attributes?.trip_id,
      label: vehicle.attributes?.label,
      latitude: vehicle.attributes?.latitude,
      longitude: vehicle.attributes?.longitude,
      occupancy_status: vehicle.attributes?.occupancy_status,
      current_status: vehicle.attributes?.current_status,
      next_stops: nextStops,
      generated_at: now()
    };
  } catch {
    return null;
  }
}

export async function getStopCrowdingForecast(stopId: string): Promise<StopCrowdingForecastResponse | null> {
  const arrivals = await getStopArrivals(stopId);
  if (!arrivals) {
    return null;
  }

  const allArrivals = [...arrivals.inbound, ...arrivals.outbound];
  const routeDiversity = new Set(allArrivals.map((arrival) => arrival.route_id)).size;
  const current = now();
  const timeline: CrowdingForecastPoint[] = [5, 15, 30, 60].map((horizon) => {
    const arrivalsWithinHorizon = allArrivals.filter((arrival) => arrival.eta_seconds <= horizon * 60).length;
    return {
      horizon_minutes: horizon as 5 | 15 | 30 | 60,
      occupancy_percent: estimateCrowdingPercent({
        baseKey: stopId,
        arrivalsWithinHorizon,
        horizonMinutes: horizon,
        routeDiversity,
        timestampMs: current
      }),
      confidence: 0.72,
      sample_size: arrivalsWithinHorizon
    };
  });

  return {
    stop_id: stopId,
    stop_name: arrivals.stop_name,
    generated_at: current,
    timeline
  };
}

export async function getRouteCrowdingForecast(routeId: string, directionId?: number): Promise<RouteCrowdingForecastResponse> {
  const routeStops = await getRouteStops(routeId, directionId);
  const current = now();
  const stops: RouteCrowdingStopForecast[] = routeStops.stops.map((stop) => ({
    stop_id: stop.stop_id,
    stop_name: stop.stop_name,
    sequence: stop.sequence,
    timeline: [5, 15, 30, 60].map((horizon) => ({
      horizon_minutes: horizon as 5 | 15 | 30 | 60,
      occupancy_percent: estimateCrowdingPercent({
        baseKey: `${routeId}:${stop.stop_id}`,
        arrivalsWithinHorizon: Math.max(1, Math.round(stop.sequence / 2)),
        horizonMinutes: horizon,
        routeDiversity: Math.max(1, stop.upcoming_vehicle_ids.length),
        timestampMs: current
      }),
      confidence: 0.68,
      sample_size: Math.max(1, Math.round(stop.sequence / 2))
    }))
  }));

  return {
    route_id: routeId,
    direction_id: routeStops.direction_id,
    generated_at: current,
    stops
  };
}

export async function getBoardingSuggestion(
  from: string,
  to: string,
  preference: 'balanced' | 'fastest' | 'least_crowded'
): Promise<BoardingSuggestionResponse | null> {
  const [fromResults, toResults] = await Promise.all([
    resolveSearch({ query_string: from, query_type: 'stop' }),
    resolveSearch({ query_string: to, query_type: 'stop' })
  ]);

  const fromStop = fromResults.find((result): result is StopResult => result.type === 'stop');
  const toStop = toResults.find((result): result is StopResult => result.type === 'stop');
  if (!fromStop || !toStop) {
    return null;
  }

  const routeCrowding = await getStopCrowdingForecast(fromStop.stop_id);
  const arrivals = await getStopArrivals(fromStop.stop_id);
  if (!arrivals) {
    return null;
  }

  const candidates = [...arrivals.inbound, ...arrivals.outbound].slice(0, 8);
  const options: BoardingSuggestionOption[] = candidates.map((arrival) => {
    const etaMinutes = Math.max(1, Math.round(arrival.eta_seconds / 60));
    const crowdingPercent = routeCrowding?.timeline.find((point) => point.horizon_minutes === 15)?.occupancy_percent ?? 50;
    const transferCount = arrival.route_id === toStop.stop_id ? 0 : 1;
    const delayMinutes = Math.max(0, Math.round(arrival.delay_seconds / 60));
    const score = scoreBoardingOption({
      etaMinutes,
      transferCount,
      crowdingPercent,
      delayMinutes,
      preference
    });

    return {
      option_type:
        preference === 'fastest' ? 'fastest' : preference === 'least_crowded' ? 'least_crowded' : 'best_overall',
      route_id: arrival.route_id,
      route_number: arrival.route_number,
      route_name: arrival.route_name,
      headsign: arrival.headsign,
      departure_stop_id: fromStop.stop_id,
      departure_stop_name: fromStop.stop_name,
      eta_minutes: etaMinutes,
      crowding_percent: crowdingPercent,
      transfer_count: transferCount,
      delay_minutes: delayMinutes,
      score
    };
  });

  return {
    from_stop: {
      stop_id: fromStop.stop_id,
      stop_name: fromStop.stop_name
    },
    to_stop: {
      stop_id: toStop.stop_id,
      stop_name: toStop.stop_name
    },
    generated_at: now(),
    options
  };
}

export async function getMyCommutes(sessionId: string, store?: CloudflareApiStateStore): Promise<MyCommutesResponse> {
  const state = await loadState(store);
  const userHash = hashUserId(sessionId.trim() || 'anonymous-session');
  const pref = state.phase3.privacyPreferences[userHash] || { opted_in: true, anonymize_after_days: 30 };
  if (!state.phase3.userCommutes[userHash]) {
    state.phase3.userCommutes[userHash] = createSeedCommutes(userHash);
    await saveState(store, state);
  }

  const commutes = pref.opted_in ? state.phase3.userCommutes[userHash] : [];
  return {
    user_hash: userHash,
    generated_at: now(),
    commutes: summarizeCommutes(commutes)
  };
}

export async function getCommuteRecommendation(
  sessionId: string,
  fromStop: { stop_id: string; stop_name: string },
  toStop: { stop_id: string; stop_name: string },
  store?: CloudflareApiStateStore
): Promise<CommuteRecommendationResponse> {
  const state = await loadState(store);
  const userHash = hashUserId(sessionId.trim() || 'anonymous-session');
  const pref = state.phase3.privacyPreferences[userHash] || { opted_in: true, anonymize_after_days: 30 };
  if (!state.phase3.userCommutes[userHash]) {
    state.phase3.userCommutes[userHash] = createSeedCommutes(userHash);
    await saveState(store, state);
  }

  return pref.opted_in
    ? recommendDepartureWindows(fromStop, toStop, state.phase3.userCommutes[userHash])
    : recommendDepartureWindows(fromStop, toStop, []);
}

export function getEmergencyReroute(
  fromStop: { stop_id: string; stop_name: string },
  toStop: { stop_id: string; stop_name: string },
  disruptedRoute: string
): EmergencyRerouteResponse {
  const alternatives = rankEmergencyAlternatives([
    {
      route_id: 'route-1',
      route_number: '1',
      route_name: 'Mass Ave Connector',
      departure_stop_id: fromStop.stop_id,
      departure_stop_name: fromStop.stop_name,
      eta_minutes: 5,
      distance_increase_km: 0.4,
      time_penalty_minutes: 5,
      accessibility_support: 'full'
    },
    {
      route_id: 'route-39',
      route_number: '39',
      route_name: 'Back Bay Express',
      departure_stop_id: fromStop.stop_id,
      departure_stop_name: fromStop.stop_name,
      eta_minutes: 8,
      distance_increase_km: 0.9,
      time_penalty_minutes: 8,
      accessibility_support: 'partial'
    },
    {
      route_id: 'route-66',
      route_number: '66',
      route_name: 'Cross Town',
      departure_stop_id: fromStop.stop_id,
      departure_stop_name: fromStop.stop_name,
      eta_minutes: 10,
      distance_increase_km: 1.2,
      time_penalty_minutes: 11,
      accessibility_support: 'unknown'
    }
  ]);

  return {
    from_stop: fromStop,
    to_stop: toStop,
    disrupted_route: disruptedRoute,
    generated_at: now(),
    alternatives
  };
}

export async function getPrivacyDashboard(sessionId: string, store?: CloudflareApiStateStore): Promise<PrivacyDashboardResponse> {
  const state = await loadState(store);
  const userHash = hashUserId(sessionId.trim() || 'anonymous-session');
  const pref = state.phase3.privacyPreferences[userHash] || { opted_in: true, anonymize_after_days: 30 };
  if (!state.phase3.userCommutes[userHash]) {
    state.phase3.userCommutes[userHash] = createSeedCommutes(userHash);
    await saveState(store, state);
  }

  return {
    user_hash: userHash,
    opted_in: pref.opted_in,
    anonymize_after_days: pref.anonymize_after_days,
    stored_commute_count: state.phase3.userCommutes[userHash].length,
    generated_at: now()
  };
}

export async function updatePrivacyConsent(
  sessionId: string,
  optedIn: boolean,
  anonymizeAfterDays: number,
  store?: CloudflareApiStateStore
): Promise<{ accepted: true; user_hash: string; opted_in: boolean; anonymize_after_days: number; timestamp: number }> {
  const state = await loadState(store);
  const userHash = hashUserId(sessionId.trim() || 'anonymous-session');
  state.phase3.privacyPreferences[userHash] = {
    opted_in: optedIn,
    anonymize_after_days: anonymizeAfterDays
  };

  if (!optedIn) {
    state.phase3.userCommutes[userHash] = [];
  } else if (!state.phase3.userCommutes[userHash]) {
    state.phase3.userCommutes[userHash] = createSeedCommutes(userHash);
  }

  await saveState(store, state);

  return {
    accepted: true,
    user_hash: userHash,
    opted_in: optedIn,
    anonymize_after_days: anonymizeAfterDays,
    timestamp: now()
  };
}

export async function getMissions(sessionId: string, store?: CloudflareApiStateStore): Promise<MissionsResponse> {
  const state = await loadState(store);
  const userHash = hashUserId(sessionId.trim() || 'anonymous-session');
  if (!state.phase4.missionProgressByUser[userHash]) {
    state.phase4.missionProgressByUser[userHash] = initializeMissionProgress(getMissionCatalog());
    await saveState(store, state);
  }

  return {
    generated_at: now(),
    current_week_theme: 'Summer exploration',
    missions: getMissionCatalog(),
    progress: state.phase4.missionProgressByUser[userHash]
  };
}

export async function trackMission(sessionId: string, missionId: string, event: 'journey_start' | 'journey_end', store?: CloudflareApiStateStore): Promise<void> {
  const state = await loadState(store);
  const userHash = hashUserId(sessionId.trim() || 'anonymous-session');
  if (!state.phase4.missionProgressByUser[userHash]) {
    state.phase4.missionProgressByUser[userHash] = initializeMissionProgress(getMissionCatalog());
  }
  state.phase4.missionProgressByUser[userHash] = updateMissionProgress(state.phase4.missionProgressByUser[userHash], missionId, event);
  await saveState(store, state);
}

export function getLeaderboard(sessionId: string, timeframe: 'weekly' | 'all_time'): LeaderboardResponse {
  const userHash = hashUserId(sessionId.trim() || 'anonymous-session');
  const top = buildLeaderboard(userHash, timeframe);

  return {
    generated_at: now(),
    timeframe,
    top,
    your_rank: {
      rank: Math.min(25, top.length + 7),
      user_hash: userHash,
      points: top[top.length - 1].points - 120,
      completed_missions: 6,
      badge_count: 4
    },
    cache_ttl_seconds: 300
  };
}

export async function getMissionFeedback(store?: CloudflareApiStateStore): Promise<MissionFeedbackResponse> {
  const state = await loadState(store);
  return {
    generated_at: now(),
    total_feedback: state.phase4.feedbackItems.length,
    recent_feedback: state.phase4.feedbackItems.slice(-10).reverse()
  };
}

export async function submitMissionFeedback(sessionId: string, suggestedMission: string, notes?: string, store?: CloudflareApiStateStore): Promise<void> {
  const state = await loadState(store);
  state.phase4.feedbackItems.push({
    feedback_id: `fb_${now()}_${Math.random().toString(36).slice(2, 8)}`,
    user_hash: hashUserId(sessionId.trim() || 'anonymous-session'),
    suggested_mission: suggestedMission,
    notes,
    created_at: now()
  });
  await saveState(store, state);
}

export async function getCommunityPosts(store?: CloudflareApiStateStore): Promise<CommunityPostsResponse> {
  const state = await loadState(store);
  return {
    generated_at: now(),
    posts: state.phase4.communityPosts.slice(-20).reverse()
  };
}

export async function submitCommunityPost(sessionId: string, title: string, body: string, store?: CloudflareApiStateStore): Promise<void> {
  const state = await loadState(store);
  state.phase4.communityPosts.push({
    post_id: `post_${now()}_${Math.random().toString(36).slice(2, 8)}`,
    user_hash: hashUserId(sessionId.trim() || 'anonymous-session'),
    title,
    body,
    created_at: now()
  });
  await saveState(store, state);
}

export function getRollout(clientId: string, force?: 'on' | 'off') {
  state.metrics.rollout.requests += 1;

  if (force === 'on') {
    return { feature: 'search-mvp', enabled: true, percent: 100, reason: 'force-on', bucket: 0, timestamp: now() };
  }

  if (force === 'off') {
    return { feature: 'search-mvp', enabled: false, percent: 0, reason: 'force-off', bucket: 0, timestamp: now() };
  }

  const decision = resolveRollout(clientId, state.featureEnabled, state.rolloutPercent, state.rolloutSalt);
  return {
    feature: 'search-mvp',
    enabled: decision.enabled,
    percent: decision.percent,
    reason: decision.reason,
    bucket: decision.bucket,
    timestamp: now()
  };
}

export function getMetrics() {
  const uptimeSeconds = Math.floor((now() - state.serverBootMs) / 1000);
  return {
    uptime_seconds: uptimeSeconds,
    rollout: {
      feature_enabled: state.featureEnabled,
      percent: Math.max(0, Math.min(100, Math.floor(state.rolloutPercent)))
    },
    counters: {
      search: bucketSummary(state.metrics.search),
      stop_arrivals: bucketSummary(state.metrics.stopArrivals),
      route_stops: state.metrics.routeStops,
      vehicle_info: state.metrics.vehicleInfo,
      crowding_forecast: state.metrics.crowdingForecast,
      boarding_suggestion: state.metrics.boardingSuggestion,
      my_commutes: state.metrics.myCommutes,
      commute_recommendation: state.metrics.commuteRecommendation,
      emergency_reroute: state.metrics.emergencyReroute,
      privacy_dashboard: state.metrics.privacyDashboard,
      privacy_consent: state.metrics.privacyConsent,
      missions: state.metrics.missions,
      mission_tracking: state.metrics.missionTracking,
      leaderboard: state.metrics.leaderboard,
      mission_feedback: state.metrics.missionFeedback,
      community_posts: state.metrics.communityPosts,
      rollout: state.metrics.rollout,
      telemetry: state.metrics.telemetry
    },
    recent_telemetry_events: state.telemetryBuffer.slice(-50)
  };
}

export function recordTelemetry(event: {
  ts: number;
  session_id: string;
  event: string;
  page?: string;
  meta?: Record<string, unknown>;
}): void {
  state.telemetryBuffer.push(event);
  if (state.telemetryBuffer.length > 500) {
    state.telemetryBuffer.shift();
  }
}

function bucketSummary(bucket: MetricBucket) {
  return {
    requests: bucket.requests,
    failures: bucket.failures,
    avg_ms: bucket.requests && bucket.totalMs !== undefined ? Math.round(bucket.totalMs / bucket.requests) : 0
  };
}

function createSeedCommutes(userHash: string) {
  const ts = now();
  return [
    {
      commute_id: `${userHash}_1`,
      user_hash: userHash,
      from_stop_id: 'place-sstat',
      from_stop_name: 'South Station',
      to_stop_id: 'place-pktrm',
      to_stop_name: 'Park Street',
      departure_time_iso: new Date(ts - 2 * 24 * 60 * 60 * 1000).toISOString(),
      day_of_week: new Date(ts).getDay(),
      created_at: ts - 2 * 24 * 60 * 60 * 1000
    },
    {
      commute_id: `${userHash}_2`,
      user_hash: userHash,
      from_stop_id: 'place-sstat',
      from_stop_name: 'South Station',
      to_stop_id: 'place-pktrm',
      to_stop_name: 'Park Street',
      departure_time_iso: new Date(ts - 24 * 60 * 60 * 1000).toISOString(),
      day_of_week: new Date(ts).getDay(),
      created_at: ts - 24 * 60 * 60 * 1000
    },
    {
      commute_id: `${userHash}_3`,
      user_hash: userHash,
      from_stop_id: 'place-north',
      from_stop_name: 'North Station',
      to_stop_id: 'place-gover',
      to_stop_name: 'Government Center',
      departure_time_iso: new Date(ts - 3 * 24 * 60 * 60 * 1000).toISOString(),
      day_of_week: new Date(ts).getDay(),
      created_at: ts - 3 * 24 * 60 * 60 * 1000
    }
  ];
}

export {
  searchParser,
  resolveSearch,
  autocomplete,
  loadAllStops as getAllStops,
  loadAllRoutes as getAllRoutes
};
