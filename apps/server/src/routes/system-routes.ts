import type { Express, Request, Response } from 'express';
import { resolveRollout } from '../rollout';
import type { ApiMetrics } from '../api-metrics';

export type TelemetryEvent = {
  ts: number;
  session_id: string;
  event: string;
  page?: string;
  meta?: Record<string, unknown>;
};

export function registerSystemRoutes(
  app: Express,
  deps: {
    metrics: ApiMetrics;
    telemetryBuffer: TelemetryEvent[];
    recordTelemetry: (event: TelemetryEvent) => void;
    serverBootMs: number;
    featureEnabled: boolean;
    rolloutPercent: number;
    rolloutSalt: string;
  }
): void {
  const {
    metrics,
    telemetryBuffer,
    recordTelemetry,
    serverBootMs,
    featureEnabled,
    rolloutPercent,
    rolloutSalt
  } = deps;

  app.get('/api/rollout', (req: Request, res: Response) => {
    metrics.rollout.requests += 1;

    const clientId = String(req.query.client_id || 'anonymous');
    const override = String(req.query.force || '').toLowerCase();

    if (override === 'on') {
      return res.json({
        feature: 'search-mvp',
        enabled: true,
        percent: 100,
        reason: 'force-on',
        bucket: 0,
        timestamp: Date.now()
      });
    }

    if (override === 'off') {
      return res.json({
        feature: 'search-mvp',
        enabled: false,
        percent: 0,
        reason: 'force-off',
        bucket: 0,
        timestamp: Date.now()
      });
    }

    const decision = resolveRollout(clientId, featureEnabled, rolloutPercent, rolloutSalt);
    return res.json({
      feature: 'search-mvp',
      enabled: decision.enabled,
      percent: decision.percent,
      reason: decision.reason,
      bucket: decision.bucket,
      timestamp: Date.now()
    });
  });

  app.post('/api/telemetry', (req: Request, res: Response) => {
    metrics.telemetry.requests += 1;

    const body = req.body || {};
    const sessionId = String(body.session_id || '').trim();
    const event = String(body.event || '').trim();
    const page = body.page ? String(body.page) : undefined;
    const meta = typeof body.meta === 'object' && body.meta !== null ? body.meta : undefined;

    if (!sessionId || !event) {
      metrics.telemetry.dropped += 1;
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Missing telemetry session_id or event',
        timestamp: Date.now()
      });
    }

    metrics.telemetry.accepted += 1;
    recordTelemetry({
      ts: Date.now(),
      session_id: sessionId,
      event,
      page,
      meta
    });

    return res.status(202).json({ accepted: true, timestamp: Date.now() });
  });

  app.get('/api/metrics', (_req: Request, res: Response) => {
    const uptimeSeconds = Math.floor((Date.now() - serverBootMs) / 1000);
    res.json({
      uptime_seconds: uptimeSeconds,
      rollout: {
        feature_enabled: featureEnabled,
        percent: Math.max(0, Math.min(100, Math.floor(rolloutPercent)))
      },
      counters: {
        search: {
          requests: metrics.search.requests,
          failures: metrics.search.failures,
          avg_ms: metrics.search.requests ? Math.round(metrics.search.totalMs / metrics.search.requests) : 0
        },
        stop_arrivals: {
          requests: metrics.stopArrivals.requests,
          failures: metrics.stopArrivals.failures,
          avg_ms: metrics.stopArrivals.requests
            ? Math.round(metrics.stopArrivals.totalMs / metrics.stopArrivals.requests)
            : 0
        },
        route_stops: metrics.routeStops,
        vehicle_info: metrics.vehicleInfo,
        crowding_forecast: metrics.crowdingForecast,
        boarding_suggestion: metrics.boardingSuggestion,
        my_commutes: metrics.myCommutes,
        commute_recommendation: metrics.commuteRecommendation,
        emergency_reroute: metrics.emergencyReroute,
        privacy_dashboard: metrics.privacyDashboard,
        privacy_consent: metrics.privacyConsent,
        missions: metrics.missions,
        mission_tracking: metrics.missionTracking,
        leaderboard: metrics.leaderboard,
        mission_feedback: metrics.missionFeedback,
        community_posts: metrics.communityPosts,
        rollout: metrics.rollout,
        telemetry: metrics.telemetry
      },
      recent_telemetry_events: telemetryBuffer.slice(-50)
    });
  });

  app.get('/health', (_req: Request, res: Response) => {
    const uptimeSeconds = Math.floor((Date.now() - serverBootMs) / 1000);
    res.json({
      status: 'ok',
      timestamp: Date.now(),
      uptime_seconds: uptimeSeconds,
      feature_search_mvp_enabled: featureEnabled,
      feature_search_mvp_percent: Math.max(0, Math.min(100, Math.floor(rolloutPercent)))
    });
  });
}
