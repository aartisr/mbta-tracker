/**
 * Core vehicle type shared across all MBTA realtime backends.
 * Used by both the Bun dev server and the Cloudflare Worker.
 */
export type Vehicle = {
  id: string;
  route: string | null;
  lat: number;
  lon: number;
  bearing: number;
  timestamp: string | null;
};

/**
 * Payload broadcast to WebSocket clients.
 */
export type VehicleUpdate = Vehicle[];
