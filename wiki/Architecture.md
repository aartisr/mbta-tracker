# Architecture

MBTA Tracker is a monorepo with independent web, local-server, edge-realtime, and shared-core layers.

| Component | Responsibility |
| --- | --- |
| `apps/web` | SvelteKit application and reusable tracker widget |
| `apps/server` | Local Node API server, search, transit, and lightweight persistence routes |
| `apps/realtime-worker` | Cloudflare Worker websocket fanout for realtime updates |
| `packages/transit-core` | Shared polling contracts and vehicle-diff logic |

The product flow is: data source or user query → runtime adapter → parsing, normalization, and enrichment → compact presentation.

The tracker isolates transport, repositories, route styling, stop enrichers, and UI components so each can change without folding all behavior into the interface.

Read the [complete architecture guide](https://github.com/aartisr/mbta-tracker/blob/main/ARCHITECTURE.md) and use the [live MBTA Tracker](https://mbta.ai-aarti.com/) to see the public surface.
