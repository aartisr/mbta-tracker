<script lang="ts">
  import { onMount } from 'svelte';
  import { createTrackerController } from './controller';
  import { getGlobalContainer, type ServiceContainer } from './services';
  import { DEFAULT_TRACKER_CONFIG } from './config';
  import { getAllStops } from './stops-api';
  import StopFinder from './StopFinder.svelte';
  import VehicleList from './VehicleList.svelte';
  import VehicleDetail from './VehicleDetail.svelte';
  import AlertsPanel from './AlertsPanel.svelte';
  import { addVehicleIcons } from './map-icons';
  import { toFeatureCollection, toStopFeatureCollection } from './map-utils';
  import { buildStopPopupHtml, buildStopPopupLoadingHtml, fetchStopPredictions, buildVehiclePopupHtml, buildClusterPopupHtml } from './popup-builders';

  const MBTA_API_KEY: string | undefined =
    typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_MBTA_API_KEY as string | undefined) : undefined;
  import { normalizeSearch, vehicleMatchesSearch } from './formatters';
  import { performanceMonitor, dataQualityMonitor, errorLogger, RequestDeduplicator } from './performance-metrics';
  import type { MBTAStop } from './geo-types';
  import type {
    ConnectionState,
    TrackerAlert,
    TrackerState,
    TrackerVehicle,
    TrackerWidgetConfig
  } from './types';

  export let config: TrackerWidgetConfig = DEFAULT_TRACKER_CONFIG;
  export let container: ServiceContainer | null = null;

  const serviceContainer = container ?? getGlobalContainer();
  const controller = createTrackerController(config, serviceContainer);
  const stateStore = controller.state;
  const connectionStore = controller.connection;
  const selectedVehicleIdStore = controller.selectedVehicleId;

  let mapContainer: HTMLDivElement | null = null;
  let map: import('maplibre-gl').Map | null = null;
  let stopPopup: import('maplibre-gl').Popup | null = null;
  let vehiclePopup: import('maplibre-gl').Popup | null = null;
  let mapSourceReady = false;
  let mapReady = false;
  let mapLoadError: string | null = null;
  let mapStopHint = 'Zoom in to street level to see nearby stops.';
  let searchStatus: string | null = null;
  let vehicleFilterQuery = '';
  let vehicleEmptyMessage = 'No vehicles match the current filters.';
  let reducedMotion = false;
  let isMapExpanded = false;
  let showMapDetails = false;
  let selectedMode: 'all' | 'bus' | 'subway' | 'commuter-rail' | 'ferry' = 'all';
  let isRecenterActive = false;
  let isDarkMode = false;
  let isMobileBottomSheetExpanded = false;
  let lastVehicleSwipedIndex = 0;
  let isOffline = false;
  let lastDataRefresh = new Date();
  let dataFreshnessMs = 0;
  let isLoadingData = false;
  let dataQualityScore = 100;
  let activeRequestCount = 0;
  let requestDeduplicationMap = new Map<string, Promise<any>>();
  let searchTerm = '';
  let viewMode: 'map' | 'stops' = 'map';
  let shareViewLabel = 'Share current view';
  let pendingSharedQuery: string | null = null;
  let unsubscribeState: (() => void) | null = null;
  let unsubscribeConnection: (() => void) | null = null;
  let currentState: TrackerState = {
    vehicles: [],
    trips: [],
    alerts: [],
    totalUpdates: 0,
    lastUpdatedAt: null,
    selectedVehicleId: null
  };
  let connection: ConnectionState = {
    status: 'idle',
    retryInSeconds: 0,
    lastError: null,
    lastOpenedAt: null
  };
  let visibleVehicles: TrackerVehicle[] = [];
  let visibleAlerts: TrackerAlert[] = [];
  let selectedVehicleRecord: TrackerVehicle | null = null;
  let selectedStopId: string | null = null;
  let ferryVehicleCount = 0;
  let statusText = 'Realtime idle';
  let lastUpdatedLabel = 'Waiting for first realtime update';
  let activeModesLabel = 'No active modes yet';
  let headlineAlert: TrackerAlert | null = null;
  let previewVehicleId: string | null = null;
  let previewSource: 'map' | 'panel' | null = null;

  const emptyGeoJson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: []
  };

  function focusedAddressFeatureCollection(): GeoJSON.FeatureCollection {
    if (!config.focusAddress) {
      return emptyGeoJson;
    }

    const confidence = Number.isFinite(config.focusAddress.confidence)
      ? Math.max(0, Math.min(1, config.focusAddress.confidence))
      : 0.5;

    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [config.focusAddress.lon, config.focusAddress.lat]
          },
          properties: {
            label: config.focusAddress.label,
            confidence
          }
        }
      ]
    };
  }

  function previewFeatureCollection(vehicle: TrackerVehicle | null): GeoJSON.FeatureCollection {
    if (!vehicle) {
      return emptyGeoJson;
    }

    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [vehicle.lon, vehicle.lat]
          },
          properties: {
            id: vehicle.id
          }
        }
      ]
    };
  }

  const STREET_LEVEL_ZOOM = 15;
  const MAX_STOPS_ON_MAP = 350;
  let allStops: MBTAStop[] = [];
  let resizeFrame: number | null = null;

  function scheduleMapResize() {
    if (!map) {
      return;
    }

    if (resizeFrame !== null) {
      window.cancelAnimationFrame(resizeFrame);
    }

    resizeFrame = window.requestAnimationFrame(() => {
      if (map && typeof map.resize === 'function') {
        map.resize();
      }
      resizeFrame = null;
    });
  }

  function toggleMapExpanded() {
    if (viewMode !== 'map') {
      viewMode = 'map';
    }

    isMapExpanded = !isMapExpanded;
    scheduleMapResize();
  }

  function toggleMapDetails() {
    if (viewMode !== 'map') {
      viewMode = 'map';
    }

    showMapDetails = !showMapDetails;
    scheduleMapResize();
  }

  function setViewMode(mode: 'map' | 'stops') {
    viewMode = mode;

    if (mode !== 'map' && isMapExpanded) {
      isMapExpanded = false;
    }

    if (mode !== 'map' && showMapDetails) {
      showMapDetails = false;
    }

    scheduleMapResize();
  }

  function recenterMap() {
    if (!map) {
      return;
    }

    isRecenterActive = true;
    let geolocationTimeoutId: number | null = null;

    try {
      // Try to get user location first with strict timeout
      if (navigator.geolocation) {
        // Set a hard timeout to fallback after 3s
        geolocationTimeoutId = window.setTimeout(() => {
          triggerHaptic(5);
          // Fallback to default center on timeout
          if (reducedMotion) {
            map?.jumpTo({ center: config.center, zoom: config.zoom });
          } else {
            map?.easeTo({ center: config.center, zoom: config.zoom, duration: 600 });
          }
          isRecenterActive = false;
        }, 3000);

        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (geolocationTimeoutId !== null) {
              window.clearTimeout(geolocationTimeoutId);
            }
            const { latitude, longitude, accuracy } = position.coords;
            triggerHaptic(10);
            // Accuracy > 50m is considered good; > 500m shows warning
            if (accuracy > 500) {
              console.warn(`⚠ Geolocation accuracy is low: ${Math.round(accuracy)}m`);
            }
            if (reducedMotion) {
              map?.jumpTo({ center: [longitude, latitude], zoom: Math.max(map?.getZoom?.() ?? 13, 13) });
            } else {
              map?.easeTo({ center: [longitude, latitude], zoom: Math.max(map?.getZoom?.() ?? 13, 13), duration: 600 });
            }
            isRecenterActive = false;
          },
          (error) => {
            if (geolocationTimeoutId !== null) {
              window.clearTimeout(geolocationTimeoutId);
            }
            triggerHaptic(5);
            console.warn(`Geolocation error: ${error.message}. Using default center.`);
            // Fallback to default center on error
            if (reducedMotion) {
              map?.jumpTo({ center: config.center, zoom: config.zoom });
            } else {
              map?.easeTo({ center: config.center, zoom: config.zoom, duration: 600 });
            }
            isRecenterActive = false;
          },
          { timeout: 3000, maximumAge: 60000, enableHighAccuracy: false }
        );
      } else {
        // Geolocation not supported
        triggerHaptic(5);
        if (reducedMotion) {
          map?.jumpTo({ center: config.center, zoom: config.zoom });
        } else {
          map?.easeTo({ center: config.center, zoom: config.zoom, duration: 600 });
        }
        isRecenterActive = false;
      }
    } catch (error) {
      triggerHaptic([100, 50, 100]);
      console.error('Recenter error:', error);
      isRecenterActive = false;
    }
  }

  function triggerHaptic(duration: number | number[] = 20) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(duration);
      } catch {
        // Haptics not supported
      }
    }
  }

  /**
   * Deduplicates and caches identical concurrent requests.
   * Returns the same promise for identical in-flight requests.
   * Significantly reduces redundant API calls during network races.
   */
  function dedupedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    if (requestDeduplicationMap.has(key)) {
      return requestDeduplicationMap.get(key)!;
    }

    const promise = fetcher().finally(() => {
      requestDeduplicationMap.delete(key);
    });

    requestDeduplicationMap.set(key, promise);
    return promise;
  }

  function updateDataFreshness() {
    const now = new Date();
    dataFreshnessMs = now.getTime() - lastDataRefresh.getTime();

    // Quality score: 100 if <30s fresh, degrades to 0 at 5min+ stale
    dataQualityScore = Math.max(0, 100 - Math.floor((dataFreshnessMs / 1000 / 300) * 100));
  }

  function markDataRefresh() {
    lastDataRefresh = new Date();
    dataFreshnessMs = 0;
    dataQualityScore = 100;
  }

  function formatFreshnessLabel(): string {
    const seconds = Math.floor(dataFreshnessMs / 1000);
    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }

  function getDataQualityEmoji(): string {
    if (dataQualityScore >= 90) return '✓';
    if (dataQualityScore >= 70) return '⚠';
    return '✗';
  }

  function swipeVehicle(direction: 'next' | 'prev') {
    if (visibleVehicles.length === 0) {
      return;
    }

    let newIndex: number;
    if (direction === 'next') {
      newIndex = (lastVehicleSwipedIndex + 1) % visibleVehicles.length;
    } else {
      newIndex = (lastVehicleSwipedIndex - 1 + visibleVehicles.length) % visibleVehicles.length;
    }

    lastVehicleSwipedIndex = newIndex;
    selectedVehicle(visibleVehicles[newIndex]);
    triggerHaptic(15);
  }

  function formatElapsedTime(timestamp: number | null): string {
    if (!timestamp) {
      return 'Waiting for feed';
    }

    const deltaSeconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
    if (deltaSeconds < 10) {
      return 'Moments ago';
    }

    if (deltaSeconds < 60) {
      return `${deltaSeconds}s ago`;
    }

    const deltaMinutes = Math.round(deltaSeconds / 60);
    if (deltaMinutes < 60) {
      return `${deltaMinutes}m ago`;
    }

    const deltaHours = Math.round(deltaMinutes / 60);
    return `${deltaHours}h ago`;
  }

  function summarizeModes(vehicles: TrackerVehicle[]): string {
    const labels: string[] = [];

    if (vehicles.some((vehicle) => vehicle.mode === 'subway')) labels.push('subway');
    if (vehicles.some((vehicle) => vehicle.mode === 'bus')) labels.push('bus');
    if (vehicles.some((vehicle) => vehicle.mode === 'commuter-rail')) labels.push('rail');
    if (vehicles.some((vehicle) => vehicle.mode === 'ferry')) labels.push('ferry');

    if (labels.length === 0) {
      return 'No active modes yet';
    }

    return `Active modes: ${labels.join(', ')}`;
  }

  function applySharedViewFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const view = params.get('view');
    const query = normalizeSearch(params.get('q') ?? '');

    if (mode === 'all' || mode === 'bus' || mode === 'subway' || mode === 'commuter-rail' || mode === 'ferry') {
      selectedMode = mode;
    }

    if (view === 'map' || view === 'stops') {
      viewMode = view;
    }

    if (query) {
      searchTerm = query;
      pendingSharedQuery = query;
    }
  }

  function buildShareUrl(): string {
    const url = new URL(window.location.href);

    const center = map?.getCenter?.();
    const centerLon = typeof center?.lng === 'number' ? center.lng : config.center[0];
    const centerLat = typeof center?.lat === 'number' ? center.lat : config.center[1];
    const zoom = typeof map?.getZoom?.() === 'number' ? map.getZoom() : config.zoom;

    url.searchParams.set('center', `${centerLon.toFixed(5)},${centerLat.toFixed(5)}`);
    url.searchParams.set('zoom', zoom.toFixed(2));

    if (selectedMode === 'all') {
      url.searchParams.delete('mode');
    } else {
      url.searchParams.set('mode', selectedMode);
    }

    if (viewMode === 'map') {
      url.searchParams.delete('view');
    } else {
      url.searchParams.set('view', viewMode);
    }

    const query = normalizeSearch(searchTerm);
    if (query) {
      url.searchParams.set('q', query);
    } else {
      url.searchParams.delete('q');
    }

    return url.toString();
  }

  async function shareCurrentView() {
    const shareUrl = buildShareUrl();
    shareViewLabel = '';

    if (navigator.share) {
      try {
        await navigator.share({
          title: config.title,
          text: 'Track this live MBTA view',
          url: shareUrl
        });
        shareViewLabel = 'Shared';
      } catch {
        shareViewLabel = 'Share cancelled';
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        shareViewLabel = 'Link copied';
      } catch {
        shareViewLabel = 'Copy failed';
      }
    }

    window.setTimeout(() => {
      shareViewLabel = 'Share current view';
    }, 2200);
  }

  function updateMap(vehicles: TrackerVehicle[]) {
    if (!mapSourceReady || !map) {
      return;
    }

    const source = map.getSource('vehicles') as import('maplibre-gl').GeoJSONSource | undefined;
    source?.setData(toFeatureCollection(vehicles));
  }

  function getVehicleFromFeature(feature: GeoJSON.Feature): TrackerVehicle | null {
    const properties = (feature.properties ?? {}) as { id?: string };
    const id = properties.id;
    if (!id) {
      return null;
    }

    return currentState.vehicles.find((vehicle) => vehicle.id === id) ?? null;
  }

  function updateMapStops() {
    if (!mapSourceReady || !map) {
      return;
    }

    const source = map.getSource('stops') as import('maplibre-gl').GeoJSONSource | undefined;
    if (!source) {
      return;
    }

    const zoom = map.getZoom();
    if (zoom < STREET_LEVEL_ZOOM) {
      mapStopHint = 'Zoom in to street level to see nearby stops.';
      source.setData(emptyGeoJson);
      return;
    }

    const bounds = map.getBounds();
    const visibleStops = allStops
      .filter((stop) => bounds.contains([stop.longitude, stop.latitude]))
      .slice(0, MAX_STOPS_ON_MAP);

    if (visibleStops.length === 0) {
      mapStopHint = 'No stops in this view. Pan slightly to find nearby stops.';
      source.setData(emptyGeoJson);
      return;
    }

    mapStopHint = `Showing ${visibleStops.length} nearby stops`;
    source.setData(toStopFeatureCollection(visibleStops));
  }

  async function loadMapStops() {
    try {
      allStops = await getAllStops();
      updateMapStops();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load MBTA stops.';
      mapStopHint = message;
    }
  }

  function zoomToVehicles(vehicles: TrackerVehicle[]): void {
    if (!map || vehicles.length === 0) {
      return;
    }

    if (vehicles.length === 1) {
      const vehicle = vehicles[0];
      selectedVehicle(vehicle);
      return;
    }

    let minLon = Infinity;
    let minLat = Infinity;
    let maxLon = -Infinity;
    let maxLat = -Infinity;

    for (const vehicle of vehicles) {
      minLon = Math.min(minLon, vehicle.lon);
      minLat = Math.min(minLat, vehicle.lat);
      maxLon = Math.max(maxLon, vehicle.lon);
      maxLat = Math.max(maxLat, vehicle.lat);
    }

    if (!Number.isFinite(minLon) || !Number.isFinite(minLat) || !Number.isFinite(maxLon) || !Number.isFinite(maxLat)) {
      return;
    }

    const bounds: [[number, number], [number, number]] = [
      [minLon, minLat],
      [maxLon, maxLat]
    ];

    if (reducedMotion) {
      map.fitBounds(bounds, { padding: 90, maxZoom: 14, duration: 0 });
    } else {
      map.fitBounds(bounds, { padding: 90, maxZoom: 14, duration: 700 });
    }

    controller.selectVehicle(vehicles[0].id);
  }

  async function geocodePlace(query: string): Promise<{ lon: number; lat: number; label: string } | null> {
    const normalized = normalizeSearch(query);
    if (!normalized) {
      return null;
    }

    const abortController = new AbortController();
    const timeout = window.setTimeout(() => abortController.abort(), 5000);

    try {
      const params = new URLSearchParams({
        q: normalized,
        format: 'jsonv2',
        limit: '1',
        addressdetails: '0'
      });

      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        signal: abortController.signal,
        headers: {
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        return null;
      }

      const results = (await response.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>;
      const first = results[0];
      if (!first?.lat || !first?.lon) {
        return null;
      }

      const lat = Number(first.lat);
      const lon = Number(first.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return null;
      }

      return { lat, lon, label: first.display_name ?? normalized };
    } catch {
      return null;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function navigateSearch(): Promise<void> {
    const query = normalizeSearch(searchTerm);
    searchStatus = null;

    if (!query) {
      return;
    }

    const vehicleMatches = currentState.vehicles.filter((vehicle) => {
      const matchesMode = selectedMode === 'all' || vehicle.mode === selectedMode;
      return matchesMode && vehicleMatchesSearch(vehicle, query);
    });

    if (vehicleMatches.length > 0) {
      viewMode = 'map';
      zoomToVehicles(vehicleMatches);
      searchStatus =
        vehicleMatches.length === 1
          ? `Centered on vehicle ${vehicleMatches[0].id}.`
          : `Showing ${vehicleMatches.length} matching vehicles.`;
      return;
    }

    const place = await geocodePlace(query);
    if (place && map) {
      viewMode = 'map';
      if (reducedMotion) {
        map.jumpTo({ center: [place.lon, place.lat], zoom: Math.max(map.getZoom(), 13.5) });
      } else {
        map.easeTo({ center: [place.lon, place.lat], zoom: Math.max(map.getZoom(), 13.5), duration: 800 });
      }
      searchStatus = `Showing ${place.label}.`;
      return;
    }

    searchStatus = 'No matching vehicles or places found.';
  }

  function isVisible(vehicle: TrackerVehicle) {
    const matchesMode = selectedMode === 'all' || vehicle.mode === selectedMode;
    const query = vehicleFilterQuery;
    const matchesSearch = query.length === 0 || vehicleMatchesSearch(vehicle, query);

    return matchesMode && matchesSearch;
  }

  function selectedVehicle(vehicle: TrackerVehicle) {
    controller.selectVehicle(vehicle.id);
    if (!map) {
      return;
    }

    if (reducedMotion) {
      map.jumpTo({ center: [vehicle.lon, vehicle.lat], zoom: Math.max(map.getZoom(), 13) });
      return;
    }

    map.easeTo({ center: [vehicle.lon, vehicle.lat], zoom: Math.max(map.getZoom(), 13), duration: 700 });
  }

  function setVehiclePreview(vehicle: TrackerVehicle | null, source: 'map' | 'panel') {
    previewVehicleId = vehicle?.id ?? null;
    previewSource = vehicle ? source : null;

    if (!map || !mapSourceReady) {
      return;
    }

    const previewLayerSource = map.getSource('vehicle-preview') as import('maplibre-gl').GeoJSONSource | undefined;
    previewLayerSource?.setData(previewFeatureCollection(vehicle));

    if (vehicle) {
      vehiclePopup?.setLngLat([vehicle.lon, vehicle.lat]).setHTML(buildVehiclePopupHtml(vehicle)).addTo(map);
      return;
    }

    vehiclePopup?.remove();
  }

  function previewVehicleFromPanel(event: CustomEvent<{ vehicle: TrackerVehicle }>) {
    const vehicle = event.detail?.vehicle;
    if (!vehicle) {
      return;
    }

    setVehiclePreview(vehicle, 'panel');
  }

  function clearPreviewFromPanel() {
    if (previewSource === 'panel') {
      setVehiclePreview(null, 'panel');
    }
  }

  async function focusStopOnMap(stopId: string) {
    viewMode = 'map';

    if (allStops.length === 0) {
      allStops = await getAllStops();
    }

    const selectedStop = allStops.find((stop) => stop.id === stopId);
    if (!selectedStop || !map) {
      return;
    }

    if (reducedMotion) {
      map.jumpTo({
        center: [selectedStop.longitude, selectedStop.latitude],
        zoom: Math.max(map.getZoom(), STREET_LEVEL_ZOOM)
      });
    } else {
      map.easeTo({
        center: [selectedStop.longitude, selectedStop.latitude],
        zoom: Math.max(map.getZoom(), STREET_LEVEL_ZOOM),
        duration: 700
      });
    }

    updateMapStops();
  }

  onMount(() => {
    let cancelled = false;
    const handleWindowResize = () => scheduleMapResize();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMapExpanded) {
        isMapExpanded = false;
        scheduleMapResize();
      }
    };

    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleDarkModeChange = (e: MediaQueryListEvent) => {
      isDarkMode = e.matches;
    };

    // Network status monitoring for honesty
    const handleOnline = () => {
      isOffline = false;
      triggerHaptic(10);
    };
    const handleOffline = () => {
      isOffline = true;
      triggerHaptic([100, 50, 100]);
    };

    // Data freshness update loop (every 5 seconds)
    const freshnessInterval = setInterval(() => {
      updateDataFreshness();
    }, 5000);

    // Performance monitoring (logs to console in dev)
    const perfObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 1000 && typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          console.warn(`⚠ Slow operation: ${entry.name} took ${Math.round(entry.duration)}ms`);
        }
      }
    });

    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        perfObserver.observe({ entryTypes: ['measure', 'navigation'] });
      } catch {
        // Not supported
      }
    }

    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    isDarkMode = darkModeQuery.matches;
    isOffline = !navigator.onLine;
    applySharedViewFromUrl();
    controller.start();
    markDataRefresh();

    window.addEventListener('resize', handleWindowResize, { passive: true });
    window.addEventListener('orientationchange', handleWindowResize, { passive: true });
    window.addEventListener('keydown', handleEscape);
    window.addEventListener('online', handleOnline, { passive: true });
    window.addEventListener('offline', handleOffline, { passive: true });
    darkModeQuery.addEventListener('change', handleDarkModeChange);

    unsubscribeState = stateStore.subscribe((snapshot) => {
      currentState = snapshot;
      updateMap(snapshot.vehicles.filter(isVisible));
    });
    unsubscribeConnection = connectionStore.subscribe((snapshot) => {
      connection = snapshot;
    });

    const bootstrapMap = async () => {
      if (!mapContainer) {
        mapLoadError = 'Map container is unavailable.';
        return;
      }

      try {
        const { default: maplibregl } = await import('maplibre-gl');
        if (cancelled) {
          return;
        }

        map = new maplibregl.Map({
          container: mapContainer,
          style: config.mapStyle,
          center: config.center,
          zoom: config.zoom,
          attributionControl: false
        });

        map.addControl(new maplibregl.NavigationControl({ showCompass: false, showZoom: true, visualizePitch: false }), 'bottom-right');

        if (typeof maplibregl.ScaleControl === 'function') {
          map.addControl(new maplibregl.ScaleControl({ maxWidth: 140, unit: 'imperial' }), 'bottom-left');
        }

        map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

        map.on('error', (event) => {
          if (!mapReady && !mapLoadError) {
            mapLoadError = event.error instanceof Error ? event.error.message : 'The map layer failed to load.';
          }
        });

        map.on('load', () => {
          mapLoadError = null;
          mapReady = true;
          mapSourceReady = true;
          stopPopup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, className: 'mbta-stop-popup' });
          vehiclePopup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            className: 'mbta-vehicle-popup',
            offset: 14
          });
          map?.addSource('vehicles', {
            type: 'geojson',
            data: emptyGeoJson,
            cluster: true,
            clusterRadius: 50,
            clusterMaxZoom: 16,
            clusterProperties: {
              // Allow aggregation of vehicle properties
            }
          });
          map?.addSource('vehicle-preview', { type: 'geojson', data: emptyGeoJson });
          map?.addSource('stops', { type: 'geojson', data: emptyGeoJson });
          map?.addSource('focused-address', {
            type: 'geojson',
            data: focusedAddressFeatureCollection()
          });

          const addVehicleSymbolLayer = () => {
            if (!map || map.getLayer('vehicle-points')) {
              return;
            }

            map.addLayer({
              id: 'vehicle-points',
              type: 'symbol',
              source: 'vehicles',
              filter: ['!', ['has', 'point_count']],
              layout: {
                'icon-image': ['get', 'icon'],
                'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.54, 15, 0.74, 18, 0.92],
                'icon-rotate': ['coalesce', ['to-number', ['get', 'bearing']], 0],
                'icon-rotation-alignment': 'map',
                'icon-pitch-alignment': 'map',
                'icon-allow-overlap': true,
                'icon-ignore-placement': true
              }
            });

            if (map.getLayer('vehicle-point-fallback')) {
              map.removeLayer('vehicle-point-fallback');
            }
          };

          void addVehicleIcons(map as import('maplibre-gl').Map, maplibregl)
            .then(() => {
              addVehicleSymbolLayer();
            })
            .catch((error) => {
              if (map?.getLayer('vehicle-point-fallback')) {
                map.setLayoutProperty('vehicle-point-fallback', 'visibility', 'visible');
              }
              console.warn('Vehicle icons unavailable; continuing without them.', error);
            });

          // Vehicle cluster circles with progressive sizing
          map?.addLayer({
            id: 'vehicle-clusters',
            type: 'circle',
            source: 'vehicles',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': [
                'step',
                ['get', 'point_count'],
                '#3b82f6', // 2-5 vehicles: blue
                6,
                '#06b6d4', // 6-20: cyan
                20,
                '#f59e0b', // 20-50: amber
                50,
                '#ef4444'  // 50+ vehicles: red (warning)
              ],
              'circle-opacity': [
                'interpolate',
                ['linear'],
                ['get', 'point_count'],
                2,
                0.7,
                100,
                0.9
              ],
              'circle-radius': [
                'step',
                ['get', 'point_count'],
                18,   // 2-5 vehicles
                6,
                22,   // 6-20
                20,
                28,   // 20-50
                50,
                36,   // 50-100
                100,
                44    // 100+ vehicles
              ],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff'
            }
          });

          // Cluster count text labels
          map?.addLayer({
            id: 'vehicle-cluster-count',
            type: 'symbol',
            source: 'vehicles',
            filter: ['has', 'point_count'],
            layout: {
              'text-field': ['get', 'point_count_abbreviated'],
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
              'text-size': [
                'step',
                ['get', 'point_count'],
                12,   // 2-5 vehicles
                20,
                14,   // 20+
                50,
                16    // 50+
              ],
              'text-allow-overlap': true,
              'text-ignore-placement': true
            },
            paint: {
              'text-color': '#ffffff',
              'text-halo-color': '#000000',
              'text-halo-width': 1
            }
          });
          map?.addLayer({
            id: 'vehicle-point-fallback',
            type: 'circle',
            source: 'vehicles',
            filter: ['!', ['has', 'point_count']],
            layout: {
              visibility: 'none'
            },
            paint: {
              'circle-color': [
                'match',
                ['get', 'mode'],
                'subway',
                '#003DA5',
                'commuter-rail',
                '#80276C',
                'ferry',
                '#0284C7',
                '#FFC72C'
              ],
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3.5, 15, 5.5, 18, 7],
              'circle-stroke-color': [
                'match',
                ['get', 'mode'],
                'bus',
                '#0f172a',
                '#ffffff'
              ],
              'circle-stroke-width': [
                'match',
                ['get', 'mode'],
                'bus',
                2.2,
                1.2
              ],
              'circle-opacity': 0.95
            }
          });

          map?.addLayer({
            id: 'vehicle-preview-ring',
            type: 'circle',
            source: 'vehicle-preview',
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 10, 15, 15, 18, 19],
              'circle-color': 'rgba(59, 130, 246, 0.15)',
              'circle-stroke-color': '#2563eb',
              'circle-stroke-width': 2.2,
              'circle-opacity': 1
            }
          });

          map?.addLayer({
            id: 'focused-address-glow',
            type: 'circle',
            source: 'focused-address',
            paint: {
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['coalesce', ['get', 'confidence'], 0.5],
                0,
                ['interpolate', ['linear'], ['zoom'], 10, 24, 14, 34, 17, 46],
                1,
                ['interpolate', ['linear'], ['zoom'], 10, 14, 14, 22, 17, 32]
              ],
              'circle-color': 'rgba(37, 99, 235, 0.07)',
              'circle-stroke-color': 'rgba(37, 99, 235, 0.24)',
              'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 10, 0.8, 16, 1.6],
              'circle-opacity': 1
            }
          });

          map?.addLayer({
            id: 'focused-address-halo',
            type: 'circle',
            source: 'focused-address',
            paint: {
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['coalesce', ['get', 'confidence'], 0.5],
                0,
                ['interpolate', ['linear'], ['zoom'], 10, 10, 14, 14, 17, 18],
                1,
                ['interpolate', ['linear'], ['zoom'], 10, 8, 14, 11, 17, 14]
              ],
              'circle-color': 'rgba(37, 99, 235, 0.14)',
              'circle-stroke-color': 'rgba(255, 255, 255, 0.72)',
              'circle-stroke-width': 1,
              'circle-opacity': 1
            }
          });

          map?.addLayer({
            id: 'focused-address-point',
            type: 'circle',
            source: 'focused-address',
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 4, 15, 6.2, 18, 8],
              'circle-color': '#2563eb',
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 1.8,
              'circle-opacity': 0.95
            }
          });

          map?.addLayer({
            id: 'focused-address-label',
            type: 'symbol',
            source: 'focused-address',
            layout: {
              'text-field': [
                'case',
                ['>=', ['coalesce', ['get', 'confidence'], 0.5], 0.75],
                'Search location',
                ['>=', ['coalesce', ['get', 'confidence'], 0.5], 0.5],
                'Likely search area',
                'Approx search area'
              ],
              'text-size': 11,
              'text-offset': [0, 1.45],
              'text-anchor': 'top',
              'text-allow-overlap': true,
              'text-ignore-placement': true
            },
            paint: {
              'text-color': '#2563eb',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1.4,
              'text-opacity': 0.9
            }
          });

          // Hover glow ring — reacts to feature-state
          map?.addLayer({
            id: 'stop-hover',
            type: 'circle',
            source: 'stops',
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], STREET_LEVEL_ZOOM, 17, 18, 24],
              'circle-color': 'rgba(14, 165, 233, 0)',
              'circle-stroke-color': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                '#0ea5e9',
                'rgba(0,0,0,0)'
              ],
              'circle-stroke-width': 2.8,
              'circle-opacity': 0
            }
          });

          // Pin icon layer — replaces old plain circle
          map?.addLayer({
            id: 'stop-points',
            type: 'symbol',
            source: 'stops',
            layout: {
              'icon-image': ['get', 'icon'],
              'icon-size': ['interpolate', ['linear'], ['zoom'], STREET_LEVEL_ZOOM, 0.55, 17, 0.78, 19, 1.0],
              'icon-allow-overlap': false,
              'icon-anchor': 'bottom',
              'text-field': ['step', ['zoom'], '', STREET_LEVEL_ZOOM + 1.5, ['get', 'name']],
              'text-size': 11,
              'text-offset': [0, 0.4],
              'text-anchor': 'top',
              'text-allow-overlap': false,
              'text-optional': true,
              'symbol-sort-key': ['get', 'wheelchairAccessible']
            },
            paint: {
              'text-color': '#0f172a',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1.5,
              'icon-opacity': 1
            }
          });

          map?.on('zoomend', () => {
            updateMapStops();
          });
          map?.on('moveend', updateMapStops);

          let hoveredStopFeatureId: number | string | null = null;

          map?.on('mousemove', 'stop-points', (event) => {
            if (!map) return;
            map.getCanvas().style.cursor = 'pointer';
            const feature = event.features?.[0];
            if (!feature) return;
            const fid = feature.id as number | string;
            if (hoveredStopFeatureId !== null && hoveredStopFeatureId !== fid) {
              map.setFeatureState({ source: 'stops', id: hoveredStopFeatureId }, { hover: false });
            }
            hoveredStopFeatureId = fid;
            map.setFeatureState({ source: 'stops', id: fid }, { hover: true });
          });

          map?.on('mouseleave', 'stop-points', () => {
            if (!map) return;
            map.getCanvas().style.cursor = '';
            if (hoveredStopFeatureId !== null) {
              map.setFeatureState({ source: 'stops', id: hoveredStopFeatureId }, { hover: false });
              hoveredStopFeatureId = null;
            }
          });

          map?.on('mouseenter', 'vehicle-points', (event) => {
            if (!map) {
              return;
            }

            map.getCanvas().style.cursor = 'pointer';
            const feature = event.features?.[0];
            if (!feature || feature.geometry.type !== 'Point') {
              return;
            }

            const vehicle = getVehicleFromFeature(feature);
            if (!vehicle) {
              return;
            }

            setVehiclePreview(vehicle, 'map');
          });

          map?.on('mouseenter', 'vehicle-clusters', (event) => {
            if (!map) {
              return;
            }

            map.getCanvas().style.cursor = 'pointer';
            const feature = event.features?.[0];
            if (!feature || feature.geometry.type !== 'Point') {
              return;
            }

            const [lon, lat] = feature.geometry.coordinates as [number, number];
            const pointCount = Number((feature.properties as { point_count?: number })?.point_count ?? 0);
            vehiclePopup?.setLngLat([lon, lat]).setHTML(buildClusterPopupHtml(pointCount)).addTo(map);
          });

          map?.on('mousemove', 'vehicle-points', (event) => {
            if (!map) {
              return;
            }

            const feature = event.features?.[0];
            if (!feature || feature.geometry.type !== 'Point') {
              return;
            }

            const vehicle = getVehicleFromFeature(feature);
            if (!vehicle) {
              return;
            }

            setVehiclePreview(vehicle, 'map');
          });

          map?.on('mouseleave', 'vehicle-points', () => {
            if (map) {
              map.getCanvas().style.cursor = '';
            }
            if (previewSource === 'map') {
              setVehiclePreview(null, 'map');
            }
          });

          map?.on('mouseleave', 'vehicle-clusters', () => {
            if (map) {
              map.getCanvas().style.cursor = '';
            }
            if (previewSource === 'map') {
              setVehiclePreview(null, 'map');
            }
            vehiclePopup?.remove();
          });

          map?.on('click', 'vehicle-clusters', (event) => {
            if (!map) {
              return;
            }

            const feature = event.features?.[0];
            if (!feature || feature.geometry.type !== 'Point') {
              return;
            }

            const clusterId = Number((feature.properties as { cluster_id?: number })?.cluster_id);
            if (!Number.isFinite(clusterId)) {
              return;
            }

            const source = map.getSource('vehicles') as import('maplibre-gl').GeoJSONSource | undefined;
            const [lon, lat] = feature.geometry.coordinates as [number, number];
            void source
              ?.getClusterExpansionZoom(clusterId)
              .then((zoom) => {
                if (reducedMotion) {
                  map?.jumpTo({ center: [lon, lat], zoom });
                } else {
                  map?.easeTo({ center: [lon, lat], zoom, duration: 500 });
                }
              })
              .catch(() => undefined);
          });

          map?.on('click', 'vehicle-points', (event) => {
            const feature = event.features?.[0];
            if (!feature || feature.geometry.type !== 'Point') {
              return;
            }

            const vehicle = getVehicleFromFeature(feature);
            if (!vehicle) {
              return;
            }

            setVehiclePreview(null, 'map');
            selectedVehicle(vehicle);
          });

          map?.on('click', 'stop-points', (event) => {
            const feature = event.features?.[0];
            if (!feature || !feature.geometry || feature.geometry.type !== 'Point') {
              return;
            }

            const [lon, lat] = feature.geometry.coordinates as [number, number];
            const properties = (feature.properties ?? {}) as {
              id?: string;
              name?: string;
              wheelchairAccessible?: number;
            };

            const stop: MBTAStop = {
              id: properties.id ?? 'Unknown',
              name: properties.name ?? 'Unnamed stop',
              latitude: lat,
              longitude: lon,
              wheelchairAccessible: properties.wheelchairAccessible === 1
            };

            // Show loading state immediately — fetch real MBTA predictions async
            stopPopup?.setLngLat([lon, lat]).setHTML(buildStopPopupLoadingHtml(stop)).addTo(map as import('maplibre-gl').Map);
            void fetchStopPredictions(stop.id, MBTA_API_KEY).then((arrivals) => {
              if (stopPopup?.isOpen()) {
                stopPopup.setHTML(buildStopPopupHtml(stop, arrivals));
              }
            });
          });

          updateMap(currentState.vehicles.filter(isVisible));
          void loadMapStops();

          if (pendingSharedQuery) {
            pendingSharedQuery = null;
            void navigateSearch();
          }

          scheduleMapResize();
        });
      } catch (error) {
        mapLoadError = error instanceof Error ? error.message : 'Unable to initialize the live map.';
      }
    };

    void bootstrapMap();

    return () => {
      cancelled = true;
      unsubscribeState?.();
      unsubscribeConnection?.();
      controller.stop();
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('orientationchange', handleWindowResize);
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      darkModeQuery.removeEventListener('change', handleDarkModeChange);
      clearInterval(freshnessInterval);
      perfObserver.disconnect();
      requestDeduplicationMap.clear();
      document.body.classList.remove('map-expanded-lock');
      document.documentElement.classList.remove('map-expanded-lock');
      if (resizeFrame !== null) {
        window.cancelAnimationFrame(resizeFrame);
      }
      map?.remove();
      map = null;
      stopPopup = null;
      vehiclePopup = null;
    };
  });

  $: {
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('map-expanded-lock', isMapExpanded);
      document.documentElement.classList.toggle('map-expanded-lock', isMapExpanded);
      document.documentElement.classList.toggle('dark-mode', isDarkMode);
    }
  }

  $: {
    if (viewMode !== 'map' && isMapExpanded) {
      isMapExpanded = false;
    }
  }

  $: {
    viewMode;
    isMapExpanded;
    scheduleMapResize();
  }

  $: {
    if (visibleVehicles.length > 0 && selectedVehicleRecord) {
      const idx = visibleVehicles.findIndex((v) => v.id === selectedVehicleRecord?.id);
      if (idx >= 0) {
        lastVehicleSwipedIndex = idx;
      }
    }
  }

  $: {
    const query = normalizeSearch(searchTerm);
    if (query.length === 0) {
      vehicleFilterQuery = '';
    } else {
      const hasVehicleMatch = currentState.vehicles.some((vehicle) => {
        const matchesMode = selectedMode === 'all' || vehicle.mode === selectedMode;
        return matchesMode && vehicleMatchesSearch(vehicle, query);
      });
      vehicleFilterQuery = hasVehicleMatch ? query : '';
    }
  }
  $: visibleVehicles = currentState.vehicles.filter(isVisible);
  $: visibleAlerts = currentState.alerts.filter((alert) => selectedMode === 'all' || alert.severity !== 'unknown');
  $: if (searchStatus && normalizeSearch(searchTerm).length === 0) {
    searchStatus = null;
  }
  $: selectedVehicleRecord = visibleVehicles.find((vehicle) => vehicle.id === $selectedVehicleIdStore) ?? visibleVehicles[0] ?? null;
  $: selectedStopId = selectedVehicleRecord?.stopId ?? null;
  $: ferryVehicleCount = currentState.vehicles.filter((v) => v.mode === 'ferry').length;
  $: lastUpdatedLabel = formatElapsedTime(currentState.lastUpdatedAt);
  $: activeModesLabel = summarizeModes(visibleVehicles);
  $: headlineAlert = visibleAlerts.find((alert) => alert.severity === 'high') ?? visibleAlerts[0] ?? null;
  $: statusChipLabel =
    connection.status === 'open'
      ? 'Live connected'
      : connection.status === 'reconnecting' || connection.status === 'connecting'
        ? 'Connecting'
        : 'Worker unavailable';
  $: vehicleEmptyMessage =
    selectedMode === 'ferry'
      ? 'No live ferry vehicles are currently being reported by MBTA.'
      : 'No vehicles match the current filters.';
</script>

<div class:embedded-shell={config.embedded} class="tracker-shell">
  <header class="topbar">
    <div class="brand">
      <div class="eyebrow">MBTA · Realtime</div>
      <h1>{config.title}</h1>
      <p class="brand-subtitle">{config.subtitle}</p>
    </div>
    <div class="status-bar">
      <span class="live-dot" data-status={connection.status}></span>
      <span class="status-chip" data-status={connection.status}>{statusChipLabel}</span>
      <span class="status-summary" aria-label="Live connection summary">
        <span class="status-summary-item">{isOffline ? 'Offline' : 'Live'}</span>
        <span class="status-summary-sep" data-separator="freshness" aria-hidden="true">·</span>
        <span class="status-summary-item" data-summary="freshness">{formatFreshnessLabel()}</span>
        <span class="status-summary-sep" data-separator="count" aria-hidden="true">·</span>
        <span class="status-summary-item">{visibleVehicles.length} live</span>
      </span>
      {#if ferryVehicleCount > 0}
        <span class="ferry-badge" title="Live ferry vehicles">
          <span class="ferry-icon">⛴️</span>
          <span class="ferry-num">{ferryVehicleCount}</span>
        </span>
      {/if}
    </div>
  </header>

  {#if showMapDetails}
    <section class="mission-strip" aria-label="Live service summary">
      <div class="mission-copy">
        <strong>Track the network with less guesswork.</strong>
        <p>
          Nearby-first search, clearer live state, and a calmer control-room layout inspired by the strongest transit products on the web.
        </p>
      </div>
      <div class="mission-tags">
        <span>{activeModesLabel}</span>
        <span>{lastUpdatedLabel}</span>
        {#if headlineAlert}
          <span data-tone={headlineAlert.severity}>{headlineAlert.title}</span>
        {:else}
          <span data-tone="clear">No major alerts in view</span>
        {/if}
      </div>
    </section>

    <section class="insight-grid" aria-label="Realtime insight cards">
      <article class="insight-card insight-card-primary">
        <span class="insight-label">Live fleet</span>
        <strong>{visibleVehicles.length}</strong>
        <p>{activeModesLabel}</p>
      </article>
      <article class="insight-card">
        <span class="insight-label">Freshness</span>
        <strong>{lastUpdatedLabel}</strong>
        <p>{statusText}</p>
      </article>
      <article class="insight-card">
        <span class="insight-label">Alert lens</span>
        <strong>{visibleAlerts.length}</strong>
        <p>{headlineAlert?.title ?? 'No active disruptions currently surfaced.'}</p>
      </article>
    </section>

    <section class="quick-guide" aria-label="How to use the tracker">
      <span>Start with search if you know a place or route.</span>
      <span>Switch to Find Stops when you want a neighborhood answer.</span>
      <span>Use mode filters to cut straight to subway, rail, bus, or ferry.</span>
    </section>
  {/if}

  <div class="controls-row">
    <div class="view-toggle" role="group" aria-label="View mode">
      <button class:active={viewMode === 'map'} on:click={() => setViewMode('map')} class="view-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/></svg>
        Map
      </button>
      <button class:active={viewMode === 'stops'} on:click={() => setViewMode('stops')} class="view-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Find Stops
      </button>
      <button
        class:active={showMapDetails}
        type="button"
        class="view-btn details-toggle-btn"
        on:click={toggleMapDetails}
        aria-pressed={showMapDetails}
        aria-expanded={showMapDetails}
        aria-controls="map-details-panel"
        aria-label={showMapDetails ? 'Hide map details' : 'Show map details'}
      >
        <span>{showMapDetails ? 'Hide details' : 'Show details'}</span>
        <span class="details-toggle-icon" aria-hidden="true">{showMapDetails ? '−' : '+'}</span>
      </button>
    </div>

    {#if config.showSearch && viewMode === 'map'}
      <label class="search">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          bind:value={searchTerm}
          type="search"
          placeholder="Route, vehicle ID, street, or place — press Enter"
          on:keydown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void navigateSearch();
            }
          }}
        />
        {#if searchTerm}
          <button class="search-clear" on:click={() => { searchTerm = ''; searchStatus = null; }} aria-label="Clear search">✕</button>
        {/if}
      </label>
    {/if}

    <button class="share-view-btn" type="button" on:click={shareCurrentView} aria-label="Share this current map view">
      {shareViewLabel}
    </button>
  </div>

  {#if viewMode === 'map' && searchStatus}
    <div class="search-status-bar">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
      {searchStatus}
    </div>
  {/if}

  {#if viewMode === 'map' && !showMapDetails}
    <div class="details-hint" role="note" aria-live="polite">
      <strong>Map first.</strong>
      <span>Details are collapsed. Tap Show details for alerts, vehicles, and more.</span>
    </div>
  {/if}

  {#if viewMode === 'map'}
    <div class="mode-filters" role="group" aria-label="Filter by mode">
      {#each [
        { id: 'all',          label: 'All',          icon: '🚦' },
        { id: 'bus',          label: 'Bus',          icon: '🚌' },
        { id: 'subway',       label: 'Subway',       icon: '🚇' },
        { id: 'commuter-rail',label: 'Rail',         icon: '🚆' },
        { id: 'ferry',        label: 'Ferry',        icon: '⛴️' }
      ] as modeItem}
        <button
          class:active={selectedMode === modeItem.id}
          data-mode={modeItem.id}
          type="button"
          on:click={() => (selectedMode = modeItem.id as typeof selectedMode)}
        >
          <span class="mode-icon">{modeItem.icon}</span>
          <span class="mode-label">{modeItem.label}</span>
        </button>
      {/each}
    </div>

    <div class="content-grid" class:map-expanded={isMapExpanded} class:details-open={showMapDetails}>
      <section class="map-card" class:expanded={isMapExpanded}>
        <div class="map-frame" class:expanded={isMapExpanded}>
          <div bind:this={mapContainer} class="map" aria-label="Live map of MBTA vehicles"></div>
          <button
            type="button"
            class="map-expand-btn"
            on:click={toggleMapExpanded}
            aria-pressed={isMapExpanded}
            aria-label={isMapExpanded ? 'Exit full page map' : 'Expand map to full page'}
          >
            {#if isMapExpanded}
              <span>↙</span>
              <span>Collapse map</span>
            {:else}
              <span>↗</span>
              <span>Full page map</span>
            {/if}
          </button>
          <button
            type="button"
            class="map-recenter-btn"
            on:click={recenterMap}
            disabled={isRecenterActive}
            aria-label="Recenter map on current location or default view"
          >
            {#if isRecenterActive}
              <span class="recenter-spinner">⟳</span>
            {:else}
              <span>📍</span>
            {/if}
          </button>
          <div class="overlay stop-hint">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12.01" y2="8"/><line x1="12" y1="12" x2="12" y2="16"/></svg>
            {mapStopHint}
          </div>
          {#if mapLoadError}
            <div class="overlay warning">
              <strong>Map temporarily unavailable</strong>
            </div>
          {/if}
        </div>
      </section>

      {#if showMapDetails}
      <div class="side-column" id="map-details-panel" aria-label="Expanded map details">
        <!-- Data Quality Panel (Honesty) -->
        <div class="data-quality-panel">
          <div class="quality-summary">
            <span class="quality-indicator" title="Data quality score">
              <span class="quality-score">{dataQualityScore}%</span>
              <span class="quality-badge">{getDataQualityEmoji()}</span>
            </span>
            <div class="quality-details">
              <span class="quality-freshness">{formatFreshnessLabel()}</span>
              <span class="quality-status">
                {#if isOffline}
                  ⚠️ Cached data
                {:else if dataFreshnessMs < 10000}
                  ✓ Fresh
                {:else if dataFreshnessMs < 60000}
                  ⟳ Updating
                {:else}
                  ⚠️ Stale
                {/if}
              </span>
            </div>
          </div>
        </div>

        {#if config.showList}
          <VehicleList
            vehicles={visibleVehicles}
            selectedVehicleId={$selectedVehicleIdStore}
            previewVehicleId={previewVehicleId}
            emptyMessage={vehicleEmptyMessage}
            onSelect={selectedVehicle}
            on:hover={previewVehicleFromPanel}
            on:focus={previewVehicleFromPanel}
            on:leave={clearPreviewFromPanel}
          />
        {/if}

        <VehicleDetail vehicle={selectedVehicleRecord} />

        {#if config.showAlerts && visibleAlerts.length > 0}
          <AlertsPanel alerts={visibleAlerts} />
        {/if}
      </div>
      {/if}
    </div>
  {/if}

  {#if viewMode === 'stops'}
    <div class="stop-finder-wrapper">
      <StopFinder
        vehicles={visibleVehicles}
        onStopSelected={(stopId: string) => { void focusStopOnMap(stopId); }}
      />
    </div>
  {/if}
</div>

<style>
  /* ===== RESET & SHELL ===== */
  .tracker-shell {
    --mbta-red: #da291c;
    --mbta-orange: #ed8b00;
    --mbta-blue: #003da5;
    --mbta-green: #00843d;
    --mbta-silver: #7c878e;
    --mbta-purple: #80276c;
    --mbta-ferry: #0284c7;
    --mbta-bus: #ffc72c;
    display: grid;
    gap: 1rem;
    min-height: 100%;
    padding: max(1rem, var(--safe-area-inset-top)) max(1rem, var(--safe-area-inset-right)) max(1rem, var(--safe-area-inset-bottom)) max(1rem, var(--safe-area-inset-left));
    background:
      radial-gradient(circle at 12% 0%, rgba(0, 61, 165, 0.18), transparent 26%),
      radial-gradient(circle at 92% 8%, rgba(2, 132, 199, 0.14), transparent 26%),
      radial-gradient(circle at 50% 100%, rgba(124, 135, 142, 0.14), transparent 30%),
      linear-gradient(160deg, #f8fbff 0%, #eef4fb 52%, #edf3f8 100%);
    color: #0f172a;
    box-sizing: border-box;
    font-family: 'Space Grotesk', 'Avenir Next', 'Segoe UI', sans-serif;
  }

  :global(.dark-mode .tracker-shell) {
    background:
      radial-gradient(circle at 12% 0%, rgba(0, 61, 165, 0.25), transparent 26%),
      radial-gradient(circle at 92% 8%, rgba(2, 132, 199, 0.2), transparent 26%),
      radial-gradient(circle at 50% 100%, rgba(124, 135, 142, 0.1), transparent 30%),
      linear-gradient(160deg, #0f1a2a 0%, #1a2847 52%, #132236 100%);
    color: #f8fbff;
  }

  .embedded-shell {
    padding: 0.6rem;
    background: rgba(248, 250, 252, 0.96);
  }

  :global(.dark-mode .embedded-shell) {
    background: rgba(15, 26, 42, 0.96);
  }

  /* ===== HEADER ===== */
  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .brand .eyebrow {
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #083b8a;
    margin-bottom: 0.1rem;
  }

  .brand h1 {
    font-size: clamp(1.3rem, 3.5vw, 2rem);
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.1;
    margin: 0;
    color: #020617;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.7);
  }

  .brand-subtitle {
    margin: 0.25rem 0 0;
    color: #0f172a;
    font-size: 0.92rem;
    max-width: 42rem;
    font-weight: 600;
    line-height: 1.35;
  }

  :global(.dark-mode .brand .eyebrow) {
    color: #93c5fd;
  }

  :global(.dark-mode .brand h1) {
    color: #f8fbff;
    text-shadow: 0 1px 0 rgba(15, 23, 42, 0.55);
  }

  :global(.dark-mode .brand-subtitle) {
    color: #dbeafe;
  }

  .status-bar {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.55rem 0.9rem;
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(15, 23, 42, 0.1);
    border-radius: 999px;
    backdrop-filter: blur(16px);
    box-shadow: 0 14px 34px rgba(15, 23, 42, 0.1);
  }

  :global(.dark-mode .status-bar) {
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.94), rgba(30, 41, 59, 0.9));
    border: 1px solid rgba(148, 163, 184, 0.16);
    box-shadow: 0 14px 34px rgba(0, 0, 0, 0.3);
  }

  .live-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #94a3b8;
    flex-shrink: 0;
  }

  .live-dot[data-status='open'] {
    background: #22c55e;
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.6);
    animation: pulse-green 2s infinite;
  }

  .live-dot[data-status='connecting'],
  .live-dot[data-status='reconnecting'] {
    background: #f59e0b;
    animation: pulse-amber 1.5s infinite;
  }

  .live-dot[data-status='error'],
  .live-dot[data-status='closed'] {
    background: #ef4444;
  }

  @keyframes pulse-green {
    0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5); }
    50% { box-shadow: 0 0 0 5px rgba(34, 197, 94, 0); }
  }

  @keyframes pulse-amber {
    0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.5); }
    50% { box-shadow: 0 0 0 5px rgba(245, 158, 11, 0); }
  }

  .status-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 1.75rem;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.01em;
    white-space: nowrap;
    background: rgba(226, 232, 240, 0.9);
    color: #0f172a;
    border: 1px solid rgba(148, 163, 184, 0.24);
  }

  .status-chip[data-status='open'] {
    background: rgba(220, 252, 231, 0.95);
    color: #166534;
    border-color: rgba(34, 197, 94, 0.22);
  }

  .status-chip[data-status='connecting'],
  .status-chip[data-status='reconnecting'] {
    background: rgba(254, 243, 199, 0.95);
    color: #92400e;
    border-color: rgba(245, 158, 11, 0.22);
  }

  .status-chip[data-status='error'],
  .status-chip[data-status='closed'],
  .status-chip[data-status='idle'] {
    background: rgba(254, 226, 226, 0.95);
    color: #991b1b;
    border-color: rgba(239, 68, 68, 0.22);
  }

  :global(.dark-mode .status-chip) {
    background: rgba(15, 23, 42, 0.9);
    color: #e2e8f0;
    border-color: rgba(148, 163, 184, 0.2);
  }

  :global(.dark-mode .status-chip[data-status='open']) {
    background: rgba(20, 83, 45, 0.32);
    color: #86efac;
  }

  :global(.dark-mode .status-chip[data-status='connecting']),
  :global(.dark-mode .status-chip[data-status='reconnecting']) {
    background: rgba(120, 53, 15, 0.35);
    color: #fcd34d;
  }

  :global(.dark-mode .status-chip[data-status='error']),
  :global(.dark-mode .status-chip[data-status='closed']),
  :global(.dark-mode .status-chip[data-status='idle']) {
    background: rgba(127, 29, 29, 0.34);
    color: #fca5a5;
  }

  .ferry-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.35rem 0.6rem;
    background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
    border-radius: 999px;
    color: #ffffff;
    font-size: 0.8rem;
    font-weight: 600;
    box-shadow: 0 2px 6px rgba(3, 105, 161, 0.25);
    animation: pulse-ferry 2s ease-in-out infinite;
  }

  .ferry-icon {
    font-size: 0.95rem;
    line-height: 1;
  }

  .ferry-num {
    font-size: 0.85rem;
    font-weight: 700;
    line-height: 1;
  }

  @keyframes pulse-ferry {
    0%, 100% { box-shadow: 0 2px 6px rgba(3, 105, 161, 0.25); }
    50% { box-shadow: 0 2px 12px rgba(3, 105, 161, 0.5); }
  }

  .status-summary {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding-left: 0.55rem;
    margin-left: 0.15rem;
    border-left: 1px solid rgba(15, 23, 42, 0.1);
    font-size: 0.73rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    color: #64748b;
    white-space: nowrap;
  }

  .status-summary-item {
    display: inline-flex;
    align-items: center;
    min-height: 1.5rem;
    padding: 0.1rem 0.42rem;
    border-radius: 999px;
    background: rgba(241, 245, 249, 0.95);
    border: 1px solid rgba(148, 163, 184, 0.18);
    color: #334155;
  }

  .status-summary-sep {
    color: #94a3b8;
    font-weight: 700;
  }

  :global(.dark-mode .status-summary) {
    border-left-color: rgba(148, 163, 184, 0.18);
    color: #cbd5e1;
  }

  :global(.dark-mode .status-summary-item) {
    background: rgba(30, 41, 59, 0.9);
    border-color: rgba(148, 163, 184, 0.16);
    color: #e2e8f0;
  }

  :global(.dark-mode .status-summary-sep) {
    color: #94a3b8;
  }

  .mission-strip {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    gap: 0.85rem;
    padding: 1rem 1.1rem;
    border-radius: 1.5rem;
    border: 1px solid rgba(15, 23, 42, 0.1);
    background:
      radial-gradient(circle at 100% 0%, rgba(0, 61, 165, 0.12), transparent 38%),
      linear-gradient(140deg, rgba(255, 255, 255, 0.95), rgba(242, 247, 253, 0.88));
    box-shadow: 0 20px 48px rgba(15, 23, 42, 0.09);
    backdrop-filter: blur(14px);
  }

  .mission-copy strong {
    display: block;
    font-size: 1rem;
    margin-bottom: 0.28rem;
  }

  .mission-copy p {
    color: #475569;
    font-size: 0.9rem;
    line-height: 1.55;
  }

  .mission-tags {
    display: flex;
    flex-wrap: wrap;
    align-content: start;
    gap: 0.5rem;
  }

  .mission-tags span {
    display: inline-flex;
    align-items: center;
    min-height: 2rem;
    padding: 0.45rem 0.72rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.82);
    border: 1px solid rgba(15, 23, 42, 0.08);
    font-size: 0.8rem;
    color: #334155;
  }

  .mission-tags span[data-tone='high'] {
    color: #b91c1c;
    background: rgba(254, 242, 242, 0.9);
  }

  .mission-tags span[data-tone='medium'] {
    color: #a16207;
    background: rgba(255, 251, 235, 0.92);
  }

  .mission-tags span[data-tone='clear'] {
    color: #0f766e;
    background: rgba(240, 253, 250, 0.92);
  }

  .insight-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .insight-card {
    display: grid;
    gap: 0.4rem;
    padding: 0.95rem 1rem;
    border-radius: 1.35rem;
    background: rgba(255, 255, 255, 0.78);
    border: 1px solid rgba(15, 23, 42, 0.08);
    box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
    backdrop-filter: blur(14px);
  }

  .insight-card-primary {
    background:
      radial-gradient(circle at top right, rgba(255, 255, 255, 0.12), transparent 32%),
      linear-gradient(132deg, rgba(0, 31, 88, 0.98), rgba(0, 61, 165, 0.95));
    color: #eff6ff;
  }

  .insight-label {
    font-size: 0.74rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: #64748b;
  }

  .insight-card-primary .insight-label {
    color: rgba(219, 234, 254, 0.84);
  }

  .insight-card strong {
    font-size: clamp(1.05rem, 3vw, 1.8rem);
    line-height: 1.05;
  }

  .insight-card p {
    color: #475569;
    font-size: 0.84rem;
    line-height: 1.5;
  }

  .insight-card-primary p {
    color: rgba(239, 246, 255, 0.92);
  }

  .quick-guide {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
  }

  .quick-guide span {
    display: inline-flex;
    align-items: center;
    padding: 0.48rem 0.8rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.72);
    border: 1px solid rgba(15, 23, 42, 0.08);
    color: #334155;
    font-size: 0.79rem;
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
  }

  /* ===== DATA QUALITY PANEL (Honesty) ===== */
  .data-quality-panel {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    padding: 0.9rem 1.1rem;
    border-radius: 1.1rem;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(139, 92, 246, 0.08));
    border: 1px solid rgba(59, 130, 246, 0.2);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.06);
  }

  :global(.dark-mode .data-quality-panel) {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(139, 92, 246, 0.12));
    border-color: rgba(59, 130, 246, 0.3);
  }

  .quality-summary {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    flex: 1;
  }

  .quality-indicator {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    min-width: fit-content;
  }

  .quality-score {
    font-size: 0.9rem;
    font-weight: 700;
    color: #1e40af;
  }

  :global(.dark-mode .quality-score) {
    color: #93c5fd;
  }

  .quality-badge {
    font-size: 1rem;
    line-height: 1;
  }

  .quality-details {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    font-size: 0.8rem;
  }

  .quality-freshness {
    color: #475569;
    font-weight: 600;
  }

  :global(.dark-mode .quality-freshness) {
    color: #cbd5e1;
  }

  .quality-status {
    color: #64748b;
    font-size: 0.75rem;
  }

  :global(.dark-mode .quality-status) {
    color: #94a3b8;
  }

  /* ===== CONTROLS ROW ===== */
  .controls-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .share-view-btn {
    border: 1px solid rgba(15, 23, 42, 0.1);
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    border-radius: 999px;
    min-height: 44px;
    padding: 0.68rem 1rem;
    font: inherit;
    font-size: 0.84rem;
    font-weight: 700;
    color: #f8fafc;
    cursor: pointer;
    box-shadow: 0 12px 24px rgba(15, 23, 42, 0.2);
    transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  }

  .share-view-btn:hover {
    transform: translateY(-1px);
    border-color: rgba(0, 61, 165, 0.35);
    box-shadow: 0 16px 28px rgba(15, 23, 42, 0.24);
  }

  .details-toggle-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0.68rem 1rem;
    font: inherit;
    font-size: 0.84rem;
    font-weight: 700;
    color: #0f172a;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(15, 23, 42, 0.1);
    border-radius: 999px;
    box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease;
  }

  .details-toggle-btn:hover {
    transform: translateY(-1px);
    background: #eff6ff;
    border-color: rgba(37, 99, 235, 0.3);
    box-shadow: 0 16px 28px rgba(15, 23, 42, 0.12);
  }

  .details-toggle-btn[aria-pressed='true'] {
    background: #0f172a;
    color: #f8fafc;
    border-color: #0f172a;
  }

  .details-toggle-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.35rem;
    height: 1.35rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.12);
    font-size: 1rem;
    line-height: 1;
  }

  .view-toggle {
    display: flex;
    gap: 0.25rem;
    background: rgba(255, 255, 255, 0.85);
    border-radius: 12px;
    padding: 0.3rem;
    border: 1px solid rgba(15, 23, 42, 0.09);
    box-shadow: 0 12px 24px rgba(15, 23, 42, 0.1);
    flex-shrink: 0;
    backdrop-filter: blur(14px);
  }

  .view-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.52rem 0.85rem;
    border: 0;
    background: transparent;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    color: #475569;
    cursor: pointer;
    transition: all 0.18s ease;
    min-height: 44px;
  }

  .view-btn.active {
    background: linear-gradient(135deg, #003da5 0%, #0057cc 100%);
    color: #ffffff;
    box-shadow: 0 6px 14px rgba(0, 61, 165, 0.35);
  }

  .view-btn:not(.active):hover {
    background: rgba(15, 23, 42, 0.05);
    color: #0f172a;
  }

  /* ===== SEARCH ===== */
  .search {
    flex: 1;
    min-width: 200px;
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: 1rem;
    color: #94a3b8;
    pointer-events: none;
    flex-shrink: 0;
  }

  .search input {
    width: 100%;
    box-sizing: border-box;
    border: 1.5px solid rgba(15, 23, 42, 0.12);
    border-radius: 12px;
    padding: 0.72rem 2.75rem 0.72rem 2.5rem;
    font-size: 0.925rem;
    background: rgba(255, 255, 255, 0.92);
    color: #0f172a;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
    transition: border-color 0.15s, box-shadow 0.15s;
    min-height: 44px;
  }

  .search input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15), 0 2px 8px rgba(15, 23, 42, 0.05);
  }

  .search-clear {
    position: absolute;
    right: 0.75rem;
    background: rgba(15, 23, 42, 0.06);
    border: none;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    color: #64748b;
    cursor: pointer;
    line-height: 1;
  }

  .search-clear:hover { background: rgba(15, 23, 42, 0.12); }

  .search-status-bar {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.84rem;
    color: #2563eb;
    background: rgba(219, 234, 254, 0.7);
    border: 1px solid rgba(37, 99, 235, 0.2);
    border-radius: 8px;
    padding: 0.45rem 0.85rem;
  }

  .details-hint {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    padding: 0.45rem 0.85rem;
    border-radius: 999px;
    border: 1px dashed rgba(37, 99, 235, 0.22);
    background: rgba(239, 246, 255, 0.78);
    color: #1d4ed8;
    font-size: 0.82rem;
    line-height: 1.3;
  }

  .details-hint strong {
    font-weight: 800;
    color: #0f172a;
  }

  /* ===== MODE FILTERS ===== */
  .mode-filters {
    display: flex;
    gap: 0.45rem;
    flex-wrap: wrap;
  }

  .mode-filters button {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: 1.5px solid rgba(15, 23, 42, 0.14);
    background: rgba(255, 255, 255, 0.9);
    border-radius: 999px;
    padding: 0.42rem 0.85rem;
    font-size: 0.85rem;
    font-weight: 500;
    color: #334155;
    cursor: pointer;
    transition: all 0.15s;
    min-height: 36px;
    box-shadow: 0 4px 10px rgba(15, 23, 42, 0.08);
  }

  .mode-filters button:hover:not(.active) {
    border-color: rgba(0, 61, 165, 0.38);
    background: rgba(239, 246, 255, 0.9);
    color: #003da5;
  }

  .mode-filters button.active {
    color: #ffffff;
    box-shadow: 0 8px 16px rgba(15, 23, 42, 0.2);
  }

  .mode-filters button[data-mode='all'].active {
    background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
    border-color: #0f172a;
  }

  .mode-filters button[data-mode='bus'].active {
    background: linear-gradient(135deg, #ffc72c 0%, #f2b705 100%);
    border-color: #1f2937;
    color: #111827;
  }

  .mode-filters button[data-mode='subway'].active {
    background: linear-gradient(135deg, #003da5 0%, #0057cc 100%);
    border-color: #002d7c;
  }

  .mode-filters button[data-mode='commuter-rail'].active {
    background: linear-gradient(135deg, #80276c 0%, #9d3b86 100%);
    border-color: #5e1c50;
  }

  .mode-filters button[data-mode='ferry'].active {
    background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
    border-color: #075985;
  }

  .mode-icon { font-size: 0.95rem; line-height: 1; }
  .mode-label { font-size: 0.82rem; }

  /* ===== CONTENT GRID ===== */
  .content-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0.9rem;
    align-items: start;
  }

  .content-grid.details-open {
    grid-template-columns: minmax(0, 2.4fr) minmax(17rem, 1fr);
  }

  .side-column {
    display: grid;
    gap: 0.9rem;
    min-height: 0;
  }

  /* ===== MAP CARD ===== */
  .map-card {
    border-radius: 1.5rem;
    overflow: hidden;
    box-shadow: 0 24px 70px rgba(15, 23, 42, 0.13), 0 4px 16px rgba(15, 23, 42, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.9);
    background: rgba(255, 255, 255, 0.98);
  }

  .map-card.expanded {
    position: fixed;
    inset: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
    width: calc(100dvw - env(safe-area-inset-left) - env(safe-area-inset-right));
    height: calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom));
    z-index: 9999;
    border-radius: 0;
    background: rgba(2, 6, 23, 0.86);
    box-shadow: 0 24px 80px rgba(2, 6, 23, 0.52);
  }

  .map-frame {
    position: relative;
    min-height: 36rem;
    height: clamp(36rem, 72vh, 52rem);
    overflow: hidden;
    border-radius: 1.5rem;
  }

  .map-frame.expanded {
    min-height: 100%;
    height: 100%;
    border-radius: 0.9rem;
  }

  .map {
    position: absolute;
    inset: 0;
  }

  :global(.maplibregl-map) {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }

  :global(.maplibregl-canvas-container),
  :global(.maplibregl-canvas) {
    position: absolute;
    inset: 0;
  }

  :global(.maplibregl-ctrl-bottom-right) {
    right: 0.8rem;
    bottom: 0.8rem;
  }

  :global(.maplibregl-ctrl-bottom-left) {
    left: 0.8rem;
    bottom: 0.8rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  :global(.maplibregl-ctrl-group) {
    overflow: hidden;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.14);
    border: 1px solid rgba(255, 255, 255, 0.7);
  }

  :global(.maplibregl-ctrl-group button) {
    width: 2.6rem;
    height: 2.6rem;
    border: 0;
    background: rgba(255, 255, 255, 0.95);
    color: #0f172a;
    backdrop-filter: blur(8px);
  }

  :global(.maplibregl-ctrl-attrib) {
    background: rgba(255, 255, 255, 0.88);
    color: #64748b;
    font-size: 0.65rem;
    backdrop-filter: blur(8px);
    padding: 0.35rem 0.5rem;
    border-radius: 8px;
    max-width: 240px;
  }

  :global(.maplibregl-ctrl-attrib a) {
    color: #2563eb;
    text-decoration: none;
  }

  :global(.maplibregl-ctrl-attrib a:hover) {
    text-decoration: underline;
  }

  :global(.maplibregl-ctrl-scale) {
    border-radius: 999px;
    border: 1px solid rgba(15, 23, 42, 0.15);
    background: rgba(255, 255, 255, 0.95);
    color: #0f172a;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.08rem 0.45rem;
    min-width: 3.8rem;
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.14);
  }

  .map-expand-btn {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    z-index: 5;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    min-height: 2.2rem;
    padding: 0.42rem 0.68rem;
    border: 1px solid rgba(255, 255, 255, 0.65);
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.75);
    color: #f8fafc;
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    cursor: pointer;
    backdrop-filter: blur(12px);
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.28);
  }

  .map-expand-btn:hover {
    background: rgba(2, 6, 23, 0.84);
  }

  .map-recenter-btn {
    position: absolute;
    top: 0.75rem;
    right: 3.2rem;
    z-index: 5;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.2rem;
    height: 2.2rem;
    border: 1px solid rgba(255, 255, 255, 0.65);
    border-radius: 8px;
    background: rgba(15, 23, 42, 0.75);
    color: #f8fafc;
    font-size: 1.1rem;
    cursor: pointer;
    backdrop-filter: blur(12px);
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.28);
    transition: all 0.15s;
  }

  .map-recenter-btn:hover:not(:disabled) {
    background: rgba(2, 6, 23, 0.84);
    transform: scale(1.08);
  }

  .map-recenter-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .recenter-spinner {
    display: inline-block;
    animation: spin-recenter 1.4s linear infinite;
  }

  @keyframes spin-recenter {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .content-grid.map-expanded {
    grid-template-columns: minmax(0, 1fr);
  }

  .content-grid.map-expanded .side-column {
    display: none;
  }

  /* ===== POPUPS ===== */
  :global(.mbta-stop-popup .maplibregl-popup-content) {
    border-radius: 1rem;
    padding: 0.8rem 1rem;
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.22);
    border: 1px solid rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(16px);
    background: rgba(255, 255, 255, 0.97);
    min-width: 14rem;
  }

  :global(.mbta-vehicle-popup .maplibregl-popup-content) {
    border-radius: 1rem;
    padding: 0;
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.22);
    border: 1px solid rgba(255, 255, 255, 0.6);
    overflow: hidden;
    backdrop-filter: blur(16px);
    min-width: 15rem;
  }

  :global(.vehicle-popup) {
    color: #0f172a;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98));
  }

  :global(.vehicle-popup-top) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.55rem;
    padding: 0.75rem 0.9rem 0.55rem;
    border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  }

  :global(.vehicle-popup-route) {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.2;
    color: var(--vehicle-accent-text, #0f172a);
    font-weight: 800;
  }

  :global(.vehicle-popup-mode) {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.45rem;
    border-radius: 999px;
    background: var(--vehicle-accent-soft, rgba(15, 23, 42, 0.1));
    color: var(--vehicle-accent-text, #0f172a);
    border: 1px solid rgba(15, 23, 42, 0.1);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 700;
    flex-shrink: 0;
  }

  :global(.vehicle-popup-freshness) {
    margin: 0;
    padding: 0.35rem 0.9rem 0.2rem;
    font-size: 0.74rem;
    color: #334155;
    font-weight: 600;
  }

  :global(.vehicle-popup-grid) {
    margin: 0;
    padding: 0.4rem 0.9rem 0.8rem;
    display: grid;
    gap: 0.35rem;
  }

  :global(.vehicle-popup-grid div) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 0.7rem;
    align-items: center;
    padding: 0.28rem 0;
    border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  }

  :global(.vehicle-popup-grid div:last-child) {
    border-bottom: 0;
  }

  :global(.vehicle-popup-grid dt) {
    margin: 0;
    color: #475569;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 700;
  }

  :global(.vehicle-popup-grid dd) {
    margin: 0;
    color: #0f172a;
    font-size: 0.8rem;
    font-weight: 700;
    text-align: right;
  }

  :global(.stop-popup h4) {
    margin: 0 0 0.3rem;
    font-size: 0.96rem;
    font-weight: 700;
    color: #0f172a;
  }

  :global(.stop-popup-meta) {
    margin: 0.1rem 0;
    color: #64748b;
    font-size: 0.78rem;
  }

  :global(.stop-popup-arrivals) {
    margin: 0.5rem 0 0;
    padding-left: 1rem;
    font-size: 0.82rem;
    color: #0f172a;
  }

  :global(.stop-popup-arrivals li) { margin: 0.2rem 0; }

  :global(.stop-popup-muted) {
    margin: 0.45rem 0 0;
    color: #94a3b8;
    font-size: 0.8rem;
    font-style: italic;
  }

  :global(.stop-popup-loading) {
    margin: 0.45rem 0 0;
    color: #64748b;
    font-size: 0.8rem;
    font-style: italic;
    animation: pulse 1s ease-in-out infinite alternate;
  }

  @keyframes pulse { from { opacity: 1; } to { opacity: 0.4; } }

  /* ===== MAP OVERLAY ===== */
  .overlay {
    position: absolute;
    inset: auto 1rem 1rem 1rem;
    padding: 0.75rem 1rem;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid rgba(15, 23, 42, 0.1);
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.1);
    backdrop-filter: blur(12px);
    font-size: 0.85rem;
  }

  .overlay.warning strong {
    display: block;
    margin-bottom: 0.25rem;
    color: #0f172a;
  }

  .overlay.warning {
    inset: auto 1rem 1rem 1rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: fit-content;
    max-width: calc(100% - 2rem);
    margin: 0 auto;
    padding: 0.45rem 0.75rem;
    background: rgba(239, 246, 255, 0.96);
    border-color: rgba(147, 197, 253, 0.55);
    color: #0f172a;
    box-shadow: 0 6px 18px rgba(30, 58, 138, 0.12);
  }

  .overlay.stop-hint {
    inset: 0.75rem auto auto 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    color: #475569;
    background: rgba(255, 255, 255, 0.9);
    border-color: rgba(15, 23, 42, 0.08);
    pointer-events: none;
    max-width: 20rem;
    padding: 0.55rem 0.8rem;
  }

  /* ===== PANELS ===== */
  :global(.panel) {
    padding: 1rem 1.1rem;
    border-radius: 1.25rem;
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid rgba(15, 23, 42, 0.07);
    box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06);
    backdrop-filter: blur(12px);
  }

  :global(.dark-mode .panel) {
    background: rgba(25, 35, 60, 0.9);
    border: 1px solid rgba(255, 251, 245, 0.08);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  }

  :global(.panel-head) {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.8rem;
  }

  :global(.panel-head h2) {
    font-size: 0.9rem;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.01em;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  :global(.dark-mode .panel-head h2) {
    color: #f8fbff;
  }

  :global(.panel-count) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.6rem;
    height: 1.6rem;
    padding: 0 0.4rem;
    border-radius: 999px;
    background: #e2e8f0;
    color: #475569;
    font-size: 0.78rem;
    font-weight: 600;
    line-height: 1;
  }

  :global(.dark-mode .panel-count) {
    background: rgba(255, 251, 245, 0.15);
    color: #cbd5e1;
  }

  :global(.alert-count) { background: #fef2f2; color: #dc2626; }

  /* ===== VEHICLE LIST ===== */
  :global(.vehicle-list) {
    display: grid;
    gap: 0.4rem;
    max-height: 24rem;
    overflow-y: auto;
    overflow-x: hidden;
    scroll-behavior: smooth;
    padding-right: 0.1rem;
  }

  :global(.vehicle-list::-webkit-scrollbar) { width: 4px; }
  :global(.vehicle-list::-webkit-scrollbar-track) { background: transparent; }
  :global(.vehicle-list::-webkit-scrollbar-thumb) { background: rgba(15, 23, 42, 0.12); border-radius: 99px; }

  :global(.vehicle-row) {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    text-align: left;
    padding: 0.6rem 0.75rem;
    border-radius: 10px;
    border: 1.5px solid rgba(15, 23, 42, 0.1);
    border-left-width: 4px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(247, 250, 253, 0.9));
    color: #0f172a;
    cursor: pointer;
    transition: all 0.15s;
    min-height: 48px;
    width: 100%;
    box-sizing: border-box;
  }

  :global(.dark-mode .vehicle-row) {
    border: 1.5px solid rgba(255, 251, 245, 0.1);
    background: linear-gradient(180deg, rgba(35, 50, 80, 0.92), rgba(20, 35, 65, 0.9));
    color: #f8fbff;
  }

  :global(.vehicle-row:hover) {
    border-color: rgba(37, 99, 235, 0.25);
    background: rgba(239, 246, 255, 0.95);
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.1);
  }

  :global(.dark-mode .vehicle-row:hover) {
    border-color: rgba(2, 132, 199, 0.3);
    background: rgba(30, 58, 95, 0.95);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
  }

  :global(.vehicle-row.active) {
    border-color: rgba(0, 61, 165, 0.55);
    background: rgba(232, 241, 255, 0.95);
    box-shadow: 0 8px 20px rgba(0, 61, 165, 0.16);
  }

  :global(.dark-mode .vehicle-row.active) {
    border-color: rgba(2, 132, 199, 0.5);
    background: rgba(2, 61, 100, 0.95);
    box-shadow: 0 8px 20px rgba(2, 132, 199, 0.2);
  }

  :global(.vehicle-row[data-mode='bus']) {
    border-left-color: var(--mbta-bus);
  }

  :global(.vehicle-row[data-mode='commuter-rail']) {
    border-left-color: var(--mbta-purple);
  }

  :global(.vehicle-row[data-mode='ferry']) {
    border-left-color: var(--mbta-ferry);
  }

  :global(.vehicle-row[data-routeid='red']) {
    border-left-color: var(--mbta-red);
  }

  :global(.vehicle-row[data-routeid='orange']) {
    border-left-color: var(--mbta-orange);
  }

  :global(.vehicle-row[data-routeid='blue']) {
    border-left-color: var(--mbta-blue);
  }

  :global(.vehicle-row[data-routeid='silver']) {
    border-left-color: var(--mbta-silver);
  }

  :global(.vehicle-row[data-routeid^='green']) {
    border-left-color: var(--mbta-green);
  }

  :global(.vehicle-row[data-routeid^='sl']) {
    border-left-color: var(--mbta-silver);
  }

  :global(.vehicle-mode-icon) { font-size: 1.15rem; flex-shrink: 0; }

  :global(.vehicle-info) {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    flex: 1;
    min-width: 0;
  }

  :global(.vehicle-route) {
    font-weight: 700;
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  :global(.vehicle-meta) {
    font-size: 0.76rem;
    color: #64748b;
  }

  :global(.vehicle-arrow) {
    color: #94a3b8;
    flex-shrink: 0;
    transition: transform 0.15s;
  }

  :global(.vehicle-row:hover .vehicle-arrow) { transform: translateX(2px); color: #2563eb; }

  /* ===== SELECTED VEHICLE BADGE ===== */
  :global(.selected-vehicle-badge) {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: linear-gradient(135deg, rgba(219, 234, 254, 0.7), rgba(239, 246, 255, 0.7));
    border-radius: 10px;
    margin-bottom: 0.85rem;
    border: 1px solid rgba(37, 99, 235, 0.15);
  }

  :global(.selected-mode-icon) { font-size: 1.6rem; }

  :global(.selected-route) {
    font-size: 1.05rem;
    font-weight: 800;
    color: #1e3a8a;
  }

  :global(.selected-id) {
    font-size: 0.78rem;
    color: #64748b;
    margin-top: 0.1rem;
  }

  /* ===== DETAIL CARD ===== */
  :global(.detail-card dl) {
    display: grid;
    gap: 0.5rem;
  }

  :global(.detail-card div) {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 0.4rem 0;
    border-bottom: 1px solid rgba(15, 23, 42, 0.05);
  }

  :global(.detail-card div:last-child) { border-bottom: 0; }

  :global(.detail-card dt) {
    font-size: 0.8rem;
    color: #64748b;
    font-weight: 500;
  }

  :global(.detail-card dd) {
    margin: 0;
    text-align: right;
    font-size: 0.85rem;
    font-weight: 600;
    color: #0f172a;
  }

  /* ===== TRIP LIST ===== */
  :global(.trip-list), :global(.alerts-list) {
    display: grid;
    gap: 0.5rem;
  }

  :global(.trip-row), :global(.alert-row) {
    padding: 0.75rem 0.85rem;
    border-radius: 10px;
    border: 1.5px solid rgba(15, 23, 42, 0.1);
    border-left-width: 4px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(247, 250, 253, 0.9));
  }

  :global(.trip-row p), :global(.alert-row p) {
    margin: 0.3rem 0 0;
    font-size: 0.84rem;
    color: #475569;
  }

  :global(.trip-title-row) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  :global(.trip-chip), :global(.alert-chip) {
    display: inline-flex;
    align-items: center;
    padding: 0.22rem 0.5rem;
    border-radius: 999px;
    background: #e5ebf2;
    color: #334155;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    flex-shrink: 0;
  }

  :global(.trip-chip[data-mode='bus']) {
    background: #ffc72c;
    color: #111827;
  }

  :global(.trip-chip[data-mode='commuter-rail']) {
    background: #80276c;
    color: #ffffff;
  }

  :global(.trip-chip[data-mode='ferry']) {
    background: #0284c7;
    color: #ffffff;
  }

  :global(.trip-chip[data-mode='subway']) {
    background: #003da5;
    color: #ffffff;
  }

  :global(.trip-chip[data-routeid='red']) {
    background: #da291c;
    color: #ffffff;
  }

  :global(.trip-chip[data-routeid='orange']) {
    background: #ed8b00;
    color: #111827;
  }

  :global(.trip-chip[data-routeid='blue']) {
    background: #003da5;
    color: #ffffff;
  }

  :global(.trip-chip[data-routeid='silver']),
  :global(.trip-chip[data-routeid^='sl']) {
    background: #7c878e;
    color: #ffffff;
  }

  :global(.trip-chip[data-routeid^='green']) {
    background: #00843d;
    color: #ffffff;
  }

  :global(.trip-row[data-mode='bus']) {
    border-left-color: var(--mbta-bus);
  }

  :global(.trip-row[data-mode='commuter-rail']) {
    border-left-color: var(--mbta-purple);
  }

  :global(.trip-row[data-mode='ferry']) {
    border-left-color: var(--mbta-ferry);
  }

  :global(.trip-row[data-routeid='red']) {
    border-left-color: var(--mbta-red);
  }

  :global(.trip-row[data-routeid='orange']) {
    border-left-color: var(--mbta-orange);
  }

  :global(.trip-row[data-routeid='blue']) {
    border-left-color: var(--mbta-blue);
  }

  :global(.trip-row[data-routeid='silver']),
  :global(.trip-row[data-routeid^='sl']) {
    border-left-color: var(--mbta-silver);
  }

  :global(.trip-row[data-routeid^='green']) {
    border-left-color: var(--mbta-green);
  }

  :global(.trip-metrics) {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 0.65rem;
    margin-top: 0.45rem;
    font-size: 0.8rem;
    color: #64748b;
  }

  :global(.alert-row[data-severity='high']) {
    border-color: rgba(220, 38, 38, 0.25);
    background: rgba(254, 242, 242, 0.9);
  }

  :global(.alert-row[data-severity='medium']) {
    border-color: rgba(234, 179, 8, 0.25);
    background: rgba(255, 251, 235, 0.9);
  }

  /* ===== EMPTY STATE ===== */
  :global(.empty-state) {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1.4rem 1rem;
    border-radius: 10px;
    background: rgba(241, 245, 249, 0.8);
    color: #64748b;
    font-size: 0.85rem;
    text-align: center;
    border: 1px dashed rgba(15, 23, 42, 0.1);
  }

  :global(.empty-state svg) { opacity: 0.4; }

  /* ===== STOP FINDER WRAPPER ===== */
  .stop-finder-wrapper {
    border-radius: 1.25rem;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06);
  }

  /* ===== RESPONSIVE ===== */
  @media (max-width: 1024px) {
    .mission-strip,
    .insight-grid,
    .content-grid {
      grid-template-columns: 1fr;
    }

    .content-grid {
      grid-template-columns: 1fr;
    }
    .content-grid.details-open {
      grid-template-columns: 1fr;
    }
    .map-frame {
      height: clamp(28rem, 62vh, 44rem);
    }
    .side-column {
      grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    }
  }

  @media (max-width: 640px) {
    .tracker-shell {
      padding: 0.65rem;
      gap: 0.62rem;
    }

    .mission-strip,
    .insight-card {
      border-radius: 0.95rem;
    }

    .topbar {
      gap: 0.6rem;
    }

    .brand-subtitle {
      font-size: 0.82rem;
      line-height: 1.35;
    }

    .status-bar {
      flex-wrap: wrap;
      row-gap: 0.3rem;
      column-gap: 0.45rem;
      max-width: 100%;
      padding: 0.38rem 0.58rem;
    }

    .status-summary {
      gap: 0.28rem;
    }

    .status-summary-item[data-summary='freshness'],
    .status-summary-sep[data-separator='freshness'] {
      display: none;
    }

    .mission-strip {
      padding: 0.72rem;
      gap: 0.58rem;
    }

    .mission-copy strong {
      font-size: 0.9rem;
    }

    .mission-copy p {
      font-size: 0.8rem;
      line-height: 1.45;
    }

    .mission-tags {
      gap: 0.38rem;
    }

    .mission-tags span,
    .quick-guide span {
      min-height: 1.7rem;
      padding: 0.3rem 0.52rem;
      font-size: 0.72rem;
    }

    .insight-card {
      gap: 0.28rem;
      padding: 0.72rem 0.78rem;
    }

    .insight-label {
      font-size: 0.68rem;
      letter-spacing: 0.1em;
    }

    .insight-card strong {
      font-size: 1rem;
    }

    .insight-card p {
      font-size: 0.76rem;
      line-height: 1.38;
    }

    .quick-guide {
      gap: 0.35rem;
    }

    .controls-row {
      gap: 0.55rem;
    }

    .controls-row {
      flex-direction: column;
      align-items: stretch;
    }
    .view-toggle {
      width: 100%;
      justify-content: center;
    }

    .share-view-btn {
      width: 100%;
      justify-content: center;
      text-align: center;
    }

    .details-toggle-btn {
      width: 100%;
    }
    .view-btn {
      flex: 1;
      justify-content: center;
      min-height: 40px;
      font-size: 0.8rem;
      padding: 0.42rem 0.58rem;
    }
    .map-frame {
      height: clamp(16.5rem, 53vw, 24rem);
      min-height: 16rem;
      border-radius: 1rem;
    }

    .map-expand-btn {
      top: 0.5rem;
      right: 0.5rem;
      min-height: 2.45rem;
      min-width: 2.45rem;
      padding: 0.5rem 0.72rem;
      font-size: 0.74rem;
      gap: 0.25rem;
    }

    .map-recenter-btn {
      top: 0.5rem;
      right: 2.8rem;
      width: 2.35rem;
      height: 2.35rem;
      font-size: 1.05rem;
    }

    :global(.maplibregl-ctrl-group button) {
      width: 3rem;
      height: 3rem;
    }

    :global(.maplibregl-ctrl-bottom-right) {
      right: 0.5rem;
      bottom: 0.5rem;
    }

    :global(.maplibregl-ctrl-bottom-left) {
      left: 0.5rem;
      bottom: 0.5rem;
    }

    :global(.maplibregl-ctrl-scale) {
      font-size: 0.68rem;
      padding: 0.05rem 0.36rem;
    }

    .map-card {
      border-radius: 1rem;
    }

    .overlay {
      padding: 0.56rem 0.66rem;
      font-size: 0.76rem;
    }

    .overlay.stop-hint {
      max-width: 13.5rem;
      inset: 0.5rem auto auto 0.5rem;
      padding: 0.4rem 0.55rem;
      font-size: 0.72rem;
      line-height: 1.35;
    }

    .search {
      min-width: 100%;
    }

    .search input {
      min-height: 40px;
      font-size: 0.84rem;
      padding: 0.56rem 2.3rem 0.56rem 2.1rem;
    }

    .search-icon {
      left: 0.72rem;
    }

    .search-clear {
      right: 0.56rem;
    }

    .search-status-bar {
      font-size: 0.76rem;
      line-height: 1.35;
      padding: 0.38rem 0.6rem;
    }

    .mode-filters {
      gap: 0.35rem;
    }
    .mode-filters button {
      padding: 0.32rem 0.5rem;
      min-height: 30px;
      font-size: 0.76rem;
    }
    .mode-label { display: none; }
    .side-column {
      grid-template-columns: 1fr;
      gap: 0.62rem;
    }
    .brand h1 {
      font-size: 1.05rem;
    }

    :global(.panel) {
      padding: 0.72rem 0.78rem;
      border-radius: 0.95rem;
    }

    :global(.panel-head) {
      margin-bottom: 0.55rem;
    }

    :global(.panel-head h2) {
      font-size: 0.74rem;
      letter-spacing: 0.04em;
    }

    :global(.panel-count) {
      min-width: 1.35rem;
      height: 1.35rem;
      font-size: 0.68rem;
      padding: 0 0.28rem;
    }

    /* Enhanced mobile UX */
    .tracker-shell {
      padding: max(0.65rem, var(--safe-area-inset-top)) max(0.65rem, var(--safe-area-inset-right)) max(0.65rem, var(--safe-area-inset-bottom)) max(0.65rem, var(--safe-area-inset-left));
    }

    .side-column {
      max-height: 35vh;
      overflow-y: auto;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
    }

    :global(.panel) {
      max-height: 32vh;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
    }

    :global(.vehicle-list) {
      max-height: 25rem;
      -webkit-overflow-scrolling: touch;
    }

    .view-btn,
    .mode-filters button {
      -webkit-touch-callout: none;
      user-select: none;
      -webkit-user-select: none;
      min-height: 44px;
    }

    /* One-handed reachability: move controls to bottom */
    .map-expand-btn,
    .map-recenter-btn {
      bottom: max(0.5rem, calc(var(--safe-area-inset-bottom) + 0.5rem));
      top: auto;
    }

    .map-expand-btn {
      right: max(0.5rem, var(--safe-area-inset-right));
    }

    .map-recenter-btn {
      right: max(2.8rem, calc(var(--safe-area-inset-right) + 2.8rem));
    }
  }

  @media (max-width: 480px) {
    .tracker-shell {
      padding: 0.52rem;
      gap: 0.52rem;
    }

    .topbar {
      gap: 0.45rem;
    }

    .brand h1 {
      font-size: 0.95rem;
    }

    .brand .eyebrow {
      font-size: 0.66rem;
      letter-spacing: 0.08em;
    }

    .status-bar {
      width: 100%;
      justify-content: space-between;
      border-radius: 0.8rem;
    }

    .ferry-badge {
      padding: 0.25rem 0.45rem;
      font-size: 0.7rem;
    }

    .view-toggle,
    .share-view-btn {
      border-radius: 0.78rem;
    }

    .view-btn {
      font-size: 0.74rem;
      min-height: 36px;
    }

    .share-view-btn {
      min-height: 38px;
      font-size: 0.76rem;
      padding: 0.52rem 0.7rem;
    }

    .details-toggle-btn {
      min-height: 38px;
      font-size: 0.76rem;
      padding: 0.52rem 0.7rem;
    }

    .mode-icon {
      font-size: 0.8rem;
    }

    .map-frame {
      height: clamp(14rem, 52vw, 18.5rem);
      min-height: 13.5rem;
    }

    .map-expand-btn {
      min-height: 2.25rem;
      min-width: 2.25rem;
      padding: 0.45rem 0.62rem;
      font-size: 0.7rem;
    }

    .map-recenter-btn {
      top: 0.45rem;
      right: 2.6rem;
      width: 2.15rem;
      height: 2.15rem;
      font-size: 1rem;
    }

    :global(.maplibregl-ctrl-group button) {
      width: 2.8rem;
      height: 2.8rem;
    }
  }

  :global(html.map-expanded-lock),
  :global(body.map-expanded-lock) {
    overflow: hidden;
    touch-action: manipulation;
  }

  @media (prefers-reduced-motion: reduce) {
    .live-dot,
    .view-btn,
    .mode-filters button,
    .search input {
      animation: none !important;
      transition: none !important;
    }

    .recenter-spinner {
      animation: none !important;
    }
  }
</style>
