import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ArrivalCard from '$lib/ArrivalCard.svelte';
import type { ArrivalForecast } from '$lib/types';

const makeArrival = (overrides: Partial<ArrivalForecast> = {}): ArrivalForecast => ({
	trip_id: 'trip-1',
	route_id: 'Red',
	route_number: '1',
	route_name: 'Red Line',
	mode: 'subway',
	direction: 'Inbound',
	headsign: 'Ashmont',
	arrival_time: Date.now() + 5 * 60 * 1000,
	eta_seconds: 300,
	scheduled_time: Date.now() + 5 * 60 * 1000,
	delay_seconds: 0,
	is_live: true,
	...overrides
});

describe('ArrivalCard', () => {
	it('renders the headsign', () => {
		render(ArrivalCard, { arrival: makeArrival() });
		expect(screen.getByText('Ashmont')).toBeTruthy();
	});

	it('renders route number in badge', () => {
		render(ArrivalCard, { arrival: makeArrival({ route_number: '99' }) });
		expect(screen.getByText('99')).toBeTruthy();
	});

	it('shows live-tracking aria-label for realtime arrivals', () => {
		render(ArrivalCard, { arrival: makeArrival({ is_live: true }) });
		expect(screen.getByLabelText('Live GPS tracking')).toBeTruthy();
	});

	it('shows scheduled aria-label for non-realtime arrivals', () => {
		render(ArrivalCard, { arrival: makeArrival({ is_live: false }) });
		expect(screen.getByLabelText('Scheduled arrival')).toBeTruthy();
	});

	it('shows delay warning role="alert" when delay exceeds 60 seconds', () => {
		render(ArrivalCard, { arrival: makeArrival({ delay_seconds: 180 }) });
		expect(screen.getByRole('alert')).toBeTruthy();
	});

	it('shows "Now" when eta_seconds is under 60', () => {
		render(ArrivalCard, { arrival: makeArrival({ eta_seconds: 20 }) });
		expect(screen.getByText(/now/i)).toBeTruthy();
	});

	it('shows ETA in minutes for future arrivals', () => {
		render(ArrivalCard, { arrival: makeArrival({ eta_seconds: 300 }) });
		expect(screen.getByText(/5\s*min/i)).toBeTruthy();
	});

	it('fires onClick when card is clicked', async () => {
		const onClick = vi.fn();
		render(ArrivalCard, { arrival: makeArrival(), onClick });
		const card = screen.getByRole('button');
		await fireEvent.click(card);
		expect(onClick).toHaveBeenCalledOnce();
	});

	it('fires onClick via Enter key', async () => {
		const onClick = vi.fn();
		render(ArrivalCard, { arrival: makeArrival(), onClick });
		const card = screen.getByRole('button');
		await fireEvent.keyDown(card, { key: 'Enter' });
		expect(onClick).toHaveBeenCalledOnce();
	});

	it('applies subway mode icon for subway route type', () => {
		render(ArrivalCard, { arrival: makeArrival({ mode: 'subway' }) });
		expect(screen.getByText('🚇')).toBeTruthy();
	});

	it('applies bus mode icon for bus route type', () => {
		render(ArrivalCard, { arrival: makeArrival({ mode: 'bus' }) });
		expect(screen.getByText('🚌')).toBeTruthy();
	});
});
