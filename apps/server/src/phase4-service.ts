import { hashUserId } from './phase3-commute';
import {
  buildLeaderboard,
  getMissionCatalog,
  initializeMissionProgress,
  updateMissionProgress
} from './phase4-missions';
import type {
  CommunityPost,
  CommunityPostsResponse,
  LeaderboardResponse,
  MissionFeedbackItem,
  MissionFeedbackResponse,
  MissionProgress,
  MissionsResponse
} from './types';

type JourneyEvent = 'journey_start' | 'journey_end';

export interface Phase4Repository {
  getMissionProgress(userHash: string): MissionProgress[] | undefined;
  setMissionProgress(userHash: string, progress: MissionProgress[]): void;
  listFeedback(): MissionFeedbackItem[];
  appendFeedback(item: MissionFeedbackItem): void;
  listCommunityPosts(): CommunityPost[];
  appendCommunityPost(item: CommunityPost): void;
}

export class InMemoryPhase4Repository implements Phase4Repository {
  private readonly missionProgressByUser = new Map<string, MissionProgress[]>();
  private readonly feedbackItems: MissionFeedbackItem[] = [];
  private readonly communityPosts: CommunityPost[] = [];

  getMissionProgress(userHash: string): MissionProgress[] | undefined {
    return this.missionProgressByUser.get(userHash);
  }

  setMissionProgress(userHash: string, progress: MissionProgress[]): void {
    this.missionProgressByUser.set(userHash, progress);
  }

  listFeedback(): MissionFeedbackItem[] {
    return this.feedbackItems;
  }

  appendFeedback(item: MissionFeedbackItem): void {
    this.feedbackItems.push(item);
  }

  listCommunityPosts(): CommunityPost[] {
    return this.communityPosts;
  }

  appendCommunityPost(item: CommunityPost): void {
    this.communityPosts.push(item);
  }
}

export class Phase4Service {
  constructor(
    private readonly repository: Phase4Repository,
    private readonly now: () => number = () => Date.now()
  ) {}

  private resolveUserHash(sessionId: string): string {
    return hashUserId(sessionId.trim() || 'anonymous-session');
  }

  private ensureMissionProgress(userHash: string): MissionProgress[] {
    const existing = this.repository.getMissionProgress(userHash);
    if (existing) {
      return existing;
    }

    const seed = initializeMissionProgress(getMissionCatalog());
    this.repository.setMissionProgress(userHash, seed);
    return seed;
  }

  getMissions(sessionId: string): MissionsResponse {
    const userHash = this.resolveUserHash(sessionId);
    const progress = this.ensureMissionProgress(userHash);

    return {
      generated_at: this.now(),
      current_week_theme: 'Summer exploration',
      missions: getMissionCatalog(),
      progress
    };
  }

  trackMission(sessionId: string, missionId: string, event: JourneyEvent): void {
    const userHash = this.resolveUserHash(sessionId);
    const current = this.ensureMissionProgress(userHash);
    const next = updateMissionProgress(current, missionId, event);
    this.repository.setMissionProgress(userHash, next);
  }

  getLeaderboard(sessionId: string, timeframe: 'weekly' | 'all_time'): LeaderboardResponse {
    const userHash = this.resolveUserHash(sessionId);
    const top = buildLeaderboard(userHash, timeframe);

    return {
      generated_at: this.now(),
      timeframe,
      top,
      your_rank: {
        rank: Math.min(25, top.length + 7),
        user_hash: userHash,
        points: top[top.length - 1].points - 120,
        completed_missions: 6,
        badge_count: 4
      },
      cache_ttl_seconds: 300
    };
  }

  getMissionFeedback(): MissionFeedbackResponse {
    const entries = this.repository.listFeedback();
    return {
      generated_at: this.now(),
      total_feedback: entries.length,
      recent_feedback: entries.slice(-10).reverse()
    };
  }

  submitMissionFeedback(sessionId: string, suggestedMission: string, notes?: string): void {
    this.repository.appendFeedback({
      feedback_id: `fb_${this.now()}_${Math.random().toString(36).slice(2, 8)}`,
      user_hash: this.resolveUserHash(sessionId),
      suggested_mission: suggestedMission,
      notes,
      created_at: this.now()
    });
  }

  getCommunityPosts(): CommunityPostsResponse {
    return {
      generated_at: this.now(),
      posts: this.repository.listCommunityPosts().slice(-20).reverse()
    };
  }

  submitCommunityPost(sessionId: string, title: string, body: string): void {
    this.repository.appendCommunityPost({
      post_id: `post_${this.now()}_${Math.random().toString(36).slice(2, 8)}`,
      user_hash: this.resolveUserHash(sessionId),
      title,
      body,
      created_at: this.now()
    });
  }
}
