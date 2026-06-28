import type { Vehicle } from './types.js';

/**
 * Computes the set of vehicles whose position has changed since the last poll.
 * Mutates `previous` in place — pass the same Map across repeated calls.
 *
 * @param previous  Running cache of the last-seen vehicle state (mutated).
 * @param next      Fresh list of vehicles from the current poll.
 * @returns         Only the vehicles that moved or are newly seen.
 */
export function diffVehicles(
  previous: Map<string, Vehicle>,
  next: Vehicle[]
): Vehicle[] {
  const updates: Vehicle[] = [];
  for (const vehicle of next) {
    const prev = previous.get(vehicle.id);
    if (!prev || prev.lat !== vehicle.lat || prev.lon !== vehicle.lon) {
      updates.push(vehicle);
      previous.set(vehicle.id, vehicle);
    }
  }
  return updates;
}
