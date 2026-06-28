import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TrackerWidget from './TrackerWidget.svelte';
import { DEFAULT_TRACKER_CONFIG } from './config';
import { createMockGeoRepository, createMockRepository, createTestContainer, sampleStop } from './testing/test-utils';
import type { RealtimeTransport } from './services';

type TransportEvent = 'data' | 'error' | 'close';

function createCapturingTransport() {
  const handlers: Record<TransportEvent, Array<(payload: any) => void>> = {
    data: [],
    error: [],
    close: []
  };

  const transport: RealtimeTransport = {
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(),
    on: vi.fn((event: TransportEvent, handler: (payload: any) => void) => {
      handlers[event].push(handler);
      return () => {
        const index = handlers[event].indexOf(handler);
        if (index >= 0) {
          handlers[event].splice(index, 1);
        }
      };
    }),
    status: () => 'open',
    lastOpenedAt: () => Date.now()
  };

  return {
    transport,
    emit(event: TransportEvent, payload: any) {
      handlers[event].forEach((handler) => handler(payload));
    }
  };
}

const mapInstances: MockMap[] = [];

class MockPopup {
  setLngLat = vi.fn(() => this);
  setHTML = vi.fn(() => this);
  addTo = vi.fn(() => this);
  remove = vi.fn(() => this);
}

class MockMap {
  handlers = new Map<string, (event?: any) => void>();
  canvas = { style: { cursor: '' } };
  vehicleSource = {
    setData: vi.fn(),
    getClusterExpansionZoom: vi.fn(async () => 13)
  };
  stopSource = {
    setData: vi.fn()
  };
  easeTo = vi.fn();
  jumpTo = vi.fn();
  fitBounds = vi.fn();
  remove = vi.fn();

  constructor(_config: unknown) {
    mapInstances.push(this);
  }

  addControl = vi.fn();
  addSource = vi.fn();
  addLayer = vi.fn();
  hasImage = vi.fn(() => false);
  addImage = vi.fn();
  updateImage = vi.fn();
  getLayer = vi.fn(() => undefined);
  removeLayer = vi.fn();
  setLayoutProperty = vi.fn();
  getCanvas = vi.fn(() => this.canvas);
  getSource = vi.fn((name: string) => (name === 'vehicles' ? this.vehicleSource : this.stopSource));
  getBounds = vi.fn(() => ({ contains: () => true }));
  getZoom = vi.fn(() => 11);

  on = vi.fn((event: string, layerOrHandler: unknown, maybeHandler?: unknown) => {
    const handler = typeof layerOrHandler === 'function' ? layerOrHandler : maybeHandler;
    const layer = typeof layerOrHandler === 'string' ? layerOrHandler : '';
    const key = layer ? `${event}:${layer}` : event;
    this.handlers.set(key, handler as (event?: any) => void);
    if (event === 'load' && typeof handler === 'function') {
      handler();
    }
  });
}

vi.mock('maplibre-gl', () => ({
  default: {
    Map: MockMap,
    NavigationControl: class NavigationControl {},
    AttributionControl: class AttributionControl {},
    ScaleControl: class ScaleControl {},
    Popup: MockPopup
  }
}));

describe('TrackerWidget', () => {
  beforeEach(() => {
    mapInstances.length = 0;
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn()
    });
  });

  it('renders the widget shell, consumes transport data, and toggles to stop finder', async () => {
    const capturing = createCapturingTransport();
    const container = createTestContainer({
      getTransport: () => capturing.transport,
      getRepository: () => createMockRepository([sampleStop()]),
      getGeoRepository: () => createMockGeoRepository({ latitude: 42.36, longitude: -71.06, timestamp: Date.now() })
    });

    const { getAllByText, getByText, getByPlaceholderText } = render(TrackerWidget, {
      config: { ...DEFAULT_TRACKER_CONFIG, title: 'Tracker Shell Test' },
      container
    });

    expect(getByText('Tracker Shell Test')).toBeInTheDocument();

    capturing.emit('data', {
      vehicles: [
        {
          id: 'veh-1',
          routeId: '1',
          routeLabel: 'Route 1',
          routeType: 3,
          lat: 42.36,
          lon: -71.06,
          bearing: 90,
          stopId: 'stop-1',
          stopSequence: 1,
          directionId: 0,
          timestamp: '2026-06-26T12:00:00.000Z'
        }
      ]
    });

    await fireEvent.click(getByText('Show details'));

    await waitFor(() => {
      expect(getAllByText('Route 1').length).toBeGreaterThan(0);
      expect(mapInstances[0].vehicleSource.setData).toHaveBeenCalled();
    });

    await fireEvent.click(getByText('Find Stops'));

    await waitFor(() => {
      expect(getByPlaceholderText('Enter address or stop name...')).toBeInTheDocument();
    });
  });

  it('expands vehicle clusters through the mocked map interaction layer', async () => {
    const capturing = createCapturingTransport();
    const container = createTestContainer({
      getTransport: () => capturing.transport,
      getRepository: () => createMockRepository([sampleStop()]),
      getGeoRepository: () => createMockGeoRepository({ latitude: 42.36, longitude: -71.06, timestamp: Date.now() })
    });

    render(TrackerWidget, {
      config: DEFAULT_TRACKER_CONFIG,
      container
    });

    await waitFor(() => {
      expect(mapInstances.length).toBeGreaterThan(0);
    });

    const map = mapInstances[0];
    const handler = map.handlers.get('click:vehicle-clusters');

    expect(handler).toBeDefined();

    handler?.({
      features: [
        {
          geometry: { type: 'Point', coordinates: [-71.06, 42.36] },
          properties: { cluster_id: 7 }
        }
      ]
    });

    await waitFor(() => {
      expect(map.vehicleSource.getClusterExpansionZoom).toHaveBeenCalledWith(7);
      expect(map.easeTo).toHaveBeenCalledWith({ center: [-71.06, 42.36], zoom: 13, duration: 500 });
    });
  });
});
