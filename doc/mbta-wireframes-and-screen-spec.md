# MBTA Realtime Wireframes and Screen Spec

## Purpose

This document defines the screen structure, layout behavior, and interaction model for the MBTA realtime experience. It is intended to guide implementation for a responsive product that feels fast on phones, tablets, and desktops.

## Design Goals

- make live transit status instantly understandable
- keep the map central without making the app map-only
- support one-handed mobile use
- support power-user desktop use
- keep detail content one tap away
- avoid visual clutter in dense transit corridors

## Global Layout System

### Core regions

1. Top utility bar
2. Primary live surface
3. Context panel or bottom sheet

### Breakpoints

- Small: under 640px
- Medium: 640px to 1024px
- Large: over 1024px

### Responsive behavior

- Small: single column, full-width map, bottom sheet details
- Medium: split view with collapsible panels
- Large: persistent navigation rail, map plus detail pane, optional secondary compare pane

## Global Components

### Top bar

Contains:

- app title or logo
- search field
- location control
- filter button
- alert indicator
- connection status badge

Behavior:

- stays sticky
- collapses to compact form on small screens
- search is always reachable

### Status badges

Use badges for:

- live
- reconnecting
- stale
- alert
- selected
- filtered

Badges should be concise and color-coded, but not rely on color alone.

### Filter chips

Use chips for:

- bus
- subway
- commuter rail
- ferry
- alerts only
- favorites
- nearby only

Chips should be horizontally scrollable on small screens and wrap into multiple rows on larger screens.

## Screen 1: Live Overview

### Purpose

Answer "what is happening near me?" as fast as possible.

### Small screen wireframe

```text
------------------------------------------------
| MBTA Live        [Search] [Filter] [Live]     |
------------------------------------------------
| Mode summary chips                            |
| Bus  Subway  Rail  Ferry  Alerts              |
------------------------------------------------
| MAP                                           |
| - clustered vehicles                          |
| - selected vehicle/route highlight            |
| - user location or selected area              |
| - alert markers                               |
------------------------------------------------
| Bottom sheet                                  |
| Nearby arrivals                               |
| Next vehicles                                 |
| Live disruptions                              |
------------------------------------------------
```

### Medium and large behavior

- map expands to fill most of the viewport
- summary rail shows active service state by mode
- nearby arrivals remain visible without covering the map

### Key interactions

- tap vehicle marker to open vehicle sheet
- tap route chip to filter the map
- tap alert summary to open alert center
- drag bottom sheet up for more detail

## Screen 2: Route Detail

### Purpose

Show the operational status of one route clearly.

### Small screen wireframe

```text
------------------------------------------------
| < Back | Route 1 | Live | Share               |
------------------------------------------------
| Route summary                                 |
| color chip | status | headway | delay         |
------------------------------------------------
| MAP preview / route path                      |
------------------------------------------------
| Direction A                                  |
| - next vehicles                               |
| - next arrivals                               |
| Direction B                                  |
| - next vehicles                               |
| - next arrivals                               |
------------------------------------------------
| Route alerts                                  |
------------------------------------------------
```

### Content order

1. Route summary
2. Live status
3. Direction breakdown
4. Alerts
5. Stops or stations on route

### Key interactions

- switch direction with a segmented control
- jump to a stop from the stop list
- share the route page
- favorite the route

## Screen 3: Stop or Station Detail

### Purpose

Give a rider the next departures, platform info, and alert context for one stop or station.

### Small screen wireframe

```text
------------------------------------------------
| < Back | South Station | Favorite | Share     |
------------------------------------------------
| Stop summary                                  |
| location | accessibility | status             |
------------------------------------------------
| Next arrivals                                 |
| 1. Route A  2 min                             |
| 2. Route B  5 min                             |
| 3. Route C  9 min                             |
------------------------------------------------
| Alerts                                        |
| - service delay                               |
------------------------------------------------
| Nearby transfers                              |
| - Red Line                                    |
| - Commuter Rail                               |
------------------------------------------------
```

### Key interactions

- select an arrival to open trip detail
- tap route name to open route detail
- open accessibility info without leaving the page

## Screen 4: Trip Detail

### Purpose

Help the user understand one moving trip end to end.

### Wireframe

```text
------------------------------------------------
| < Back | Trip 123 | Live                       |
------------------------------------------------
| Trip summary                                  |
| route | direction | vehicle | delay           |
------------------------------------------------
| Timeline                                      |
| stop 1 --- stop 2 --- stop 3 --- stop 4       |
| ETA markers + current vehicle position        |
------------------------------------------------
| Stop list                                     |
| - stop name, ETA, status                      |
------------------------------------------------
| Actions                                       |
| share | favorite route | open stop            |
------------------------------------------------
```

### Key interactions

- tap any stop to open stop detail
- highlight live position against the timeline
- allow quick sharing of the trip state

## Screen 5: Alerts Center

### Purpose

Make disruptions obvious and actionable.

### Wireframe

```text
------------------------------------------------
| Alerts                                        |
------------------------------------------------
| System alerts                                 |
| - severe                                      |
| - active                                      |
------------------------------------------------
| Mode filters                                  |
| Bus | Subway | Rail | Ferry                   |
------------------------------------------------
| Route alerts list                             |
| - title                                       |
| - short description                           |
| - affected routes                             |
------------------------------------------------
```

### Key interactions

- filter by mode
- open alert details
- jump from alert to affected route or station

## Screen 6: Favorites

### Purpose

Give frequent riders a fast home base.

### Content

- saved stops
- saved routes
- saved trips or commute patterns
- quick jump buttons

### Behavior

- surfaces the user's commute first
- keeps the screen compact and scannable
- supports reorder by drag on larger screens

## Navigation Model

### Small screens

- bottom navigation or compact tab bar
- map remains the primary surface
- details open as sheets

### Large screens

- left rail for sections
- map in the center
- detail panel on the right
- optional compare mode for power users

## Interaction Rules

- map interactions should not block scrolling in sheets
- sheets should snap to predictable heights
- selected state must be obvious
- loading states should preserve layout
- stale data should show a clear freshness label

## Empty States

### No location access

Show:

- permission prompt
- manual search
- suggested popular stations

### No active vehicles in viewport

Show:

- "No live vehicles in view"
- zoom or pan hint
- nearby route suggestions

### No alerts

Show:

- calm status
- last checked time
- reassurance that the system is live

## Performance Rules for UI

- use clustering for dense markers
- lazy-load map assets
- virtualize lists
- avoid re-rendering the entire map on every update
- batch realtime updates into frame-friendly chunks
- reduce motion on low-power or accessibility settings

## Accessibility Rules

- every interactive control must be keyboard reachable
- every icon needs accessible text or label
- contrast should remain high in all themes
- route colors must never be the only signal
- live updates should not create screen reader noise

## Recommended Visual Tone

- operational, calm, and trustworthy
- dense but organized
- clear typography hierarchy
- strong use of whitespace
- purposeful route colors
- minimal decorative noise

## Implementation Notes

- keep the live map and details loosely coupled
- store connection and freshness state centrally
- route, stop, and trip pages should all be shareable
- mobile and desktop should use the same underlying data model

