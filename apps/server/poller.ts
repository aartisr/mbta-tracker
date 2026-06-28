import axios from 'axios';
import * as protobuf from 'protobufjs';
import type { FeedPoller, Vehicle } from '@mbta/transit-core';
import { diffVehicles } from '@mbta/transit-core';

export const PROTOBUF_FEED_URL = 'https://cdn.mbta.com/realtime/VehiclePositions.pb';

export function normalizeProtobufFeed(feed: any): Vehicle[] {
  return (feed.entity || [])
    .map((entity: any) => {
      const vehicle = entity.vehicle;
      if (!vehicle || !vehicle.position) {
        return null;
      }

      return {
        id: entity.id,
        route: vehicle.trip?.routeId ?? null,
        lat: vehicle.position.latitude,
        lon: vehicle.position.longitude,
        bearing: vehicle.position.bearing ?? 0,
        timestamp: vehicle.timestamp ?? null
      } satisfies Vehicle;
    })
    .filter((vehicle: Vehicle | null): vehicle is Vehicle => vehicle !== null);
}

export async function loadFeedMessageType(protoPath: string): Promise<any> {
  const root = await protobuf.load(protoPath);
  return root.lookupType('transit_realtime.FeedMessage');
}

export function decodeProtobufFeed(feedMessageType: any, buffer: ArrayBuffer): any {
  const message = feedMessageType.decode(new Uint8Array(buffer));
  return feedMessageType.toObject(message, { longs: String });
}

export class ProtobufFeedPoller implements FeedPoller {
  private previous = new Map<string, Vehicle>();

  constructor(
    private readonly feedMessageType: any,
    private readonly feedUrl: string = PROTOBUF_FEED_URL
  ) {}

  async poll(): Promise<Vehicle[]> {
    const response = await axios.get(this.feedUrl, { responseType: 'arraybuffer' });
    const decoded = decodeProtobufFeed(this.feedMessageType, response.data);
    const vehicles = normalizeProtobufFeed(decoded);
    return diffVehicles(this.previous, vehicles);
  }

  reset(): void {
    this.previous.clear();
  }
}