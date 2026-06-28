import { json, type RequestHandler } from '@sveltejs/kit';
import { getMetrics } from '$lib/cloudflare-api';

export const GET: RequestHandler = async () => {
  const metrics = getMetrics();
  return json({
    status: 'ok',
    timestamp: Date.now(),
    uptime_seconds: metrics.uptime_seconds,
    feature_search_mvp_enabled: metrics.rollout.feature_enabled,
    feature_search_mvp_percent: metrics.rollout.percent
  });
};
