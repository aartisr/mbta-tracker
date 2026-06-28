import { writable, type Readable, type Writable } from 'svelte/store';
import { buildTripSummaries, mergeAlertData, mergeTripData, parseVehicleList, sortVehicles } from './normalize';
import { resolveRealtimeSocketUrl } from './realtime-url';
import type { ConnectionState, TrackerAlert, TrackerState, TrackerTrip, TrackerVehicle, TrackerWidgetConfig } from './types';
import { getGlobalContainer, type ServiceContainer } from './services';

const INITIAL_CONNECTION: ConnectionState = {
  status: 'idle',
  retryInSeconds: 0,
  lastError: null,
  lastOpenedAt: null
};

const INITIAL_STATE: TrackerState = {
  vehicles: [],
  trips: [],
  alerts: [],
  totalUpdates: 0,
  lastUpdatedAt: null,
  selectedVehicleId: null
};

function backoffMs(attempt: number, maxBackoffMs: number): number {
  const base = Math.min(1000 * 2 ** attempt, maxBackoffMs);
  return base + Math.floor(Math.random() * 250);
}

export interface TrackerController {
  readonly state: Readable<TrackerState>;
  readonly connection: Readable<ConnectionState>;
  readonly selectedVehicleId: Writable<string | null>;
  start(): void;
  stop(): void;
  selectVehicle(id: string | null): void;
  focusVehicle(id: string | null): void;
}

export function createTrackerController(config: TrackerWidgetConfig, container?: ServiceContainer): TrackerController {
  // Use provided container or get global instance
  const serviceContainer = container ?? getGlobalContainer();
  
  const state = writable<TrackerState>(INITIAL_STATE);
  const connection = writable<ConnectionState>(INITIAL_CONNECTION);
  const selectedVehicleId = writable<string | null>(null);

  // Get transport from service container
  const transport = serviceContainer.getTransport();
  const logger = serviceContainer.getLogger();

  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectTick: ReturnType<typeof setInterval> | null = null;
  let reconnectAttempts = 0;
  let started = false;
  let vehiclesById = new Map<string, TrackerVehicle>();
  let retryDeadline = 0;

  const maxBackoffMs = 30000;
  const socketUrl = resolveRealtimeSocketUrl(config.wsUrl);

  function pushConnection(next: Partial<ConnectionState>) {
    connection.update((current) => ({ ...current, ...next }));
  }

  function commitVehicles(nextVehicles: TrackerVehicle[]) {
    const sorted = sortVehicles(nextVehicles);
    state.update((current) => ({
      ...current,
      vehicles: sorted,
      trips: buildTripSummaries(sorted),
      totalUpdates: current.totalUpdates + 1,
      lastUpdatedAt: Date.now()
    }));
  }

  function commitTrips(nextTrips: TrackerTrip[]) {
    state.update((current) => ({
      ...current,
      trips: nextTrips
    }));
  }

  function commitAlerts(nextAlerts: TrackerAlert[]) {
    state.update((current) => ({
      ...current,
      alerts: nextAlerts
    }));
  }

  function syncSelection(nextVehicles: TrackerVehicle[]) {
    selectedVehicleId.update((current) => {
      if (current && nextVehicles.some((vehicle) => vehicle.id === current)) {
        return current;
      }
      return nextVehicles[0]?.id ?? null;
    });
  }

  function scheduleReconnect() {
    if (reconnectTimer || !started) {
      return;
    }

    pushConnection({ status: 'reconnecting', lastError: null });
    const delay = backoffMs(reconnectAttempts, maxBackoffMs);
    reconnectAttempts += 1;
    retryDeadline = Date.now() + delay;
    connection.update((current) => ({
      ...current,
      retryInSeconds: Math.ceil(delay / 1000)
    }));

    if (reconnectTick) {
      clearInterval(reconnectTick);
      reconnectTick = null;
    }

    reconnectTick = setInterval(() => {
      const remaining = Math.max(retryDeadline - Date.now(), 0);
      connection.update((current) => ({
        ...current,
        retryInSeconds: Math.ceil(remaining / 1000)
      }));

      if (remaining === 0 && reconnectTick) {
        clearInterval(reconnectTick);
        reconnectTick = null;
      }
    }, 1000);

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connection.update((current) => ({ ...current, retryInSeconds: 0 }));
      if (reconnectTick) {
        clearInterval(reconnectTick);
        reconnectTick = null;
      }
      connect();
    }, delay);
  }

  function connect() {
    if (!started) {
      return;
    }

    pushConnection({ status: 'connecting', lastError: null, retryInSeconds: 0 });
    logger.debug('Connecting to transport', { url: socketUrl });
    
    // Transport handles reconnection and connection logic internally
    transport.connect().catch((error) => {
      logger.error('Failed to connect to transport', { error: error instanceof Error ? error.message : String(error) });
      pushConnection({
        status: 'error',
        lastError: error instanceof Error ? error.message : 'Failed to connect'
      });
    });
  }

  // Set up transport event listeners
  transport.on('open', () => {
    reconnectAttempts = 0;
    pushConnection({ status: 'open', retryInSeconds: 0, lastOpenedAt: Date.now(), lastError: null });
    if (reconnectTick) {
      clearInterval(reconnectTick);
      reconnectTick = null;
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  });

  transport.on('data', (message) => {
    // Connection successful - data received
    reconnectAttempts = 0;

    try {
      const nextVehicles = parseVehicleList(message.vehicles || message);
      const nextTrips = mergeTripData(message, nextVehicles);
      const nextAlerts = mergeAlertData(message);

      for (const vehicle of nextVehicles) {
        vehiclesById.set(vehicle.id, vehicle);
      }

      const merged = Array.from(vehiclesById.values());
      commitVehicles(merged);
      if (nextTrips.length > 0) {
        commitTrips(nextTrips);
      }
      if (nextAlerts.length > 0) {
        commitAlerts(nextAlerts);
      }
      syncSelection(merged);
    } catch (error) {
      logger.error('Failed to process message', { error: error instanceof Error ? error.message : String(error) });
      pushConnection({
        status: 'error',
        lastError: error instanceof Error ? error.message : 'Malformed realtime payload'
      });
    }
  });

  transport.on('error', (error) => {
    logger.error('Transport error', { error: error instanceof Error ? error.message : String(error) });
    pushConnection({ 
      status: 'error', 
      lastError: error instanceof Error ? error.message : 'Transport error'
    });
  });

  transport.on('close', () => {
    logger.debug('Transport closed');
    pushConnection({ status: 'closed' });
    if (started) {
      scheduleReconnect();
    }
  });

  function stop() {
    started = false;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (reconnectTick) {
      clearInterval(reconnectTick);
      reconnectTick = null;
    }
    logger.debug('Stopping transport');
    transport.disconnect();
    pushConnection({ status: 'idle', retryInSeconds: 0 });
  }

  function focusVehicle(id: string | null) {
    selectedVehicleId.set(id);
  }

  return {
    state,
    connection,
    selectedVehicleId,
    start() {
      if (started) {
        return;
      }
      started = true;
      connect();
    },
    stop,
    selectVehicle(id: string | null) {
      focusVehicle(id);
    },
    focusVehicle
  };
}
