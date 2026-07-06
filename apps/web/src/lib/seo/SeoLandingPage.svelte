<script lang="ts">
  import type { LandingPage } from '$lib/seo/landing-pages';

  export let data: {
    landingPage: LandingPage;
    canonicalUrl: string;
    shareImageUrl: string;
    siteOrigin: string;
  };

  $: authoredTitle = `${data.landingPage.title} | By Aarti S Ravikumar`;

  $: schema = {
    '@context': 'https://schema.org',
    '@type': data.landingPage.kind === 'guide' ? 'Article' : 'WebPage',
    headline: data.landingPage.h1,
    name: data.landingPage.title,
    description: data.landingPage.description,
    url: data.canonicalUrl,
    image: data.shareImageUrl,
    author: {
      '@type': 'Person',
      name: 'Aarti S Ravikumar',
      affiliation: {
        '@type': 'EducationalOrganization',
        name: 'Pioneer Charter School of Science II'
      },
      url: 'https://ai-aarti.com'
    },
    creator: {
      '@type': 'Person',
      name: 'Aarti S Ravikumar',
      url: 'https://ai-aarti.com'
    },
    copyrightHolder: {
      '@type': 'Person',
      name: 'Aarti S Ravikumar',
      url: 'https://ai-aarti.com'
    },
    publisher: {
      '@type': 'Organization',
      name: 'MBTA Tracker',
      url: data.siteOrigin
    },
    mainEntityOfPage: data.canonicalUrl,
    keywords: [data.landingPage.primaryKeyword, ...data.landingPage.secondaryKeywords].join(', ')
  };
</script>

<svelte:head>
  <title>{authoredTitle}</title>
  <meta name="author" content="Aarti S Ravikumar" />
  <meta name="creator" content="Aarti S Ravikumar" />
  <meta name="copyright" content="Aarti S Ravikumar" />
  <meta name="description" content={data.landingPage.description} />
  <meta name="keywords" content={[data.landingPage.primaryKeyword, ...data.landingPage.secondaryKeywords].join(', ')} />
  <meta name="robots" content="index,follow,max-image-preview:large" />
  <link rel="canonical" href={data.canonicalUrl} />
  <meta property="og:type" content={data.landingPage.kind === 'guide' ? 'article' : 'website'} />
  <meta property="og:site_name" content="MBTA Tracker" />
  <meta property="og:title" content={authoredTitle} />
  <meta property="og:description" content={data.landingPage.description} />
  <meta property="og:url" content={data.canonicalUrl} />
  <meta property="og:image" content={data.shareImageUrl} />
  <meta property="article:author" content="Aarti S Ravikumar" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={authoredTitle} />
  <meta name="twitter:description" content={data.landingPage.description} />
  <meta name="twitter:image" content={data.shareImageUrl} />
  <script type="application/ld+json">{JSON.stringify(schema)}</script>
</svelte:head>

<section class="seo-page" aria-labelledby="seo-page-title">
  <div class="panel">
    <p class="eyebrow">{data.landingPage.eyebrow}</p>
    <h1 id="seo-page-title">{data.landingPage.h1}</h1>
    <p class="author-byline">By Aarti S Ravikumar, Pioneer Charter School of Science II</p>
    <p class="intro">{data.landingPage.intro}</p>

    {#each data.landingPage.sections as section}
      <section class="content-block" aria-label={section.heading}>
        <h2>{section.heading}</h2>
        {#if section.paragraphs}
          {#each section.paragraphs as paragraph}
            <p>{paragraph}</p>
          {/each}
        {/if}
        {#if section.bullets}
          <ul>
            {#each section.bullets as bullet}
              <li>{bullet}</li>
            {/each}
          </ul>
        {/if}
      </section>
    {/each}

    <section class="content-block" aria-label="Frequently asked questions">
      <h2>Frequently asked questions</h2>
      {#each data.landingPage.faqs as faq}
        <h3>{faq.question}</h3>
        <p>{faq.answer}</p>
      {/each}
    </section>

    <section class="content-block related" aria-label="Related pages">
      <h2>Related pages</h2>
      <ul>
        {#each data.landingPage.relatedLinks as link}
          <li><a href={link.href}>{link.label}</a></li>
        {/each}
      </ul>
    </section>
  </div>
</section>

<style lang="postcss">
  .seo-page {
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

  .intro {
    margin-top: 0.8rem;
    font-size: 1.03rem;
    line-height: 1.65;
    color: #334155;
  }

  .author-byline {
    margin: 0.45rem 0 0;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: #0f766e;
    text-transform: uppercase;
  }

  .content-block {
    margin-top: 1.2rem;
  }

  h2 {
    margin: 0 0 0.45rem;
    font-size: 1.1rem;
    color: #0f172a;
  }

  h3 {
    margin: 0.85rem 0 0.25rem;
    font-size: 1rem;
    color: #0f172a;
  }

  p {
    margin: 0.35rem 0;
    line-height: 1.65;
    color: #334155;
  }

  ul {
    margin: 0.2rem 0 0;
    padding-left: 1.2rem;
    color: #334155;
  }

  li {
    margin: 0.45rem 0;
    line-height: 1.55;
  }

  .related a {
    color: #1d4ed8;
    font-weight: 700;
    text-decoration: none;
  }

  .related a:hover {
    text-decoration: underline;
  }

  @media (max-width: 640px) {
    .seo-page {
      padding: 0.8rem;
    }
  }
</style>
