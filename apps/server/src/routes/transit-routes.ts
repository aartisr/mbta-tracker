import type { Express, Request, Response } from 'express';
import type { ArrivalsService } from '../arrivals-service';
import type { SearchResolverService } from '../search-resolver';
import type { ApiMetrics } from '../api-metrics';

export function registerTransitRoutes(
  app: Express,
  deps: {
    arrivals: ArrivalsService;
    resolver: SearchResolverService;
    metrics: ApiMetrics;
  }
): void {
  const { arrivals, resolver, metrics } = deps;

  app.get('/api/stop/:stopId/arrivals', async (req: Request, res: Response) => {
    const startTime = Date.now();
    metrics.stopArrivals.requests += 1;

    try {
      const { stopId } = req.params;

      if (!stopId) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Missing stop ID',
          timestamp: Date.now()
        });
      }

      const stopArrivals = await arrivals.getStopArrivals(stopId);

      if (!stopArrivals) {
        metrics.stopArrivals.failures += 1;
        return res.status(404).json({
          error: 'NotFound',
          message: `Stop ${stopId} not found`,
          timestamp: Date.now()
        });
      }

      metrics.stopArrivals.totalMs += Date.now() - startTime;
      return res.json(stopArrivals);
    } catch (error) {
      metrics.stopArrivals.failures += 1;
      console.error('[api] /api/stop/:stopId/arrivals error:', error);
      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to fetch stop arrivals',
        timestamp: Date.now()
      });
    }
  });

  app.get('/api/route/:routeId/stops', async (req: Request, res: Response) => {
    metrics.routeStops.requests += 1;

    try {
      const { routeId } = req.params;
      const directionIdValue = req.query.direction_id;

      if (!routeId) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Missing route ID',
          timestamp: Date.now()
        });
      }

      let directionId: number | undefined;
      if (typeof directionIdValue === 'string' && directionIdValue.trim().length > 0) {
        const parsed = Number.parseInt(directionIdValue, 10);
        if (!Number.isNaN(parsed) && (parsed === 0 || parsed === 1)) {
          directionId = parsed;
        }
      }

      const routeStops = await arrivals.getRouteStops(routeId, directionId);
      return res.json(routeStops);
    } catch (error) {
      metrics.routeStops.failures += 1;
      console.error('[api] /api/route/:routeId/stops error:', error);
      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to fetch route stops',
        timestamp: Date.now()
      });
    }
  });

  app.get('/api/vehicle/:vehicleId', async (req: Request, res: Response) => {
    metrics.vehicleInfo.requests += 1;

    try {
      const { vehicleId } = req.params;

      if (!vehicleId) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Missing vehicle ID',
          timestamp: Date.now()
        });
      }

      const vehicleInfo = await arrivals.getVehicleInfo(vehicleId);
      if (!vehicleInfo) {
        metrics.vehicleInfo.failures += 1;
        return res.status(404).json({
          error: 'NotFound',
          message: `Vehicle ${vehicleId} not found`,
          timestamp: Date.now()
        });
      }

      return res.json(vehicleInfo);
    } catch (error) {
      metrics.vehicleInfo.failures += 1;
      console.error('[api] /api/vehicle/:vehicleId error:', error);
      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to fetch vehicle information',
        timestamp: Date.now()
      });
    }
  });

  app.get('/api/stop/:stopId/crowding-forecast', async (req: Request, res: Response) => {
    metrics.crowdingForecast.requests += 1;

    try {
      const { stopId } = req.params;
      if (!stopId) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Missing stop ID',
          timestamp: Date.now()
        });
      }

      const forecast = await arrivals.getStopCrowdingForecast(stopId);
      if (!forecast) {
        metrics.crowdingForecast.failures += 1;
        return res.status(404).json({
          error: 'NotFound',
          message: `Stop ${stopId} not found`,
          timestamp: Date.now()
        });
      }

      return res.json(forecast);
    } catch (error) {
      metrics.crowdingForecast.failures += 1;
      console.error('[api] /api/stop/:stopId/crowding-forecast error:', error);
      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to fetch stop crowding forecast',
        timestamp: Date.now()
      });
    }
  });

  app.get('/api/route/:routeId/crowding-forecast', async (req: Request, res: Response) => {
    metrics.crowdingForecast.requests += 1;

    try {
      const { routeId } = req.params;
      const directionIdValue = req.query.direction_id;

      if (!routeId) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Missing route ID',
          timestamp: Date.now()
        });
      }

      let directionId: number | undefined;
      if (typeof directionIdValue === 'string' && directionIdValue.trim().length > 0) {
        const parsed = Number.parseInt(directionIdValue, 10);
        if (!Number.isNaN(parsed) && (parsed === 0 || parsed === 1)) {
          directionId = parsed;
        }
      }

      const forecast = await arrivals.getRouteCrowdingForecast(routeId, directionId);
      return res.json(forecast);
    } catch (error) {
      metrics.crowdingForecast.failures += 1;
      console.error('[api] /api/route/:routeId/crowding-forecast error:', error);
      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to fetch route crowding forecast',
        timestamp: Date.now()
      });
    }
  });

  app.get('/api/boarding-suggestion', async (req: Request, res: Response) => {
    metrics.boardingSuggestion.requests += 1;

    try {
      const from = String(req.query.from || '').trim();
      const to = String(req.query.to || '').trim();
      const preferenceRaw = String(req.query.preference || 'balanced').trim().toLowerCase();
      const preference =
        preferenceRaw === 'fastest' || preferenceRaw === 'least_crowded' ? preferenceRaw : 'balanced';

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
        metrics.boardingSuggestion.failures += 1;
        return res.status(404).json({
          error: 'NotFound',
          message: 'Could not resolve one or both stops',
          timestamp: Date.now()
        });
      }

      const [originArrivals, originCrowding] = await Promise.all([
        arrivals.getStopArrivals(fromStop.stop_id),
        arrivals.getStopCrowdingForecast(fromStop.stop_id)
      ]);

      if (!originArrivals || !originCrowding) {
        metrics.boardingSuggestion.failures += 1;
        return res.status(404).json({
          error: 'NotFound',
          message: 'Unable to load origin stop data for suggestions',
          timestamp: Date.now()
        });
      }

      const options = arrivals.buildBoardingSuggestions(
        { stop_id: fromStop.stop_id, stop_name: fromStop.stop_name },
        [...originArrivals.inbound, ...originArrivals.outbound].sort((a, b) => a.eta_seconds - b.eta_seconds),
        originCrowding.timeline,
        preference
      );

      return res.json({
        from_stop: {
          stop_id: fromStop.stop_id,
          stop_name: fromStop.stop_name
        },
        to_stop: {
          stop_id: toStop.stop_id,
          stop_name: toStop.stop_name
        },
        generated_at: Date.now(),
        options
      });
    } catch (error) {
      metrics.boardingSuggestion.failures += 1;
      console.error('[api] /api/boarding-suggestion error:', error);
      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to compute boarding suggestions',
        timestamp: Date.now()
      });
    }
  });
}
