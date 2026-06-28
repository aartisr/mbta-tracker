# MBTA Realtime Implementation Backlog

## Purpose

This backlog converts the MBTA realtime strategy into buildable engineering work. It is ordered to maximize user value early, reduce technical risk, and keep the app fast as functionality expands.

## Priority Key

- P0: must-have for the first usable release
- P1: should-have for launch-quality experience
- P2: strong enhancement after core launch
- P3: growth or polish work

## Epic 1: Realtime Data Foundation

### 1.1 Feed inventory and contract

Priority: P0

Scope:

- identify all MBTA realtime sources we will support
- confirm vehicle, trip update, and alert feeds
- define update cadence and freshness expectations
- document field coverage and missing-data behavior

Dependencies:

- official protobuf schema
- MBTA schedule reference data

Acceptance criteria:

- data source list is documented
- each source has a known ingest path
- stale or missing fields have fallback rules

### 1.2 Protobuf decoder and normalizer

Priority: P0

Scope:

- fetch protobuf payloads
- decode feed entities
- normalize to internal types
- preserve feed timestamp and entity timestamp
- reject malformed payloads safely

Dependencies:

- feed inventory
- protobuf schema file

Acceptance criteria:

- raw protobuf can be decoded reliably
- normalized vehicle, trip, and alert records are produced
- bad payloads do not crash the service

### 1.3 Diff engine and event publisher

Priority: P0

Scope:

- compare current and previous entities
- publish only changed records
- dedupe repeated updates
- mark deleted or stale entities

Dependencies:

- normalized data model

Acceptance criteria:

- redundant updates are reduced
- client payloads stay compact
- vehicle movement is reflected quickly

### 1.4 WebSocket delivery path

Priority: P0

Scope:

- live socket connection
- reconnect with backoff
- retry countdown
- connection state signaling

Dependencies:

- diff engine

Acceptance criteria:

- clients reconnect after failure
- connection status is visible
- live updates continue without manual refresh

## Epic 2: Static GTFS Join Layer

### 2.1 GTFS import and indexing

Priority: P0

Scope:

- load route, stop, trip, and shape metadata
- index by ID
- support fast lookups during render

Dependencies:

- static GTFS source files

Acceptance criteria:

- IDs resolve to human-readable labels
- route colors and stop names are available
- index lookup is fast enough for live rendering

### 2.2 Realtime-to-static joiner

Priority: P0

Scope:

- enrich vehicles with route names and colors
- enrich stops with accessibility and transfer metadata
- enrich trips with shapes and headsigns

Dependencies:

- GTFS import
- realtime normalized model

Acceptance criteria:

- user-facing labels are complete
- route and stop views show meaningful text
- shape lines can be drawn when available

## Epic 3: Core Live Experience

### 3.1 Live map shell

Priority: P0

Scope:

- map container
- default viewport
- base layer styling
- loading skeleton

Dependencies:

- delivery path

Acceptance criteria:

- map loads fast
- map is usable on mobile and desktop
- initial state is not blank or confusing

### 3.2 Vehicle marker rendering

Priority: P0

Scope:

- render live vehicle markers
- cluster dense areas
- orient markers by bearing
- highlight selected vehicles

Dependencies:

- joiner

Acceptance criteria:

- marker count stays readable in dense corridors
- selected vehicle is obvious
- map does not jank under high update volume

### 3.3 Mode and route filters

Priority: P0

Scope:

- filter by bus, subway, commuter rail, ferry
- filter by route
- filter by service state
- persist active filters in URL or state

Dependencies:

- route metadata

Acceptance criteria:

- user can narrow the map quickly
- filters are easy to clear
- filter state is recoverable

### 3.4 Nearby feed panel

Priority: P0

Scope:

- nearby arrivals
- live disruptions
- nearby stops or stations
- service summary by mode

Dependencies:

- geolocation or selected area

Acceptance criteria:

- first screen answers "what is happening near me?"
- users can get value without searching

## Epic 4: Detail Surfaces

### 4.1 Stop detail

Priority: P0

Scope:

- next arrivals
- route badges
- alerts
- accessibility info
- map context

Dependencies:

- stop lookup
- trip updates

Acceptance criteria:

- a rider can inspect a stop in one tap
- next departures are understandable at a glance

### 4.2 Route detail

Priority: P1

Scope:

- route overview
- live vehicles
- scheduled and predicted arrivals
- route-level alerts
- direction split

Dependencies:

- route metadata

Acceptance criteria:

- a route page tells a useful operational story
- rider can compare direction or branch views

### 4.3 Trip detail

Priority: P1

Scope:

- stop-by-stop progress
- ETA timeline
- delay trend
- current vehicle position
- shareable trip link

Dependencies:

- trip updates

Acceptance criteria:

- users can understand where the vehicle is and where it is going

### 4.4 Alert center

Priority: P0

Scope:

- system-wide alerts
- route alerts
- station alerts
- severity labels
- plain-language summaries

Dependencies:

- alert feed

Acceptance criteria:

- alerts are highly visible
- important disruptions are not buried

## Epic 5: Responsive UI and Accessibility

### 5.1 Mobile layout

Priority: P0

Scope:

- bottom sheet details
- sticky search
- thumb-friendly filters
- compact top bar

Dependencies:

- live map shell

Acceptance criteria:

- the app is comfortable one-handed
- map and details both remain usable

### 5.2 Tablet and desktop layout

Priority: P0

Scope:

- persistent left rail
- split map/detail pane
- keyboard shortcuts
- resizable panels

Dependencies:

- live map shell

Acceptance criteria:

- large-screen space is used well
- users are not forced into a mobile-style layout

### 5.3 Accessibility pass

Priority: P0

Scope:

- keyboard navigation
- screen reader labels
- reduced motion mode
- high contrast support
- color-blind-safe route chips
- touch target size checks

Dependencies:

- UI shell and detail screens

Acceptance criteria:

- core flows work without a mouse
- text and controls remain legible

## Epic 6: Performance Hardening

### 6.1 Rendering budget controls

Priority: P0

Scope:

- virtualize long lists
- cluster markers
- lazy-load map libraries
- batch store updates

Dependencies:

- core live experience

Acceptance criteria:

- main thread stays responsive
- marker-heavy routes remain smooth

### 6.2 Network and payload optimization

Priority: P0

Scope:

- send only changed entities
- compress or compact payloads where practical
- avoid expensive full-state broadcasts

Dependencies:

- diff engine

Acceptance criteria:

- client payloads stay small
- repeated updates do not grow bandwidth linearly

### 6.3 Freshness and stale-state UX

Priority: P1

Scope:

- last update badges
- stale warning states
- degraded mode messaging

Dependencies:

- transport layer

Acceptance criteria:

- users can tell when data is current
- stale data is not mistaken for live certainty

## Epic 7: Shareability and Growth

### 7.1 Share cards

Priority: P2

Scope:

- route cards
- stop cards
- alert cards
- live status cards

Dependencies:

- route and stop detail views

Acceptance criteria:

- pages are easy to share in messages and social posts

### 7.2 Public landing pages

Priority: P2

Scope:

- public route pages
- public stop pages
- public alert pages

Dependencies:

- detail views

Acceptance criteria:

- shared links open to meaningful, useful views

### 7.3 Preview and metadata polish

Priority: P3

Scope:

- social preview title and image
- concise page descriptions
- clean share URLs

Dependencies:

- shareable pages

Acceptance criteria:

- shared previews look intentional

## Milestone Plan

### Milestone A: Useful live map

Includes:

- protobuf ingest
- normalization
- web socket delivery
- map shell
- vehicle markers
- basic filters

Outcome:

- users can see live MBTA vehicles quickly

### Milestone B: Rider utility

Includes:

- stop detail
- route detail
- trip detail
- alerts
- mobile responsiveness

Outcome:

- users can answer transit questions without leaving the app

### Milestone C: Launch polish

Includes:

- accessibility
- performance hardening
- share cards
- public pages

Outcome:

- the product is ready for broad use and sharing

## Non-Negotiables

- realtime updates must feel trustworthy
- mobile must be first-class
- desktop must not feel like an afterthought
- map density must remain readable
- alerts must be obvious
- accessibility must be built in, not patched on

