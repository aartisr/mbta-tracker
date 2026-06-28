import { vi } from 'vitest';
import type { GeoLocation, MBTAStop, NearbyStop } from '../geo-types';
import type { TrackerVehicle } from '../types';
import type { GeoRepository } from '../services/repositories';
import type { ConnectionStatus, RealtimeTransport, ServiceContainer, StopEnrichmentService, TransitDataRepository, Logger } from '../services';
import {
  MockTransitDataRepository,
  TestServiceContainer,
  MBTAModeDetector,
  MBTARouteStyleProvider,
  SilentLogger
} from '../services';

export function createMockTransport(): RealtimeTransport {
  return {
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(),
    on: vi.fn(() => () => undefined),
    status: vi.fn<() => ConnectionStatus>(() => 'open'),
    lastOpenedAt: vi.fn(() => Date.now())
  };
}

export function createMockRepository(stops?: MBTAStop[]): TransitDataRepository {
  if (!stops) {
    return new MockTransitDataRepository();
  }

  return {
    getAllStops: vi.fn(async () => stops),
    getNearbyStops: vi.fn(async () => stops),
    getStop: vi.fn(async (stopId: string) => stops.find((stop) => stop.id === stopId) ?? null)
  };
}

export function createMockGeoRepository(location: GeoLocation): GeoRepository {
  return {
    geocodeAddress: vi.fn(async () => location),
    getUserLocation: vi.fn(async () => location),
    reverseGeocode: vi.fn(async () => 'Test Address')
  } as unknown as GeoRepository;
}

export function createMockStopEnricher(result: NearbyStop[]): StopEnrichmentService {
  return {
    enrich: vi.fn(async () => result),
    addEnricher: vi.fn()
  };
}

export function createTestContainer(overrides: Partial<ServiceContainer> = {}): ServiceContainer {
  return new TestServiceContainer({
    getTransport: overrides.getTransport ?? (() => createMockTransport()),
    getRepository: overrides.getRepository ?? (() => createMockRepository()),
    getGeoRepository:
      overrides.getGeoRepository ??
      (() =>
        createMockGeoRepository({
          latitude: 42.36,
          longitude: -71.06,
          timestamp: Date.now()
        })),
    getModeDetector: overrides.getModeDetector ?? (() => new MBTAModeDetector()),
    getStyleProvider: overrides.getStyleProvider ?? (() => new MBTARouteStyleProvider()),
    getStopEnricher: overrides.getStopEnricher ?? (() => createMockStopEnricher([])),
    getLogger: overrides.getLogger ?? (() => new SilentLogger() as Logger)
  });
}

export function sampleVehicle(overrides: Partial<TrackerVehicle> = {}): TrackerVehicle {
  return {
    id: 'vehicle-1',
    routeId: '1',
    routeLabel: 'Route 1',
    routeType: 3,
    mode: 'bus',
    directionId: 0,
    headsign: null,
    stopId: 'stop-1',
    stopSequence: 1,
    lat: 42.36,
    lon: -71.06,
    bearing: 90,
    timestamp: '2026-06-26T12:00:00.000Z',
    ...overrides
  };
}

export function sampleStop(overrides: Partial<MBTAStop> = {}): MBTAStop {
  return {
    id: 'stop-1',
    name: 'Test Stop',
    latitude: 42.36,
    longitude: -71.06,
    wheelchairAccessible: true,
    ...overrides
  };
}