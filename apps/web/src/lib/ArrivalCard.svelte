/**
 * Arrival Card Component
 * Displays a single arrival with realtime status, delay, and accessibility info
 */

<script lang="ts">
	import type { ArrivalForecast } from '$lib/types';

	export let arrival: ArrivalForecast;
	export let onClick: () => void = () => {};
	export let crowdingPercent: number | null = null;

	function formatTime(seconds: number): string {
		if (seconds < 60) {
			return 'Now';
		}
		if (seconds < 3600) {
			const minutes = Math.round(seconds / 60);
			return `${minutes} min`;
		}
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.round((seconds % 3600) / 60);
		return `${hours}h ${minutes}m`;
	}

	function getModeColor(mode: string): string {
		switch (mode.toLowerCase()) {
			case 'bus':
				return '#FCD34D'; // yellow
			case 'subway':
				return '#EF4444'; // red
			case 'rail':
				return '#8B5CF6'; // purple
			case 'ferry':
				return '#06B6D4'; // cyan
			default:
				return '#6B7280'; // gray
		}
	}

	function getModeIcon(mode: string): string {
		switch (mode.toLowerCase()) {
			case 'bus':
				return '🚌';
			case 'subway':
				return '🚇';
			case 'rail':
				return '🚂';
			case 'ferry':
				return '⛴️';
			default:
				return '🚌';
		}
	}

	$: timeDisplay = formatTime(arrival.eta_seconds);
	$: isDelayed = arrival.delay_seconds > 60;
	$: delayDisplay = isDelayed ? `${Math.round(arrival.delay_seconds / 60)} min delay` : null;
</script>

<div
	class="arrival-card"
	on:click={onClick}
	role="button"
	tabindex="0"
	on:keydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			onClick();
		}
	}}
	aria-label="Arrival: {arrival.route_number} to {arrival.headsign}, arriving in {timeDisplay}"
>
	<!-- Route Badge -->
	<div class="route-badge" style="background-color: {getModeColor(arrival.mode)}">
		<span class="route-number">{arrival.route_number}</span>
		<span class="route-mode" title="{arrival.mode}">
			{getModeIcon(arrival.mode)}
		</span>
	</div>

	<!-- Arrival Info -->
	<div class="arrival-info">
		<div class="arrival-header">
			<div class="destination">
				<span class="mode">{arrival.mode}</span>
				<span class="headsign">{arrival.headsign}</span>
			</div>
			<div class="timing {isDelayed ? 'delayed' : ''}">
				<span class="eta">{timeDisplay}</span>
				{#if arrival.is_live}
					<span class="live-badge" title="Real-time GPS tracking" aria-label="Live GPS tracking">
						✓
					</span>
				{:else}
					<span class="scheduled-badge" title="Scheduled" aria-label="Scheduled arrival">
						📋
					</span>
				{/if}
			</div>
		</div>

		{#if delayDisplay}
			<div class="delay-warning" role="alert" aria-live="polite">
				⚠️ {delayDisplay}
			</div>
		{/if}

		{#if crowdingPercent !== null}
			<div class="crowding-badge" data-tone={crowdingPercent >= 75 ? 'high' : crowdingPercent >= 45 ? 'medium' : 'low'}>
				👥 Crowd {crowdingPercent}%
			</div>
		{/if}

		<!-- Accessibility Info -->
		{#if arrival.accessibility_icons && arrival.accessibility_icons.length > 0}
			<div class="accessibility-icons" role="region" aria-label="Accessibility features">
				{#each arrival.accessibility_icons as icon}
					<span class="access-icon" title="{icon}">♿</span>
				{/each}
			</div>
		{/if}

		<!-- Platform Info (if available) -->
		{#if arrival.platform}
			<div class="platform-info">Platform {arrival.platform}</div>
		{/if}
	</div>
</div>

<style lang="postcss">
	.arrival-card {
		@apply flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer;
	}

	.route-badge {
		@apply flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded font-semibold text-black text-sm;
	}

	.route-number {
		@apply font-bold;
	}

	.route-mode {
		@apply text-lg;
	}

	.arrival-info {
		@apply flex-1;
	}

	.arrival-header {
		@apply flex items-start justify-between gap-3;
	}

	.destination {
		@apply flex flex-col;
	}

	.mode {
		@apply text-xs font-semibold uppercase text-gray-500 tracking-wider;
	}

	.headsign {
		@apply text-sm font-semibold text-gray-900;
	}

	.timing {
		@apply flex items-center gap-2 text-right;
	}

	.eta {
		@apply text-lg font-bold text-green-600;
	}

	.timing.delayed .eta {
		@apply text-red-600;
	}

	.live-badge {
		@apply inline-block text-xs font-semibold bg-green-100 text-green-800 px-2 py-1 rounded;
	}

	.scheduled-badge {
		@apply inline-block text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded;
	}

	.delay-warning {
		@apply mt-2 text-xs text-red-600 font-semibold;
	}

	.crowding-badge {
		@apply mt-2 inline-block text-xs font-semibold px-2 py-1 rounded;
		background: rgba(148, 163, 184, 0.18);
		color: #334155;
	}

	.crowding-badge[data-tone='low'] {
		background: rgba(34, 197, 94, 0.16);
		color: #166534;
	}

	.crowding-badge[data-tone='medium'] {
		background: rgba(251, 191, 36, 0.2);
		color: #92400e;
	}

	.crowding-badge[data-tone='high'] {
		background: rgba(239, 68, 68, 0.16);
		color: #991b1b;
	}

	.accessibility-icons {
		@apply mt-2 flex gap-2;
	}

	.access-icon {
		@apply inline-block text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded;
	}

	.platform-info {
		@apply mt-2 text-xs text-gray-600;
	}

	/* Focus styles for keyboard navigation */
	:global(.arrival-card:focus) {
		@apply outline-none ring-2 ring-blue-500 ring-offset-2;
	}

	/* Mobile */
	@media (max-width: 640px) {
		.arrival-card {
			@apply gap-2 p-2;
		}

		.headsign {
			@apply text-xs;
		}

		.eta {
			@apply text-base;
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.arrival-card {
			transition: none;
		}
	}
</style>
