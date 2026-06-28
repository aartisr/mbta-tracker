<script lang="ts">
  import {
    fetchCommuteRecommendation,
    fetchEmergencyReroute,
    fetchPhase3Snapshot,
    submitPrivacyConsent
  } from '$lib/phase3-api';
  import type {
    CommuteRecommendationResponse,
    CommuteSummary,
    EmergencyRerouteResponse,
    PrivacyDashboardResponse
  } from '$lib/types';

  export let sessionId: string;
  export let onTrack: (event: string, meta?: Record<string, unknown>) => Promise<void>;

  let myCommutes: CommuteSummary[] = [];
  let myCommutesUserHash = '';
  let selectedCommuteId = '';

  let commuteRecommendation: CommuteRecommendationResponse | null = null;
  let recommendationLoading = false;
  let recommendationError: string | null = null;

  let emergencyDisruptedRoute = 'Red Line';
  let emergencyReroute: EmergencyRerouteResponse | null = null;
  let emergencyLoading = false;
  let emergencyError: string | null = null;
  let acceptedEmergencyRouteId: string | null = null;
  let remindEmergencyLater = false;

  let panelLoading = false;
  let panelError: string | null = null;
  let privacyDashboard: PrivacyDashboardResponse | null = null;
  let privacyUpdating = false;
  let privacyError: string | null = null;
  let selectedCommute: CommuteSummary | undefined;
  let fasterCommuteCount = 0;
  let slowerCommuteCount = 0;
  let stableCommuteCount = 0;

  const invokedByUser = true;

  $: selectedCommute = getSelectedCommute();
  $: fasterCommuteCount = myCommutes.filter((item) => item.trend === 'faster').length;
  $: slowerCommuteCount = myCommutes.filter((item) => item.trend === 'slower').length;
  $: stableCommuteCount = myCommutes.filter((item) => item.trend === 'stable').length;

  function getSelectedCommute(): CommuteSummary | undefined {
    return myCommutes.find((item) => item.commute_id === selectedCommuteId);
  }

  function formatCommuteRoute(commute: CommuteSummary): string {
    return `${commute.from_stop_name} → ${commute.to_stop_name}`;
  }

  function getTrendLabel(trend: CommuteSummary['trend']): string {
    if (trend === 'faster') return 'Running faster';
    if (trend === 'slower') return 'Needs attention';
    return 'On pace';
  }

  async function loadData() {
    if (!sessionId) {
      return;
    }

    panelLoading = true;
    panelError = null;

    try {
      const snapshot = await fetchPhase3Snapshot(sessionId);
      myCommutes = snapshot.commutes.commutes || [];
      myCommutesUserHash = snapshot.commutes.user_hash;
      privacyDashboard = snapshot.privacy;

      if (!selectedCommuteId && myCommutes.length > 0) {
        selectedCommuteId = myCommutes[0].commute_id;
      }

      if (myCommutes.length > 0) {
        await loadRecommendation();
      }
    } catch (error) {
      panelError = error instanceof Error ? error.message : 'Unable to load commute learning panel';
    } finally {
      panelLoading = false;
    }
  }

  async function loadRecommendation() {
    const selectedCommute = getSelectedCommute();
    if (!selectedCommute) {
      return;
    }

    recommendationLoading = true;
    recommendationError = null;

    try {
      commuteRecommendation = await fetchCommuteRecommendation(
        sessionId,
        selectedCommute.from_stop_id,
        selectedCommute.to_stop_id
      );
      await onTrack('commute_recommendation_loaded', {
        from_stop: selectedCommute.from_stop_id,
        to_stop: selectedCommute.to_stop_id
      });
    } catch (error) {
      recommendationError = error instanceof Error ? error.message : 'Recommendation unavailable';
    } finally {
      recommendationLoading = false;
    }
  }

  async function loadEmergency() {
    const selectedCommute = getSelectedCommute();
    if (!selectedCommute) {
      return;
    }

    emergencyLoading = true;
    emergencyError = null;
    acceptedEmergencyRouteId = null;
    remindEmergencyLater = false;

    try {
      emergencyReroute = await fetchEmergencyReroute(
        selectedCommute.from_stop_id,
        selectedCommute.to_stop_id,
        emergencyDisruptedRoute
      );
      await onTrack('emergency_reroute_generated', {
        disrupted_route: emergencyDisruptedRoute,
        options: emergencyReroute.alternatives.length
      });
    } catch (error) {
      emergencyError = error instanceof Error ? error.message : 'Emergency reroute unavailable';
    } finally {
      emergencyLoading = false;
    }
  }

  async function updateConsent(optedIn: boolean) {
    if (!privacyDashboard) {
      return;
    }

    privacyUpdating = true;
    privacyError = null;

    try {
      await submitPrivacyConsent(sessionId, optedIn, privacyDashboard.anonymize_after_days ?? 30);
      await loadData();
      await onTrack('privacy_consent_updated', { opted_in: optedIn });
    } catch (error) {
      privacyError = error instanceof Error ? error.message : 'Failed to update privacy controls';
    } finally {
      privacyUpdating = false;
    }
  }

  async function acceptEmergencyOption(routeId: string) {
    acceptedEmergencyRouteId = routeId;
    remindEmergencyLater = false;
    await onTrack('emergency_reroute_accepted', { route_id: routeId });
  }

  async function remindEmergencyOptionLater() {
    remindEmergencyLater = true;
    acceptedEmergencyRouteId = null;
    await onTrack('emergency_reroute_remind_later');
  }

  function selectCommute(commuteId: string) {
    selectedCommuteId = commuteId;
    commuteRecommendation = null;
    emergencyReroute = null;
    void loadRecommendation();
  }

  $: if (sessionId && invokedByUser) {
    void loadData();
  }
</script>

<section class="phase3-home-panels" aria-label="Personal commute learning and disruption response">
  <article class="phase3-shell">
    <div class="phase3-hero">
      <div class="phase3-hero-copy">
        <p class="phase3-kicker">Commute intelligence</p>
        <h3>Know the best departure before you leave.</h3>
        <p>
          Saved commutes, departure windows, and disruption fallback in one fast panel built for quick decisions.
        </p>
      </div>

      <div class="phase3-metrics" aria-label="Commute summary">
        <div class="phase3-metric">
          <strong>{myCommutes.length}</strong>
          <span>saved commutes</span>
        </div>
        <div class="phase3-metric">
          <strong>{fasterCommuteCount}</strong>
          <span>running faster</span>
        </div>
        <div class="phase3-metric">
          <strong>{privacyDashboard?.opted_in ? 'On' : 'Off'}</strong>
          <span>learning</span>
        </div>
      </div>
    </div>

    {#if panelLoading}
      <div class="phase3-empty phase3-empty-loading">
        <p>Loading your commute patterns...</p>
      </div>
    {:else if panelError}
      <div class="phase3-empty phase3-empty-error" role="alert">
        <p>{panelError}</p>
      </div>
    {:else if myCommutes.length === 0}
      <div class="phase3-empty">
        <p>No commute history yet. Search and select a trip to start learning patterns.</p>
      </div>
    {:else}
      <div class="phase3-grid">
        <div class="commute-rail" role="list" aria-label="Saved commute patterns">
          <div class="phase3-section-label">Saved commutes</div>
          {#each myCommutes as commute}
            <button
              type="button"
              class="commute-item"
              class:active={selectedCommuteId === commute.commute_id}
              on:click={() => selectCommute(commute.commute_id)}
            >
              <div class="commute-item-copy">
                <strong>{commute.label}</strong>
                <p>{formatCommuteRoute(commute)}</p>
              </div>
              <div class="commute-item-meta">
                <span class="commute-window">{commute.typical_departure_time}</span>
                <span class="commute-trend" data-trend={commute.trend}>{getTrendLabel(commute.trend)}</span>
              </div>
            </button>
          {/each}
        </div>

        <div class="phase3-detail-stack">
          <section class="phase3-card phase3-card-primary" aria-live="polite">
            <div class="phase3-card-head">
              <div>
                <p class="phase3-section-label">Next best move</p>
                <h4>{selectedCommute ? selectedCommute.label : 'Pick a commute to personalize the view'}</h4>
              </div>
              {#if selectedCommute}
                <span class="phase3-route-chip">{selectedCommute.trip_count} trips</span>
              {/if}
            </div>

            {#if selectedCommute}
              <p class="phase3-route-line">{formatCommuteRoute(selectedCommute)}</p>
              <p class="phase3-route-meta">
                Typical departure {selectedCommute.typical_departure_time} • {selectedCommute.trip_count} tracked trips • {getTrendLabel(selectedCommute.trend)}
              </p>
            {/if}

            {#if commuteRecommendation}
              <div class="window-chips">
                {#each commuteRecommendation.recommended_departure_windows as windowLabel}
                  <span>{windowLabel}</span>
                {/each}
              </div>
              <p class="recommendation-reason">{commuteRecommendation.reason}</p>
            {:else}
              <p class="recommendation-reason">
                Tap the action below and we’ll generate the fastest departure windows for the selected commute.
              </p>
            {/if}

            <div class="phase3-actions">
              <button on:click={loadRecommendation} disabled={!selectedCommute || recommendationLoading}>
                {recommendationLoading ? 'Calculating...' : 'Get next departure suggestion'}
              </button>
              {#if commuteRecommendation}
                <button class="subtle" on:click={() => loadRecommendation()}>
                  Refresh recommendation
                </button>
              {/if}
            </div>

            {#if recommendationError}
              <p class="phase3-state" data-state="error">{recommendationError}</p>
            {/if}
          </section>

          <div class="phase3-split">
            {#if privacyDashboard}
              <section class="phase3-card">
                <div class="phase3-card-head">
                  <div>
                    <p class="phase3-section-label">Privacy</p>
                    <h4>{privacyDashboard.opted_in ? 'Learning enabled' : 'Learning paused'}</h4>
                  </div>
                  <span class="phase3-route-chip">{privacyDashboard.stored_commute_count} records</span>
                </div>
                <p class="phase3-route-meta">Hashed user {myCommutesUserHash} • Auto-cleanup after {privacyDashboard.anonymize_after_days} days</p>
                <div class="privacy-actions">
                  <button on:click={() => updateConsent(true)} disabled={privacyUpdating || privacyDashboard.opted_in}>
                    Opt in
                  </button>
                  <button on:click={() => updateConsent(false)} disabled={privacyUpdating || !privacyDashboard.opted_in}>
                    Opt out + clear
                  </button>
                </div>
                {#if privacyError}
                  <p class="phase3-state" data-state="error">{privacyError}</p>
                {/if}
              </section>
            {/if}

            <section class="phase3-card">
              <div class="phase3-card-head">
                <div>
                  <p class="phase3-section-label">Disruption fallback</p>
                  <h4>Compare alternate routes fast</h4>
                </div>
                <span class="phase3-route-chip">Live reroute</span>
              </div>

              <label class="phase3-field">
                Disrupted route or line
                <input
                  type="text"
                  bind:value={emergencyDisruptedRoute}
                  placeholder="e.g. Red Line"
                />
              </label>

              <div class="phase3-actions">
                <button on:click={loadEmergency} disabled={emergencyLoading || myCommutes.length === 0}>
                  {emergencyLoading ? 'Finding alternatives...' : 'Generate emergency alternatives'}
                </button>
              </div>

              {#if emergencyError}
                <p class="phase3-state" data-state="error">{emergencyError}</p>
              {/if}

              {#if emergencyReroute}
                <div class="emergency-banner" role="status" aria-live="polite">
                  Active disruption: {emergencyReroute.disrupted_route}
                </div>
                <div class="emergency-list" role="list" aria-label="Emergency route alternatives">
                  {#each emergencyReroute.alternatives as option}
                    <div role="listitem" class="emergency-option">
                      <div class="emergency-option-copy">
                        <strong>{option.route_number} • {option.route_name}</strong>
                        <p>ETA {option.eta_minutes} min • +{option.time_penalty_minutes} min • {option.accessibility_support} access</p>
                      </div>
                      <button
                        class="mini"
                        on:click={() => acceptEmergencyOption(option.route_id)}
                        disabled={acceptedEmergencyRouteId === option.route_id}
                      >
                        {acceptedEmergencyRouteId === option.route_id ? 'Accepted' : 'Accept'}
                      </button>
                    </div>
                  {/each}
                </div>
                <div class="phase3-actions">
                  <button class="subtle" on:click={remindEmergencyOptionLater}>Remind me in 5 min</button>
                </div>
                {#if remindEmergencyLater}
                  <p class="phase3-state">Reminder saved. We will re-alert if disruption remains active.</p>
                {/if}
              {/if}
            </section>
          </div>
        </div>
      </div>
    {/if}
  </article>
</section>

<style lang="postcss">
  .phase3-home-panels {
    @apply mt-5;
  }

  .phase3-shell {
    @apply rounded-[1.5rem] border p-4;
    background:
      radial-gradient(circle at top right, rgba(56, 189, 248, 0.14), transparent 24%),
      linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(248, 251, 255, 0.96));
    border-color: #d9e6f3;
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  }

  .phase3-hero {
    @apply flex items-start justify-between gap-4;
  }

  .phase3-hero-copy {
    @apply min-w-0;
  }

  .phase3-kicker {
    @apply m-0 text-[11px] uppercase tracking-[0.26em] font-semibold;
    color: #0f766e;
  }

  .phase3-hero-copy h3 {
    @apply m-0 mt-1 text-[1.18rem] font-semibold;
    color: var(--text-strong);
    letter-spacing: -0.02em;
  }

  .phase3-hero-copy p {
    @apply m-0 mt-1 text-sm;
    color: var(--text-soft);
    line-height: 1.55;
    max-width: 44rem;
  }

  .phase3-metrics {
    @apply grid gap-2;
    grid-template-columns: repeat(3, minmax(4.5rem, 1fr));
    flex-shrink: 0;
    min-width: 16rem;
  }

  .phase3-metric {
    @apply rounded-2xl border px-3 py-2 text-center;
    background: rgba(255, 255, 255, 0.9);
    border-color: #dbe7f5;
  }

  .phase3-metric strong {
    @apply block text-lg font-semibold;
    color: #0f172a;
    line-height: 1.05;
  }

  .phase3-metric span {
    @apply mt-1 block text-[11px] uppercase tracking-[0.16em] font-semibold;
    color: #64748b;
  }

  .phase3-empty {
    @apply mt-4 rounded-2xl border p-4;
    background: rgba(255, 255, 255, 0.9);
    border-color: #dbe7f5;
    color: var(--text-soft);
  }

  .phase3-empty-loading,
  .phase3-empty-error {
    background: #f8fbff;
  }

  .phase3-empty-error {
    color: #9f1239;
  }

  .phase3-grid {
    @apply mt-4 grid gap-4;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 1.35fr);
  }

  .commute-rail {
    @apply rounded-2xl border p-3;
    background: #f8fbff;
    border-color: #d9e6f3;
  }

  .phase3-section-label {
    @apply m-0 text-[11px] uppercase tracking-[0.22em] font-semibold;
    color: #0f766e;
  }

  .commute-item {
    @apply w-full rounded-2xl border px-3 py-2 text-left;
    background: rgba(255, 255, 255, 0.95);
    border-color: #dbe7f5;
    color: var(--text-body);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
  }

  .commute-item:hover {
    transform: translateY(-1px);
    border-color: #bcd6f1;
    box-shadow: 0 10px 18px rgba(15, 23, 42, 0.06);
  }

  .commute-item.active {
    border-color: #0f766e;
    background: linear-gradient(135deg, rgba(236, 253, 245, 0.98), rgba(240, 249, 255, 0.98));
    box-shadow: 0 12px 22px rgba(15, 118, 110, 0.1);
  }

  .commute-item-copy {
    @apply min-w-0;
  }

  .commute-item-copy strong {
    @apply block text-sm font-semibold;
    color: var(--text-strong);
    letter-spacing: -0.01em;
  }

  .commute-item-copy p {
    @apply m-0 mt-1 text-xs;
    color: var(--text-soft);
  }

  .commute-item-meta {
    @apply flex flex-col items-end gap-1;
    flex-shrink: 0;
  }

  .commute-window {
    @apply text-xs font-semibold px-2 py-1 rounded-full;
    background: #dbeafe;
    color: #1e3a8a;
  }

  .commute-trend {
    @apply text-xs font-semibold uppercase px-2 py-1 rounded-full;
    background: #e2e8f0;
    color: #334155;
  }

  .commute-trend[data-trend='faster'] {
    background: #dcfce7;
    color: #166534;
  }

  .commute-trend[data-trend='slower'] {
    background: #fee2e2;
    color: #991b1b;
  }

  .phase3-detail-stack {
    @apply grid gap-4;
  }

  .phase3-split {
    @apply grid gap-4;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .phase3-card {
    @apply rounded-2xl border p-4;
    background: rgba(255, 255, 255, 0.96);
    border-color: #dbe7f5;
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
  }

  .phase3-card-primary {
    background:
      radial-gradient(circle at top right, rgba(34, 197, 94, 0.08), transparent 24%),
      linear-gradient(145deg, rgba(240, 253, 244, 0.98), rgba(248, 251, 255, 0.98));
    border-color: #bbf7d0;
  }

  .phase3-card-head {
    @apply flex items-start justify-between gap-3;
  }

  .phase3-card-head h4 {
    @apply m-0 mt-1 text-sm font-semibold;
    color: var(--text-strong);
    letter-spacing: -0.01em;
  }

  .phase3-route-chip {
    @apply inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full;
    background: #eff6ff;
    color: #1d4ed8;
    flex-shrink: 0;
  }

  .phase3-route-line {
    @apply m-0 mt-3 text-sm font-semibold;
    color: #14532d;
  }

  .phase3-route-meta {
    @apply m-0 mt-1 text-xs;
    color: #475569;
    line-height: 1.45;
  }

  .window-chips {
    @apply mt-3 flex flex-wrap gap-2;
  }

  .window-chips span {
    @apply rounded-full px-2.5 py-1 text-xs font-semibold;
    background: #dcfce7;
    color: #166534;
  }

  .recommendation-reason {
    @apply m-0 mt-3 text-xs;
    color: #166534;
    line-height: 1.45;
  }

  .phase3-actions {
    @apply mt-3 flex flex-wrap gap-2;
  }

  .phase3-actions button {
    @apply rounded-full border px-3 py-1.5 text-xs font-semibold;
    background: #eef4ff;
    border-color: #bfdbfe;
    color: #1e3a8a;
  }

  .phase3-actions button.subtle {
    background: #f8fafc;
    border-color: #cbd5e1;
    color: #334155;
  }

  .phase3-actions button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .privacy-actions {
    @apply mt-3 flex flex-wrap gap-2;
  }

  .privacy-actions button {
    @apply rounded-full border px-2.5 py-1 text-xs font-semibold;
    background: #ffffff;
    border-color: #bfdbfe;
    color: #1e3a8a;
  }

  .phase3-field {
    @apply mt-3 flex flex-col gap-1 text-xs font-semibold;
    color: var(--text-soft);
  }

  .phase3-field input {
    @apply rounded-xl border px-3 py-2 text-sm;
    border-color: #cbd5e1;
    background: #ffffff;
    color: var(--text-body);
  }

  .emergency-banner {
    @apply mt-3 rounded-xl border px-3 py-2 text-xs font-semibold;
    background: #fff7ed;
    border-color: #fdba74;
    color: #9a3412;
  }

  .emergency-list {
    @apply mt-3 flex flex-col gap-2;
  }

  .emergency-option {
    @apply rounded-xl border px-3 py-2;
    background: #f8fafc;
    border-color: #dbe7f5;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.7rem;
  }

  .emergency-option-copy {
    @apply min-w-0;
  }

  .emergency-option-copy strong {
    @apply block text-sm font-semibold;
    color: var(--text-strong);
  }

  .emergency-option-copy p {
    @apply m-0 mt-1 text-xs;
    color: var(--text-soft);
  }

  .emergency-option .mini {
    @apply rounded-full border px-2.5 py-1 text-xs font-semibold;
    background: #ffffff;
    border-color: #fdba74;
    color: #9a3412;
    white-space: nowrap;
  }

  @media (max-width: 920px) {
    .phase3-hero,
    .phase3-grid,
    .phase3-split {
      grid-template-columns: 1fr;
    }

    .phase3-hero {
      @apply flex-col;
    }

    .phase3-metrics {
      width: 100%;
      min-width: 0;
    }
  }

  @media (max-width: 640px) {
    .phase3-shell {
      @apply p-3;
      border-radius: 1.15rem;
    }

    .phase3-hero-copy h3 {
      font-size: 1.03rem;
    }

    .phase3-metrics {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .commute-item {
      @apply px-2.5 py-2;
      align-items: flex-start;
    }

    .commute-item-meta {
      align-items: flex-start;
    }

    .phase3-card {
      @apply p-3;
    }

    .phase3-card-head {
      @apply flex-col;
    }

    .phase3-route-chip {
      align-self: flex-start;
    }
  }
</style>
