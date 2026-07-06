<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { SearchResult } from '$lib/types';
  import { looksLikeAddressQuery } from '$lib/home/search-intents';
  import {
    getResultActionLabel,
    getResultDetail,
    getResultKindLabel,
    getResultTitle
  } from '$lib/home/search-result-presenters';

  export let searchResults: SearchResult[] = [];
  export let searchResultSummaryPills: string[] = [];
  export let isSearching = false;
  export let searchError: string | null = null;
  export let lastQuery = '';

  const dispatch = createEventDispatcher<{
    select: SearchResult;
  }>();
</script>

{#if searchResults.length > 0}
  <div class="results-section">
    <div class="results-head">
      <div>
        <h2 class="results-title">Results</h2>
        {#if searchResultSummaryPills.length > 0}
          <div class="results-summary-pills" aria-label="Search result summary">
            {#each searchResultSummaryPills as pill}
              <span class="results-summary-pill">{pill}</span>
            {/each}
          </div>
        {/if}
      </div>
      <span class="results-count">{searchResults.length} match{searchResults.length === 1 ? '' : 'es'}</span>
    </div>
    <div class="results-grid">
      {#each searchResults as result, index}
        <button
          class="result-card"
          data-type={result.type}
          style={`--stagger:${index};`}
          aria-label={`${getResultActionLabel(result)} for ${getResultTitle(result)}`}
          on:click={() => dispatch('select', result)}
        >
          <div class="result-topline">
            <div class="result-type">{getResultKindLabel(result)}</div>
            <div class="result-action">{getResultActionLabel(result)}</div>
          </div>
          <div class="result-content">
            <div class="result-name">{getResultTitle(result)}</div>
            <div class="result-detail">{getResultDetail(result)}</div>
          </div>
          <div class="result-arrow">→</div>
        </button>
      {/each}
    </div>
  </div>
{:else if !isSearching && !searchError && lastQuery}
  <div class="empty-results">
    <h2>No direct matches for "{lastQuery}"</h2>
    {#if looksLikeAddressQuery(lastQuery)}
      <p>
        Try a shorter address, like <strong>878 Salem St, Malden</strong>, or pick an autocomplete suggestion so we can route you to the nearest stop.
      </p>
    {:else}
      <p>Try a stop name like South Station, a route like Red Line, or a route number like 66.</p>
    {/if}
  </div>
{/if}
