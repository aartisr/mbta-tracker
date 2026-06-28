import { describe, expect, it, vi } from 'vitest';
import { JsonFeedPoller, normalizeJsonFeed } from './poller';

describe('worker poller helpers', () => {
  it('normalizes MBTA json feed entries into vehicles', () => {
    const vehicles = normalizeJsonFeed({
      data: [
        {
          id: 'veh-1',
          attributes: {
            latitude: 42.36,
            longitude: -71.06,
            bearing: 45,
            updated_at: '2026-06-26T12:00:00Z'
          },
          relationships: {
            route: { data: { id: 'Red' } }
          }
        },
        {
          id: 'bad',
          attributes: { latitude: 42.3 }
        }
      ]
    });

    expect(vehicles).toEqual([
      {
        id: 'veh-1',
        route: 'Red',
        lat: 42.36,
        lon: -71.06,
        bearing: 45,
        timestamp: '2026-06-26T12:00:00Z'
      }
    ]);
  });

  it('diffs successive json poll results', async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'veh-1',
            attributes: {
              latitude: 42.36,
              longitude: -71.06,
              bearing: 45,
              updated_at: '2026-06-26T12:00:00Z'
            },
            relationships: {
              route: { data: { id: '1' } }
            }
          }
        ]
      })
    }));

    vi.stubGlobal('fetch', fetchSpy);
    const poller = new JsonFeedPoller('mock://feed');

    const first = await poller.poll();
    const second = await poller.poll();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(0);
  });
});