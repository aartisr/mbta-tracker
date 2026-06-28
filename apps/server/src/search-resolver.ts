/**
 * Search Resolver Service
 * Resolves parsed queries into concrete search results from MBTA API
 */

import axios from 'axios';
import type {
  SearchResult,
  RouteResult,
  StopResult,
  VehicleResult,
  AddressResult,
  LandmarkResult,
  SearchQuery,
} from './types';

const MBTA_API_BASE = 'https://api-v3.mbta.com';
const GEOCODING_API = 'https://nominatim.openstreetmap.org';

interface MBTARoute {
  id: string;
  attributes: {
    number?: string;
    name?: string;
    long_name?: string;
    type: number;
    direction_names: string[];
    description?: string;
  };
}

interface MBTAStop {
  id: string;
  attributes: {
    name: string;
    code?: string;
    latitude: number;
    longitude: number;
    accessibility?: string[];
    parent_station?: string;
  };
}

interface MBTAVehicle {
  id: string;
  attributes: {
    route_id: string;
    trip_id: string;
    label?: string;
    latitude?: number;
    longitude?: number;
    current_stop_sequence?: number;
  };
  relationships?: {
    trip?: {
      data: { id: string; type: string };
    };
  };
}

const modeMap: Record<number, string> = {
  0: 'subway',
  1: 'subway',
  2: 'rail',
  3: 'bus',
  4: 'ferry',
  5: 'cable_car',
  11: 'trolleybus',
};

function normalizeAutocompleteValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[-_/]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ');
}

function buildAutocompletePrefixes(value: string): string[] {
  const normalized = normalizeAutocompleteValue(value);
  if (!normalized) {
    return [];
  }

  const prefixes = new Set<string>();
  const tokens = normalized.split(' ').filter(Boolean);

  const addPrefixFamily = (segment: string) => {
    const trimmed = segment.trim();
    const maxLength = Math.min(trimmed.length, 32);
    for (let i = 1; i <= maxLength; i += 1) {
      prefixes.add(trimmed.slice(0, i));
    }
  };

  addPrefixFamily(normalized);
  for (const token of tokens) {
    addPrefixFamily(token);
  }

  return Array.from(prefixes);
}

export class SearchResolverService {
  private routeCache = new Map<string, RouteResult>();
  private stopCache = new Map<string, StopResult>();
  private routeAutocompleteIndex = new Map<string, Set<string>>();
  private stopAutocompleteIndex = new Map<string, Set<string>>();
  private addressSuggestionCache = new Map<string, { ts: number; results: AddressResult[] }>();
  private lastCacheRefresh = 0;
  private cacheRefreshInterval = 3600000; // 1 hour

  async resolve(query: SearchQuery): Promise<SearchResult[]> {
    try {
      // Refresh caches periodically
      if (Date.now() - this.lastCacheRefresh > this.cacheRefreshInterval) {
        await this.refreshCaches();
      }

      switch (query.query_type) {
        case 'route':
          return await this.resolveRoute(query.query_string);
        case 'stop':
          return await this.resolveStop(query.query_string);
        case 'address':
          return await this.resolveAddress(query.query_string);
        case 'vehicle':
          return await this.resolveVehicle(query.query_string);
        case 'landmark':
          return await this.resolveLandmark(query.query_string);
        default:
          return [];
      }
    } catch (error) {
      console.error('[resolver] Error resolving query:', error);
      return [];
    }
  }

  async autocomplete(rawQuery: string, limit = 10): Promise<SearchResult[]> {
    const query = rawQuery.trim().toLowerCase();
    if (!query) {
      return [];
    }

    try {
      await this.ensureStopCacheLoaded();

      const stopMatches = this.collectAutocompleteResults(
        this.stopAutocompleteIndex,
        this.stopCache,
        query,
        Math.max(0, limit - 3),
        (stop) => this.scoreStopAutocomplete(stop, query)
      );

      const routeMatches = this.collectAutocompleteResults(
        this.routeAutocompleteIndex,
        this.routeCache,
        query,
        4,
        (route) => this.scoreRouteAutocomplete(route, query)
      );

      const results: SearchResult[] = [...stopMatches, ...routeMatches];

      if (this.looksLikeAddressQuery(query)) {
        const addressMatches = await this.suggestAddresses(query, Math.min(4, limit));
        results.unshift(...addressMatches);
      }

      const deduped = new Map<string, SearchResult>();
      for (const result of results) {
        let key = `${result.type}:`;
        if (result.type === 'stop') {
          key += result.stop_id;
        } else if (result.type === 'route') {
          key += result.route_id;
        } else if (result.type === 'address') {
          key += result.address;
        } else if (result.type === 'vehicle') {
          key += result.vehicle_id;
        } else {
          key += result.landmark_name;
        }

        if (!deduped.has(key)) {
          deduped.set(key, result);
        }
      }

      return Array.from(deduped.values()).slice(0, limit);
    } catch (error) {
      console.error('[resolver] Error generating autocomplete suggestions:', error);
      return [];
    }
  }

  private async resolveRoute(query: string): Promise<RouteResult[]> {
    const results: RouteResult[] = [];

    try {
      // Try to fetch routes matching the query
      const response = await axios.get(`${MBTA_API_BASE}/routes`, {
        params: {
          'filter[type]': '0,1,2,3,4', // All modes
          'fields[route]': 'long_name,description,direction_names,type',
          'page[limit]': 1000,
        },
        timeout: 5000,
      });

      const routes: MBTARoute[] = response.data.data;

      // Filter routes matching query
      const matchingRoutes = routes.filter(route => {
        const routeId = (route.id || '').toLowerCase();
        const num = (route.attributes.number || '').toLowerCase();
        const name = (route.attributes.name || '').toLowerCase();
        const longName = (route.attributes.long_name || '').toLowerCase();
        const q = query.toLowerCase();

        return routeId.includes(q) || num.includes(q) || name.includes(q) || longName.includes(q);
      });

      // Convert to results
      for (const route of matchingRoutes.slice(0, 5)) {
        const mode = modeMap[route.attributes.type] || 'unknown';
        const routeNumber = route.attributes.number || route.id;
        const routeName = route.attributes.long_name || route.attributes.name || route.id;
        const result: RouteResult = {
          type: 'route',
          route_id: route.id,
          route_number: routeNumber,
          route_name: routeName,
          mode: mode as any,
          direction_names: route.attributes.direction_names || [],
          confidence: 0.9,
          description: route.attributes.description,
        };
        results.push(result);
        this.routeCache.set(route.id, result);
        this.indexRouteAutocomplete(result);
      }
    } catch (error) {
      console.error('[resolver] Error fetching routes:', error);
    }

    return results;
  }

  private async resolveStop(query: string): Promise<StopResult[]> {
    const results: StopResult[] = [];
    const q = query.toLowerCase();

    // Prefer cached stop data first. Cache is refreshed at resolve() entry.
    const cachedMatches = Array.from(this.stopCache.values()).filter(stop => {
      const name = (stop.stop_name || '').toLowerCase();
      const code = (stop.stop_code || '').toLowerCase();
      return name.includes(q) || code.includes(q);
    });

    if (cachedMatches.length > 0) {
      return cachedMatches.slice(0, 5).map(stop => ({
        ...stop,
        confidence: Math.max(stop.confidence ?? 0.8, 0.9),
      }));
    }

    try {
      // Fetch stops from MBTA API
      const response = await axios.get(`${MBTA_API_BASE}/stops`, {
        params: {
          'fields[stop]': 'name,code,latitude,longitude,accessibility,parent_station',
          'page[limit]': 3000,
        },
        timeout: 5000,
      });

      const stops: MBTAStop[] = response.data.data;

      // Filter stops matching query
      const matchingStops = stops.filter(stop => {
        const name = stop.attributes.name.toLowerCase();
        const code = (stop.attributes.code || '').toLowerCase();

        return name.includes(q) || code.includes(q);
      });

      // Convert to results, ranked by match quality
      for (const stop of matchingStops.slice(0, 5)) {
        const result: StopResult = {
          type: 'stop',
          stop_id: stop.id,
          stop_name: stop.attributes.name,
          stop_code: stop.attributes.code,
          latitude: stop.attributes.latitude,
          longitude: stop.attributes.longitude,
          accessibility_features: stop.attributes.accessibility,
          parent_stop_id: stop.attributes.parent_station,
          confidence: 0.85,
        };
        results.push(result);
        this.stopCache.set(stop.id, result);
        this.indexStopAutocomplete(result);
      }
    } catch (error) {
      console.error('[resolver] Error fetching stops:', error);
    }

    return results;
  }

  private async resolveAddress(query: string): Promise<AddressResult[]> {
    await this.ensureStopCacheLoaded();

    const isMassachusettsHinted = /\b(ma|massachusetts)\b/i.test(query);
    const candidateQueries = isMassachusettsHinted
      ? [query]
      : [query, `${query}, MA`, `${query}, Massachusetts`];

    let places: any[] = [];

    try {
      for (const candidate of candidateQueries) {
        const response = await axios.get(`${GEOCODING_API}/search`, {
          params: {
            q: candidate,
            format: 'json',
            addressdetails: 1,
            limit: 5,
            countrycodes: 'us',
          },
          headers: {
            'User-Agent': 'mbta-tracker-search/1.0',
          },
          timeout: 5000,
        });

        if (Array.isArray(response.data) && response.data.length > 0) {
          const preferred = this.preferMassachusettsResults(response.data);
          if (preferred.length > 0) {
            places = preferred;
            break;
          }

          // Keep as fallback, but continue checking MA-hinted candidates.
          if (places.length === 0) {
            places = response.data;
          }
        }
      }

      const results: AddressResult[] = places.slice(0, 5).map((place: any) => {
        const latitude = parseFloat(place.lat);
        const longitude = parseFloat(place.lon);
        const nearbyStops = this.findNearbyStopsFromCache(latitude, longitude, 1.1, 5);

        return {
          type: 'address' as const,
          address: place.display_name,
          latitude,
          longitude,
          nearby_stops: nearbyStops,
          distance_km: nearbyStops.length > 0
            ? this.distanceKm(latitude, longitude, nearbyStops[0].latitude, nearbyStops[0].longitude)
            : 0,
          confidence: 0.84,
        };
      });

      return results;
    } catch (error) {
      console.error('[resolver] Error resolving address:', error);
      return [];
    }
  }

  private async resolveVehicle(query: string): Promise<VehicleResult[]> {
    try {
      // Parse vehicle ID from query (e.g., "veh-4421" or "4421")
      const vehicleId = query.replace(/^veh[:\s-]*/, '').toUpperCase();

      // Fetch vehicle from MBTA API
      const response = await axios.get(`${MBTA_API_BASE}/vehicles`, {
        params: {
          'fields[vehicle]': 'route_id,trip_id,label,latitude,longitude,current_stop_sequence',
          'filter[label]': vehicleId,
        },
        timeout: 5000,
      });

      const vehicles: MBTAVehicle[] = response.data.data;

      if (vehicles.length === 0) {
        return [];
      }

      const vehicle = vehicles[0];
      const routeId = vehicle.attributes.route_id;

      // Get route info for the vehicle
      const routeResponse = await axios.get(`${MBTA_API_BASE}/routes/${routeId}`, {
        params: {
          'fields[route]': 'number,name',
        },
        timeout: 5000,
      });

      const route = routeResponse.data.data;

      const result: VehicleResult = {
        type: 'vehicle',
        vehicle_id: vehicle.id,
        route_id: routeId,
        route_number: route.attributes.number,
        trip_id: vehicle.attributes.trip_id,
        headsign: vehicle.attributes.label || 'Unknown',
        latitude: vehicle.attributes.latitude,
        longitude: vehicle.attributes.longitude,
        confidence: 0.95,
      };

      return [result];
    } catch (error) {
      console.error('[resolver] Error resolving vehicle:', error);
      return [];
    }
  }

  private async resolveLandmark(query: string): Promise<LandmarkResult[]> {
    // Map landmarks to coordinates
    const landmarks: Record<string, [number, number]> = {
      downtown: [42.3585, -71.0636],
      airport: [42.3656, -71.0096],
      harbor: [42.361, -71.0534],
      waterfront: [42.3656, -71.0096],
    };

    const q = query.toLowerCase();
    const coords = landmarks[q];

    if (!coords) {
      return [];
    }

    const [lat, lon] = coords;
    await this.ensureStopCacheLoaded();
    const nearbyStops = this.findNearbyStopsFromCache(lat, lon, 0.9, 8);

    const result: LandmarkResult = {
      type: 'landmark',
      landmark_name: query,
      latitude: lat,
      longitude: lon,
      nearby_stops: nearbyStops,
      confidence: 0.85,
    };

    return [result];
  }

  private findNearbyStopsFromCache(latitude: number, longitude: number, radiusKm: number, limit: number): StopResult[] {
    const withinRadius = Array.from(this.stopCache.values())
      .map(stop => ({
        stop,
        distance: this.distanceKm(latitude, longitude, stop.latitude, stop.longitude),
        busScore: this.estimateBusFriendliness(stop),
      }))
      .filter(entry => entry.distance <= radiusKm)
      .sort((a, b) => {
        if (b.busScore !== a.busScore) {
          return b.busScore - a.busScore;
        }

        return a.distance - b.distance;
      })
      .slice(0, limit)
      .map(entry => ({
        ...entry.stop,
        confidence: Math.max(entry.stop.confidence ?? 0.8, 0.92),
      }));

    return withinRadius;
  }

  private looksLikeAddressQuery(query: string): boolean {
    if (query.length < 4) {
      return false;
    }

    const startsWithStreetNumber = /^\d+\s+/.test(query);
    const hasStreetWord = /\b(st|street|ave|avenue|rd|road|blvd|boulevard|way|dr|drive|ln|lane|ct|court|pkwy|parkway)\b/i.test(query);
    const hasCityHint = /\b(boston|cambridge|somerville|malden|medford|quincy|brookline|ma|massachusetts)\b/i.test(query);

    return startsWithStreetNumber || hasStreetWord || hasCityHint;
  }

  private async suggestAddresses(query: string, limit: number): Promise<AddressResult[]> {
    const cacheKey = query.toLowerCase();
    const cached = this.addressSuggestionCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.ts < 30000) {
      return cached.results.slice(0, limit);
    }

    try {
      const hasMassachusettsHint = /\b(ma|massachusetts)\b/i.test(query);
      const candidates = hasMassachusettsHint
        ? [query]
        : [query, `${query}, MA`, `${query}, Massachusetts`];

      let places: any[] = [];

      for (const candidate of candidates) {
        const response = await axios.get(`${GEOCODING_API}/search`, {
          params: {
            q: candidate,
            format: 'json',
            addressdetails: 1,
            limit,
            countrycodes: 'us',
          },
          headers: {
            'User-Agent': 'mbta-tracker-search/1.0',
          },
          timeout: 2500,
        });

        if (Array.isArray(response.data) && response.data.length > 0) {
          const preferred = this.preferMassachusettsResults(response.data);
          if (preferred.length > 0) {
            places = preferred;
            break;
          }

          if (places.length === 0) {
            places = response.data;
          }
        }
      }

      const results: AddressResult[] = places.length > 0
        ? places.slice(0, limit).map((place: any) => {
          const latitude = parseFloat(place.lat);
          const longitude = parseFloat(place.lon);
          const nearbyStops = this.findNearbyStopsFromCache(latitude, longitude, 1.1, 4);

          return {
            type: 'address' as const,
            address: place.display_name,
            latitude,
            longitude,
            nearby_stops: nearbyStops,
            distance_km: nearbyStops.length > 0
              ? this.distanceKm(latitude, longitude, nearbyStops[0].latitude, nearbyStops[0].longitude)
              : 0,
            confidence: 0.82,
          };
        })
        : [];

      this.addressSuggestionCache.set(cacheKey, { ts: now, results });
      return results;
    } catch {
      return [];
    }
  }

  private scoreStopAutocomplete(stop: StopResult, query: string): number {
    const name = (stop.stop_name || '').toLowerCase();
    const code = (stop.stop_code || '').toLowerCase();

    if (name.startsWith(query) || code.startsWith(query)) {
      return 3;
    }
    if (name.includes(query) || code.includes(query)) {
      return 2;
    }
    return 1;
  }

  private scoreRouteAutocomplete(route: RouteResult, query: string): number {
    const num = (route.route_number || '').toLowerCase();
    const name = (route.route_name || '').toLowerCase();
    const id = (route.route_id || '').toLowerCase();

    if (num === query || id === query) {
      return 4;
    }
    if (num.startsWith(query) || name.startsWith(query)) {
      return 3;
    }
    if (num.includes(query) || name.includes(query) || id.includes(query)) {
      return 2;
    }
    return 1;
  }

  private async ensureStopCacheLoaded(): Promise<void> {
    if (this.stopCache.size > 0 && Date.now() - this.lastCacheRefresh <= this.cacheRefreshInterval) {
      return;
    }

    await this.refreshCaches();
  }

  private preferMassachusettsResults(places: any[]): any[] {
    const matches = places.filter((place: any) => {
      const label = String(place?.display_name || '').toLowerCase();
      return label.includes('massachusetts') || /\bma\b/.test(label);
    });

    return matches;
  }

  private distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusKm * c;
  }

  private estimateBusFriendliness(stop: StopResult): number {
    const stopId = (stop.stop_id || '').toLowerCase();
    const stopName = (stop.stop_name || '').toLowerCase();

    let score = 0;

    // Street-intersection style names are typically bus stops.
    if (stopName.includes(' @ ') || stopName.includes(' at ') || stopName.includes(' opp ')) {
      score += 3;
    }

    // Place/node stations are commonly rapid transit anchors; de-prioritize for bus-first intent.
    if (!stopId.startsWith('place-') && !stopId.startsWith('node-')) {
      score += 2;
    } else {
      score -= 1;
    }

    // Parented child stops are often platform-specific and useful for boarding.
    if (stop.parent_stop_id) {
      score += 1;
    }

    return score;
  }

  private indexRouteAutocomplete(route: RouteResult): void {
    const values = [route.route_id, route.route_number, route.route_name];

    for (const value of values) {
      for (const prefix of buildAutocompletePrefixes(value)) {
        const bucket = this.routeAutocompleteIndex.get(prefix) || new Set<string>();
        bucket.add(route.route_id);
        this.routeAutocompleteIndex.set(prefix, bucket);
      }
    }
  }

  private indexStopAutocomplete(stop: StopResult): void {
    const values = [stop.stop_id, stop.stop_name, stop.stop_code || ''];

    for (const value of values) {
      if (!value) {
        continue;
      }

      for (const prefix of buildAutocompletePrefixes(value)) {
        const bucket = this.stopAutocompleteIndex.get(prefix) || new Set<string>();
        bucket.add(stop.stop_id);
        this.stopAutocompleteIndex.set(prefix, bucket);
      }
    }
  }

  private collectAutocompleteResults<T extends SearchResult>(
    index: Map<string, Set<string>>,
    cache: Map<string, T>,
    query: string,
    limit: number,
    score: (result: T) => number
  ): T[] {
    if (limit <= 0) {
      return [];
    }

    const normalizedQuery = normalizeAutocompleteValue(query);
    const indexedIds = index.get(normalizedQuery);

    const indexedResults = indexedIds
      ? Array.from(indexedIds)
        .map((id) => cache.get(id))
        .filter((value): value is T => value !== undefined)
      : [];

    const source = indexedResults.length > 0
      ? indexedResults
      : Array.from(cache.values()).filter((result) => {
        if (result.type === 'route') {
          const route = result as RouteResult;
          return (
            normalizeAutocompleteValue(route.route_id).includes(normalizedQuery)
            || normalizeAutocompleteValue(route.route_number).includes(normalizedQuery)
            || normalizeAutocompleteValue(route.route_name).includes(normalizedQuery)
          );
        }

        const stop = result as StopResult;
        return (
          normalizeAutocompleteValue(stop.stop_id).includes(normalizedQuery)
          || normalizeAutocompleteValue(stop.stop_name).includes(normalizedQuery)
          || normalizeAutocompleteValue(stop.stop_code || '').includes(normalizedQuery)
        );
      });

    return source
      .sort((a, b) => score(b) - score(a))
      .slice(0, limit);
  }

  private async refreshCaches(): Promise<void> {
    try {
      this.routeCache.clear();
      this.stopCache.clear();
      this.routeAutocompleteIndex.clear();
      this.stopAutocompleteIndex.clear();

      // Fetch all routes
      const routeResponse = await axios.get(`${MBTA_API_BASE}/routes`, {
        params: {
          'fields[route]': 'long_name,description,direction_names,type',
          'page[limit]': 1000,
        },
        timeout: 10000,
      });

      const routes: MBTARoute[] = routeResponse.data.data;

      for (const route of routes) {
        const mode = modeMap[route.attributes.type] || 'unknown';
        const routeNumber = route.attributes.number || route.id;
        const routeName = route.attributes.long_name || route.attributes.name || route.id;
        this.routeCache.set(route.id, {
          type: 'route',
          route_id: route.id,
          route_number: routeNumber,
          route_name: routeName,
          mode: mode as any,
          direction_names: route.attributes.direction_names || [],
          confidence: 0.95,
        });
        this.indexRouteAutocomplete(this.routeCache.get(route.id)!);
      }

      // Fetch major stops
      const stopResponse = await axios.get(`${MBTA_API_BASE}/stops`, {
        params: {
          'fields[stop]': 'name,code,latitude,longitude,accessibility,parent_station',
          'page[limit]': 3000,
        },
        timeout: 10000,
      });

      const stops: MBTAStop[] = stopResponse.data.data;

      for (const stop of stops) {
        this.stopCache.set(stop.id, {
          type: 'stop',
          stop_id: stop.id,
          stop_name: stop.attributes.name,
          stop_code: stop.attributes.code,
          latitude: stop.attributes.latitude,
          longitude: stop.attributes.longitude,
          accessibility_features: stop.attributes.accessibility,
          parent_stop_id: stop.attributes.parent_station,
          confidence: 0.95,
        });
        this.indexStopAutocomplete(this.stopCache.get(stop.id)!);
      }

      this.lastCacheRefresh = Date.now();
    } catch (error) {
      console.error('[resolver] Error refreshing caches:', error);
    }
  }
}
