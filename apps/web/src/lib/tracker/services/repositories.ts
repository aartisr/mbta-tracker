/**
 * Data Repository Layer
 * 
 * Centralizes all data fetching and transformation logic.
 * Enables:
 * - Consistent error handling and caching
 * - Easy testing (swap implementations)
 * - Pluggable data sources (MBTA API, mock, different endpoints)
 */

import type { MBTAStop } from '../geo-types';

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface TransitDataRepository {
  /**
   * Fetch all stops across the transit system
   */
  getAllStops(cacheMs?: number): Promise<MBTAStop[]>;

  /**
   * Find stops near a location
   */
  getNearbyStops(location: GeoLocation, radiusMeters?: number): Promise<MBTAStop[]>;

  /**
   * Get stop details by ID
   */
  getStop(stopId: string): Promise<MBTAStop | null>;
}

export interface GeoRepository {
  /**
   * Convert address/place name to coordinates
   */
  geocodeAddress(query: string): Promise<GeoLocation | null>;

  /**
   * Get user's current location
   */
  getUserLocation(): Promise<GeoLocation | null>;

  /**
   * Convert coordinates to human-readable address
   */
  reverseGeocode(lat: number, lon: number): Promise<string | null>;
}

/**
 * MBTA-specific implementation of TransitDataRepository
 */
export class MBTARepository implements TransitDataRepository {
  private baseUrl = 'https://api-v3.mbta.com';
  private cache = new Map<string, { data: any; timestamp: number }>();
  // Separate short-lived cache for route-per-stop lookups (1 hour)
  private stopRouteCache = new Map<string, { routeIds: string[]; timestamp: number }>();
  private readonly STOP_ROUTE_CACHE_MS = 60 * 60 * 1000;

  async getAllStops(cacheMs = 24 * 60 * 60 * 1000): Promise<MBTAStop[]> {
    return this.getCachedOrFetch('stops', async () => {
      const stops: MBTAStop[] = [];
      let nextUrl: string | null = `${this.baseUrl}/stops?filter[route_type]=0,1,2,3,4&sort=name&per_page=500`;

      while (nextUrl) {
        const response = await fetch(nextUrl, {
          headers: { Accept: 'application/vnd.api+json' }
        });

        if (!response.ok) {
          throw new Error(`MBTA API error: ${response.status}`);
        }

        const data = (await response.json()) as {
          data?: Array<{
            id?: string;
            attributes?: {
              name?: string;
              latitude?: number;
              longitude?: number;
              wheelchair_boarding?: number;
            };
          }>;
          links?: { next?: string };
        };

        if (data.data) {
          stops.push(
            ...data.data.map((stop) => ({
              id: stop.id ?? 'unknown',
              name: stop.attributes?.name ?? 'Unknown Stop',
              latitude: stop.attributes?.latitude ?? 0,
              longitude: stop.attributes?.longitude ?? 0,
              wheelchairAccessible: stop.attributes?.wheelchair_boarding === 1
            }))
          );
        }

        nextUrl = data.links?.next ?? null;
      }

      return stops;
    }, cacheMs);
  }

  async getNearbyStops(location: GeoLocation, radiusMeters = 800): Promise<MBTAStop[]> {
    const allStops = await this.getAllStops();

    const nearby = allStops.filter((stop) => {
      const distance = this.haversineDistance(
        location.latitude,
        location.longitude,
        stop.latitude,
        stop.longitude
      );
      return distance <= radiusMeters;
    });

    // Fetch which routes actually serve each nearby stop so that the
    // arrivals enricher can filter out vehicles whose routes don't stop here.
    const withRoutes = await Promise.all(
      nearby.map(async (stop) => {
        const routeIds = await this.getStopRouteIds(stop.id);
        return { ...stop, routeIds };
      })
    );

    return withRoutes;
  }

  /**
   * Returns the IDs of all routes that serve a given stop.
   * Results are cached for STOP_ROUTE_CACHE_MS to avoid redundant API calls.
   */
  async getStopRouteIds(stopId: string): Promise<string[]> {
    const cached = this.stopRouteCache.get(stopId);
    if (cached && Date.now() - cached.timestamp < this.STOP_ROUTE_CACHE_MS) {
      return cached.routeIds;
    }

    try {
      const url = `${this.baseUrl}/routes?filter[stop]=${encodeURIComponent(stopId)}`;
      const response = await fetch(url, {
        headers: { Accept: 'application/vnd.api+json' }
      });

      if (!response.ok) {
        return [];
      }

      const data = (await response.json()) as { data?: Array<{ id?: string }> };
      const routeIds = (data.data ?? []).map((r) => r.id ?? '').filter(Boolean);
      this.stopRouteCache.set(stopId, { routeIds, timestamp: Date.now() });
      return routeIds;
    } catch {
      return [];
    }
  }

  async getStop(stopId: string): Promise<MBTAStop | null> {
    try {
      const response = await fetch(`${this.baseUrl}/stops/${stopId}`, {
        headers: { Accept: 'application/vnd.api+json' }
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as {
        data?: {
          id?: string;
          attributes?: {
            name?: string;
            latitude?: number;
            longitude?: number;
            wheelchair_boarding?: number;
          };
        };
      };

      if (!data.data) {
        return null;
      }

      return {
        id: data.data.id ?? 'unknown',
        name: data.data.attributes?.name ?? 'Unknown Stop',
        latitude: data.data.attributes?.latitude ?? 0,
        longitude: data.data.attributes?.longitude ?? 0,
        wheelchairAccessible: data.data.attributes?.wheelchair_boarding === 1
      };
    } catch {
      return null;
    }
  }

  private async getCachedOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    cacheMs: number
  ): Promise<T> {
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < cacheMs) {
      return cached.data as T;
    }

    const data = await fetcher();
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

/**
 * Nominatim/OpenStreetMap implementation of GeoRepository
 */
export class GeoRepository {
  private baseUrl = 'https://nominatim.openstreetmap.org';
  private timeout = 5000;

  async geocodeAddress(query: string): Promise<GeoLocation | null> {
    if (!query.trim()) {
      return null;
    }

    try {
      const params = new URLSearchParams({
        q: query.trim(),
        format: 'jsonv2',
        limit: '1',
        addressdetails: '0'
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(`${this.baseUrl}/search?${params.toString()}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          return null;
        }

        const results = (await response.json()) as Array<{ lat?: string; lon?: string }>;
        const first = results[0];

        if (!first?.lat || !first?.lon) {
          return null;
        }

        const lat = Number(first.lat);
        const lon = Number(first.lon);

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
          return null;
        }

        return { latitude: lat, longitude: lon };
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch {
      return null;
    }
  }

  async getUserLocation(): Promise<GeoLocation | null> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return null;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        () => {
          resolve(null);
        },
        { timeout: this.timeout }
      );
    });
  }

  async reverseGeocode(lat: number, lon: number): Promise<string | null> {
    try {
      const params = new URLSearchParams({
        format: 'jsonv2',
        lat: lat.toString(),
        lon: lon.toString()
      });

      const response = await fetch(`${this.baseUrl}/reverse?${params.toString()}`, {
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as { display_name?: string };
      return data.display_name ?? null;
    } catch {
      return null;
    }
  }
}

/**
 * Mock repository for testing (swappable)
 */
export class MockTransitDataRepository implements TransitDataRepository {
  private stops: MBTAStop[] = [
    {
      id: 'test-stop-1',
      name: 'Test Stop 1',
      latitude: 42.36,
      longitude: -71.06,
      wheelchairAccessible: true
    },
    {
      id: 'test-stop-2',
      name: 'Test Stop 2',
      latitude: 42.3601,
      longitude: -71.0589,
      wheelchairAccessible: false
    }
  ];

  async getAllStops(): Promise<MBTAStop[]> {
    return this.stops;
  }

  async getNearbyStops(location: GeoLocation, radiusMeters = 800): Promise<MBTAStop[]> {
    return this.stops.filter((stop) => {
      const distance = Math.hypot(
        (stop.latitude - location.latitude) * 111000,
        (stop.longitude - location.longitude) * 111000
      );
      return distance <= radiusMeters;
    });
  }

  async getStop(stopId: string): Promise<MBTAStop | null> {
    return this.stops.find((s) => s.id === stopId) ?? null;
  }
}
