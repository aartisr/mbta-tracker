# MBTA Tracker

## Transit information for the moment when time is short

I built MBTA Tracker after noticing a small but consequential failure in everyday transit: when you are already late, standing at a stop, the app meant to help can ask you to interpret a map, decode alerts, and sort through more information than you need.

The problem is not a lack of transit data. It is that data often arrives without enough care for the decision a rider has to make right now.

MBTA Tracker is my attempt to make that moment kinder. It leads with search, shows the next useful answer first, makes realtime state visible, and leaves deeper detail available when a rider wants it. It is built for Boston riders who may have little time, unreliable connectivity, or no margin for error.

This is an independent, open-source project by [Aarti Sri Ravikumar](https://ai-aarti.com), developed at [Pioneer Charter School of Science II](https://saugus.pioneercss.org/). It uses public MBTA data; official MBTA communications remain authoritative during major service events.

**Live tracker:** [https://mbta.ai-aarti.com](https://mbta.ai-aarti.com/)

## What riders can do

- Search for a route, stop, address, vehicle, or landmark.
- See compact arrival, route, stop, and vehicle views.
- Check live connection and data-freshness state instead of assuming information is current.
- Explore map and map-free views, with details revealed progressively.
- Use boarding suggestions, heuristic crowding context, service alerts, and emergency rerouting suggestions where available.
- Use the responsive web experience or embed the reusable tracker on another site.

The intended interaction is simple: ask a transit question, get the next actionable answer, then expand only if you need more context.

## Why this exists

Transit is infrastructure, and infrastructure should not demand unnecessary cognitive work from the people who rely on it. A rider should not have to become a map interpreter to answer: *What is my best next move, and when?*

That principle guides the product:

1. **Search first, map second.** Riders can begin with the way they already think: a route, stop, address, vehicle, or place.
2. **Time before dashboard detail.** Arrival or next action comes before metadata.
3. **Compact by default.** Details are available, but they should not compete with the immediate decision.
4. **Honest realtime state.** Connection changes, stale data, and partial information are meaningful context, not defects to hide.
5. **Accessibility is part of the core task.** Clear hierarchy, keyboard support, color-independent signals, responsive layout, and generous interaction targets are product requirements.

## What is implemented today

The current implementation includes:

- Universal search with cached route and stop autocomplete.
- Stop arrivals, route stops, vehicle information, and route/stop views.
- Realtime vehicle updates through a local Node WebSocket server or a Cloudflare Worker with Durable Object fanout.
- Compact desktop and mobile controls, collapsed map details, and map-free interaction paths.
- Heuristic crowding forecasts, boarding suggestions, commute insights, privacy controls, lightweight missions, feedback, and community posts.
- A share surface with sitemap, robots, FAQ schema, social preview, and route/stop/guide landing pages.
- An iframe route and browser-bundle widget for third-party embeds.

For the exact implementation snapshot and future work, see [doc/STATUS.md](doc/STATUS.md). The project deliberately documents what remains incomplete rather than presenting a roadmap as delivered work.

## Limits and trust

MBTA Tracker does not promise perfect prediction or uninterrupted realtime information.

- Upstream MBTA data can be delayed, incomplete, or inconsistent.
- Crowding forecasts are heuristic when live occupancy data is unavailable.
- Geocoding relies on Nominatim and can be rate-limited.
- Accessibility has been designed for, but has not received a formal end-to-end audit.
- Some persistence is file-backed today; production telemetry, load testing, and observability are still evolving.

When the feed is unavailable, the widget retains the last valid state and shows its connection status. The goal is not to pretend uncertainty away; it is to help riders recognize it and decide accordingly.

## Research and design grounding

This project applies established ideas from cognitive science, human factors, and accessible interaction design. These sources inform design judgment; they are not evidence that this particular interface has already produced a measured outcome.

- **Cognitive load:** limited working memory supports a smaller initial decision surface and progressive disclosure. [Sweller (1988)](https://doi.org/10.1207/s15516709cog1202_4)
- **Decisions under uncertainty:** freshness and connection signals are shown as context rather than hidden behind a polished interface. [Kahneman and Tversky (1979)](https://doi.org/10.2307/1914185)
- **Reliable systems:** clear failure modes and graceful degradation can support calibrated trust. [Weick and Sutcliffe (2007)](https://www.wiley.com/en-us/Managing+the+Unexpected%3A+Resilient+Performance+in+an+Age+of+Uncertainty%2C+2nd+Edition-p-9780787986011)
- **Accessibility:** the interface aims for clear hierarchy, keyboard navigation, and signals that do not rely only on color; a formal audit remains future work.

The project’s own product observations are intentionally treated as local design inputs, not generalizable research results. The next meaningful validation step is rider testing: can people complete common transit tasks faster, more accurately, and with more confidence than with existing alternatives?

## Architecture

```text
MBTA feed / geocoding / user query
        ↓
Node server or Cloudflare Worker
        ↓
shared parsing, normalization, and realtime diffing
        ↓
SvelteKit web app and embeddable tracker widget
```

| Area | Purpose |
| --- | --- |
| `apps/web` | SvelteKit web app, public API surface, and reusable tracker widget |
| `apps/server` | Node.js development server, search, transit, and lightweight persistence routes |
| `apps/realtime-worker` | Cloudflare Worker realtime polling and websocket fanout |
| `packages/transit-core` | Shared feed-polling contracts and vehicle-diff logic |

The widget keeps transport, repository access, route styling, stop enrichment, and presentation separate. See [ARCHITECTURE.md](ARCHITECTURE.md) for the module-level design and [doc/MOBILE_UX_UI_MASTER_PLAN.md](doc/MOBILE_UX_UI_MASTER_PLAN.md) for the mobile interaction direction.

## Run locally

### Prerequisites

- Node.js 18+ (Node 22 for the Cloudflare Pages deployment path)
- npm

Install dependencies:

```bash
npm install
cd apps/web && npm install
cd ../realtime-worker && npm install
cd ../server && npm install
```

Start the local Node server and web app together:

```bash
npm run dev
```

Or run the Cloudflare-style local path:

```bash
npm run dev:cf
```

This starts the Worker at `http://127.0.0.1:8787` and configures the web app to use `ws://127.0.0.1:8787/ws`.

Useful commands:

```bash
npm run test:all  # server, worker, and web tests
npm run check     # Svelte and shared TypeScript checks
npm run dev:health
npm run dev:stop
```

## IndexNow submission

The canonical sitemap is the source of truth for IndexNow. After deploying the site (including the root-level IndexNow key file), submit every canonical URL with:

```bash
npm run seo:indexnow
```

Preview the exact URL set without sending anything:

```bash
npm run seo:indexnow:dry-run
```

The tool verifies the live key file first, batches up to 10,000 URLs per request, and exits non-zero if IndexNow rejects a batch. A successful response confirms receipt for crawling; search-engine indexing itself is not guaranteed.

## Deploy on Cloudflare

The free-tier deployment path is:

1. Deploy the realtime worker:

   ```bash
   npm run deploy:cf:worker:dry-run
   npm run deploy:cf:worker
   ```

2. Create a Cloudflare Pages project rooted at `apps/web`, using `npm run pages:build` and `.svelte-kit/cloudflare`.
3. Set `PUBLIC_WS_URL` to the deployed worker’s `wss://…/ws` URL.
4. Add the `MBTA_API_STATE` KV binding for app state.
5. Verify the app, search, websocket status, API routes, and worker `/health` endpoint.

The complete checklist—including free-tier assumptions and troubleshooting—is in [doc/DEPLOYMENT_ZERO_BUDGET.md](doc/DEPLOYMENT_ZERO_BUDGET.md).

## Embed the tracker

For the most isolated integration, use the dedicated iframe route:

```html
<iframe
  src="https://YOUR_DOMAIN/embed?embed=1&ws=wss://YOUR_FEED_HOST/ws"
  title="MBTA Live Tracker"
  loading="lazy"
  style="width:100%;height:720px;border:0;border-radius:20px;overflow:hidden"
></iframe>
```

To create a distributable script bundle:

```bash
cd apps/web
npm run build:widget
```

For fingerprinted release artifacts and a ready-to-paste snippet:

```bash
npm run release:widget
WIDGET_CDN_BASE_URL=https://cdn.example.com npm run embed:widget
```

The widget accepts websocket, title, map, center, zoom, section-visibility, and embedded-layout settings. See [doc/mbta-widget-embed.md](doc/mbta-widget-embed.md) for all iframe, programmatic, and script-tag options.

## Documentation

- [Current implementation status](doc/STATUS.md)
- [Architecture and module rationale](ARCHITECTURE.md)
- [Mobile UX/UI master plan](doc/MOBILE_UX_UI_MASTER_PLAN.md)
- [Cloudflare deployment checklist](doc/DEPLOYMENT_ZERO_BUDGET.md)
- [Widget embed guide](doc/mbta-widget-embed.md)
- [SEO content architecture](doc/SEO_CONTENT_ARCHITECTURE.md)

## Contributing

When changing tracker behavior:

- Extend existing service interfaces before adding ad hoc helpers.
- Retrieve dependencies from the service container rather than instantiating them inside components.
- Keep presentation components focused; move reusable logic into `tracker/services` or a focused utility.
- Update tests for changed service behavior and extracted components.
- Run `npm run test:all` and `npm run check` before opening a change.

## Attribution and license

Realtime vehicle positions, schedules, and stop information are supplied through MBTA public GTFS-Realtime data. Mapping and geocoding depend on OpenStreetMap and Nominatim. The application is built with SvelteKit, TypeScript, Node.js, Cloudflare Workers, MapLibre, Protocol Buffers, and the work of their open-source communities.

- **Author:** [Aarti Sri Ravikumar](https://ai-aarti.com)
- **Institution:** [Pioneer Charter School of Science II](https://saugus.pioneercss.org/)
- **License:** [MIT](LICENSE)
- **Copyright:** © 2026 Aarti Sri Ravikumar

## A personal note

I built this system out of gratitude to the MBTA and responsibility to people who rely on transit every day, often without choice or margin for error.

Good design is quiet. In a moment of time pressure, it should sit beside a rider and say: *here is what you need to know, clearly, without noise.* MBTA Tracker is not a perfect system—perfect is impossible—but it is an attempt at a kinder one.

If it helps, use it. If it frustrates you, please say why. The work continues through the people it is meant to serve.
