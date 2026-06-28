import { describe, expect, it } from 'vitest';
import { MBTAModeDetector, MBTARouteStyleProvider, ModeService } from './mode-service';

describe('MBTAModeDetector', () => {
  it('prefers explicit routeType for ferry detection', () => {
    const detector = new MBTAModeDetector();
    expect(detector.detect({ routeId: 'Red', routeLabel: 'Red Line', routeType: 4 })).toBe('ferry');
  });

  it('supports custom rules ahead of fallback logic', () => {
    const detector = new MBTAModeDetector();
    detector.addRule((data) => (data.routeId === 'mystery' ? 'ferry' : null), 950);

    expect(detector.detect({ routeId: 'mystery', routeLabel: null, routeType: null })).toBe('ferry');
  });
});

describe('MBTARouteStyleProvider', () => {
  it('maps green line branches to the green palette', () => {
    const provider = new MBTARouteStyleProvider();
    expect(provider.getStyle('Green-B', 'subway').body).toBe('#00843D');
  });
});

describe('ModeService', () => {
  it('returns configured generic mode styles', () => {
    const busStyle = ModeService.getModeStyle('bus');
    expect(busStyle.body).toBe('#FFC72C');
    expect(busStyle.stroke).toBe('#1F2937');
    expect(busStyle.accent).toBe('#CBD5E1');
  });
});