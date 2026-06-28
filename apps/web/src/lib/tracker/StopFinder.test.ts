import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import StopFinder from './StopFinder.svelte';
import { createMockGeoRepository, createMockRepository, createMockStopEnricher, createTestContainer, sampleStop } from './testing/test-utils';

describe('StopFinder', () => {
  it('uses the injected enrichment pipeline to load nearby stops', async () => {
    const location = { latitude: 42.36, longitude: -71.06, timestamp: Date.now() };
    const rawStops = [sampleStop()];
    const enrichedStops = [
      {
        ...sampleStop(),
        distanceMeters: 25,
        walkingMinutes: 1,
        nextArrivals: [],
        hasAccessibilityAlert: false
      }
    ];

    const repository = createMockRepository(rawStops);
    const geoRepository = createMockGeoRepository(location);
    const stopEnricher = createMockStopEnricher(enrichedStops);
    const container = createTestContainer({
      getRepository: () => repository,
      getGeoRepository: () => geoRepository,
      getStopEnricher: () => stopEnricher
    });

    const { getByPlaceholderText, getByText } = render(StopFinder, {
      container,
      vehicles: [],
      onStopSelected: vi.fn()
    });

    const input = getByPlaceholderText('Enter address or stop name...');
    await fireEvent.input(input, { target: { value: 'South Station' } });
    await fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(stopEnricher.enrich).toHaveBeenCalled();
      expect(getByText('Test Stop')).toBeInTheDocument();
    });
  });
});