export interface CrowdingEstimateInput {
  baseKey: string;
  arrivalsWithinHorizon: number;
  horizonMinutes: number;
  routeDiversity: number;
  timestampMs: number;
}

export interface BoardingScoreInput {
  etaMinutes: number;
  transferCount: number;
  crowdingPercent: number;
  delayMinutes: number;
  preference: 'balanced' | 'fastest' | 'least_crowded';
}

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

export function peakFactor(timestampMs: number): number {
  const hour = new Date(timestampMs).getHours();
  if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)) {
    return 1.25;
  }

  if (hour >= 22 || hour <= 5) {
    return 0.72;
  }

  return 1;
}

export function estimateCrowdingPercent(input: CrowdingEstimateInput): number {
  const {
    baseKey,
    arrivalsWithinHorizon,
    horizonMinutes,
    routeDiversity,
    timestampMs
  } = input;

  const baseNoise = (hashString(`${baseKey}:${Math.floor(timestampMs / 300000)}:${horizonMinutes}`) % 33) + 22;
  const arrivalsBoost = Math.min(28, arrivalsWithinHorizon * 6.5);
  const diversityBoost = Math.min(16, Math.max(0, routeDiversity - 1) * 4.2);
  const horizonDecay = Math.max(0.65, 1 - horizonMinutes / 230);
  const raw = (baseNoise + arrivalsBoost + diversityBoost) * peakFactor(timestampMs) * horizonDecay;

  return Math.max(8, Math.min(96, Math.round(raw)));
}

export function scoreBoardingOption(input: BoardingScoreInput): number {
  const { etaMinutes, transferCount, crowdingPercent, delayMinutes, preference } = input;

  const profile =
    preference === 'fastest'
      ? { wait: 0.65, transfers: 0.15, crowding: 0.1, delay: 0.1 }
      : preference === 'least_crowded'
        ? { wait: 0.2, transfers: 0.1, crowding: 0.6, delay: 0.1 }
        : { wait: 0.4, transfers: 0.2, crowding: 0.3, delay: 0.1 };

  const normalizedWait = Math.min(1, etaMinutes / 25);
  const normalizedTransfers = Math.min(1, transferCount / 2);
  const normalizedCrowding = Math.min(1, crowdingPercent / 100);
  const normalizedDelay = Math.min(1, delayMinutes / 20);

  const weighted =
    normalizedWait * profile.wait +
    normalizedTransfers * profile.transfers +
    normalizedCrowding * profile.crowding +
    normalizedDelay * profile.delay;

  return Math.round(weighted * 1000) / 1000;
}
