<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let isSearchListActive = false;
  export let isSearchMapActive = false;
  export let isAlertsActive = false;
  export let alertsCount = 0;

  const dispatch = createEventDispatcher<{
    search: void;
    map: void;
    alerts: void;
  }>();
</script>

<nav class="mobile-thumb-nav" aria-label="Quick mobile navigation">
  <button
    class="thumb-tab"
    class:active={isSearchListActive}
    on:click={() => dispatch('search')}
    aria-current={isSearchListActive ? 'page' : undefined}
  >
    <svg class="thumb-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7"></circle>
      <path d="M20 20l-3.8-3.8"></path>
    </svg>
    <span>Search</span>
  </button>
  <button
    class="thumb-tab"
    class:active={isSearchMapActive}
    on:click={() => dispatch('map')}
    aria-current={isSearchMapActive ? 'page' : undefined}
  >
    <svg class="thumb-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 4L3.8 6.1v13.8L9 17.8l6 2.1 5.2-2.1V4.1L15 6.2 9 4z"></path>
      <path d="M9 4v13.8M15 6.2v13.7"></path>
    </svg>
    <span>Map</span>
  </button>
  <button
    class="thumb-tab"
    class:active={isAlertsActive}
    on:click={() => dispatch('alerts')}
    aria-current={isAlertsActive ? 'page' : undefined}
  >
    <svg class="thumb-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3a6 6 0 0 0-6 6v3.5L4.3 16v1.5h15.4V16L18 12.5V9a6 6 0 0 0-6-6z"></path>
      <path d="M10 19a2 2 0 0 0 4 0"></path>
    </svg>
    <span>Alerts</span>
    {#if alertsCount > 0}
      <span class="thumb-badge">{alertsCount}</span>
    {/if}
  </button>
</nav>

<style lang="postcss">
  .mobile-thumb-nav {
    display: none;
  }

  .thumb-tab {
    @apply inline-flex items-center justify-center gap-1 rounded-full border px-3 py-2 text-xs font-semibold;
    background: rgba(255, 255, 255, 0.9);
    border-color: rgba(203, 213, 225, 0.95);
    color: #334155;
    min-height: 2.25rem;
  }

  .thumb-icon {
    width: 0.9rem;
    height: 0.9rem;
    stroke: currentColor;
    stroke-width: 1.9;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
    flex-shrink: 0;
  }

  .thumb-tab.active {
    background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 52%, #1e40af 100%);
    border-color: #1e40af;
    color: #ffffff;
    box-shadow: 0 10px 20px rgba(29, 78, 216, 0.2);
  }

  .thumb-badge {
    @apply inline-flex items-center justify-center rounded-full text-[10px] font-semibold;
    min-width: 1.05rem;
    height: 1.05rem;
    padding: 0 0.25rem;
    background: #dc2626;
    color: #ffffff;
  }

  @media (max-width: 640px) {
    .mobile-thumb-nav {
      position: fixed;
      left: 0.75rem;
      right: 0.75rem;
      bottom: max(0.55rem, env(safe-area-inset-bottom));
      z-index: 70;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.4rem;
      padding: 0.4rem;
      border-radius: 1rem;
      border: 1px solid rgba(203, 213, 225, 0.9);
      background: rgba(255, 255, 255, 0.88);
      backdrop-filter: blur(16px);
      box-shadow: 0 18px 36px rgba(15, 23, 42, 0.16);
    }
  }
</style>
