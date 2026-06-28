import { describe, expect, it } from 'vitest';
import { resolveRollout } from './rollout';

describe('resolveRollout', () => {
  it('returns disabled when feature flag is off', () => {
    const decision = resolveRollout('client-1', false, 100, 'salt');
    expect(decision.enabled).toBe(false);
    expect(decision.reason).toBe('disabled');
  });

  it('is deterministic for the same client and salt', () => {
    const first = resolveRollout('client-abc', true, 50, 'salt');
    const second = resolveRollout('client-abc', true, 50, 'salt');
    expect(first.bucket).toBe(second.bucket);
    expect(first.enabled).toBe(second.enabled);
  });

  it('respects percent boundaries', () => {
    const off = resolveRollout('client-any', true, 0, 'salt');
    const on = resolveRollout('client-any', true, 100, 'salt');
    expect(off.enabled).toBe(false);
    expect(on.enabled).toBe(true);
  });
});
