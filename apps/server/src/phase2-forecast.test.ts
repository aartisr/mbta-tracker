import { describe, expect, it } from 'vitest';
import {
  estimateCrowdingPercent,
  hashString,
  peakFactor,
  scoreBoardingOption
} from './phase2-forecast';

describe('phase2-forecast', () => {
  it('returns deterministic hash output', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(hashString('abc')).not.toBe(hashString('abcd'));
  });

  it('returns peak factor > 1 during rush hour', () => {
    const rush = new Date('2026-06-27T08:30:00-04:00').getTime();
    const offPeak = new Date('2026-06-27T13:30:00-04:00').getTime();
    expect(peakFactor(rush)).toBeGreaterThan(peakFactor(offPeak));
  });

  it('estimates crowding within bounded range', () => {
    const estimate = estimateCrowdingPercent({
      baseKey: 'place-dwnxg',
      arrivalsWithinHorizon: 3,
      horizonMinutes: 15,
      routeDiversity: 2,
      timestampMs: Date.now()
    });

    expect(estimate).toBeGreaterThanOrEqual(8);
    expect(estimate).toBeLessThanOrEqual(96);
  });

  it('scores least crowded preference lower for low-crowding options', () => {
    const crowded = scoreBoardingOption({
      etaMinutes: 4,
      transferCount: 0,
      crowdingPercent: 82,
      delayMinutes: 0,
      preference: 'least_crowded'
    });

    const quiet = scoreBoardingOption({
      etaMinutes: 7,
      transferCount: 0,
      crowdingPercent: 31,
      delayMinutes: 0,
      preference: 'least_crowded'
    });

    expect(quiet).toBeLessThan(crowded);
  });
});
