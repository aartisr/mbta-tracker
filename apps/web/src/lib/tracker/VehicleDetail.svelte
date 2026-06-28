<script lang="ts">
  import type { TrackerVehicle } from './types';
  import { directionLabel, bearingLabel, stopTitle } from './formatters';

  export let vehicle: TrackerVehicle | null = null;

  function modeIcon(mode: TrackerVehicle['mode']): string {
    return mode === 'subway'
      ? '🚇'
      : mode === 'commuter-rail'
        ? '🚆'
        : mode === 'ferry'
          ? '⛴️'
          : '🚌';
  }
</script>

<section class="panel">
  <div class="panel-head">
    <h2>Selected vehicle</h2>
  </div>
  {#if vehicle}
    <div class="detail-card">
      <div class="selected-vehicle-badge">
        <span class="selected-mode-icon">{modeIcon(vehicle.mode)}</span>
        <div>
          <div class="selected-route">{vehicle.routeLabel ?? vehicle.routeId ?? 'Unknown'}</div>
          <div class="selected-id">Vehicle {vehicle.id}</div>
        </div>
      </div>
      <dl>
        <div><dt>Direction</dt><dd>{directionLabel(vehicle.directionId)}</dd></div>
        <div><dt>Heading</dt><dd>{bearingLabel(vehicle.bearing)}</dd></div>
        <div><dt>Next stop</dt><dd>{stopTitle(vehicle.stopId)}</dd></div>
        <div><dt>Position</dt><dd>{vehicle.lat.toFixed(4)}, {vehicle.lon.toFixed(4)}</dd></div>
      </dl>
    </div>
  {:else}
    <div class="empty-state">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
      Click any vehicle to see its details.
    </div>
  {/if}
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

  .selected-vehicle-badge {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%);
    border-radius: 1.25rem;
    margin-bottom: 1.2rem;
    border: 1.5px solid #bfdbfe;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
  }

  :global(.dark-mode) .selected-vehicle-badge {
    background: linear-gradient(135deg, rgba(37, 99, 235, 0.25) 0%, rgba(59, 130, 246, 0.15) 100%);
    border-color: rgba(96, 165, 250, 0.3);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
  }

  .selected-mode-icon {
    font-size: 2rem;
    flex-shrink: 0;
  }

  .selected-route {
    font-size: 1.35rem;
    font-weight: 900;
    color: #0c2d5c;
    line-height: 1.2;
  }

  :global(.dark-mode) .selected-route {
    color: #93c5fd;
  }

  .selected-id {
    font-size: 0.8rem;
    color: #1e293b;
    margin-top: 0.25rem;
    font-weight: 600;
  }

  :global(.dark-mode) .selected-id {
    color: #cbd5e1;
  }

  .detail-card dl {
    display: grid;
    gap: 0.75rem;
  }

  .detail-card div {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid rgba(15, 23, 42, 0.08);
    transition: background 0.2s ease;
  }

  :global(.dark-mode) .detail-card div {
    border-bottom-color: rgba(96, 165, 250, 0.1);
  }

  .detail-card div:last-child {
    border-bottom: none;
  }

  .detail-card div:hover {
    background: rgba(59, 130, 246, 0.04);
    padding: 0.75rem;
    margin: 0 -0.75rem;
    border-radius: 0.75rem;
  }

  :global(.dark-mode) .detail-card div:hover {
    background: rgba(96, 165, 250, 0.1);
  }

  .detail-card dt {
    font-size: 0.8rem;
    color: #334155;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  :global(.dark-mode) .detail-card dt {
    color: #cbd5e1;
  }

  .detail-card dd {
    margin: 0;
    text-align: right;
    font-size: 0.95rem;
    font-weight: 700;
    color: #0f172a;
    font-family: 'Space Mono', 'Courier New', monospace;
  }

  :global(.dark-mode) .detail-card dd {
    color: #f1f5f9;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.8rem;
    padding: 2rem 1.5rem;
    border-radius: 1.25rem;
    background: linear-gradient(135deg, rgba(229, 231, 235, 0.5) 0%, rgba(243, 244, 246, 0.5) 100%);
    color: #475569;
    font-size: 0.9rem;
    text-align: center;
    border: 2px dashed rgba(15, 23, 42, 0.12);
    font-weight: 500;
  }

  :global(.dark-mode) .empty-state {
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.5) 100%);
    border-color: rgba(96, 165, 250, 0.15);
    color: #cbd5e1;
  }

  .empty-state svg {
    opacity: 0.5;
    color: #94a3b8;
  }

  :global(.dark-mode) .empty-state svg {
    color: #64748b;
  }
</style>
