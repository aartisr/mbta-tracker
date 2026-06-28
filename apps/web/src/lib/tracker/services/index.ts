/**
 * Services Module Index
 * 
 * Clean exports for all modular services.
 * Isolates service dependencies from rest of application.
 */

// Transport layer
export {
  type ConnectionStatus,
  type TransportMessage,
  type RealtimeTransport,
  type TransportConfig,
  BaseTransport,
  WebSocketTransport,
  SSETransport
} from './transport';

// Data repositories
export {
  type GeoLocation,
  type TransitDataRepository,
  MBTARepository,
  GeoRepository,
  MockTransitDataRepository
} from './repositories';

// Mode detection & styling
export {
  type RouteStyle,
  type RawVehicleData,
  type ModeDetector,
  type RouteStyleProvider,
  type ModeServiceConfig,
  MBTAModeDetector,
  MBTARouteStyleProvider,
  ModeService
} from './mode-service';

// Service container & DI
export {
  type TransportType,
  type ServiceContainerConfig,
  type ServiceContainer,
  type Logger,
  ConsoleLogger,
  SilentLogger,
  DefaultServiceContainer,
  TestServiceContainer,
  initializeGlobalContainer,
  getGlobalContainer,
  resetGlobalContainer
} from './container';

// Stop enrichment pipeline
export {
  type EnrichmentContext,
  type StopEnricher,
  type StopEnrichmentService,
  WalkabilityEnricher,
  RealtimeArrivalsEnricher,
  AccessibilityEnricher,
  CompositeStopEnricher,
  createDefaultStopEnrichmentService
} from './enrichers';
