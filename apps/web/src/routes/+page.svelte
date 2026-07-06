<script lang="ts">
  import '$lib/home/styles/home-page.css';
  import { onMount, tick } from 'svelte';
  import { browser } from '$app/environment';
  import { DEFAULT_TRACKER_CONFIG } from '$lib/tracker';
  import { distanceKm, estimateWalkMinutes } from '$lib/home/geo';
  import {
    applyOnboardingSignal,
    DEFAULT_ONBOARDING_PROFILE,
    getPreferredOnboardingVariant,
    normalizeOnboardingProfile,
    type OnboardingProfile
  } from '$lib/home/onboarding-personalization';
  import HomeMapBoardingPanels from '$lib/home/components/HomeMapBoardingPanels.svelte';
  import HomeResultsSection from '$lib/home/components/HomeResultsSection.svelte';
  import HomeSearchFlow from '$lib/home/components/HomeSearchFlow.svelte';
  import HomeFooter from '$lib/home/components/HomeFooter.svelte';
  import HomeMobileThumbNav from '$lib/home/components/HomeMobileThumbNav.svelte';
  import { inferSearchIntent } from '$lib/home/search-intents';
  import { apiFetch } from '$lib/api';
  import Phase3Hub from '$lib/Phase3Hub.svelte';
  import Phase4Hub from '$lib/Phase4Hub.svelte';
  import AlertCenter from '$lib/AlertCenter.svelte';
  import RouteView from '$lib/RouteView.svelte';
  import StopView from '$lib/StopView.svelte';
  import VehicleView from '$lib/VehicleView.svelte';
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
  let parallaxOffset = 0;
  let TrackerWidgetComponent: typeof import('$lib/tracker/TrackerWidget.svelte').default | null = null;
  let trackerWidgetLoadPromise: Promise<void> | null = null;
  let showOnboardingHint = false;
  let onboardingVariant: 'address' | 'route' = 'address';
  let onboardingPrimaryIntent: 'address' | 'route' = 'address';
  let onboardingPrimaryAction = 'Try address flow';
  let onboardingHeadline = 'Start with your address, then pick the best nearby boarding stop.';
  let onboardingTip = 'Great for first-time riders and unfamiliar neighborhoods.';
  let onboardingWhy = 'Why this suggestion: address-first is easiest for most first-time riders.';
  let onboardingProfile: OnboardingProfile = DEFAULT_ONBOARDING_PROFILE;

  const quickQueries = ['South Station now', 'Alewife', 'Red Line', '66', 'Harvard'];
  const searchPrinciples = ['Fast boarding', 'Live arrivals', 'Map on demand'];
  type WorkflowIntent = {
    id: 'address' | 'route' | 'alerts' | 'map';
    title: string;
    description: string;
    actionLabel: string;
    query?: string;
  };

  const workflowIntents: WorkflowIntent[] = [
    {
      id: 'address',
      title: 'Find nearest stop',
      description: 'Best for when you are starting from an address.',
      actionLabel: 'Use address flow',
      query: '878 Salem St, Malden MA'
    },
    {
      id: 'route',
      title: 'Track a line fast',
      description: 'Jump straight into a route like Red Line or 66.',
      actionLabel: 'Use route flow',
      query: 'Red Line'
    },
    {
      id: 'alerts',
      title: 'Check disruptions',
      description: 'Open system alerts first when service feels unstable.',
      actionLabel: 'Open alerts'
    },
    {
      id: 'map',
      title: 'Open map context',
      description: 'Switch to map mode without leaving search.',
      actionLabel: 'Enable map mode'
    }
  ];
  const ACCESSIBILITY_PREFS_KEY = 'mbta_accessibility_prefs_v1';
  const ONBOARDING_HINT_KEY = 'mbta_onboarding_hint_dismissed_v1';
  const ONBOARDING_VARIANT_KEY = 'mbta_onboarding_variant_v1';
  const ONBOARDING_PROFILE_KEY = 'mbta_onboarding_profile_v1';

  $: isDetailView = currentView === 'stop' || currentView === 'route' || currentView === 'vehicle' || currentView === 'alerts';
  $: journeyStep = isDetailView ? 3 : lastQuery ? 2 : 1;
  $: onboardingPrimaryIntent = (onboardingVariant === 'route' ? 'route' : 'address') as 'address' | 'route';
  $: onboardingPrimaryAction = onboardingVariant === 'route' ? 'Try route flow' : 'Try address flow';
  $: onboardingHeadline = onboardingVariant === 'route'
    ? 'Start with a route, then pick the fastest boarding stop from live results.'
    : 'Start with your address, then pick the best nearby boarding stop.';
  $: onboardingTip = onboardingVariant === 'route'
    ? 'Great for repeat commuters who already know their line.'
    : 'Great for first-time riders and unfamiliar neighborhoods.';
  $: onboardingWhy = onboardingVariant === 'route'
    ? onboardingProfile.routeCount + onboardingProfile.mapCount > onboardingProfile.addressCount
      ? `Why this suggestion: your recent actions leaned route/map-first (${onboardingProfile.routeCount} route, ${onboardingProfile.mapCount} map).`
      : 'Why this suggestion: route-first helps when you already know your line.'
    : onboardingProfile.addressCount >= onboardingProfile.routeCount + onboardingProfile.mapCount
      ? `Why this suggestion: your recent actions leaned address-first (${onboardingProfile.addressCount} address-style searches).`
      : 'Why this suggestion: address-first is easiest for first-time riders and new areas.';

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

  function resetPersonalization() {
    onboardingProfile = DEFAULT_ONBOARDING_PROFILE;
    onboardingVariant = 'address';
    showOnboardingHint = true;

    if (browser) {
      try {
        localStorage.removeItem(ONBOARDING_PROFILE_KEY);
        localStorage.removeItem(ONBOARDING_VARIANT_KEY);
        localStorage.removeItem(ONBOARDING_HINT_KEY);
      } catch {
        // Ignore storage failures.
      }
    }

    void track('personalization_reset', { source: 'settings' });
    routeInfoMessage = 'Personalization reset. Guidance has been restored.';
    closeSettingsMenu();
  }

  function loadOnboardingProfile() {
    if (!browser) {
      return;
    }

    try {
      const stored = localStorage.getItem(ONBOARDING_PROFILE_KEY);
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as {
        addressCount?: number;
        routeCount?: number;
        mapCount?: number;
      };

      onboardingProfile = normalizeOnboardingProfile(parsed);
    } catch {
      // Ignore malformed onboarding profile payloads.
    }
  }

  function saveOnboardingProfile() {
    if (!browser) {
      return;
    }

    try {
      localStorage.setItem(ONBOARDING_PROFILE_KEY, JSON.stringify(onboardingProfile));
    } catch {
      // Ignore storage write failures.
    }
  }

  function recordOnboardingSignal(signal: 'address' | 'route' | 'map', source: string) {
    onboardingProfile = applyOnboardingSignal(onboardingProfile, signal);

    saveOnboardingProfile();

    const nextVariant = getPreferredOnboardingVariant(onboardingProfile, onboardingVariant);
    if (nextVariant !== onboardingVariant) {
      const previousVariant = onboardingVariant;
      onboardingVariant = nextVariant;

      if (browser) {
        try {
          localStorage.setItem(ONBOARDING_VARIANT_KEY, onboardingVariant);
        } catch {
          // Ignore storage write failures.
        }
      }

      void track('onboarding_variant_shifted', {
        source,
        from: previousVariant,
        to: nextVariant,
        address_count: onboardingProfile.addressCount,
        route_count: onboardingProfile.routeCount,
        map_count: onboardingProfile.mapCount
      });
    }
  }

  function resolveOnboardingVariant(): 'address' | 'route' {
    if (!browser) {
      return 'address';
    }

    try {
      const stored = localStorage.getItem(ONBOARDING_VARIANT_KEY);
      if (stored === 'address' || stored === 'route') {
        return stored;
      }

      const chosen: 'address' | 'route' = Math.random() < 0.5 ? 'address' : 'route';
      localStorage.setItem(ONBOARDING_VARIANT_KEY, chosen);
      return chosen;
    } catch {
      return 'address';
    }
  }

  function completeOnboarding(source: string) {
    if (!showOnboardingHint) {
      return;
    }

    showOnboardingHint = false;
    if (browser) {
      try {
        localStorage.setItem(ONBOARDING_HINT_KEY, '1');
      } catch {
        // Ignore storage write failures.
      }
    }

    void track('onboarding_hint_dismissed', { source });
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
  });

  onMount(() => {
    if (!browser) {
      return;
    }

    try {
      const dismissed = localStorage.getItem(ONBOARDING_HINT_KEY) === '1';
      showOnboardingHint = !dismissed;
      loadOnboardingProfile();
      onboardingVariant = getPreferredOnboardingVariant(onboardingProfile, resolveOnboardingVariant());
    } catch {
      showOnboardingHint = true;
      onboardingVariant = 'address';
    }
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

  onMount(() => {
    if (!browser) {
      return;
    }

    const desktopMedia = window.matchMedia('(min-width: 1025px)');
    const reduceMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updateParallax = () => {
      if (!desktopMedia.matches || reduceMotionMedia.matches) {
        parallaxOffset = 0;
        return;
      }

      const scrollY = Math.max(0, window.scrollY || 0);
      parallaxOffset = Math.min(34, scrollY * 0.045);
    };

    const handleWindowChange = () => updateParallax();

    window.addEventListener('scroll', handleWindowChange, { passive: true });
    window.addEventListener('resize', handleWindowChange);
    desktopMedia.addEventListener('change', handleWindowChange);
    reduceMotionMedia.addEventListener('change', handleWindowChange);
    updateParallax();

    return () => {
      window.removeEventListener('scroll', handleWindowChange);
      window.removeEventListener('resize', handleWindowChange);
      desktopMedia.removeEventListener('change', handleWindowChange);
      reduceMotionMedia.removeEventListener('change', handleWindowChange);
    };
  });

  async function ensureTrackerWidgetLoaded(): Promise<void> {
    if (!browser || TrackerWidgetComponent) {
      return;
    }

    if (!trackerWidgetLoadPromise) {
      trackerWidgetLoadPromise = import('$lib/tracker/TrackerWidget.svelte')
        .then((module) => {
          TrackerWidgetComponent = module.default;
        })
        .finally(() => {
          trackerWidgetLoadPromise = null;
        });
    }

    await trackerWidgetLoadPromise;
  }

  async function handleSearch(
    query: string,
    options: { skipIntentInference?: boolean } = {}
  ) {
    const startedAt = Date.now();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return;
    }

    if (!options.skipIntentInference) {
      const inferredIntent = inferSearchIntent(trimmedQuery);
      if (inferredIntent) {
        recordOnboardingSignal(inferredIntent, 'search_query');
      }
    }

    completeOnboarding('search_submit');

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

  async function executeWorkflowIntent(intentId: WorkflowIntent['id']) {
    completeOnboarding(`workflow_${intentId}`);

    if (intentId === 'alerts') {
      currentView = 'alerts';
      routeInfoMessage = 'System alerts opened. Search stays ready when you return.';
      await track('workflow_intent_used', { intent: intentId });
      return;
    }

    if (intentId === 'map') {
      recordOnboardingSignal('map', 'workflow_map');
      currentView = 'search';
      switchHomeMode('map');
      routeInfoMessage = 'Map mode is enabled. Search a stop or address to focus instantly.';
      await track('workflow_intent_used', { intent: intentId });
      return;
    }

    const intent = workflowIntents.find((item) => item.id === intentId);
    if (!intent?.query) {
      return;
    }

    if (intentId === 'address' || intentId === 'route') {
      recordOnboardingSignal(intentId, `workflow_${intentId}`);
    }

    await handleSearch(intent.query, { skipIntentInference: true });
    await track('workflow_intent_used', { intent: intentId });
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
    if (mode === 'map') {
      void ensureTrackerWidgetLoaded();
    }
    void track('home_mode_changed', { mode });
  }

  function handleMapTabClick() {
    currentView = 'search';
    switchHomeMode(homeMode === 'map' ? 'list' : 'map');
    if (homeMode === 'list') {
      recordOnboardingSignal('map', 'header_map_tab');
    }
  }

  function focusStopOnMap(stop: StopResult, source: 'search_result' | 'boarding_panel') {
    mapFocusStop = stop;
    mapFocusAddress = null;
    switchHomeMode('map');
    
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
    switchHomeMode('map');
    void track('map_focus_address', {
      address: address.address,
      nearby_stop_count: address.nearby_stops.length
    });
  }

  function focusLandmarkOnMap(landmark: { landmark_name: string; nearby_stops: StopResult[] }) {
    mapFocusAddress = null;
    mapFocusStop = landmark.nearby_stops[0] ?? null;
    switchHomeMode('map');
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

  function handleThumbNavSearch() {
    completeOnboarding('thumb_nav_search');
    currentView = 'search';
    switchHomeMode('list');
  }

  function handleThumbNavMap() {
    completeOnboarding('thumb_nav_map');
    recordOnboardingSignal('map', 'thumb_nav_map');
    currentView = 'search';
    switchHomeMode('map');
  }

  function handleThumbNavAlerts() {
    completeOnboarding('thumb_nav_alerts');
    currentView = 'alerts';
  }

  function handleResultSelect(result: SearchResult) {
    if (result.type === 'stop') {
      if (homeMode === 'map') {
        highlightedAddress = null;
        focusStopOnMap(result, 'search_result');
      } else {
        highlightedAddress = null;
        selectedStop = result;
        currentView = 'stop';
      }
      return;
    }

    if (result.type === 'route') {
      highlightedAddress = null;
      selectedRoute = result;
      currentView = 'route';
      void track('route_card_clicked', {
        route_id: result.route_id,
        route_number: result.route_number
      });
      return;
    }

    if (result.type === 'vehicle') {
      highlightedAddress = null;
      selectedVehicle = result;
      currentView = 'vehicle';
      void track('vehicle_card_clicked', {
        vehicle_id: result.vehicle_id,
        route_id: result.route_id
      });
      return;
    }

    if (result.type === 'address') {
      focusAddressOnMap(result);
      if (result.nearby_stops.length > 0) {
        highlightedAddress = result;
        routeInfoMessage = `${result.address}: best stop nearby.`;
      } else {
        highlightedAddress = null;
        routeInfoMessage = `${result.address}: no nearby stops yet.`;
      }
      return;
    }

    if (result.type === 'landmark') {
      focusLandmarkOnMap(result);
    }
  }

  function handleMapPanelReady(event: CustomEvent<HTMLElement>) {
    mapModePanelEl = event.detail;
  }

  function handleBoardingLegendReady(event: CustomEvent<HTMLDivElement>) {
    boardingLegendEl = event.detail;
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
  <title>MBTA Tracker - Search First Transit | By Aarti S Ravikumar</title>
  <meta name="author" content="Aarti S Ravikumar" />
  <meta name="creator" content="Aarti S Ravikumar" />
  <meta name="copyright" content="Aarti S Ravikumar" />
  <meta
    name="description"
    content="Search routes, stops, addresses, and vehicles in one calm MBTA experience with live arrivals and map context."
  />
  <meta
    name="keywords"
    content="MBTA, Boston transit, transit tracker, live arrivals, route search, stop search, commute planning, trip planning, MBTA tracker"
  />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="MBTA Tracker" />
  <meta property="og:title" content="MBTA Tracker - Search First Transit | By Aarti S Ravikumar" />
  <meta
    property="og:description"
    content="Find routes, stops, and live arrivals with a cleaner, faster MBTA search experience."
  />
  <meta property="og:url" content={data.canonicalUrl} />
  <meta property="og:image" content={data.shareImageUrl} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="MBTA Tracker premium social preview with live transit, search, and map context." />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="MBTA Tracker - Search First Transit | By Aarti S Ravikumar" />
  <meta
    name="twitter:description"
    content="Search MBTA routes, stops, addresses, and vehicles with live arrivals, map context, and fast planning."
  />
  <meta name="twitter:image" content={data.shareImageUrl} />
  <meta name="twitter:image:alt" content="MBTA Tracker premium social preview with live transit, search, and map context." />
  <meta name="theme-color" content="#f7f9fd" />
  <link rel="canonical" href={data.canonicalUrl} />
  <script type="application/ld+json">
    {JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': `${data.canonicalUrl}#website`,
          name: 'MBTA Tracker',
          url: data.canonicalUrl,
          inLanguage: 'en-US',
          description:
            'Search routes, stops, addresses, and vehicles in one calm MBTA experience with live arrivals and map context.',
          potentialAction: {
            '@type': 'SearchAction',
            target: `${data.canonicalUrl}?q={search_term_string}`,
            'query-input': 'required name=search_term_string'
          },
          author: {
            '@id': `${new URL('/', data.canonicalUrl).toString()}#author`
          },
          creator: {
            '@id': `${new URL('/', data.canonicalUrl).toString()}#author`
          },
          copyrightHolder: {
            '@id': `${new URL('/', data.canonicalUrl).toString()}#author`
          },
          publisher: {
            '@id': `${new URL('/', data.canonicalUrl).toString()}#organization`
          }
        },
        {
          '@type': 'WebApplication',
          '@id': `${data.canonicalUrl}#app`,
          name: 'MBTA Tracker',
          url: data.canonicalUrl,
          isPartOf: {
            '@id': `${data.canonicalUrl}#website`
          },
          applicationCategory: 'TransportationApplication',
          operatingSystem: 'Web',
          browserRequirements: 'Requires a modern web browser',
          image: data.shareImageUrl,
          inLanguage: 'en-US',
          areaServed: {
            '@type': 'City',
            name: 'Boston'
          },
          isAccessibleForFree: true,
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD'
          },
          author: {
            '@id': `${new URL('/', data.canonicalUrl).toString()}#author`
          },
          creator: {
            '@id': `${new URL('/', data.canonicalUrl).toString()}#author`
          },
          publisher: {
            '@id': `${new URL('/', data.canonicalUrl).toString()}#organization`
          }
        }
      ]
    })}
  </script>
</svelte:head>

<div
  id="page-top"
  class="page-container"
  class:high-contrast={highContrastEnabled}
  class:dyslexia-font={dyslexiaFontEnabled}
  style={`--parallax-y: ${parallaxOffset}px;`}
>
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <div class="ambient-layers" aria-hidden="true">
      <span class="ambient-orb orb-one"></span>
      <span class="ambient-orb orb-two"></span>
      <span class="ambient-orb orb-three"></span>
    </div>
    <!-- Minimalist Header: Search + 3 Main Tabs + Menu -->
    <header class="app-header">
      <div class="header-layout">
        <div class="brand-lockup" aria-label="MBTA Tracker home">
          <p class="app-logo">MBTA</p>
          <p class="brand-tagline">Transit command center</p>
          <p class="brand-byline">By Aarti S Ravikumar, Pioneer Charter School of Science II</p>
        </div>
        <nav class="main-nav" aria-label="Primary navigation">
          <button
            class="nav-tab {currentView === 'search' ? 'active' : ''}"
            on:click={() => { currentView = 'search'; }}
            aria-selected={currentView === 'search'}
            role="tab"
          >
            <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7"></circle>
              <path d="M20 20l-3.8-3.8"></path>
            </svg>
            <span class="nav-label">Search</span>
          </button>
          <button
            class="nav-tab {homeMode === 'map' ? 'active' : ''}"
            on:click={handleMapTabClick}
            aria-selected={homeMode === 'map' && currentView === 'search'}
            role="tab"
          >
            <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 4L3.8 6.1v13.8L9 17.8l6 2.1 5.2-2.1V4.1L15 6.2 9 4z"></path>
              <path d="M9 4v13.8M15 6.2v13.7"></path>
            </svg>
            <span class="nav-label">Map</span>
          </button>
          <button
            class="nav-tab {currentView === 'alerts' ? 'active' : ''}"
            on:click={() => { currentView = 'alerts'; }}
            aria-selected={currentView === 'alerts'}
            role="tab"
          >
            <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3a6 6 0 0 0-6 6v3.5L4.3 16v1.5h15.4V16L18 12.5V9a6 6 0 0 0-6-6z"></path>
              <path d="M10 19a2 2 0 0 0 4 0"></path>
            </svg>
            <span class="nav-label">Alerts</span>
            {#if currentAlerts.length > 0}
              <span class="alert-badge">{currentAlerts.length}</span>
            {/if}
          </button>
        </nav>
        <div class="header-actions">
          <span
            class="live-pill"
            data-state={currentAlerts.length > 0 ? 'alert' : 'live'}
            aria-label={currentAlerts.length > 0 ? `${currentAlerts.length} active alerts` : 'Live service data'}
          >
            {#if currentAlerts.length > 0}
              <svg class="live-icon" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
              </svg>
              <span>{currentAlerts.length} alerts</span>
            {:else}
              <svg class="live-icon live-radar" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
                <circle cx="12" cy="12" r="2" fill="currentColor"/>
                <path d="M12 4a8 8 0 0 0-8 8h2a6 6 0 0 1 6-6 6 6 0 0 1 6 6h2a8 8 0 0 0-8-8z" fill="currentColor" opacity="0.6"/>
                <path d="M12 1a11 11 0 0 0-11 11h2a9 9 0 0 1 9-9 9 9 0 0 1 9 9h2A11 11 0 0 0 12 1z" fill="currentColor" opacity="0.3"/>
              </svg>
              <span>Live</span>
            {/if}
          </span>
          <a class="share-link" href="/share">
            <svg class="share-icon" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.15c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.44 9.31 6.73 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.73 0 1.44-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" fill="currentColor"/>
            </svg>
            <span>Share</span>
          </a>
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

        {#if showOnboardingHint && currentView === 'search' && !lastQuery}
          <section class="onboarding-hint" aria-label="First-time transit guidance">
            <div class="onboarding-copy">
              <p class="onboarding-kicker">First time here?</p>
              <h3>{onboardingHeadline}</h3>
              <p>{onboardingTip} Use one-tap workflows above for fastest results with less scrolling.</p>
              <p class="onboarding-why">{onboardingWhy}</p>
            </div>
            <div class="onboarding-actions">
              <button
                class="onboarding-primary"
                on:click={() => {
                  completeOnboarding(`onboarding_try_${onboardingPrimaryIntent}`);
                  void executeWorkflowIntent(onboardingPrimaryIntent);
                }}
              >
                {onboardingPrimaryAction}
              </button>
              <button class="onboarding-alt" on:click={() => void executeWorkflowIntent('map')}>Open map first</button>
              <button class="onboarding-dismiss" on:click={() => completeOnboarding('onboarding_got_it')}>Got it</button>
            </div>
          </section>
        {/if}
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
            <button
              class="setting-item"
              on:click={resetPersonalization}
              aria-label="Reset onboarding personalization"
            >
              ↺ Reset Personalization
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
      <main class="main-content" id="main-content">
    {#if currentView === 'search'}
      <!-- Search View -->
      <div class="search-view">
        <HomeSearchFlow
          searchPrinciples={searchPrinciples}
          workflowIntents={workflowIntents}
          journeyStep={journeyStep}
          quickQueries={quickQueries}
          isSearching={isSearching}
          lastQuery={lastQuery}
          searchError={searchError}
          routeInfoMessage={routeInfoMessage}
          onSearch={handleSearch}
          on:workflow={(event) => void executeWorkflowIntent(event.detail)}
        />

          {#if showPhase3Hub}
            <section class="feature-panel feature-panel-commute" aria-label="Commute Insights">
              <svelte:component this={Phase3Hub} sessionId={sessionId} onTrack={track} />
            </section>
          {/if}

          {#if showPhase4Hub}
            <section class="feature-panel feature-panel-trip" aria-label="Trip Planning">
              <svelte:component this={Phase4Hub} sessionId={sessionId} onTrack={track} />
            </section>
          {/if}

        <HomeResultsSection
          searchResults={searchResults}
          searchResultSummaryPills={searchResultSummaryPills}
          isSearching={isSearching}
          searchError={searchError}
          lastQuery={lastQuery}
          on:select={(event) => handleResultSelect(event.detail)}
        />

        <HomeMapBoardingPanels
          visible={searchResults.length > 0 && homeMode === 'map'}
          {highlightedAddress}
          {mapStopsWithRanking}
          {mapFocusStop}
          {mapFocusAddress}
          {TrackerWidgetComponent}
          {mapViewKey}
          {homeMapConfig}
          {boardingInsightsLoading}
          {boardingInsightsError}
          {boardingInsights}
          {isBoardingLegendCollapsed}
          on:panelready={handleMapPanelReady}
          on:legendready={handleBoardingLegendReady}
          on:openstop={(event) => openStopFromAddress(event.detail.stop, event.detail.address, event.detail.index)}
          on:openstopmap={(event) => openStopFromAddressOnMap(event.detail.stop, event.detail.address, event.detail.index)}
        />
      </div>
    {:else if currentView === 'stop' && selectedStop}
      <!-- Stop View -->
      <div class="view-header">
        <button class="back-button" on:click={goBack} aria-label="Back to search">
          ← Back
        </button>
      </div>
      <svelte:component this={StopView} stopId={selectedStop.stop_id} stopName={selectedStop.stop_name} />
    {:else if currentView === 'route' && selectedRoute}
      <!-- Route View -->
      <div class="view-header">
        <button class="back-button" on:click={goBack} aria-label="Back to search">
          ← Back
        </button>
      </div>
      <svelte:component this={RouteView} routeId={selectedRoute.route_id} routeName={selectedRoute.route_name} />
    {:else if currentView === 'vehicle' && selectedVehicle}
      <!-- Vehicle View -->
      <div class="view-header">
        <button class="back-button" on:click={goBack} aria-label="Back to search">
          ← Back
        </button>
      </div>
      <svelte:component this={VehicleView} vehicleId={selectedVehicle.vehicle_id} />
    {:else if currentView === 'alerts'}
      <!-- Alerts View -->
      <div class="view-header">
        <h1>System Alerts</h1>
        <button class="back-button" on:click={() => currentView = 'search'} aria-label="Back to search">
          ← Back
        </button>
      </div>
      <div class="alerts-view-container">
        <svelte:component this={AlertCenter} alerts={currentAlerts} />
      </div>
    {/if}
  </main>
  </div>

  <HomeMobileThumbNav
    isSearchListActive={currentView === 'search' && homeMode === 'list'}
    isSearchMapActive={currentView === 'search' && homeMode === 'map'}
    isAlertsActive={currentView === 'alerts'}
    alertsCount={currentAlerts.length}
    on:search={handleThumbNavSearch}
    on:map={handleThumbNavMap}
    on:alerts={handleThumbNavAlerts}
  />

  <HomeFooter />
</div>

