<script lang="ts">
  import type { TrackerTrip } from './types';
  import { formatMinutes, tripTitle } from './formatters';

  export let trips: TrackerTrip[] = [];
</script>

<section class="panel">
  <div class="panel-head">
    <h2>Trip snapshot</h2>
    <span class="panel-count">{trips.length}</span>
  </div>
  <div class="trip-list" role="list">
    {#if trips.length > 0}
      {#each trips as trip (trip.id)}
        <article class="trip-row" data-mode={trip.mode} data-routeid={trip.routeId ? trip.routeId.toLowerCase() : ''}>
          <div class="trip-title-row">
            <strong>{tripTitle(trip)}</strong>
            <span class="trip-chip" data-mode={trip.mode} data-routeid={trip.routeId ? trip.routeId.toLowerCase() : ''}>{trip.mode}</span>
          </div>
          <p>{trip.headsign ?? 'Headsign not available'}</p>
          <div class="trip-metrics">
            <span>🚘 {trip.liveVehicleCount} vehicles</span>
            <span>⏱ {formatMinutes(trip.etaMinutes)}</span>
            {#if trip.stopCount !== null}<span>🛑 {trip.stopCount} stops</span>{/if}
          </div>
        </article>
      {/each}
    {:else}
      <div class="empty-state">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12.01" y2="8"/><line x1="12" y1="12" x2="12" y2="16"/>
        </svg>
        No trip snapshots yet.
      </div>
    {/if}
  </div>
</section>

<style>
  .panel {
    padding: 1rem 1.1rem;
    border-radius: 1.35rem;
    background:
      radial-gradient(circle at top right, rgba(233, 213, 255, 0.42), transparent 28%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(250, 245, 255, 0.95));
    border: 1px solid rgba(15, 23, 42, 0.07);
    box-shadow:
      0 14px 30px rgba(15, 23, 42, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.75);
    backdrop-filter: blur(14px);
  }

  .panel-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.8rem;
  }

  .panel-head h2 {
    font-size: 0.9rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .panel-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.6rem;
    height: 1.6rem;
    padding: 0 0.4rem;
    border-radius: 999px;
    background: #e2e8f0;
    color: #475569;
    font-size: 0.78rem;
    font-weight: 600;
    line-height: 1;
  }

  .trip-list {
    display: grid;
    gap: 0.5rem;
  }

  .trip-row {
    padding: 0.82rem 0.9rem;
    border-radius: 1rem;
    border: 1.5px solid rgba(15, 23, 42, 0.07);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.94));
  }

  .trip-row p {
    margin: 0.3rem 0 0;
    font-size: 0.84rem;
    color: #475569;
  }

  .trip-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .trip-chip {
    display: inline-flex;
    align-items: center;
    padding: 0.22rem 0.5rem;
    border-radius: 999px;
    background: #e2e8f0;
    color: #475569;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    flex-shrink: 0;
  }

  .trip-metrics {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 0.65rem;
    margin-top: 0.45rem;
    font-size: 0.8rem;
    color: #64748b;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1.4rem 1rem;
    border-radius: 10px;
    background: rgba(241, 245, 249, 0.8);
    color: #64748b;
    font-size: 0.85rem;
    text-align: center;
    border: 1px dashed rgba(15, 23, 42, 0.1);
  }

  .empty-state svg { opacity: 0.4; }
</style>
