import { describe, expect, it, vi } from 'vitest';
import { MBTARepository, MockTransitDataRepository } from './repositories';

describe('MBTARepository', () => {
  it('caches getAllStops responses', async () => {
    const repository = new MBTARepository();
    const fetchSpy = vi.fn(async (_input: RequestInfo | URL) => ({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'stop-1',
            attributes: {
              name: 'Cached Stop',
              latitude: 42.36,
              longitude: -71.06,
              wheelchair_boarding: 1
            }
          }
        ],
        links: { next: null }
      })
    }));

    vi.stubGlobal('fetch', fetchSpy);

    const first = await repository.getAllStops();
    const second = await repository.getAllStops();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [requestUrl] = fetchSpy.mock.calls[0];
    expect(requestUrl).toContain('page[limit]=500');
    expect(requestUrl).not.toContain('per_page');
    expect(second).toEqual(first);
  });

  it('filters nearby mock stops by radius', async () => {
    const repository = new MockTransitDataRepository();

    const results = await repository.getNearbyStops({ latitude: 42.36, longitude: -71.06 }, 80);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('test-stop-1');
  });

  it('uses one location-filtered request for nearby stops and shares concurrent lookups', async () => {
    const repository = new MBTARepository();
    const fetchSpy = vi.fn(async (_input: RequestInfo | URL) => ({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'nearby-stop',
            attributes: {
              name: 'Nearby Stop',
              latitude: 42.3601,
              longitude: -71.0601,
              wheelchair_boarding: 1
            }
          }
        ]
      })
    }));
    vi.stubGlobal('fetch', fetchSpy);

    const location = { latitude: 42.36, longitude: -71.06 };
    const [first, second] = await Promise.all([
      repository.getNearbyStops(location),
      repository.getNearbyStops(location)
    ]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [requestUrl] = fetchSpy.mock.calls[0];
    expect(requestUrl).toContain('filter%5Blatitude%5D=42.36');
    expect(requestUrl).toContain('filter%5Blongitude%5D=-71.06');
    expect(requestUrl).toContain('filter%5Bradius%5D=');
    expect(requestUrl).toContain('page%5Blimit%5D=100');
    expect(first).toEqual(second);
    expect(first[0]).toMatchObject({ id: 'nearby-stop', wheelchairAccessible: true });
  });
});
