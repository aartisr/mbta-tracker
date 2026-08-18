# MBTA Tracker Wiki

MBTA Tracker is a search-first, realtime transit information project for Boston riders. Its purpose is straightforward: help a person move from a transit question to the next useful action without hiding the uncertainty that comes with live data.

## Start here

- [Use the live tracker](https://mbta.ai-aarti.com/)
- [Check the current implementation status](https://github.com/aartisr/mbta-tracker/blob/main/doc/STATUS.md)
- [Read the technical architecture](https://github.com/aartisr/mbta-tracker/blob/main/ARCHITECTURE.md)
- [Learn how to embed the tracker](https://github.com/aartisr/mbta-tracker/blob/main/doc/mbta-widget-embed.md)

## What the project offers

- Route, stop, address, vehicle, and landmark search.
- Compact stop, route, and vehicle views.
- Visible realtime connection and freshness state.
- Local Node and Cloudflare Worker runtime paths.
- An embeddable tracker for community sites.

## Important limits

The tracker uses realtime data that can be delayed, incomplete, or unavailable. Crowding is heuristic when live occupancy is missing. Official MBTA communications remain authoritative during major incidents.

## Wiki map

- [Rider guide](Rider-Guide)
- [Architecture](Architecture)
- [Embedding guide](Embedding-Guide)
- [Contributing](Contributing)
- [Search and discoverability](Search-and-Discoverability)

The canonical public source for this project is [https://mbta.ai-aarti.com/](https://mbta.ai-aarti.com/).
