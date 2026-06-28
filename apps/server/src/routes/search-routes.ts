import type { Express, Request, Response } from 'express';
import type { SearchQueryParser } from '../search-parser';
import type { SearchResolverService } from '../search-resolver';
import type { SearchResponse } from '../types';
import type { ApiMetrics } from '../api-metrics';

export function registerSearchRoutes(
  app: Express,
  deps: {
    parser: SearchQueryParser;
    resolver: SearchResolverService;
    metrics: ApiMetrics;
  }
): void {
  const { parser, resolver, metrics } = deps;

  app.post('/api/search', async (req: Request, res: Response) => {
    const startTime = Date.now();
    metrics.search.requests += 1;

    try {
      const { q } = req.body;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Missing or invalid query string (q)',
          timestamp: Date.now()
        });
      }

      const parseResult = parser.parse(q);
      const searchQuery = {
        query_string: parseResult.normalized_query,
        query_type: parseResult.query_type,
        filters: req.body.filters || {}
      };

      const results = await resolver.resolve(searchQuery);

      const response: SearchResponse = {
        query: searchQuery,
        results,
        execution_time_ms: Date.now() - startTime
      };

      metrics.search.totalMs += response.execution_time_ms;
      return res.json(response);
    } catch (error) {
      metrics.search.failures += 1;
      console.error('[api] /api/search error:', error);
      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to process search query',
        timestamp: Date.now()
      });
    }
  });

  app.get('/api/search/autocomplete', async (req: Request, res: Response) => {
    try {
      const { q, limit = 10 } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Missing or invalid query string (q)',
          timestamp: Date.now()
        });
      }

      const parsedLimit = Number.parseInt(String(limit), 10);
      const safeLimit = Number.isNaN(parsedLimit) ? 10 : Math.max(1, Math.min(15, parsedLimit));
      const suggestions = await resolver.autocomplete(q, safeLimit);

      return res.json({
        query: q,
        suggestions,
        limit: safeLimit
      });
    } catch (error) {
      console.error('[api] /api/search/autocomplete error:', error);
      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to fetch autocomplete suggestions',
        timestamp: Date.now()
      });
    }
  });
}
