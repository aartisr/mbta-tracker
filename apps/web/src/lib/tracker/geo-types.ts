/**
 * Geolocation & Stop Discovery Types
 * Supports intelligent stop ranking, accessibility, and confidence scoring
 */

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export interface MBTAStop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  wheelchairAccessible?: boolean;
  platformCode?: string;
  parentStopId?: string;
  /** Route IDs that actually serve this stop, populated from MBTA API. */
  routeIds?: string[];
}

export interface NearbyStop extends MBTAStop {
  distanceMeters: number;
  walkingMinutes: number;
  nextArrivals: NearbyArrival[];
  hasAccessibilityAlert?: boolean;
}

export interface NearbyArrival {
  vehicleId: string;
  routeId: string | null;
  routeLabel: string | null;
  mode: 'bus' | 'subway' | 'commuter-rail' | 'ferry';
  arrivalSeconds: number;
  confidenceSeconds: number; // ±N seconds uncertainty band
  wheelchairAccessible: boolean;
  hasAudioAnnouncements: boolean;
}

export interface StopFinderState {
  status: 'idle' | 'locating' | 'searching' | 'found' | 'error';
  userLocation?: GeoLocation;
  searchQuery: string;
  nearbyStops: NearbyStop[];
  selectedStopId?: string;
  error?: string;
  carbonSavedGrams?: number;
  costSavedCents?: number;
}

export interface AccessibilityFilter {
  wheelchairOnly: boolean;
  audioAnnouncementsOnly: boolean;
  visualIndicatorsOnly: boolean;
}
