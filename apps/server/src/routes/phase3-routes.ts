import type { Express, Request, Response } from 'express';
import type { SearchResolverService } from '../search-resolver';
import type { Phase3Service } from '../phase3-service';
import type { ApiMetrics } from '../api-metrics';

export function registerPhase3Routes(
  app: Express,
  deps: {
    resolver: SearchResolverService;
    phase3: Phase3Service;
    metrics: ApiMetrics;
  }
): void {
  const { resolver, phase3, metrics } = deps;

  app.get('/api/my-commutes', (req: Request, res: Response) => {
    metrics.myCommutes.requests += 1;

    try {
      const sessionId = String(req.query.session_id || 'anonymous-session').trim();
      return res.json(phase3.getMyCommutes(sessionId));
    } catch (error) {
      metrics.myCommutes.failures += 1;
      console.error('[api] /api/my-commutes error:', error);
      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to fetch my commutes',
        timestamp: Date.now()
      });
    }
  });

  app.get('/api/commute-recommendation', async (req: Request, res: Response) => {
    metrics.commuteRecommendation.requests += 1;

    try {
      const from = String(req.query.from || '').trim();
      const to = String(req.query.to || '').trim();
      const sessionId = String(req.query.session_id || 'anonymous-session').trim();

      if (!from || !to) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Missing required query params: from and to',
          timestamp: Date.now()
        });
      }

      const [fromResolved, toResolved] = await Promise.all([
        resolver.resolve({ query_string: from, query_type: 'stop' }),
        resolver.resolve({ query_string: to, query_type: 'stop' })
      ]);

      const fromStop = fromResolved.find((result) => result.type === 'stop');
      const toStop = toResolved.find((result) => result.type === 'stop');

      if (!fromStop || fromStop.type !== 'stop' || !toStop || toStop.type !== 'stop') {
        metrics.commuteRecommendation.failures += 1;
        return res.status(404).json({
          error: 'NotFound',
          message: 'Could not resolve one or both stops',
          timestamp: Date.now()
        });
      }

      return res.json(
        phase3.getCommuteRecommendation(
          sessionId,
          { stop_id: fromStop.stop_id, stop_name: fromStop.stop_name },
          { stop_id: toStop.stop_id, stop_name: toStop.stop_name }
        )
      );
    } catch (error) {
      metrics.commuteRecommendation.failures += 1;
      console.error('[api] /api/commute-recommendation error:', error);
      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to compute commute recommendation',
        timestamp: Date.now()
      });
    }
  });

  app.get('/api/emergency-reroute', async (req: Request, res: Response) => {
    metrics.emergencyReroute.requests += 1;

    try {
      const from = String(req.query.from || '').trim();
      const to = String(req.query.to || '').trim();
      const disruptedRoute = String(req.query.disrupted_route || '').trim();

      if (!from || !to || !disruptedRoute) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Missing required query params: from, to, disrupted_route',
          timestamp: Date.now()
        });
      }

      const [fromResolved, toResolved] = await Promise.all([
        resolver.resolve({ query_string: from, query_type: 'stop' }),
        resolver.resolve({ query_string: to, query_type: 'stop' })
      ]);

      const fromStop = fromResolved.find((result) => result.type === 'stop');
      const toStop = toResolved.find((result) => result.type === 'stop');

      if (!fromStop || fromStop.type !== 'stop' || !toStop || toStop.type !== 'stop') {
        metrics.emergencyReroute.failures += 1;
        return res.status(404).json({
          error: 'NotFound',
          message: 'Could not resolve one or both stops',
          timestamp: Date.now()
        });
      }

      return res.json(
        phase3.getEmergencyReroute(
          { stop_id: fromStop.stop_id, stop_name: fromStop.stop_name },
          { stop_id: toStop.stop_id, stop_name: toStop.stop_name },
          disruptedRoute
        )
      );
    } catch (error) {
      metrics.emergencyReroute.failures += 1;
      console.error('[api] /api/emergency-reroute error:', error);
      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to compute emergency reroute options',
        timestamp: Date.now()
      });
    }
  });

  app.get('/api/privacy-dashboard', (req: Request, res: Response) => {
    metrics.privacyDashboard.requests += 1;

    try {
      const sessionId = String(req.query.session_id || 'anonymous-session').trim();
      return res.json(phase3.getPrivacyDashboard(sessionId));
    } catch (error) {
      metrics.privacyDashboard.failures += 1;
      console.error('[api] /api/privacy-dashboard error:', error);
      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to fetch privacy dashboard',
        timestamp: Date.now()
      });
    }
  });

  app.post('/api/privacy-consent', (req: Request, res: Response) => {
    metrics.privacyConsent.requests += 1;

    try {
      const sessionId = String(req.body.session_id || 'anonymous-session').trim();
      const optedIn = typeof req.body.opted_in === 'boolean' ? req.body.opted_in : true;
      const anonymizeAfterDaysRaw = Number(req.body.anonymize_after_days);
      const anonymizeAfterDays =
        Number.isFinite(anonymizeAfterDaysRaw) && anonymizeAfterDaysRaw > 0
          ? Math.round(anonymizeAfterDaysRaw)
          : 30;

      return res.status(202).json(phase3.updatePrivacyConsent(sessionId, optedIn, anonymizeAfterDays));
    } catch (error) {
      metrics.privacyConsent.failures += 1;
      console.error('[api] /api/privacy-consent error:', error);
      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to update privacy consent',
        timestamp: Date.now()
      });
    }
  });
}
