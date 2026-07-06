import { describe, expect, it } from 'vitest';
import {
  applyOnboardingSignal,
  DEFAULT_ONBOARDING_PROFILE,
  getPreferredOnboardingVariant,
  normalizeOnboardingProfile
} from './onboarding-personalization';

describe('onboarding-personalization', () => {
  it('normalizes malformed profile payloads', () => {
    const normalized = normalizeOnboardingProfile({
      addressCount: -5,
      routeCount: Number.NaN,
      mapCount: 2
    });

    expect(normalized).toEqual({
      addressCount: 0,
      routeCount: 0,
      mapCount: 2
    });
  });

  it('applies onboarding signals immutably', () => {
    const profile = DEFAULT_ONBOARDING_PROFILE;
    const updated = applyOnboardingSignal(profile, 'route');

    expect(updated).toEqual({
      addressCount: 0,
      routeCount: 1,
      mapCount: 0
    });
    expect(profile).toEqual(DEFAULT_ONBOARDING_PROFILE);
  });

  it('prefers route variant when route/map weight dominates', () => {
    expect(
      getPreferredOnboardingVariant(
        {
          addressCount: 1,
          routeCount: 3,
          mapCount: 2
        },
        'address'
      )
    ).toBe('route');
  });
});
