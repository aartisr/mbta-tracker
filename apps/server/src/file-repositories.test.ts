import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { FilePhase3Repository, FilePhase4Repository } from './file-repositories';

describe('file repositories', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('persists commute and privacy state across instances', () => {
    const root = mkdtempSync(join(tmpdir(), 'mbta-phase3-'));
    tempRoots.push(root);
    const statePath = join(root, 'phase3.json');

    const first = new FilePhase3Repository(statePath);
    first.setUserCommutes('u_test', [
      {
        commute_id: 'c1',
        user_hash: 'u_test',
        from_stop_id: 'a',
        from_stop_name: 'A',
        to_stop_id: 'b',
        to_stop_name: 'B',
        departure_time_iso: '2026-06-28T12:00:00.000Z',
        day_of_week: 1,
        created_at: 1
      }
    ]);
    first.setPrivacyPreference('u_test', { opted_in: true, anonymize_after_days: 14 });

    const second = new FilePhase3Repository(statePath);
    expect(second.getUserCommutes('u_test')).toHaveLength(1);
    expect(second.getPrivacyPreference('u_test')).toEqual({ opted_in: true, anonymize_after_days: 14 });
  });

  it('persists mission and community state across instances', () => {
    const root = mkdtempSync(join(tmpdir(), 'mbta-phase4-'));
    tempRoots.push(root);
    const statePath = join(root, 'phase4.json');

    const first = new FilePhase4Repository(statePath);
    first.setMissionProgress('u_test', [
      {
        mission_id: 'mission-1',
        status: 'in_progress',
        progress_percent: 50
      }
    ]);
    first.appendFeedback({
      feedback_id: 'fb-1',
      user_hash: 'u_test',
      suggested_mission: 'Night owl challenge',
      created_at: 1
    });
    first.appendCommunityPost({
      post_id: 'post-1',
      user_hash: 'u_test',
      title: 'Best trip window',
      body: 'Blue Line after 10pm is calm',
      created_at: 1
    });

    const second = new FilePhase4Repository(statePath);
    expect(second.getMissionProgress('u_test')).toHaveLength(1);
    expect(second.listFeedback()).toHaveLength(1);
    expect(second.listCommunityPosts()).toHaveLength(1);
  });
});
