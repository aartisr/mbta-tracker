/**
 * Search Query Parser
 * Analyzes input queries and classifies them into types with confidence scoring
 */

import type { QueryType, SearchQuery } from './types';

export interface ParseResult {
  query_type: QueryType;
  confidence: number;
  normalized_query: string;
  parsed_tokens: string[];
}

export class SearchQueryParser {
  private routePatterns = [
    /^route\s+(\d+)$/i,
    /^(\d+)\s+bus$/i,
    /^(\d+)$/,
    /^(?:red|blue|green|orange|silver)\s+line$/i,
    /^(red|blue|green|orange|silver)\s+line$/i,
    /^(?:red|blue|orange|mattapan)$/i,
    /^green-[a-e]$/i,
    /^boat-[\w-]+$/i,
    /^cr-[\w-]+$/i,
  ];

  private stopPatterns = [
    /^stop[:\s-]*([\w-]+)$/i,
    /^st[:\s-]*([\w\s]+)$/i,
  ];

  private vehiclePatterns = [
    /^veh[:\s-]*(\d+)$/i,
    /^vehicle[:\s-]*(\d+)$/i,
    /^#(\d+)$/,
    /^bus\s+(\d+)$/i,
  ];

  private addressPatterns = [
    /^\d+\s+[\w\s]+(?:st|street|ave|avenue|rd|road|blvd|boulevard|way|court|ct|drive|dr|lane|ln|square|sq|park|place|pl|circle|trail|tr|terrace|ter|loop|parkway|pkwy)$/i,
    /^[\w\s]+\s+(?:&|and)\s+[\w\s]+$/i, // intersection with & or "and"
  ];

  private landmarkNames = [
    'downtown', 'airport', 'harbor', 'waterfront', 'backbay', 'beacon hill',
    'cambridge', 'brookline', 'newton', 'somerville', 'malden', 'medford',
    'university', 'medical', 'financial', 'government', 'shopping'
  ];

  parse(query: string): ParseResult {
    const normalized = query.trim().toLowerCase();
    const tokens = this.tokenize(normalized);

    // Try to match patterns in order of specificity and confidence
    // Higher specificity/confidence patterns first

    // 1. Vehicle (highest confidence when matched)
    const vehicleMatch = this.matchVehicle(normalized, tokens);
    if (vehicleMatch.confidence > 0.85) {
      return { ...vehicleMatch, parsed_tokens: tokens, normalized_query: normalized };
    }

    // 2. Route (high confidence)
    const routeMatch = this.matchRoute(normalized, tokens);
    if (routeMatch.confidence > 0.85) {
      return { ...routeMatch, parsed_tokens: tokens, normalized_query: normalized };
    }

    // 3. Address (check before stop to catch "X and Y" intersections)
    const addressMatch = this.matchAddress(normalized, tokens);
    if (addressMatch.confidence > 0.7) {
      return { ...addressMatch, parsed_tokens: tokens, normalized_query: normalized };
    }

    // 4. Stop (most common case)
    const stopMatch = this.matchStop(normalized, tokens);
    if (stopMatch.confidence > 0.6) {
      return { ...stopMatch, parsed_tokens: tokens, normalized_query: normalized };
    }

    // 5. Landmark (catch-all for known locations)
    const landmarkMatch = this.matchLandmark(normalized, tokens);
    if (landmarkMatch.confidence > 0.6) {
      return { ...landmarkMatch, parsed_tokens: tokens, normalized_query: normalized };
    }

    // Default to stop (most common case when uncertain)
    return {
      query_type: 'stop',
      confidence: 0.5,
      parsed_tokens: tokens,
      normalized_query: normalized,
    };
  }

  private tokenize(query: string): string[] {
    return query
      .replace(/[,!?\.]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  private matchRoute(query: string, tokens: string[]): Omit<ParseResult, 'parsed_tokens' | 'normalized_query'> {
    // Check for explicit route patterns
    for (const pattern of this.routePatterns) {
      if (pattern.test(query)) {
        return { query_type: 'route', confidence: 0.95 };
      }
    }

    // Check for line names
    const lineNames = ['red', 'blue', 'green', 'orange', 'silver'];
    if (lineNames.some(line => tokens.includes(line)) && tokens.includes('line')) {
      return { query_type: 'route', confidence: 0.90 };
    }

    // Check for "route X" pattern
    if (tokens.includes('route') && tokens.length >= 2) {
      const nextToken = tokens[tokens.indexOf('route') + 1];
      if (/^\d+$/.test(nextToken)) {
        return { query_type: 'route', confidence: 0.92 };
      }
    }

    return { query_type: 'unknown', confidence: 0.0 };
  }

  private matchVehicle(query: string, tokens: string[]): Omit<ParseResult, 'parsed_tokens' | 'normalized_query'> {
    for (const pattern of this.vehiclePatterns) {
      if (pattern.test(query)) {
        return { query_type: 'vehicle', confidence: 0.95 };
      }
    }

    return { query_type: 'unknown', confidence: 0.0 };
  }

  private matchAddress(query: string, tokens: string[]): Omit<ParseResult, 'parsed_tokens' | 'normalized_query'> {
    for (const pattern of this.addressPatterns) {
      if (pattern.test(query)) {
        return { query_type: 'address', confidence: 0.88 };
      }
    }

    // Check for number at start (likely street address)
    // Example: "878 Salem St Malden MA"
    if (/^\d+\s+/.test(query) && tokens.length >= 2) {
      return { query_type: 'address', confidence: 0.82 };
    }

    return { query_type: 'unknown', confidence: 0.0 };
  }

  private matchStop(query: string, tokens: string[]): Omit<ParseResult, 'parsed_tokens' | 'normalized_query'> {
    for (const pattern of this.stopPatterns) {
      if (pattern.test(query)) {
        return { query_type: 'stop', confidence: 0.90 };
      }
    }

    // Common stop name suffixes (highest priority for disambiguation)
    const stopSuffixes = ['station', 'terminal', 'center'];
    if (stopSuffixes.some(suffix => query.includes(suffix))) {
      return { query_type: 'stop', confidence: 0.85 };
    }

    // Multi-word queries that look like stop names (with reasonable confidence)
    if (tokens.length >= 2 && !query.includes('&')) {
      // High confidence if it looks like a real stop name (proper capitalization implied, no numbers)
      const hasNumbers = /\d/.test(query);
      if (!hasNumbers) {
        return { query_type: 'stop', confidence: 0.72 };
      }
    }

    return { query_type: 'unknown', confidence: 0.0 };
  }

  private matchLandmark(query: string, tokens: string[]): Omit<ParseResult, 'parsed_tokens' | 'normalized_query'> {
    // Check for known landmarks with exact/fuzzy match
    const matches = this.landmarkNames.filter(landmark => {
      const exactMatch = tokens.some(t => t === landmark);
      if (exactMatch) return true;

      // Fuzzy match only for single-token queries
      if (tokens.length === 1) {
        return this.levenshteinDistance(tokens[0], landmark) <= 2;
      }
      return false;
    });

    if (matches.length > 0) {
      return { query_type: 'landmark', confidence: 0.80 };
    }

    return { query_type: 'unknown', confidence: 0.0 };
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}
