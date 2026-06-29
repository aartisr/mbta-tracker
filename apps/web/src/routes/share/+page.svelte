<script lang="ts">
  import type { TrackerWidgetConfig } from '$lib/tracker';

  export let data: {
    config: TrackerWidgetConfig;
    canonicalUrl: string;
    shareImageUrl: string;
  };

  const highlights = [
    {
      title: 'Find the right stop faster',
      body: 'Search routes, stops, addresses, and vehicles without digging through a map first.'
    },
    {
      title: 'See live transit context',
      body: 'Arrivals, nearby stops, vehicle movement, and alerts stay compact and easy to scan.'
    },
    {
      title: 'Built for sharing',
      body: 'A clean public surface, rich metadata, and searchable copy make the app easy to discover.'
    }
  ];

  const faqs = [
    {
      q: 'What is MBTA Tracker?',
      a: 'A search-first transit experience for Boston that helps people find routes, stops, vehicles, and nearby boarding options quickly.'
    },
    {
      q: 'Is this a map app?',
      a: 'The map is available when needed, but the default experience is text-first so people can get answers with less scrolling and less friction.'
    },
    {
      q: 'What makes it fast to use?',
      a: 'The interface favors compact results, progressive disclosure, and direct actions instead of forcing people through heavy screens.'
    },
    {
      q: 'Can I share or embed it?',
      a: 'Yes. The public app includes share metadata, an embeddable widget, and crawlable pages for better indexing.'
    }
  ];

  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a
      }
    }))
  };

  async function copyLink() {
    if (!navigator?.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(data.canonicalUrl);
  }

  async function sharePage() {
    if (navigator?.share) {
      await navigator.share({
        title: 'MBTA Tracker',
        text: 'Search-first MBTA transit, live arrivals, and nearby stop discovery.',
        url: data.canonicalUrl
      });
      return;
    }

    await copyLink();
  }
</script>

<svelte:head>
  <title>MBTA Tracker Share Page</title>
  <meta
    name="description"
    content="MBTA Tracker is a compact search-first transit experience for Boston with live arrivals, nearby stops, route discovery, and an embeddable widget."
  />
  <link rel="canonical" href={data.canonicalUrl} />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="MBTA Tracker" />
  <meta property="og:title" content="MBTA Tracker | Search-first Boston transit" />
  <meta
    property="og:description"
    content="Find the best stop, route, or vehicle in seconds with a compact transit experience designed for speed."
  />
  <meta property="og:url" content={data.canonicalUrl} />
  <meta property="og:image" content={data.shareImageUrl} />
  <meta property="og:image:alt" content="MBTA Tracker social preview" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="MBTA Tracker | Search-first Boston transit" />
  <meta
    name="twitter:description"
    content="Live arrivals, nearby stop discovery, route detail, and compact transit insights for Boston."
  />
  <meta name="twitter:image" content={data.shareImageUrl} />
  <script type="application/ld+json">{JSON.stringify(pageSchema)}</script>
</svelte:head>

<section class="share-page">
  <div class="shell">
    <div class="hero">
      <div class="eyebrow">Boston transit, redesigned for speed</div>
      <h1>MBTA Tracker helps people get the right transit answer in seconds.</h1>
      <p class="lede">
        Search routes, stops, addresses, and vehicles first. Keep the map available when it helps,
        but let compact, glanceable results do the heavy lifting.
      </p>

      <div class="actions">
        <a class="primary" href="/">Open the app</a>
        <button type="button" class="secondary" on:click={sharePage}>Share page</button>
        <button type="button" class="ghost" on:click={copyLink}>Copy link</button>
      </div>

      <dl class="stats" aria-label="Key product facts">
        <div>
          <dt>Focus</dt>
          <dd>Search-first transit discovery</dd>
        </div>
        <div>
          <dt>Entry points</dt>
          <dd>Home, embed, and public APIs</dd>
        </div>
        <div>
          <dt>Design goal</dt>
          <dd>Fast, compact, and easy to share</dd>
        </div>
      </dl>
    </div>

    <div class="cards">
      {#each highlights as item}
        <article class="card">
          <h2>{item.title}</h2>
          <p>{item.body}</p>
        </article>
      {/each}
    </div>

    <div class="faq-wrap">
      <div class="section-label">FAQ</div>
      <div class="faq-grid">
        {#each faqs as item}
          <details class="faq">
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        {/each}
      </div>
    </div>
  </div>
</section>

<style lang="postcss">
  :global(body) {
    margin: 0;
  }

  .share-page {
    min-height: 100vh;
    padding: clamp(1rem, 2.4vw, 2rem);
    color: #0f172a;
  }

  .shell {
    max-width: 1120px;
    margin: 0 auto;
    display: grid;
    gap: 1.2rem;
  }

  .hero,
  .cards,
  .faq-wrap {
    border: 1px solid rgba(148, 163, 184, 0.24);
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.74);
    backdrop-filter: blur(18px);
    box-shadow: 0 24px 70px rgba(15, 23, 42, 0.08);
  }

  .hero {
    padding: clamp(1.25rem, 3vw, 2.25rem);
  }

  .eyebrow,
  .section-label {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.76rem;
    font-weight: 800;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #0f766e;
  }

  h1 {
    margin: 0.7rem 0 0;
    max-width: 14ch;
    font-size: clamp(2rem, 5vw, 4.6rem);
    line-height: 0.96;
    letter-spacing: -0.05em;
    color: #0f172a;
  }

  .lede {
    max-width: 64ch;
    margin: 1rem 0 0;
    font-size: clamp(1rem, 2vw, 1.2rem);
    line-height: 1.65;
    color: #334155;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 1.3rem;
  }

  .actions :global(button),
  .actions a {
    border-radius: 999px;
    padding: 0.86rem 1.15rem;
    font: inherit;
    font-weight: 700;
    border: 1px solid transparent;
    cursor: pointer;
    text-decoration: none;
    transition:
      transform 0.18s ease,
      box-shadow 0.18s ease,
      border-color 0.18s ease;
  }

  .actions :global(button:hover),
  .actions a:hover {
    transform: translateY(-1px);
  }

  .primary {
    background: linear-gradient(135deg, #0f766e, #2563eb);
    color: white;
    box-shadow: 0 14px 30px rgba(37, 99, 235, 0.2);
  }

  .secondary {
    background: #ffffff;
    color: #0f172a;
    border-color: rgba(15, 23, 42, 0.12);
  }

  .ghost {
    background: transparent;
    color: #0f172a;
    border-color: rgba(15, 23, 42, 0.1);
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.8rem;
    margin: 1.5rem 0 0;
  }

  .stats div {
    padding: 0.95rem 1rem;
    border-radius: 20px;
    background: rgba(248, 250, 252, 0.9);
    border: 1px solid rgba(148, 163, 184, 0.18);
  }

  dt {
    font-size: 0.73rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: #64748b;
    font-weight: 800;
  }

  dd {
    margin: 0.45rem 0 0;
    color: #0f172a;
    font-weight: 700;
    line-height: 1.35;
  }

  .cards {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
    padding: 1rem;
  }

  .card {
    padding: 1rem;
    border-radius: 22px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(241, 245, 249, 0.88));
    border: 1px solid rgba(148, 163, 184, 0.18);
  }

  .card h2 {
    margin: 0;
    font-size: 1.08rem;
    line-height: 1.25;
    color: #0f172a;
  }

  .card p {
    margin: 0.55rem 0 0;
    color: #475569;
    line-height: 1.55;
  }

  .faq-wrap {
    padding: clamp(1rem, 2.8vw, 1.75rem);
  }

  .faq-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.9rem;
    margin-top: 1rem;
  }

  .faq {
    padding: 1rem 1.05rem;
    border-radius: 20px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    background: rgba(255, 255, 255, 0.75);
  }

  summary {
    cursor: pointer;
    list-style: none;
    font-weight: 800;
    color: #0f172a;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  .faq p {
    margin: 0.7rem 0 0;
    line-height: 1.6;
    color: #475569;
  }

  @media (max-width: 900px) {
    .stats,
    .cards,
    .faq-grid {
      grid-template-columns: 1fr;
    }

    h1 {
      max-width: 20ch;
    }
  }
</style>
