<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { TrackerVehicle } from './types';

  export let vehicles: TrackerVehicle[] = [];
  export let selectedVehicleId: string | null = null;
  export let previewVehicleId: string | null = null;
  export let emptyMessage = 'No vehicles match the current filters.';
  export let onSelect: (vehicle: TrackerVehicle) => void = () => {};

  const ROW_HEIGHT_PX = 56;
  const OVERSCAN_ROWS = 6;

  let listEl: HTMLDivElement | null = null;
  let viewportHeight = 384;
  let scrollTop = 0;
  let scrollAnimationFrame: number | null = null;

  let rowRefs = new Map<string, HTMLButtonElement>();

  $: totalRows = vehicles.length;
  $: visibleCount = Math.max(1, Math.ceil(viewportHeight / ROW_HEIGHT_PX) + OVERSCAN_ROWS * 2);
  $: startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT_PX) - OVERSCAN_ROWS);
  $: endIndex = Math.min(totalRows, startIndex + visibleCount);
  $: visibleVehicles = vehicles.slice(startIndex, endIndex);
  $: topSpacerPx = startIndex * ROW_HEIGHT_PX;
  $: bottomSpacerPx = Math.max(0, (totalRows - endIndex) * ROW_HEIGHT_PX);

  function handleListScroll(event: Event): void {
    const target = event.currentTarget as HTMLDivElement;

    if (scrollAnimationFrame !== null) {
      cancelAnimationFrame(scrollAnimationFrame);
    }

    // Coalesce scroll updates to animation frames to reduce rerender churn.
    scrollAnimationFrame = requestAnimationFrame(() => {
      scrollTop = target.scrollTop;
      viewportHeight = target.clientHeight || viewportHeight;
      scrollAnimationFrame = null;
    });
  }

  function bindRow(node: HTMLButtonElement, vehicleId: string) {
    rowRefs.set(vehicleId, node);

    return {
      update(nextVehicleId: string) {
        if (nextVehicleId === vehicleId) {
          return;
        }

        rowRefs.delete(vehicleId);
        vehicleId = nextVehicleId;
        rowRefs.set(vehicleId, node);
      },
      destroy() {
        rowRefs.delete(vehicleId);
      }
    };
  }

  $: {
    if (selectedVehicleId) {
      const row = rowRefs.get(selectedVehicleId);
      // Keep selected vehicle visible without forcing smooth auto-scroll animations.
      row?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    }
  }

  const dispatch = createEventDispatcher<{
    select: { vehicle: TrackerVehicle };
    hover: { vehicle: TrackerVehicle };
    focus: { vehicle: TrackerVehicle };
    leave: { vehicleId: string };
  }>();

  function handleSelect(vehicle: TrackerVehicle): void {
    onSelect(vehicle);
    dispatch('select', { vehicle });
  }

  function handleHover(vehicle: TrackerVehicle): void {
    dispatch('hover', { vehicle });
  }

  function handleFocus(vehicle: TrackerVehicle): void {
    dispatch('focus', { vehicle });
  }

  function handleLeave(vehicleId: string): void {
    dispatch('leave', { vehicleId });
  }

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

<aside class="panel">
  <div class="panel-head">
    <h2>Live vehicles</h2>
    <span class="panel-count">{vehicles.length}</span>
  </div>
  <div class="vehicle-list" role="list" bind:this={listEl} on:scroll={handleListScroll}>
    {#if topSpacerPx > 0}
      <div class="list-spacer" style={`height: ${topSpacerPx}px`} aria-hidden="true"></div>
    {/if}

    {#each visibleVehicles as vehicle (vehicle.id)}
      <button
        use:bindRow={vehicle.id}
        class:active={vehicle.id === selectedVehicleId}
        class:previewed={vehicle.id === previewVehicleId && vehicle.id !== selectedVehicleId}
        class="vehicle-row"
        data-mode={vehicle.mode}
        data-routeid={vehicle.routeId ? vehicle.routeId.toLowerCase() : ''}
        type="button"
        on:click={() => handleSelect(vehicle)}
        on:mouseenter={() => handleHover(vehicle)}
        on:mouseleave={() => handleLeave(vehicle.id)}
        on:focus={() => handleFocus(vehicle)}
        on:blur={() => handleLeave(vehicle.id)}
      >
        <span class="vehicle-mode-icon">{modeIcon(vehicle.mode)}</span>
        <span class="vehicle-info">
          <span class="vehicle-route">{vehicle.routeLabel ?? vehicle.routeId ?? 'Unknown route'}</span>
          {#if vehicle.headsign}
            <span class="vehicle-headsign">{vehicle.headsign}</span>
          {:else}
            <span class="vehicle-meta">{vehicle.id} · {vehicle.mode}</span>
          {/if}
        </span>
        <svg class="vehicle-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    {/each}

    {#if bottomSpacerPx > 0}
      <div class="list-spacer" style={`height: ${bottomSpacerPx}px`} aria-hidden="true"></div>
    {/if}

    {#if vehicles.length === 0}
      <div class="empty-state">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12.01" y2="8"/><line x1="12" y1="12" x2="12" y2="16"/>
        </svg>
        {emptyMessage}
      </div>
    {/if}
  </div>
</aside>

<style>
  .panel {
    padding: 1rem 1.1rem;
    border-radius: 1.35rem;
    background:
      radial-gradient(circle at top right, rgba(219, 234, 254, 0.35), transparent 28%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(248, 251, 255, 0.94));
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

  .vehicle-list {
    display: grid;
    gap: 0.4rem;
    max-height: 24rem;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 0.1rem;
  }

  .vehicle-list::-webkit-scrollbar { width: 4px; }
  .vehicle-list::-webkit-scrollbar-track { background: transparent; }
  .vehicle-list::-webkit-scrollbar-thumb { background: rgba(15, 23, 42, 0.12); border-radius: 99px; }

  .list-spacer {
    width: 100%;
    pointer-events: none;
  }

  .vehicle-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    text-align: left;
    padding: 0.6rem 0.75rem;
    border-radius: 10px;
    border: 1.5px solid rgba(15, 23, 42, 0.07);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.94));
    color: #0f172a;
    cursor: pointer;
    transition: all 0.15s;
    min-height: 48px;
    width: 100%;
    box-sizing: border-box;
  }

  .vehicle-row:hover {
    border-color: rgba(37, 99, 235, 0.25);
    background: linear-gradient(180deg, rgba(239, 246, 255, 0.98), rgba(224, 242, 254, 0.96));
    box-shadow:
      0 14px 24px rgba(37, 99, 235, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.78);
  }

  .vehicle-row.active {
    border-color: rgba(37, 99, 235, 0.5);
    background: linear-gradient(180deg, rgba(219, 234, 254, 0.98), rgba(191, 219, 254, 0.94));
    box-shadow:
      0 16px 26px rgba(37, 99, 235, 0.14),
      inset 0 1px 0 rgba(255, 255, 255, 0.78);
  }

  .vehicle-row.previewed {
    border-color: rgba(14, 165, 233, 0.55);
    background: linear-gradient(180deg, rgba(224, 242, 254, 0.99), rgba(186, 230, 253, 0.95));
    box-shadow:
      0 16px 26px rgba(14, 165, 233, 0.14),
      inset 0 1px 0 rgba(255, 255, 255, 0.78);
  }

  .vehicle-mode-icon { font-size: 1.15rem; flex-shrink: 0; }

  .vehicle-info {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    flex: 1;
    min-width: 0;
  }

  .vehicle-route {
    font-weight: 700;
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .vehicle-meta {
    font-size: 0.76rem;
    color: #64748b;
  }

  .vehicle-headsign {
    font-size: 0.8rem;
    color: #475569;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .vehicle-arrow {
    color: #94a3b8;
    flex-shrink: 0;
    transition: transform 0.15s;
  }

  .vehicle-row:hover .vehicle-arrow { transform: translateX(2px); color: #2563eb; }

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

  @media (prefers-reduced-motion: reduce) {
    .vehicle-row,
    .vehicle-arrow {
      animation: none !important;
      transition: none !important;
    }
  }
</style>
