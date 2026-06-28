# Map-Free Mode: Search-First Transit Discovery

## Overview

A revolutionary text-first interface for transit discovery that eliminates map friction. Users search by route, address, stop name, or vehicle ID and instantly see all vehicles servicing that location with precise arrival/departure timing in an intuitive, glanceable layout.

**Design Philosophy:** Stop thinking like a cartographer. Start thinking like a transit rider who just needs to know "when is my bus coming?"

---

## Product Behavior

### Entry Point: Universal Search

- Single search box in the app header/navigation.
- Accepts 5 query types:
  1. Route number or name (e.g., "38", "Red Line", "Route 15")
  2. Stop name or ID (e.g., "Park Street", "stop-id-123")
  3. Address or intersection (e.g., "123 Main St", "Boylston & Arlington")
  4. Vehicle ID (e.g., "veh-4521")
  5. Landmark or neighborhood (e.g., "Downtown", "Airport")

### Query Resolution

- **Route query** → Shows all vehicles on that route, grouped by direction + stop sequence.
- **Stop query** → Shows all routes serving that stop, with next arrival for each.
- **Address query** → Shows nearby stops (within 0.5 km), ranked by distance, then shows routes for selected stop.
- **Vehicle query** → Shows that vehicle's current trip, next 5 stops, passenger manifest (if available).
- **Landmark query** → Resolves to nearby stops or routes, then follows stop query flow.

---

## UX Layouts: The "Nobel Prize" Presentation

### Layout 1: Stop-Centric View (Most Common)

**For query: "Park Street" or address near Park Street**

```
┌─────────────────────────────────────────┐
│ 🔍 Park Street Station                  │
├─────────────────────────────────────────┤
│ 📍 Charles Street (Downtown)            │
│ 0.3 km away • Green Line interchange    │
├─────────────────────────────────────────┤
│
│ INBOUND (toward downtown)
│ ─────────────────────────
│
│ 🟦 Route 38  [Bus]
│ │ Now → 2 min  ✓ Live GPS
│ │ Then → 12 min
│ │ Then → 27 min
│
│ 🟦 Route 22  [Bus]
│ │ 8 min ⊕ Scheduled
│ │ 18 min
│
│ 🟩 Green Line [Subway]
│ │ Now → 1 min  ✓ Live GPS  [Platform 2]
│ │ Then → 6 min
│ │ Then → 15 min
│
├─────────────────────────────────────────┤
│
│ OUTBOUND (toward periphery)
│ ───────────────────────────
│
│ 🟦 Route 38  [Bus]
│ │ 5 min ⊕ Scheduled
│ │ 20 min
│
│ 🔴 Route 57  [Bus]
│ │ Delay: +8 min  ⚠ Service alert
│ │ 10 min
│ │ 25 min
│
├─────────────────────────────────────────┤
│ ⓘ Tap a route to see: map, crowding,
│   accessibility, real-time updates
│
│ 🔔 Get alerts for this stop
│ 📌 Add to favorites
└─────────────────────────────────────────┘
```

**Design Principles:**
- **Color coding by mode** (bus, subway, rail, ferry).
- **Live/Scheduled badges** show data freshness.
- **Directional split** (inbound/outbound) is clear and scannable.
- **Time hierarchy** (next arrival first, then subsequent arrivals).
- **Delay/alert badges** immediately visible.
- **Tap for details** rather than overwhelming with info.

---

### Layout 2: Route-Centric View

**For query: "Route 38" or "Red Line"**

```
┌─────────────────────────────────────────┐
│ 🚌 Route 38 (Forest Hills ↔ Downtown)   │
├─────────────────────────────────────────┤
│ 📊 14 vehicles active on this route      │
│ ⏱ Average headway: 6 minutes            │
│ 📈 Service: Normal ✓                    │
├─────────────────────────────────────────┤
│
│ TOWARD Downtown
│ ───────────────
│
│ Stop sequence (⊙ = current vehicle)
│
│ ⊙ Forest Hills
│   └─ Veh#4421 arriving in 0 min
│      └─ Then Veh#4422 (11 min)
│      └─ Then Veh#4423 (22 min)
│
│ → Green Street
│   └─ Veh#4421 arriving in 4 min
│      └─ Then Veh#4422 (15 min)
│
│ → Park Street ⭐ (Popular)
│   └─ Veh#4421 arriving in 9 min  ✓ Wheelchair accessible
│      └─ Then Veh#4422 (20 min)
│      └─ Then Veh#4423 (31 min)
│
│ → Boylston
│   └─ Veh#4421 arriving in 13 min
│      └─ Then Veh#4422 (24 min)
│
│ → Downtown Crossing
│   └─ Veh#4421 arriving in 17 min (final stop)
│
├─────────────────────────────────────────┤
│
│ TOWARD Forest Hills
│ ───────────────────
│
│ (Same structure, reversed direction)
│
├─────────────────────────────────────────┤
│ 💬 Crowding forecast: Light → Medium    │
│ 🔔 Enable arrival notifications         │
│ 🗺 Show map toggle (optional)           │
└─────────────────────────────────────────┘
```

**Design Principles:**
- **Stop sequence is linear**, left to right (or top to bottom).
- **Current vehicle highlighted** at each stop.
- **3–5 lookahead arrivals** per stop.
- **Mode-specific badges** (wheelchair, bike rack, charging port).
- **Crowding heatmap** shows which stops are busy.
- **Tap stop** to see all routes serving it.

---

### Layout 3: Vehicle-Centric View

**For query: "Vehicle 4421" or scanning a QR code on the bus**

```
┌─────────────────────────────────────────┐
│ 🚌 Bus #4421                            │
├─────────────────────────────────────────┤
│ Route 38 (Downtown-bound)               │
│ Driver: James M. • Occupancy: 34/60     │
│ 📍 Currently: Green Street (4 min late) │
├─────────────────────────────────────────┤
│
│ Next Stops:
│
│ ➊ Park Street
│  │ ETA: 9 min  (scheduled: 8 min)
│  │ Stop #3 of 8
│  │ 🟩 Very bright, crowded in evening
│
│ ➋ Boylston
│  │ ETA: 13 min
│  │ Stop #4 of 8
│
│ ➌ Downtown Crossing (final)
│  │ ETA: 17 min
│  │ Stop #5 of 8
│
├─────────────────────────────────────────┤
│ 🔘 Live GPS enabled
│ 🔔 Notify me at Park Street
│ 📢 Send feedback about this trip
│ 🗺 Show map
└─────────────────────────────────────────┘
```

**Design Principles:**
- **Vehicle state** (location, delay, occupancy).
- **Clean countdown timers** with comparison to schedule.
- **Stop ordinal** (stop #N of M) for context.
- **Contextual metadata** (crowding, accessibility, alerts).
- **Direct feedback** mechanism on the vehicle.

---

### Layout 4: Address/Landmark Resolution

**For query: "123 Main St" or "Copley Square"**

```
┌─────────────────────────────────────────┐
│ 🔍 123 Main Street, Boston              │
├─────────────────────────────────────────┤
│ Did you mean one of these nearby stops? │
│
│ ✓ Park Street (Green Line)
│   └─ 0.2 km NE (direct walk: 3 min)
│
│ ✓ Boylston (Red, Green, Orange Lines)
│   └─ 0.3 km E (direct walk: 4 min)
│
│ ✓ Downtown Crossing (Red, Green, Orange)
│   └─ 0.4 km S (direct walk: 5 min)
│
├─────────────────────────────────────────┤
│ Or search for routes near this address:
│ 🟦 Route 38, Route 22, Route 57
│   └─ Stop: Charles Street (0.1 km)
│
└─────────────────────────────────────────┘
```

---

## Advanced Features: Progressive Disclosure

### 1. Crowding Forecast Timeline
When viewing a route or stop, users can swipe/tap to see crowding predictions:

```
Now  │ +5m  │ +15m │ +30m │ +60m
──────────────────────────────────
🟢   │ 🟡   │ 🟠   │ 🔴   │ 🟡
```

### 2. Real-Time Alerts Inline
```
🟦 Route 38
│ 5 min ⚠ Service alert: Detour at Main St
│ 20 min
```

### 3. Multi-Stop Selector
For complex queries, allow users to refine:
```
Find stops near "downtown":
□ Park Street (Green Line)
□ Downtown Crossing (Red, Green, Orange)
□ Boylston (Red, Green, Orange)
☑ Copley (Green, Orange)
```

### 4. Smart Suggestions
After search, offer context-aware next steps:
- "Add to home commute shortcuts?"
- "Set recurring alert for 8:00 AM weekdays?"
- "Show alternative routes if this is delayed?"

---

## Data Model & APIs

### New API Endpoints

```
GET /api/search
  ?q=route_38&type=route
  ?q=park_street&type=stop
  ?q=123_main_st&type=address
  ?q=veh_4421&type=vehicle
  ?q=downtown&type=landmark

Response:
{
  "query": "route_38",
  "type": "route",
  "matches": [
    {
      "id": "route-38",
      "name": "Route 38",
      "directions": [
        {
          "direction_id": 0,
          "name": "Downtown",
          "vehicles_active": 7,
          "stop_sequence": [
            {
              "stop_id": "stop-123",
              "name": "Forest Hills",
              "arrivals": [
                { "vehicle_id": "veh-4421", "eta": 0, "scheduled": 0 },
                { "vehicle_id": "veh-4422", "eta": 11, "scheduled": 12 }
              ]
            }
          ]
        }
      ]
    }
  ]
}

GET /api/stop/{stopId}/arrivals
Response:
{
  "stop_id": "stop-456",
  "name": "Park Street",
  "routes": [
    {
      "route_id": "route-38",
      "mode": "bus",
      "directions": {
        "inbound": [ { "vehicle_id": "veh-4421", "eta": 9 } ],
        "outbound": [ { "vehicle_id": "veh-4422", "eta": 5 } ]
      }
    }
  ]
}

GET /api/vehicle/{vehicleId}
Response:
{
  "vehicle_id": "veh-4421",
  "route_id": "route-38",
  "location": { "lat": 42.36, "lon": -71.06 },
  "occupancy": 34,
  "capacity": 60,
  "next_stops": [
    { "stop_id": "stop-456", "eta": 9, "scheduled": 8 }
  ]
}
```

### Data Model: SearchResult

```typescript
interface SearchResult {
  queryType: 'route' | 'stop' | 'address' | 'vehicle' | 'landmark';
  matches: RouteResult[] | StopResult[] | VehicleResult[] | AddressResult[];
  resolution_confidence: number; // 0-1
  suggested_refinements?: string[];
}

interface StopResult {
  stop_id: string;
  stop_name: string;
  distance_meters?: number;
  routes: {
    route_id: string;
    direction: 'inbound' | 'outbound';
    next_arrivals: {
      vehicle_id: string;
      eta_seconds: number;
      scheduled_seconds: number;
      delay_seconds: number;
    }[];
  }[];
}

interface RouteResult {
  route_id: string;
  route_name: string;
  mode: 'bus' | 'subway' | 'commuter_rail' | 'ferry';
  directions: {
    direction_id: number;
    direction_name: string;
    vehicles_active: number;
    crowding_forecast: number[]; // 0-100 for +0, +15, +30, +60 min
    stops_with_arrivals: StopArrival[];
  }[];
}

interface VehicleResult {
  vehicle_id: string;
  route_id: string;
  current_location: { lat: number; lon: number };
  occupancy: number;
  capacity: number;
  next_stops: {
    stop_id: string;
    stop_name: string;
    eta_seconds: number;
    scheduled_seconds: number;
  }[];
}
```

---

## Frontend Architecture

### Page/View Structure

1. **Search Page (Map-Free Default)**
   - Header: Universal search box with autocomplete
   - Results area: Dynamic layout based on query type
   - Favorite shortcuts (recent/pinned searches)

2. **Stop Detail View**
   - Inbound/Outbound tabs
   - Route cards with arrival timings
   - Inline alerts and accessibility info

3. **Route Detail View**
   - Direction picker
   - Stop sequence list
   - Crowding forecast slider
   - Vehicle status indicators

4. **Vehicle Detail View**
   - Real-time location info
   - Next stops countdown
   - Occupancy meter
   - Driver/service info

### UI Components

- **SearchBox**: Autocomplete, recent queries, voice input
- **ArrivalCard**: Compact route + time + status display
- **StopSequence**: Linear list of stops with live vehicles
- **CrowdingTimeline**: Swipeable crowding forecast
- **AlertBadge**: Inline disruption/delay indicators
- **DirectionToggle**: Inbound/Outbound switcher

---

## Interaction Patterns

### Gesture Support

- **Swipe down** on stop to see full details (accessibility, crowding, alerts).
- **Swipe right** to mark as favorite.
- **Long-press** on route card to set departure notification.
- **Pinch** to zoom crowding timeline.

### Voice Search (Optional Phase 2)

- "When is the 38 bus to downtown?"
- "Next Green Line from Park Street?"
- "Where's vehicle 4421?"

---

## Accessibility & Inclusive Design

1. **Screen Reader Support**
   - All timing text announced as "9 minutes" not "00:09".
   - Route mode icons have alt text ("Red Line Subway").
   - Delay badges are semantic (`<mark role="alert">`).

2. **High Contrast Mode**
   - Color is not the only differentiator; use icons + text.
   - Crowding indicators use patterns (dots, lines) + color.

3. **Mobile-First Responsive**
   - Touch targets ≥ 44×44 px.
   - Text sizes readable without zoom at 100%.
   - No horizontal scroll; vertical scroll primary.

4. **Dyslexia-Friendly Fonts**
   - Use OpenDyslexic or clear sans-serif.
   - Sufficient line spacing and letter spacing.

---

## Performance & Offline Support

### Caching Strategy

- Cache **stops**, **routes**, **schedules** locally (update every 6 hours).
- Realtime arrivals cache with 30-second TTL.
- Enable offline mode: show cached schedule data with stale indicator.

### API Response Time Targets

- Search autocomplete: **< 100 ms** latency.
- Stop detail load: **< 350 ms** (P95).
- Route detail load: **< 500 ms** (P95).
- Vehicle detail: **< 200 ms** (live GPS data).

---

## Rollout Plan

### Phase 1: MVP (4-6 weeks)

- [ ] Search infrastructure (parser, resolver).
- [ ] Stop-centric view layout.
- [ ] Route-centric view layout.
- [ ] Real-time arrivals API.
- [ ] Basic autocomplete for stops + routes.

### Phase 2: Enhance (4-6 weeks)

- [ ] Address/landmark resolution + geocoding.
- [ ] Vehicle-centric view.
- [ ] Crowding forecast timeline.
- [ ] Accessibility audit + fixes.

### Phase 3: Polish (2-4 weeks)

- [ ] Voice search.
- [ ] Gesture controls.
- [ ] Offline mode.
- [ ] Advanced alerts + notifications.

---

## Success Metrics

1. **Engagement**
   - % of users trying map-free mode.
   - Avg. searches per session (target: > 2).
   - Repeat search rate (target: > 40%).

2. **Performance**
   - Search response time (P95 < 350 ms).
   - Time to first meaningful paint (< 1 s).
   - Frame rate on arrival updates (60 FPS).

3. **Usability**
   - Task completion rate for "find next bus to X" (target: > 90%).
   - Search query parsing accuracy (target: > 95%).
   - User satisfaction NPS (target: > 60).

4. **Accessibility**
   - WCAG 2.1 Level AA compliance.
   - Screen reader test pass rate: 100%.
   - Manual accessibility audit score: > 90%.

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Slow geocoding for addresses | Medium | High | Cache results, use local geohashing, fallback to stops only |
| High cardinality search index | Low | High | Use inverted index with prefix trees; shard by geography |
| Voice recognition errors | Medium | Medium | Show top 3 interpretations; require confirmation for actions |
| Offline data staleness | Low | Medium | Show age indicator; suggest refresh when online |
| Search ambiguity (e.g., "38" = route or bus #?) | Medium | Low | Show both matches; remember user's last intent |

---

## Definition of Done

- [ ] Functional acceptance criteria met
- [ ] All API response times meet targets
- [ ] Search accuracy > 95% on test queries
- [ ] WCAG 2.1 AA compliance verified
- [ ] Mobile UX tested on 5+ devices
- [ ] Telemetry dashboards live
- [ ] Runbooks and troubleshooting docs complete
- [ ] Team training completed
