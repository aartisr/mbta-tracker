<script lang="ts">
  export let data: {
    canonicalUrl: string;
    shareImageUrl: string;
  };
</script>

<svelte:head>
  <title>Privacy | MBTA Tracker | By Aarti S Ravikumar</title>
  <meta name="author" content="Aarti S Ravikumar" />
  <meta name="creator" content="Aarti S Ravikumar" />
  <meta name="copyright" content="Aarti S Ravikumar" />
  <meta
    name="description"
    content="Privacy information for MBTA Tracker, including telemetry, storage, and third-party services."
  />
  <meta name="robots" content="index,follow,max-image-preview:large" />
  <link rel="canonical" href={data.canonicalUrl} />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="MBTA Tracker" />
  <meta property="og:title" content="Privacy | MBTA Tracker | By Aarti S Ravikumar" />
  <meta
    property="og:description"
    content="Privacy information for MBTA Tracker, including telemetry, storage, and third-party services."
  />
  <meta property="og:url" content={data.canonicalUrl} />
  <meta property="og:image" content={data.shareImageUrl} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Privacy | MBTA Tracker | By Aarti S Ravikumar" />
  <meta
    name="twitter:description"
    content="Privacy information for MBTA Tracker, including telemetry, storage, and third-party services."
  />
  <meta name="twitter:image" content={data.shareImageUrl} />
  <script type="application/ld+json">
    {JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'PrivacyPolicy',
      name: 'Privacy Policy for MBTA Tracker',
      url: data.canonicalUrl,
      description: 'Privacy information for MBTA Tracker, including telemetry, storage, and third-party services.',
      publisher: {
        '@type': 'Person',
        name: 'Aarti S Ravikumar',
        url: 'https://ai-aarti.com'
      }
    })}
  </script>
</svelte:head>

<section class="info-page" aria-labelledby="privacy-title">
  <div class="panel">
    <p class="eyebrow">Privacy</p>
    <h1 id="privacy-title">Privacy policy for MBTA Tracker</h1>
    <p>
      MBTA Tracker is designed to work with minimal personal data. This page explains what is stored,
      what telemetry may be collected, and how to limit data sharing.
    </p>

    <h2>What the app stores locally</h2>
    <ul>
      <li>Recent searches and favorite searches on your device.</li>
      <li>Accessibility preferences such as high contrast and dyslexia-friendly font mode.</li>
      <li>A generated session identifier used for anonymous product analytics.</li>
    </ul>

    <h2>Telemetry and analytics</h2>
    <ul>
      <li>Anonymous interaction events may be sent to improve user flow and reliability.</li>
      <li>Session analytics can include action names, page context, and timing metadata.</li>
      <li>The app may use Microsoft Clarity when configured by environment variables.</li>
    </ul>

    <h2>Third-party services</h2>
    <ul>
      <li>MBTA APIs provide transit data.</li>
      <li>Geocoding requests can use Nominatim/OpenStreetMap related services.</li>
      <li>Map rendering can use MapLibre and OpenStreetMap tiles.</li>
    </ul>

    <h2>Your controls</h2>
    <p>
      You can clear browser storage at any time to remove recent searches and local preferences.
      You can also avoid voice search and sharing features if you prefer not to use those capabilities.
    </p>

    <p class="small-note">
      This document is a product privacy summary and not legal advice.
    </p>

    <div class="actions">
      <a href="/">Back to app</a>
      <a href="/about">About MBTA Tracker</a>
    </div>
  </div>
</section>

<style lang="postcss">
  .info-page {
    min-height: calc(100vh - 8rem);
    padding: clamp(1rem, 3vw, 2rem);
    color: #0f172a;
  }

  .panel {
    max-width: 860px;
    margin: 0 auto;
    border: 1px solid rgba(148, 163, 184, 0.24);
    border-radius: 26px;
    background: rgba(255, 255, 255, 0.78);
    backdrop-filter: blur(14px);
    box-shadow: 0 24px 70px rgba(15, 23, 42, 0.08);
    padding: clamp(1rem, 2.5vw, 1.75rem);
  }

  .eyebrow {
    margin: 0;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: #0f766e;
    font-weight: 800;
  }

  h1 {
    margin: 0.4rem 0 0;
    font-size: clamp(1.6rem, 4vw, 2.7rem);
    line-height: 1.08;
    letter-spacing: -0.03em;
  }

  p {
    line-height: 1.7;
    color: #334155;
  }

  h2 {
    margin-top: 1.4rem;
    margin-bottom: 0.5rem;
    font-size: 1.1rem;
    color: #0f172a;
  }

  ul {
    margin: 0;
    padding-left: 1.2rem;
    color: #334155;
  }

  li {
    margin: 0.45rem 0;
    line-height: 1.5;
  }

  .small-note {
    margin-top: 1rem;
    font-size: 0.85rem;
    color: #64748b;
  }

  .actions {
    margin-top: 1.5rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.7rem;
  }

  .actions a {
    text-decoration: none;
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, 0.35);
    padding: 0.65rem 0.95rem;
    color: #1d4ed8;
    font-weight: 700;
    background: rgba(255, 255, 255, 0.85);
  }

  @media (max-width: 640px) {
    .info-page {
      padding: 0.8rem;
    }
  }
</style>
