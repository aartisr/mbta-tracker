<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { distanceKm, estimateWalkMinutes } from '$lib/home/geo';
  import type { AddressResult, StopResult } from '$lib/types';
  import type { TrackerWidgetConfig } from '$lib/tracker';

  type RankedStop = {
    stop: StopResult;
    walkMinutes: number;
    etaMinutes: number | null;
    routeCount: number;
    rank: 'best' | 'good' | 'nearby';
  };

  type BoardingInsight = { routeNumbers: string[]; nextEtaMin: number | null };

  export let visible = false;
  export let highlightedAddress: AddressResult | null = null;
  export let mapStopsWithRanking: RankedStop[] = [];
  export let mapFocusStop: StopResult | null = null;
  export let mapFocusAddress: AddressResult | null = null;
  export let TrackerWidgetComponent: typeof import('$lib/tracker/TrackerWidget.svelte').default | null = null;
  export let mapViewKey = '';
  export let homeMapConfig: TrackerWidgetConfig;
  export let boardingInsightsLoading = false;
  export let boardingInsightsError: string | null = null;
  export let boardingInsights: Record<string, BoardingInsight> = {};
  export let isBoardingLegendCollapsed = false;

  const dispatch = createEventDispatcher<{
    openstop: { stop: StopResult; address: AddressResult; index: number };
    openstopmap: { stop: StopResult; address: AddressResult; index: number };
    panelready: HTMLElement;
    legendready: HTMLDivElement;
  }>();

  let panelEl: HTMLElement | null = null;
  let legendEl: HTMLDivElement | null = null;

  onMount(() => {
    if (panelEl) {
      dispatch('panelready', panelEl);
    }

    if (legendEl) {
      dispatch('legendready', legendEl);
    }
  });

  function getAddressPrecisionTone(address: AddressResult): { tier: 'high' | 'medium' | 'low'; label: string } {
    const confidence = Math.max(0.15, Math.min(1, (Number.isFinite(address.confidence) ? address.confidence : 0.5)));
    if (confidence >= 0.75) {
      return { tier: 'high', label: 'Precise location' };
    }
    if (confidence >= 0.5) {
      return { tier: 'medium', label: 'Likely area' };
    }
    return { tier: 'low', label: 'Approximate area' };
  }

  function getFastestStopId(): string | null {
    const candidates = mapStopsWithRanking.filter((entry) => typeof entry.etaMinutes === 'number');
    if (candidates.length === 0) {
      return null;
    }

    return candidates.sort((a, b) => (a.etaMinutes ?? Number.POSITIVE_INFINITY) - (b.etaMinutes ?? Number.POSITIVE_INFINITY))[0].stop.stop_id;
  }

  function getLeastWalkStopId(address: AddressResult): string | null {
    if (address.nearby_stops.length === 0) {
      return null;
    }

    const sorted = [...address.nearby_stops].sort((a, b) => {
      const aKm = distanceKm(address.latitude, address.longitude, a.latitude, a.longitude);
      const bKm = distanceKm(address.latitude, address.longitude, b.latitude, b.longitude);
      return aKm - bKm;
    });

    return sorted[0].stop_id;
  }
</script>

{#if visible}
  <section id="home-map-panel" class="map-mode-panel" aria-label="Contextual map mode" bind:this={panelEl}>
    <div class="map-mode-head">
      <div class="map-mode-title">
        <p class="map-mode-kicker">Map mode</p>
        <h3>
          {#if mapStopsWithRanking.length > 1}
            Best boarding stop
          {:else if highlightedAddress}
            {highlightedAddress.address}
          {:else if mapFocusStop}
            {mapFocusStop.stop_name}
          {:else}
            Live map
          {/if}
        </h3>
      </div>
      <div class="map-mode-meta" aria-label="Map summary">
        {#if mapStopsWithRanking.length > 1}
          <span class="map-mode-chip">{mapStopsWithRanking.length} stops</span>
          <span class="map-mode-chip">best first</span>
        {:else if mapFocusAddress}
          {@const precision = getAddressPrecisionTone(mapFocusAddress)}
          <span class="map-mode-chip" data-tier={precision.tier}>{precision.label}</span>
        {:else if mapFocusStop}
          <span class="map-mode-chip">focused</span>
        {:else}
          <span class="map-mode-chip">tap a result</span>
        {/if}
      </div>
    </div>
    <div class="map-mode-widget" aria-label="Live map with route and alert context">
      {#if TrackerWidgetComponent}
        {#key mapViewKey}
          <svelte:component this={TrackerWidgetComponent} config={homeMapConfig} />
        {/key}
      {:else}
        <div class="map-widget-loading" role="status" aria-live="polite">Loading map view...</div>
      {/if}
    </div>
  </section>

  {#if highlightedAddress && highlightedAddress.nearby_stops.length > 0}
    <section class="boarding-panel" aria-label="Best nearby boarding stops">
      <div class="boarding-panel-head">
        <p class="boarding-kicker">Most intuitive pickup options</p>
        <h3>Best nearby stops for {highlightedAddress.address}</h3>
        <p>Pick a stop below to open live arrivals immediately.</p>
        <div
          class="boarding-legend"
          class:is-collapsed={isBoardingLegendCollapsed}
          bind:this={legendEl}
          aria-label="Nearby stop badge legend"
        >
          <span class="boarding-legend-item" data-kind="walk">
            <span class="legend-text-long">Least walking</span>
            <span class="legend-text-short">Walk</span>
          </span>
          <span class="boarding-legend-item" data-kind="fast">
            <span class="legend-text-long">Soonest bus</span>
            <span class="legend-text-short">Fast</span>
          </span>
        </div>
      </div>
      {#if boardingInsightsLoading}
        <p class="boarding-state">Loading live route intelligence…</p>
      {/if}
      {#if boardingInsightsError}
        <p class="boarding-state" data-state="error">{boardingInsightsError}</p>
      {/if}
      <div class="boarding-grid">
        {#each highlightedAddress.nearby_stops as stop, index}
          {@const walkKm = distanceKm(highlightedAddress.latitude, highlightedAddress.longitude, stop.latitude, stop.longitude)}
          {@const insight = boardingInsights[stop.stop_id]}
          {@const fastestStopId = getFastestStopId()}
          {@const leastWalkStopId = getLeastWalkStopId(highlightedAddress)}
          {@const rankedStop = mapStopsWithRanking.find((rs) => rs.stop.stop_id === stop.stop_id)}
          <article class="boarding-stop-card" data-rank={rankedStop?.rank || 'nearby'}>
            <div class="boarding-stop-top">
              <span class="boarding-rank">{rankedStop?.rank === 'best' ? '⭐' : rankedStop?.rank === 'good' ? '✓' : '•'} #{index + 1}</span>
              <div class="boarding-meta">
                {#if insight?.nextEtaMin !== null && insight?.nextEtaMin !== undefined}
                  <span class="boarding-next">Next bus ~{insight.nextEtaMin} min</span>
                {/if}
                <span class="boarding-eta">~{estimateWalkMinutes(walkKm)} min walk</span>
              </div>
            </div>
            <div class="boarding-badges">
              {#if leastWalkStopId === stop.stop_id}
                <p class="boarding-badge" data-kind="walk">Least walking</p>
              {/if}
              {#if fastestStopId === stop.stop_id && insight?.nextEtaMin !== null}
                <p class="boarding-badge" data-kind="fast">Soonest bus</p>
              {/if}
            </div>
            <h4>{stop.stop_name}</h4>
            <p>{walkKm.toFixed(2)} km from your address</p>
            {#if insight?.routeNumbers?.length > 0}
              <div class="boarding-routes" aria-label="Top bus routes at this stop">
                {#each insight.routeNumbers as routeNumber}
                  <span>{routeNumber}</span>
                {/each}
              </div>
            {/if}
            <div class="boarding-actions">
              <button on:click={() => dispatch('openstop', { stop, address: highlightedAddress, index })}>
                View live arrivals
              </button>
              <button class="ghost" on:click={() => dispatch('openstopmap', { stop, address: highlightedAddress, index })}>
                Focus on map
              </button>
            </div>
          </article>
        {/each}
      </div>
    </section>
  {/if}
{/if}
