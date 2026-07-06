import type { SearchIntent } from './search-intents';

export type OnboardingVariant = SearchIntent;
export type OnboardingSignal = SearchIntent | 'map';

export type OnboardingProfile = {
  addressCount: number;
  routeCount: number;
  mapCount: number;
};

export const DEFAULT_ONBOARDING_PROFILE: OnboardingProfile = {
  addressCount: 0,
  routeCount: 0,
  mapCount: 0
};

export function normalizeOnboardingProfile(profile: Partial<OnboardingProfile> | null | undefined): OnboardingProfile {
  return {
    addressCount: Math.max(0, Number(profile?.addressCount) || 0),
    routeCount: Math.max(0, Number(profile?.routeCount) || 0),
    mapCount: Math.max(0, Number(profile?.mapCount) || 0)
  };
}

export function getPreferredOnboardingVariant(
  profile: OnboardingProfile,
  fallback: OnboardingVariant
): OnboardingVariant {
  const routeWeight = profile.routeCount + Math.round(profile.mapCount * 0.7);
  const addressWeight = profile.addressCount;

  if (routeWeight - addressWeight >= 1) {
    return 'route';
  }

  if (addressWeight - routeWeight >= 1) {
    return 'address';
  }

  return fallback;
}

export function applyOnboardingSignal(
  profile: OnboardingProfile,
  signal: OnboardingSignal
): OnboardingProfile {
  if (signal === 'address') {
    return {
      ...profile,
      addressCount: profile.addressCount + 1
    };
  }

  if (signal === 'route') {
    return {
      ...profile,
      routeCount: profile.routeCount + 1
    };
  }

  return {
    ...profile,
    mapCount: profile.mapCount + 1
  };
}
