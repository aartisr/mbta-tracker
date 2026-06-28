/**
 * Search Query Parser Tests
 * Unit tests for parser accuracy (target: >95%)
 */

import { describe, it, expect } from 'vitest';
import { SearchQueryParser } from './search-parser';

describe('SearchQueryParser', () => {
  const parser = new SearchQueryParser();

  describe('Route Queries', () => {
    it('should recognize "38" as route with high confidence', () => {
      const result = parser.parse('38');
      expect(result.query_type).toBe('route');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should recognize "Route 38" as route', () => {
      const result = parser.parse('Route 38');
      expect(result.query_type).toBe('route');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should recognize "38 bus" as route', () => {
      const result = parser.parse('38 bus');
      expect(result.query_type).toBe('route');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should recognize "Red Line" as route', () => {
      const result = parser.parse('Red Line');
      expect(result.query_type).toBe('route');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should recognize "red line" (case insensitive) as route', () => {
      const result = parser.parse('red line');
      expect(result.query_type).toBe('route');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should recognize "Blue Line" as route', () => {
      const result = parser.parse('Blue Line');
      expect(result.query_type).toBe('route');
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Stop Queries', () => {
    it('should recognize "Park Street" as stop', () => {
      const result = parser.parse('Park Street');
      expect(result.query_type).toBe('stop');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should recognize "Park Street Station" as stop', () => {
      const result = parser.parse('Park Street Station');
      expect(result.query_type).toBe('stop');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should recognize "Downtown Crossing" as stop', () => {
      const result = parser.parse('Downtown Crossing');
      expect(result.query_type).toBe('stop');
    });

    it('should recognize stop with station suffix', () => {
      const result = parser.parse('Government Center Station');
      expect(result.query_type).toBe('stop');
    });

    it('should recognize stop with terminal suffix', () => {
      const result = parser.parse('Central Station Terminal');
      expect(result.query_type).toBe('stop');
    });
  });

  describe('Address Queries', () => {
    it('should recognize "123 Main St" as address', () => {
      const result = parser.parse('123 Main St');
      expect(result.query_type).toBe('address');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should recognize "123 Main Street" as address', () => {
      const result = parser.parse('123 Main Street');
      expect(result.query_type).toBe('address');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should recognize "456 Boylston Ave" as address', () => {
      const result = parser.parse('456 Boylston Ave');
      expect(result.query_type).toBe('address');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should recognize "1 Park Plaza Blvd" as address', () => {
      const result = parser.parse('1 Park Plaza Blvd');
      expect(result.query_type).toBe('address');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should recognize "878 Salem St Malden MA" as address', () => {
      const result = parser.parse('878 Salem St Malden MA');
      expect(result.query_type).toBe('address');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should recognize intersection "Boylston & Arlington" as address', () => {
      const result = parser.parse('Boylston & Arlington');
      expect(result.query_type).toBe('address');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should recognize intersection "Main and Park" as address', () => {
      const result = parser.parse('Main and Park');
      expect(result.query_type).toBe('address');
    });
  });

  describe('Vehicle Queries', () => {
    it('should recognize "veh-4421" as vehicle', () => {
      const result = parser.parse('veh-4421');
      expect(result.query_type).toBe('vehicle');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should recognize "veh 4421" as vehicle', () => {
      const result = parser.parse('veh 4421');
      expect(result.query_type).toBe('vehicle');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should recognize "#4421" as vehicle', () => {
      const result = parser.parse('#4421');
      expect(result.query_type).toBe('vehicle');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should recognize "bus 4421" as vehicle', () => {
      const result = parser.parse('bus 4421');
      expect(result.query_type).toBe('vehicle');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should recognize "vehicle 4421" as vehicle', () => {
      const result = parser.parse('vehicle 4421');
      expect(result.query_type).toBe('vehicle');
      expect(result.confidence).toBeGreaterThan(0.9);
    });
  });

  describe('Landmark Queries', () => {
    it('should recognize "downtown" as landmark', () => {
      const result = parser.parse('downtown');
      expect(result.query_type).toBe('landmark');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should recognize "airport" as landmark', () => {
      const result = parser.parse('airport');
      expect(result.query_type).toBe('landmark');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should recognize "harbor" as landmark', () => {
      const result = parser.parse('harbor');
      expect(result.query_type).toBe('landmark');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should recognize "waterfront" as landmark', () => {
      const result = parser.parse('waterfront');
      expect(result.query_type).toBe('landmark');
      expect(result.confidence).toBeGreaterThan(0.6);
    });
  });

  describe('Edge Cases & Ambiguity', () => {
    it('should parse empty string', () => {
      const result = parser.parse('');
      expect(result).toBeDefined();
      expect(result.parsed_tokens).toEqual([]);
    });

    it('should handle multiple spaces', () => {
      const result = parser.parse('Park    Street');
      expect(result.parsed_tokens).toContain('park');
      expect(result.parsed_tokens).toContain('street');
    });

    it('should handle punctuation', () => {
      const result = parser.parse('123 Main St., USA');
      expect(result).toBeDefined();
    });

    it('should be case insensitive', () => {
      const result1 = parser.parse('RED LINE');
      const result2 = parser.parse('red line');
      expect(result1.query_type).toBe(result2.query_type);
    });

    it('should handle leading/trailing whitespace', () => {
      const result = parser.parse('  Route 38  ');
      expect(result.query_type).toBe('route');
    });

    it('should prefer route when ambiguous number', () => {
      // "38" should be route, not a bus number
      const result = parser.parse('38');
      expect(result.query_type).toBe('route');
    });
  });

  describe('Complex Queries', () => {
    it('should parse "38 bus to downtown"', () => {
      const result = parser.parse('38 bus to downtown');
      // Should recognize the dominant query type
      expect(result).toBeDefined();
      expect(result.parsed_tokens.length).toBeGreaterThan(0);
    });

    it('should parse "route 38 downtown"', () => {
      const result = parser.parse('route 38 downtown');
      expect(result).toBeDefined();
    });

    it('should parse "red line to downtown"', () => {
      const result = parser.parse('red line to downtown');
      expect(result.query_type).toBe('route');
    });
  });

  describe('Performance', () => {
    it('should parse query in <5ms', () => {
      const start = performance.now();
      parser.parse('Route 38');
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(5);
    });

    it('should handle 100 rapid parses', () => {
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        parser.parse(`Route ${i % 50}`);
      }
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(500); // 5ms avg
    });
  });

  describe('Tokenization', () => {
    it('should tokenize "park street" correctly', () => {
      const result = parser.parse('park street');
      expect(result.parsed_tokens).toContain('park');
      expect(result.parsed_tokens).toContain('street');
    });

    it('should remove punctuation during tokenization', () => {
      const result = parser.parse('123 Main St., Boston, MA 02101');
      expect(result.parsed_tokens).not.toContain('.');
      expect(result.parsed_tokens).not.toContain(',');
    });
  });
});
