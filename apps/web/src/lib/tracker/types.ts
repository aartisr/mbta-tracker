export type TrackerMode = 'all' | 'bus' | 'subway' | 'commuter-rail' | 'ferry';

export type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed' | 'error';

export interface TrackerVehicle {
  id: string;
  routeId: string | null;
  routeLabel: string | null;
  routeType?: number | null;
  mode: TrackerMode;
  directionId: number | null;
  headsign: string | null;
  stopId: string | null;
  stopSequence: number | null;
  lat: number;
  lon: number;
  bearing: number;
  timestamp: string | null;
}

export interface TrackerAlert {
  id: string;
  title: string;
  detail: string | null;
  severity: 'low' | 'medium' | 'high' | 'unknown';
}

export interface TrackerTrip {
  id: string;
  routeId: string | null;
  routeLabel: string | null;
  headsign: string | null;
  mode: TrackerMode;
  directionId: number | null;
  stopId: string | null;
  etaMinutes: number | null;
  stopCount: number | null;
  liveVehicleCount: number;
  scheduleRelationship: string | null;
}

export interface TrackerState {
  vehicles: TrackerVehicle[];
  trips: TrackerTrip[];
  alerts: TrackerAlert[];
  totalUpdates: number;
  lastUpdatedAt: number | null;
  selectedVehicleId: string | null;
}

export interface ConnectionState {
  status: ConnectionStatus;
  retryInSeconds: number;
  lastError: string | null;
  lastOpenedAt: number | null;
}

export interface TrackerWidgetConfig {
  title: string;
  subtitle: string;
  wsUrl: string | null;
  mapStyle: string;
  center: [number, number];
  zoom: number;
  focusAddress?: {
    label: string;
    lat: number;
    lon: number;
    confidence: number;
  } | null;
  showList: boolean;
  showAlerts: boolean;
  showSearch: boolean;
  embedded: boolean;
}
