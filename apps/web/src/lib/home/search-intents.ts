export type SearchIntent = 'address' | 'route';

export function looksLikeAddressQuery(value: string): boolean {
  const query = value.trim().toLowerCase();
  if (!query) {
    return false;
  }

  return /^\d+\s+/.test(query)
    || /\b(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|pkwy|parkway)\b/.test(query)
    || /\b(ma|massachusetts|boston|cambridge|somerville|malden|medford|quincy|brookline)\b/.test(query);
}

export function looksLikeRouteQuery(value: string): boolean {
  const query = value.trim().toLowerCase();
  if (!query) {
    return false;
  }

  return /^\d{1,3}[a-z]?$/.test(query)
    || /\b(route|line)\b/.test(query)
    || /\b(red|green|orange|blue|silver|mattapan)\b/.test(query);
}

export function inferSearchIntent(value: string): SearchIntent | null {
  if (looksLikeAddressQuery(value)) {
    return 'address';
  }

  if (looksLikeRouteQuery(value)) {
    return 'route';
  }

  return null;
}
