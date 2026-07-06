<script lang="ts">
  import { page } from '$app/stores';
  const clarityProjectId = import.meta.env.PUBLIC_CLARITY_PROJECT_ID as string | undefined;
  const siteUrlFromEnv = import.meta.env.PUBLIC_SITE_URL as string | undefined;
  const googleSiteVerification = import.meta.env.PUBLIC_GOOGLE_SITE_VERIFICATION as string | undefined;
  const bingSiteVerification = import.meta.env.PUBLIC_BING_SITE_VERIFICATION as string | undefined;
  const yandexSiteVerification = import.meta.env.PUBLIC_YANDEX_SITE_VERIFICATION as string | undefined;
  const baiduSiteVerification = import.meta.env.PUBLIC_BAIDU_SITE_VERIFICATION as string | undefined;

  $: siteOrigin = (siteUrlFromEnv ? siteUrlFromEnv.replace(/\/$/, '') : $page.url.origin);
  $: currentPageUrl = `${siteOrigin}${$page.url.pathname}`;
  $: organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteOrigin}/#organization`,
    name: 'MBTA Tracker',
    url: siteOrigin,
    logo: `${siteOrigin}/mbta-social-preview.svg`,
    founder: {
      '@id': `${siteOrigin}/#author`
    },
    creator: {
      '@id': `${siteOrigin}/#author`
    },
    sameAs: ['https://ai-aarti.com', 'https://github.com/aartisr']
  };

  $: authorSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${siteOrigin}/#author`,
    name: 'Aarti S Ravikumar',
    url: 'https://ai-aarti.com',
    sameAs: ['https://ai-aarti.com', 'https://github.com/aartisr']
  };

  $: websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteOrigin}/#website`,
    name: 'MBTA Tracker',
    url: siteOrigin,
    creator: {
      '@id': `${siteOrigin}/#author`
    },
    author: {
      '@id': `${siteOrigin}/#author`
    },
    publisher: {
      '@id': `${siteOrigin}/#organization`
    },
    copyrightHolder: {
      '@id': `${siteOrigin}/#author`
    }
  };

  $: isEmbed = $page.url.pathname.startsWith('/embed');
</script>

<svelte:head>
  <meta name="color-scheme" content="light" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="format-detection" content="telephone=no,address=no,email=no" />
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
  <meta name="application-name" content="MBTA Tracker" />
  <meta name="author" content="Aarti S Ravikumar" />
  <meta name="creator" content="Aarti S Ravikumar" />
  <meta name="copyright" content="Aarti S Ravikumar" />
  <meta name="apple-mobile-web-app-title" content="MBTA Tracker" />
  <meta name="geo.region" content="US-MA" />
  <meta name="geo.placename" content="Boston" />
  <meta name="ICBM" content="42.3601, -71.0589" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
  <meta property="og:locale" content="en_US" />
  <link rel="alternate" hreflang="en-US" href={currentPageUrl} />
  <link rel="alternate" hreflang="x-default" href={currentPageUrl} />
  <link rel="manifest" href="/site.webmanifest" />
  <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
  <link rel="alternate" type="text/plain" title="LLMs" href="/llms.txt" />
  <link rel="alternate" type="text/plain" title="AI Profile" href="/ai.txt" />
  {#if googleSiteVerification}
    <meta name="google-site-verification" content={googleSiteVerification} />
  {/if}
  {#if bingSiteVerification}
    <meta name="msvalidate.01" content={bingSiteVerification} />
  {/if}
  {#if yandexSiteVerification}
    <meta name="yandex-verification" content={yandexSiteVerification} />
  {/if}
  {#if baiduSiteVerification}
    <meta name="baidu-site-verification" content={baiduSiteVerification} />
  {/if}
  <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
  <script type="application/ld+json">{JSON.stringify(authorSchema)}</script>
  <script type="application/ld+json">{JSON.stringify(websiteSchema)}</script>
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
