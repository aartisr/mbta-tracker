import type { FeedPoller, Vehicle } from '@mbta/transit-core';
import { diffVehicles } from '@mbta/transit-core';

export const MBTA_JSON_FEED = 'https://api-v3.mbta.com/vehicles?include=trip,route';

export type MbtaVehiclesResponse = {
  data?: Array<{
    id?: string;
    attributes?: {
      latitude?: number;
      longitude?: number;
      bearing?: number;
      updated_at?: string;
    };
    relationships?: {
      route?: { data?: { id?: string } };
      trip?: { data?: { id?: string } };
    };
  }>;
  included?: Array<{
    type?: string;
    id?: string;
    attributes?: {
      headsign?: string;
      destination?: string;
      [key: string]: unknown;
    };
  }>;
};

export function normalizeJsonFeed(data: MbtaVehiclesResponse): Vehicle[] {
  // Build a map of trip_id -> headsign from included data
  const tripHeadsigns = new Map<string, string>();
  if (data.included) {
    for (const item of data.included) {
      if (item.type === 'trip' && item.id) {
        const headsign = item.attributes?.headsign || item.attributes?.destination;
        if (typeof headsign === 'string' && headsign.trim().length > 0) {
          tripHeadsigns.set(item.id, headsign);
        }
      }
    }
  }

  return (data.data ?? [])
    .map((entry) => {
      const id = entry.id;
      const lat = entry.attributes?.latitude;
      const lon = entry.attributes?.longitude;
      const tripId = entry.relationships?.trip?.data?.id;
      const headsign = tripId ? tripHeadsigns.get(tripId) : undefined;

      if (!id || typeof lat !== 'number' || typeof lon !== 'number') {
        return null;
      }

      return {
        id,
        route: entry.relationships?.route?.data?.id ?? null,
        lat,
        lon,
        bearing: entry.attributes?.bearing ?? 0,
        timestamp: entry.attributes?.updated_at ?? null,
        tripId: tripId ?? undefined,
        headsign: headsign ?? undefined
      } satisfies Vehicle;
    })
    .filter((vehicle): vehicle is Vehicle => vehicle !== null);
}

export class JsonFeedPoller implements FeedPoller {
  private previous = new Map<string, Vehicle>();

  constructor(private readonly feedUrl: string = MBTA_JSON_FEED) {}

  async poll(): Promise<Vehicle[]> {
    const response = await fetch(this.feedUrl, {
      headers: { accept: 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`MBTA fetch failed: ${response.status}`);
    }

    const data = (await response.json()) as MbtaVehiclesResponse;
    return diffVehicles(this.previous, normalizeJsonFeed(data));
  }

  reset(): void {
    this.previous.clear();
  }
}
