/**
 * Stop-Centric View
 * Most common view: shows all routes serving a stop, grouped by direction
 * with real-time arrivals for each route
 */

<script lang="ts">
	import { onMount } from 'svelte';
	import { createEventDispatcher } from 'svelte';
	import ArrivalCard from './ArrivalCard.svelte';
	import type {
		StopArrivals,
		Alert,
		ArrivalForecast,
		StopCrowdingForecastResponse,
		BoardingSuggestionResponse,
		BoardingSuggestionOption
	} from '$lib/types';
	import { fetchJsonWithOfflineFallback, formatAgeMinutes } from '$lib/data-resilience';

	export let stopId: string;
	export let stopName: string;

	let arrivals: StopArrivals | null = null;
	let loading = true;
	let error: string | null = null;
	let lastUpdated = Date.now();
	let refreshInterval: NodeJS.Timeout;
	let selectedArrival: ArrivalForecast | null = null;
	let isOffline = false;
	let staleAgeMs = 0;
	let dataSource: 'network' | 'cache' = 'network';
	let crowdingForecast: StopCrowdingForecastResponse | null = null;
	let crowdingError: string | null = null;
	let destinationQuery = '';
	let suggestionPreference: 'balanced' | 'fastest' | 'least_crowded' = 'balanced';
	let boardingSuggestions: BoardingSuggestionResponse | null = null;
	let suggestionLoading = false;
	let suggestionError: string | null = null;

	const dispatch = createEventDispatcher<{
		arrivalSelected: {
			stopId: string;
			stopName: string;
			arrival: ArrivalForecast;
		};
	}>();

	// Fetch stop arrivals
	async function fetchArrivals() {
		try {
			const result = await fetchJsonWithOfflineFallback<StopArrivals>(
				`mbta_stop_arrivals_${stopId}`,
				`/api/stop/${stopId}/arrivals`,
				{ cacheTtlMs: 30_000 }
			);

			arrivals = result.data;
			lastUpdated = result.fetchedAt;
			staleAgeMs = result.staleAgeMs;
			dataSource = result.source;
			isOffline = result.source === 'cache' || (typeof navigator !== 'undefined' && !navigator.onLine);
			error = null;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			loading = false;
		}
	}

	async function fetchCrowdingForecast() {
		try {
			const response = await fetch(`/api/stop/${stopId}/crowding-forecast`);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			crowdingForecast = await response.json() as StopCrowdingForecastResponse;
			crowdingError = null;
		} catch (err) {
			crowdingError = err instanceof Error ? err.message : 'Unknown error';
		}
	}

	onMount(async () => {
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

		await Promise.all([fetchArrivals(), fetchCrowdingForecast()]);
		// Refresh every 30 seconds
		refreshInterval = setInterval(() => {
			void fetchArrivals();
			void fetchCrowdingForecast();
		}, 30000);
		return () => {
			clearInterval(refreshInterval);
			if (typeof window !== 'undefined') {
				window.removeEventListener('online', handleOnline);
				window.removeEventListener('offline', handleOffline);
			}
		};
	});

	async function refreshNow() {
		await Promise.all([fetchArrivals(), fetchCrowdingForecast()]);
	}

	function getCrowdingTone(percent: number): 'low' | 'medium' | 'high' {
		if (percent >= 75) {
			return 'high';
		}
		if (percent >= 45) {
			return 'medium';
		}
		return 'low';
	}

	function preferenceLabel(optionType: BoardingSuggestionOption['option_type']): string {
		if (optionType === 'best_overall') {
			return 'Best overall';
		}
		if (optionType === 'fastest') {
			return 'Fastest';
		}
		return 'Least crowded';
	}

	function crowdingForEta(etaSeconds: number): number | null {
		if (!crowdingForecast?.timeline?.length) {
			return null;
		}

		const etaMinutes = Math.max(1, Math.round(etaSeconds / 60));
		const horizon = etaMinutes <= 5 ? 5 : etaMinutes <= 15 ? 15 : etaMinutes <= 30 ? 30 : 60;
		const point = crowdingForecast.timeline.find((item) => item.horizon_minutes === horizon);
		return point?.occupancy_percent ?? null;
	}

	async function loadBoardingSuggestions() {
		suggestionError = null;
		boardingSuggestions = null;

		if (!destinationQuery.trim()) {
			suggestionError = 'Enter a destination stop name first.';
			return;
		}

		try {
			suggestionLoading = true;
			const params = new URLSearchParams({
				from: stopName,
				to: destinationQuery.trim(),
				preference: suggestionPreference
			});

			const response = await fetch(`/api/boarding-suggestion?${params.toString()}`);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			boardingSuggestions = await response.json() as BoardingSuggestionResponse;
		} catch (err) {
			suggestionError = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			suggestionLoading = false;
		}
	}

	function formatLastUpdated(): string {
		const seconds = Math.floor((Date.now() - lastUpdated) / 1000);
		if (seconds < 60) return 'Just now';
		const minutes = Math.floor(seconds / 60);
		return `${minutes} min ago`;
	}

	function formatClockTime(timestamp: number): string {
		if (!timestamp) {
			return 'Unknown';
		}

		return new Date(timestamp).toLocaleTimeString([], {
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function formatEta(seconds: number): string {
		if (seconds <= 60) {
			return 'Now';
		}

		return `${Math.max(1, Math.round(seconds / 60))} min`;
	}

	function handleArrivalSelected(arrival: ArrivalForecast) {
		selectedArrival = arrival;
		dispatch('arrivalSelected', {
			stopId,
			stopName,
			arrival
		});
	}

	function clearArrivalSelection() {
		selectedArrival = null;
	}

	function getAlertBadge(alert: Alert): string {
		switch (alert.severity) {
			case 'high':
				return '🚨';
			case 'medium':
				return '⚠️';
			default:
				return 'ℹ️';
		}
	}

	/**
	 * Extract the most common headsigns from a group of arrivals.
	 * Returns up to 2 unique destinations, sorted by frequency.
	 */
	function getDestinations(group: typeof arrivals.inbound): string[] {
		if (!group || group.length === 0) return [];
		const freq = new Map<string, number>();
		for (const a of group) {
			const hs = (a.headsign || '').trim();
			if (hs) freq.set(hs, (freq.get(hs) ?? 0) + 1);
		}
		return [...freq.entries()]
			.sort((a, b) => b[1] - a[1])
			.slice(0, 2)
			.map(([hs]) => hs);
	}
</script>

<div class="stop-view">
	<!-- Header -->
	<div class="stop-header">
		<div class="stop-info">
			<h1 class="stop-name">{stopName}</h1>
			{#if arrivals?.location}
				<div class="location-badge">
					📍 {arrivals.location.latitude.toFixed(4)}, {arrivals.location.longitude.toFixed(4)}
				</div>
			{/if}
		</div>

		<div class="header-actions">
			<button class="refresh-button" on:click={refreshNow} aria-label="Refresh arrivals">
				🔄
			</button>
			<button class="info-button" aria-label="Stop information">ℹ️</button>
		</div>
	</div>

	<!-- Alerts -->
	{#if arrivals?.alerts && arrivals.alerts.length > 0}
		<div class="alerts-section" role="region" aria-live="polite" aria-label="Service alerts">
			{#each arrivals.alerts as alert}
				<div class="alert-item" class:high={alert.severity === 'high'}>
					<span class="alert-badge">{getAlertBadge(alert)}</span>
					<div class="alert-content">
						<div class="alert-title">{alert.title}</div>
						<div class="alert-description">{alert.description}</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Loading State -->
	{#if loading}
		<div class="loading-state">
			<div class="spinner"></div>
			<p>Loading arrivals...</p>
		</div>
	{/if}

	<!-- Error State -->
	{#if error && !loading}
		<div class="error-state" role="alert">
			<p>❌ Error: {error}</p>
			<button class="retry-button" on:click={refreshNow}>Try Again</button>
		</div>
	{/if}

	<!-- Arrivals Content -->
	{#if arrivals && !loading && !error}
		<div class="arrivals-content">
			{#if dataSource === 'cache' || isOffline}
				<div class="offline-banner" role="status" aria-live="polite">
					Offline fallback active. Showing cached arrivals from {formatAgeMinutes(staleAgeMs || Date.now() - lastUpdated)} ago.
				</div>
			{/if}

			<!-- Last Updated -->
			<div class="updated-info">
				Last updated {formatLastUpdated()} • Auto-refresh every 30s
			</div>

			{#if crowdingForecast?.timeline?.length}
				<section class="crowding-panel" aria-label="Crowding forecast">
					<div class="crowding-head">
						<div>
							<p class="crowding-kicker">Crowding forecast</p>
							<h3>How busy soon?</h3>
						</div>
						<div class="crowding-source">
							<span>MBTA arrivals</span>
							<span>Heuristic model</span>
							<span>Updated {formatLastUpdated()}</span>
						</div>
					</div>
					<div class="crowding-timeline">
						{#each crowdingForecast.timeline as point}
							<div class="crowding-chip" data-tone={getCrowdingTone(point.occupancy_percent)}>
								<div class="crowding-chip-top">
									<span class="horizon">{point.horizon_minutes}m</span>
									<strong>{point.occupancy_percent}%</strong>
								</div>
								<div class="crowding-meter" aria-hidden="true">
									<span style={`--fill:${point.occupancy_percent};`}></span>
								</div>
								<div class="crowding-meta">
									<span>Conf {Math.round(point.confidence * 100)}%</span>
									<span>n={point.sample_size}</span>
								</div>
							</div>
						{/each}
					</div>
					<p class="crowding-explainer">
						Source: live MBTA arrivals, vehicle occupancy when available, route variety, and time of day. Use this as a relative guide, not an exact occupancy count.
					</p>
				</section>
			{:else if crowdingError}
				<p class="crowding-error">Crowding forecast unavailable: {crowdingError}</p>
			{/if}

			<section class="boarding-panel" aria-label="Smart boarding suggestions">
				<div class="boarding-head">
					<h3>Smart Boarding</h3>
					<p>Compare fastest, least crowded, and balanced options.</p>
				</div>
				<div class="boarding-controls">
					<input
						type="text"
						bind:value={destinationQuery}
						placeholder="Destination stop (e.g. South Station)"
						aria-label="Boarding destination stop"
					/>
					<select bind:value={suggestionPreference} aria-label="Boarding preference">
						<option value="balanced">Balanced</option>
						<option value="fastest">Fastest</option>
						<option value="least_crowded">Least crowded</option>
					</select>
					<button class="boarding-button" on:click={loadBoardingSuggestions}>
						{suggestionLoading ? 'Loading…' : 'Get options'}
					</button>
				</div>

				{#if suggestionError}
					<p class="boarding-error">{suggestionError}</p>
				{/if}

				{#if boardingSuggestions?.options?.length}
					<div class="boarding-grid">
						{#each boardingSuggestions.options as option}
							<article class="boarding-card">
								<p class="boarding-label">{preferenceLabel(option.option_type)}</p>
								<h4>{option.route_number} to {option.headsign}</h4>
								<div class="boarding-metrics">
									<span>ETA {option.eta_minutes}m</span>
									<span>Crowding {option.crowding_percent}%</span>
									<span>Delay {option.delay_minutes}m</span>
								</div>
							</article>
						{/each}
					</div>
				{/if}
			</section>

			{#if selectedArrival}
				<section class="arrival-detail" aria-label="Selected trip details">
					<div class="arrival-detail-head">
						<div>
							<p class="arrival-detail-kicker">Selected arrival</p>
							<h3>{selectedArrival.route_number} to {selectedArrival.headsign}</h3>
						</div>
						<button class="arrival-detail-close" on:click={clearArrivalSelection}>
							Clear
						</button>
					</div>
					<div class="arrival-detail-grid">
						<div>
							<span>ETA</span>
							<strong>{formatEta(selectedArrival.eta_seconds)}</strong>
						</div>
						<div>
							<span>Scheduled</span>
							<strong>{formatClockTime(selectedArrival.scheduled_time)}</strong>
						</div>
						<div>
							<span>Status</span>
							<strong>{selectedArrival.is_live ? 'Live GPS' : 'Scheduled'}</strong>
						</div>
						<div>
							<span>Trip ID</span>
							<strong>{selectedArrival.trip_id}</strong>
						</div>
					</div>
				</section>
			{/if}

			<!-- Inbound Arrivals -->
			{#if arrivals.inbound && arrivals.inbound.length > 0}
				{@const inboundDests = getDestinations(arrivals.inbound)}
				<div class="direction-section">
					<h2 class="direction-header">
						<span class="direction-label">
							⬇️ Inbound
							{#if inboundDests.length > 0}
								<span class="direction-dest">→ {inboundDests.join(' · ')}</span>
							{/if}
						</span>
						<span class="count-badge">{arrivals.inbound.length}</span>
					</h2>
					<div class="arrivals-list">
						{#each arrivals.inbound as arrival (arrival.trip_id)}
							<ArrivalCard
								{arrival}
								crowdingPercent={arrival.crowding_percent ?? crowdingForEta(arrival.eta_seconds)}
								onClick={() => handleArrivalSelected(arrival)}
							/>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Outbound Arrivals -->
			{#if arrivals.outbound && arrivals.outbound.length > 0}
				{@const outboundDests = getDestinations(arrivals.outbound)}
				<div class="direction-section">
					<h2 class="direction-header">
						<span class="direction-label">
							⬆️ Outbound
							{#if outboundDests.length > 0}
								<span class="direction-dest">→ {outboundDests.join(' · ')}</span>
							{/if}
						</span>
						<span class="count-badge">{arrivals.outbound.length}</span>
					</h2>
					<div class="arrivals-list">
						{#each arrivals.outbound as arrival (arrival.trip_id)}
							<ArrivalCard
								{arrival}
								crowdingPercent={arrival.crowding_percent ?? crowdingForEta(arrival.eta_seconds)}
								onClick={() => handleArrivalSelected(arrival)}
							/>
						{/each}
					</div>
				</div>
			{/if}

			<!-- No Arrivals -->
			{#if (!arrivals.inbound || arrivals.inbound.length === 0) && (!arrivals.outbound || arrivals.outbound.length === 0)}
				<div class="no-arrivals">
					<p>No upcoming arrivals</p>
					<p class="subtitle">Check back in a few minutes</p>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style lang="postcss">
	.stop-view {
		@apply w-full max-w-2xl mx-auto;
	}

	.stop-header {
		@apply flex items-start justify-between gap-4 p-4 bg-white border-b;
	}

	.stop-info {
		@apply flex-1;
	}

	.stop-name {
		@apply text-2xl font-bold text-gray-900;
	}

	.location-badge {
		@apply mt-2 inline-block text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded;
	}

	.header-actions {
		@apply flex gap-2;
	}

	.refresh-button,
	.info-button {
		@apply text-lg hover:opacity-70 transition-opacity p-2 rounded hover:bg-gray-100;
	}

	.alerts-section {
		@apply p-4 space-y-2 bg-yellow-50 border-b;
	}

	.alert-item {
		@apply flex gap-3 p-3 bg-yellow-100 rounded border border-yellow-300;

		&.high {
			@apply bg-red-100 border-red-300;
		}
	}

	.alert-badge {
		@apply text-lg flex-shrink-0;
	}

	.alert-content {
		@apply flex-1;
	}

	.alert-title {
		@apply font-semibold text-sm;
	}

	.alert-description {
		@apply text-xs text-gray-700 mt-1;
	}

	.loading-state {
		@apply flex flex-col items-center justify-center py-12 text-gray-500;
	}

	.spinner {
		@apply inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin;
	}

	.error-state {
		@apply p-4 text-center text-red-600 bg-red-50 rounded;
	}

	.retry-button {
		@apply mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors;
	}

	.arrivals-content {
		@apply p-4 space-y-6;
	}

	.updated-info {
		@apply text-xs text-gray-500 text-center py-2 border-b;
	}

	.offline-banner {
		@apply text-xs font-semibold rounded px-3 py-2;
		background: rgba(251, 191, 36, 0.16);
		color: #92400e;
		border: 1px solid rgba(245, 158, 11, 0.35);
	}

	.crowding-panel,
	.boarding-panel {
		@apply p-3 rounded-lg border;
		border-color: #c7d2fe;
		background:
			radial-gradient(circle at top right, rgba(59, 130, 246, 0.12), transparent 32%),
			linear-gradient(180deg, #fbfdff 0%, #f6f9ff 100%);
		box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
	}

	.crowding-head {
		@apply flex flex-wrap items-start justify-between gap-3;
	}

	.crowding-kicker {
		@apply m-0 text-[11px] font-semibold uppercase tracking-[0.2em];
		color: #1d4ed8;
	}

	.crowding-head h3,
	.boarding-head h3 {
		@apply m-0 text-sm font-semibold;
		color: #0f172a;
	}

	.boarding-head p {
		@apply mt-1 mb-0 text-xs;
		color: #64748b;
	}

	.crowding-source {
		@apply flex flex-wrap gap-1.5;
	}

	.crowding-source span {
		@apply inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold border;
		border-color: rgba(148, 163, 184, 0.26);
		background: rgba(255, 255, 255, 0.88);
		color: #475569;
	}

	.crowding-timeline {
		@apply mt-3 grid gap-2;
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}

	.crowding-chip {
		@apply rounded-xl px-2.5 py-2.5 border text-left;
		border-color: rgba(148, 163, 184, 0.25);
		background: rgba(255, 255, 255, 0.92);
		box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
	}

	.crowding-chip[data-tone='low'] {
		background: rgba(34, 197, 94, 0.12);
		border-color: rgba(34, 197, 94, 0.45);
	}

	.crowding-chip[data-tone='medium'] {
		background: rgba(251, 191, 36, 0.16);
		border-color: rgba(251, 191, 36, 0.45);
	}

	.crowding-chip[data-tone='high'] {
		background: rgba(239, 68, 68, 0.14);
		border-color: rgba(239, 68, 68, 0.42);
	}

	.crowding-chip-top {
		@apply flex items-baseline justify-between gap-2;
	}

	.crowding-chip .horizon {
		@apply block text-[11px] font-semibold uppercase tracking-[0.14em];
		color: #64748b;
	}

	.crowding-chip strong {
		@apply block text-sm;
		color: #0f172a;
	}

	.crowding-meter {
		@apply mt-2 h-1.5 rounded-full overflow-hidden;
		background: rgba(148, 163, 184, 0.15);
	}

	.crowding-meter span {
		display: block;
		height: 100%;
		width: min(100%, calc(var(--fill) * 1%));
		border-radius: inherit;
		background: linear-gradient(90deg, #22c55e, #eab308 56%, #ef4444 100%);
	}

	.crowding-meta {
		@apply mt-2 flex items-center justify-between gap-2 text-[10px] font-semibold;
		color: #64748b;
	}

	.crowding-explainer {
		@apply mt-3 mb-0 text-xs leading-5;
		color: #475569;
	}

	.crowding-error,
	.boarding-error {
		@apply text-xs m-0;
		color: #b91c1c;
	}

	.boarding-controls {
		@apply mt-3 grid gap-2;
		grid-template-columns: minmax(0, 1.8fr) minmax(0, 1fr) auto;
	}

	.boarding-controls input,
	.boarding-controls select {
		@apply rounded-xl border px-2.5 py-2 text-sm;
		border-color: rgba(148, 163, 184, 0.28);
		background: rgba(255, 255, 255, 0.92);
		color: #0f172a;
		box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
	}

	.boarding-button {
		@apply rounded-xl px-3 py-2 text-xs font-semibold text-white;
		background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
		box-shadow: 0 10px 22px rgba(37, 99, 235, 0.18);
	}

	.boarding-grid {
		@apply mt-3 grid gap-2;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
	}

	.boarding-card {
		@apply rounded-xl border px-3 py-2;
		border-color: rgba(148, 163, 184, 0.22);
		background: rgba(255, 255, 255, 0.95);
		box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
	}

	.boarding-label {
		@apply m-0 text-xs font-semibold uppercase tracking-wide;
		color: #1d4ed8;
	}

	.boarding-card h4 {
		@apply m-0 mt-1 text-sm;
		color: #0f172a;
	}

	.boarding-metrics {
		@apply mt-2 flex flex-wrap gap-2 text-xs;
		color: #475569;
	}

	.boarding-metrics span {
		@apply inline-flex items-center rounded-full px-2 py-1 border;
		border-color: rgba(148, 163, 184, 0.2);
		background: rgba(248, 250, 252, 0.9);
	}

	.arrival-detail {
		@apply p-3 rounded-lg border;
		border-color: #bfdbfe;
		background: #eff6ff;
	}

	.arrival-detail-head {
		@apply flex items-start justify-between gap-3;
	}

	.arrival-detail-kicker {
		@apply text-xs font-semibold uppercase tracking-wide m-0;
		color: #1d4ed8;
	}

	.arrival-detail-head h3 {
		@apply m-0 mt-1 text-base font-semibold;
		color: #0f172a;
	}

	.arrival-detail-close {
		@apply text-xs font-semibold px-2 py-1 rounded border;
		border-color: #93c5fd;
		color: #1e3a8a;
		background: rgba(255, 255, 255, 0.7);
	}

	.arrival-detail-grid {
		@apply mt-3 grid gap-2;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
	}

	.arrival-detail-grid span {
		@apply block text-xs uppercase tracking-wide;
		color: #64748b;
	}

	.arrival-detail-grid strong {
		@apply block text-sm font-semibold;
		color: #0f172a;
	}

	.direction-section {
		@apply space-y-3;
	}

	.direction-header {
		@apply text-lg font-semibold text-gray-900 flex items-center gap-2;
	}

	.direction-label {
		@apply text-xl flex flex-wrap items-baseline gap-1.5;
	}

	.direction-dest {
		@apply text-sm font-semibold;
		color: #1d4ed8;
		letter-spacing: -0.01em;
	}

	.count-badge {
		@apply inline-block px-2 py-1 text-xs font-semibold bg-gray-200 text-gray-700 rounded;
	}

	.arrivals-list {
		@apply space-y-2;
	}

	.no-arrivals {
		@apply text-center py-8 text-gray-500;
	}

	.subtitle {
		@apply text-sm mt-2;
	}

	/* Mobile */
	@media (max-width: 640px) {
		.stop-header {
			@apply flex-col gap-2;
		}

		.stop-name {
			@apply text-xl;
		}

		.header-actions {
			@apply self-end;
		}

		.arrivals-content {
			@apply p-2 space-y-4;
		}

		.crowding-timeline {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.boarding-controls {
			grid-template-columns: 1fr;
		}
	}

	/* Accessibility */
	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation: none;
		}
	}
</style>
