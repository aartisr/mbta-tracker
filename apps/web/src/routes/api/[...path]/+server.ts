import { json, type RequestHandler } from '@sveltejs/kit';
import {
  autocomplete,
  getBoardingSuggestion,
  getCommunityPosts,
  getCommuteRecommendation,
  getEmergencyReroute,
  getLeaderboard,
  getMetrics,
  getMissionFeedback,
  getMissions,
  getMyCommutes,
  getPrivacyDashboard,
  getRollout,
  getRouteCrowdingForecast,
  getRouteStops,
  getStopArrivals,
  getStopCrowdingForecast,
  getVehicleInfo,
  recordTelemetry,
  resolveSearch,
  searchParser,
  submitCommunityPost,
  submitMissionFeedback,
  trackMission,
  updatePrivacyConsent
} from '$lib/cloudflare-api';
import { createCloudflareApiStateStore } from '$lib/cloudflare-state';

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function badRequest(message: string, status = 400) {
  return json({
    error: status === 404 ? 'NotFound' : 'BadRequest',
    message,
    timestamp: Date.now()
  }, { status });
}

function pathSegments(paramsPath: string | undefined): string[] {
  return (paramsPath || '').split('/').filter(Boolean);
}

export const GET: RequestHandler = async ({ params, url, platform }) => {
  const store = createCloudflareApiStateStore(platform?.env) ?? undefined;
  const segments = pathSegments(params.path);
  if (segments.length === 0) {
    return badRequest('Missing API path', 404);
  }

  if (segments[0] === 'search' && segments[1] === 'autocomplete') {
    try {
      const q = String(url.searchParams.get('q') || '').trim();
      const limit = Number.parseInt(url.searchParams.get('limit') || '10', 10);
      if (!q) return json({ query: q, suggestions: [], limit: 10 });
      const safeLimit = Number.isNaN(limit) ? 10 : Math.max(1, Math.min(15, limit));
      return json({
        query: q,
        suggestions: await autocomplete(q, safeLimit),
        limit: safeLimit
      });
    } catch {
      return json({ query: String(url.searchParams.get('q') || '').trim(), suggestions: [], limit: 10, warning: 'Autocomplete is temporarily unavailable.' });
    }
  }

  if (segments[0] === 'stop' && segments[2] === 'arrivals') {
    const stopId = segments[1];
    const data = await getStopArrivals(stopId);
    if (!data) return badRequest(`Stop ${stopId} not found`, 404);
    return json(data);
  }

  if (segments[0] === 'stop' && segments[2] === 'crowding-forecast') {
    const stopId = segments[1];
    const data = await getStopCrowdingForecast(stopId);
    if (!data) return badRequest(`Stop ${stopId} not found`, 404);
    return json(data);
  }

  if (segments[0] === 'route' && segments[2] === 'stops') {
    const routeId = segments[1];
    const directionParam = url.searchParams.get('direction_id');
    const directionId =
      directionParam === '0' || directionParam === '1' ? Number.parseInt(directionParam, 10) : undefined;
    return json(await getRouteStops(routeId, directionId));
  }

  if (segments[0] === 'route' && segments[2] === 'crowding-forecast') {
    const routeId = segments[1];
    const directionParam = url.searchParams.get('direction_id');
    const directionId =
      directionParam === '0' || directionParam === '1' ? Number.parseInt(directionParam, 10) : undefined;
    return json(await getRouteCrowdingForecast(routeId, directionId));
  }

  if (segments[0] === 'vehicle' && segments[1]) {
    const data = await getVehicleInfo(segments[1]);
    if (!data) return badRequest(`Vehicle ${segments[1]} not found`, 404);
    return json(data);
  }

  if (segments[0] === 'boarding-suggestion') {
    const from = String(url.searchParams.get('from') || '').trim();
    const to = String(url.searchParams.get('to') || '').trim();
    const preference = String(url.searchParams.get('preference') || 'balanced').trim().toLowerCase();
    if (!from || !to) return badRequest('Missing required query params: from and to');
    const data = await getBoardingSuggestion(
      from,
      to,
      preference === 'fastest' || preference === 'least_crowded' ? preference : 'balanced'
    );
    if (!data) return badRequest('Could not compute boarding suggestion', 404);
    return json(data);
  }

  if (segments[0] === 'my-commutes') {
    return json(await getMyCommutes(String(url.searchParams.get('session_id') || 'anonymous-session'), store));
  }

  if (segments[0] === 'commute-recommendation') {
    const from = String(url.searchParams.get('from') || '').trim();
    const to = String(url.searchParams.get('to') || '').trim();
    const sessionId = String(url.searchParams.get('session_id') || 'anonymous-session').trim();
    if (!from || !to) return badRequest('Missing required query params: from and to');
    const data = await getCommuteRecommendation(sessionId, { stop_id: from, stop_name: from }, { stop_id: to, stop_name: to }, store);
    return json(data);
  }

  if (segments[0] === 'emergency-reroute') {
    const from = String(url.searchParams.get('from') || '').trim();
    const to = String(url.searchParams.get('to') || '').trim();
    const disruptedRoute = String(url.searchParams.get('disrupted_route') || '').trim();
    if (!from || !to || !disruptedRoute) return badRequest('Missing required query params: from, to, disrupted_route');
    return json(getEmergencyReroute({ stop_id: from, stop_name: from }, { stop_id: to, stop_name: to }, disruptedRoute));
  }

  if (segments[0] === 'privacy-dashboard') {
    return json(await getPrivacyDashboard(String(url.searchParams.get('session_id') || 'anonymous-session'), store));
  }

  if (segments[0] === 'missions') {
    return json(await getMissions(String(url.searchParams.get('session_id') || 'anonymous-session'), store));
  }

  if (segments[0] === 'leaderboard') {
    const sessionId = String(url.searchParams.get('session_id') || 'anonymous-session');
    const timeframe = String(url.searchParams.get('timeframe') || 'weekly').trim().toLowerCase() === 'all_time'
      ? 'all_time'
      : 'weekly';
    return json(getLeaderboard(sessionId, timeframe));
  }

  if (segments[0] === 'mission-feedback') {
    return json(await getMissionFeedback(store));
  }

  if (segments[0] === 'community-posts') {
    return json(await getCommunityPosts(store));
  }

  if (segments[0] === 'rollout') {
    const clientId = String(url.searchParams.get('client_id') || 'anonymous');
    const force = String(url.searchParams.get('force') || '').toLowerCase();
    return json(getRollout(clientId, force === 'on' || force === 'off' ? (force as 'on' | 'off') : undefined));
  }

  if (segments[0] === 'metrics') {
    return json(getMetrics());
  }

  return badRequest(`Unknown API route: /${segments.join('/')}`, 404);
};

export const POST: RequestHandler = async ({ params, request, url, platform }) => {
  const store = createCloudflareApiStateStore(platform?.env) ?? undefined;
  const segments = pathSegments(params.path);
  if (segments.length === 0) {
    return badRequest('Missing API path', 404);
  }

  if (segments[0] === 'search' && segments[1] === undefined) {
    const body = await readJsonBody(request);
    try {
      const q = typeof body.q === 'string' ? body.q : '';
      if (!q) return badRequest('Missing or invalid query string (q)');
      const parsed = searchParser.parse(q);
      const query = { query_string: parsed.normalized_query, query_type: parsed.query_type, filters: (body.filters as Record<string, unknown>) || {} };
      const started = Date.now();
      const results = await resolveSearch(query);
      return json({
        query,
        results,
        execution_time_ms: Date.now() - started
      });
    } catch {
      const q = typeof body.q === 'string' ? body.q : '';
      const parsed = searchParser.parse(q || '');
      const query = { query_string: parsed.normalized_query, query_type: parsed.query_type, filters: (body.filters as Record<string, unknown>) || {} };
      return json({
        query,
        results: [],
        execution_time_ms: 0,
        warning: 'Search is temporarily degraded. Please try again in a moment.'
      });
    }
  }

  if (segments[0] === 'telemetry') {
    const body = await readJsonBody(request);
    const sessionId = String(body.session_id || '').trim();
    const event = String(body.event || '').trim();
    if (!sessionId || !event) return badRequest('Missing telemetry session_id or event');
    recordTelemetry({
      ts: Date.now(),
      session_id: sessionId,
      event,
      page: typeof body.page === 'string' ? body.page : undefined,
      meta: typeof body.meta === 'object' && body.meta !== null ? (body.meta as Record<string, unknown>) : undefined
    });
    return json({ accepted: true, timestamp: Date.now() }, { status: 202 });
  }

  if (segments[0] === 'privacy-consent') {
    const body = await readJsonBody(request);
    const sessionId = String(body.session_id || 'anonymous-session').trim();
    const optedIn = typeof body.opted_in === 'boolean' ? body.opted_in : true;
    const anonymizeAfterDaysRaw = Number(body.anonymize_after_days);
    const anonymizeAfterDays = Number.isFinite(anonymizeAfterDaysRaw) && anonymizeAfterDaysRaw > 0 ? Math.round(anonymizeAfterDaysRaw) : 30;
    return json(await updatePrivacyConsent(sessionId, optedIn, anonymizeAfterDays, store), { status: 202 });
  }

  if (segments[0] === 'missions' && segments[1] === 'track') {
    const body = await readJsonBody(request);
    const sessionId = String(body.session_id || 'anonymous-session').trim();
    const missionId = String(body.mission_id || '').trim();
    const eventRaw = String(body.event || '').trim();
    if (!missionId || (eventRaw !== 'journey_start' && eventRaw !== 'journey_end')) {
      return badRequest('Missing required fields: mission_id and valid event');
    }
    await trackMission(sessionId, missionId, eventRaw, store);
    return json({ accepted: true, mission_id: missionId, event: eventRaw, timestamp: Date.now() }, { status: 202 });
  }

  if (segments[0] === 'mission-feedback') {
    const body = await readJsonBody(request);
    const sessionId = String(body.session_id || 'anonymous-session').trim();
    const suggestedMission = String(body.suggested_mission || '').trim();
    const notes = String(body.notes || '').trim();
    if (!suggestedMission) return badRequest('Missing suggested_mission');
    await submitMissionFeedback(sessionId, suggestedMission, notes || undefined, store);
    return json({ accepted: true, timestamp: Date.now() }, { status: 202 });
  }

  if (segments[0] === 'community-posts') {
    const body = await readJsonBody(request);
    const sessionId = String(body.session_id || 'anonymous-session').trim();
    const title = String(body.title || '').trim();
    const postBody = String(body.body || '').trim();
    if (!title || !postBody) return badRequest('Missing title or body');
    await submitCommunityPost(sessionId, title, postBody, store);
    return json({ accepted: true, timestamp: Date.now() }, { status: 202 });
  }

  return badRequest(`Unknown API route: /${segments.join('/')}`, 404);
};
