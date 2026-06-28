import { describe, expect, it } from 'vitest';
import { InMemoryPhase4Repository, Phase4Service } from './phase4-service';

describe('Phase4Service', () => {
  it('returns missions with initialized progress per user', () => {
    const service = new Phase4Service(new InMemoryPhase4Repository(), () => 123);
    const payload = service.getMissions('session-a');

    expect(payload.generated_at).toBe(123);
    expect(payload.missions.length).toBeGreaterThan(0);
    expect(payload.progress.length).toBe(payload.missions.length);
  });

  it('tracks mission events and updates progress', () => {
    const service = new Phase4Service(new InMemoryPhase4Repository());
    const initial = service.getMissions('session-b');
    const missionId = initial.missions[1].mission_id;

    service.trackMission('session-b', missionId, 'journey_start');
    service.trackMission('session-b', missionId, 'journey_end');

    const updated = service.getMissions('session-b');
    const progress = updated.progress.find((entry) => entry.mission_id === missionId);
    expect((progress?.progress_percent || 0) > 0).toBe(true);
  });

  it('provides leaderboard and feedback/community operations', () => {
    const service = new Phase4Service(new InMemoryPhase4Repository(), () => 999);
    const leaderboard = service.getLeaderboard('session-c', 'weekly');

    expect(leaderboard.generated_at).toBe(999);
    expect(leaderboard.top.length).toBeGreaterThan(0);

    service.submitMissionFeedback('session-c', 'Try a weekend harbor mission', 'Great for summer');
    const feedback = service.getMissionFeedback();
    expect(feedback.total_feedback).toBe(1);

    service.submitCommunityPost('session-c', 'Low crowding tip', 'Blue Line after 10am is smoother');
    const posts = service.getCommunityPosts();
    expect(posts.posts).toHaveLength(1);
  });
});
