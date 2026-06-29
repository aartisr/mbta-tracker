<script lang="ts">
  import {
    fetchCommunityPosts,
    fetchLeaderboard,
    fetchMissionFeedback,
    fetchPhase4Snapshot,
    submitCommunityPost as submitCommunityPostApi,
    submitMissionFeedback as submitMissionFeedbackApi,
    trackMissionEvent as trackMissionEventApi
  } from '$lib/phase4-api';
  import type {
    CommunityPostsResponse,
    LeaderboardResponse,
    MissionFeedbackResponse,
    MissionProgress,
    MissionsResponse
  } from '$lib/types';

  export let sessionId: string;
  export let onTrack: (event: string, meta?: Record<string, unknown>) => Promise<void>;

  let missionsPayload: MissionsResponse | null = null;
  let missionProgressMap: Record<string, MissionProgress> = {};
  let missionsLoading = false;
  let missionsError: string | null = null;

  let leaderboardTimeframe: 'weekly' | 'all_time' = 'weekly';
  let leaderboardPayload: LeaderboardResponse | null = null;
  let leaderboardLoading = false;
  let leaderboardError: string | null = null;

  let feedbackMission = '';
  let feedbackNotes = '';
  let feedbackSubmitting = false;
  let feedbackState: string | null = null;
  let feedbackPayload: MissionFeedbackResponse | null = null;

  let communityTitle = '';
  let communityBody = '';
  let communitySubmitting = false;
  let communityState: string | null = null;
  let communityPostsPayload: CommunityPostsResponse | null = null;

  const invokedByUser = true;

  $: totalMissions = missionsPayload?.missions.length || 0;
  $: completedMissions = Object.values(missionProgressMap).filter((entry) => entry.status === 'completed').length;
  $: activeMissions = Object.values(missionProgressMap).filter((entry) => entry.status === 'in_progress').length;
  $: missionCompletionRate = totalMissions > 0 ? Math.round((completedMissions / totalMissions) * 100) : 0;
  $: communityPostCount = communityPostsPayload?.posts.length || 0;

  function toMissionProgressMap(progress: MissionProgress[]): Record<string, MissionProgress> {
    return Object.fromEntries(progress.map((entry) => [entry.mission_id, entry]));
  }

  function getMissionProgressLabel(missionId: string): string {
    const progress = missionProgressMap[missionId];
    if (!progress) return 'available';
    if (progress.status === 'completed') return 'completed';
    if (progress.status === 'in_progress') return `${progress.progress_percent}%`;
    return 'available';
  }

  async function loadPhase4Data() {
    if (!sessionId) {
      return;
    }

    missionsLoading = true;
    missionsError = null;

    try {
      const snapshot = await fetchPhase4Snapshot(sessionId, leaderboardTimeframe);
      missionsPayload = snapshot.missions;
      missionProgressMap = toMissionProgressMap(snapshot.missions.progress || []);
      leaderboardPayload = snapshot.leaderboard;
      feedbackPayload = snapshot.feedback;
      communityPostsPayload = snapshot.communityPosts;
    } catch (error) {
      missionsError = error instanceof Error ? error.message : 'Failed to load mission experience';
    } finally {
      missionsLoading = false;
    }
  }

  async function trackMissionEvent(missionId: string, event: 'journey_start' | 'journey_end') {
    try {
      await trackMissionEventApi(sessionId, missionId, event);
      await loadPhase4Data();
      await onTrack('mission_event_tracked', { mission_id: missionId, event });
    } catch (error) {
      missionsError = error instanceof Error ? error.message : 'Failed to update mission progress';
    }
  }

  async function loadLeaderboard(timeframe: 'weekly' | 'all_time') {
    leaderboardTimeframe = timeframe;
    leaderboardLoading = true;
    leaderboardError = null;

    try {
      leaderboardPayload = await fetchLeaderboard(sessionId, timeframe);
    } catch (error) {
      leaderboardError = error instanceof Error ? error.message : 'Leaderboard unavailable';
    } finally {
      leaderboardLoading = false;
    }
  }

  async function submitMissionFeedback() {
    if (!feedbackMission.trim()) {
      feedbackState = 'Please enter a mission suggestion.';
      return;
    }

    feedbackSubmitting = true;
    feedbackState = null;

    try {
      await submitMissionFeedbackApi(sessionId, feedbackMission, feedbackNotes || undefined);
      feedbackMission = '';
      feedbackNotes = '';
      feedbackState = 'Thanks! Mission idea received.';
      feedbackPayload = await fetchMissionFeedback();
    } catch (error) {
      feedbackState = error instanceof Error ? error.message : 'Unable to submit feedback';
    } finally {
      feedbackSubmitting = false;
    }
  }

  async function submitCommunityPost() {
    if (!communityTitle.trim() || !communityBody.trim()) {
      communityState = 'Please provide both title and message.';
      return;
    }

    communitySubmitting = true;
    communityState = null;

    try {
      await submitCommunityPostApi(sessionId, communityTitle, communityBody);
      communityTitle = '';
      communityBody = '';
      communityState = 'Post published to community feed.';
      communityPostsPayload = await fetchCommunityPosts();
    } catch (error) {
      communityState = error instanceof Error ? error.message : 'Unable to publish post';
    } finally {
      communitySubmitting = false;
    }
  }

  async function shareMission(missionName: string) {
    const shareText = `I just completed the MBTA mission: ${missionName} on MBTA Tracker.`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'MBTA Mission Complete',
          text: shareText,
          url: window.location.origin
        });
      } else {
        await navigator.clipboard.writeText(`${shareText} ${window.location.origin}`);
      }
      await onTrack('mission_shared', { mission_name: missionName });
    } catch {
      // Ignore user cancellation.
    }
  }

  $: if (sessionId && invokedByUser) {
    void loadPhase4Data();
  }
</script>

<section class="phase4-home-panels" aria-label="Mission mode and community engagement">
  <article class="phase4-shell">
    <div class="phase4-hero">
      <div class="phase4-copy">
        <p class="phase4-kicker">Trip planning studio</p>
        <h3>Plan faster, compare smarter, and share the useful bits.</h3>
        <p>
          A compact mission board with social proof, feedback, and community ideas in one calm workspace.
        </p>
      </div>

      <div class="phase4-metrics" aria-label="Trip planning summary">
        <div class="phase4-metric">
          <strong>{missionCompletionRate}%</strong>
          <span>completion</span>
        </div>
        <div class="phase4-metric">
          <strong>{activeMissions}</strong>
          <span>in progress</span>
        </div>
        <div class="phase4-metric">
          <strong>{communityPostCount}</strong>
          <span>community posts</span>
        </div>
      </div>
    </div>

    {#if missionsLoading}
      <div class="phase4-empty">
        <p>Loading missions and planning signals...</p>
      </div>
    {:else if missionsError}
      <div class="phase4-empty phase4-empty-error" role="alert">
        <p>{missionsError}</p>
      </div>
    {:else if missionsPayload}
      <div class="phase4-grid">
        <div class="phase4-main">
          <section class="phase4-card phase4-card-feature" aria-label="Current week mission set">
            <div class="phase4-card-head">
              <div>
                <p class="phase4-section-label">This week</p>
                <h4>{missionsPayload.current_week_theme}</h4>
              </div>
              <span class="phase4-chip">{totalMissions} missions</span>
            </div>

            <div class="mission-grid" role="list" aria-label="Available missions">
              {#each missionsPayload.missions as mission}
                <article role="listitem" class="mission-card" data-difficulty={mission.difficulty}>
                  <div class="mission-top">
                    <div>
                      <strong>{mission.name}</strong>
                      <p>{mission.description}</p>
                    </div>
                    <span>{mission.reward_badge}</span>
                  </div>
                  <div class="mission-meta">
                    <span>{mission.category}</span>
                    <span>{mission.is_weekly ? 'Weekly' : 'Anytime'}</span>
                    <span>{getMissionProgressLabel(mission.mission_id)}</span>
                  </div>
                  <div class="mission-progress">
                    <div style={`width:${missionProgressMap[mission.mission_id]?.progress_percent || 0}%`}></div>
                  </div>
                  <div class="phase4-actions">
                    <button on:click={() => trackMissionEvent(mission.mission_id, 'journey_start')}>Start</button>
                    <button on:click={() => trackMissionEvent(mission.mission_id, 'journey_end')}>Complete</button>
                    <button class="subtle" on:click={() => shareMission(mission.name)}>Share</button>
                  </div>
                </article>
              {/each}
            </div>
          </section>
        </div>

        <div class="phase4-side">
          <section class="phase4-card">
            <div class="phase4-card-head">
              <div>
                <p class="phase4-section-label">Leaderboard</p>
                <h4>Your mission rank</h4>
              </div>
              <span class="phase4-chip">{leaderboardTimeframe === 'weekly' ? 'Weekly' : 'All-time'}</span>
            </div>

            <div class="phase4-actions phase4-toggle-row">
              <button on:click={() => loadLeaderboard('weekly')} disabled={leaderboardLoading || leaderboardTimeframe === 'weekly'}>
                Weekly
              </button>
              <button on:click={() => loadLeaderboard('all_time')} disabled={leaderboardLoading || leaderboardTimeframe === 'all_time'}>
                All-time
              </button>
            </div>

            {#if leaderboardError}
              <p class="phase4-state" data-state="error">{leaderboardError}</p>
            {/if}

            {#if leaderboardPayload}
              <div class="leaderboard-list" role="list" aria-label="Leaderboard top ten">
                {#each leaderboardPayload.top as entry}
                  <div role="listitem" class="leaderboard-row">
                    <span>#{entry.rank}</span>
                    <span>{entry.user_hash}</span>
                    <span>{entry.points} pts</span>
                  </div>
                {/each}
              </div>
              {#if leaderboardPayload.your_rank}
                <p class="your-rank">
                  You: #{leaderboardPayload.your_rank.rank} • {leaderboardPayload.your_rank.points} pts
                </p>
              {/if}
            {/if}
          </section>

          <section class="phase4-card">
            <div class="phase4-card-head">
              <div>
                <p class="phase4-section-label">Feedback loop</p>
                <h4>Shape the next missions</h4>
              </div>
              <span class="phase4-chip">{feedbackPayload?.total_feedback || 0} ideas</span>
            </div>

            <label class="phase4-field">
              Mission idea
              <input bind:value={feedbackMission} placeholder="e.g. Green Line transfer challenge" />
            </label>
            <label class="phase4-field">
              Notes
              <textarea bind:value={feedbackNotes} rows="3" placeholder="Constraints, reward ideas, or context"></textarea>
            </label>
            <div class="phase4-actions">
              <button on:click={submitMissionFeedback} disabled={feedbackSubmitting}>
                {feedbackSubmitting ? 'Submitting...' : 'Submit idea'}
              </button>
            </div>
            {#if feedbackState}
              <p class="phase4-state">{feedbackState}</p>
            {/if}
          </section>

          <section class="phase4-card">
            <div class="phase4-card-head">
              <div>
                <p class="phase4-section-label">Community</p>
                <h4>Forum lite</h4>
              </div>
              <span class="phase4-chip">{communityPostCount} posts</span>
            </div>

            <label class="phase4-field">
              Title
              <input bind:value={communityTitle} placeholder="Best low-crowding commute window" />
            </label>
            <label class="phase4-field">
              Post
              <textarea bind:value={communityBody} rows="3" placeholder="Share your finding with the community"></textarea>
            </label>
            <div class="phase4-actions">
              <button on:click={submitCommunityPost} disabled={communitySubmitting}>
                {communitySubmitting ? 'Publishing...' : 'Post to forum'}
              </button>
            </div>
            {#if communityState}
              <p class="phase4-state">{communityState}</p>
            {/if}
          </section>
        </div>
      </div>

      {#if communityPostsPayload && communityPostsPayload.posts.length > 0}
        <div class="forum-list" role="list" aria-label="Community posts">
          {#each communityPostsPayload.posts.slice(0, 4) as post}
            <div role="listitem" class="forum-item">
              <strong>{post.title}</strong>
              <p>{post.body}</p>
              <span>{post.user_hash}</span>
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  </article>
</section>

<style lang="postcss">
  .phase4-home-panels {
    @apply w-full;
    margin-top: 0;
  }

  .phase4-shell {
    @apply rounded-[1.5rem] border p-5;
    padding-left: 1.75rem;
    padding-right: 1.35rem;
    width: 100%;
    background:
      radial-gradient(circle at top left, rgba(124, 58, 237, 0.12), transparent 24%),
      linear-gradient(145deg, rgba(255, 255, 255, 0.985), rgba(250, 245, 255, 0.97));
    border-color: rgba(225, 215, 255, 0.96);
    box-shadow:
      0 18px 40px rgba(15, 23, 42, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.82);
  }

  .phase4-hero {
    @apply flex items-start justify-between gap-4;
    padding-left: 0.15rem;
  }

  .phase4-copy {
    @apply min-w-0;
    padding-left: 0.2rem;
  }

  .phase4-kicker {
    @apply m-0 text-[11px] uppercase tracking-[0.26em] font-semibold;
    color: #6d28d9;
  }

  .phase4-copy h3 {
    @apply m-0 mt-1 text-[1.18rem] font-semibold;
    color: var(--text-strong);
    letter-spacing: -0.02em;
    line-height: 1.12;
  }

  .phase4-copy p {
    @apply m-0 mt-1 text-sm;
    color: var(--text-soft);
    line-height: 1.55;
    max-width: 44rem;
  }

  .phase4-metrics {
    @apply grid gap-2;
    grid-template-columns: repeat(3, minmax(4.5rem, 1fr));
    flex-shrink: 0;
    min-width: 16rem;
  }

  .phase4-metric {
    @apply rounded-2xl border px-3 py-2 text-center;
    background: rgba(255, 255, 255, 0.95);
    border-color: #e9ddff;
  }

  .phase4-metric strong {
    @apply block text-lg font-semibold;
    color: #4c1d95;
    line-height: 1.05;
  }

  .phase4-metric span {
    @apply mt-1 block text-[11px] uppercase tracking-[0.16em] font-semibold;
    color: #6b7280;
  }

  .phase4-empty {
    @apply mt-4 rounded-2xl border p-4;
    background: rgba(255, 255, 255, 0.9);
    border-color: #e9ddff;
    color: var(--text-soft);
  }

  .phase4-empty-error {
    color: #9f1239;
  }

  .phase4-grid {
    @apply mt-4 grid gap-4;
    grid-template-columns: minmax(0, 1.35fr) minmax(0, 0.95fr);
  }

  .phase4-main,
  .phase4-side {
    @apply grid gap-4;
  }

  .phase4-card {
    @apply rounded-2xl border p-5;
    padding-left: 1.5rem;
    padding-right: 1.35rem;
    background: rgba(255, 255, 255, 0.965);
    border-color: #e9ddff;
    box-shadow:
      0 12px 28px rgba(15, 23, 42, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.78);
  }

  .phase4-card-feature {
    background: linear-gradient(145deg, rgba(250, 245, 255, 0.98), rgba(255, 255, 255, 0.98));
  }

  .phase4-card-head {
    @apply flex items-start justify-between gap-3;
  }

  .phase4-section-label {
    @apply m-0 text-[11px] uppercase tracking-[0.22em] font-semibold;
    color: #6d28d9;
  }

  .phase4-card-head h4 {
    @apply m-0 mt-1 text-sm font-semibold;
    color: var(--text-strong);
    letter-spacing: -0.01em;
  }

  .phase4-chip {
    @apply inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full;
    background: #ede9fe;
    color: #6d28d9;
    flex-shrink: 0;
  }

  .mission-grid {
    @apply mt-3 grid gap-3;
    grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  }

  .mission-card {
    @apply rounded-2xl border p-3;
    border-color: #e9d5ff;
    background:
      radial-gradient(circle at top right, rgba(217, 70, 239, 0.08), transparent 24%),
      linear-gradient(180deg, #ffffff 0%, #faf5ff 100%);
    box-shadow:
      0 12px 24px rgba(15, 23, 42, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.75);
  }

  .mission-card[data-difficulty='hard'] {
    border-color: #fecaca;
    background: linear-gradient(180deg, #fff7f7 0%, #ffffff 100%);
  }

  .mission-top {
    @apply flex items-start justify-between gap-2;
  }

  .mission-top strong {
    @apply text-sm font-semibold;
    color: #0f172a;
  }

  .mission-top p {
    @apply m-0 mt-1 text-xs;
    color: #475569;
    line-height: 1.45;
  }

  .mission-top span {
    @apply text-[11px] font-semibold rounded-full px-2 py-1;
    background: #ede9fe;
    color: #6d28d9;
    white-space: nowrap;
  }

  .mission-meta {
    @apply mt-2 flex flex-wrap gap-2;
  }

  .mission-meta span {
    @apply text-[11px] rounded-full px-2 py-1 font-semibold;
    background: #e2e8f0;
    color: #334155;
  }

  .mission-progress {
    @apply mt-2 rounded-full overflow-hidden;
    height: 0.42rem;
    background: #e2e8f0;
  }

  .mission-progress div {
    height: 100%;
    background: linear-gradient(90deg, #7c3aed, #0ea5e9);
  }

  .phase4-actions {
    @apply mt-3 flex flex-wrap gap-2;
  }

  .phase4-toggle-row {
    @apply mt-2;
  }

  .phase4-actions button {
    @apply rounded-full border px-3 py-1.5 text-xs font-semibold;
    background: #f3e8ff;
    border-color: #ddd6fe;
    color: #6d28d9;
  }

  .phase4-actions button.subtle {
    background: #ffffff;
    border-color: #cbd5e1;
    color: #334155;
  }

  .phase4-actions button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .leaderboard-list {
    @apply mt-3 rounded-2xl border overflow-hidden;
    border-color: #ddd6fe;
    background:
      linear-gradient(180deg, rgba(250, 245, 255, 0.97), rgba(255, 255, 255, 0.97));
    box-shadow: 0 12px 24px rgba(15, 23, 42, 0.05);
  }

  .leaderboard-row {
    @apply grid px-3 py-2.5 text-xs;
    grid-template-columns: 3rem 1fr auto;
    gap: 0.5rem;
    color: #4c1d95;
    border-bottom: 1px solid #e9d5ff;
  }

  .leaderboard-row:nth-child(odd) {
    background: rgba(255, 255, 255, 0.44);
  }

  .leaderboard-row:last-child {
    border-bottom: none;
  }

  .your-rank {
    @apply mt-2 mb-0 text-xs font-semibold;
    color: #6d28d9;
  }

  .phase4-field {
    @apply mt-2 flex flex-col gap-1 text-xs font-semibold;
    color: var(--text-soft);
  }

  .phase4-field input,
  .phase4-field textarea {
    @apply rounded-xl border px-3 py-2 text-sm;
    border-color: #cbd5e1;
    background: #ffffff;
    color: var(--text-body);
  }

  .phase4-state {
    @apply mt-3 mb-0 text-sm;
    color: var(--text-soft);
  }

  .phase4-state[data-state='error'] {
    color: #9f1239;
  }

  .forum-list {
    @apply mt-4 grid gap-3;
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  }

  .forum-item {
    @apply rounded-2xl border p-3;
    border-color: #e2e8f0;
    background:
      radial-gradient(circle at top right, rgba(255, 255, 255, 0.88), transparent 28%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
    box-shadow:
      0 12px 22px rgba(15, 23, 42, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.76);
  }

  .forum-item strong {
    @apply text-sm font-semibold;
    color: #0f172a;
  }

  .forum-item p {
    @apply my-1 text-xs;
    color: #475569;
    line-height: 1.45;
  }

  .forum-item span {
    @apply text-xs;
    color: #64748b;
  }

  @media (max-width: 920px) {
    .phase4-hero,
    .phase4-grid {
      grid-template-columns: 1fr;
    }

    .phase4-hero {
      @apply flex-col;
    }

    .phase4-metrics {
      width: 100%;
      min-width: 0;
    }
  }

  @media (max-width: 640px) {
    .phase4-shell {
      @apply p-4;
      padding-left: 0.85rem;
      padding-right: 0.85rem;
      border-radius: 1.15rem;
    }

    .phase4-home-panels {
      margin-top: 0;
    }

    .phase4-hero {
      padding-left: 0.15rem;
    }

    .phase4-copy {
      padding-left: 0.1rem;
    }

    .phase4-copy h3 {
      font-size: 1.03rem;
    }

    .phase4-metrics {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      min-width: 0;
    }

    .phase4-metric {
      padding-left: 0.55rem;
      padding-right: 0.55rem;
    }

    .mission-grid {
      grid-template-columns: 1fr;
    }

    .phase4-card {
      @apply p-4;
      padding-left: 1.15rem;
      padding-right: 1rem;
    }

    .phase4-card-head {
      @apply flex-col;
    }

    .phase4-chip {
      align-self: flex-start;
    }
  }
</style>
