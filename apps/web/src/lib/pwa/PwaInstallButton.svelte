<script lang="ts">
  import { onMount } from 'svelte';
  import { isInstallPromptEvent, isStandaloneDisplay, type InstallPromptEvent } from './install';

  let deferredPrompt: InstallPromptEvent | null = null;
  let isInstalled = false;
  let installFailed = false;

  onMount(() => {
    isInstalled = isStandaloneDisplay();

    const captureInstallPrompt = (event: Event) => {
      if (!isInstallPromptEvent(event)) return;
      event.preventDefault();
      deferredPrompt = event;
    };
    const markInstalled = () => {
      isInstalled = true;
      deferredPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', captureInstallPrompt);
    window.addEventListener('appinstalled', markInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', captureInstallPrompt);
      window.removeEventListener('appinstalled', markInstalled);
    };
  });

  async function install(): Promise<void> {
    if (!deferredPrompt) return;

    installFailed = false;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') isInstalled = true;
    } catch {
      installFailed = true;
    } finally {
      deferredPrompt = null;
    }
  }
</script>

{#if deferredPrompt && !isInstalled}
  <button class="pwa-install" type="button" on:click={install} aria-describedby="pwa-install-help">
    Install app
  </button>
  <span id="pwa-install-help" class="sr-only">Install MBTA Tracker for faster access from your device.</span>
{:else if installFailed}
  <p class="sr-only" role="status">The install prompt could not be opened. Use your browser menu to install the app.</p>
{/if}

<style>
  .pwa-install {
    appearance: none;
    border: 1px solid rgba(29, 78, 216, 0.25);
    border-radius: 999px;
    background: #eff6ff;
    color: #1e40af;
    cursor: pointer;
    font: inherit;
    font-size: 0.76rem;
    font-weight: 750;
    line-height: 1;
    padding: 0.55rem 0.75rem;
  }

  .pwa-install:hover { background: #dbeafe; }
  .pwa-install:focus-visible { outline: 3px solid rgba(37, 99, 235, 0.35); outline-offset: 2px; }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
