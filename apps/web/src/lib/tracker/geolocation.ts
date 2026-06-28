/**
 * Geolocation & Address Search
 * Uses browser geolocation API + Nominatim geocoding (no API key required)
 */

import type { GeoLocation } from './geo-types';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const SEARCH_CACHE_KEY = 'mbta_recent_searches';
const MAX_CACHED_SEARCHES = 10;

export async function requestUserLocation(): Promise<GeoLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now()
        });
      },
      (error) => {
        reject(new Error(`Geolocation denied: ${error.message}`));
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  });
}

export async function geocodeAddress(query: string): Promise<GeoLocation> {
  if (!query.trim()) {
    throw new Error('Empty search query');
  }

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '1'
    });

    const response = await fetch(`${NOMINATIM_BASE}/search?${params.toString()}`, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Geocoding request failed: ${response.status}`);
    }

    const results = await response.json();
    if (!Array.isArray(results) || results.length === 0) {
      throw new Error('Address not found');
    }

    const result = results[0];
    const location: GeoLocation = {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      timestamp: Date.now()
    };

    cacheSearchResult(query);
    return location;
  } catch (error) {
    throw new Error(`Failed to geocode address: ${error instanceof Error ? error.message : 'unknown'}`);
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
      format: 'json'
    });

    const response = await fetch(`${NOMINATIM_BASE}/reverse?${params.toString()}`, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Reverse geocoding request failed: ${response.status}`);
    }

    const result = await response.json();
    return result.address?.road || result.address?.suburb || result.address?.city || 'Unknown location';
  } catch (error) {
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }
}

export function getRecentSearches(): string[] {
  if (typeof localStorage === 'undefined') return [];
  const cached = localStorage.getItem(SEARCH_CACHE_KEY);
  return cached ? JSON.parse(cached) : [];
}

function cacheSearchResult(query: string) {
  if (typeof localStorage === 'undefined') return;
  let searches = getRecentSearches();
  searches = searches.filter((s) => s !== query);
  searches.unshift(query);
  searches = searches.slice(0, MAX_CACHED_SEARCHES);
  localStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(searches));
}

export function clearSearchHistory() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(SEARCH_CACHE_KEY);
  }
}

// Haversine distance in meters
export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

// Walking time estimate: ~1.4 m/s average pace
export function estimateWalkingMinutes(distanceMeters: number): number {
  const WALKING_SPEED_MS = 1.4;
  return Math.ceil((distanceMeters / WALKING_SPEED_MS) / 60);
}
