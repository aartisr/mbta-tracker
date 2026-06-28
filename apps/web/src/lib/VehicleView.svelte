/**
 * VehicleView - Track individual vehicle in real-time
 * Shows current location, next 5 stops, occupancy, and live updates
 */

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fetchJsonWithOfflineFallback, formatAgeMinutes } from '$lib/data-resilience';

	export let vehicleId: string;

	interface VehicleNextStop {
		stop_id: string;
		stop_name: string;
		arrival_time: number;
		eta_seconds: number;
	}

	interface VehicleInfoResponse {
		vehicle_id: string;
		route_id: string;
		route_number: string;
		route_name: string;
		trip_id?: string;
		label?: string;
		latitude?: number;
		longitude?: number;
		occupancy_status?: string;
		current_status?: string;
		next_stops: VehicleNextStop[];
		generated_at: number;
	}

	let vehicle: VehicleInfoResponse | null = null;
	let loading = true;
	let error: string | null = null;
	let refreshInterval: ReturnType<typeof setInterval> | null = null;
	let dataSource: 'network' | 'cache' = 'network';
	let staleAgeMs = 0;
	let isOffline = false;

	async function loadVehicle() {
		try {
			loading = true;
			const result = await fetchJsonWithOfflineFallback<VehicleInfoResponse>(
				`mbta_vehicle_${vehicleId}`,
				`/api/vehicle/${vehicleId}`,
				{ cacheTtlMs: 30_000 }
			);

			vehicle = result.data;
			dataSource = result.source;
			staleAgeMs = result.staleAgeMs;
			isOffline = result.source === 'cache' || (typeof navigator !== 'undefined' && !navigator.onLine);
			error = null;
		} catch (e) {
			error = `Failed to load vehicle: ${e instanceof Error ? e.message : 'Unknown error'}`;
			vehicle = null;
		} finally {
			loading = false;
		}
	}

	function getOccupancyBadge(occupancy: string | undefined): string {
		if (!occupancy) return 'Unknown';
		switch (occupancy.toLowerCase()) {
			case 'empty':
				return '🟢 Empty';
			case 'many_seats_available':
				return '🟢 Some space';
			case 'few_seats_available':
				return '🟡 Nearly full';
			case 'standing_room_only':
				return '🔴 Crowded';
			case 'crushed_standing_room_only':
				return '🔴 Very crowded';
			default:
				return occupancy;
		}
	}

	function formatTime(timestamp: number): string {
		try {
			const date = new Date(timestamp);
			const now = new Date();
			const diff = (date.getTime() - now.getTime()) / 1000;

			if (diff < 60) return 'Now';
			if (diff < 3600) return `${Math.round(diff / 60)}m`;
			return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
		} catch {
			return String(timestamp);
		}
	}

	function formatEta(etaSeconds: number): string {
		if (etaSeconds <= 60) {
			return 'Now';
		}

		return `${Math.max(1, Math.round(etaSeconds / 60))}m`;
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

		loadVehicle();
		refreshInterval = setInterval(loadVehicle, 10000); // Refresh every 10s

		return () => {
			if (typeof window !== 'undefined') {
				window.removeEventListener('online', handleOnline);
				window.removeEventListener('offline', handleOffline);
			}
		};
	});

	onDestroy(() => {
		if (refreshInterval) clearInterval(refreshInterval);
	});
</script>

<div class="vehicle-container">
	{#if loading && !vehicle}
		<div class="loading-state">
			<p>Loading vehicle information...</p>
		</div>
	{:else if error && !vehicle}
		<div class="error-state">
			<p class="error-message">{error}</p>
			<button class="retry-button" on:click={loadVehicle}>Try again</button>
		</div>
	{:else if vehicle}
		<div class="vehicle-header">
			<div class="vehicle-title">
				<h2 class="vehicle-label">{vehicle.label}</h2>
				<p class="route-info">{vehicle.route_name}</p>
				{#if dataSource === 'cache' || isOffline}
					<p class="offline-fallback">Offline fallback: cached vehicle data from {formatAgeMinutes(staleAgeMs || Date.now() - vehicle.generated_at)} ago.</p>
				{/if}
			</div>
			<div class="vehicle-status">
				<span class="live-indicator">● Live</span>
				<span class="occupancy-badge">{getOccupancyBadge(vehicle.occupancy_status)}</span>
			</div>
		</div>

		<div class="vehicle-grid">
			<!-- Left: Map placeholder & vehicle info -->
			<div class="vehicle-info-card">
				<div class="map-placeholder">
					<div class="map-icon">📍</div>
					<p>Location</p>
					{#if typeof vehicle.latitude === 'number' && typeof vehicle.longitude === 'number'}
						<p class="coordinates">
							{vehicle.latitude.toFixed(4)}, {vehicle.longitude.toFixed(4)}
						</p>
					{:else}
						<p class="coordinates">Location unavailable</p>
					{/if}
				</div>

				<div class="info-items">
					<div class="info-item">
						<span class="info-label">Route</span>
						<span class="info-value">{vehicle.route_number} • {vehicle.route_name}</span>
					</div>

					{#if vehicle.current_status}
						<div class="info-item">
							<span class="info-label">Status</span>
							<span class="info-value">{vehicle.current_status}</span>
						</div>
					{/if}

					{#if vehicle.trip_id}
						<div class="info-item">
							<span class="info-label">Trip</span>
							<span class="info-value">{vehicle.trip_id}</span>
						</div>
					{/if}

					<div class="info-item">
						<span class="info-label">Updated</span>
						<span class="info-value">{new Date(vehicle.generated_at).toLocaleTimeString()}</span>
					</div>
				</div>
			</div>

			<!-- Right: Next stops -->
			<div class="stops-card">
				<h3 class="stops-title">Next Stops</h3>

				{#if vehicle.next_stops.length === 0}
					<p class="no-stops">No upcoming stops</p>
				{:else}
					<div class="stops-list">
						{#each vehicle.next_stops as stop, index}
							<div class="stop-row" class:next={index === 0}>
								<div class="stop-number">{index + 1}</div>
								<div class="stop-details">
									<div class="stop-name">{stop.stop_name}</div>
									<div class="arrival-time">Arrives {formatTime(stop.arrival_time)}</div>
								</div>
								<div class="stop-eta">{formatEta(stop.eta_seconds)}</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<div class="footer-text">
			<p>Updates every 10 seconds • Real-time MBTA data</p>
		</div>
	{/if}
</div>

<style lang="postcss">
	.vehicle-container {
		@apply space-y-4;
	}

	.loading-state,
	.error-state {
		@apply py-8 text-center text-gray-500;
	}

	.error-message {
		@apply text-red-600 mb-3;
	}

	.retry-button {
		@apply px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors;
	}

	.vehicle-header {
		@apply flex items-start justify-between pb-4 border-b border-gray-200;
	}

	.vehicle-title {
		@apply flex-1;
	}

	.vehicle-label {
		@apply text-2xl font-bold text-gray-900 m-0;
	}

	.route-info {
		@apply text-sm text-gray-500 m-0 mt-1;
	}

	.offline-fallback {
		@apply text-xs font-semibold mt-2 mb-0 px-2 py-1 rounded inline-block;
		background: rgba(251, 191, 36, 0.15);
		color: #92400e;
		border: 1px solid rgba(245, 158, 11, 0.35);
	}

	.vehicle-status {
		@apply flex items-center gap-2;
	}

	.live-indicator {
		@apply inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded;
	}

	.occupancy-badge {
		@apply inline-block px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded;
	}

	.vehicle-grid {
		@apply grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6;
	}

	.vehicle-info-card {
		@apply bg-white border border-gray-200 rounded-lg overflow-hidden;
	}

	.map-placeholder {
		@apply h-48 bg-gradient-to-br from-blue-50 to-cyan-50 border-b border-gray-200 flex flex-col items-center justify-center;
	}

	.map-icon {
		@apply text-4xl mb-2;
	}

	.map-placeholder p {
		@apply m-0 text-gray-600 text-sm;
	}

	.coordinates {
		@apply !text-xs !text-gray-500 font-mono;
	}

	.info-items {
		@apply p-4 space-y-3;
	}

	.info-item {
		@apply flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0;
	}

	.info-label {
		@apply text-sm font-semibold text-gray-700;
	}

	.info-value {
		@apply text-sm text-gray-900;
	}

	.stops-card {
		@apply bg-white border border-gray-200 rounded-2xl p-4;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 251, 255, 0.96));
		box-shadow:
			0 12px 24px rgba(15, 23, 42, 0.05),
			inset 0 1px 0 rgba(255, 255, 255, 0.75);
	}

	.stops-title {
		@apply text-lg font-semibold text-gray-900 m-0 pb-3 border-b border-gray-200;
	}

	.no-stops {
		@apply py-8 text-center text-gray-500;
	}

	.stops-list {
		@apply grid gap-2 mt-3;
	}

	.stop-row {
		@apply flex items-center gap-3 p-3 rounded-2xl;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
		border: 1px solid rgba(15, 23, 42, 0.06);
		box-shadow: 0 10px 20px rgba(15, 23, 42, 0.04);
	}

	.stop-row.next {
		@apply border;
		background: linear-gradient(180deg, #eff6ff, #dbeafe);
		border-color: #93c5fd;
		box-shadow: 0 12px 24px rgba(37, 99, 235, 0.08);
	}

	.stop-number {
		@apply flex items-center justify-center w-6 h-6 bg-gray-300 text-white text-xs font-semibold rounded-full flex-shrink-0;
	}

	.stop-row.next .stop-number {
		@apply bg-blue-500;
	}

	.stop-details {
		@apply flex-1 min-w-0;
	}

	.stop-name {
		@apply font-semibold text-gray-900 text-sm;
	}

	.arrival-time {
		@apply text-xs text-gray-500 mt-0.5;
	}

	.stop-eta {
		@apply text-sm font-semibold text-gray-900 flex-shrink-0;
	}

	.footer-text {
		@apply text-center text-xs text-gray-500 mt-4;
	}

	/* Mobile */
	@media (max-width: 768px) {
		.vehicle-grid {
			@apply grid-cols-1;
		}

		.vehicle-status {
			@apply flex-col items-start gap-1 mt-2;
		}
	}

	/* Accessibility */
	@media (prefers-reduced-motion: reduce) {
		.stop-row {
			transition: none;
		}
	}
</style>
