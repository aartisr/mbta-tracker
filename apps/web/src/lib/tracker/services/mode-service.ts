/**
 * Mode Detection & Route Styling Services
 * 
 * Centralizes all logic for:
 * - Inferring transit mode from route data
 * - Mapping route IDs to MBTA brand colors
 * - Consistent styling across UI
 * 
 * Makes it easy to add new modes or customize colors
 */

import type { TrackerMode, TrackerVehicle } from '../types';

export interface RouteStyle {
  body: string;
  stroke: string;
  accent: string;
}

export interface RawVehicleData {
  mode?: string | null;
  routeId: string | null;
  routeLabel: string | null;
  routeType?: number | null;
}

/**
 * Detects transit mode from raw vehicle/route data
 */
export interface ModeDetector {
  /**
   * Infer mode from available data, in order of certainty
   */
  detect(data: RawVehicleData): TrackerMode;

  /**
   * Register a custom mode detection rule
   * Useful for extensions or local transit systems
   */
  addRule(predicate: (data: RawVehicleData) => TrackerMode | null, priority?: number): void;
}

/**
 * MBTA mode detection with customizable rules
 */
export class MBTAModeDetector implements ModeDetector {
  private rules: Array<{
    priority: number;
    predicate: (data: RawVehicleData) => TrackerMode | null;
  }> = [];

  constructor() {
    // Initialize with MBTA-specific rules in order of certainty
    this.rules.push(
      // Priority 1: Explicit route_type from GTFS-RT
      {
        priority: 1000,
        predicate: (data) => {
          if (data.routeType === 4) return 'ferry';
          if (data.routeType === 2) return 'commuter-rail';
          if (data.routeType === 0 || data.routeType === 1) return 'subway';
          if (data.routeType === 3) return 'bus';
          return null;
        }
      },

      // Priority 2: Ferry-specific route ID patterns
      {
        priority: 900,
        predicate: (data) => {
          if (this.looksLikeFerry(data.routeId)) return 'ferry';
          return null;
        }
      },

      // Priority 3: Known MBTA line colors in route ID
      {
        priority: 800,
        predicate: (data) => {
          const id = (data.routeId ?? '').toLowerCase();
          if (id === 'red' || id === 'mattapan') return 'subway';
          if (id === 'orange') return 'subway';
          if (id === 'blue') return 'subway';
          if (id.startsWith('green')) return 'subway';
          if (id === 'silver' || id.startsWith('sl')) return 'bus';
          if (id.startsWith('cr-')) return 'commuter-rail';
          return null;
        }
      },

      // Priority 4: Text-based heuristics
      {
        priority: 700,
        predicate: (data) => {
          const text = `${data.routeId ?? ''} ${data.routeLabel ?? ''}`.toLowerCase();
          if (text.includes('ferry') || text.includes('boat')) return 'ferry';
          if (text.includes('commuter') || text.includes('rail') || text.includes('cr-')) {
            return 'commuter-rail';
          }
          if (text.includes('red') || text.includes('orange') || text.includes('blue') || text.includes('green')) {
            return 'subway';
          }
          return null;
        }
      },

      // Priority 5: Default fallback
      {
        priority: 0,
        predicate: () => 'bus'
      }
    );

    this.rules.sort((a, b) => b.priority - a.priority);
  }

  detect(data: RawVehicleData): TrackerMode {
    for (const rule of this.rules) {
      const result = rule.predicate(data);
      if (result !== null) {
        return result;
      }
    }
    return 'bus';
  }

  addRule(predicate: (data: RawVehicleData) => TrackerMode | null, priority = 500): void {
    this.rules.push({ priority, predicate });
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  private looksLikeFerry(routeId: string | null): boolean {
    if (!routeId) return false;
    const id = routeId.trim().toLowerCase();
    return id.startsWith('boat-') || /^f\d+$/.test(id);
  }
}

/**
 * Provides consistent styling for routes/modes
 */
export interface RouteStyleProvider {
  /**
   * Get style for a specific route
   */
  getStyle(routeId: string | null, mode: TrackerMode): RouteStyle;

  /**
   * Get all available styles
   */
  getAllStyles(): Map<string, RouteStyle>;

  /**
   * Register custom style for route
   */
  setStyle(key: string, style: RouteStyle): void;

  /**
   * Get style for generic mode when route-specific not available
   */
  getModeStyle(mode: TrackerMode): RouteStyle;
}

/**
 * MBTA official route brand colors + generics
 */
export class MBTARouteStyleProvider implements RouteStyleProvider {
  private styles = new Map<string, RouteStyle>([
    // MBTA subway lines
    ['red', { body: '#DA291C', stroke: '#A31F15', accent: '#FF8A80' }],
    ['orange', { body: '#ED8B00', stroke: '#C47300', accent: '#FFD080' }],
    ['blue', { body: '#003DA5', stroke: '#002D7C', accent: '#80A3FF' }],
    ['green', { body: '#00843D', stroke: '#006630', accent: '#80E8AA' }],
    ['silver', { body: '#7C878E', stroke: '#5A6470', accent: '#C8D0D6' }],

    // Generic mode colors
    ['commuter-rail', { body: '#80276C', stroke: '#5E1C50', accent: '#E0A8D0' }],
    ['ferry', { body: '#0284c7', stroke: '#0369a1', accent: '#7DD3FC' }],
    ['bus', { body: '#FFC72C', stroke: '#1F2937', accent: '#CBD5E1' }],
    ['subway', { body: '#003DA5', stroke: '#002D7C', accent: '#80A3FF' }]
  ]);

  getStyle(routeId: string | null, mode: TrackerMode): RouteStyle {
    const key = this.getStyleKey(routeId, mode);
    return this.styles.get(key) || this.getModeStyle(mode);
  }

  getAllStyles(): Map<string, RouteStyle> {
    return new Map(this.styles);
  }

  setStyle(key: string, style: RouteStyle): void {
    this.styles.set(key, style);
  }

  getModeStyle(mode: TrackerMode): RouteStyle {
    return this.styles.get(mode) || this.styles.get('bus')!;
  }

  private getStyleKey(routeId: string | null, mode: TrackerMode): string {
    if (!routeId) {
      return mode;
    }

    const id = routeId.toLowerCase();

    // Check exact match first
    if (this.styles.has(id)) {
      return id;
    }

    // MBTA-specific aliases
    if (id === 'mattapan') return 'red';
    if (id.startsWith('green')) return 'green';
    if (id === 'silver' || id.startsWith('sl')) return 'silver';

    // Fallback to mode
    return mode;
  }
}

/**
 * Service configuration for easy testing
 */
export interface ModeServiceConfig {
  modeDetector?: ModeDetector;
  styleProvider?: RouteStyleProvider;
}

/**
 * Singleton access to mode & styling services
 */
export class ModeService {
  private static detector: ModeDetector = new MBTAModeDetector();
  private static styleProvider: RouteStyleProvider = new MBTARouteStyleProvider();

  static configure(config: ModeServiceConfig): void {
    if (config.modeDetector) {
      ModeService.detector = config.modeDetector;
    }
    if (config.styleProvider) {
      ModeService.styleProvider = config.styleProvider;
    }
  }

  static detectMode(data: RawVehicleData): TrackerMode {
    return ModeService.detector.detect(data);
  }

  static getStyle(routeId: string | null, mode: TrackerMode): RouteStyle {
    return ModeService.styleProvider.getStyle(routeId, mode);
  }

  static getModeStyle(mode: TrackerMode): RouteStyle {
    return ModeService.styleProvider.getModeStyle(mode);
  }

  static setStyle(key: string, style: RouteStyle): void {
    ModeService.styleProvider.setStyle(key, style);
  }

  static getAllStyles(): Map<string, RouteStyle> {
    return ModeService.styleProvider.getAllStyles();
  }

  static addModeRule(
    predicate: (data: RawVehicleData) => TrackerMode | null,
    priority?: number
  ): void {
    if (ModeService.detector instanceof MBTAModeDetector) {
      ModeService.detector.addRule(predicate, priority);
    }
  }

  static getDetector(): ModeDetector {
    return ModeService.detector;
  }

  static getStyleProvider(): RouteStyleProvider {
    return ModeService.styleProvider;
  }
}
