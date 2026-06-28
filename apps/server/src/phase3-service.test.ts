import { describe, expect, it } from 'vitest';
import { InMemoryPhase3Repository, Phase3Service } from './phase3-service';

describe('Phase3Service', () => {
  it('returns seeded commute summaries per session', () => {
    const service = new Phase3Service(new InMemoryPhase3Repository(), () => 123);
    const payload = service.getMyCommutes('session-a');

    expect(payload.generated_at).toBe(123);
    expect(payload.user_hash).toMatch(/^u_/);
    expect(payload.commutes.length).toBeGreaterThan(0);
  });

  it('builds recommendations and emergency reroutes from stop context', () => {
    const service = new Phase3Service(new InMemoryPhase3Repository());

    const recommendation = service.getCommuteRecommendation(
      'session-b',
      { stop_id: 'place-sstat', stop_name: 'South Station' },
      { stop_id: 'place-pktrm', stop_name: 'Park Street' }
    );
    expect(recommendation.recommended_departure_windows.length).toBe(3);

    const reroute = service.getEmergencyReroute(
      { stop_id: 'place-sstat', stop_name: 'South Station' },
      { stop_id: 'place-pktrm', stop_name: 'Park Street' },
      'Red Line'
    );
    expect(reroute.disrupted_route).toBe('Red Line');
    expect(reroute.alternatives.length).toBeGreaterThan(0);
  });

  it('tracks privacy preferences and clears history on opt-out', () => {
    const service = new Phase3Service(new InMemoryPhase3Repository(), () => 999);

    const initial = service.getPrivacyDashboard('session-c');
    expect(initial.opted_in).toBe(true);
    expect(initial.stored_commute_count).toBeGreaterThan(0);

    const updated = service.updatePrivacyConsent('session-c', false, 45);
    expect(updated.timestamp).toBe(999);
    expect(updated.opted_in).toBe(false);

    const after = service.getPrivacyDashboard('session-c');
    expect(after.opted_in).toBe(false);
    expect(after.anonymize_after_days).toBe(45);
    expect(after.stored_commute_count).toBe(0);
  });
});
