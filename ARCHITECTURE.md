# MBTA Tracker Architecture

## Overview

This repository is a monorepo for a realtime MBTA tracker with two main user surfaces:

- A SvelteKit web app with a search-first homepage and an embeddable tracker widget.
- A Node.js API server for local development and standalone deployments.
- A Cloudflare Worker backend for edge realtime fanout.

The code is intentionally split by runtime and responsibility so the UI, server APIs, and shared transport contracts can evolve independently.

## Current Repository Layout

```text
mbta-tracker/
├── apps/
│   ├── web/                # SvelteKit app + tracker widget
│   ├── server/             # Node.js API server + realtime polling routes
│   └── realtime-worker/    # Cloudflare Worker realtime backend
├── packages/
│   └── transit-core/       # Shared poll/diff types and logic
├── doc/                    # Current source-of-truth documentation
├── README.md
└── ARCHITECTURE.md
```

## Runtime Model

### Web App

The primary experience lives in `apps/web`:

- `apps/web/src/routes/+page.svelte` is the main page.
- `apps/web/src/routes/embed/+page.svelte` renders the iframe/embed route.
- `apps/web/src/lib/tracker/` contains the reusable tracker widget and its support modules.

The web app supports:

- search-first discovery
- compact arrival and route cards
- route and vehicle details
- map and map-free modes
- an embeddable widget API

### Local API Server

`apps/server` is the local API/runtime composition root.

Important pieces:

- `apps/server/src/api-server.ts` wires the Express app together.
- `apps/server/src/routes/search-routes.ts` handles search and autocomplete.
- `apps/server/src/routes/transit-routes.ts` handles arrivals, route stops, vehicle, and crowding endpoints.
- `apps/server/src/routes/phase3-routes.ts` and `apps/server/src/routes/phase4-routes.ts` expose commute and missions features.
- `apps/server/src/routes/system-routes.ts` exposes health, rollout, and telemetry endpoints.

The server currently runs with Node.js and `tsx` via `npm run dev` in `apps/server`.

### Edge Realtime Backend

`apps/realtime-worker` is the Cloudflare Worker runtime.

Its purpose is different from the local server:

- it polls MBTA realtime data at the edge
- it fanouts updates to connected clients
- it supports the Cloudflare deployment path documented in `README.md`

### Shared Core

`packages/transit-core` holds the shared feed polling contracts and diff logic.

This package exists so the worker and server can share the same realtime model without duplicating the core vehicle diffing concepts.

## Frontend Architecture

### Public Tracker Surface

The tracker widget is exported from `apps/web/src/lib/tracker/public.ts` and re-exported from `apps/web/src/lib/tracker/index.ts`.

The main public APIs are:

- `mountTracker()`
- `mountTrackerSelector()`
- `mountTrackerAuto()`
- `bootstrapTracker()`
- `installTrackerBootstrap()`

The widget also exposes `TrackerWidget` for direct use.

### Widget Composition

The tracker widget is structured around a few layers:

```text
TrackerWidget.svelte
├── controller.ts
├── config.ts
├── normalize.ts
├── services/
│   ├── transport.ts
│   ├── repositories.ts
│   ├── mode-service.ts
│   ├── enrichers.ts
│   └── container.ts
└── presentation components
    ├── StopFinder.svelte
    ├── VehicleList.svelte
    ├── VehicleCluster.svelte
    ├── VehicleDetail.svelte
    ├── TripList.svelte
    └── AlertsPanel.svelte
```

### Controller Responsibilities

`apps/web/src/lib/tracker/controller.ts` owns the realtime state machine for the widget.

It is responsible for:

- resolving the websocket URL
- connecting to the transport
- receiving realtime payloads
- normalizing vehicles, trips, and alerts
- tracking connection state
- handling reconnect backoff
- coordinating selected vehicle state

The controller is not a full app framework. It is a small orchestration layer around the widget state.

### Widget Config

`apps/web/src/lib/tracker/config.ts` defines the widget configuration and URL parameter parsing.

The widget supports query params and data attributes for things like:

- websocket URL override
- map style
- center and zoom
- embedded mode
- list, alerts, and search visibility

## Service Architecture

The service layer lives under `apps/web/src/lib/tracker/services/`.

It is the clearest modular boundary in the repository today.

### Transport Layer

`transport.ts` defines the realtime transport abstraction.

Current implementations:

- `WebSocketTransport`
- `SSETransport`

The shared interface is `RealtimeTransport`, and the base class handles common lifecycle concerns.

### Repository Layer

`repositories.ts` centralizes data access.

Current repository types include:

- `TransitDataRepository`
- `GeoRepository`

Current implementations include:

- `MBTARepository`
- `GeoRepository`
- `MockTransitDataRepository`

This layer keeps fetch logic, caching, and fallback behavior out of the UI.

### Mode and Styling

`mode-service.ts` is responsible for mode detection and route styling.

It provides:

- `ModeService`
- `MBTAModeDetector`
- `MBTARouteStyleProvider`

This is where route labeling and visual treatment should live instead of being duplicated in components.

### Stop Enrichment

`enrichers.ts` composes stop-level enrichment steps.

Current enrichers include:

- realtime arrivals enrichment
- accessibility enrichment
- walkability enrichment
- composite enrichment assembly

### Dependency Injection

`container.ts` provides the service container.

Key types:

- `ServiceContainer`
- `DefaultServiceContainer`
- `TestServiceContainer`
- `Logger`

The container is used so the widget and tests can receive explicit dependencies instead of instantiating everything inline.

## Server Architecture

### Composition Root

`apps/server/src/api-server.ts` is the server composition root.

It creates:

- search parser and resolver services
- arrivals service
- phase 3 and phase 4 services backed by file repositories
- API metrics and telemetry buffers

Then it registers route modules:

- search routes
- transit routes
- phase 3 routes
- phase 4 routes
- system routes

### Search Flow

The search API is currently implemented in the server as a two-step process:

1. Parse the raw query with `SearchQueryParser`.
2. Resolve it with `SearchResolverService`.

This supports route, stop, address, vehicle, and landmark searches.

### Transit Flow

Transit-related endpoints return arrivals, route stops, vehicle details, and crowding forecasts.

Those endpoints are routed through the services in `apps/server/src/`.

### Persistence

Phase 3 and phase 4 use file-backed repositories today.

That keeps the current implementation lightweight and local-first, while still allowing the higher-level features to persist state.

## Shared Data Flow

The dominant realtime flow is:

```text
MBTA feed / geocoding / user query
  -> server or worker adapter
  -> parsing / normalization / enrichment
  -> UI state update
  -> compact visual presentation
```

In practice:

- the search page queries the API server
- the tracker widget connects to realtime transport
- route and stop cards show compact summaries first
- deeper details are revealed through user action

## Current UX Principles

The codebase is optimized around these behaviors:

- search first, map second
- compact by default
- honest about freshness and connection state
- clear separation between summary and detail
- responsive layout across desktop and mobile

## Public Interface for Embeds

The tracker widget can be mounted in three ways:

- directly in Svelte
- by selector
- automatically on elements with `data-mbta-tracker`

This makes the widget suitable for:

- the main app
- embedded iframes
- script-tag integration

## Design Patterns In Use

### Adapter

Used for realtime transport implementations in `services/transport.ts`.

### Repository

Used for MBTA, geocoding, and local persistence access.

### Dependency Injection

Used through `ServiceContainer` and the test container.

### Composite

Used in the stop enrichment pipeline.

### Composition Root

Used in `apps/server/src/api-server.ts` to assemble the API server from discrete route and service modules.

## What This Architecture Is Not

This project is not a fully abstracted enterprise framework.

It still contains direct UI logic, route-level API wiring, and feature-specific modules where that keeps the code simpler and more understandable.

The architecture is intentionally pragmatic:

- modular where reuse and testing matter
- direct where the code is already small and clear
- honest about what is implemented today

## Notes For Contributors

- Prefer adding behavior to the existing service and route modules before creating new abstractions.
- Keep widget-specific logic inside `apps/web/src/lib/tracker/`.
- Keep API orchestration inside `apps/server/src/`.
- Keep shared polling contracts in `packages/transit-core/`.
- Use `doc/STATUS.md` for current implementation status and `doc/IMPLEMENTATION_START_HERE.md` for doc navigation.

## Accuracy Notes

This document reflects the current repository state as of the latest pass.

- The local API server is Node.js-based, not Bun-based.
- The current server composition root is `apps/server/src/api-server.ts`.
- The tracker widget lives under `apps/web/src/lib/tracker/`.
- The architecture includes the search-first homepage, embeddable widget, and Cloudflare Worker runtime.

