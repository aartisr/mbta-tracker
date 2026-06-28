/**
 * RouteView - Display route with all stops in sequence
 * Shows inbound/outbound stop sequences and arrivals per stop
 */

<script lang="ts">
	import { onMount } from 'svelte';
	import ArrivalCard from './ArrivalCard.svelte';
	import type { StopArrivals, RouteCrowdingForecastResponse } from './types';
	import { fetchJsonWithOfflineFallback, formatAgeMinutes } from '$lib/data-resilience';

	interface RouteStopInfo {
		stop_id: string;
		stop_name: string;
		sequence: number;
		latitude: number;
		longitude: number;
		wheelchair_accessible: boolean;
		upcoming_vehicle_ids: string[];
	}

	interface RouteStopsResponse {
		route_id: string;
		direction_id?: number;
		stops: RouteStopInfo[];
		generated_at: number;
	}

	export let routeId: string;
	export let routeName: string;

	let stops: RouteStopInfo[] = [];
	let loading = true;
	let error: string | null = null;
	let selectedStopId: string | null = null;
	let selectedStopArrivals: StopArrivals | null = null;
	let routeLastUpdated: number | null = null;
	let routeDataSource: 'network' | 'cache' = 'network';
	let routeStaleAgeMs = 0;
	let isOffline = false;
	let routeCrowding: RouteCrowdingForecastResponse | null = null;
	let routeCrowdingMap: Record<string, number> = {};

	async function loadRoute() {
		try {
			loading = true;
			const result = await fetchJsonWithOfflineFallback<RouteStopsResponse>(
				`mbta_route_stops_${routeId}`,
				`/api/route/${routeId}/stops`,
				{ cacheTtlMs: 30_000 }
			);
			const data = result.data;
			stops = (data.stops || []).slice().sort((a, b) => a.sequence - b.sequence);
			routeLastUpdated = data.generated_at || result.fetchedAt || Date.now();
			routeDataSource = result.source;
			routeStaleAgeMs = result.staleAgeMs;
			isOffline = result.source === 'cache' || (typeof navigator !== 'undefined' && !navigator.onLine);
			error = null;

			try {
				const crowdingResponse = await fetch(`/api/route/${routeId}/crowding-forecast`);
				if (crowdingResponse.ok) {
					routeCrowding = await crowdingResponse.json() as RouteCrowdingForecastResponse;
					routeCrowdingMap = Object.fromEntries(
						routeCrowding.stops.map((stop) => {
							const horizon15 = stop.timeline.find((point) => point.horizon_minutes === 15);
							return [stop.stop_id, horizon15?.occupancy_percent ?? 0];
						})
					);
				}
			} catch {
				routeCrowding = null;
				routeCrowdingMap = {};
			}
		} catch (e) {
			error = `Failed to load route: ${e instanceof Error ? e.message : 'Unknown error'}`;
		} finally {
			loading = false;
		}
	}

	function crowdingTone(percent: number): 'low' | 'medium' | 'high' {
		if (percent >= 75) return 'high';
		if (percent >= 45) return 'medium';
		return 'low';
	}

	async function selectStop(stopId: string) {
		selectedStopId = stopId;
		selectedStopArrivals = null;
		try {
			const result = await fetchJsonWithOfflineFallback<StopArrivals>(
				`mbta_stop_arrivals_${stopId}`,
				`/api/stop/${stopId}/arrivals`,
				{ cacheTtlMs: 30_000 }
			);
			selectedStopArrivals = result.data;
			if (result.source === 'cache') {
				isOffline = true;
			}
		} catch (e) {
			console.error('Failed to load arrivals:', e);
		}
	}

	function formatUpdated(ts: number | null): string {
		if (!ts) {
			return 'Unknown';
		}

		const delta = Math.max(0, Math.round((Date.now() - ts) / 1000));
		if (delta < 60) {
			return 'Just now';
		}

		return `${Math.floor(delta / 60)} min ago`;
	}

	onMount(() => {
		const handleOnline = () => {
			isOffline = false;
		};

		const handleOffline = () => {
			isOffline = true;
		};

		if (typeof window !== 'undefined') {
			isOffline = !navigator.onLine;
			window.addEventListener('online', handleOnline);
			window.addEventListener('offline', handleOffline);
		}

		void loadRoute();

		return () => {
			if (typeof window !== 'undefined') {
				window.removeEventListener('online', handleOnline);
				window.removeEventListener('offline', handleOffline);
			}
		};
	});
</script>

<div class="route-container">
	<div class="route-header">
		<p class="route-kicker">Crowding route view</p>
		<h2 class="route-name">{routeName}</h2>
		<p class="route-id">Route {routeId}</p>
		{#if routeLastUpdated}
			<p class="route-updated">Updated {formatUpdated(routeLastUpdated)}</p>
		{/if}
		{#if routeDataSource === 'cache' || isOffline}
			<p class="route-fallback">Offline fallback: cached route data from {formatAgeMinutes(routeStaleAgeMs || Date.now() - (routeLastUpdated || Date.now()))} ago.</p>
		{/if}
		{#if routeCrowding}
			<p class="route-crowding-note">
				<span class="route-crowding-pill route-crowding-horizon">15 min horizon</span>
				<span class="route-crowding-pill route-crowding-source">Source: MBTA arrivals + live vehicle signal</span>
				<span class="route-crowding-pill route-crowding-trust">Relative guide, not exact occupancy</span>
			</p>
		{/if}
	</div>

	{#if loading}
		<div class="loading-state">
			<p>Loading route information...</p>
		</div>
	{:else if error}
		<div class="error-state">
			<p class="error-message">{error}</p>
			<button class="retry-button" on:click={loadRoute}>Try again</button>
		</div>
	{:else if stops.length === 0}
		<div class="empty-state">
			<p>No stops found for this route</p>
		</div>
	{:else}
		<div class="stops-section">
			<div class="stops-list">
				{#each stops as stop, index (stop.stop_id)}
					<button
						class="stop-item"
						class:selected={selectedStopId === stop.stop_id}
						on:click={() => selectStop(stop.stop_id)}
					>
						<div class="stop-marker">{stop.sequence || index + 1}</div>
						<div class="stop-info">
							<div class="stop-name">{stop.stop_name}</div>
							<div class="stop-direction">
								{#if stop.wheelchair_accessible}
									♿ Accessible stop
								{:else}
									Service available
								{/if}
								{#if routeCrowdingMap[stop.stop_id]}
									<span class="crowding-dot" data-tone={crowdingTone(routeCrowdingMap[stop.stop_id])}>
										<span class="crowding-dot-label">Crowding</span>
										<strong>{routeCrowdingMap[stop.stop_id]}%</strong>
										<span class="crowding-dot-bar" aria-hidden="true">
											<span></span>
										</span>
									</span>
								{/if}
							</div>
						</div>
						<div class="stop-chevron">›</div>
					</button>
				{/each}
			</div>

			{#if selectedStopArrivals}
				<div class="arrivals-panel">
					<div class="panel-header">
						<h3 class="panel-title">Arrivals at {selectedStopArrivals.stop_name}</h3>
						<p class="last-updated">Updated {formatUpdated(selectedStopArrivals.last_updated)}</p>
					</div>

					{#if selectedStopArrivals.alerts && selectedStopArrivals.alerts.length > 0}
						<div class="alerts-section">
							{#each selectedStopArrivals.alerts as alert}
								<div class="alert" class:alert-warning={alert.severity === 'high'}>
									<span class="alert-badge">{alert.effect}</span>
									<span class="alert-text">{alert.title}</span>
								</div>
							{/each}
						</div>
					{/if}

					<div class="directions-split">
						{#if selectedStopArrivals.inbound.length > 0}
							<div class="direction-group">
								<h4 class="direction-title">Inbound</h4>
								<div class="arrivals-list">
									{#each selectedStopArrivals.inbound as arrival}
										<ArrivalCard {arrival} />
									{/each}
								</div>
							</div>
						{/if}

						{#if selectedStopArrivals.outbound.length > 0}
							<div class="direction-group">
								<h4 class="direction-title">Outbound</h4>
								<div class="arrivals-list">
									{#each selectedStopArrivals.outbound as arrival}
										<ArrivalCard {arrival} />
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style lang="postcss">
	.route-container {
		@apply space-y-4;
	}

	.route-header {
		@apply pb-4 border-b border-gray-200;
	}

	.route-kicker {
		@apply m-0 text-[11px] font-semibold uppercase tracking-[0.2em];
		color: #1d4ed8;
	}

	.route-name {
		@apply text-2xl font-bold text-gray-900 m-0;
	}

	.route-id {
		@apply inline-flex items-center w-fit m-0 mt-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border;
		background: rgba(255, 255, 255, 0.9);
		color: #475569;
		border-color: rgba(148, 163, 184, 0.2);
	}

	.route-updated {
		@apply inline-flex items-center w-fit m-0 mt-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border;
		background: rgba(248, 250, 252, 0.92);
		color: #334155;
		border-color: rgba(148, 163, 184, 0.18);
	}

	.route-fallback {
		@apply text-xs font-semibold m-0 mt-2 px-2.5 py-1.5 rounded-full inline-flex items-center w-fit;
		background: rgba(251, 191, 36, 0.15);
		color: #92400e;
		border: 1px solid rgba(245, 158, 11, 0.35);
	}

	.route-crowding-note {
		@apply text-xs font-semibold m-0 mt-2 flex flex-wrap items-center gap-2;
	}

	.route-crowding-pill {
		@apply inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold border;
		border-color: rgba(37, 99, 235, 0.16);
		background: rgba(255, 255, 255, 0.92);
	}

	.route-crowding-horizon {
		background: rgba(29, 78, 216, 0.12);
		color: #1e3a8a;
		border-color: rgba(37, 99, 235, 0.2);
	}

	.route-crowding-source {
		background: rgba(255, 255, 255, 0.82);
		color: #475569;
	}

	.route-crowding-trust {
		color: #334155;
	}

	.loading-state,
	.error-state,
	.empty-state {
		@apply py-8 text-center text-gray-500;
	}

	.error-message {
		@apply text-red-600 mb-3;
	}

	.retry-button {
		@apply px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors;
	}

	.stops-section {
		@apply grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6 items-start;
	}

	.stops-list {
		@apply lg:col-span-1 space-y-2;
	}

	.stop-item {
		@apply w-full flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-colors text-left;
		@apply data-[selected=true]:bg-blue-50 data-[selected=true]:border-blue-300;
		box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
	}

	.stop-item.selected {
		@apply bg-blue-50 border-blue-300;
	}

	.stop-marker {
		@apply flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full text-xs font-semibold text-gray-700 flex-shrink-0;
	}

	.stop-info {
		@apply flex-1 min-w-0;
	}

	.stop-name {
		@apply font-semibold text-gray-900 text-sm;
	}

	.stop-direction {
		@apply mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500;
		line-height: 1.25;
	}

	.crowding-dot {
		@apply inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold border;
		background: rgba(148, 163, 184, 0.14);
		color: #334155;
		border-color: rgba(148, 163, 184, 0.18);
	}

	.crowding-dot[data-tone='low'] {
		background: rgba(34, 197, 94, 0.15);
		color: #166534;
	}

	.crowding-dot[data-tone='medium'] {
		background: rgba(251, 191, 36, 0.18);
		color: #92400e;
	}

	.crowding-dot[data-tone='high'] {
		background: rgba(239, 68, 68, 0.15);
		color: #991b1b;
	}

	.crowding-dot-label {
		@apply uppercase tracking-wide;
		font-size: 9px;
	}

	.crowding-dot strong {
		font-size: 10px;
		line-height: 1;
	}

	.crowding-dot-bar {
		display: inline-flex;
		align-items: center;
		width: 2.8rem;
		height: 0.35rem;
		border-radius: 999px;
		overflow: hidden;
		background: rgba(148, 163, 184, 0.18);
	}

	.crowding-dot-bar span {
		display: block;
		height: 100%;
		width: 100%;
		background: linear-gradient(90deg, #22c55e, #eab308 56%, #ef4444 100%);
	}

	.stop-chevron {
		@apply text-gray-400 flex-shrink-0;
	}

	.arrivals-panel {
		@apply lg:col-span-2 space-y-4 p-4 rounded-2xl border border-gray-200 bg-white;
		box-shadow: 0 14px 34px rgba(15, 23, 42, 0.05);
	}

	.panel-header {
		@apply pb-3 border-b border-gray-200;
	}

	.panel-title {
		@apply text-base font-semibold text-gray-900 m-0;
	}

	.last-updated {
		@apply text-xs text-gray-500 m-0 mt-1;
	}

	.alerts-section {
		@apply space-y-2;
	}

	.alert {
		@apply flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl;
	}

	.alert-warning {
		@apply bg-red-50 border-red-200;
	}

	.alert-badge {
		@apply inline-block px-2 py-1 text-xs font-semibold bg-yellow-200 text-yellow-800 rounded flex-shrink-0;
	}

	.alert-warning .alert-badge {
		@apply bg-red-200 text-red-800;
	}

	.alert-text {
		@apply text-sm text-gray-700;
	}

	.directions-split {
		@apply grid grid-cols-1 md:grid-cols-2 gap-4;
	}

	.direction-group {
		@apply space-y-2 p-3 rounded-2xl border border-gray-100 bg-gray-50;
	}

	.direction-title {
		@apply text-sm font-semibold text-gray-900 m-0 uppercase tracking-wide;
	}

	.arrivals-list {
		@apply space-y-2;
	}

	/* Mobile */
	@media (max-width: 768px) {
		.stops-section {
			@apply grid-cols-1;
		}

		.directions-split {
			@apply grid-cols-1;
		}

		.route-crowding-note {
			@apply gap-1.5;
		}

		.route-crowding-pill {
			@apply w-full justify-center;
		}

		.crowding-dot {
			@apply ml-0;
		}

		.route-id,
		.route-updated,
		.route-fallback {
			@apply w-full justify-center;
		}

		.direction-group {
			@apply p-2.5;
		}
	}

	/* Accessibility */
	@media (prefers-reduced-motion: reduce) {
		.stop-item {
			transition: none;
		}
	}
</style>
