import type {
  CommuteRecommendationResponse,
  EmergencyRerouteResponse,
  MyCommutesResponse,
  PrivacyDashboardResponse
} from '$lib/types';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchPhase3Snapshot(
  sessionId: string
): Promise<{ commutes: MyCommutesResponse; privacy: PrivacyDashboardResponse }> {
  const base = window.location.origin;
  const commutesUrl = new URL('/api/my-commutes', base);
  commutesUrl.searchParams.set('session_id', sessionId);

  const privacyUrl = new URL('/api/privacy-dashboard', base);
  privacyUrl.searchParams.set('session_id', sessionId);

  const [commutes, privacy] = await Promise.all([
    fetchJson<MyCommutesResponse>(commutesUrl.toString()),
    fetchJson<PrivacyDashboardResponse>(privacyUrl.toString())
  ]);

  return { commutes, privacy };
}

export async function fetchCommuteRecommendation(
  sessionId: string,
  fromStopId: string,
  toStopId: string
): Promise<CommuteRecommendationResponse> {
  const url = new URL('/api/commute-recommendation', window.location.origin);
  url.searchParams.set('from', fromStopId);
  url.searchParams.set('to', toStopId);
  url.searchParams.set('session_id', sessionId);
  return fetchJson<CommuteRecommendationResponse>(url.toString());
}

export async function fetchEmergencyReroute(
  fromStopId: string,
  toStopId: string,
  disruptedRoute: string
): Promise<EmergencyRerouteResponse> {
  const url = new URL('/api/emergency-reroute', window.location.origin);
  url.searchParams.set('from', fromStopId);
  url.searchParams.set('to', toStopId);
  url.searchParams.set('disrupted_route', disruptedRoute || 'service disruption');
  return fetchJson<EmergencyRerouteResponse>(url.toString());
}

export async function submitPrivacyConsent(
  sessionId: string,
  optedIn: boolean,
  anonymizeAfterDays: number
): Promise<void> {
  await fetchJson('/api/privacy-consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      opted_in: optedIn,
      anonymize_after_days: anonymizeAfterDays
    })
  });
}