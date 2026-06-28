import { render, screen, waitFor, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StopView from '$lib/StopView.svelte';
import type { StopArrivals } from '$lib/types';

const makeArrivalForecast = (headsign: string) => ({
	trip_id: 'trip-1',
	route_id: 'Red',
	route_number: '1',
	route_name: 'Red Line',
	mode: 'subway',
	direction: 'Inbound',
	headsign,
	arrival_time: Date.now() + 5 * 60 * 1000,
	eta_seconds: 300,
	scheduled_time: Date.now() + 5 * 60 * 1000,
	delay_seconds: 0,
	is_live: true
});

const mockArrivals: StopArrivals = {
	stop_id: 'place-dwnxg',
	stop_name: 'Downtown Crossing',
	location: { latitude: 42.355518, longitude: -71.060225 },
	inbound: [makeArrivalForecast('Alewife')],
	outbound: [makeArrivalForecast('Ashmont')],
	alerts: [],
	last_updated: Date.now()
};

const mockFetch = vi.fn();
beforeEach(() => {
	vi.stubGlobal('fetch', mockFetch);
	localStorage.clear();
	mockFetch.mockResolvedValue({ ok: true, json: async () => mockArrivals });
});

describe('StopView', () => {
	it('shows loading state initially', () => {
		// Return a never-resolving fetch so loading state persists
		mockFetch.mockReturnValue(new Promise(() => {}));
		render(StopView, { stopId: 'place-dwnxg', stopName: 'Downtown Crossing' });
		expect(screen.getByText(/loading/i)).toBeTruthy();
	});

	it('renders stop name once loaded', async () => {
		render(StopView, { stopId: 'place-dwnxg', stopName: 'Downtown Crossing' });
		await waitFor(() => screen.getByText('Downtown Crossing'));
		expect(screen.getByText('Downtown Crossing')).toBeTruthy();
	});

	it('renders inbound section when inbound arrivals exist', async () => {
		render(StopView, { stopId: 'place-dwnxg', stopName: 'Downtown Crossing' });
		await waitFor(() => screen.getByText(/inbound/i));
		expect(screen.getByText(/inbound/i)).toBeTruthy();
	});

	it('renders outbound section when outbound arrivals exist', async () => {
		render(StopView, { stopId: 'place-dwnxg', stopName: 'Downtown Crossing' });
		await waitFor(() => screen.getByText(/outbound/i));
		expect(screen.getByText(/outbound/i)).toBeTruthy();
	});

	it('renders the headsign of inbound arrival', async () => {
		render(StopView, { stopId: 'place-dwnxg', stopName: 'Downtown Crossing' });
		await waitFor(() => screen.getByText('Alewife'));
		expect(screen.getByText('Alewife')).toBeTruthy();
	});

	it('shows error state when fetch fails', async () => {
		mockFetch.mockRejectedValue(new Error('Network error'));
		render(StopView, { stopId: 'place-dwnxg', stopName: 'Downtown Crossing' });
		await waitFor(() => screen.getByRole('alert'));
		expect(screen.getByRole('alert')).toBeTruthy();
	});

	it('shows alerts when present', async () => {
		const withAlert = {
			...mockArrivals,
			alerts: [{ id: 'a1', effect: 'NO_SERVICE', title: 'Service Suspended', description: 'No service on this route', severity: 'high' as const }]
		};
		mockFetch.mockResolvedValue({ ok: true, json: async () => withAlert });
		render(StopView, { stopId: 'place-dwnxg', stopName: 'Downtown Crossing' });
		await waitFor(() => screen.getByText('Service Suspended'));
		expect(screen.getByText('Service Suspended')).toBeTruthy();
	});

	it('calls fetch with the correct stop arrivals URL', async () => {
		render(StopView, { stopId: 'place-dwnxg', stopName: 'Downtown Crossing' });
		await waitFor(() => expect(mockFetch).toHaveBeenCalled());
		expect(mockFetch).toHaveBeenCalledWith('/api/stop/place-dwnxg/arrivals', undefined);
	});

	it('has a Refresh button', async () => {
		render(StopView, { stopId: 'place-dwnxg', stopName: 'Downtown Crossing' });
		await waitFor(() => screen.getByLabelText('Refresh arrivals'));
		expect(screen.getByLabelText('Refresh arrivals')).toBeTruthy();
	});

	it('re-fetches when Refresh is clicked', async () => {
		render(StopView, { stopId: 'place-dwnxg', stopName: 'Downtown Crossing' });
		await waitFor(() => screen.getByLabelText('Refresh arrivals'));
		const initial = mockFetch.mock.calls.length;
		await fireEvent.click(screen.getByLabelText('Refresh arrivals'));
		await waitFor(() => expect(mockFetch.mock.calls.length).toBeGreaterThan(initial));
	});

	it('shows selected arrival detail when an arrival card is clicked', async () => {
		render(StopView, { stopId: 'place-dwnxg', stopName: 'Downtown Crossing' });
		await waitFor(() => screen.getByText('Alewife'));

		await fireEvent.click(screen.getByText('Alewife'));

		await waitFor(() => screen.getByText('Selected arrival'));
		expect(screen.getByText('1 to Alewife')).toBeTruthy();
		expect(screen.getByText('trip-1')).toBeTruthy();
	});
});
