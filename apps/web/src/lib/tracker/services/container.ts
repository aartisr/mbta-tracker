/**
 * Service Container (Dependency Injection)
 * 
 * Centralized configuration and lifecycle management for all services.
 * Enables easy testing, mocking, and configuration.
 * 
 * Usage:
 * - Production: const container = new DefaultServiceContainer(config);
 * - Testing: const container = new TestServiceContainer({ mockTransport, ... });
 */

import type { RealtimeTransport, TransportConfig } from './transport';
import { WebSocketTransport, SSETransport } from './transport';
import type { TransitDataRepository, GeoRepository as GeoRepositoryType } from './repositories';
import { MBTARepository, MockTransitDataRepository, GeoRepository } from './repositories';
import type { ModeDetector, RouteStyleProvider, ModeServiceConfig } from './mode-service';
import { MBTAModeDetector, MBTARouteStyleProvider } from './mode-service';
import type { StopEnrichmentService } from './enrichers';
import { createDefaultStopEnrichmentService } from './enrichers';
import { resolveRealtimeSocketUrl } from '../realtime-url';

export type TransportType = 'websocket' | 'sse' | 'polling';

export interface ServiceContainerConfig {
  transportType?: TransportType;
  transportUrl?: string;
  useMockData?: boolean;
  enableLogging?: boolean;
  modeDetector?: ModeDetector;
  styleProvider?: RouteStyleProvider;
  stopEnricher?: StopEnrichmentService;
}

/**
 * Main service container interface
 */
export interface ServiceContainer {
  /**
   * Get the realtime transport implementation
   */
  getTransport(): RealtimeTransport;

  /**
   * Get the transit data repository
   */
  getRepository(): TransitDataRepository;

  /**
   * Get the geo/location repository
   */
  getGeoRepository(): GeoRepositoryType;

  /**
   * Get the mode detector
   */
  getModeDetector(): ModeDetector;

  /**
   * Get the route style provider
   */
  getStyleProvider(): RouteStyleProvider;

  /**
   * Get logger (for debugging/monitoring)
   */
  getLogger(): Logger;

  /**
   * Get the stop enrichment pipeline
   */
  getStopEnricher(): StopEnrichmentService;

  /**
   * Cleanup resources before shutting down
   */
  destroy(): void;
}

export interface Logger {
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

/**
 * Console-based logger
 */
export class ConsoleLogger implements Logger {
  debug(message: string, data?: any): void {
    console.debug(`[DEBUG] ${message}`, data);
  }

  info(message: string, data?: any): void {
    console.info(`[INFO] ${message}`, data);
  }

  warn(message: string, data?: any): void {
    console.warn(`[WARN] ${message}`, data);
  }

  error(message: string, error?: any): void {
    console.error(`[ERROR] ${message}`, error);
  }
}

/**
 * No-op logger for production
 */
export class SilentLogger implements Logger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

/**
 * Production service container
 */
export class DefaultServiceContainer implements ServiceContainer {
  private transport: RealtimeTransport;
  private repository: TransitDataRepository;
  private geoRepository: GeoRepository;
  private modeDetector: ModeDetector;
  private styleProvider: RouteStyleProvider;
  private stopEnricher: StopEnrichmentService;
  private logger: Logger;

  constructor(config: ServiceContainerConfig = {}) {
    this.logger = config.enableLogging ? new ConsoleLogger() : new SilentLogger();

    // Initialize transport
    const transportType = config.transportType ?? 'websocket';
    const transportUrl = config.transportUrl || this.getDefaultTransportUrl();

    this.transport = this.createTransport(transportType, transportUrl);

    // Initialize repositories
    this.repository = config.useMockData
      ? new MockTransitDataRepository()
      : new MBTARepository();

    this.geoRepository = new GeoRepository();

    // Initialize mode & styling
    this.modeDetector = config.modeDetector ?? new MBTAModeDetector();
    this.styleProvider = config.styleProvider ?? new MBTARouteStyleProvider();
    this.stopEnricher = config.stopEnricher ?? createDefaultStopEnrichmentService();

    this.logger.info('Service container initialized', { transportType, useMockData: config.useMockData });
  }

  getTransport(): RealtimeTransport {
    return this.transport;
  }

  getRepository(): TransitDataRepository {
    return this.repository;
  }

  getGeoRepository(): GeoRepositoryType {
    return this.geoRepository;
  }

  getModeDetector(): ModeDetector {
    return this.modeDetector;
  }

  getStyleProvider(): RouteStyleProvider {
    return this.styleProvider;
  }

  getLogger(): Logger {
    return this.logger;
  }

  getStopEnricher(): StopEnrichmentService {
    return this.stopEnricher;
  }

  destroy(): void {
    this.transport.disconnect();
    this.logger.info('Service container destroyed');
  }

  private createTransport(type: TransportType, url: string): RealtimeTransport {
    const config: TransportConfig = {
      url,
      retryMs: 1000,
      maxRetryMs: 30000,
      timeout: 5000
    };

    switch (type) {
      case 'sse':
        return new SSETransport(config);
      case 'websocket':
      default:
        return new WebSocketTransport(config);
    }
  }

  private getDefaultTransportUrl(): string {
    return resolveRealtimeSocketUrl(null);
  }
}

/**
 * Test service container with overridable services
 */
export class TestServiceContainer implements ServiceContainer {
  private transport: RealtimeTransport;
  private repository: TransitDataRepository;
  private geoRepository: GeoRepositoryType;
  private modeDetector: ModeDetector;
  private styleProvider: RouteStyleProvider;
  private stopEnricher: StopEnrichmentService;
  private logger: Logger;

  constructor(overrides: Partial<ServiceContainer>) {
    // Create defaults
    const defaults = new DefaultServiceContainer({ enableLogging: false });

    // Apply overrides
    this.transport = overrides.getTransport?.() ?? defaults.getTransport();
    this.repository = overrides.getRepository?.() ?? defaults.getRepository();
    this.geoRepository = overrides.getGeoRepository?.() ?? defaults.getGeoRepository();
    this.modeDetector = overrides.getModeDetector?.() ?? defaults.getModeDetector();
    this.styleProvider = overrides.getStyleProvider?.() ?? defaults.getStyleProvider();
    this.stopEnricher = overrides.getStopEnricher?.() ?? defaults.getStopEnricher();
    this.logger = overrides.getLogger?.() ?? defaults.getLogger();
  }

  getTransport(): RealtimeTransport {
    return this.transport;
  }

  getRepository(): TransitDataRepository {
    return this.repository;
  }

  getGeoRepository(): GeoRepositoryType {
    return this.geoRepository;
  }

  getModeDetector(): ModeDetector {
    return this.modeDetector;
  }

  getStyleProvider(): RouteStyleProvider {
    return this.styleProvider;
  }

  getLogger(): Logger {
    return this.logger;
  }

  getStopEnricher(): StopEnrichmentService {
    return this.stopEnricher;
  }

  destroy(): void {
    this.transport.disconnect();
  }
}

/**
 * Global container instance (singleton)
 */
let globalContainer: ServiceContainer | null = null;

export function initializeGlobalContainer(config: ServiceContainerConfig): ServiceContainer {
  if (globalContainer) {
    globalContainer.destroy();
  }
  globalContainer = new DefaultServiceContainer(config);
  return globalContainer;
}

export function getGlobalContainer(): ServiceContainer {
  if (!globalContainer) {
    globalContainer = new DefaultServiceContainer();
  }
  return globalContainer;
}

export function resetGlobalContainer(): void {
  if (globalContainer) {
    globalContainer.destroy();
  }
  globalContainer = null;
}
