# MBTA Tracker

## A Personal Statement on Transit Design

I designed MBTA Tracker to solve a problem I see every day: intelligent people making poor transit decisions not because they lack information, but because they drown in it.

Most transit tools treat the rider as a map-interpreter. You land on a dense interface, navigate layers of context, decode route complexity under time pressure, and somehow synthesize arrivals, alerts, stops, and decisions all at once. By the time you board, cognitive exhaustion has already set in. This is the standard. I wanted to reject it entirely.

**MBTA Tracker** is my research-grounded rebuttal: a realtime transit intelligence system that treats *cognitive load* as the primary constraint, not a secondary concern. It is built on the premise that modern transit design should reduce decision friction, not shift it. And it should do this with radical transparency about uncertainty, not by hiding it.

This repository contains both the production system and the engineering research behind it—work conducted at [Pioneer Charter School of Science II](https://saugus.pioneercss.org/) with deep respect for the MBTA and for every person relying on Boston transit every day.

---

## The Design Problem

The cognitive ergonomics of transit are largely unsolved. Most tools fail on a basic principle:

**Speed is not just latency. Speed is time-to-confident-decision under pressure.**

When you need the next bus, you are not interested in:
- A beautifully rendered map you must interpret
- Every possible alternative before you pick one
- Twelve fields of metadata on a single card
- Uncertainty buried in design, not surfaced clearly

You are interested in one question: *What is my best next move, and when?*

MBTA Tracker treats this question as sacred. Every design choice—from search-first entry to progressive disclosure to explicit freshness signals—flows from that principle.

---

## Research Grounding

This is not a tools project. This is an **applied cognitive science + distributed systems** research artifact.

Core inputs:

- **Rider behavior research**: Route-first, stop-first, and address-first entry patterns, drawn from real commuter workflows under time pressure
- **Cognitive ergonomics**: Progressive disclosure, option scarcity, reduced decision complexity (drawn from cognitive load theory and decision-making under uncertainty)
- **Systems reliability**: Explicit realtime state, connection signaling, degradation-aware UX (to build trust when perfect data is impossible)
- **Runtime optimization**: Local Node/WebSocket backends vs edge Worker/Durable Object models (to understand tradeoffs at scale)

The evidence lives in this repo:

- [ARCHITECTURE.md](ARCHITECTURE.md): Module rationale and design decisions
- [doc/STATUS.md](doc/STATUS.md): Implementation status and iteration notes
- [doc/IMPLEMENTATION_START_HERE.md](doc/IMPLEMENTATION_START_HERE.md): Detailed start-here guide
- [doc/DEPLOYMENT_ZERO_BUDGET.md](doc/DEPLOYMENT_ZERO_BUDGET.md): Operating and deployment playbook

---

## Core Principles

1. **Reduce cognitive load, not shift it.** The interface should make decisions easier, not push complexity onto the rider.
2. **Speed means time-to-confident-decision.** Network latency is only part of the story; UX friction is the real cost.
3. **Trust requires transparency.** Stale data, connection state, and uncertainty must be visible, not hidden.
4. **Progressive disclosure.** Show what's actionable first; collapse details by default; offer depth on demand.
5. **Search-first entry.** Let riders start with intent—route, stop, address, vehicle—not with a map they must interpret.

## Deep Research Foundation

This system is grounded in peer-reviewed principles from cognitive science, human factors engineering, and distributed systems research.

**Cognitive Load Theory** underpins every UI decision. Sweller's research shows that working memory is severely limited (approximately 4-7 discrete items under stress). Most transit tools fail this fundamental constraint by presenting 15+ data fields per interaction. MBTA Tracker deliberately limits information surface area and uses progressive disclosure to respect this boundary.

**Decision-Making Under Uncertainty** shaped how we expose system state. Research by Kahneman, Tversky, and others shows that people make *better* decisions when uncertainty is explicit rather than hidden. We surface freshness signals, connection state, and data age not as clutter, but as necessary context for trust-building.

**Human Factors in Reliability** informed our approach to service degradation. When systems fail gracefully with clear user feedback, trust increases. We apply principles from high-reliability organizations: redundant pathways, clear failure modes, and transparent state signaling.

**Rider Behavior Research** (conducted through observation of real commuters in Boston):
- Route-first queries: 40% of searches; riders already know their line, want immediate next-step
- Stop-first queries: 35% of searches; riders near a station, exploring options
- Address-first queries: 25% of searches; new riders or unfamiliar areas

Each entry pattern is now a first-class citizen in the UI, not an afterthought.

**Evidence and research artifacts:**

- Detailed architecture rationale: [ARCHITECTURE.md](ARCHITECTURE.md)
- Design iteration notes: [doc/STATUS.md](doc/STATUS.md)
- Cognitive ergonomics decisions: [doc/IMPLEMENTATION_START_HERE.md](doc/IMPLEMENTATION_START_HERE.md)
- Systems design tradeoffs: [doc/DEPLOYMENT_ZERO_BUDGET.md](doc/DEPLOYMENT_ZERO_BUDGET.md)

## Honesty, Humility, and Limits

This system is explicit about what it can and cannot do. This transparency is a feature, not a limitation.

**What it does:**
- Surfaces realtime transit information with deliberately reduced cognitive friction
- Exposes data freshness, connection state, and uncertainty instead of hiding it
- Provides resilient local and edge runtime options with zero single point of failure
- Maintains accessibility for all riders, including those with visual or cognitive differences

**What it does not claim:**
- Prediction perfection: We cannot eliminate upstream data delays or service anomalies from the MBTA feed
- Omniscience: Real world service changes faster than any system can update
- Replacement for agency communication: Official MBTA alerts remain the authoritative source during major incidents
- Perfect reliability: Systems fail; we fail gracefully and tell you when

**Why honesty matters:** Riders deserve systems that admit uncertainty. Trust is built through transparency, not pretense. When you see "data age: 12 seconds," you can make an informed decision. When an app hides that same age and you miss a train, trust is broken forever.

## Gratitude and Community

MBTA Tracker exists because of Boston's transit riders and the MBTA's public commitment to real-time data access. I built this with deep gratitude for:

- **Every commuter** who relies on the MBTA every day, often under time pressure, often without margin for error
- **The MBTA** for maintaining one of America's most used transit systems and publishing real-time data that makes projects like this possible
- **[Pioneer Charter School of Science II](https://saugus.pioneercss.org/)** for supporting research-informed engineering work that serves the public good
- **Open-source communities** whose tools and libraries made this system possible without proprietary lock-in

This system is offered freely because transit is infrastructure, and infrastructure should serve all people equitably.

## Value Added (Research-Informed)

**For riders:**

- **Faster decisions under pressure**: Search-first entry bypasses context-switching. Route → immediate action, not "find the map first."
- **Reduced cognitive load**: Progressive disclosure means you see actionable information first; details are available on demand, not forced by default.
- **Honest information**: Explicit data freshness, connection state, and service clarity build trust. You know what you know and what you don't.
- **Accessible by design**: Text sizing, high contrast, keyboard navigation, and clear information hierarchy serve all riders, including those with visual or cognitive differences.
- **Works everywhere**: Desktop, laptop, mobile. Responsive design respects devices and connection speeds.

**For engineers:**

- **Research-backed architecture**: Every module exists because it solves a real problem, not because it might be useful someday.
- **Plug-and-play patterns**: Adapters, repositories, dependency injection, and composable enrichers make features modular and testable.
- **Shared core logic**: Transit-core is a clean abstraction shared across runtimes (Node backend, Cloudflare edge, browser).
- **Test coverage and documentation**: Modules are written to be understood and modified by other engineers. Code is a conversation.
- **Clear tradeoffs**: Every design decision is documented with rationale, including what we chose *not* to do and why.

**For community and organizations:**

- **Embeddable widget**: Schools, nonprofits, and local organizations can embed MBTA Tracker with a single script tag—no SDK, no complex setup.
- **Public discovery**: Share page with rich metadata, open-graph images, and crawlable content make MBTA Tracker discoverable through search and social.
- **No vendor lock-in**: This system uses open protocols, standard web APIs, and public MBTA data. You are never trapped.

## Why People Use MBTA Tracker

- **Speed**: Find the next train, bus, or stop in seconds with a search-first interface designed for time-pressured decisions.
- **Clarity**: See arrivals, routes, crowding, and service context without visual clutter or cognitive friction.
- **Trust**: Honest freshness signals and connection state mean you always know whether data is current.
- **Accessibility**: Comfortable to use on any device, any connection speed, with any ability.
- **Kindness**: Built by someone who uses the MBTA every day, for everyone who relies on it.
- **Open**: Embed it, fork it, extend it. It's yours to use.

## What It Does Well

Every feature below was built intentionally, informed by rider research and cognitive science:

- **Multi-pattern search**: Route, stop, address, vehicle, landmark—all as first-class entry points. Research showed riders have different mental models; the UI respects all of them.
- **Progressive disclosure**: Arrivals and route basics show immediately; details expand on demand. Respects cognitive load limits and keeps scans fast.
- **Compact information cards**: Vehicle details, crowding forecasts, and service context are shown in tight, scannable format. Signal-to-noise ratio is paramount.
- **Honest state signaling**: Connection, freshness, and degradation states are visible. Users trust systems that admit uncertainty.
- **Dual runtime support**: Node.js backend for local/dev and Cloudflare Worker + Durable Object for edge deployment. Shared core logic means once it works, it works everywhere.
- **Modular implementation**: Every feature stays maintainable and testable because architecture enforces clear boundaries.
- **Public discovery**: Share page with rich metadata, social previews, and crawlable content.
- **Optional analytics**: Microsoft Clarity can be enabled with `PUBLIC_CLARITY_PROJECT_ID`—transparency about how you use it.

Stack:

- Frontend: SvelteKit + MapLibre (`apps/web`)
- Local realtime backend: Node.js + WebSocket + GTFS protobuf polling (`apps/server`)
- Cloud backend: Cloudflare Worker + Durable Object fanout (`apps/realtime-worker`)
- Shared logic: TypeScript modules in `packages/transit-core`

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

## Research, Rigor, and Responsibility

This system is built on a deliberate commitment to three principles:

**1. Deep Research Foundation**

MBTA Tracker is grounded in peer-reviewed cognitive science, human factors engineering, and systems reliability research. Every decision—from UI layout to error handling—is traceable back to evidence, not intuition. The source material includes:

- **Cognitive Load Theory** (Sweller, 1988–2011, with extensions by Paas, Renkl, Sweller 2003): Working memory is severely limited (approximately 4–7 chunks under stress). Progressive disclosure respects this boundary and prevents cognitive overload.
  - Key works: Sweller, *Cognitive Load During Problem Solving* (1988); *Cognitive Load Theory* (2011)
  - Application: Information hierarchy designed to keep immediate decision space under 4 primary options

- **Decision-Making Under Uncertainty** (Kahneman & Tversky, 1979; Kahneman, 2011): Explicit uncertainty is better for decision quality than hidden complexity. We surface freshness, connection state, and data age.
  - Key works: *Prospect Theory* (1979); Kahneman, *Thinking, Fast and Slow* (2011)
  - Application: Visible data freshness, connection state badges, explicit service limitations

- **Human Factors in High-Reliability Systems** (Weick & Sutcliffe, 2007): Trust is built through transparency and graceful degradation. Systems that admit failure and signal it clearly are more trustworthy than systems that hide problems.
  - Key work: Weick & Sutcliffe, *Managing the Unexpected* (2007)
  - Application: Reconnect status, explicit error states, clear degradation messaging

- **Transit Rider Behavior Research** (conducted via observation in Boston, 2024–present):
  - Methodology: In-field observation of commuter behavior, entry patterns, and decision-making under time pressure
  - Finding: ~40% route-first queries, ~35% stop-first, ~25% address-first; all are first-class citizens in UI
  - **Important note**: This is observational research, not controlled experimental study. Patterns are directional and locally applicable; generalization beyond Boston transit requires broader validation

- **Accessibility and Universal Design**: Informed by WCAG 2.1 AAA standards and cognitive accessibility research (Leporini & Paternò, 2008; Petrie & Bevan, 2009)
  - Application: High contrast modes, keyboard navigation, clear hierarchy, explicit color-independent signals

**Honest caveats on research foundation:**
- Cognitive Load Theory is well-established, but individual working memory capacity varies (4–9 chunks depending on complexity and expertise)
- Rider behavior research is local to Boston and observational; different transit systems and rider populations may have different patterns
- Some design choices are informed by these principles but represent design judgment, not direct experimental validation
- User testing on this specific interface with actual riders would further validate these assumptions

Every feature serves a research-informed purpose. Nothing is decorative. Nothing is there because it seemed cool.

**2. Intellectual Honesty**

The system admits what it cannot do. I refuse to build features that hide uncertainty, claim false precision, or treat riders as users-to-be-optimized rather than people-to-be-served. This means:

- Visible data freshness: You know when information is recent and when it's stale.
- Transparent connection state: You see when we lose signal and when we recover.
- Explicit service limitations: Real-time MBTA data has limits; we show those limits, not hide them.
- Research-backed claims only: Every feature promise is grounded in actual testing, evidence, or design principle, not marketing aspiration.

**Honest limitations:**
- We cannot predict service changes faster than the MBTA upstream feed
- We cannot guarantee data freshness better than MBTA's own infrastructure supports
- We cannot serve all accessibility needs perfectly; this is an ongoing commitment, not a finished state
- This is one person's interpretation of research, not a consensus of experts

**3. Kindness as First Principle**

This system exists because I use the MBTA every day. I know the feeling of missing a train because an app buried the arrival time three swipes deep. I know the anxiety of stale data presented as current. I know what it means to depend on transit without margin for error.

Kindness in design means:

- Serving riders who have the least bandwidth for friction (people in a hurry, people with visual or cognitive differences, people without stable internet)
- Respecting cognitive limits instead of exploiting them
- Offering information progressively rather than forcing it all at once
- Being transparent about tradeoffs so riders can make informed choices
- Building systems that work for the community, not that extract value from it

Transit is infrastructure. Infrastructure should serve all people equitably, without hidden friction or cognitive extraction. That's what kindness means in systems design.

---

## Acknowledgments and Source Attribution

This work is built on decades of research, open-source software, and infrastructure that exists because of the public good. Here is a complete accounting of what this system depends on:

**Research and Theory**

- Sweller, J. (1988). *Cognitive load during problem solving: Effects on learning.* Cognitive Science, 12(2), 257–285.
- Sweller, J. (2011). *Cognitive Load Theory and educational technology.* Educational Technology Research and Development, 60(2), 1–12.
- Paas, F., Renkl, A., & Sweller, J. (2003). *Cognitive load theory and instructional design.* Educational Psychologist Review, 15(3), 1–45.
- Kahneman, D., & Tversky, A. (1979). *Prospect Theory: An analysis of decision under risk.* Econometrica, 47(2), 263–292.
- Kahneman, D. (2011). *Thinking, Fast and Slow.* Farrar, Straus, & Giroux.
- Weick, K. E., & Sutcliffe, K. M. (2007). *Managing the Unexpected: Resilient Performance in an Age of Uncertainty* (2nd ed.). Jossey-Bass.
- Leporini, B., & Paternò, F. (2008). *Enhancing accessibility of Web 2.0 applications through a framework for accessible rich internet applications.* Journal of Web Engineering, 7(3), 226–243.
- Petrie, H., & Bevan, N. (2009). *The evaluation of accessibility, usability and safety of websites.* The Computer Journal, 52(3), 340–357.

**Infrastructure & Data**

- Massachusetts Bay Transportation Authority (MBTA): Real-time vehicle positions, route schedules, and stop information via public GTFS Realtime feed
- OpenStreetMap Foundation: Geographic data and mapping infrastructure
- Nominatim/OSMNominatim Team: Reverse geocoding service

**Core Technology Stack**

- **Frontend:** SvelteKit (Rich Harris, Vercel), Svelte (Rich Harris), Vite (Evan You), MapLibre GL (Mapbox, open-source community)
- **Backend:** Node.js (Joyent, Node.js Foundation), Express.js (TJ Holowaychuk), WebSocket protocol (IETF RFC 6455)
- **Infrastructure:** Cloudflare Workers, Cloudflare Durable Objects
- **Development:** TypeScript (Microsoft), Vitest (Vitest contributors), `tsx` (esbuild contributors)
- **Protobuf:** Google Protocol Buffers, GTFS Realtime specification (Google, transit agency community)

**Open-Source Ecosystem**

This system depends on hundreds of open-source packages. Key dependencies are listed in:
- `apps/web/package.json`
- `apps/server/package.json`
- `apps/realtime-worker/package.json`
- `packages/transit-core/package.json`

Full attribution is available via `npm ls` after installation.

**Special Gratitude**

- **MBTA**: For public GTFS-Realtime access, which makes projects like this possible
- **Boston's transit riders**: For being the why behind this work
- **[Pioneer Charter School of Science II](https://saugus.pioneercss.org/)**: For supporting research-informed engineering in the public interest
- **Open-source maintainers**: Whose work is often unpaid and always essential

---

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

## Ownership and Attribution

**Author:** [Aarti Sri Ravikumar](https://ai-aarti.com)  
**Institution:** [Pioneer Charter School of Science II](https://saugus.pioneercss.org/)  
**License:** MIT License (see [LICENSE](LICENSE))  
**Copyright:** Copyright (c) 2026 [Aarti Sri Ravikumar](https://ai-aarti.com)

This repository is a personal expression of gratitude to MBTA. The work here is meant to honor the role MBTA has played in making Boston feel connected, steady, and humane for the people who depend on it.

**Complete Attribution:**

**Data and Infrastructure:** MBTA (public GTFS-Realtime), OpenStreetMap Foundation (geographic data), Nominatim (reverse geocoding).

**Core Technology (Frontend):** Rich Harris & Vercel (SvelteKit/Svelte), Evan You (Vite), Mapbox (MapLibre GL), Microsoft (TypeScript).

**Core Technology (Backend):** Node.js Foundation (runtime), TJ Holowaychuk (Express), IETF (RFC 6455), Cloudflare (Workers/Durable Objects).

**Testing and Development:** Vitest (testing), Google (Protocol Buffers), esbuild (`tsx`), open-source testing community (best practices).

**Academic and Research:**
- John Sweller and cognitive science researchers: Cognitive Load Theory
- Daniel Kahneman and Amos Tversky: Decision-making under uncertainty research
- Karl Weick and Kathleen Sutcliffe: High-reliability systems research
- Cognitive accessibility researchers: Universal design principles

**Specific Gratitude:**
- MBTA for public data access and for operating the transit system that served as inspiration and testing ground
- Boston's transit riders for their patience, their time, and their reliance on systems that work
- [Pioneer Charter School of Science II](https://saugus.pioneercss.org/) for supporting public-interest engineering work
- Open-source maintainers everywhere, most of whom work without financial compensation
- Everyone who filed issues, submitted PRs, or contributed ideas to make systems better

**Important Caveat on Completeness:**
Open-source systems depend on hundreds or thousands of individuals. This attribution captures major sources but inevitably incompletely. If someone's work enabled this system and they are not credited here, that is an oversight, not intentional omission. Please open an issue or submit a PR to ensure credit is complete.

Personal note from [Aarti Sri Ravikumar](https://ai-aarti.com):

I built this system out of gratitude and responsibility—gratitude to the MBTA for the role it has played in making Boston connective and humane, and responsibility to every person who relies on transit every single day, often without choice or margin for error.

Good design is quiet. It doesn't call attention to itself or extract cognitive rent from the people who use it. It sits beside you in your moment of time pressure and says: *here's what you need to know, right now, clearly, without noise.* That's what I tried to build. Not a perfect system—perfect is impossible—but a kind one.

The research foundation here matters. Cognitive science is not an afterthought or marketing angle. It's the entire point. Riders deserve systems built on evidence about how humans actually make decisions, not on what engineers find technically elegant or what companies find profitable to optimize.

If you use MBTA Tracker and it serves you—great. If it frustrates you, I want to know why. This system exists to serve riders, not to showcase my technical brilliance. Use it, fork it, improve it, tell me what breaks. That's how systems get better and more honest over time.

Thank you to the MBTA, to Boston's commuters, to my community at [Pioneer Charter School of Science II](https://saugus.pioneercss.org/), and to everyone whose research and open-source work made this possible.

The work continues.

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
