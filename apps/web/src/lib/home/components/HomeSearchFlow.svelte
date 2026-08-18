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

  export let workflowIntents: WorkflowIntent[] = [];
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
      <p class="search-hero-kicker">MBTA Tracker</p>
      <h1 id="search-hero-title">Where do you want to go?</h1>
      <p class="search-hero-subtext">Search a route, stop, address, or vehicle. We’ll show the next useful step.</p>
    </div>
  </section>

  <SearchBox
    {onSearch}
    placeholder="Search stop, route, address, vehicle"
    autoFocus={true}
  />

  <section class="workflow-rail" aria-label="Guided one-tap workflows">
    <h3>Or start here</h3>
    <div class="workflow-grid">
      {#each workflowIntents.slice(0, 3) as intent}
        <button
          class="workflow-card"
          on:click={() => dispatch('workflow', intent.id)}
          aria-label={`${intent.actionLabel}: ${intent.title}`}
        >
          <span class="workflow-title">{intent.title}</span>
          <span class="workflow-description">{intent.description}</span>
        </button>
      {/each}
    </div>
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
    <p class="starter-label">Try a popular search</p>
    {#each quickQueries.slice(0, 3) as query, index}
      <button class="starter-inline-item" style={`--stagger:${index};`} on:click={() => onSearch(query)}>
        {query}
      </button>
    {/each}
  </section>

{/if}
