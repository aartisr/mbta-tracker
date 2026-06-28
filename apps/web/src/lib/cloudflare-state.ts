import type { CommunityPost, CommuteRecord, MissionFeedbackItem, MissionProgress } from '../../../../packages/transit-core/src/types';

export interface CloudflareApiState {
  phase3: {
    userCommutes: Record<string, CommuteRecord[]>;
    privacyPreferences: Record<string, { opted_in: boolean; anonymize_after_days: number }>;
  };
  phase4: {
    missionProgressByUser: Record<string, MissionProgress[]>;
    feedbackItems: MissionFeedbackItem[];
    communityPosts: CommunityPost[];
  };
}

export interface CloudflareApiStateStore {
  load(): Promise<CloudflareApiState>;
  save(state: CloudflareApiState): Promise<void>;
}

const STORAGE_KEY = 'mbta-tracker-cloudflare-state-v1';

const DEFAULT_STATE: CloudflareApiState = {
  phase3: {
    userCommutes: {},
    privacyPreferences: {}
  },
  phase4: {
    missionProgressByUser: {},
    feedbackItems: [],
    communityPosts: []
  }
};

function cloneDefaultState(): CloudflareApiState {
  return JSON.parse(JSON.stringify(DEFAULT_STATE)) as CloudflareApiState;
}

export function createCloudflareApiStateStore(env?: App.Platform['env']): CloudflareApiStateStore | null {
  const kv = env?.MBTA_API_STATE;
  if (!kv) {
    return null;
  }

  return {
    async load() {
      const raw = await kv.get(STORAGE_KEY, 'json');
      if (!raw || typeof raw !== 'object') {
        return cloneDefaultState();
      }

      const candidate = raw as Partial<CloudflareApiState>;
      return {
        phase3: {
          userCommutes: candidate.phase3?.userCommutes ?? {},
          privacyPreferences: candidate.phase3?.privacyPreferences ?? {}
        },
        phase4: {
          missionProgressByUser: candidate.phase4?.missionProgressByUser ?? {},
          feedbackItems: candidate.phase4?.feedbackItems ?? [],
          communityPosts: candidate.phase4?.communityPosts ?? []
        }
      };
    },
    async save(state: CloudflareApiState) {
      await kv.put(STORAGE_KEY, JSON.stringify(state));
    }
  };
}

export function getDefaultCloudflareApiState(): CloudflareApiState {
  return cloneDefaultState();
}
