<script lang="ts">
  import { onMount } from 'svelte';
  import type { TrackerAlert } from '$lib/tracker';

  type SeverityFilter = 'all' | 'high' | 'medium' | 'low' | 'unknown';
  type ModeFilter = 'all' | 'bus' | 'subway' | 'rail' | 'ferry' | 'general';
  type AlertSeverity = 'high' | 'medium' | 'low' | 'unknown';

  interface AlertNotificationPreferences {
    enabled: boolean;
    mutedUntil: number | null;
    severities: Record<AlertSeverity, boolean>;
  }

  const ALERT_PREFS_KEY = 'mbta_alert_notification_prefs_v1';

  export let alerts: TrackerAlert[] = [];

  let severityFilter: SeverityFilter = 'all';
  let modeFilter: ModeFilter = 'all';
  let searchQuery = '';
  let sortBy: 'recency' | 'severity' | 'title' = 'recency';
  let permissionState: NotificationPermission | 'unsupported' = 'unsupported';
  let notifiedAlertIds = new Set<string>();
  let notificationPreferences: AlertNotificationPreferences = {
    enabled: false,
    mutedUntil: null,
    severities: {
      high: true,
      medium: true,
      low: false,
      unknown: false
    }
  };

  function canUseNotifications(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  function getModeForAlert(alert: TrackerAlert): ModeFilter {
    const text = `${alert.title} ${alert.detail ?? ''}`.toLowerCase();
    if (text.includes('bus') || text.includes('route')) return 'bus';
    if (text.includes('subway') || text.includes('line')) return 'subway';
    if (text.includes('rail') || text.includes('commuter')) return 'rail';
    if (text.includes('ferry')) return 'ferry';
    return 'general';
  }

  function getSeverityWeight(severity: AlertSeverity): number {
    if (severity === 'high') return 0;
    if (severity === 'medium') return 1;
    if (severity === 'low') return 2;
    return 3;
  }

  function getSeverityColor(severity: AlertSeverity): string {
    if (severity === 'high') return '#dc2626';
    if (severity === 'medium') return '#f59e0b';
    if (severity === 'low') return '#3b82f6';
    return '#6b7280';
  }

  function getSeverityBgColor(severity: AlertSeverity): string {
    if (severity === 'high') return 'rgba(220, 38, 38, 0.08)';
    if (severity === 'medium') return 'rgba(245, 158, 11, 0.08)';
    if (severity === 'low') return 'rgba(59, 130, 246, 0.08)';
    return 'rgba(107, 114, 128, 0.08)';
  }

  function getSeverityLabel(severity: AlertSeverity): string {
    return severity.charAt(0).toUpperCase() + severity.slice(1);
  }

  function saveNotificationPreferences() {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(ALERT_PREFS_KEY, JSON.stringify(notificationPreferences));
    } catch {
      // Ignore storage errors.
    }
  }

  async function enableNotifications() {
    if (!canUseNotifications()) {
      permissionState = 'unsupported';
      return;
    }

    const permission = await Notification.requestPermission();
    permissionState = permission;
    notificationPreferences.enabled = permission === 'granted';
    saveNotificationPreferences();
  }

  function toggleSeveritySubscription(severity: AlertSeverity) {
    notificationPreferences = {
      ...notificationPreferences,
      severities: {
        ...notificationPreferences.severities,
        [severity]: !notificationPreferences.severities[severity]
      }
    };
    saveNotificationPreferences();
  }

  function muteNotificationsFor(minutes: number) {
    notificationPreferences = {
      ...notificationPreferences,
      mutedUntil: Date.now() + minutes * 60_000
    };
    saveNotificationPreferences();
  }

  function clearMute() {
    notificationPreferences = {
      ...notificationPreferences,
      mutedUntil: null
    };
    saveNotificationPreferences();
  }

  function notificationsMuted(): boolean {
    return typeof notificationPreferences.mutedUntil === 'number' && notificationPreferences.mutedUntil > Date.now();
  }

  function maybeNotify(alert: TrackerAlert) {
    if (!canUseNotifications() || permissionState !== 'granted') {
      return;
    }

    if (!notificationPreferences.enabled || notificationsMuted()) {
      return;
    }

    if (!notificationPreferences.severities[alert.severity]) {
      return;
    }

    if (notifiedAlertIds.has(alert.id)) {
      return;
    }

    const message = alert.detail || 'Transit service update';
    const notification = new Notification(alert.title, {
      body: message,
      tag: `mbta-alert-${alert.id}`
    });

    notification.onclick = () => {
      if (typeof window !== 'undefined') {
        window.focus();
      }
      notification.close();
    };

    notifiedAlertIds = new Set([...notifiedAlertIds, alert.id]);
  }

  $: filteredAlerts = alerts
    .filter((alert) => {
      if (severityFilter !== 'all' && alert.severity !== severityFilter) {
        return false;
      }

      const alertMode = getModeForAlert(alert);
      if (modeFilter !== 'all' && alertMode !== modeFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          alert.title.toLowerCase().includes(query) ||
          (alert.detail?.toLowerCase().includes(query) ?? false)
        );
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'severity') {
        return getSeverityWeight(a.severity) - getSeverityWeight(b.severity);
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

  $: for (const alert of alerts) {
    maybeNotify(alert);
  }

  onMount(() => {
    if (canUseNotifications()) {
      permissionState = Notification.permission;
    }

    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(ALERT_PREFS_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as AlertNotificationPreferences;
          if (parsed && parsed.severities) {
            notificationPreferences = parsed;
          }
        } catch {
          // Ignore malformed preferences.
        }
      }
    }
  });
</script>

<div class="alert-center">
  <div class="alert-toolbar">
    <div class="filter-group">
      <label for="severity-filter">Severity:</label>
      <select id="severity-filter" bind:value={severityFilter} class="filter-select">
        <option value="all">All</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
        <option value="unknown">Unknown</option>
      </select>
    </div>

    <div class="filter-group">
      <label for="mode-filter">Mode:</label>
      <select id="mode-filter" bind:value={modeFilter} class="filter-select">
        <option value="all">All</option>
        <option value="bus">Bus</option>
        <option value="subway">Subway</option>
        <option value="rail">Rail</option>
        <option value="ferry">Ferry</option>
        <option value="general">General</option>
      </select>
    </div>

    <div class="sort-group">
      <label for="sort-by">Sort:</label>
      <select id="sort-by" bind:value={sortBy} class="filter-select">
        <option value="recency">Recency</option>
        <option value="severity">Severity</option>
        <option value="title">Title</option>
      </select>
    </div>

    <div class="search-group">
      <input
        id="alert-search"
        bind:value={searchQuery}
        class="search-input"
        placeholder="Search alerts"
        aria-label="Search alerts"
      />
    </div>
  </div>

  <div class="notification-toolbar">
    <div class="notification-main">
      <button
        class="notify-button"
        on:click={enableNotifications}
        disabled={permissionState === 'granted' || permissionState === 'unsupported'}
      >
        {#if permissionState === 'granted'}
          Notifications enabled
        {:else if permissionState === 'denied'}
          Notifications blocked by browser
        {:else if permissionState === 'unsupported'}
          Notifications unsupported
        {:else}
          Enable browser notifications
        {/if}
      </button>

      {#if notificationsMuted()}
        <button class="mute-button" on:click={clearMute}>Unmute alerts</button>
      {:else}
        <button class="mute-button" on:click={() => muteNotificationsFor(30)}>Mute 30 min</button>
      {/if}
    </div>

    <div class="severity-subscriptions" role="group" aria-label="Notification severity subscriptions">
      {#each (['high', 'medium', 'low', 'unknown'] as AlertSeverity[]) as sev}
        <label class="severity-toggle">
          <input
            type="checkbox"
            checked={notificationPreferences.severities[sev]}
            on:change={() => toggleSeveritySubscription(sev)}
          />
          <span>{getSeverityLabel(sev)}</span>
        </label>
      {/each}
    </div>
  </div>

  {#if filteredAlerts.length === 0}
    <div class="alert-empty">
      {#if alerts.length === 0}
        <p>No alerts at this time. Good news! 🎉</p>
      {:else}
        <p>No alerts match your filters.</p>
      {/if}
    </div>
  {:else}
    <div class="alert-list">
      {#each filteredAlerts as alert (alert.id)}
        <div
          class="alert-card"
          style="--severity-color: {getSeverityColor(alert.severity)}; --severity-bg: {getSeverityBgColor(alert.severity)};"
        >
          <div class="alert-header">
            <div class="severity-badge">{getSeverityLabel(alert.severity)}</div>
            <h3 class="alert-title">{alert.title}</h3>
          </div>

          {#if alert.detail}
            <p class="alert-detail">{alert.detail}</p>
          {/if}

          <div class="alert-footer">
            <span class="alert-id">ID: {alert.id}</span>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <div class="alert-summary">
    <span class="count-badge">{filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''}</span>
    {#if alerts.length > 0}
      <span class="total-info">({alerts.length} total)</span>
    {/if}
  </div>
</div>

<style>
  .alert-center {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: #ffffff;
    border-radius: 0.5rem;
  }

  .alert-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
    padding: 0.75rem;
    background: #f9fafb;
    border-radius: 0.375rem;
  }

  .notification-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    border-radius: 0.375rem;
    border: 1px solid #e5e7eb;
    background: #fafafa;
  }

  .notification-main {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .notify-button,
  .mute-button {
    border: 1px solid #d1d5db;
    background: #ffffff;
    color: #1f2937;
    border-radius: 0.375rem;
    padding: 0.4rem 0.6rem;
    font-size: 0.8rem;
    cursor: pointer;
  }

  .notify-button:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }

  .severity-subscriptions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  .severity-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.75rem;
    color: #374151;
  }

  .filter-group,
  .sort-group,
  .search-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .filter-group label,
  .sort-group label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .filter-select {
    padding: 0.375rem 0.5rem;
    font-size: 0.875rem;
    border: 1px solid #d1d5db;
    border-radius: 0.25rem;
    background: #ffffff;
    color: #1f2937;
    cursor: pointer;
  }

  .filter-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .search-input {
    flex: 1;
    min-width: 200px;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    border: 1px solid #d1d5db;
    border-radius: 0.25rem;
    background: #ffffff;
    color: #1f2937;
  }

  .search-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .alert-empty {
    padding: 2rem;
    text-align: center;
    color: #6b7280;
    font-size: 0.95rem;
  }

  .alert-list {
    display: grid;
    gap: 0.8rem;
    max-height: 500px;
    overflow-y: auto;
  }

  .alert-card {
    padding: 1rem 1rem 0.95rem;
    border-left: 5px solid var(--severity-color);
    background:
      radial-gradient(circle at top right, rgba(255, 255, 255, 0.76), transparent 28%),
      linear-gradient(180deg, var(--severity-bg), #ffffff);
    border-radius: 1rem;
    transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
    box-shadow:
      0 14px 28px rgba(15, 23, 42, 0.06),
      inset 0 1px 0 rgba(255, 255, 255, 0.7);
  }

  .alert-card:hover {
    transform: translateX(2px);
    box-shadow:
      0 18px 32px rgba(15, 23, 42, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
  }

  .alert-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .severity-badge {
    flex-shrink: 0;
    padding: 0.25rem 0.5rem;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--severity-color);
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid var(--severity-color);
    border-radius: 0.25rem;
  }

  .alert-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
    line-height: 1.3;
    letter-spacing: -0.01em;
  }

  .alert-detail {
    margin: 0.5rem 0 0 0;
    font-size: 0.85rem;
    color: #4b5563;
    line-height: 1.5;
  }

  .alert-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.75rem;
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .alert-id {
    font-family: 'Monaco', 'Courier New', monospace;
  }

  .alert-summary {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0;
    font-size: 0.85rem;
    color: #6b7280;
    border-top: 1px solid #e5e7eb;
  }

  .count-badge {
    font-weight: 600;
    color: #1f2937;
  }

  .total-info {
    color: #9ca3af;
  }
</style>
