import type { SearchResult } from '$lib/types';

export function getResultKindLabel(result: SearchResult): string {
  switch (result.type) {
    case 'route':
      return `Route ${result.route_number}`;
    case 'stop':
      return 'Stop';
    case 'address':
      return 'Address';
    case 'vehicle':
      return 'Vehicle';
    case 'landmark':
      return 'Landmark';
  }
}

export function getResultTitle(result: SearchResult): string {
  switch (result.type) {
    case 'route':
      return `Route ${result.route_number}`;
    case 'stop':
      return result.stop_name;
    case 'address':
      return result.address;
    case 'vehicle':
      return `Vehicle ${result.vehicle_id}`;
    case 'landmark':
      return result.landmark_name;
  }
}

export function getResultActionLabel(result: SearchResult): string {
  switch (result.type) {
    case 'route':
      return 'View route';
    case 'stop':
      return 'View arrivals';
    case 'address':
      return 'Best nearby stop';
    case 'vehicle':
      return 'Track vehicle';
    case 'landmark':
      return 'Nearby stops';
  }
}

export function getResultDetail(result: SearchResult): string {
  switch (result.type) {
    case 'stop':
      return result.stop_code ? `Stop code ${result.stop_code}` : 'Live arrivals and stop detail';
    case 'route':
      return result.description || result.direction_names.join(' • ') || 'Route detail and live arrivals';
    case 'address':
      return result.nearby_stops.length > 0
        ? `Nearest stop: ${result.nearby_stops[0].stop_name} (${result.distance_km.toFixed(1)} km)`
        : 'Address found. Tap to view the closest transit option.';
    case 'vehicle':
      return `Route ${result.route_number} • ${result.headsign}`;
    case 'landmark':
      return result.nearby_stops.length > 0
        ? `${result.nearby_stops.length} nearby stops, including ${result.nearby_stops[0].stop_name}`
        : 'Landmark found. Nearby stops were not detected yet.';
  }
}
