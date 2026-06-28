import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { CommunityPost, MissionFeedbackItem, MissionProgress, CommuteRecord } from './types';
import type { Phase3Repository } from './phase3-service';
import type { Phase4Repository } from './phase4-service';

type Phase3PersistedState = {
  userCommutes: Record<string, CommuteRecord[]>;
  privacyPreferences: Record<string, { opted_in: boolean; anonymize_after_days: number }>;
};

type Phase4PersistedState = {
  missionProgressByUser: Record<string, MissionProgress[]>;
  feedbackItems: MissionFeedbackItem[];
  communityPosts: CommunityPost[];
};

function ensureDirectory(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function readJson<T>(filePath: string, fallback: T): T {
  if (!existsSync(filePath)) {
    return fallback;
  }

  try {
    const raw = readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJsonAtomic(filePath: string, value: unknown): void {
  ensureDirectory(filePath);
  const tempPath = `${filePath}.tmp`;
  writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  renameSync(tempPath, filePath);
}

function defaultPhase3State(): Phase3PersistedState {
  return {
    userCommutes: {},
    privacyPreferences: {}
  };
}

function defaultPhase4State(): Phase4PersistedState {
  return {
    missionProgressByUser: {},
    feedbackItems: [],
    communityPosts: []
  };
}

export class FilePhase3Repository implements Phase3Repository {
  private readonly statePath: string;
  private state: Phase3PersistedState;

  constructor(statePath = join(process.cwd(), '.mbta-tracker-state', 'phase3.json')) {
    this.statePath = statePath;
    this.state = readJson(this.statePath, defaultPhase3State());
  }

  private persist(): void {
    writeJsonAtomic(this.statePath, this.state);
  }

  getUserCommutes(userHash: string): CommuteRecord[] | undefined {
    return this.state.userCommutes[userHash];
  }

  setUserCommutes(userHash: string, records: CommuteRecord[]): void {
    this.state.userCommutes[userHash] = records;
    this.persist();
  }

  deleteUserCommutes(userHash: string): void {
    delete this.state.userCommutes[userHash];
    this.persist();
  }

  getPrivacyPreference(userHash: string): { opted_in: boolean; anonymize_after_days: number } | undefined {
    return this.state.privacyPreferences[userHash];
  }

  setPrivacyPreference(userHash: string, pref: { opted_in: boolean; anonymize_after_days: number }): void {
    this.state.privacyPreferences[userHash] = pref;
    this.persist();
  }
}

export class FilePhase4Repository implements Phase4Repository {
  private readonly statePath: string;
  private state: Phase4PersistedState;

  constructor(statePath = join(process.cwd(), '.mbta-tracker-state', 'phase4.json')) {
    this.statePath = statePath;
    this.state = readJson(this.statePath, defaultPhase4State());
  }

  private persist(): void {
    writeJsonAtomic(this.statePath, this.state);
  }

  getMissionProgress(userHash: string): MissionProgress[] | undefined {
    return this.state.missionProgressByUser[userHash];
  }

  setMissionProgress(userHash: string, progress: MissionProgress[]): void {
    this.state.missionProgressByUser[userHash] = progress;
    this.persist();
  }

  listFeedback(): MissionFeedbackItem[] {
    return this.state.feedbackItems;
  }

  appendFeedback(item: MissionFeedbackItem): void {
    this.state.feedbackItems.push(item);
    this.persist();
  }

  listCommunityPosts(): CommunityPost[] {
    return this.state.communityPosts;
  }

  appendCommunityPost(item: CommunityPost): void {
    this.state.communityPosts.push(item);
    this.persist();
  }
}
