<script lang="ts">
  import type { TrackerAlert } from './types';
  import { alertTone } from './formatters';

  export let alerts: TrackerAlert[] = [];
</script>

<section class="panel">
  <div class="panel-head">
    <h2>Alerts</h2>
    <span class="panel-count alert-count">{alerts.length}</span>
  </div>
  <div class="alerts-list">
    {#each alerts as alert (alert.id)}
      <article class="alert-row" data-severity={alert.severity}>
        <div class="trip-title-row">
          <strong>{alert.title}</strong>
          <span class="alert-chip">{alertTone(alert)}</span>
        </div>
        {#if alert.detail}<p>{alert.detail}</p>{/if}
      </article>
    {/each}
  </div>
</section>

<style>
  :global(.dark-mode) .panel {
    background: linear-gradient(135deg, #1a2a3a 0%, #0f1a2a 100%);
    border: 1px solid rgba(96, 165, 250, 0.2);
    color: #f1f5f9;
  }

  .panel {
    padding: 1.2rem;
    border-radius: 1.5rem;
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border: 1.5px solid rgba(15, 23, 42, 0.12);
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12), 0 4px 8px rgba(15, 23, 42, 0.06);
    backdrop-filter: blur(8px);
    transition: all 0.3s ease;
  }

  .panel-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.8rem;
    border-bottom: 2px solid rgba(15, 23, 42, 0.08);
  }

  :global(.dark-mode) .panel-head {
    border-bottom-color: rgba(96, 165, 250, 0.15);
  }

  .panel-head h2 {
    font-size: 0.85rem;
    font-weight: 800;
    color: #0f172a;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-family: 'Space Grotesk', 'Avenir Next', 'Segoe UI', sans-serif;
  }

  :global(.dark-mode) .panel-head h2 {
    color: #e0e7ff;
  }

  .panel-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2rem;
    height: 2rem;
    padding: 0 0.5rem;
    border-radius: 999px;
    background: #e2e8f0;
    color: #1e293b;
    font-size: 0.8rem;
    font-weight: 700;
    line-height: 1;
    font-family: 'Space Mono', 'Courier New', monospace;
  }

  :global(.dark-mode) .panel-count {
    background: rgba(96, 165, 250, 0.2);
    color: #e0e7ff;
  }

  .alert-count {
    background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
    color: #b91c1c;
    border: 1px solid rgba(220, 38, 38, 0.2);
  }

  :global(.dark-mode) .alert-count {
    background: rgba(220, 38, 38, 0.25);
    color: #fca5a5;
  }

  .alerts-list {
    display: grid;
    gap: 0.75rem;
  }

  .alert-row {
    padding: 1rem;
    border-radius: 1.125rem;
    border: 1.5px solid rgba(15, 23, 42, 0.1);
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    transition: all 0.2s ease;
  }

  :global(.dark-mode) .alert-row {
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.6) 100%);
    border-color: rgba(96, 165, 250, 0.1);
  }

  .alert-row:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
    border-color: rgba(15, 23, 42, 0.2);
  }

  :global(.dark-mode) .alert-row:hover {
    box-shadow: 0 8px 24px rgba(96, 165, 250, 0.15);
    border-color: rgba(96, 165, 250, 0.2);
  }

  .alert-row p {
    margin: 0.5rem 0 0;
    font-size: 0.85rem;
    color: #1e293b;
    line-height: 1.5;
  }

  :global(.dark-mode) .alert-row p {
    color: #cbd5e1;
  }

  .trip-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .alert-row strong {
    font-size: 0.95rem;
    color: #0f172a;
    font-weight: 700;
  }

  :global(.dark-mode) .alert-row strong {
    color: #f1f5f9;
  }

  .alert-chip {
    display: inline-flex;
    align-items: center;
    padding: 0.3rem 0.65rem;
    border-radius: 999px;
    background: #e2e8f0;
    color: #1e293b;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    flex-shrink: 0;
    font-family: 'Space Mono', 'Courier New', monospace;
  }

  :global(.dark-mode) .alert-chip {
    background: rgba(96, 165, 250, 0.2);
    color: #e0e7ff;
  }

  .alert-row[data-severity='high'] {
    border-color: rgba(220, 38, 38, 0.3);
    background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.08);
  }

  :global(.dark-mode) .alert-row[data-severity='high'] {
    background: linear-gradient(135deg, rgba(220, 38, 38, 0.3) 0%, rgba(220, 38, 38, 0.15) 100%);
    border-color: rgba(220, 38, 38, 0.5);
  }

  .alert-row[data-severity='high'] strong {
    color: #b91c1c;
  }

  :global(.dark-mode) .alert-row[data-severity='high'] strong {
    color: #fca5a5;
  }

  .alert-row[data-severity='high'] .alert-chip {
    background: #fecaca;
    color: #7f1d1d;
  }

  :global(.dark-mode) .alert-row[data-severity='high'] .alert-chip {
    background: rgba(220, 38, 38, 0.5);
    color: #fecaca;
  }

  .alert-row[data-severity='medium'] {
    border-color: rgba(234, 179, 8, 0.3);
    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
    box-shadow: 0 4px 12px rgba(234, 179, 8, 0.08);
  }

  :global(.dark-mode) .alert-row[data-severity='medium'] {
    background: linear-gradient(135deg, rgba(234, 179, 8, 0.25) 0%, rgba(234, 179, 8, 0.1) 100%);
    border-color: rgba(234, 179, 8, 0.4);
  }

  .alert-row[data-severity='medium'] strong {
    color: #92400e;
  }

  :global(.dark-mode) .alert-row[data-severity='medium'] strong {
    color: #fcd34d;
  }

  .alert-row[data-severity='medium'] .alert-chip {
    background: #fde047;
    color: #78350f;
  }

  :global(.dark-mode) .alert-row[data-severity='medium'] .alert-chip {
    background: rgba(234, 179, 8, 0.4);
    color: #fde047;
  }
</style>
