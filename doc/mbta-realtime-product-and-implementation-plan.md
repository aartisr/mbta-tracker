# MBTA Realtime Tracking Platform Plan

## Goal

Build a fast, mobile-first, highly usable MBTA tracking experience that can show buses, subway, commuter rail, ferry, and alerts in real time, while staying responsive on low-end phones and large desktop displays.

This plan assumes the product will ingest MBTA real-time protobuf feeds, merge them with GTFS static schedule data, and render a live operational view plus rider-friendly trip guidance.

## Research Summary

### 1) MBTA exposes a real-time developer portal

The MBTA V3 API portal describes itself as the MBTA's "premier schedule, real-time, and alert information interface" and notes that developers can request API keys, while also being able to experiment without one first.

Source:
- [MBTA V3 API Portal](https://api-v3.mbta.com/)

### 2) GTFS Realtime is the standard protobuf format we should anchor on

The official GTFS Realtime overview says the spec is based on Protocol Buffers and is the source of truth for realtime feed behavior. It defines three core feed types:

- Trip updates
- Service alerts
- Vehicle positions

The current protobuf file also includes experimental support for:

- Shapes
- Stops
- Trip modifications

Sources:
- [GTFS Realtime Overview](https://gtfs.org/documentation/overview/)
- [gtfs-realtime.proto](https://raw.githubusercontent.com/google/transit/master/gtfs-realtime/proto/gtfs-realtime.proto)

### 3) The protobuf schema contains the fields we need for a serious live tracker

The GTFS Realtime proto gives us enough structure to build an excellent MBTA tracker if we normalize correctly:

- `FeedMessage` contains a `FeedHeader` and repeated entities.
- `FeedEntity` can contain exactly one of `TripUpdate`, `VehiclePosition`, or `Alert` in the stable core.
- `VehiclePosition` includes trip identity, vehicle identity, coordinates, stop sequence, current stop, timestamp, congestion, and occupancy-related fields.
- `TripUpdate` gives predicted arrival/departure events, delays, uncertainty, stop-level updates, and schedule relationships.
- `Alert` gives cause, effect, scope, active periods, text, URLs, severity, and the affected entities.

Important implication: the raw feed is not enough by itself. We need a static GTFS layer to resolve route names, stop names, trip shapes, directions, and human-readable labels.

Sources:
- [gtfs-realtime.proto](https://raw.githubusercontent.com/google/transit/master/gtfs-realtime/proto/gtfs-realtime.proto)

### 4) Good transit products are immediate, map-first, and low-friction

Transit's homepage emphasizes:

- Nearby transit immediately on app open
- Real-time data
- Trip planning
- Crowdsourcing to fill data gaps
- Rider feedback tools

Citymapper's homepage emphasizes:

- "Making Cities Usable"
- Mobile-first transit usability
- High-quality route planning
- Recent features like better route choice and lock-screen navigation in its news section

These products suggest a winning MBTA experience should be:

- Map-first, but not map-only
- Immediate, not search-heavy
- Mode-aware, not bus-only
- Useful without sign-in
- Personalized after a single tap

Sources:
- [Transit homepage](https://transitapp.com/)
- [Citymapper homepage](https://citymapper.com/)

## Data Model Strategy

### Core entity types

We should normalize the feed into a shared live model rather than treating each protobuf update as a one-off payload.

Recommended canonical entities:

- `Vehicle`
- `Trip`
- `Route`
- `Stop`
- `Alert`
- `ServiceArea`
- `Connection`

### Vehicle model

Fields to retain from real-time data:

- `id`
- `route_id`
- `trip_id`
- `direction_id`
- `label`
- `lat`
- `lon`
- `bearing`
- `speed`
- `congestion_level`
- `occupancy_status`
- `current_stop_sequence`
- `stop_id`
- `timestamp`
- `source_feed_timestamp`

### Trip model

Fields to retain:

- `trip_id`
- `route_id`
- `service_id`
- `direction_id`
- `start_time`
- `start_date`
- `shape_id`
- `headsign`
- `schedule_relationship`
- `predictions[]`

### Alert model

Fields to retain:

- `alert_id`
- `cause`
- `effect`
- `severity`
- `active_periods[]`
- `informed_entities[]`
- `header_text`
- `description_text`
- `url`

### Static schedule join layer

To make the UI useful, we should join realtime entities with static MBTA GTFS data for:

- route names
- route colors
- stop names
- station groups
- transfer points
- trip shapes
- branch labels
- accessibility metadata

## MBTA Product Scope

The app should support all MBTA rider-relevant modes, with one shared interaction model:

- Bus
- Subway
- Commuter Rail
- Ferry
- Accessible station and stop planning

The interface should not force users to learn different screens for every mode. Instead, use consistent patterns with mode-specific badges, filters, and summary chips.

## UX Principles

### 1) First screen should answer "what is happening near me?"

Default landing state:

- nearby vehicles
- nearby stops/stations
- live disruptions
- service status by mode
- next arrival windows

### 2) Details should be one tap away

Every map marker, stop, and route should open a sheet or side panel with:

- upcoming arrivals
- live vehicle positions
- headway or delay
- service alerts
- accessibility information
- share action

### 3) Mobile and desktop should be designed as siblings, not one as a fallback

Mobile:

- bottom sheet primary interaction
- thumb-reachable filters
- sticky search
- single-column map/details split

Desktop:

- full-height map
- persistent left rail for filters and summaries
- right-side details panel
- keyboard shortcuts for power users

### 4) Accessibility is not optional

We should build for:

- keyboard navigation
- screen readers
- color-blind-safe route colors
- reduced motion
- high contrast mode
- readable type scale
- large tap targets

## UI System Proposal

### Main layout

Use a three-layer system:

1. Global top bar
2. Live map canvas
3. Context panel or bottom sheet

### Primary navigation

Suggested tabs:

- Live
- Routes
- Stops
- Alerts
- Favorites
- Search

### Responsive behavior

Design the layout as a set of clear breakpoints rather than a pile of CSS exceptions.

Recommended behavior:

- Under 640px: single-column layout, bottom sheet details, sticky search, compact filters
- 640px to 1024px: split map/detail experience, collapsible rails, larger tap targets
- Over 1024px: persistent left navigation, full-height map, right detail pane, optional comparison panels

The map should always remain usable, but the surrounding UI should get progressively richer as the screen size grows.

### Performance budget

Set explicit budgets early so the app stays fast as features grow:

- shell JavaScript should stay lean
- the map engine should be lazy-loaded
- large lists should be virtualized
- marker rendering should be clustered and viewport-aware
- realtime updates should be diffed instead of fully re-rendered
- non-essential animation should be reduced or removed on low-power devices

### Live screen

The Live screen should show:

- clustered vehicle map
- quick filters for mode and line
- a "service pulse" strip with mode summaries
- a live list of nearby arrivals under the map

### Route screen

The Route screen should show:

- route overview
- live vehicles on the route
- next arrivals by direction
- route-level alerts
- service frequency and headway trend

### Stop or station screen

The Stop screen should show:

- next arrivals
- platform or stop location
- accessible entrance info
- nearby transfers
- relevant alerts
- route badges

### Trip detail screen

The Trip screen should show:

- live vehicle dot
- stop-by-stop progress
- ETA timeline
- delay trend
- crowding indicator if available
- shareable trip card

### Alert center

The Alert center should show:

- system-wide alerts first
- mode-specific alerts second
- route/station alert chips
- clear severity labels
- brief and expanded text

## Visual Design Direction

The UI should feel like a high-clarity transit control surface, not a generic map app.

Recommended direction:

- dark navy base
- crisp white surfaces for information cards
- high-contrast route chips
- amber and red used sparingly for disruptions
- a deep accent color for live/active states
- soft motion only where it adds meaning

Useful style ideas:

- dense data without looking cluttered
- strong hierarchy in typography
- rounded but not childish components
- visible state changes for live updates
- route colors used as navigational signals, not decoration

## Performance Architecture

### Ingestion

Use a server-side or edge-side ingest pipeline that:

- fetches protobuf feeds on a fixed cadence
- decodes protobuf into typed internal objects
- diffs updates against previous state
- emits only changed entities to clients

### Transport to clients

Use WebSockets for live sessions when connected, with:

- exponential reconnect backoff
- jitter
- heartbeat or connection freshness checks
- compact payloads

If a WebSocket connection is unavailable, fall back to:

- polling for summary state
- stale-while-revalidate caching
- incremental route/status requests

### Client rendering

To stay fast on mobile:

- lazy-load the map engine
- virtualize long lists
- cluster markers aggressively
- render only viewport-relevant overlays
- avoid forcing full re-renders on every realtime tick
- batch state updates into animation frames

### Data freshness strategy

The app should surface three timestamps:

- feed timestamp
- last client update time
- per-vehicle measurement time

That gives users and support teams a clear sense of whether data is live, stale, or degraded.

## "Viral" Growth Loops

If we want this to spread, we should design shareable, low-friction artifacts:

- shareable live route cards
- shareable stop/station pages
- system status snapshots
- "my commute right now" cards
- link previews with live line color and ETA
- embeddable station widget
- optional lightweight public pages for popular routes

What makes transit tools shareable:

- immediate utility
- a clear moment of surprise
- a better answer than "check the app"
- a page people want to send to friends when service is disrupted

## Implementation Stages

### Stage 0: Information architecture and feed audit

Deliverables:

- finalized entity map
- supported MBTA mode list
- feed inventory
- UI wireframes
- accessibility checklist

Acceptance criteria:

- every screen has a clear purpose
- every entity has a home in the data model
- mobile and desktop layouts are both defined

### Stage 1: Realtime ingestion foundation

Deliverables:

- protobuf fetcher
- protobuf decoder
- diff engine
- typed normalized store
- reconnecting client transport

Acceptance criteria:

- live vehicle updates arrive reliably
- stale data is detectable
- reconnect behavior is resilient

### Stage 2: Core live map

Deliverables:

- responsive live map
- marker clustering
- mode filters
- route filters
- selected entity panel

Acceptance criteria:

- map remains usable on mobile
- marker density remains readable
- selection is instant and clear

### Stage 3: Trip and stop detail views

Deliverables:

- stop pages
- route pages
- trip timeline
- ETA list
- alert section

Acceptance criteria:

- a rider can answer "when is my next vehicle?" in one or two taps
- alerts are obvious and specific

### Stage 4: Power-user features

Deliverables:

- favorites
- saved routes
- saved stops
- recent searches
- keyboard shortcuts on desktop
- auto-follow selected vehicle or stop

Acceptance criteria:

- repeat riders get faster over time
- the app feels personalized without becoming noisy

### Stage 5: Performance and polish

Deliverables:

- bundle split tuning
- map performance tuning
- list virtualization
- motion reduction mode
- accessibility pass
- offline-safe fallback messaging

Acceptance criteria:

- fast first paint
- no major jank during live updates
- excellent behavior on phones and tablets

### Stage 6: Launch and growth

Deliverables:

- share cards
- public route pages
- social preview images
- onboarding copy
- analytics for engagement and performance

Acceptance criteria:

- riders can share useful live pages
- we can measure what people actually use

## Recommended Build Order

1. Normalize MBTA realtime data into a single internal entity store.
2. Build live map + list views for vehicles, stops, and alerts.
3. Add route and trip detail pages.
4. Add favorite and share flows.
5. Optimize performance and accessibility.
6. Polish visual language and launch.

## Risks and Constraints

### Data quality differences by mode

Some MBTA modes may have richer or more reliable positioning than others. The UI should degrade gracefully when telemetry is sparse, delayed, or unavailable.

### Realtime feeds are not infinitely precise

The GTFS Realtime spec allows incomplete or stale information, and consumers should expect uncertainty in predictions and vehicle positions.

### Protobuf is not enough by itself

Without static GTFS data, the app will know positions but not enough context to be truly useful.

### Performance can collapse under marker density

The app should assume high-density urban conditions and avoid rendering every object as a full DOM node.

## Suggested Product Positioning

The strongest positioning is not "another transit map."

It should be:

- the fastest way to understand MBTA service right now
- the clearest real-time MBTA system map
- the most shareable place to check a live route, stop, or alert

## Source Links

- [MBTA V3 API Portal](https://api-v3.mbta.com/)
- [GTFS Realtime Overview](https://gtfs.org/documentation/overview/)
- [GTFS Realtime Proto](https://raw.githubusercontent.com/google/transit/master/gtfs-realtime/proto/gtfs-realtime.proto)
- [Transit homepage](https://transitapp.com/)
- [Citymapper homepage](https://citymapper.com/)

## Related Docs

- [Implementation backlog](/Users/rraviku2/aarti/mbta-tracker/doc/mbta-implementation-backlog.md)
- [Wireframes and screen spec](/Users/rraviku2/aarti/mbta-tracker/doc/mbta-wireframes-and-screen-spec.md)
