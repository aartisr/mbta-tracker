export interface RolloutDecision {
  enabled: boolean;
  bucket: number;
  percent: number;
  reason: 'disabled' | 'bucket';
}

function normalizePercent(percent: number): number {
  if (!Number.isFinite(percent)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.floor(percent)));
}

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return Math.abs(hash >>> 0);
}

export function resolveRollout(
  clientId: string,
  enabledFlag: boolean,
  rolloutPercent: number,
  salt = 'mbta-rollout-v1'
): RolloutDecision {
  const percent = normalizePercent(rolloutPercent);
  const bucket = stableHash(`${salt}:${clientId || 'anon'}`) % 100;

  if (!enabledFlag) {
    return {
      enabled: false,
      bucket,
      percent,
      reason: 'disabled'
    };
  }

  return {
    enabled: bucket < percent,
    bucket,
    percent,
    reason: 'bucket'
  };
}
