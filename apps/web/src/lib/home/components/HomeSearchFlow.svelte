<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import SearchBox from '$lib/SearchBox.svelte';

  type WorkflowIntent = {
    id: 'address' | 'route' | 'alerts' | 'map';
    title: string;
    description: string;
    actionLabel: string;
    query?: string;
  };

  export let searchPrinciples: string[] = [];
  export let workflowIntents: WorkflowIntent[] = [];
  export let journeyStep = 1;
  export let quickQueries: string[] = [];
  export let isSearching = false;
  export let lastQuery = '';
  export let searchError: string | null = null;
  export let routeInfoMessage: string | null = null;
  export let onSearch: (query: string) => void | Promise<void>;

  const dispatch = createEventDispatcher<{
    workflow: WorkflowIntent['id'];
  }>();
</script>

<div class="search-container">
  <section class="search-hero" aria-labelledby="search-hero-title">
    <div class="search-hero-copy">
      <p class="search-hero-kicker">Search-first transit</p>
      <h1 id="search-hero-title">Find the next MBTA answer fast.</h1>
      <p class="search-hero-subtext">Live data is labeled, cached data is clearly marked, and offline fallback never pretends to be live.</p>
      <div class="search-hero-pills" aria-label="How the experience works">
        {#each searchPrinciples as principle, index}
          <span class="hero-pill" style={`--stagger:${index};`}>{principle}</span>
        {/each}
      </div>
    </div>
  </section>

  <SearchBox
    {onSearch}
    placeholder="Search stop, route, address, vehicle"
    autoFocus={true}
  />

  <section class="workflow-rail" aria-label="Guided one-tap workflows">
    <div class="workflow-rail-head">
      <h3>Start with one clear action</h3>
      <p>No guessing. Pick the flow that matches your intent.</p>
    </div>
    <div class="workflow-grid">
      {#each workflowIntents as intent}
        <button
          class="workflow-card"
          on:click={() => dispatch('workflow', intent.id)}
          aria-label={`${intent.actionLabel}: ${intent.title}`}
        >
          <span class="workflow-title">{intent.title}</span>
          <span class="workflow-description">{intent.description}</span>
          <span class="workflow-action">{intent.actionLabel}</span>
        </button>
      {/each}
    </div>
  </section>

  <section class="journey-rail" aria-label="Current progress through transit workflow">
    <span class="journey-step" class:is-active={journeyStep >= 1}>1. Search</span>
    <span class="journey-step" class:is-active={journeyStep >= 2}>2. Pick</span>
    <span class="journey-step" class:is-active={journeyStep >= 3}>3. Ride</span>
    <span class="journey-tip">Shortcut: press / to focus search instantly.</span>
  </section>
</div>

{#if isSearching}
  <div class="search-status" role="status" aria-live="polite">
    Searching "{lastQuery}"...
  </div>
{/if}

{#if searchError}
  <div class="search-error" role="alert">
    Search failed: {searchError}
  </div>
{/if}

{#if routeInfoMessage}
  <div class="search-info" role="status" aria-live="polite">
    {routeInfoMessage}
  </div>
{/if}

{#if !lastQuery && !isSearching}
  <section class="starter-inline" aria-label="Quick start actions">
    {#each quickQueries as query, index}
      <button class="starter-inline-item" style={`--stagger:${index};`} on:click={() => onSearch(query)}>
        {query}
      </button>
    {/each}
  </section>

  <section class="search-guidance" aria-label="Suggested search patterns">
    <p>Use route or stop when you know it. Use address for nearest boarding. Press / or Cmd/Ctrl+K to jump into search.</p>
  </section>
{/if}
