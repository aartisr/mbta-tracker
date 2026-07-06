# MBTA Tracker

MBTA Tracker is a realtime MBTA transit intelligence system with a configurable embeddable widget.

This repository is both:

- A production-minded transit product for fast decisions under real-world pressure.
- A public, research-informed engineering artifact by Aarti Sri Ravikumar, Pioneer Charter School of Science II, built with gratitude for MBTA and for the people who rely on it every day.

## The Story (And Why It Matters)

Most transit tools are technically rich but cognitively expensive. They often ask riders to parse dense maps, decode route complexity, and mentally merge alerts, arrivals, and stop context while they are already under time pressure.

MBTA Tracker starts from a different premise:

- The product should reduce cognitive load, not shift it to the rider.
- Speed is not only network latency; speed is time-to-confident-decision.
- Trust is a feature: stale data, uncertainty, and connectivity state must be explicit.

This is why the interface is search-first, compact, and progressive, with map context available on demand rather than forced by default.

## Research Grounding

This project is intentionally rooted in practical product research and transparent engineering constraints.

Research inputs used in design and implementation:

- Real rider workflows: route-first, stop-first, and address-first entry patterns.
- Cognitive ergonomics principles: progressive disclosure, reduced option overload, and clear next actions.
- Reliability behavior: explicit realtime state, reconnect signaling, and degradation-aware UX.
- Runtime comparatives: local Node/WebSocket backend vs edge Worker/Durable Object fanout model.

Evidence and artifacts in this repo:

- Modular architecture rationale: [ARCHITECTURE.md](ARCHITECTURE.md)
- Implementation status and iteration notes: [doc/STATUS.md](doc/STATUS.md)
- Start-here implementation playbook: [doc/IMPLEMENTATION_START_HERE.md](doc/IMPLEMENTATION_START_HERE.md)
- Deployment and operating docs: [doc/DEPLOYMENT_ZERO_BUDGET.md](doc/DEPLOYMENT_ZERO_BUDGET.md)

## Honesty And Limits

This repository is explicit about what it can and cannot guarantee.

What it does:

- Surfaces realtime transit information quickly with compact, actionable UI.
- Exposes data freshness and connection context instead of hiding uncertainty.
- Provides local and edge runtime options with shared core logic.

What it does not claim:

- It is not a perfect prediction engine for all service conditions.
- It cannot eliminate upstream feed delays or service anomalies.
- It is not a replacement for official agency incident communication.

Honesty principle: ambiguity is surfaced, not suppressed.

## Value Added (Concrete)

Rider value:

- Faster path from query to boarding decision.
- Less visual clutter, stronger signal hierarchy.
- Better accessibility and readability controls.

Engineering value:

- Plug-and-play architecture through adapters, repositories, and DI container patterns.
- Shared transit-core logic across runtimes.
- Test-covered, refactor-friendly modules.

Ecosystem value:

- Embeddable widget for schools, community pages, and local organizations.
- Crawlable share/metadata surfaces for discovery.

## Why people use it

- Find the next train, bus, or stop fast with a search-first interface.
- See compact real-time arrivals, routes, crowding, and service context without digging through clutter.
- Use it comfortably on desktop, laptop, and mobile.
- Embed the tracker in another site with a single widget script.
- See honest connection and freshness states so the app stays trustworthy.

## What it does well

- Search by route, stop, address, vehicle, or landmark.
- Show arrivals, route sequences, vehicle details, and crowding forecasts in compact cards.
- Keep details collapsed by default so the page stays quick to scan.
- Support both a local Node.js backend and a Cloudflare Worker deployment.
- Keep the implementation modular so features stay maintainable and testable.
- Provide a public share page and crawlable metadata for discovery and social previews.
- Optional Microsoft Clarity analytics can be enabled with `PUBLIC_CLARITY_PROJECT_ID`.

Stack:

- Frontend: SvelteKit + MapLibre (`apps/web`)
- Local realtime backend: Node.js + WebSocket + GTFS protobuf polling (`apps/server`)
- Cloud backend: Cloudflare Worker + Durable Object fanout (`apps/realtime-worker`)

Runtime options:

- Node.js WebSocket server (`apps/server`) for local/dev use.
- Cloudflare Worker + Durable Object (`apps/realtime-worker`) for edge deployment.

## Architecture Overview

The tracker is now organized around explicit layers and pluggable interfaces:

- `apps/web/src/lib/tracker/services`: transport, repositories, mode detection, stop enrichment, and the dependency-injection container.
- `apps/web/src/lib/tracker`: UI orchestration and extracted presentation components.
- `packages/transit-core`: shared backend polling contracts and diff logic.
- `apps/server` and `apps/realtime-worker`: separate runtime adapters implementing the same backend polling model.

Core patterns in use:

- Adapter pattern for realtime transport implementations.
- Repository pattern for MBTA and geocoding data access.
- Factory/rule-based mode detection and route styling.
- Dependency injection through a central `ServiceContainer`.
- Composable stop enrichment via pluggable enrichers.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the detailed module breakdown and design rationale.

Current implementation notes and the compact project status live in [doc/STATUS.md](doc/STATUS.md), with the start-here guide in [doc/IMPLEMENTATION_START_HERE.md](doc/IMPLEMENTATION_START_HERE.md).

## Repo Layout

- `apps/web`: SvelteKit UI with `TrackerWidget` component and Cloudflare adapter.
- `apps/server`: Node-based polling + WebSocket server on port `8080`.
- `apps/realtime-worker`: Cloudflare Worker realtime backend (`/ws`) with Durable Object fanout.

## Prerequisites

- Node.js 18+ (for npm tooling).
- npm (used for installs in this repo and Wrangler tooling).
- Cloudflare account + Wrangler auth for deployment.

## Install

From repo root:

```bash
npm install
cd apps/web && npm install
cd ../realtime-worker && npm install
cd ../server && npm install
```

## Root Scripts

From repo root (`/Users/rraviku2/aarti/mbta-tracker`):

- `npm run dev`: start Node server + web together.
- `npm run dev:server`: start Node server only.
- `npm run dev:web`: start web only.
- `npm run dev:cf`: start Cloudflare worker + web together (web auto-uses `ws://127.0.0.1:8787/ws`).
- `npm run test`: run the web Vitest suite.
- `npm run test:web`: alias for the web Vitest suite.
- `npm run dev:health`: check whether ports `8080` and `5173` are listening.
- `npm run dev:stop`: stop listeners on ports `8080` and `5173`.
- `npm run deploy:cf:worker`: deploy Cloudflare realtime worker.
- `npm run release:widget`: build + fingerprint widget release artifacts into `release/widget`.
- `npm run deploy:widget`: upload widget artifacts to S3/R2-compatible storage and print final public URLs.
- `npm run embed:widget`: print ready-to-paste embed script tags (latest and pinned) from the release manifest.
- `npm run seo:ctr:report`: generate a CTR opportunity report from Search Console CSV export.
- `npm run seo:ctr:report:help`: show CLI help and supported columns/flags.

## SEO Growth System

This repo includes a full SEO operating system for content expansion and weekly optimization.

Core files:

- Strategy and rollout plan: [doc/SEO_CONTENT_ARCHITECTURE.md](doc/SEO_CONTENT_ARCHITECTURE.md)
- Keyword-to-page execution map: [doc/SEO_KEYWORD_TO_PAGE_MAP.csv](doc/SEO_KEYWORD_TO_PAGE_MAP.csv)
- Reusable page template: [doc/templates/SEO_LANDING_PAGE_TEMPLATE.md](doc/templates/SEO_LANDING_PAGE_TEMPLATE.md)

Weekly loop:

1. Export Search results CSV from Google Search Console.
2. Run:

```bash
npm run seo:ctr:report -- --input path/to/search-console.csv --window-label "Last 28 days"
```

3. Open the generated report in `doc/reports/`.
4. Prioritize high-impression low-CTR queries and update page titles, descriptions, and intro copy.
5. Publish 2+ new pages from the keyword map each week.

Initial SEO landing pages now available:

- `/mbta/routes/red-line`
- `/mbta/routes/red-line-tracker`
- `/mbta/routes/orange-line`
- `/mbta/routes/blue-line`
- `/mbta/routes/green-line`
- `/mbta/stops/north-station`
- `/mbta/stops/south-station`
- `/mbta/stops/park-street`
- `/mbta/stops/government-center`
- `/guides/how-to-check-mbta-delays`
- `/guides/mbta-commute-planner`

## Widget Configuration

The page loads a tracker widget configured from URL query parameters.

Main parameters:

- `ws`: websocket endpoint override (`ws://`, `wss://`, `http://`, `https://` are accepted).
- `embed`: `1/0` or `true/false` for embedded layout mode.
- `title`, `subtitle`: UI text.
- `style`: MapLibre style URL.
- `center`: map center as `lon,lat`.
- `zoom`: initial zoom level.
- `list`, `trips`, `alerts`, `search`: toggle widget sections.

Example:

```text
/?embed=1&title=MBTA%20Live&ws=wss://example.workers.dev/ws&center=-71.06,42.36&zoom=11
```

### WebSocket URL Resolution Rules

The widget resolves websocket URL in this order:

1. `ws` query parameter
2. `PUBLIC_WS_URL` environment variable
3. Localhost fallback: `ws://<current-host>:8080`
4. Non-localhost fallback: same-origin `/ws` (converted to `ws://` or `wss://`)

## One-Liner External Embed (Script)

For non-Svelte sites, build the browser bundle:

```bash
cd apps/web
npm run build:widget
```

This produces:

- `apps/web/dist-widget/mbta-tracker-widget.js`

For release packaging (fingerprinted + stable alias + manifest), run from repo root:

```bash
npm run release:widget
```

This produces:

- `release/widget/mbta-tracker-widget.latest.js`
- `release/widget/mbta-tracker-widget.<hash>.js`
- `release/widget/manifest.json`

To upload these artifacts to your CDN object storage (AWS S3 or Cloudflare R2-compatible), run:

```bash
WIDGET_BUCKET=<bucket-name> \
WIDGET_CDN_BASE_URL=https://cdn.example.com \
WIDGET_PREFIX=widgets/mbta \
WIDGET_ENDPOINT_URL=https://<accountid>.r2.cloudflarestorage.com \
npm run deploy:widget
```

Required env vars:

- `WIDGET_BUCKET`: target bucket name.
- `WIDGET_CDN_BASE_URL`: public CDN origin/base URL used to print final embed links.

Optional env vars:

- `WIDGET_PREFIX`: object prefix/path in bucket (default: `mbta-tracker`).
- `WIDGET_ENDPOINT_URL`: custom S3 endpoint (needed for R2).

Notes:

- The deploy helper rebuilds the release artifacts before upload.
- `deploy:widget` also prints ready-to-paste latest and pinned script tags after a successful upload.
- Cache headers are applied automatically:
  - versioned bundle: `max-age=31536000, immutable`
  - latest bundle: `max-age=300`
  - manifest: `max-age=60`

Generate ready-to-paste embed tags:

```bash
WIDGET_CDN_BASE_URL=https://cdn.example.com \
WIDGET_PREFIX=widgets/mbta \
WIDGET_WS_URL=wss://your-worker.example.com/ws \
WIDGET_TITLE="MBTA Live" \
npm run embed:widget
```

Required env vars for `embed:widget`:

- `WIDGET_CDN_BASE_URL`

Optional env vars for `embed:widget`:

- `WIDGET_PREFIX` (default: `mbta-tracker`)
- `WIDGET_WS_URL` (adds `data-ws-url` to output snippet)
- `WIDGET_TITLE` (default: `MBTA Live`)

Host that file on your CDN/static host, then embed with one line:

```html
<script src="https://your-cdn.example.com/mbta-tracker-widget.js" data-ws-url="wss://your-worker.example.com/ws" data-title="MBTA Live"></script>
```

Behavior:

- If the page already contains nodes with `data-mbta-tracker`, the script auto-mounts into those nodes.
- If no host node exists, it auto-creates one responsive host container and mounts the tracker.
- The script also exposes `window.MBTATracker` for manual control.

Optional script `data-*` attributes:

- `data-title`, `data-subtitle`
- `data-ws-url` (or `data-ws`)
- `data-map-style`
- `data-center="lon,lat"`
- `data-zoom`
- `data-list`, `data-alerts`, `data-search`, `data-embed`

## Local Development Options

### Option A: Node server + web (non-Cloudflare)

Terminal 1:

```bash
cd apps/server
npm run dev
```

Terminal 2:

```bash
cd apps/web
npm run dev
```

Or from root:

```bash
npm run dev
```

When running web locally with the Node backend, no extra env var is required; it auto-targets `ws://localhost:8080`.

### Option B: Cloudflare-style local runtime

From root:

```bash
npm run dev:cf
```

This starts:

- Worker on `http://127.0.0.1:8787`
- Web app on Vite dev port (typically `5173`, or next available)

The web client is wired to `ws://127.0.0.1:8787/ws` automatically in this mode.

## Cloudflare Deployment

### 1. Deploy realtime worker

```bash
cd apps/realtime-worker
npm run deploy
```

Expected endpoint pattern:

- `https://<worker-name>.<subdomain>.workers.dev/ws`

### 2. Deploy web app to Cloudflare Pages

Create a Pages project pointing at this repo with:

- Root directory: `apps/web`
- Build command: `npm run build`
- Output directory: `.svelte-kit/cloudflare`
- Environment variable:
  - `PUBLIC_WS_URL=wss://<worker-name>.<subdomain>.workers.dev/ws`

## Notes

- The Cloudflare realtime worker polls MBTA vehicle data and broadcasts only changed vehicle coordinates.
- The web widget includes reconnect + exponential backoff + retry countdown status.
- If port `5173` is already occupied, Vite automatically uses the next available port.

## Troubleshooting

### Port already in use

Symptoms:

- Vite logs `Port 5173 is in use, trying another one...`
- Server fails to bind `8080`

Fix:

```bash
cd /Users/rraviku2/aarti/mbta-tracker
npm run dev:health
npm run dev:stop
```

Then restart with `npm run dev` or `npm run dev:cf`.

### Package install fails with internal registry errors (404/connection)

Symptoms include failures resolving packages from Artifactory.

Checks:

```bash
npm config get registry
```

This repo expects internal registry config in:

- `/Users/rraviku2/aarti/mbta-tracker/.npmrc`
- `/Users/rraviku2/aarti/mbta-tracker/apps/server/.npmrc`

Use `npm install` to bootstrap dependencies and continue running scripts normally.

### Wrangler auth/deploy issues

If `wrangler deploy` fails due to auth:

```bash
cd /Users/rraviku2/aarti/mbta-tracker/apps/realtime-worker
npx wrangler login
npm run deploy
```

If local worker fails due to compatibility date support, update `compatibility_date` in `apps/realtime-worker/wrangler.toml` to a supported date for your installed Wrangler runtime.

### WebSocket not connecting after deploy

Checklist:

1. Worker is reachable at `https://<worker>.<subdomain>.workers.dev/health`.

2. Pages environment variable is set:

- `PUBLIC_WS_URL=wss://<worker>.<subdomain>.workers.dev/ws`

1. Browser console shows `wss://` endpoint (not `ws://localhost:8080` in production).

### Stuck on "Realtime connecting" locally

Most common causes:

1. Port `8080` is occupied by another process.
2. Node server is not running.

Quick fix:

```bash
cd /Users/rraviku2/aarti/mbta-tracker
lsof -nP -iTCP:8080 -sTCP:LISTEN
kill -9 <pid>
npm run dev
```

For Cloudflare local mode, use `npm run dev:cf` and ensure worker is up on `127.0.0.1:8787`.

### No vehicle updates on map

1. Verify websocket status badge is `open`.
2. Hit worker health endpoint:

```bash
curl https://<worker>.<subdomain>.workers.dev/health
```

1. Confirm MBTA upstream feed is reachable from worker runtime.

## Ownership And Credits

- Author and research lead: Aarti Sri Ravikumar
- School: Pioneer Charter School of Science II
- Copyright: Copyright (c) 2026 Aarti Sri Ravikumar

This repository is a personal expression of gratitude to MBTA.
The work here is meant to honor the role MBTA has played in making Boston feel connected,
steady, and humane for the people who depend on it.

Credits and acknowledgments:

- MBTA for transit data, public service feeds, and the lived transit experience that inspired this work.
- OpenStreetMap and Nominatim for geocoding support.
- SvelteKit, Svelte, Vite, TypeScript, and MapLibre for the frontend stack.
- Node.js, Express, WebSocket, and `tsx` for the local server runtime.
- Cloudflare for edge hosting and Durable Object support.
- The open-source maintainers, reviewers, and contributors who make the underlying ecosystem work.

If a contributor or source is missing here, please add them in a follow-up change so the credit list stays complete.

Personal note from Aarti Sri Ravikumar:

> I grew up loving trains beside my parents, my hands against the window, believing every journey meant something-and in Boston, the MBTA quietly gave that feeling back to me when I needed it most. It became my lifeline, holding me through uncertain days and reminding me, without words, that I belong. This repo is my thank-you: a small way to give back to the system that carried me, and a hope that everyone, everywhere, gets to feel that same gentle certainty of being carried, connected, and at home.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Contributing

When adding or changing tracker behavior:

- Prefer extending existing service interfaces over adding new ad hoc helpers.
- Retrieve dependencies from the service container instead of instantiating them inside components.
- Keep presentation logic in small Svelte components and move reusable logic into `tracker/services` or focused utility modules.
- Add or update Vitest coverage for new service behavior and extracted components.
- Run `npm --workspace apps/web test` and `npm --workspace apps/web run check` before finalizing changes.

For larger architectural work, review [ARCHITECTURE.md](ARCHITECTURE.md) first so new code follows the established patterns.
