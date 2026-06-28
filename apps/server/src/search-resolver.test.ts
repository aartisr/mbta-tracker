import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchResolverService } from './search-resolver';

const mockAxios = vi.hoisted(() => ({
  get: vi.fn()
}));

vi.mock('axios', () => ({
  default: mockAxios,
  isAxiosError: vi.fn(() => false)
}));

describe('SearchResolverService autocomplete', () => {
  beforeEach(() => {
    mockAxios.get.mockReset();
  });

  it('uses prefix indexes for stop and route suggestions', async () => {
    mockAxios.get.mockImplementation((url: string) => {
      if (url.endsWith('/routes')) {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 'route-38',
                attributes: {
                  number: '38',
                  name: '38',
                  long_name: '38 - Medford',
                  type: 3,
                  direction_names: ['Outbound', 'Inbound']
                }
              }
            ]
          }
        });
      }

      if (url.endsWith('/stops')) {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 'place-pktrm',
                attributes: {
                  name: 'Park Street',
                  code: '70000',
                  latitude: 42.3564,
                  longitude: -71.0621,
                  accessibility: ['wheelchair'],
                  parent_station: 'place-pktrm'
                }
              },
              {
                id: 'place-sstat',
                attributes: {
                  name: 'South Station',
                  code: '70001',
                  latitude: 42.3523,
                  longitude: -71.0552,
                  accessibility: ['wheelchair'],
                  parent_station: undefined
                }
              }
            ]
          }
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const resolver = new SearchResolverService();

    const stopResults = await resolver.autocomplete('par', 10);
    expect(stopResults.some((result) => result.type === 'stop' && result.stop_name === 'Park Street')).toBe(true);

    const routeResults = await resolver.autocomplete('38', 10);
    expect(routeResults.some((result) => result.type === 'route' && result.route_number === '38')).toBe(true);
  });
});
