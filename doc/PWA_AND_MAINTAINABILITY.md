# PWA and maintainability guide

## Installable PWA contract

The web app is installable on HTTPS and localhost with:

- `static/site.webmanifest` for name, standalone display, shortcuts, and PNG/maskable icons.
- `src/service-worker.ts` for versioned app-shell precaching and offline recovery.
- `static/offline.html` as an intentional offline destination.
- `lib/pwa/` as a browser-install integration boundary, independent from transit features.

The custom install button appears only when a browser has exposed a supported install prompt. It does not nag riders or block the core search workflow. iOS users can still use the browser’s Add to Home Screen control.

## Cache policy

| Request type | Strategy | Reason |
| --- | --- | --- |
| Built JS, CSS, icons, and static content | Precache / cache-first | Fast repeat launches and offline shell |
| HTML navigation | Network-first, cached fallback | Current content online; recently viewed pages or offline page offline |
| `/api/*` and MBTA API | Network-only | Arrival and disruption data must not be misrepresented as live |
| Third-party map tiles | Network-only | Avoid uncontrolled cache growth and attribution/licensing surprises |

## Module boundaries

- **Routes and components** render state and dispatch user intent; they do not fetch MBTA endpoints directly.
- **Tracker services** own transport, repositories, mode styling, and enrichment behind interfaces.
- **`transit-core`** owns shared polling and realtime contracts with no UI dependency.
- **Runtime composition roots** (`apps/server`, `apps/realtime-worker`, and web container) wire dependencies and environment-specific behaviour.
- **PWA integration** lives in `lib/pwa` and `service-worker.ts`, never in transit domain code.

## Contribution rules

1. Add a feature at the narrowest boundary: a presentational component, a service implementation, or a shared-domain module—not a large route file by default.
2. Depend on interfaces such as `TransitDataRepository` and `RealtimeTransport`; inject test doubles through the service container.
3. Keep all live-data cache decisions inside the service worker or repository, never inside a view.
4. Pair behaviour changes with unit tests; run the web build, web test suite, and package tests affected by a change.
5. Treat generated build output and credentials as deployment artifacts, not source code.
