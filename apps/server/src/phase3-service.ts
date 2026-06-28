import {
  hashUserId,
  rankEmergencyAlternatives,
  recommendDepartureWindows,
  summarizeCommutes
} from './phase3-commute';
import type {
  CommuteRecord,
  CommuteRecommendationResponse,
  EmergencyRerouteResponse,
  MyCommutesResponse,
  PrivacyDashboardResponse
} from './types';

type PrivacyPreference = { opted_in: boolean; anonymize_after_days: number };

type EmergencyCandidate = {
  route_id: string;
  route_number: string;
  route_name: string;
  departure_stop_id: string;
  departure_stop_name: string;
  eta_minutes: number;
  distance_increase_km: number;
  time_penalty_minutes: number;
  accessibility_support: 'full' | 'partial' | 'unknown';
};

export interface Phase3Repository {
  getUserCommutes(userHash: string): CommuteRecord[] | undefined;
  setUserCommutes(userHash: string, records: CommuteRecord[]): void;
  deleteUserCommutes(userHash: string): void;
  getPrivacyPreference(userHash: string): PrivacyPreference | undefined;
  setPrivacyPreference(userHash: string, pref: PrivacyPreference): void;
}

export class InMemoryPhase3Repository implements Phase3Repository {
  private readonly userCommutes = new Map<string, CommuteRecord[]>();
  private readonly privacyPreferences = new Map<string, PrivacyPreference>();

  getUserCommutes(userHash: string): CommuteRecord[] | undefined {
    return this.userCommutes.get(userHash);
  }

  setUserCommutes(userHash: string, records: CommuteRecord[]): void {
    this.userCommutes.set(userHash, records);
  }

  deleteUserCommutes(userHash: string): void {
    this.userCommutes.delete(userHash);
  }

  getPrivacyPreference(userHash: string): PrivacyPreference | undefined {
    return this.privacyPreferences.get(userHash);
  }

  setPrivacyPreference(userHash: string, pref: PrivacyPreference): void {
    this.privacyPreferences.set(userHash, pref);
  }
}

export class Phase3Service {
  constructor(
    private readonly repository: Phase3Repository,
    private readonly now: () => number = () => Date.now()
  ) {}

  private resolveUserHash(sessionId: string): string {
    return hashUserId(sessionId.trim() || 'anonymous-session');
  }

  private seedUserCommutes(userHash: string, createIfMissing = true): CommuteRecord[] {
    const existing = this.repository.getUserCommutes(userHash);
    if (existing) {
      return existing;
    }

    if (!createIfMissing) {
      return [];
    }

    const now = this.now();
    const seeded: CommuteRecord[] = [
      {
        commute_id: `${userHash}_1`,
        user_hash: userHash,
        from_stop_id: 'place-sstat',
        from_stop_name: 'South Station',
        to_stop_id: 'place-pktrm',
        to_stop_name: 'Park Street',
        departure_time_iso: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
        day_of_week: new Date(now).getDay(),
        created_at: now - 2 * 24 * 60 * 60 * 1000
      },
      {
        commute_id: `${userHash}_2`,
        user_hash: userHash,
        from_stop_id: 'place-sstat',
        from_stop_name: 'South Station',
        to_stop_id: 'place-pktrm',
        to_stop_name: 'Park Street',
        departure_time_iso: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
        day_of_week: new Date(now).getDay(),
        created_at: now - 24 * 60 * 60 * 1000
      },
      {
        commute_id: `${userHash}_3`,
        user_hash: userHash,
        from_stop_id: 'place-north',
        from_stop_name: 'North Station',
        to_stop_id: 'place-gover',
        to_stop_name: 'Government Center',
        departure_time_iso: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
        day_of_week: new Date(now).getDay(),
        created_at: now - 3 * 24 * 60 * 60 * 1000
      }
    ];

    this.repository.setUserCommutes(userHash, seeded);
    return seeded;
  }

  private ensurePrivacyPreference(userHash: string): PrivacyPreference {
    const existing = this.repository.getPrivacyPreference(userHash);
    if (existing) {
      return existing;
    }

    const seeded = { opted_in: true, anonymize_after_days: 30 };
    this.repository.setPrivacyPreference(userHash, seeded);
    return seeded;
  }

  private buildEmergencyCandidates(fromStopId: string): EmergencyCandidate[] {
    const seed = fromStopId.length;
    return [
      {
        route_id: 'route-1',
        route_number: '1',
        route_name: 'Mass Ave Connector',
        departure_stop_id: fromStopId,
        departure_stop_name: 'Alternative Stop A',
        eta_minutes: 4 + (seed % 3),
        distance_increase_km: 0.4,
        time_penalty_minutes: 5,
        accessibility_support: 'full'
      },
      {
        route_id: 'route-39',
        route_number: '39',
        route_name: 'Back Bay Express',
        departure_stop_id: fromStopId,
        departure_stop_name: 'Alternative Stop B',
        eta_minutes: 6 + (seed % 4),
        distance_increase_km: 0.9,
        time_penalty_minutes: 9,
        accessibility_support: 'partial'
      },
      {
        route_id: 'route-57',
        route_number: '57',
        route_name: 'Kenmore Relief',
        departure_stop_id: fromStopId,
        departure_stop_name: 'Alternative Stop C',
        eta_minutes: 8 + (seed % 5),
        distance_increase_km: 1.1,
        time_penalty_minutes: 11,
        accessibility_support: 'unknown'
      },
      {
        route_id: 'route-66',
        route_number: '66',
        route_name: 'Cross Town',
        departure_stop_id: fromStopId,
        departure_stop_name: 'Alternative Stop D',
        eta_minutes: 10 + (seed % 2),
        distance_increase_km: 1.4,
        time_penalty_minutes: 12,
        accessibility_support: 'full'
      }
    ];
  }

  getMyCommutes(sessionId: string): MyCommutesResponse {
    const userHash = this.resolveUserHash(sessionId);
    const pref = this.ensurePrivacyPreference(userHash);
    const commutes = pref.opted_in ? this.seedUserCommutes(userHash) : [];

    return {
      user_hash: userHash,
      generated_at: this.now(),
      commutes: summarizeCommutes(commutes)
    };
  }

  getCommuteRecommendation(
    sessionId: string,
    fromStop: { stop_id: string; stop_name: string },
    toStop: { stop_id: string; stop_name: string }
  ): CommuteRecommendationResponse {
    const userHash = this.resolveUserHash(sessionId);
    const pref = this.ensurePrivacyPreference(userHash);
    const history = pref.opted_in ? this.seedUserCommutes(userHash) : [];
    return recommendDepartureWindows(fromStop, toStop, history);
  }

  getEmergencyReroute(
    fromStop: { stop_id: string; stop_name: string },
    toStop: { stop_id: string; stop_name: string },
    disruptedRoute: string
  ): EmergencyRerouteResponse {
    const ranked = rankEmergencyAlternatives(this.buildEmergencyCandidates(fromStop.stop_id));

    return {
      from_stop: fromStop,
      to_stop: toStop,
      disrupted_route: disruptedRoute,
      generated_at: this.now(),
      alternatives: ranked
    };
  }

  getPrivacyDashboard(sessionId: string): PrivacyDashboardResponse {
    const userHash = this.resolveUserHash(sessionId);
    const pref = this.ensurePrivacyPreference(userHash);
    const commuteCount = pref.opted_in ? this.seedUserCommutes(userHash).length : this.seedUserCommutes(userHash, false).length;

    return {
      user_hash: userHash,
      opted_in: pref.opted_in,
      anonymize_after_days: pref.anonymize_after_days,
      stored_commute_count: commuteCount,
      generated_at: this.now()
    };
  }

  updatePrivacyConsent(
    sessionId: string,
    optedIn: boolean,
    anonymizeAfterDays: number
  ): {
    accepted: true;
    user_hash: string;
    opted_in: boolean;
    anonymize_after_days: number;
    timestamp: number;
  } {
    const userHash = this.resolveUserHash(sessionId);
    this.repository.setPrivacyPreference(userHash, {
      opted_in: optedIn,
      anonymize_after_days: anonymizeAfterDays
    });

    if (!optedIn) {
      this.repository.deleteUserCommutes(userHash);
    }

    return {
      accepted: true,
      user_hash: userHash,
      opted_in: optedIn,
      anonymize_after_days: anonymizeAfterDays,
      timestamp: this.now()
    };
  }
}
