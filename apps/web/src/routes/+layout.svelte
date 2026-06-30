<script lang="ts">
  import { page } from '$app/stores';
  const clarityProjectId = import.meta.env.PUBLIC_CLARITY_PROJECT_ID as string | undefined;

  $: isEmbed = $page.url.pathname.startsWith('/embed');
</script>

<svelte:head>
  <meta name="color-scheme" content="light" />
  {#if clarityProjectId}
    <script type="text/javascript">
      {`
        (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${clarityProjectId}");
      `}
    </script>
  {/if}
</svelte:head>

<div class:embed-shell={isEmbed} class="app-shell">
  <slot />
</div>

<style lang="postcss">
  :global(:root) {
    --ui-canvas: #f4f7fb;
    --ui-surface: rgba(255, 255, 255, 0.9);
    --ui-surface-strong: #ffffff;
    --ui-surface-muted: rgba(241, 246, 253, 0.9);
    --ui-text: #0f172a;
    --ui-text-strong: #0b1220;
    --ui-text-soft: #475569;
    --ui-border: rgba(203, 213, 225, 0.9);
    --ui-border-strong: rgba(148, 163, 184, 0.95);
    --ui-brand: #1d4ed8;
    --ui-brand-strong: #1e40af;
    --ui-success: #0f766e;
    --ui-warning: #b45309;
    --ui-danger: #b91c1c;
    --ui-focus: rgba(59, 130, 246, 0.24);
    --ui-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  }

  :global(body) {
    margin: 0;
    min-height: 100%;
    overflow-x: clip;
    -webkit-font-smoothing: antialiased;
    -webkit-text-size-adjust: 100%;
    background:
      radial-gradient(circle at 8% 6%, rgba(29, 78, 216, 0.12), transparent 28%),
      radial-gradient(circle at 92% 10%, rgba(15, 118, 110, 0.08), transparent 30%),
      linear-gradient(180deg, #fbfdff 0%, #eff4fa 100%);
    color: var(--ui-text);
    font-family: 'Manrope', 'Segoe UI', sans-serif;
  }

  :global(html) {
    background: var(--ui-canvas);
  }

  :global(*) {
    box-sizing: border-box;
  }

  .app-shell {
    min-height: 100%;
  }

  .embed-shell {
    background: transparent;
  }

  @media (max-width: 640px) {
    :global(body) {
      background:
        linear-gradient(180deg, #fcfdff 0%, #f3f7fc 100%);
    }
  }
</style>
