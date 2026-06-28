import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RouteView from '$lib/RouteView.svelte';

const mockFetch = vi.fn();

const mockStopsPayload = {
	route_id: '1',
	stops: [
		{
			stop_id: 'stop-a',
			stop_name: 'Mass Ave @ Beacon',
			sequence: 1,
			latitude: 42.1,
			longitude: -71.1,
			wheelchair_accessible: true,
			upcoming_vehicle_ids: ['V-1']
		}
	],
	generated_at: Date.now()
};

const mockStopArrivals = {
	stop_id: 'stop-a',
	stop_name: 'Mass Ave @ Beacon',
	location: { latitude: 42.1, longitude: -71.1 },
	inbound: [
		{
			trip_id: 'trip-a',
			route_id: '1',
			route_number: '1',
			route_name: 'Mass Ave',
			mode: 'bus',
			direction: 'Inbound',
			headsign: 'Harvard',
			arrival_time: Date.now() + 5 * 60 * 1000,
			eta_seconds: 300,
			scheduled_time: Date.now() + 5 * 60 * 1000,
			delay_seconds: 0,
			is_live: true
		}
	],
	outbound: [],
	alerts: [],
	last_updated: Date.now()
};

beforeEach(() => {
	vi.stubGlobal('fetch', mockFetch);
	mockFetch.mockReset();
	mockFetch.mockImplementation((url: string) => {
		if (url.includes('/api/route/1/stops')) {
			return Promise.resolve({ ok: true, json: async () => mockStopsPayload });
		}

		if (url.includes('/api/stop/stop-a/arrivals')) {
			return Promise.resolve({ ok: true, json: async () => mockStopArrivals });
		}

		return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
	});
});

describe('RouteView', () => {
	it('loads and renders route stop list', async () => {
		render(RouteView, { routeId: '1', routeName: 'Mass Ave' });

		await waitFor(() => screen.getByText('Mass Ave @ Beacon'));
		expect(screen.getByText('Mass Ave @ Beacon')).toBeTruthy();
	});

	it('loads arrivals panel when a stop is selected', async () => {
		render(RouteView, { routeId: '1', routeName: 'Mass Ave' });
		await waitFor(() => screen.getByText('Mass Ave @ Beacon'));

		await fireEvent.click(screen.getByText('Mass Ave @ Beacon'));

		await waitFor(() => screen.getByText('Arrivals at Mass Ave @ Beacon'));
		expect(screen.getByText('Harvard')).toBeTruthy();
	});
});
