<script lang="ts">
  import TrackerWidget from '$lib/tracker/TrackerWidget.svelte';
  import type { TrackerWidgetConfig } from '$lib/tracker';

  export let data: { config: TrackerWidgetConfig };
</script>

<svelte:head>
  <title>{data.config.title}</title>
  <meta name="description" content={data.config.subtitle} />
  <meta name="robots" content="noindex,nofollow" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<TrackerWidget config={data.config} />

<style>
  :global(body) {
    margin: 0;
  }
</style>
