import { describe, expect, it } from 'vitest';
import { distanceKm, estimateWalkMinutes } from './geo';

describe('geo helpers', () => {
  it('returns zero distance for identical coordinates', () => {
    expect(distanceKm(42.36, -71.05, 42.36, -71.05)).toBeCloseTo(0, 6);
  });

  it('estimates walking minutes with lower bound of one minute', () => {
    expect(estimateWalkMinutes(0)).toBe(1);
    expect(estimateWalkMinutes(0.8)).toBeGreaterThan(1);
  });
});
