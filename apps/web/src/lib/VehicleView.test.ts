import { render, screen, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VehicleView from '$lib/VehicleView.svelte';

const mockFetch = vi.fn();

beforeEach(() => {
	vi.stubGlobal('fetch', mockFetch);
	mockFetch.mockReset();
	mockFetch.mockResolvedValue({
		ok: true,
		json: async () => ({
			vehicle_id: 'y1234',
			route_id: '1',
			route_number: '1',
			route_name: 'Mass Ave',
			trip_id: 'trip-1',
			label: 'Bus 1234',
			latitude: 42.36,
			longitude: -71.06,
			occupancy_status: 'few_seats_available',
			current_status: 'IN_TRANSIT_TO',
			next_stops: [
				{
					stop_id: 'stop-a',
					stop_name: 'South Station',
					arrival_time: Date.now() + 3 * 60 * 1000,
					eta_seconds: 180
				}
			],
			generated_at: Date.now()
		})
	});
});

describe('VehicleView', () => {
	it('renders vehicle header and route information', async () => {
		render(VehicleView, { vehicleId: 'y1234' });

		await waitFor(() => screen.getByText('Bus 1234'));
		expect(screen.getByText('Mass Ave')).toBeTruthy();
	});

	it('renders next stops list', async () => {
		render(VehicleView, { vehicleId: 'y1234' });

		await waitFor(() => screen.getByText('South Station'));
		expect(screen.getByText('South Station')).toBeTruthy();
	});
});
