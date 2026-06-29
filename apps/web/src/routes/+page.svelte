<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { browser } from '$app/environment';
  import { DEFAULT_TRACKER_CONFIG } from '$lib/tracker';
  import SearchBox from '$lib/SearchBox.svelte';
  import StopView from '$lib/StopView.svelte';
  import RouteView from '$lib/RouteView.svelte';
  import VehicleView from '$lib/VehicleView.svelte';
  import AlertCenter from '$lib/AlertCenter.svelte';
  import { apiFetch } from '$lib/api';
  import type {
    AddressResult,
    RouteResult,
    SearchResult,
    StopResult,
    VehicleResult
  } from '$lib/types';
  import type { TrackerWidgetConfig, TrackerAlert } from '$lib/tracker';

  export let data: {
    config: TrackerWidgetConfig;
    canonicalUrl: string;
    shareImageUrl: string;
  };

  let currentView: 'search' | 'stop' | 'route' | 'vehicle' | 'alerts' = 'search';
  let selectedStop: StopResult | null = null;
  let selectedRoute: RouteResult | null = null;
  let selectedVehicle: VehicleResult | null = null;
  let currentAlerts: TrackerAlert[] = [];
  let searchResults: SearchResult[] = [];
  let sessionId = '';
  let isSearching = false;
  let lastQuery = '';
  let searchError: string | null = null;
  let highContrastEnabled = false;
  let dyslexiaFontEnabled = false;
  let settingsMenuOpen = false;
  let settingsPanelEl: HTMLDivElement | null = null;
  let settingsButtonEl: HTMLButtonElement | null = null;
  let showPhase3Hub = false;
  let showPhase4Hub = false;
  let TrackerWidgetComponent: typeof import('$lib/tracker/TrackerWidget.svelte').default | null = null;
  let Phase3HubComponent: typeof import('$lib/Phase3Hub.svelte').default | null = null;
  let Phase4HubComponent: typeof import('$lib/Phase4Hub.svelte').default | null = null;
  let routeInfoMessage: string | null = null;
  let highlightedAddress: AddressResult | null = null;
  let homeMode: 'list' | 'map' = 'list';
  let mapFocusStop: StopResult | null = null;
  let mapFocusAddress: AddressResult | null = null;
  let mapModePanelEl: HTMLElement | null = null;
  let boardingInsightsLoading = false;
  let boardingInsightsError: string | null = null;
  let boardingInsightsAddressKey = '';
  let boardingInsights: Record<string, { routeNumbers: string[]; nextEtaMin: number | null }> = {};
  let mapStopsWithRanking: Array<{
    stop: StopResult;
    walkMinutes: number;
    etaMinutes: number | null;
    routeCount: number;
    rank: 'best' | 'good' | 'nearby';
  }> = [];
  let boardingLegendEl: HTMLDivElement | null = null;
  let isBoardingLegendCollapsed = false;

  const quickQueries = ['South Station now', 'Alewife', 'Red Line', '66', 'Harvard'];
  const searchPrinciples = ['Fastest boarding', 'Live arrivals', 'Map only when needed'];
  const ACCESSIBILITY_PREFS_KEY = 'mbta_accessibility_prefs_v1';

  $: searchResultBreakdown = searchResults.reduce(
    (acc, result) => {
      acc[result.type] = (acc[result.type] ?? 0) + 1;
      return acc;
    },
    { route: 0, stop: 0, address: 0, vehicle: 0, landmark: 0 } as Record<SearchResult['type'], number>
  );
  $: searchResultSummaryPills = [
    searchResultBreakdown.stop ? `${searchResultBreakdown.stop} stop${searchResultBreakdown.stop === 1 ? '' : 's'}` : '',
    searchResultBreakdown.route ? `${searchResultBreakdown.route} route${searchResultBreakdown.route === 1 ? '' : 's'}` : '',
    searchResultBreakdown.address ? `${searchResultBreakdown.address} address${searchResultBreakdown.address === 1 ? '' : 'es'}` : '',
    searchResultBreakdown.vehicle ? `${searchResultBreakdown.vehicle} vehicle${searchResultBreakdown.vehicle === 1 ? '' : 's'}` : '',
    searchResultBreakdown.landmark ? `${searchResultBreakdown.landmark} landmark${searchResultBreakdown.landmark === 1 ? '' : 's'}` : ''
  ].filter(Boolean);

  function saveAccessibilityPreferences() {
    if (!browser) {
      return;
    }

    try {
      localStorage.setItem(
        ACCESSIBILITY_PREFS_KEY,
        JSON.stringify({
          highContrastEnabled,
          dyslexiaFontEnabled
        })
      );
    } catch {
      // Ignore storage write failures.
    }
  }

  function toggleHighContrast() {
    highContrastEnabled = !highContrastEnabled;
    saveAccessibilityPreferences();
    void track('accessibility_preference_updated', { key: 'high_contrast', enabled: highContrastEnabled });
  }

  function toggleDyslexiaFont() {
    dyslexiaFontEnabled = !dyslexiaFontEnabled;
    saveAccessibilityPreferences();
    void track('accessibility_preference_updated', { key: 'dyslexia_font', enabled: dyslexiaFontEnabled });
  }

  function closeSettingsMenu() {
    settingsMenuOpen = false;
  }

  function looksLikeAddressQuery(value: string): boolean {
    const query = value.trim().toLowerCase();
    if (!query) {
      return false;
    }

    return /^\d+\s+/.test(query)
      || /\b(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|pkwy|parkway)\b/.test(query)
      || /\b(ma|massachusetts|boston|cambridge|somerville|malden|medford|quincy|brookline)\b/.test(query);
  }

  function getResultKindLabel(result: SearchResult): string {
    switch (result.type) {
      case 'route':
        return `Route ${result.route_number}`;
      case 'stop':
        return 'Stop';
      case 'address':
        return 'Address';
      case 'vehicle':
        return 'Vehicle';
      case 'landmark':
        return 'Landmark';
    }
  }

  function getResultTitle(result: SearchResult): string {
    switch (result.type) {
      case 'route':
        return `Route ${result.route_number}`;
      case 'stop':
        return result.stop_name;
      case 'address':
        return result.address;
      case 'vehicle':
        return `Vehicle ${result.vehicle_id}`;
      case 'landmark':
        return result.landmark_name;
    }
  }

  function getResultActionLabel(result: SearchResult): string {
    switch (result.type) {
      case 'route':
        return 'Open route view';
      case 'stop':
        return 'Open arrivals';
      case 'address':
        return 'Find best boarding stop';
      case 'vehicle':
        return 'Track vehicle';
      case 'landmark':
        return 'Show nearby stops';
    }
  }

  function getResultDetail(result: SearchResult): string {
    switch (result.type) {
      case 'stop':
        return result.stop_code ? `Stop code ${result.stop_code}` : 'Live arrivals and stop detail';
      case 'route':
        return result.description || result.direction_names.join(' • ') || 'Route detail and live arrivals';
      case 'address':
        return result.nearby_stops.length > 0
          ? `Nearest stop: ${result.nearby_stops[0].stop_name} (${result.distance_km.toFixed(1)} km)`
          : 'Address found. Tap to view the closest transit option.';
      case 'vehicle':
        return `Route ${result.route_number} • ${result.headsign}`;
      case 'landmark':
        return result.nearby_stops.length > 0
          ? `${result.nearby_stops.length} nearby stops, including ${result.nearby_stops[0].stop_name}`
          : 'Landmark found. Nearby stops were not detected yet.';
    }
  }

  function getOrCreateSessionId(): string {
    if (!browser) {
      return 'ssr';
    }

    const existing = localStorage.getItem('mbta_session_id');
    if (existing) {
      return existing;
    }

    const generated = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('mbta_session_id', generated);
    return generated;
  }

  async function track(event: string, meta: Record<string, unknown> = {}) {
    try {
      await apiFetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId || getOrCreateSessionId(),
          event,
          page: 'home',
          meta
        })
      });
    } catch {
      // Fail-open telemetry for user experience.
    }
  }

  onMount(() => {
    sessionId = getOrCreateSessionId();
    void track('home_view_loaded', { route: 'search' });
    void import('$lib/tracker/TrackerWidget.svelte').then((mod) => {
      TrackerWidgetComponent = mod.default;
    });
  });

  onMount(() => {
    if (!browser) {
      return;
    }

    try {
      const stored = localStorage.getItem(ACCESSIBILITY_PREFS_KEY);
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as {
        highContrastEnabled?: boolean;
        dyslexiaFontEnabled?: boolean;
      };

      highContrastEnabled = Boolean(parsed?.highContrastEnabled);
      dyslexiaFontEnabled = Boolean(parsed?.dyslexiaFontEnabled);
    } catch {
      // Ignore malformed preference payloads.
    }
  });

  onMount(() => {
    if (!browser) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!settingsMenuOpen) {
        return;
      }

      const target = event.target as Node | null;
      if (target && (settingsPanelEl?.contains(target) || settingsButtonEl?.contains(target))) {
        return;
      }

      settingsMenuOpen = false;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        settingsMenuOpen = false;
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  });

  $: if (showPhase3Hub && !Phase3HubComponent) {
    void import('$lib/Phase3Hub.svelte').then((mod) => {
      Phase3HubComponent = mod.default;
    });
  }

  $: if (showPhase4Hub && !Phase4HubComponent) {
    void import('$lib/Phase4Hub.svelte').then((mod) => {
      Phase4HubComponent = mod.default;
    });
  }

  function updateBoardingLegendCollapse() {
    if (!browser || !boardingLegendEl) {
      isBoardingLegendCollapsed = false;
      return;
    }

    if (!window.matchMedia('(max-width: 768px)').matches) {
      isBoardingLegendCollapsed = false;
      return;
    }

    const rect = boardingLegendEl.getBoundingClientRect();
    isBoardingLegendCollapsed = window.scrollY > 24 && rect.top <= 4;
  }

  onMount(() => {
    if (!browser) {
      return;
    }

    const handleWindowChange = () => updateBoardingLegendCollapse();

    window.addEventListener('scroll', handleWindowChange, { passive: true });
    window.addEventListener('resize', handleWindowChange);
    handleWindowChange();

    return () => {
      window.removeEventListener('scroll', handleWindowChange);
      window.removeEventListener('resize', handleWindowChange);
    };
  });

  async function handleSearch(query: string) {
    const startedAt = Date.now();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return;
    }

    isSearching = true;
    searchError = null;
    lastQuery = trimmedQuery;
    currentView = 'search';
    selectedStop = null;
    selectedRoute = null;
    selectedVehicle = null;
    highlightedAddress = null;
    routeInfoMessage = null;

    try {
      const response = await apiFetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ q: trimmedQuery })
      });

      if (!response.ok) {
        throw new Error(`Search failed with status ${response.status}`);
      }

      const data = await response.json();
      searchResults = data.results || [];
      routeInfoMessage = typeof data.warning === 'string' && data.warning.trim() ? data.warning : null;

      await track('search_submitted', {
        query_length: trimmedQuery.length,
        result_count: searchResults.length,
        latency_ms: Date.now() - startedAt
      });

      if (searchResults.length === 0) {
        await track('search_no_results', { query: trimmedQuery });
      }
    } catch (error) {
      console.error('Search error:', error);
      searchResults = [];
      searchError = error instanceof Error ? error.message : 'Unknown search error';
      await track('search_error', {
        query_length: trimmedQuery.length,
        latency_ms: Date.now() - startedAt,
        message: error instanceof Error ? error.message : 'unknown'
      });
    } finally {
      isSearching = false;
    }
  }

  function goBack() {
    currentView = 'search';
    selectedStop = null;
    selectedRoute = null;
    selectedVehicle = null;
    searchResults = [];
    routeInfoMessage = null;
    void track('return_to_search');
  }

  function switchHomeMode(mode: 'list' | 'map') {
    if (homeMode === mode) {
      return;
    }

    homeMode = mode;
    void track('home_mode_changed', { mode });
  }

  function handleMapTabClick() {
    currentView = 'search';
    switchHomeMode(homeMode === 'map' ? 'list' : 'map');
  }

  function focusStopOnMap(stop: StopResult, source: 'search_result' | 'boarding_panel') {
    mapFocusStop = stop;
    mapFocusAddress = null;
    homeMode = 'map';
    
    if (source === 'boarding_panel' && mapStopsWithRanking.length > 0) {
      const ranked = mapStopsWithRanking.find(rs => rs.stop.stop_id === stop.stop_id);
      if (ranked) {
        const badgeText = ranked.rank === 'best' ? '⭐ Best option' : ranked.rank === 'good' ? '✓ Good option' : 'Nearby';
        const contextText = ranked.etaMinutes ? `~${ranked.etaMinutes} min` : `~${ranked.walkMinutes} min walk`;
        routeInfoMessage = `${badgeText}: ${stop.stop_name} (${contextText})`;
      }
    } else {
      routeInfoMessage = `${stop.stop_name} centered on map.`;
    }
    
    void track('map_focus_stop', {
      stop_id: stop.stop_id,
      source
    });
  }

  function focusAddressOnMap(address: AddressResult) {
    mapFocusAddress = address;
    mapFocusStop = address.nearby_stops[0] ?? null;
    homeMode = 'map';
    void track('map_focus_address', {
      address: address.address,
      nearby_stop_count: address.nearby_stops.length
    });
  }

  function focusLandmarkOnMap(landmark: { landmark_name: string; nearby_stops: StopResult[] }) {
    mapFocusAddress = null;
    mapFocusStop = landmark.nearby_stops[0] ?? null;
    homeMode = 'map';
    routeInfoMessage = landmark.nearby_stops.length > 0
      ? `${landmark.landmark_name} centered on map.`
      : `${landmark.landmark_name}: no nearby stops yet.`;
    void track('map_focus_landmark', {
      landmark_name: landmark.landmark_name,
      nearby_stop_count: landmark.nearby_stops.length
    });
  }

  function getAddressMapConfidence(address: AddressResult): number {
    const base = Number.isFinite(address.confidence) ? address.confidence : 0.5;
    const stopBonus = Math.min(0.2, address.nearby_stops.length * 0.03);
    const distancePenalty = Math.min(0.25, Math.max(0, address.distance_km - 0.2) * 0.15);
    return Math.max(0.15, Math.min(1, base + stopBonus - distancePenalty));
  }

  function getAddressPrecisionTone(address: AddressResult): { tier: 'high' | 'medium' | 'low'; label: string } {
    const confidence = getAddressMapConfidence(address);
    if (confidence >= 0.75) {
      return { tier: 'high', label: 'Precise location' };
    }
    if (confidence >= 0.5) {
      return { tier: 'medium', label: 'Likely area' };
    }
    return { tier: 'low', label: 'Approximate area' };
  }

  function distanceKm(fromLat: number, fromLon: number, toLat: number, toLon: number): number {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;

    const dLat = toRad(toLat - fromLat);
    const dLon = toRad(toLon - fromLon);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusKm * c;
  }

  function estimateWalkMinutes(km: number): number {
    const walkingSpeedKmh = 4.8;
    return Math.max(1, Math.round((km / walkingSpeedKmh) * 60));
  }

  function openStopFromAddress(stop: StopResult, address: AddressResult, index: number) {
    selectedStop = stop;
    currentView = 'stop';
    void track('address_stop_selected', {
      stop_id: stop.stop_id,
      address: address.address,
      ranking_index: index
    });
  }

  function openStopFromAddressOnMap(stop: StopResult, address: AddressResult, index: number) {
    focusStopOnMap(stop, 'boarding_panel');
    routeInfoMessage = `Focused map near ${address.address}. Stop #${index + 1}: ${stop.stop_name}.`;
    // Defer scroll until map panel has rendered after mode switch
    void tick().then(() => {
      if (mapModePanelEl && browser) {
        mapModePanelEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  function getAddressKey(address: AddressResult): string {
    return `${address.address}:${address.latitude.toFixed(5)}:${address.longitude.toFixed(5)}`;
  }

  function getFastestStopId(): string | null {
    let fastestStopId: string | null = null;
    let bestEta = Number.POSITIVE_INFINITY;

    for (const [stopId, insight] of Object.entries(boardingInsights)) {
      if (insight.nextEtaMin !== null && insight.nextEtaMin < bestEta) {
        bestEta = insight.nextEtaMin;
        fastestStopId = stopId;
      }
    }

    return fastestStopId;
  }

  function getLeastWalkStopId(address: AddressResult): string | null {
    if (!address.nearby_stops || address.nearby_stops.length === 0) {
      return null;
    }

    let closestStopId: string | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const stop of address.nearby_stops) {
      const km = distanceKm(address.latitude, address.longitude, stop.latitude, stop.longitude);
      if (km < bestDistance) {
        bestDistance = km;
        closestStopId = stop.stop_id;
      }
    }

    return closestStopId;
  }

  function computeRankedStops() {
    const address = highlightedAddress;

    if (!address?.nearby_stops || address.nearby_stops.length === 0) {
      mapStopsWithRanking = [];
      return;
    }

    const fastestId = getFastestStopId();
    const closestId = getLeastWalkStopId(address);

    mapStopsWithRanking = address.nearby_stops.map((stop) => {
      const walkKm = distanceKm(address.latitude, address.longitude, stop.latitude, stop.longitude);
      const walkMinutes = estimateWalkMinutes(walkKm);
      const insight = boardingInsights[stop.stop_id];
      const etaMinutes = insight?.nextEtaMin ?? null;
      const routeCount = insight?.routeNumbers?.length ?? 0;

      let rank: 'best' | 'good' | 'nearby' = 'nearby';
      if (stop.stop_id === closestId && walkMinutes <= 10) {
        rank = 'best';
      } else if (stop.stop_id === fastestId && etaMinutes !== null && etaMinutes <= 15) {
        rank = 'best';
      } else if (walkMinutes <= 15 || (etaMinutes !== null && etaMinutes <= 10)) {
        rank = 'good';
      }

      return { stop, walkMinutes, etaMinutes, routeCount, rank };
    });
  }

  async function loadBoardingInsights(address: AddressResult) {
    const addressKey = getAddressKey(address);

    if (boardingInsightsAddressKey === addressKey) {
      return;
    }

    boardingInsightsAddressKey = addressKey;
    boardingInsightsLoading = true;
    boardingInsightsError = null;
    boardingInsights = {};

    try {
      const stops = address.nearby_stops.slice(0, 6);
      const insightPairs = await Promise.all(
        stops.map(async (stop) => {
          try {
            const response = await apiFetch(`/api/stop/${encodeURIComponent(stop.stop_id)}/arrivals`);
            if (!response.ok) {
              return [stop.stop_id, { routeNumbers: [], nextEtaMin: null }] as const;
            }

            const payload = await response.json();
            const arrivals = [...(payload.inbound || []), ...(payload.outbound || [])]
              .filter((arrival: any) => Number.isFinite(arrival?.eta_seconds) && arrival.eta_seconds >= 0)
              .sort((a: any, b: any) => a.eta_seconds - b.eta_seconds);

            const routeNumbers = Array.from(
              new Set(
                arrivals
                  .map((arrival: any) => String(arrival.route_number || '').trim())
                  .filter((value: string) => value.length > 0)
              )
            ).slice(0, 4);

            const nextEtaMin = arrivals.length > 0
              ? Math.max(1, Math.round(arrivals[0].eta_seconds / 60))
              : null;

            return [stop.stop_id, { routeNumbers, nextEtaMin }] as const;
          } catch {
            return [stop.stop_id, { routeNumbers: [], nextEtaMin: null }] as const;
          }
        })
      );

      boardingInsights = Object.fromEntries(insightPairs);
      computeRankedStops();
      boardingInsightsLoading = false;
    } catch (error) {
      console.error('Failed to load boarding insights:', error);
      boardingInsightsError = 'Failed to load live arrival data';
      boardingInsightsLoading = false;
    }
  }

  $: if (highlightedAddress && highlightedAddress.nearby_stops.length > 0) {
    void loadBoardingInsights(highlightedAddress);
  }

  $: if (highlightedAddress) {
    void tick().then(() => {
      updateBoardingLegendCollapse();
    });
  }

  $: if (!highlightedAddress) {
    isBoardingLegendCollapsed = false;
    boardingInsights = {};
    boardingInsightsLoading = false;
    boardingInsightsError = null;
    boardingInsightsAddressKey = '';
  }

  $: mapCenter = mapFocusAddress
    ? [mapFocusAddress.longitude, mapFocusAddress.latitude] as [number, number]
    : mapFocusStop
      ? [mapFocusStop.longitude, mapFocusStop.latitude] as [number, number]
      : data.config.center;

  $: mapZoom = mapFocusAddress ? 14.25 : mapFocusStop ? 15 : data.config.zoom;

  $: mapSubtitle = mapFocusAddress
    ? `${mapFocusAddress.nearby_stops.length} nearby stops around ${mapFocusAddress.address}`
    : mapFocusStop
      ? `Live context around ${mapFocusStop.stop_name}`
      : 'Live network view for routes, vehicles, and alerts';

  $: homeMapConfig = {
    ...DEFAULT_TRACKER_CONFIG,
    ...data.config,
    title: 'MBTA Map Mode',
    subtitle: mapSubtitle,
    center: mapCenter,
    zoom: mapZoom,
    focusAddress: mapFocusAddress
      ? {
          label: mapFocusAddress.address,
          lat: mapFocusAddress.latitude,
          lon: mapFocusAddress.longitude,
          confidence: getAddressMapConfidence(mapFocusAddress)
        }
      : null,
    showSearch: false,
    showList: true,
    showAlerts: true,
    embedded: true
  } satisfies TrackerWidgetConfig;

  $: mapViewKey = `${mapCenter[0].toFixed(4)}:${mapCenter[1].toFixed(4)}:${mapZoom.toFixed(2)}:${mapSubtitle}`;
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Fraunces:opsz,wght@9..144,500;9..144,700&display=swap"
    rel="stylesheet"
  />
  <title>MBTA Tracker - Search First Transit</title>
  <meta
    name="description"
    content="Search routes, stops, addresses, and vehicles in one calm MBTA experience with live arrivals and map context."
  />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta property="og:title" content="MBTA Tracker" />
  <meta
    property="og:description"
    content="Find routes, stops, and live arrivals with a cleaner, faster MBTA search experience."
  />
  <meta name="theme-color" content="#f7f9fd" />
  <link rel="canonical" href={data.canonicalUrl} />
</svelte:head>

  <div
    class="page-container"
    class:high-contrast={highContrastEnabled}
    class:dyslexia-font={dyslexiaFontEnabled}
  >
    <div class="ambient-layers" aria-hidden="true">
      <span class="ambient-orb orb-one"></span>
      <span class="ambient-orb orb-two"></span>
      <span class="ambient-orb orb-three"></span>
    </div>
    <!-- Minimalist Header: Search + 3 Main Tabs + Menu -->
    <header class="app-header">
      <div class="header-layout">
        <h1 class="app-logo">MBTA</h1>
        <nav class="main-nav" aria-label="Primary navigation">
          <button
            class="nav-tab {currentView === 'search' ? 'active' : ''}"
            on:click={() => { currentView = 'search'; }}
            aria-selected={currentView === 'search'}
            role="tab"
          >
            Search
          </button>
          <button
            class="nav-tab {homeMode === 'map' ? 'active' : ''}"
            on:click={handleMapTabClick}
            aria-selected={homeMode === 'map' && currentView === 'search'}
            role="tab"
          >
            Map
          </button>
          <button
            class="nav-tab {currentView === 'alerts' ? 'active' : ''}"
            on:click={() => { currentView = 'alerts'; }}
            aria-selected={currentView === 'alerts'}
            role="tab"
          >
            Alerts
            {#if currentAlerts.length > 0}
              <span class="alert-badge">{currentAlerts.length}</span>
            {/if}
          </button>
        </nav>
        <div class="header-actions">
          <button
            class="settings-button {settingsMenuOpen ? 'active' : ''}"
            bind:this={settingsButtonEl}
            on:click={() => settingsMenuOpen = !settingsMenuOpen}
            aria-label="Settings and accessibility"
            aria-expanded={settingsMenuOpen}
            aria-haspopup="menu"
          >
            <svg
              class="settings-icon"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              aria-hidden="true"
            >
              <path
                d="M12 8.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Zm8.25 3.75a6.12 6.12 0 0 0-.12-1.2l1.68-1.31-1.6-2.77-2 .78a6.7 6.7 0 0 0-2.08-1.2l-.31-2.13H9.13l-.31 2.13a6.7 6.7 0 0 0-2.08 1.2l-2-.78-1.6 2.77 1.68 1.31a6.12 6.12 0 0 0 0 2.4L3.14 15.2l1.6 2.77 2-.78c.6.5 1.29.92 2.08 1.2l.31 2.13h5.74l.31-2.13c.79-.28 1.48-.7 2.08-1.2l2 .78 1.6-2.77-1.68-1.31c.08-.39.12-.79.12-1.2Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- Settings Menu (Hidden by Default) -->
      {#if settingsMenuOpen}
        <div class="settings-panel" bind:this={settingsPanelEl} role="menu" aria-label="Settings and accessibility options">
          <div class="settings-group">
            <h3>Accessibility</h3>
            <button
              class="setting-item {highContrastEnabled ? 'active' : ''}"
              on:click={() => {
                toggleHighContrast();
                closeSettingsMenu();
              }}
              aria-pressed={highContrastEnabled}
            >
              {highContrastEnabled ? '✓' : '○'} High Contrast
            </button>
            <button
              class="setting-item {dyslexiaFontEnabled ? 'active' : ''}"
              on:click={() => {
                toggleDyslexiaFont();
                closeSettingsMenu();
              }}
              aria-pressed={dyslexiaFontEnabled}
            >
              {dyslexiaFontEnabled ? '✓' : '○'} Dyslexia Font
            </button>
          </div>
          <div class="settings-group">
            <h3>Features</h3>
            <button
              class="setting-item {showPhase3Hub ? 'active' : ''}"
              on:click={() => showPhase3Hub = !showPhase3Hub}
              aria-pressed={showPhase3Hub}
            >
              {showPhase3Hub ? '✓' : '○'} Commute Insights
            </button>
            <button
              class="setting-item {showPhase4Hub ? 'active' : ''}"
              on:click={() => showPhase4Hub = !showPhase4Hub}
              aria-pressed={showPhase4Hub}
            >
              {showPhase4Hub ? '✓' : '○'} Trip Planning
            </button>
          </div>
          <div class="settings-footer">
            <button
              class="close-settings"
              on:click={closeSettingsMenu}
              aria-label="Close settings"
            >
              Done
            </button>
          </div>
        </div>
      {/if}
    </header>

    <!-- Main Content -->
    <div class="layout-container">
      <main class="main-content">
    {#if currentView === 'search'}
      <!-- Search View -->
      <div class="search-view">
        <div class="search-container">
          <section class="search-hero" aria-labelledby="search-hero-title">
            <div class="search-hero-copy">
              <p class="search-hero-kicker">Search-first transit</p>
              <h2 id="search-hero-title">Find the best MBTA option in one query.</h2>
              <div class="search-hero-pills" aria-label="How the experience works">
                {#each searchPrinciples as principle, index}
                  <span class="hero-pill" style={`--stagger:${index};`}>{principle}</span>
                {/each}
              </div>
            </div>
          </section>

          <SearchBox
            onSearch={handleSearch}
            placeholder="Search stop, route, address, or vehicle"
            autoFocus={true}
          />
        </div>

        {#if isSearching}
          <div class="search-status" role="status" aria-live="polite">
            Searching for "{lastQuery}"...
          </div>
        {/if}

        {#if searchError}
          <div class="search-error" role="alert">
            Search failed: {searchError}
          </div>
        {/if}

        {#if routeInfoMessage}
          <div class="search-info" role="status" aria-live="polite">
            {routeInfoMessage}
          </div>
        {/if}

        {#if !lastQuery && !isSearching}
          <section class="starter-inline" aria-label="Quick start actions">
            {#each quickQueries as query, index}
              <button class="starter-inline-item" style={`--stagger:${index};`} on:click={() => handleSearch(query)}>
                {query}
              </button>
            {/each}
          </section>

          <section class="search-guidance" aria-label="Suggested search patterns">
            <p>Search a route or stop if you know it. Search an address if you want the nearest boarding option.</p>
          </section>
        {/if}

        {#if showPhase3Hub}
          {#if Phase3HubComponent}
            <section class="feature-panel feature-panel-commute" aria-label="Commute Insights">
              <svelte:component this={Phase3HubComponent} sessionId={sessionId} onTrack={track} />
            </section>
          {/if}
        {/if}

        {#if showPhase4Hub}
          {#if Phase4HubComponent}
            <section class="feature-panel feature-panel-trip" aria-label="Trip Planning">
              <svelte:component this={Phase4HubComponent} sessionId={sessionId} onTrack={track} />
            </section>
          {/if}
        {/if}

        {#if searchResults.length > 0}
          <div class="results-section">
            <div class="results-head">
              <div>
                <h2 class="results-title">Search Results</h2>
                {#if searchResultSummaryPills.length > 0}
                  <div class="results-summary-pills" aria-label="Search result summary">
                    {#each searchResultSummaryPills as pill}
                      <span class="results-summary-pill">{pill}</span>
                    {/each}
                  </div>
                {/if}
              </div>
              <span class="results-count">{searchResults.length} match{searchResults.length === 1 ? '' : 'es'}</span>
            </div>
            <div class="results-grid">
              {#each searchResults as result, index}
                <button
                  class="result-card"
                  style={`--stagger:${index};`}
                  aria-label={`${getResultActionLabel(result)} for ${getResultTitle(result)}`}
                  on:click={() => {
                    if (result.type === 'stop') {
                      if (homeMode === 'map') {
                        highlightedAddress = null;
                        focusStopOnMap(result, 'search_result');
                      } else {
                        highlightedAddress = null;
                        selectedStop = result;
                        currentView = 'stop';
                      }
                    } else if (result.type === 'route') {
                      highlightedAddress = null;
                      selectedRoute = result;
                      currentView = 'route';
                      void track('route_card_clicked', {
                        route_id: result.route_id,
                        route_number: result.route_number
                      });
                    } else if (result.type === 'vehicle') {
                      highlightedAddress = null;
                      selectedVehicle = result;
                      currentView = 'vehicle';
                      void track('vehicle_card_clicked', {
                        vehicle_id: result.vehicle_id,
                        route_id: result.route_id
                      });
                    } else if (result.type === 'address') {
                      focusAddressOnMap(result);
                      if (result.nearby_stops.length > 0) {
                        highlightedAddress = result;
                        routeInfoMessage = `${result.address}: best stop nearby.`;
                      } else {
                        highlightedAddress = null;
                        routeInfoMessage = `${result.address}: no nearby stops yet.`;
                      }
                    } else if (result.type === 'landmark') {
                      focusLandmarkOnMap(result);
                    }
                  }}
                >
                  <div class="result-topline">
                    <div class="result-type">{getResultKindLabel(result)}</div>
                    <div class="result-action">{getResultActionLabel(result)}</div>
                  </div>
                  <div class="result-content">
                    <div class="result-name">{getResultTitle(result)}</div>
                    <div class="result-detail">{getResultDetail(result)}</div>
                  </div>
                  <div class="result-arrow">→</div>
                </button>
              {/each}
            </div>
          </div>

          {#if homeMode === 'map'}
            <section class="map-mode-panel" aria-label="Contextual map mode" bind:this={mapModePanelEl}>
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
                {#key mapViewKey}
                  {#if TrackerWidgetComponent}
                    <svelte:component this={TrackerWidgetComponent} config={homeMapConfig} />
                  {:else}
                    <div class="map-mode-loading" role="status" aria-live="polite">Loading map tools…</div>
                  {/if}
                {/key}
              </div>
            </section>
          {/if}

          {#if highlightedAddress && highlightedAddress.nearby_stops.length > 0}
            <section class="boarding-panel" aria-label="Best nearby boarding stops">
              <div class="boarding-panel-head">
                <p class="boarding-kicker">Most intuitive pickup options</p>
                <h3>Best nearby stops for {highlightedAddress!.address}</h3>
                <p>Pick a stop below to open live arrivals immediately.</p>
                <div
                  class="boarding-legend"
                  class:is-collapsed={isBoardingLegendCollapsed}
                  bind:this={boardingLegendEl}
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
                {#each highlightedAddress!.nearby_stops as stop, index}
                  {@const walkKm = distanceKm(highlightedAddress!.latitude, highlightedAddress!.longitude, stop.latitude, stop.longitude)}
                  {@const insight = boardingInsights[stop.stop_id]}
                  {@const fastestStopId = getFastestStopId()}
                  {@const leastWalkStopId = getLeastWalkStopId(highlightedAddress!)}
                  {@const rankedStop = mapStopsWithRanking.find(rs => rs.stop.stop_id === stop.stop_id)}
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
                      <button on:click={() => openStopFromAddress(stop, highlightedAddress!, index)}>
                        View live arrivals
                      </button>
                      <button class="ghost" on:click={() => openStopFromAddressOnMap(stop, highlightedAddress!, index)}>
                        Focus on map
                      </button>
                    </div>
                  </article>
                {/each}
              </div>
            </section>
          {/if}
        {:else if !isSearching && !searchError && lastQuery}
          <div class="empty-results">
            <h2>No direct matches for "{lastQuery}"</h2>
            {#if looksLikeAddressQuery(lastQuery)}
              <p>
                Try a slightly shorter address (for example: <strong>878 Salem St, Malden</strong>) or pick an address from autocomplete so we can route you to the nearest bus stop.
              </p>
            {:else}
              <p>Try a stop name like South Station, a route like Red Line, or a route number like 66.</p>
            {/if}
          </div>
        {/if}
      </div>
    {:else if currentView === 'stop' && selectedStop}
      <!-- Stop View -->
      <div class="view-header">
        <button class="back-button" on:click={goBack} aria-label="Back to search">
          ← Back
        </button>
      </div>
      <StopView stopId={selectedStop.stop_id} stopName={selectedStop.stop_name} />
    {:else if currentView === 'route' && selectedRoute}
      <!-- Route View -->
      <div class="view-header">
        <button class="back-button" on:click={goBack} aria-label="Back to search">
          ← Back
        </button>
      </div>
      <RouteView routeId={selectedRoute.route_id} routeName={selectedRoute.route_name} />
    {:else if currentView === 'vehicle' && selectedVehicle}
      <!-- Vehicle View -->
      <div class="view-header">
        <button class="back-button" on:click={goBack} aria-label="Back to search">
          ← Back
        </button>
      </div>
      <VehicleView vehicleId={selectedVehicle.vehicle_id} />
    {:else if currentView === 'alerts'}
      <!-- Alerts View -->
      <div class="view-header">
        <h1>System Alerts</h1>
        <button class="back-button" on:click={() => currentView = 'search'} aria-label="Back to search">
          ← Back
        </button>
      </div>
      <div class="alerts-view-container">
        <AlertCenter alerts={currentAlerts} />
      </div>
    {/if}
  </main>
  </div>

  <!-- Footer -->
  <footer class="app-footer">
    <div class="footer-content">
      <p>Data from MBTA API • Updated in real-time</p>
      <p class="footer-ownership">
        © 2026 <a href="https://ai-aarti.com" target="_blank" rel="noopener">Aarti S Ravikumar, Pioneer Charter School of Science II</a>
      </p>
      <p class="footer-credits" aria-label="Source credits">
        Credits: <a href="https://www.mbta.com/" target="_blank" rel="noopener">MBTA</a>,
        <a href="https://maplibre.org/" target="_blank" rel="noopener">MapLibre</a>,
        <a href="https://www.openstreetmap.org/" target="_blank" rel="noopener">OpenStreetMap</a>,
        <a href="https://nominatim.org/" target="_blank" rel="noopener">Nominatim</a>,
        <a href="https://carto.com/" target="_blank" rel="noopener">CARTO</a>
      </p>
      <div class="footer-links">
        <a href="https://mbta.com" target="_blank" rel="noopener">MBTA</a>
        <a href="/about">About</a>
        <a href="/privacy">Privacy</a>
      </div>
    </div>
  </footer>
</div>

<style lang="postcss">
  :global(:root) {
    --bg-base: #f3f6fb;
    --bg-elevated: #ffffff;
    --bg-muted: #edf2f8;
    --text-strong: #0f172a;
    --text-body: #334155;
    --text-soft: #64748b;
    --border-soft: #d8e1ec;
    --border-strong: #b9c9dd;
    --brand: #1d4ed8;
    --brand-strong: #1e40af;
    --brand-mint: #0f766e;
    --focus: rgba(37, 99, 235, 0.25);
    --ease-premium: cubic-bezier(0.2, 0.85, 0.2, 1);
  }

  :global(body) {
    @apply m-0 p-0;
    overflow-x: clip;
    background:
      radial-gradient(circle at 8% 6%, rgba(29, 78, 216, 0.14), transparent 28%),
      radial-gradient(circle at 92% 10%, rgba(15, 118, 110, 0.12), transparent 30%),
      radial-gradient(circle at 50% 120%, rgba(148, 163, 184, 0.22), transparent 36%),
      linear-gradient(180deg, #f8fbff 0%, #edf3f9 48%, #e9eef5 100%);
    color: var(--text-body);
    font-family: 'Manrope', 'Segoe UI', sans-serif;
  }

  .page-container {
    @apply flex flex-col min-h-screen;
    background: transparent;
    position: relative;
    overflow: clip;
  }

  .page-container.high-contrast {
    --bg-base: #ffffff;
    --bg-elevated: #ffffff;
    --bg-muted: #f8fafc;
    --text-strong: #020617;
    --text-body: #0f172a;
    --text-soft: #1e293b;
    --border-soft: #1f2937;
    --border-strong: #0f172a;
    --brand: #1d4ed8;
    --brand-strong: #1e3a8a;
  }

  .page-container.dyslexia-font,
  .page-container.dyslexia-font * {
    font-family: 'OpenDyslexic', 'Atkinson Hyperlegible', 'Verdana', 'Segoe UI', sans-serif !important;
  }

  .layout-container {
    display: flex;
    flex: 1;
    position: relative;
    z-index: 1;
    justify-content: center;
  }
  .alert-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.5rem;
    height: 1.5rem;
    padding: 0 0.4rem;
    background: #dc2626;
    color: #ffffff;
    font-size: 0.65rem;
    font-weight: 700;
    border-radius: 999px;
    flex-shrink: 0;
  }

  .ambient-layers {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }

  .ambient-orb {
    position: absolute;
    border-radius: 999px;
    filter: blur(12px);
    opacity: 0.36;
    animation: orbital-drift 18s ease-in-out infinite;
    transform: translate3d(0, 0, 0);
  }

  .orb-one {
    width: 18rem;
    height: 18rem;
    top: 7rem;
    left: -5rem;
    background: radial-gradient(circle at 35% 35%, rgba(191, 219, 254, 0.9), rgba(191, 219, 254, 0));
  }

  .orb-two {
    width: 20rem;
    height: 20rem;
    top: 22rem;
    right: -7rem;
    animation-delay: 1.4s;
    background: radial-gradient(circle at 40% 40%, rgba(153, 246, 228, 0.82), rgba(153, 246, 228, 0));
  }

  .orb-three {
    width: 12rem;
    height: 12rem;
    bottom: 10rem;
    left: 46%;
    animation-delay: 2.4s;
    background: radial-gradient(circle at 40% 40%, rgba(186, 230, 253, 0.8), rgba(186, 230, 253, 0));
  }

  .app-header {
    @apply sticky top-0 z-40 border-b;
    background: rgba(255, 255, 255, 0.76);
    border-color: rgba(216, 225, 236, 0.9);
    box-shadow:
      0 8px 30px rgba(15, 23, 42, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(18px);
    position: relative;
  }

  .header-layout {
    @apply max-w-6xl mx-auto px-2.5 py-2 flex items-center justify-between gap-2;
    width: min(100%, 72rem);
  }

  .app-logo {
    @apply text-[1.05rem] font-bold m-0 flex-shrink-0;
    color: var(--brand);
    font-family: 'Fraunces', serif;
    letter-spacing: -0.02em;
  }

  .main-nav {
    @apply flex items-center gap-1 flex-1 max-w-[31rem] p-1 rounded-full border;
    background: rgba(248, 251, 255, 0.82);
    border-color: rgba(216, 227, 239, 0.95);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.92),
      0 14px 24px rgba(15, 23, 42, 0.05);
  }

  .nav-tab {
    @apply inline-flex items-center justify-center px-3 py-1.5 text-[11px] font-semibold rounded-full transition-colors border-0;
    background: transparent;
    color: var(--text-soft);
    cursor: pointer;
    position: relative;
    white-space: nowrap;
    min-height: 2.1rem;
  }

  .nav-tab:hover {
    background: #eef4ff;
    color: var(--text-strong);
  }

  .nav-tab.active {
    background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 48%, #1e40af 100%);
    box-shadow: 0 10px 20px rgba(29, 78, 216, 0.22);
    color: #ffffff;
  }

  .alert-badge {
    @apply inline-block ml-1 px-1.5 py-0.5 text-xs font-bold rounded-full;
    background: #dc2626;
    color: white;
  }

  .header-actions {
    @apply flex items-center gap-2 ml-auto;
    flex-shrink: 0;
  }

  .settings-button {
    @apply p-1.5 rounded-lg transition-colors border-0 cursor-pointer;
    background: transparent;
    color: var(--text-soft);
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .settings-icon {
    display: block;
  }

  .settings-button:hover {
    @apply bg-gray-100;
    color: var(--text-strong);
  }

  .settings-button.active {
    background: var(--focus);
    color: var(--brand);
  }

  .settings-panel {
    @apply absolute top-full right-3 mt-1 bg-white rounded-lg border shadow-lg;
    border-color: var(--border-soft);
    z-index: 50;
    min-width: 240px;
    max-width: calc(100vw - 1rem);
    animation: dropdown-in 200ms ease-out;
    transform-origin: top right;
    overflow: hidden;
  }

  .settings-group {
    @apply p-3 border-b;
    border-color: var(--border-soft);
  }

  .settings-group:last-of-type {
    border-bottom: none;
  }

  .settings-group h3 {
    @apply text-xs uppercase tracking-wider font-semibold m-0 mb-2;
    color: var(--text-soft);
  }

  .setting-item {
    @apply w-full text-left px-3 py-2 rounded text-sm transition-colors border-0 bg-transparent cursor-pointer;
    color: var(--text-body);
  }

  .setting-item:hover {
    @apply bg-gray-100;
    color: var(--text-strong);
  }

  .setting-item.active {
    background: var(--focus);
    color: var(--brand);
  }

  .settings-footer {
    @apply p-3 border-t;
    border-color: var(--border-soft);
  }

  .close-settings {
    @apply w-full px-3 py-2 rounded font-semibold transition-colors border-0 cursor-pointer;
    background: var(--brand);
    color: white;
  }

  .close-settings:hover {
    background: var(--brand-strong);
  }

  @keyframes dropdown-in {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .main-content {
    @apply flex-1 max-w-6xl mx-auto w-full px-5 py-7;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    position: relative;
    z-index: 1;
    width: min(100%, 72rem);
  }

  .search-view {
    @apply space-y-3 mx-auto w-full;
    max-width: 72rem;
    animation: fade-up 300ms var(--ease-premium);
  }

  .search-container {
    @apply sticky top-24 z-30 py-3.5 rounded-[1.35rem] border mx-auto;
    padding-left: 1.75rem;
    padding-right: 1.15rem;
    padding-top: 1.1rem;
    padding-bottom: 1rem;
    width: 100%;
    background: rgba(255, 255, 255, 0.82);
    border-color: rgba(216, 225, 236, 0.95);
    box-shadow:
      0 18px 45px rgba(15, 23, 42, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(18px);
    animation: panel-rise 420ms var(--ease-premium);
  }

  .search-hero {
    @apply flex items-start justify-between gap-4 mb-3;
    padding-left: 0.15rem;
  }

  .search-hero-copy {
    @apply min-w-0;
    padding-left: 0.2rem;
  }

  .search-hero-kicker {
    @apply m-0 text-[11px] uppercase tracking-[0.22em] font-semibold;
    color: var(--brand-mint);
  }

  .search-hero h2 {
    @apply m-0 mt-1 text-[1.12rem] font-semibold;
    color: var(--text-strong);
    letter-spacing: -0.02em;
    line-height: 1.18;
  }

  .search-hero-pills {
    @apply mt-2 flex flex-wrap gap-2;
  }

  .hero-pill {
    @apply inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border;
    background: linear-gradient(180deg, rgba(248, 251, 255, 0.96), rgba(239, 246, 255, 0.96));
    border-color: rgba(214, 227, 243, 0.95);
    color: #1e3a8a;
    animation: chip-rise 240ms var(--ease-premium);
    animation-delay: calc(var(--stagger, 0) * 40ms);
    animation-fill-mode: both;
  }

  .search-guidance {
    @apply mt-3 rounded-xl border px-3 py-2;
    background: rgba(239, 246, 255, 0.7);
    border-color: #c7dbf4;
    color: #334155;
  }

  .search-guidance p {
    @apply m-0 text-xs;
    line-height: 1.45;
  }

  .feature-panel {
    @apply mt-3 w-full;
    padding-left: 0.15rem;
    padding-right: 0.15rem;
  }

  .feature-panel-commute {
    animation: panel-rise 320ms var(--ease-premium);
  }

  .feature-panel-trip {
    animation: panel-rise 360ms var(--ease-premium);
  }

  .alerts-view-container {
    @apply mx-auto w-full max-w-4xl px-4 py-4;
  }

  .search-status {
    @apply mt-4 p-3 text-sm rounded-xl border;
    background: #eff6ff;
    border-color: #bfdbfe;
    color: #1e3a8a;
    position: relative;
    overflow: hidden;
  }

  .search-status::after {
    content: '';
    position: absolute;
    inset: 0;
    transform: translateX(-100%);
    background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.54), transparent);
    animation: status-shine 1.7s ease-in-out infinite;
  }

  .search-error {
    @apply mt-4 p-3 text-sm rounded-xl border;
    background: #fff1f2;
    border-color: #fecdd3;
    color: #9f1239;
  }

  .search-info {
    @apply mt-4 p-3 text-sm rounded-xl border;
    background: #eff6ff;
    border-color: #bfdbfe;
    color: #1e3a8a;
  }

  .starter-inline {
    @apply mt-3 flex flex-wrap gap-2;
  }

  .starter-inline-item {
    @apply text-xs font-semibold rounded-full border px-3 py-1.5 text-left;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(243, 248, 255, 0.95));
    border-color: #c9dbf3;
    color: #1e3a8a;
    transition: background 140ms ease, border-color 140ms ease, transform 140ms ease, box-shadow 140ms ease;
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.04);
  }

  .starter-inline-item:hover {
    background: #edf4ff;
    border-color: #93c5fd;
    transform: translateY(-1px);
  }

  .empty-results {
    @apply mt-4 p-5 rounded-2xl border;
    background: #f8fafc;
    border-color: var(--border-soft);
    color: var(--text-body);
  }

  .empty-results h2 {
    @apply text-base font-semibold m-0;
  }

  .empty-results p {
    @apply text-sm mt-2 mb-0;
  }

  .results-section {
    @apply mt-2;
  }

  .results-head {
    @apply flex items-end justify-between gap-3 mb-2;
  }

  .results-title {
    @apply text-[0.82rem] font-semibold m-0 uppercase tracking-[0.22em];
    color: var(--text-strong);
  }

  .results-summary-pills {
    @apply mt-1.5 flex flex-wrap gap-2;
  }

  .results-summary-pill {
    @apply inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold;
    background: #f8fbff;
    border-color: #d6e3f3;
    color: #1e3a8a;
  }

  .results-count {
    @apply inline-flex items-center rounded-full border px-2.5 py-1.5 text-xs font-semibold;
    background: #eef6ff;
    border-color: #c7dbf4;
    color: #1e3a8a;
    white-space: nowrap;
  }

  .results-grid {
    @apply grid gap-3;
    grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
  }

  .results-grid,
  .empty-results,
  .search-status,
  .search-error,
  .search-info,
  .starter-inline,
  .search-guidance {
    margin-left: auto;
    margin-right: auto;
    width: 100%;
  }

  .result-card {
    @apply w-full flex flex-col gap-2 p-4 border rounded-2xl transition-all text-left;
    min-height: 6.25rem;
    background: rgba(255, 255, 255, 0.9);
    border-color: rgba(216, 225, 236, 0.9);
    box-shadow:
      0 16px 36px rgba(15, 23, 42, 0.06),
      inset 0 1px 0 rgba(255, 255, 255, 0.78);
    animation: card-rise 300ms var(--ease-premium);
    animation-delay: calc(var(--stagger, 0) * 58ms);
    animation-fill-mode: both;
    contain: layout paint;
  }

  .result-card:hover {
    border-color: var(--border-strong);
    background: linear-gradient(180deg, rgba(251, 253, 255, 0.98), rgba(242, 247, 255, 0.98));
    transform: translateY(-2px) scale(1.002);
    box-shadow: 0 18px 34px rgba(15, 23, 42, 0.1);
  }

  .result-card:focus-visible,
  .back-button:focus-visible,
  .footer-links a:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px var(--focus);
  }

  .result-type {
    @apply inline-block px-2.5 py-1 text-xs font-semibold rounded flex-shrink-0;
    background: #dbeafe;
    color: #1e3a8a;
  }

  .result-topline {
    @apply flex items-center justify-between gap-2 w-full;
  }

  .result-action {
    @apply text-[11px] font-semibold rounded-full px-2 py-1;
    background: #eff6ff;
    color: #1e3a8a;
    white-space: nowrap;
  }

  .result-content {
    @apply flex-1;
    width: 100%;
  }

  .result-name {
    @apply font-semibold;
    color: var(--text-strong);
    letter-spacing: -0.006em;
    line-height: 1.35;
  }

  .result-detail {
    @apply text-sm mt-1;
    color: var(--text-soft);
    line-height: 1.45;
  }

  .result-arrow {
    @apply flex-shrink-0;
    color: #64748b;
    transition: transform 160ms ease, color 160ms ease;
    align-self: flex-end;
  }

  .result-card:hover .result-arrow {
    color: #1d4ed8;
    transform: translateX(2px);
  }

  .boarding-panel {
    @apply mt-4 rounded-2xl border;
    padding: 1.05rem 1rem 1rem 1.35rem;
    background: linear-gradient(145deg, rgba(251, 253, 255, 0.96) 0%, rgba(243, 248, 255, 0.96) 100%);
    border-color: rgba(205, 223, 246, 0.95);
    box-shadow:
      0 18px 36px rgba(15, 23, 42, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.82);
  }

  .map-mode-panel {
    @apply mt-4 p-4 rounded-2xl border;
    background: linear-gradient(150deg, rgba(236, 245, 255, 0.95) 0%, rgba(248, 251, 255, 0.97) 100%);
    border-color: rgba(198, 214, 234, 0.95);
    box-shadow:
      0 18px 36px rgba(15, 23, 42, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
  }

  .map-mode-head {
    @apply flex items-center justify-between gap-3;
  }

  .map-mode-title {
    @apply min-w-0;
  }

  .map-mode-head h3 {
    @apply m-0 text-sm font-semibold;
    color: var(--text-strong);
    letter-spacing: -0.01em;
    line-height: 1.25;
  }

  .map-mode-kicker {
    @apply inline-block text-[10px] font-semibold uppercase tracking-[0.24em] mb-0.5;
    color: #0f766e;
  }

  .map-mode-meta {
    @apply flex flex-wrap justify-end gap-2;
  }

  .map-mode-chip {
    @apply inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold;
    background: #ffffff;
    border-color: #cdddef;
    color: #1e3a8a;
  }

  .map-mode-widget {
    @apply mt-3 rounded-xl overflow-hidden border;
    border-color: #cdddef;
    min-height: 25rem;
    background: #ffffff;
  }

  .boarding-panel-head h3 {
    @apply m-0 text-base font-semibold;
    color: var(--text-strong);
    letter-spacing: -0.01em;
  }

  .boarding-panel-head p {
    @apply m-0 mt-1 text-sm;
    color: var(--text-soft);
  }

  .boarding-kicker {
    @apply inline-block text-xs font-semibold uppercase tracking-wider mb-1;
    color: #1e40af;
  }

  .boarding-grid {
    @apply mt-3 grid gap-3;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  }

  .boarding-legend {
    @apply mt-2 flex flex-wrap items-center gap-2;
  }

  .boarding-legend-item {
    @apply inline-block text-[11px] font-semibold px-2 py-1 rounded-full;
  }

  .boarding-legend-item .legend-text-short {
    display: none;
  }

  .boarding-legend-item[data-kind='walk'] {
    background: #dcfce7;
    color: #166534;
  }

  .boarding-legend-item[data-kind='fast'] {
    background: #ffedd5;
    color: #9a3412;
  }

  @media (max-width: 768px) {
    .boarding-legend {
      @apply sticky z-10 py-2 flex-nowrap;
      top: 0;
      background: #f8fbff;
      border-bottom: 1px solid #d7e3f3;
      margin-top: 0.5rem;
      margin-bottom: 0.5rem;
      overflow-x: auto;
      scrollbar-width: none;
    }

    .boarding-legend::-webkit-scrollbar {
      display: none;
    }

    .boarding-legend.is-collapsed {
      @apply py-1 gap-1;
    }

    .boarding-legend.is-collapsed .boarding-legend-item {
      @apply text-[10px] px-2 py-0.5;
    }

    .boarding-legend.is-collapsed .legend-text-long {
      display: none;
    }

    .boarding-legend.is-collapsed .legend-text-short {
      display: inline;
    }
  }

  .boarding-state {
    @apply mt-2 mb-0 text-xs;
    color: #475569;
  }

  .boarding-state[data-state='error'] {
    color: #b91c1c;
  }

  .boarding-stop-card {
    @apply p-3 rounded-xl border;
    background: #ffffff;
    border-color: #d7e3f3;
    transition: all 140ms ease;
  }

  .boarding-stop-card[data-rank='best'] {
    background: #f0fdf4;
    border-color: #86efac;
    box-shadow: 0 0 12px rgba(34, 197, 94, 0.12);
  }

  .boarding-stop-card[data-rank='good'] {
    background: #fffbeb;
    border-color: #fcd34d;
    box-shadow: 0 0 12px rgba(250, 204, 21, 0.08);
  }

  .boarding-stop-card[data-rank='nearby'] {
    opacity: 0.85;
  }

  .boarding-stop-card[data-rank='best']:hover,
  .boarding-stop-card[data-rank='good']:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  }

  .boarding-stop-top {
    @apply flex items-center justify-between gap-2;
  }

  .boarding-meta {
    @apply flex flex-col items-end gap-1;
  }

  .boarding-rank {
    @apply text-xs font-semibold px-2 py-1 rounded-full;
    color: #1e3a8a;
    background: #dbeafe;
  }

  .boarding-eta {
    @apply text-xs font-semibold;
    color: #0f766e;
  }

  .boarding-next {
    @apply text-xs font-semibold;
    color: #1e3a8a;
  }

  .boarding-badges {
    @apply mt-2 flex flex-wrap gap-1;
    min-height: 1.25rem;
  }

  .boarding-badge {
    @apply m-0 text-xs font-semibold px-2 py-0.5 rounded-full;
  }

  .boarding-badge[data-kind='walk'] {
    background: #dcfce7;
    color: #166534;
  }

  .boarding-badge[data-kind='fast'] {
    background: #ffedd5;
    color: #9a3412;
  }

  .boarding-stop-card h4 {
    @apply m-0 mt-2 text-sm font-semibold;
    color: var(--text-strong);
    line-height: 1.35;
  }

  .boarding-stop-card p {
    @apply m-0 mt-1 text-xs;
    color: var(--text-soft);
  }

  .boarding-routes {
    @apply mt-2 flex flex-wrap gap-1;
  }

  .boarding-routes span {
    @apply inline-block text-xs font-semibold px-2 py-1 rounded-full;
    color: #1e3a8a;
    background: #dbeafe;
  }

  .boarding-actions {
    @apply mt-3 flex flex-col gap-2;
  }

  .boarding-stop-card button {
    @apply w-full text-xs font-semibold rounded-lg border px-3 py-2;
    background: #1d4ed8;
    color: #ffffff;
    border-color: #1e40af;
    transition: background 140ms ease;
  }

  .boarding-stop-card button.ghost {
    background: #ffffff;
    color: #1e3a8a;
    border-color: #bfdbfe;
  }

  .boarding-stop-card button.ghost:hover {
    background: #eff6ff;
  }

  .boarding-stop-card button:not(.ghost):hover {
    background: #1e40af;
  }

  .view-header {
    @apply flex items-center gap-4 mb-3;
  }

  .back-button {
    @apply px-3 py-2 rounded-xl transition-colors text-sm font-semibold border;
    background: #f8fafc;
    border-color: var(--border-soft);
    color: var(--text-strong);
  }

  .back-button:hover {
    background: #eff6ff;
    border-color: #bfdbfe;
  }

  .app-footer {
    @apply border-t mt-8;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(248, 251, 255, 0.92)),
      radial-gradient(circle at 8% 0%, rgba(29, 78, 216, 0.08), transparent 30%);
    border-color: rgba(216, 225, 236, 0.9);
    backdrop-filter: blur(14px);
    box-shadow: 0 -10px 30px rgba(15, 23, 42, 0.05);
  }

  .footer-content {
    @apply max-w-2xl mx-auto px-4 py-4 text-xs;
    width: min(100%, 72rem);
    padding-left: 1.15rem;
    padding-right: 1.15rem;
    text-align: left;
    color: var(--text-soft);
    line-height: 1.55;
    display: grid;
    gap: 0.35rem;
  }

  .footer-ownership {
    margin: 0.1rem 0 0;
    font-size: 0.68rem;
    color: #7c8ca3;
    letter-spacing: 0.01em;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    width: fit-content;
    padding: 0.28rem 0.55rem;
    border: 1px solid rgba(203, 213, 225, 0.8);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.78);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
  }

  .footer-ownership a {
    color: inherit;
    text-decoration: none;
    font-weight: 500;
  }

  .footer-ownership a:hover {
    color: var(--brand-strong);
    text-decoration: none;
  }

  .footer-credits {
    margin: 0.05rem 0 0;
    font-size: 0.68rem;
    color: #8b97a8;
    line-height: 1.5;
    max-width: 70ch;
  }

  .footer-credits a {
    color: inherit;
    text-decoration: none;
    font-weight: 600;
  }

  .footer-credits a:hover {
    color: var(--brand-strong);
    text-decoration: underline;
    text-underline-offset: 0.14em;
  }

  @media (max-width: 1024px) {
    .orb-three {
      display: none;
    }
  }

  /* Tablet & Desktop Responsive Layout */
  @media (min-width: 768px) {
    .layout-container {
      display: flex;
      flex: 1;
      justify-content: center;
    }

    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding-left: 1.75rem;
      padding-right: 1.75rem;
    }

  }

  @media (min-width: 641px) {
    .header-layout {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 0.75rem;
      padding-left: 1.75rem;
      padding-right: 1.75rem;
      width: min(100%, 72rem);
    }

    .main-nav {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.35rem;
      min-width: 0;
    }

    .nav-tab {
      width: 100%;
      min-width: 0;
    }

    .settings-panel {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-items: stretch;
      gap: 0;
      min-width: 0;
      width: min(92vw, 860px);
      max-width: 100%;
      padding: 0.25rem;
    }

    .settings-group {
      display: flex !important;
      flex-direction: row !important;
      flex-wrap: nowrap !important;
      align-items: center;
      justify-content: flex-start;
      gap: 0.4rem;
      flex: 1 1 0;
      padding: 0.75rem 0.8rem;
      border-bottom: none;
      border-right: 1px solid var(--border-soft);
    }

    .settings-group:nth-child(2n) {
      border-right: none;
    }

    .settings-group h3 {
      width: auto;
      margin: 0 0.15rem 0 0;
      flex: 0 0 auto;
      white-space: nowrap;
    }

    .setting-item {
      width: auto;
      flex: 1 1 0;
      min-width: 0;
      padding: 0.45rem 0.65rem;
      border: 1px solid var(--border-soft);
      background: #f8fbff;
      border-radius: 999px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .settings-footer {
      display: flex !important;
      align-items: center;
      padding: 0.7rem 0.8rem 0.8rem;
      border-top: 1px solid var(--border-soft);
      grid-column: 1 / -1;
      width: 100%;
    }

    .close-settings {
      width: auto;
      min-width: 7rem;
      margin-left: auto;
    }
  }

  @media (pointer: coarse) {
    .starter-inline-item:hover,
    .result-card:hover {
      transform: none;
      box-shadow: none;
    }
  }

  /* Mobile Navigation */
  @media (max-width: 767px) {
    .nav-tab {
      padding: 1rem 1.25rem;
    }
  }

  .footer-links {
    @apply flex gap-4 mt-2;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .footer-links a {
    @apply transition-colors;
    color: #1d4ed8;
  }

  .footer-links a:hover {
    color: #1e40af;
  }

  /* Mobile */
  @media (max-width: 640px) {
    .header-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-areas:
        'brand actions'
        'nav nav';
      align-items: center;
      gap: 0.6rem 0.65rem;
      padding-left: 0.75rem;
      padding-right: 0.75rem;
    }

    .app-logo {
      grid-area: brand;
    }

    .main-nav {
      grid-area: nav;
      width: 100%;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.35rem;
      padding: 0.35rem;
      border-radius: 1.05rem;
    }

    .nav-tab {
      width: 100%;
      min-height: 2.45rem;
      padding: 0.7rem 0.3rem;
      font-size: 0.72rem;
      letter-spacing: 0.01em;
    }

    .header-actions {
      grid-area: actions;
    }

    .header-layout {
      @apply py-2;
    }

    .settings-panel {
      left: 0.75rem;
      right: 0.75rem;
      min-width: 0;
      width: auto;
      transform-origin: top center;
      display: block;
    }

    .main-content {
      @apply px-3;
      padding-top: 1.05rem;
      padding-bottom: 1.45rem;
    }

    .search-container {
      @apply py-3;
      padding-left: 0.85rem;
      padding-right: 0.85rem;
      position: static;
      border-radius: 1.15rem;
      box-shadow:
        0 12px 30px rgba(15, 23, 42, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.85);
    }

    .search-hero {
      @apply flex-col gap-1.5;
      margin-bottom: 0.5rem;
    }

    .search-hero h2 {
      @apply text-[0.98rem];
      max-width: 18ch;
    }

    .search-hero-pills {
      margin-top: 0.45rem;
      gap: 0.35rem;
    }

    .hero-pill {
      padding: 0.35rem 0.55rem;
      font-size: 0.68rem;
    }

    .search-guidance {
      display: none;
    }

    .search-view {
      @apply space-y-2.5;
    }

    .feature-panel {
      padding-left: 0;
      padding-right: 0;
    }

    .starter-inline {
      margin-top: 0.55rem;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.35rem;
      opacity: 0.84;
    }

    .starter-inline-item {
      width: 100%;
      white-space: normal;
      font-size: 0.68rem;
      padding: 0.5rem 0.55rem;
      background: #f8fbff;
      border-color: #d8e4f1;
      box-shadow: none;
      min-height: 2.3rem;
    }

    .results-head {
      @apply flex-col items-start;
    }

    .results-grid {
      grid-template-columns: 1fr;
    }

    .result-card {
      padding: 0.78rem;
      align-items: flex-start;
      gap: 0.6rem;
    }

    .boarding-grid {
      grid-template-columns: 1fr;
    }

    .boarding-panel {
      padding: 0.9rem 0.9rem 0.9rem 1rem;
    }

    .boarding-panel-head h3 {
      @apply text-[0.98rem];
    }

    .boarding-panel-head p {
      @apply text-xs;
    }

    .boarding-stop-top {
      @apply flex-col items-start;
    }

    .boarding-meta {
      @apply items-start;
    }

    .boarding-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .boarding-stop-card button {
      min-height: 2.45rem;
    }

    .map-mode-head {
      @apply flex-col items-start;
    }

    .map-mode-meta {
      @apply justify-start;
    }

    .map-mode-widget {
      min-height: 20.5rem;
    }

    .result-arrow {
      margin-top: 0.2rem;
    }

    .app-footer {
      margin-top: 1.75rem;
      padding-left: 0.35rem;
      padding-right: 0.35rem;
    }

    .footer-content {
      padding-left: 0.9rem;
      padding-right: 0.9rem;
      gap: 0.42rem;
    }

    .footer-ownership {
      font-size: 0.66rem;
      padding: 0.24rem 0.5rem;
    }

    .footer-credits {
      font-size: 0.65rem;
    }

    .footer-links {
      gap: 0.9rem;
      margin-top: 0.15rem;
    }

    .orb-three {
      left: 35%;
    }
  }

  @media (max-width: 420px) {
    .main-content {
      padding-left: 0.6rem;
      padding-right: 0.6rem;
    }

    .starter-inline {
      grid-template-columns: 1fr;
    }

    .boarding-actions {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 360px) {
    .header-layout {
      padding-left: 0.55rem;
      padding-right: 0.55rem;
      gap: 0.45rem 0.5rem;
    }

    .nav-tab {
      padding: 0.62rem 0.22rem;
      font-size: 0.68rem;
    }

    .search-hero h2 {
      @apply text-[0.92rem];
    }

    .search-hero-pills {
      gap: 0.4rem;
    }

    .hero-pill,
    .results-summary-pill,
    .results-count,
    .map-mode-chip {
      @apply text-[10px];
    }
  }

  @media (min-width: 1536px) {
    .main-content {
      max-width: 88rem;
    }
  }

  @media (prefers-contrast: more) {
    .app-header {
      background: linear-gradient(115deg, #08192e 0%, #1e3a8a 56%, #14532d 100%);
    }
  }

  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    .ambient-orb,
    .starter-inline-item,
    .result-card,
    .search-view,
    .search-container,
    .search-status::after {
      transition: none;
      animation: none;
    }
  }

  @keyframes fade-up {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes chip-rise {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes card-rise {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.992);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes panel-rise {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes status-shine {
    to {
      transform: translateX(120%);
    }
  }

  @keyframes orbital-drift {
    0%,
    100% {
      transform: translate3d(0, 0, 0) scale(1);
    }
    50% {
      transform: translate3d(10px, -12px, 0) scale(1.04);
    }
  }
</style>
