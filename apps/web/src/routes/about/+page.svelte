<script lang="ts">
  export let data: {
    canonicalUrl: string;
    shareImageUrl: string;
  };
</script>

<svelte:head>
  <title>About MBTA Tracker | Search-First Boston Transit</title>
  <meta name="author" content="Aarti S Ravikumar" />
  <meta
    name="description"
    content="About MBTA Tracker: a search-first MBTA experience designed to reduce cognitive load and speed up transit decisions."
  />
  <meta name="robots" content="index,follow,max-image-preview:large" />
  <link rel="canonical" href={data.canonicalUrl} />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="MBTA Tracker" />
  <meta property="og:title" content="About MBTA Tracker | Search-First Boston Transit" />
  <meta
    property="og:description"
    content="Learn how MBTA Tracker reduces cognitive load with a compact search-first transit experience."
  />
  <meta property="og:url" content={data.canonicalUrl} />
  <meta property="og:image" content={data.shareImageUrl} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="About MBTA Tracker | Search-First Boston Transit" />
  <meta
    name="twitter:description"
    content="Learn how MBTA Tracker reduces cognitive load with a compact search-first transit experience."
  />
  <meta name="twitter:image" content={data.shareImageUrl} />
  <script type="application/ld+json">
    {JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'About MBTA Tracker',
      url: data.canonicalUrl,
      description:
        'About MBTA Tracker: a search-first MBTA experience designed to reduce cognitive load and speed up transit decisions.',
      author: {
        '@type': 'Person',
        name: 'Aarti S Ravikumar',
        url: 'https://ai-aarti.com'
      },
      isPartOf: {
        '@type': 'WebSite',
        name: 'MBTA Tracker',
        url: new URL('/', data.canonicalUrl).toString()
      }
    })}
  </script>
</svelte:head>

<section class="info-page" aria-labelledby="about-title">
  <div class="panel">
    <p class="eyebrow">About</p>
    <h1 id="about-title">MBTA Tracker is built for fast transit decisions.</h1>
    <p>
      The product is intentionally search-first. Instead of forcing users through heavy map interactions,
      MBTA Tracker lets people start with one clear input: stop, route, address, or vehicle.
    </p>
    <p>
      The interface uses progressive disclosure so only high-value detail appears at each step. Users
      can move from discovery to boarding decisions quickly without cognitive overload.
    </p>

    <h2>Design principles</h2>
    <ul>
      <li>One clear primary action per step.</li>
      <li>Compact cards and plain-language labels.</li>
      <li>Map context only when it helps decision making.</li>
      <li>Accessible controls, keyboard shortcuts, and high contrast support.</li>
    </ul>

    <h2>Data and attribution</h2>
    <p>
      MBTA Tracker uses MBTA data APIs and open mapping tools including MapLibre and OpenStreetMap.
      Live arrivals may occasionally lag provider updates.
    </p>

    <div class="actions">
      <a href="/">Open MBTA Tracker</a>
      <a href="/privacy">Read privacy policy</a>
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
    line-height: 1.6;
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
