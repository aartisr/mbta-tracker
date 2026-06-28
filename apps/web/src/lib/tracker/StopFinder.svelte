<script lang="ts">
  import { writable } from 'svelte/store';
  import type { GeoLocation, NearbyStop, StopFinderState, AccessibilityFilter } from './geo-types';
  import type { TrackerVehicle } from './types';
  import { getGlobalContainer, type ServiceContainer } from './services';
  import { requestUserLocation, getRecentSearches } from './geolocation';

  // Props
  export let container: ServiceContainer = getGlobalContainer();
  export let vehicles: TrackerVehicle[] = [];
  export let onStopSelected: (stopId: string) => void = () => {};

  const MBTA_API_KEY: string | undefined =
    typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_MBTA_API_KEY as string | undefined) : undefined;

  $: geoRepository = container.getGeoRepository();
  $: transitRepository = container.getRepository();
  $: stopEnricher = container.getStopEnricher();

  // Internal state
  let state = writable<StopFinderState>({
    status: 'idle',
    searchQuery: '',
    nearbyStops: [],
    error: undefined
  });

  let searchQuery = '';
  let accessibilityFilter = writable<AccessibilityFilter>({
    wheelchairOnly: false,
    audioAnnouncementsOnly: false,
    visualIndicatorsOnly: false
  });

  let showRecentSearches = writable(false);
  let searchInput: HTMLInputElement;
  let showRateLimitTroubleshooting = false;
  let copyStatusMessage = '';
  let filteredStops: NearbyStop[] = [];

  const recentSearches = getRecentSearches();
  $: isRateLimited = Boolean($state.error && /(429|rate limit)/i.test($state.error));
  $: if (!isRateLimited) showRateLimitTroubleshooting = false;
  $: filteredStops = $state.nearbyStops.filter((stop) => {
    if ($accessibilityFilter.wheelchairOnly && !stop.wheelchairAccessible) {
      return false;
    }

    if ($accessibilityFilter.audioAnnouncementsOnly) {
      return stop.nextArrivals.some((arrival) => arrival.hasAudioAnnouncements);
    }

    if ($accessibilityFilter.visualIndicatorsOnly) {
      return stop.nextArrivals.some((arrival) => arrival.wheelchairAccessible);
    }

    return true;
  });

  const RATE_LIMIT_TROUBLESHOOTING_TEXT = 'rate-limited, try again in a minute or configure API key';

  async function copyTroubleshootingText() {
    copyStatusMessage = '';
    try {
      await navigator.clipboard.writeText(RATE_LIMIT_TROUBLESHOOTING_TEXT);
      copyStatusMessage = 'Copied.';
    } catch {
      copyStatusMessage = 'Copy failed. Select and copy manually.';
    }
  }

  // Auto-detect geolocation on mount
  async function autoDetectLocation() {
    state.update((s) => ({ ...s, status: 'locating' }));
    try {
      const location = await requestUserLocation();
      await loadNearbyStops(location);
      state.update((s) => ({ ...s, userLocation: location, status: 'found' }));
    } catch (error) {
      console.error('Geolocation error:', error);
      state.update((s) => ({
        ...s,
        status: 'error',
        error: 'Enable location access or search by address'
      }));
    }
  }

  async function handleAddressSearch() {
    const query = searchQuery.trim();
    if (!query) return;
    state.update((s) => ({ ...s, status: 'searching' }));
    showRecentSearches.set(false);

    let location: GeoLocation;
    try {
      const resolved = await geoRepository.geocodeAddress(query);
      if (!resolved) {
        throw new Error('Address not found');
      }
      location = {
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        timestamp: 'timestamp' in resolved && typeof resolved.timestamp === 'number' ? resolved.timestamp : Date.now()
      };
    } catch (error) {
      state.update((s) => ({
        ...s,
        status: 'error',
        error: `Could not find "${query}". Try another address.`
      }));
      return;
    }

    try {
      await loadNearbyStops(location);
      state.update((s) => ({ ...s, userLocation: location, status: 'found' }));
    } catch (error) {
      state.update((s) => ({
        ...s,
        status: 'error'
      }));
    }
  }

  async function loadNearbyStops(location: GeoLocation) {
    try {
      const rawStops = await transitRepository.getNearbyStops(location);
      const stops = await stopEnricher.enrich(rawStops, { location, vehicles, apiKey: MBTA_API_KEY });
      state.update((s) => ({ ...s, nearbyStops: stops, error: undefined }));
    } catch (error) {
      state.update((s) => ({
        ...s,
        error: `Failed to load nearby stops: ${error instanceof Error ? error.message : 'unknown'}`
      }));
      throw error;
    }
  }

  async function handleRecentSearch(query: string) {
    searchQuery = query;
    showRecentSearches.set(false);
    await handleAddressSearch();
  }

  function handleStopClick(stopId: string) {
    onStopSelected(stopId);
  }

  function formatArrival(seconds: number): string {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} min`;
  }

  function formatConfidence(seconds: number): string {
    const minutes = Math.ceil(seconds / 60);
    return `±${minutes}m`;
  }

  function getAccessibilityBadges(stop: NearbyStop): string[] {
    const badges = [];
    if (stop.wheelchairAccessible) badges.push('♿');
    return badges;
  }

  function getModeIcon(mode: string): string {
    return mode === 'subway'
      ? '🚇'
      : mode === 'commuter-rail'
        ? '🚆'
        : mode === 'ferry'
          ? '⛴️'
          : '🚌';
  }

  function estimatedCarbonSavedKg(stop: NearbyStop): string {
    const estimate = Math.max(0.6, Number((stop.distanceMeters / 350).toFixed(1)));
    return estimate.toFixed(1);
  }
</script>

<div class="stop-finder-container">
  <div class="finder-header">
    <div>
      <p class="eyebrow">Neighborhood stop radar</p>
      <h2>Find the best nearby stop, not just the closest one.</h2>
      <p class="subtitle">
        Search an address, station, or landmark. We rank nearby stops with walking time and incoming service so first-time riders can decide faster.
      </p>
    </div>
    <div class="finder-highlights">
      <span>Nearby ranking</span>
      <span>Accessibility filters</span>
      <span>Live arrivals</span>
    </div>
  </div>

  <div class="search-section">
    <div class="search-hints">
      <span>Try “South Station”, “Kendall”, or your hotel address</span>
      <span>Use current location if you are already nearby</span>
    </div>

    <div class="search-box">
      <div class="input-wrapper">
        <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <input
          bind:this={searchInput}
          bind:value={searchQuery}
          on:keydown={(e) => e.key === 'Enter' && handleAddressSearch()}
          on:focus={() => recentSearches.length > 0 && showRecentSearches.set(true)}
          placeholder="Enter address or stop name..."
          class="search-input"
        />
        {#if searchQuery}
          <button
            on:click={() => {
              searchQuery = '';
              searchInput?.focus();
            }}
            class="clear-btn"
            aria-label="Clear search"
          >
            ✕
          </button>
        {/if}
        <button
          on:click={handleAddressSearch}
          class="search-submit"
          type="button"
          aria-label="Search by address or stop name"
        >
          Search
        </button>
        <button
          on:click={autoDetectLocation}
          disabled={$state.status === 'locating'}
          class="locate-btn"
          title="Use my current location"
          type="button"
        >
          {#if $state.status === 'locating'}
            <span class="spinner"></span>
          {:else}
            <span class="locate-label">Use my location</span>
          {/if}
        </button>
      </div>

      {#if $showRecentSearches}
        <div class="recent-list">
          {#each recentSearches.slice(0, 5) as search}
            <button class="recent-item" on:click={() => handleRecentSearch(search)}>
              <span class="history-icon">⏱</span>
              {search}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    {#if $state.error}
      <div class="error-message">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10"></circle>
          <text x="12" y="16" text-anchor="middle" fill="white" font-size="14" font-weight="bold">!</text>
        </svg>
        {$state.error}
      </div>
    {/if}

    {#if isRateLimited}
      <div class="settings-panel">
        <div class="settings-title">⚙ API settings</div>
        <button class="settings-action" on:click={() => (showRateLimitTroubleshooting = true)}>
          One-click troubleshoot
        </button>

        {#if showRateLimitTroubleshooting}
          <p class="settings-message">{RATE_LIMIT_TROUBLESHOOTING_TEXT}</p>
          <button class="settings-copy" on:click={copyTroubleshootingText}>
            Copy message
          </button>
          {#if copyStatusMessage}
            <p class="settings-copy-status">{copyStatusMessage}</p>
          {/if}
          <p class="settings-tip">Tip: set <strong>VITE_MBTA_API_KEY</strong> in your web env to increase MBTA API limits.</p>
        {/if}
      </div>
    {/if}
  </div>

  {#if $state.nearbyStops.length > 0}
    <div class="accessibility-filters">
      <label class="filter-checkbox">
        <input type="checkbox" bind:checked={$accessibilityFilter.wheelchairOnly} />
        <span>♿ Wheelchair</span>
      </label>
      <label class="filter-checkbox">
        <input type="checkbox" bind:checked={$accessibilityFilter.audioAnnouncementsOnly} />
        <span>🔊 Audio announcements</span>
      </label>
      <label class="filter-checkbox">
        <input type="checkbox" bind:checked={$accessibilityFilter.visualIndicatorsOnly} />
        <span>🪧 Visual indicators</span>
      </label>
    </div>
  {/if}

  <div class="nearby-stops">
    {#if $state.status === 'found' && filteredStops.length > 0}
      <div class="stops-header">
        <div>
          <h3>{filteredStops.length} nearby stops</h3>
          <p>Sorted for fast decision-making with walking time, live arrivals, and accessibility context.</p>
        </div>
        <span class="stops-summary">Tap any stop to center it on the map</span>
      </div>
      <div class="stops-list">
        {#each filteredStops as stop (stop.id)}
          <button
            on:click={() => handleStopClick(stop.id)}
            class="stop-card"
            type="button"
          >
            <div class="stop-topline">
              <div class="stop-name-row">
                <strong>{stop.name}</strong>
                {#each getAccessibilityBadges(stop) as badge}
                  <span class="accessibility-badge">{badge}</span>
                {/each}
              </div>
              <span class="stop-distance">{stop.walkingMinutes} min walk</span>
            </div>
            <div class="stop-meta">
              <span class="walking-time">📍 {stop.distanceMeters}m away</span>
              <span class="stop-action">Show on live map →</span>
            </div>
            {#if stop.nextArrivals.length > 0}
              <div class="arrivals">
                {#each stop.nextArrivals.slice(0, 2) as arrival}
                  <div class="arrival-badge">
                    <span class="arrival-mode">{getModeIcon(arrival.mode)}</span>
                    <span class="route-label">
                      {arrival.routeLabel || arrival.routeId}
                    </span>
                    <span class="arrival-time">
                      {formatArrival(arrival.arrivalSeconds)} {formatConfidence(arrival.confidenceSeconds)}
                    </span>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="arrival-empty">No live arrivals surfaced yet for this stop.</div>
            {/if}
            <div class="carbon-tag">🌱 Save about {estimatedCarbonSavedKg(stop)}kg CO₂ compared with a short car hop</div>
          </button>
        {/each}
      </div>
    {:else if $state.status === 'found' && $state.nearbyStops.length === 0}
      <div class="empty-state">
        <p>No stops found within 800m of this location. Try a different address or nearby landmark.</p>
      </div>
    {:else if $state.status === 'found' && filteredStops.length === 0}
      <div class="empty-state">
        <p>Your filters removed all nearby results. Try turning off one accessibility filter.</p>
      </div>
    {:else if $state.status === 'idle'}
      <div class="empty-state">
        <p>Use your location or search by address to find nearby stops with live service context.</p>
      </div>
    {:else if $state.status === 'searching' || $state.status === 'locating'}
      <div class="loading-state">
        <div class="pulse"></div>
        <p>{$state.status === 'locating' ? 'Finding your location...' : 'Searching for nearby stops...'}</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .stop-finder-container {
    display: grid;
    gap: 1rem;
    padding: 1rem;
    background:
      radial-gradient(circle at top right, rgba(125, 211, 252, 0.22), transparent 28%),
      linear-gradient(145deg, #08223f 0%, #0f3d91 52%, #0f766e 100%);
    border-radius: 1.35rem;
    color: white;
    font-family: 'Space Grotesk', 'Avenir Next', 'Segoe UI', Roboto, sans-serif;
    box-shadow: 0 20px 60px rgba(8, 34, 63, 0.28);
  }

  .finder-header {
    display: grid;
    gap: 0.9rem;
  }

  .eyebrow {
    margin: 0 0 0.3rem;
    font-size: 0.72rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    font-weight: 700;
    color: #bae6fd;
  }

  .finder-header h2 {
    margin: 0;
    font-size: clamp(1.45rem, 2.8vw, 2.15rem);
    line-height: 1.08;
    font-weight: 700;
  }

  .subtitle {
    margin: 0;
    font-size: 0.95rem;
    opacity: 0.92;
    line-height: 1.6;
    max-width: 52rem;
  }

  .finder-highlights,
  .search-hints {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
  }

  .finder-highlights span,
  .search-hints span,
  .stops-summary {
    display: inline-flex;
    align-items: center;
    width: fit-content;
    padding: 0.45rem 0.75rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.14);
    border: 1px solid rgba(255, 255, 255, 0.18);
    font-size: 0.8rem;
    backdrop-filter: blur(12px);
  }

  .search-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .search-box {
    position: relative;
  }

  .input-wrapper {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto auto auto;
    align-items: center;
    gap: 0.5rem;
    background: rgba(255, 255, 255, 0.96);
    border-radius: 1rem;
    padding: 0.55rem;
    box-shadow: 0 16px 34px rgba(7, 16, 31, 0.18);
  }

  .search-icon {
    color: #0f3d91;
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    border: none;
    outline: none;
    padding: 0.5rem;
    font-size: 1rem;
    background: transparent;
    color: #0f172a;
    min-width: 0;
  }

  .search-input::placeholder {
    color: #94a3b8;
  }

  .clear-btn {
    background: rgba(15, 23, 42, 0.06);
    border: none;
    border-radius: 999px;
    cursor: pointer;
    padding: 0.45rem;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #475569;
    transition: background 0.2s ease;
  }

  .clear-btn:hover {
    background: rgba(15, 23, 42, 0.12);
  }

  .search-submit,
  .locate-btn,
  .settings-action,
  .settings-copy {
    border: none;
    border-radius: 999px;
    padding: 0.7rem 0.95rem;
    font: inherit;
    font-size: 0.84rem;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
  }

  .search-submit {
    background: linear-gradient(135deg, #0f3d91 0%, #0e7490 100%);
    color: white;
    box-shadow: 0 10px 24px rgba(15, 61, 145, 0.22);
  }

  .locate-btn {
    background: rgba(15, 61, 145, 0.08);
    color: #0f3d91;
  }

  .search-submit:hover,
  .locate-btn:hover,
  .settings-action:hover,
  .settings-copy:hover,
  .stop-card:hover {
    transform: translateY(-1px);
  }

  .locate-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .locate-label {
    white-space: nowrap;
  }

  .spinner {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .recent-list {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border-radius: 1rem;
    margin-top: 0.5rem;
    box-shadow: 0 14px 34px rgba(7, 16, 31, 0.18);
    z-index: 10;
    overflow: hidden;
  }

  .recent-item {
    width: 100%;
    background: none;
    border: none;
    padding: 0.75rem 1rem;
    text-align: left;
    cursor: pointer;
    color: #333;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: background 0.2s;
  }

  .recent-item:hover {
    background: #f0f0f0;
  }

  .history-icon {
    opacity: 0.6;
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(248, 113, 113, 0.18);
    padding: 0.85rem 0.95rem;
    border-radius: 1rem;
    font-size: 0.9rem;
    border: 1px solid rgba(254, 202, 202, 0.24);
  }

  .settings-panel {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    background: rgba(255, 255, 255, 0.14);
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 1rem;
    padding: 0.85rem 0.9rem;
  }

  @media (min-width: 841px) {
    .settings-panel {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.65rem;
      align-items: start;
    }

    .settings-panel > * {
      min-width: 0;
    }

    .settings-title {
      grid-column: 1 / -1;
    }

    .settings-action,
    .settings-copy {
      width: 100%;
      justify-content: center;
    }

    .settings-message,
    .settings-tip,
    .settings-copy-status {
      grid-column: 1 / -1;
    }
  }

  .settings-title {
    font-size: 0.82rem;
    font-weight: 600;
    opacity: 0.95;
  }

  .settings-action {
    width: fit-content;
    background: rgba(255, 255, 255, 0.95);
    color: #4338ca;
    padding: 0.5rem 0.85rem;
  }

  .settings-copy {
    width: fit-content;
    border: 1px solid rgba(255, 255, 255, 0.35);
    background: rgba(255, 255, 255, 0.18);
    color: white;
    padding: 0.48rem 0.82rem;
  }

  .settings-copy-status {
    margin: 0;
    font-size: 0.76rem;
    opacity: 0.95;
  }

  .settings-message,
  .settings-tip {
    margin: 0;
    font-size: 0.8rem;
    line-height: 1.35;
  }

  .settings-message {
    color: #fef3c7;
    font-weight: 600;
  }

  .settings-tip {
    opacity: 0.95;
  }

  .accessibility-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.85rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.14);
  }

  .filter-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: 0.86rem;
    padding: 0.45rem 0.65rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
  }

  .filter-checkbox input {
    cursor: pointer;
  }

  .nearby-stops {
    flex: 1;
    overflow-y: auto;
    max-height: 60vh;
  }

  .stops-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 0.75rem;
    padding: 0.35rem 0 0.7rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  }

  .stops-header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
  }

  .stops-header p {
    margin: 0.25rem 0 0;
    font-size: 0.84rem;
    opacity: 0.9;
    line-height: 1.5;
  }

  .stops-list {
    display: grid;
    gap: 0.75rem;
    padding-top: 0.75rem;
  }

  .stop-card {
    display: grid;
    gap: 0.6rem;
    background: rgba(255, 255, 255, 0.96);
    color: #0f172a;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 1.1rem;
    padding: 0.9rem;
    cursor: pointer;
    text-align: left;
    transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  }

  .stop-card:hover {
    border-color: rgba(15, 61, 145, 0.24);
    box-shadow: 0 16px 30px rgba(7, 16, 31, 0.12);
  }

  .stop-topline {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 0.75rem;
  }

  .stop-name-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
  }

  .stop-distance {
    flex-shrink: 0;
    font-size: 0.8rem;
    font-weight: 700;
    color: #0f3d91;
    padding: 0.35rem 0.55rem;
    border-radius: 999px;
    background: rgba(219, 234, 254, 0.9);
  }

  .accessibility-badge {
    font-size: 1rem;
  }

  .stop-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.83rem;
    color: #64748b;
  }

  .walking-time {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .stop-action {
    color: #0f3d91;
    font-weight: 700;
  }

  .arrivals {
    display: grid;
    gap: 0.5rem;
  }

  .arrival-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    padding: 0.55rem 0.65rem;
    border-radius: 0.9rem;
    background: rgba(241, 245, 249, 0.9);
    border: 1px solid rgba(15, 23, 42, 0.06);
  }

  .arrival-mode {
    font-size: 1rem;
    line-height: 1;
  }

  .route-label {
    display: inline-flex;
    align-items: center;
    padding: 0.28rem 0.55rem;
    border-radius: 999px;
    background: linear-gradient(135deg, #0f3d91 0%, #0e7490 100%);
    color: white !important;
    font-weight: 700;
  }

  .arrival-time {
    color: #0f3d91;
    font-weight: 600;
    margin-left: auto;
  }

  .arrival-empty {
    font-size: 0.84rem;
    color: #64748b;
    padding: 0.2rem 0;
  }

  .carbon-tag {
    width: fit-content;
    font-size: 0.8rem;
    padding: 0.35rem 0.6rem;
    background: rgba(220, 252, 231, 0.9);
    border-radius: 999px;
    color: #166534;
    font-weight: 500;
  }

  .empty-state {
    padding: 2rem 1rem;
    text-align: center;
    opacity: 0.95;
    border-radius: 1rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px dashed rgba(255, 255, 255, 0.18);
  }

  .empty-state p {
    margin: 0;
    font-size: 0.9rem;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 2rem 1rem;
    border-radius: 1rem;
    background: rgba(255, 255, 255, 0.08);
  }

  .pulse {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    animation: pulse-animation 2s infinite;
  }

  @keyframes pulse-animation {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.5;
      transform: scale(1.1);
    }
  }

  .loading-state p {
    margin: 0;
    font-size: 0.9rem;
  }

  @media (max-width: 840px) {
    .stop-finder-container {
      gap: 0.75rem;
      padding: 0.95rem;
      border-radius: 1.2rem;
    }

    .input-wrapper {
      grid-template-columns: auto minmax(0, 1fr);
      gap: 0.45rem;
      padding: 0.52rem 0.6rem;
      border-radius: 0.82rem;
    }

    .search-input {
      min-height: 38px;
      font-size: 0.86rem;
    }

    .search-submit,
    .locate-btn,
    .settings-action,
    .settings-copy {
      min-height: 36px;
      font-size: 0.8rem;
      padding: 0.52rem 0.7rem;
    }

    .search-submit,
    .locate-btn {
      width: 100%;
      justify-content: center;
    }

    .finder-highlights,
    .search-hints,
    .accessibility-filters {
      gap: 0.38rem;
    }

    .stops-list {
      gap: 0.52rem;
    }

    .stop-card {
      padding: 0.75rem;
      border-radius: 0.9rem;
      gap: 0.48rem;
    }

    .stop-topline,
    .stop-meta,
    .stops-header {
      flex-direction: column;
      align-items: start;
    }
  }

  @media (max-width: 640px) {
    .stop-finder-container {
      padding: 0.76rem;
      border-radius: 0.98rem;
    }

    .finder-highlights,
    .search-hints,
    .accessibility-filters {
      gap: 0.32rem;
    }

    .input-wrapper {
      gap: 0.35rem;
      padding: 0.45rem 0.52rem;
      border-radius: 0.72rem;
    }

    .search-input {
      min-height: 34px;
      font-size: 0.82rem;
    }

    .search-submit,
    .locate-btn,
    .settings-action,
    .settings-copy,
    .stop-card {
      padding: 0.65rem;
      border-radius: 0.82rem;
    }

    .arrival-badge {
      flex-wrap: wrap;
    }

    .arrival-time {
      margin-left: 0;
    }
  }

  @media (max-width: 480px) {
    .stop-finder-container {
      padding: 0.62rem;
      gap: 0.6rem;
      border-radius: 0.9rem;
    }

    .input-wrapper {
      grid-template-columns: auto minmax(0, 1fr);
      padding: 0.4rem 0.46rem;
      border-radius: 0.68rem;
    }

    .search-icon {
      font-size: 0.8rem;
    }

    .search-input {
      font-size: 0.78rem;
    }

    .stops-list {
      gap: 0.45rem;
    }

    .stop-card {
      padding: 0.58rem;
      border-radius: 0.72rem;
    }

    .loading-state {
      padding: 0.95rem 0.68rem;
      border-radius: 0.72rem;
    }

    .loading-state p {
      font-size: 0.78rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .search-submit,
    .locate-btn,
    .settings-action,
    .settings-copy,
    .stop-card,
    .pulse,
    .spinner {
      animation: none !important;
      transition: none !important;
    }
  }
</style>
