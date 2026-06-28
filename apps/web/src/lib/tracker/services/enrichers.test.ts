import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CompositeStopEnricher, RealtimeArrivalsEnricher, AccessibilityEnricher, MBTAPredictionsEnricher } from './enrichers';
import { sampleStop, sampleVehicle } from '../testing/test-utils';

describe('CompositeStopEnricher', () => {
  it('builds nearby stops with arrivals and accessibility flags', async () => {
    const service = new CompositeStopEnricher([
      new RealtimeArrivalsEnricher(),
      new AccessibilityEnricher()
    ]);

    const stops = await service.enrich(
      [sampleStop({ wheelchairAccessible: false })],
      {
        location: { latitude: 42.36, longitude: -71.06, timestamp: Date.now() },
        vehicles: [sampleVehicle()]
      }
    );

    expect(stops).toHaveLength(1);
    expect(stops[0].nextArrivals.length).toBeGreaterThan(0);
    expect(stops[0].hasAccessibilityAlert).toBe(true);
  });
});

describe('RealtimeArrivalsEnricher (distance-based fallback)', () => {
  it('filters out vehicles whose route does not serve the stop', () => {
    const enricher = new RealtimeArrivalsEnricher();
    const stop = {
      ...sampleStop({ id: 'stop-99' }),
      distanceMeters: 0,
      walkingMinutes: 0,
      nextArrivals: [],
      // Stop is only served by route '108'
      routeIds: ['108']
    };

    // vehicle on route 109 — should be excluded
    const vehicleWrongRoute = sampleVehicle({ routeId: '109', lat: 42.36, lon: -71.06 });
    // vehicle on route 108 — should be included
    const vehicleCorrectRoute = sampleVehicle({ routeId: '108', lat: 42.36, lon: -71.06 });

    const [enriched] = enricher.enrich(
      [stop],
      { location: { latitude: 42.36, longitude: -71.06, timestamp: Date.now() }, vehicles: [vehicleWrongRoute, vehicleCorrectRoute] }
    );

    expect(enriched.nextArrivals).toHaveLength(1);
    expect(enriched.nextArrivals[0].routeId).toBe('108');
  });

  it('shows arrivals when stop has no routeIds (route data unavailable)', () => {
    const enricher = new RealtimeArrivalsEnricher();
    const stop = {
      ...sampleStop(),
      distanceMeters: 0,
      walkingMinutes: 0,
      nextArrivals: []
      // no routeIds set
    };

    const [enriched] = enricher.enrich(
      [stop],
      { location: { latitude: 42.36, longitude: -71.06, timestamp: Date.now() }, vehicles: [sampleVehicle()] }
    );

    expect(enriched.nextArrivals.length).toBeGreaterThan(0);
  });
});

describe('MBTAPredictionsEnricher', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns official predictions from the MBTA API', async () => {
    const futureTime = new Date(Date.now() + 120_000).toISOString(); // 2 min from now

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{
          attributes: { arrival_time: futureTime, departure_time: null, direction_id: 0, status: null },
          relationships: {
            route: { data: { id: '108' } },
            vehicle: { data: { id: 'v-123' } }
          }
        }],
        included: [{
          type: 'route',
          id: '108',
          attributes: { short_name: '108', long_name: 'Salem St', type: 3 }
        }]
      })
    }));

    const enricher = new MBTAPredictionsEnricher();
    const stop = {
      ...sampleStop({ id: 'place-123' }),
      distanceMeters: 200,
      walkingMinutes: 3,
      nextArrivals: []
    };

    const [result] = await enricher.enrich(
      [stop],
      { location: { latitude: 42.36, longitude: -71.06, timestamp: Date.now() }, vehicles: [] }
    );

    expect(result.nextArrivals).toHaveLength(1);
    expect(result.nextArrivals[0].routeId).toBe('108');
    expect(result.nextArrivals[0].routeLabel).toBe('108');
    expect(result.nextArrivals[0].vehicleId).toBe('v-123');
    expect(result.nextArrivals[0].arrivalSeconds).toBeGreaterThan(100);
    expect(result.nextArrivals[0].arrivalSeconds).toBeLessThan(140);
    // Official predictions have low confidence uncertainty
    expect(result.nextArrivals[0].confidenceSeconds).toBe(30);
  });

  it('returns empty arrivals — never fabricates — when the API fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));

    const enricher = new MBTAPredictionsEnricher();
    const stop = {
      ...sampleStop(),
      distanceMeters: 100,
      walkingMinutes: 1,
      nextArrivals: []
    };

    const [result] = await enricher.enrich(
      [stop],
      { location: { latitude: 42.36, longitude: -71.06, timestamp: Date.now() }, vehicles: [] }
    );

    // Must NOT fabricate data — show nothing honest rather than something wrong
    expect(result.nextArrivals).toHaveLength(0);
  });

  it('filters out past and far-future predictions', async () => {
    const pastTime = new Date(Date.now() - 30_000).toISOString();
    const farFuture = new Date(Date.now() + 5_000_000).toISOString();
    const validTime = new Date(Date.now() + 300_000).toISOString();

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { attributes: { arrival_time: pastTime }, relationships: { route: { data: { id: '1' } }, vehicle: { data: { id: 'v1' } } } },
          { attributes: { arrival_time: farFuture }, relationships: { route: { data: { id: '1' } }, vehicle: { data: { id: 'v2' } } } },
          { attributes: { arrival_time: validTime }, relationships: { route: { data: { id: '1' } }, vehicle: { data: { id: 'v3' } } } }
        ],
        included: []
      })
    }));

    const enricher = new MBTAPredictionsEnricher();
    const stop = { ...sampleStop(), distanceMeters: 100, walkingMinutes: 1, nextArrivals: [] };

    const [result] = await enricher.enrich(
      [stop],
      { location: { latitude: 42.36, longitude: -71.06, timestamp: Date.now() }, vehicles: [] }
    );

    expect(result.nextArrivals).toHaveLength(1);
    expect(result.nextArrivals[0].vehicleId).toBe('v3');
  });
});