/**
 * HTTP API Server
 * Composition root for API modules.
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { SearchQueryParser } from './search-parser';
import { SearchResolverService } from './search-resolver';
import { ArrivalsService } from './arrivals-service';
import { FilePhase3Repository } from './file-repositories';
import { FilePhase4Repository } from './file-repositories';
import { Phase3Service } from './phase3-service';
import { Phase4Service } from './phase4-service';
import { createApiMetrics } from './api-metrics';
import { registerSearchRoutes } from './routes/search-routes';
import { registerTransitRoutes } from './routes/transit-routes';
import { registerPhase3Routes } from './routes/phase3-routes';
import { registerPhase4Routes } from './routes/phase4-routes';
import { registerSystemRoutes, type TelemetryEvent } from './routes/system-routes';
import type { ErrorResponse } from './types';

const app = express();
const FEATURE_SEARCH_MVP_ENABLED = process.env.FEATURE_SEARCH_MVP_ENABLED !== 'false';
const ROLLOUT_PERCENT = Number(process.env.FEATURE_SEARCH_MVP_PERCENT || 100);
const ROLLOUT_SALT = process.env.FEATURE_SEARCH_MVP_SALT || 'mbta-search-mvp-v1';

// Middleware
app.use(cors());
app.use(express.json());

// Services
const parser = new SearchQueryParser();
const resolver = new SearchResolverService();
const arrivals = new ArrivalsService();
const phase3 = new Phase3Service(new FilePhase3Repository());
const phase4 = new Phase4Service(new FilePhase4Repository());

const serverBootMs = Date.now();
const metrics = createApiMetrics();
const telemetryBuffer: TelemetryEvent[] = [];

function recordTelemetry(event: TelemetryEvent) {
  telemetryBuffer.push(event);
  if (telemetryBuffer.length > 500) {
    telemetryBuffer.shift();
  }

  console.log('[telemetry]', JSON.stringify(event));
}

registerSearchRoutes(app, { parser, resolver, metrics });
registerTransitRoutes(app, { arrivals, resolver, metrics });
registerPhase3Routes(app, { resolver, phase3, metrics });
registerPhase4Routes(app, { phase4, metrics });
registerSystemRoutes(app, {
  metrics,
  telemetryBuffer,
  recordTelemetry,
  serverBootMs,
  featureEnabled: FEATURE_SEARCH_MVP_ENABLED,
  rolloutPercent: ROLLOUT_PERCENT,
  rolloutSalt: ROLLOUT_SALT
});

// Error handler middleware
app.use((err: any, _req: Request, res: Response, _next: Function) => {
  console.error('[api] Error:', err);
  const errorResponse: ErrorResponse = {
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred',
    timestamp: Date.now()
  };
  res.status(500).json(errorResponse);
});

export default app;
