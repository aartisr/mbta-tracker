import { describe, expect, it, vi } from 'vitest';
import { MBTARepository, MockTransitDataRepository } from './repositories';

describe('MBTARepository', () => {
  it('caches getAllStops responses', async () => {
    const repository = new MBTARepository();
    const fetchSpy = vi.fn(async () => ({
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
    expect(second).toEqual(first);
  });

  it('filters nearby mock stops by radius', async () => {
    const repository = new MockTransitDataRepository();

    const results = await repository.getNearbyStops({ latitude: 42.36, longitude: -71.06 }, 80);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('test-stop-1');
  });
});