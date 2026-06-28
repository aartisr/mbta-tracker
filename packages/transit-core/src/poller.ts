import type { Vehicle } from './types.js';

/**
 * FeedPoller — contract for fetching a GTFS-RT or JSON vehicle feed
 * and returning only the vehicles whose positions have changed.
 *
 * Implement this interface for each runtime/data-source combination:
 *   - ProtobufFeedPoller  (Bun server, GTFS-RT .pb endpoint)
 *   - JsonFeedPoller      (Cloudflare Worker, MBTA JSON API)
 *
 * The diff state (previous positions) is owned by each implementation
 * so callers only need to call `poll()` and broadcast the result.
 */
export interface FeedPoller {
  /**
   * Fetch the latest vehicle positions and return only those that moved
   * or are newly seen since the last call.
   */
  poll(): Promise<Vehicle[]>;

  /**
   * Clear internal diff state. Useful when restarting or reconnecting
   * so that all current vehicles are re-broadcast on the next poll.
   */
  reset(): void;
}
