import type {
  LeaderboardEntry,
  Mission,
  MissionProgress
} from './types';

export function getMissionCatalog(): Mission[] {
  return [
    {
      mission_id: 'mission_airport_blue',
      name: 'Ride to Airport Station',
      description: 'Take a trip that includes Airport Station and check in from the app.',
      category: 'exploration',
      reward_badge: 'Skyline Scout',
      difficulty: 'easy',
      is_weekly: false
    },
    {
      mission_id: 'mission_blue_explorer',
      name: 'Explore the Blue Line',
      description: 'Visit 3 unique Blue Line stops in one week.',
      category: 'exploration',
      reward_badge: 'Harbor Hopper',
      difficulty: 'medium',
      is_weekly: true
    },
    {
      mission_id: 'mission_fast_transfer',
      name: 'Nail a Fast Transfer',
      description: 'Complete a transfer with less than 4 minutes wait time.',
      category: 'efficiency',
      reward_badge: 'Transfer Ninja',
      difficulty: 'hard',
      is_weekly: true
    },
    {
      mission_id: 'mission_alert_responder',
      name: 'Alert Responder',
      description: 'Use an emergency reroute suggestion during a disruption.',
      category: 'reliability',
      reward_badge: 'Reroute Ready',
      difficulty: 'medium',
      is_weekly: false
    },
    {
      mission_id: 'mission_feedback_builder',
      name: 'Community Builder',
      description: 'Submit one mission idea and one forum post this week.',
      category: 'community',
      reward_badge: 'Civic Commuter',
      difficulty: 'easy',
      is_weekly: true
    }
  ];
}

export function initializeMissionProgress(missions: Mission[]): MissionProgress[] {
  return missions.map((mission, index) => ({
    mission_id: mission.mission_id,
    status: index === 0 ? 'in_progress' : 'available',
    progress_percent: index === 0 ? 40 : 0,
    started_at: index === 0 ? Date.now() - 2 * 60 * 60 * 1000 : undefined,
    completed_at: undefined
  }));
}

export function updateMissionProgress(
  progress: MissionProgress[],
  missionId: string,
  event: 'journey_start' | 'journey_end'
): MissionProgress[] {
  return progress.map((entry) => {
    if (entry.mission_id !== missionId) {
      return entry;
    }

    if (event === 'journey_start' && entry.status === 'available') {
      return {
        ...entry,
        status: 'in_progress',
        started_at: Date.now(),
        progress_percent: Math.max(entry.progress_percent, 15)
      };
    }

    const nextProgress = Math.min(100, entry.progress_percent + 30);
    if (event === 'journey_end') {
      return {
        ...entry,
        status: nextProgress >= 100 ? 'completed' : 'in_progress',
        progress_percent: nextProgress,
        completed_at: nextProgress >= 100 ? Date.now() : undefined
      };
    }

    return entry;
  });
}

export function buildLeaderboard(seed: string, timeframe: 'weekly' | 'all_time'): LeaderboardEntry[] {
  const base = [
    { user_hash: 'u_11aa33bb', points: 1180, completed_missions: 15, badge_count: 7 },
    { user_hash: 'u_22bb44cc', points: 1090, completed_missions: 14, badge_count: 6 },
    { user_hash: 'u_33cc55dd', points: 1030, completed_missions: 13, badge_count: 6 },
    { user_hash: 'u_44dd66ee', points: 970, completed_missions: 12, badge_count: 5 },
    { user_hash: 'u_55ee77ff', points: 930, completed_missions: 11, badge_count: 5 }
  ];

  const adjustment = (seed.length + (timeframe === 'weekly' ? 3 : 9)) % 17;

  return base
    .map((entry, index) => ({
      rank: index + 1,
      ...entry,
      points: entry.points + adjustment * (index % 2 === 0 ? 1 : -1)
    }))
    .sort((a, b) => b.points - a.points)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}
