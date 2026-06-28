import type {
  CommunityPostsResponse,
  LeaderboardResponse,
  MissionFeedbackResponse,
  MissionsResponse
} from '$lib/types';

export interface Phase4Snapshot {
  missions: MissionsResponse;
  leaderboard: LeaderboardResponse;
  feedback: MissionFeedbackResponse;
  communityPosts: CommunityPostsResponse;
}

export async function fetchPhase4Snapshot(
  sessionId: string,
  timeframe: 'weekly' | 'all_time'
): Promise<Phase4Snapshot> {
  const missionsUrl = new URL('/api/missions', window.location.origin);
  missionsUrl.searchParams.set('session_id', sessionId);

  const leaderboardUrl = new URL('/api/leaderboard', window.location.origin);
  leaderboardUrl.searchParams.set('session_id', sessionId);
  leaderboardUrl.searchParams.set('timeframe', timeframe);

  const [missionsRes, leaderboardRes, feedbackRes, postsRes] = await Promise.all([
    fetch(missionsUrl.toString()),
    fetch(leaderboardUrl.toString()),
    fetch('/api/mission-feedback'),
    fetch('/api/community-posts')
  ]);

  if (!missionsRes.ok || !leaderboardRes.ok || !feedbackRes.ok || !postsRes.ok) {
    throw new Error('Phase 4 feeds unavailable');
  }

  return {
    missions: await missionsRes.json() as MissionsResponse,
    leaderboard: await leaderboardRes.json() as LeaderboardResponse,
    feedback: await feedbackRes.json() as MissionFeedbackResponse,
    communityPosts: await postsRes.json() as CommunityPostsResponse
  };
}

export async function trackMissionEvent(
  sessionId: string,
  missionId: string,
  event: 'journey_start' | 'journey_end'
): Promise<void> {
  const response = await fetch('/api/missions/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      mission_id: missionId,
      event
    })
  });

  if (!response.ok) {
    throw new Error(`Mission tracking failed with ${response.status}`);
  }
}

export async function fetchLeaderboard(
  sessionId: string,
  timeframe: 'weekly' | 'all_time'
): Promise<LeaderboardResponse> {
  const url = new URL('/api/leaderboard', window.location.origin);
  url.searchParams.set('session_id', sessionId);
  url.searchParams.set('timeframe', timeframe);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Leaderboard failed with ${response.status}`);
  }

  return await response.json() as LeaderboardResponse;
}

export async function submitMissionFeedback(
  sessionId: string,
  suggestedMission: string,
  notes?: string
): Promise<void> {
  const response = await fetch('/api/mission-feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      suggested_mission: suggestedMission,
      notes: notes || undefined
    })
  });

  if (!response.ok) {
    throw new Error(`Feedback submit failed with ${response.status}`);
  }
}

export async function fetchMissionFeedback(): Promise<MissionFeedbackResponse> {
  const response = await fetch('/api/mission-feedback');
  if (!response.ok) {
    throw new Error(`Mission feedback fetch failed with ${response.status}`);
  }

  return await response.json() as MissionFeedbackResponse;
}

export async function submitCommunityPost(
  sessionId: string,
  title: string,
  body: string
): Promise<void> {
  const response = await fetch('/api/community-posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      title,
      body
    })
  });

  if (!response.ok) {
    throw new Error(`Community post failed with ${response.status}`);
  }
}

export async function fetchCommunityPosts(): Promise<CommunityPostsResponse> {
  const response = await fetch('/api/community-posts');
  if (!response.ok) {
    throw new Error(`Community posts fetch failed with ${response.status}`);
  }

  return await response.json() as CommunityPostsResponse;
}
