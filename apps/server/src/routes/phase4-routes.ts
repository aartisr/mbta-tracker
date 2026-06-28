import type { Express, Request, Response } from 'express';
import type { ApiMetrics } from '../api-metrics';
import type { Phase4Service } from '../phase4-service';

export function registerPhase4Routes(
  app: Express,
  deps: {
    phase4: Phase4Service;
    metrics: ApiMetrics;
  }
): void {
  const { phase4, metrics } = deps;

  app.get('/api/missions', (req: Request, res: Response) => {
    metrics.missions.requests += 1;

    try {
      const sessionId = String(req.query.session_id || 'anonymous-session').trim();
      return res.json(phase4.getMissions(sessionId));
    } catch (error) {
      metrics.missions.failures += 1;
      console.error('[api] /api/missions error:', error);
      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to fetch missions',
        timestamp: Date.now()
      });
    }
  });

  app.post('/api/missions/track', (req: Request, res: Response) => {
    metrics.missionTracking.requests += 1;

    try {
      const sessionId = String(req.body.session_id || 'anonymous-session').trim();
      const missionId = String(req.body.mission_id || '').trim();
      const eventRaw = String(req.body.event || '').trim();
      const event = eventRaw === 'journey_start' || eventRaw === 'journey_end' ? eventRaw : undefined;

      if (!missionId || !event) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Missing required fields: mission_id and valid event',
          timestamp: Date.now()
        });
      }

      phase4.trackMission(sessionId, missionId, event);

      return res.status(202).json({
        accepted: true,
        mission_id: missionId,
        event,
        timestamp: Date.now()
      });
    } catch (error) {
      metrics.missionTracking.failures += 1;
      console.error('[api] /api/missions/track error:', error);
      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to track mission event',
        timestamp: Date.now()
      });
    }
  });

  app.get('/api/leaderboard', (req: Request, res: Response) => {
    metrics.leaderboard.requests += 1;

    try {
      const sessionId = String(req.query.session_id || 'anonymous-session').trim();
      const timeframe = String(req.query.timeframe || 'weekly').trim().toLowerCase() === 'all_time'
        ? 'all_time'
        : 'weekly';

      return res.json(phase4.getLeaderboard(sessionId, timeframe));
    } catch (error) {
      metrics.leaderboard.failures += 1;
      console.error('[api] /api/leaderboard error:', error);
      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to fetch leaderboard',
        timestamp: Date.now()
      });
    }
  });

  app.get('/api/mission-feedback', (_req: Request, res: Response) => {
    metrics.missionFeedback.requests += 1;

    try {
      return res.json(phase4.getMissionFeedback());
    } catch (error) {
      metrics.missionFeedback.failures += 1;
      console.error('[api] /api/mission-feedback GET error:', error);
      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to fetch mission feedback',
        timestamp: Date.now()
      });
    }
  });

  app.post('/api/mission-feedback', (req: Request, res: Response) => {
    metrics.missionFeedback.requests += 1;

    try {
      const sessionId = String(req.body.session_id || 'anonymous-session').trim();
      const suggestedMission = String(req.body.suggested_mission || '').trim();
      const notes = String(req.body.notes || '').trim();

      if (!suggestedMission) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Missing suggested_mission',
          timestamp: Date.now()
        });
      }

      phase4.submitMissionFeedback(sessionId, suggestedMission, notes || undefined);

      return res.status(202).json({ accepted: true, timestamp: Date.now() });
    } catch (error) {
      metrics.missionFeedback.failures += 1;
      console.error('[api] /api/mission-feedback POST error:', error);
      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to submit mission feedback',
        timestamp: Date.now()
      });
    }
  });

  app.get('/api/community-posts', (_req: Request, res: Response) => {
    metrics.communityPosts.requests += 1;

    try {
      return res.json(phase4.getCommunityPosts());
    } catch (error) {
      metrics.communityPosts.failures += 1;
      console.error('[api] /api/community-posts GET error:', error);
      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to fetch community posts',
        timestamp: Date.now()
      });
    }
  });

  app.post('/api/community-posts', (req: Request, res: Response) => {
    metrics.communityPosts.requests += 1;

    try {
      const sessionId = String(req.body.session_id || 'anonymous-session').trim();
      const title = String(req.body.title || '').trim();
      const body = String(req.body.body || '').trim();

      if (!title || !body) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Missing title or body',
          timestamp: Date.now()
        });
      }

      phase4.submitCommunityPost(sessionId, title, body);

      return res.status(202).json({ accepted: true, timestamp: Date.now() });
    } catch (error) {
      metrics.communityPosts.failures += 1;
      console.error('[api] /api/community-posts POST error:', error);
      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to submit community post',
        timestamp: Date.now()
      });
    }
  });
}
