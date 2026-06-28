import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import VehicleList from './VehicleList.svelte';
import { sampleVehicle } from './testing/test-utils';

describe('VehicleList', () => {
  it('dispatches select when a vehicle row is clicked', async () => {
    const vehicle = sampleVehicle();
    const onSelect = vi.fn();
    const { getByRole } = render(VehicleList, {
      vehicles: [vehicle],
      selectedVehicleId: null,
      emptyMessage: 'No vehicles',
      onSelect
    });

    await fireEvent.click(getByRole('button'));

    expect(onSelect).toHaveBeenCalledWith(vehicle);
  });
});