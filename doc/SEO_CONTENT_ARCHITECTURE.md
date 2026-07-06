# SEO Content Architecture and Growth Operating System

This document turns MBTA Tracker SEO into a repeatable execution system.

## Goal

Build sustained organic growth by shipping high-intent pages, improving click-through rate (CTR), and compounding authority through links and distribution.

## Pillars

1. Programmatic coverage for rider intent.
2. High-quality evergreen and event-driven content.
3. Strong internal linking from high-authority pages.
4. Weekly Search Console optimization loops.
5. External distribution and backlink acquisition.

## Information Architecture

Use a hub-and-spoke structure anchored on the home page and route-focused landing pages.

- Hub pages:
  - `/`
  - `/share`
  - Future rider guide index page.
- Spokes:
  - Route pages: one page per major MBTA route cluster.
  - Stop pages: one page per high-volume stop.
  - Guide pages: practical rider tasks and comparisons.

## Page Types and Templates

1. Route intent pages
- Purpose: capture route-specific and commute-specific search intent.
- URL pattern: `/mbta/routes/{route-slug}`
- Template: `doc/templates/SEO_LANDING_PAGE_TEMPLATE.md`

2. Stop intent pages
- Purpose: capture stop-first intent and nearby boarding decisions.
- URL pattern: `/mbta/stops/{stop-slug}`
- Template: `doc/templates/SEO_LANDING_PAGE_TEMPLATE.md`

3. Rider guide pages
- Purpose: capture informational and comparison intent.
- URL pattern: `/guides/{topic-slug}`
- Template: `doc/templates/SEO_LANDING_PAGE_TEMPLATE.md`

## Editorial and Freshness Cadence

Weekly:
- Publish at least 2 new intent pages from `doc/SEO_KEYWORD_TO_PAGE_MAP.csv`.
- Refresh at least 5 existing pages with improved title, meta description, and intro paragraph.
- Run `npm run seo:ctr:report` against latest Search Console export.

Monthly:
- Consolidate thin pages.
- Merge overlapping intent pages.
- Update internal links from top-traffic pages to new pages.

## Internal Linking Rules

1. Every new page links to:
- Home page (`/`)
- One related route or stop page
- One guide page

2. Every guide page links to:
- At least 3 route or stop pages
- Related API or share surface when relevant

3. Anchor text policy:
- Use natural language variants.
- Avoid exact-match repetition on every link.

## Title and Meta Standards

Title formula:
- Primary intent + MBTA + value proposition

Examples:
- `Red Line Arrivals and Best Boarding Stops | MBTA Tracker`
- `North Station Realtime Trains and Platform Timing | MBTA Tracker`

Meta description formula:
- Explicit rider outcome + realtime signal + trust qualifier.

Example:
- `See realtime MBTA arrivals, route context, and stop-level boarding guidance for North Station. Built for fast commuter decisions with transparent freshness signals.`

## Rich Results and SERP Packaging

For each page:
- One clear H1.
- One concise answer block near the top.
- Structured FAQ section when legitimate.
- JSON-LD aligned with visible content.

## Measurement Plan

Primary KPIs:
- Non-brand impressions.
- Non-brand clicks.
- Non-brand CTR.
- Ranking distribution for positions 1-3, 4-10, and 11-20.

Secondary KPIs:
- Indexed page count.
- New referring domains.
- Share-page referral traffic.

## Search Console Operating Loop

1. Export Search results with query and page dimensions (last 28 days).
2. Run:

```bash
npm run seo:ctr:report -- --input path/to/search-console.csv
```

3. Prioritize:
- High impressions + low CTR pages first.
- Position 4-20 queries second.
- Position <= 5 with weak CTR for title/meta test third.

4. Apply updates to page title, meta description, intro, and internal links.
5. Re-check impact after 7 to 14 days.

## Authority and Distribution Plan

1. Publish a shareable monthly MBTA rider insights post.
2. Pitch local news, schools, and transit communities with concrete rider utility.
3. Offer embeddable widget integration examples for local organizations.
4. Link all external mentions back to specific route/stop pages, not only home.

## 90-Day Rollout

Week 1-2:
- Create first 10 route/stop pages from the keyword map.
- Establish weekly CTR report workflow.

Week 3-6:
- Expand to 25 total pages.
- Start outreach to local/community publishers.

Week 7-12:
- Expand to 50+ pages.
- Run ongoing CTR tests and prune low-value pages.
- Document wins in `doc/STATUS.md`.
