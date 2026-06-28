/**
 * MBTA Stops API & Nearest-Stop Computation
 * Fetches stops, caches them, ranks by distance, enriches with real-time arrivals
 */

import type { GeoLocation, MBTAStop, NearbyStop, NearbyArrival } from './geo-types';
import type { TrackerVehicle } from './types';
import { distanceMeters, estimateWalkingMinutes } from './geolocation';

const MBTA_API = 'https://api-v3.mbta.com';
const STOPS_CACHE_KEY = 'mbta_stops_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MBTA_API_KEY = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_MBTA_API_KEY : undefined;
const ROUTE_STOPS_CACHE_TTL_MS = 10 * 60 * 1000;

const routeStopsCache = new Map<string, { fetchedAt: number; stops: MBTAStop[] }>();

function mbtaHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Accept': 'application/vnd.api+json' };
  if (MBTA_API_KEY) {
    headers['x-api-key'] = MBTA_API_KEY;
  }
  return headers;
}

interface CachedStops {
  stops: MBTAStop[];
  fetchedAt: number;
}

export async function fetchNearbyStops(
  location: GeoLocation,
  radiusMeters: number = 800
): Promise<NearbyStop[]> {
  // Fetch all stops (cached)
  const stops = await getAllStops();

  // Filter by distance
  const nearby = stops
    .map((stop) => ({
      stop,
      distanceMeters: distanceMeters(
        location.latitude,
        location.longitude,
        stop.latitude,
        stop.longitude
      )
    }))
    .filter(({ distanceMeters: d }) => d <= radiusMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 15); // Top 15 closest stops

  return nearby.map(({ stop, distanceMeters: d }) => ({
    ...stop,
    distanceMeters: d,
    walkingMinutes: estimateWalkingMinutes(d),
    nextArrivals: [] // Will be enriched with real-time data
  }));
}

export async function getAllStops(): Promise<MBTAStop[]> {
  // Try cache first
  if (typeof localStorage !== 'undefined') {
    const cached = localStorage.getItem(STOPS_CACHE_KEY);
    if (cached) {
      const { stops, fetchedAt }: CachedStops = JSON.parse(cached);
      if (Date.now() - fetchedAt < CACHE_TTL_MS && Array.isArray(stops) && stops.length > 0) {
        return stops;
      }
    }
  }

  // Fetch from MBTA API with JSON:API pagination
  const stops: MBTAStop[] = [];
  let nextUrl: string | null = `${MBTA_API}/stops?${new URLSearchParams({
    'page[limit]': '100',
    sort: 'id'
  }).toString()}`;

  try {
    while (nextUrl) {
      const response: Response = await fetch(nextUrl, { headers: mbtaHeaders() });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('MBTA API rate limit reached (429). Add VITE_MBTA_API_KEY to increase limits.');
        }
        throw new Error(`MBTA stops fetch failed: ${response.status}`);
      }

      const data: {
        data?: Array<{
          id: string;
          attributes: {
            name: string;
            latitude: number;
            longitude: number;
            wheelchair_boarding?: 0 | 1 | 2;
            platform_code?: string;
            parent_station?: string;
          };
        }>;
        links?: { next?: string | null };
      } = await response.json();
      const fetchedStops = data.data || [];

      if (fetchedStops.length === 0) {
        break;
      }

      stops.push(
        ...fetchedStops
          .filter((s) => typeof s.attributes.latitude === 'number' && typeof s.attributes.longitude === 'number')
          .map((s) => ({
            id: s.id,
            name: s.attributes.name,
            latitude: s.attributes.latitude,
            longitude: s.attributes.longitude,
            wheelchairAccessible: s.attributes.wheelchair_boarding === 1,
            platformCode: s.attributes.platform_code,
            parentStopId: s.attributes.parent_station
          }))
      );

      nextUrl = data.links?.next ?? null;
    }

    // Cache the stops — ignore QuotaExceededError silently
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(
          STOPS_CACHE_KEY,
          JSON.stringify({ stops, fetchedAt: Date.now() })
        );
      } catch (storageError) {
        // localStorage quota exceeded — the stops are still usable from memory
        // Try to clear the old cache entry so the next page load has room
        try {
          localStorage.removeItem(STOPS_CACHE_KEY);
        } catch {
          // ignore
        }
      }
    }

    return stops;
  } catch (error) {
    // If we have a stale cache, return it rather than failing completely
    if (typeof localStorage !== 'undefined') {
      const stale = localStorage.getItem(STOPS_CACHE_KEY);
      if (stale) {
        try {
          const { stops: cachedStops }: CachedStops = JSON.parse(stale);
          if (Array.isArray(cachedStops) && cachedStops.length > 0) {
            return cachedStops;
          }
        } catch {
          // ignore malformed cache
        }
      }
    }

    const message = error instanceof Error ? error.message : 'unknown error';
    if (!MBTA_API_KEY) {
      throw new Error(
        'MBTA stops unavailable: no API key set. Add VITE_MBTA_API_KEY to apps/web/.env.local and restart the dev server.'
      );
    }
    throw new Error(`Failed to fetch MBTA stops: ${message}`);
  }
}

/**
 * Enrich nearby stops with real-time arrival data from vehicle stream
 * Compute ETA from vehicle positions and speed estimates
 */
export function enrichStopsWithArrivals(
  nearbyStops: NearbyStop[],
  vehicles: TrackerVehicle[],
  scheduleData?: Map<string, unknown>
): NearbyStop[] {
  function inferAudioAnnouncements(mode: NearbyArrival['mode']): boolean {
    return mode !== 'bus';
  }

  return nearbyStops.map((stop) => {
    // Find vehicles approaching this stop
    const arrivals: NearbyArrival[] = [];

    for (const vehicle of vehicles) {
      // Check if vehicle services this stop (in future: use schedule data + route assignments)
      // For MVP: just estimate ETA based on vehicle position
      if (!vehicle.lat || !vehicle.lon) continue;

      const distToStop = distanceMeters(vehicle.lat, vehicle.lon, stop.latitude, stop.longitude);
      const AVERAGE_BUS_SPEED_MS = 10; // ~36 km/h city average
      const estimatedArrivalSeconds = Math.round(distToStop / AVERAGE_BUS_SPEED_MS);

      // Only include if arriving within next 30 minutes
      if (estimatedArrivalSeconds > 1800) continue;

      // Confidence band increases with distance (more uncertain for far vehicles)
      const confidenceSeconds = Math.min(300, Math.round(estimatedArrivalSeconds * 0.3));

      // Only include vehicles with valid route info
      if (vehicle.routeId) {
        const mode = vehicle.mode as 'bus' | 'subway' | 'commuter-rail' | 'ferry';
        const routeMetadata = scheduleData?.get(String(vehicle.routeId)) as { wheelchairAccessible?: boolean } | undefined;
        arrivals.push({
          vehicleId: vehicle.id,
          routeId: vehicle.routeId,
          routeLabel: vehicle.routeLabel,
          mode,
          arrivalSeconds: estimatedArrivalSeconds,
          confidenceSeconds,
          wheelchairAccessible: Boolean(routeMetadata?.wheelchairAccessible ?? stop.wheelchairAccessible ?? false),
          hasAudioAnnouncements: inferAudioAnnouncements(mode)
        });
      }
    }

    // Sort by arrival time and take top 3
    const sortedArrivals = arrivals
      .sort((a, b) => a.arrivalSeconds - b.arrivalSeconds)
      .slice(0, 3);

    return {
      ...stop,
      nextArrivals: sortedArrivals
    };
  });
}

export function getStopsByRoute(stops: MBTAStop[], routeId: string): MBTAStop[] {
  return stops.filter((stop) => Array.isArray(stop.routeIds) && stop.routeIds.includes(routeId));
}

/**
 * Route-to-stop mapping from MBTA API with in-memory TTL cache.
 */
export async function fetchStopsByRoute(routeId: string): Promise<MBTAStop[]> {
  const cached = routeStopsCache.get(routeId);
  if (cached && Date.now() - cached.fetchedAt < ROUTE_STOPS_CACHE_TTL_MS) {
    return cached.stops;
  }

  const url = new URL(`${MBTA_API}/stops`);
  url.searchParams.set('filter[route]', routeId);
  url.searchParams.set('fields[stop]', 'name,latitude,longitude,wheelchair_boarding,platform_code,parent_station');
  url.searchParams.set('page[limit]', '300');

  const response = await fetch(url.toString(), { headers: mbtaHeaders() });
  if (!response.ok) {
    throw new Error(`Failed to fetch route stops for ${routeId}: ${response.status}`);
  }

  const payload = await response.json();
  const mappedStops: MBTAStop[] = ((payload?.data || []) as Array<{
    id: string;
    attributes: {
      name: string;
      latitude: number;
      longitude: number;
      wheelchair_boarding?: 0 | 1 | 2;
      platform_code?: string;
      parent_station?: string;
    };
  }>)
    .filter((item) => typeof item.attributes?.latitude === 'number' && typeof item.attributes?.longitude === 'number')
    .map((item) => ({
      id: item.id,
      name: item.attributes.name,
      latitude: item.attributes.latitude,
      longitude: item.attributes.longitude,
      wheelchairAccessible: item.attributes.wheelchair_boarding === 1,
      platformCode: item.attributes.platform_code,
      parentStopId: item.attributes.parent_station,
      routeIds: [routeId]
    }));

  routeStopsCache.set(routeId, { fetchedAt: Date.now(), stops: mappedStops });
  return mappedStops;
}

/**
 * Fetch trip headsign (destination) from MBTA API
 * Results are not cached as trip data is static per trip_id but rarely used
 */
export async function fetchTripHeadsign(tripId: string): Promise<string | null> {
  try {
    const url = new URL(`${MBTA_API}/trips/${tripId}`);
    const response = await fetch(url.toString(), { headers: mbtaHeaders() });

    if (!response.ok) {
      console.warn(`Failed to fetch trip ${tripId}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const headsign = data?.data?.attributes?.headsign || data?.data?.attributes?.destination;
    return typeof headsign === 'string' && headsign.trim().length > 0 ? headsign : null;
  } catch (error) {
    console.warn(`Error fetching trip ${tripId}:`, error);
    return null;
  }
}
