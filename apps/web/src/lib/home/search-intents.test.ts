import { describe, expect, it } from 'vitest';
import { inferSearchIntent, looksLikeAddressQuery, looksLikeRouteQuery } from './search-intents';

describe('search-intents', () => {
  it('detects address-like queries', () => {
    expect(looksLikeAddressQuery('878 Salem St, Malden MA')).toBe(true);
    expect(looksLikeAddressQuery('')).toBe(false);
  });

  it('detects route-like queries', () => {
    expect(looksLikeRouteQuery('66')).toBe(true);
    expect(looksLikeRouteQuery('Red Line')).toBe(true);
    expect(looksLikeRouteQuery('South Station')).toBe(false);
  });

  it('infers search intent', () => {
    expect(inferSearchIntent('878 Salem St')).toBe('address');
    expect(inferSearchIntent('Green Line')).toBe('route');
    expect(inferSearchIntent('South Station')).toBeNull();
  });
});
