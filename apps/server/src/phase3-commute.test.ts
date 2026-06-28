import { describe, expect, it } from 'vitest';
import {
  hashUserId,
  rankEmergencyAlternatives,
  recommendDepartureWindows,
  summarizeCommutes
} from './phase3-commute';

describe('phase3-commute', () => {
  it('hashes user IDs deterministically', () => {
    expect(hashUserId('session-1')).toBe(hashUserId('session-1'));
    expect(hashUserId('session-1')).not.toBe(hashUserId('session-2'));
  });

  it('summarizes top commute pairs', () => {
    const records = [
      {
        commute_id: '1',
        user_hash: 'u1',
        from_stop_id: 'a',
        from_stop_name: 'A',
        to_stop_id: 'b',
        to_stop_name: 'B',
        departure_time_iso: '2026-06-20T08:05:00.000Z',
        day_of_week: 1,
        created_at: 1
      },
      {
        commute_id: '2',
        user_hash: 'u1',
        from_stop_id: 'a',
        from_stop_name: 'A',
        to_stop_id: 'b',
        to_stop_name: 'B',
        departure_time_iso: '2026-06-21T08:12:00.000Z',
        day_of_week: 2,
        created_at: 2
      }
    ];

    const summary = summarizeCommutes(records);
    expect(summary).toHaveLength(1);
    expect(summary[0].trip_count).toBe(2);
  });

  it('creates recommendation windows around typical departure', () => {
    const response = recommendDepartureWindows(
      { stop_id: 'a', stop_name: 'A' },
      { stop_id: 'b', stop_name: 'B' },
      []
    );

    expect(response.recommended_departure_windows).toHaveLength(3);
  });

  it('ranks emergency alternatives by composite score', () => {
    const ranked = rankEmergencyAlternatives([
      {
        route_id: 'r1',
        route_number: '1',
        route_name: 'R1',
        departure_stop_id: 'a',
        departure_stop_name: 'A',
        eta_minutes: 4,
        distance_increase_km: 0.3,
        time_penalty_minutes: 3,
        accessibility_support: 'full'
      },
      {
        route_id: 'r2',
        route_number: '2',
        route_name: 'R2',
        departure_stop_id: 'a',
        departure_stop_name: 'A',
        eta_minutes: 8,
        distance_increase_km: 1.1,
        time_penalty_minutes: 12,
        accessibility_support: 'partial'
      }
    ]);

    expect(ranked[0].route_id).toBe('r1');
  });
});
