import { describe, expect, it } from 'vitest';
import {
  buildLeaderboard,
  getMissionCatalog,
  initializeMissionProgress,
  updateMissionProgress
} from './phase4-missions';

describe('phase4-missions', () => {
  it('returns a non-empty mission catalog', () => {
    const missions = getMissionCatalog();
    expect(missions.length).toBeGreaterThan(3);
  });

  it('initializes mission progress entries', () => {
    const missions = getMissionCatalog();
    const progress = initializeMissionProgress(missions);
    expect(progress).toHaveLength(missions.length);
    expect(progress.some((entry) => entry.status === 'in_progress')).toBe(true);
  });

  it('updates mission progress from journey events', () => {
    const missions = getMissionCatalog();
    const progress = initializeMissionProgress(missions);
    const missionId = missions[1].mission_id;

    const started = updateMissionProgress(progress, missionId, 'journey_start');
    const startedEntry = started.find((entry) => entry.mission_id === missionId);
    expect(startedEntry?.status).toBe('in_progress');

    const advanced = updateMissionProgress(started, missionId, 'journey_end');
    const advancedEntry = advanced.find((entry) => entry.mission_id === missionId);
    expect((advancedEntry?.progress_percent || 0) > 0).toBe(true);
  });

  it('builds ranked leaderboard entries', () => {
    const leaderboard = buildLeaderboard('seed-user', 'weekly');
    expect(leaderboard).toHaveLength(5);
    expect(leaderboard[0].points >= leaderboard[1].points).toBe(true);
    expect(leaderboard[0].rank).toBe(1);
  });
});
