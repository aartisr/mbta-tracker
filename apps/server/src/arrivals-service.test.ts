import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ArrivalsService } from './arrivals-service';

const mockAxios = vi.hoisted(() => ({
  get: vi.fn()
}));

vi.mock('axios', () => ({
  default: mockAxios,
  isAxiosError: vi.fn(() => false)
}));

describe('ArrivalsService route stops ordering', () => {
  beforeEach(() => {
    mockAxios.get.mockReset();
  });

  it('orders route stops by prediction sequence instead of name', async () => {
    mockAxios.get.mockImplementation((url: string) => {
      if (url.endsWith('/stops')) {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 'stop-c',
                attributes: {
                  name: 'Charlie Stop',
                  latitude: 42.1,
                  longitude: -71.1,
                  wheelchair_boarding: 1
                }
              },
              {
                id: 'stop-a',
                attributes: {
                  name: 'Alpha Stop',
                  latitude: 42.2,
                  longitude: -71.2,
                  wheelchair_boarding: 0
                }
              },
              {
                id: 'stop-b',
                attributes: {
                  name: 'Bravo Stop',
                  latitude: 42.3,
                  longitude: -71.3,
                  wheelchair_boarding: 1
                }
              }
            ]
          }
        });
      }

      if (url.endsWith('/vehicles')) {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 'vehicle-1',
                attributes: {
                  route_id: 'route-1',
                  trip_id: 'trip-1',
                  label: '42'
                }
              }
            ]
          }
        });
      }

      if (url.endsWith('/predictions')) {
        return Promise.resolve({
          data: {
            data: [
              {
                attributes: { stop_sequence: 3 },
                relationships: { stop: { data: { id: 'stop-c' } } }
              },
              {
                attributes: { stop_sequence: 1 },
                relationships: { stop: { data: { id: 'stop-a' } } }
              },
              {
                attributes: { stop_sequence: 2 },
                relationships: { stop: { data: { id: 'stop-b' } } }
              }
            ]
          }
        });
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    const service = new ArrivalsService();
    const response = await service.getRouteStops('route-1');

    expect(response.stops.map((stop) => stop.stop_id)).toEqual(['stop-a', 'stop-b', 'stop-c']);
    expect(response.stops.map((stop) => stop.sequence)).toEqual([1, 2, 3]);
  });
});
