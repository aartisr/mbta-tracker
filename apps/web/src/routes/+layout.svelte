<script lang="ts">
  import { page } from '$app/stores';

  $: isEmbed = $page.url.pathname.startsWith('/embed');
</script>

<svelte:head>
  <meta name="color-scheme" content="light" />
</svelte:head>

<div class:embed-shell={isEmbed} class="app-shell">
  <slot />
</div>

<style lang="postcss">
  :global(body) {
    margin: 0;
    min-height: 100%;
    -webkit-font-smoothing: antialiased;
    -webkit-text-size-adjust: 100%;
    background:
      radial-gradient(circle at 8% 6%, rgba(29, 78, 216, 0.12), transparent 28%),
      radial-gradient(circle at 92% 10%, rgba(15, 118, 110, 0.1), transparent 30%),
      radial-gradient(circle at 50% 120%, rgba(148, 163, 184, 0.18), transparent 36%),
      linear-gradient(180deg, #f8fbff 0%, #edf3f9 48%, #e9eef5 100%);
    color: #334155;
    font-family: 'Manrope', 'Segoe UI', sans-serif;
  }

  :global(html) {
    background: #f8fbff;
  }

  .app-shell {
    min-height: 100%;
  }

  .embed-shell {
    background: transparent;
  }
</style>
