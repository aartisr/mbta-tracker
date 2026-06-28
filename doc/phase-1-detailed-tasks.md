# Phase 1: Map-Free Search MVP - Detailed Task Breakdown

## Overview

**Duration:** 4-6 weeks
**Team:** 2-3 Frontend Engineers, 1 Backend Engineer, 1 PM
**Goal:** Launch public beta of text-first search interface with stop-centric, route-centric, and vehicle-centric views

---

## Sprint 1A: Backend Search Infrastructure (Weeks 1-2)

### Task 1A.1: Design Search API Schema & Response Models

**Subtasks:**
- [ ] Define `SearchQuery` model (query_string, query_type, filters)
- [ ] Define `SearchResult` union type (RouteResult | StopResult | VehicleResult | AddressResult)
- [ ] Design ambiguity resolution strategy (show top 3 matches if uncertain)
- [ ] Create `ArrivalForecast` model (stop_id, route_id, direction, arrivals[], eta_seconds, scheduled_seconds)
- [ ] Design error responses (malformed query, no matches, service unavailable)
- [ ] Document API contracts in OpenAPI/Swagger

**Acceptance Criteria:**
- [ ] OpenAPI spec complete and reviewable
- [ ] Schema supports all 5 query types (route, stop, address, vehicle, landmark)
- [ ] Response examples provided for each query type

**Owner:** Backend Lead
**Effort:** 1 day

---

### Task 1A.2: Implement Search Query Parser

**Subtasks:**
- [ ] Build tokenizer (split, lowercase, remove punctuation)
- [ ] Implement route recognizer (patterns: "38", "Route 38", "38 bus", "red line", etc.)
- [ ] Implement stop recognizer (fuzzy match against stop names + IDs)
- [ ] Implement address recognizer (regex + geocoder fallback)
- [ ] Implement vehicle recognizer (patterns: "veh-4421", "#4421", "bus 4421")
- [ ] Implement landmark recognizer (known landmarks dict + fuzzy match)
- [ ] Add typo tolerance (Levenshtein distance for close misses)

**Acceptance Criteria:**
- [ ] Parser accuracy > 95% on test set (50+ sample queries)
- [ ] Handles ambiguous inputs gracefully (returns 3 candidates ranked by confidence)
- [ ] No false positives (e.g., "38" correctly disambiguated as route vs bus number)
- [ ] Unit test coverage > 90%

**Owner:** Backend Lead
**Effort:** 2-3 days

**Test Cases:**
```
"38" → Route 38 (confidence 0.95)
"Park Street" → Stop (confidence 0.98)
"123 Main St" → Address (confidence 0.88)
"red line" → Route (Red Line, confidence 0.92)
"veh-4421" → Vehicle (confidence 0.99)
"downtown" → Landmark → nearby stops (confidence 0.85)
"38 bus to downtown" → Route 38 + stop (confidence 0.90)
```

---

### Task 1A.3: Implement Search Resolver Service

**Subtasks:**
- [ ] Create query resolver (dispatch to route/stop/address/vehicle/landmark handlers)
- [ ] Implement route resolution (lookup in MBTA routes, return route_id + name)
- [ ] Implement stop resolution (lookup in MBTA stops, return stop_id + location)
- [ ] Implement address resolution (integrate geocoding service like Mapbox or Google Maps)
- [ ] Implement vehicle resolution (lookup in realtime vehicle feed)
- [ ] Implement landmark resolution (known landmarks map + geohashing for nearby stops)
- [ ] Add result ranking (confidence score, distance, recency)

**Acceptance Criteria:**
- [ ] Resolver returns results within 200ms (P95)
- [ ] Address geocoding API calls cached (reduce external calls by 80%)
- [ ] All result types ranked consistently (confidence, distance, recency)
- [ ] Fallback behavior when external services unavailable

**Owner:** Backend Lead
**Effort:** 3-4 days

---

### Task 1A.4: Build Autocomplete Index

**Subtasks:**
- [ ] Design prefix tree (trie) for stops + routes + vehicles
- [ ] Implement trie insert + search (character-by-character completion)
- [ ] Add geohashing for address prefixes (enable location-based suggestions)
- [ ] Populate trie from MBTA data (stops, routes, vehicle IDs)
- [ ] Cache in Redis or in-memory store
- [ ] Implement refresh job (run nightly, update stops/routes/vehicles)

**Acceptance Criteria:**
- [ ] Autocomplete response time < 100ms (P95)
- [ ] Returns top 10 suggestions for any prefix (1-3 characters)
- [ ] Suggestions ranked by popularity (rider frequency if available, else alphabetical)
- [ ] Memory footprint < 50MB (compressed trie)

**Owner:** Backend Lead
**Effort:** 2-3 days

**Example Suggestions:**
```
"pa" → ["Park Street", "Park St (Red Line)", "Paragon Dr"]
"r" → ["Route 38", "Route 22", "Red Line", "Route 57"]
"123" → ["123 Main St", "1234 Boylston", "123 Park Ave"]
"veh" → ["veh-4421", "veh-4422", "veh-4423"]
```

---

### Task 1A.5: Implement /api/stop/{stopId}/arrivals Endpoint

**Subtasks:**
- [ ] Query MBTA predictions API for stop (include ?include=route,trip)
- [ ] Group arrivals by route + direction (inbound vs outbound)
- [ ] Map route direction_id to readable direction name (lookup from route definition)
- [ ] Compute eta_seconds = predicted arrival - now (handle past predictions)
- [ ] Enrich with trip.headsign (destination) if available
- [ ] Add live/scheduled badge (vehicle has realtime data vs schedule)
- [ ] Add delay indicator (if predicted > scheduled)
- [ ] Add service alerts (from /alerts endpoint, filter by stop + route)

**Acceptance Criteria:**
- [ ] Response time < 350ms (P95)
- [ ] Handles stops with > 50 arrivals gracefully (return top 20, with "load more" option)
- [ ] Correctly maps direction_id to human-readable direction
- [ ] Headsigns populated for 90%+ of arrivals
- [ ] Delay badges accurate to ±1 minute

**Owner:** Backend Lead
**Effort:** 3 days

**Response Example:**
```json
{
  "stop_id": "stop-456",
  "stop_name": "Park Street",
  "inbound": [
    {
      "route_id": "route-38",
      "route_name": "Route 38",
      "mode": "bus",
      "vehicle_id": "veh-4421",
      "headsign": "Downtown",
      "eta_seconds": 540,
      "scheduled_seconds": 480,
      "is_live": true,
      "delay_seconds": 60,
      "alerts": ["Delay at Main St"]
    }
  ],
  "outbound": [...]
}
```

---

### Task 1A.6: Implement /api/route/{routeId}/stops Endpoint

**Subtasks:**
- [ ] Query MBTA shape + stops for route (ordered by position in sequence)
- [ ] For each direction, return stop sequence (stop_id, stop_name, sequence_position)
- [ ] Get current vehicles on route (from realtime feed)
- [ ] For each vehicle, find current stop index (closest to vehicle location)
- [ ] Return vehicle list per stop (next 3 arrivals)
- [ ] Add accessibility info (wheelchair accessible, bike racks, etc.)
- [ ] Add estimated crowding if available (Phase 2 placeholder)

**Acceptance Criteria:**
- [ ] Response time < 350ms (P95)
- [ ] Stop sequence accurate (matches MBTA shape data)
- [ ] Vehicle assignments to stops within 2-stop tolerance
- [ ] Accessibility badges for 90%+ of stops
- [ ] Handles routes with 100+ stops without timeout

**Owner:** Backend Lead
**Effort:** 3 days

**Response Example:**
```json
{
  "route_id": "route-38",
  "route_name": "Route 38",
  "directions": [
    {
      "direction_id": 0,
      "direction_name": "Downtown",
      "stops": [
        {
          "stop_id": "stop-123",
          "stop_name": "Forest Hills",
          "sequence_position": 0,
          "vehicles_arriving": [
            {
              "vehicle_id": "veh-4421",
              "eta_seconds": 0,
              "occupancy": 45
            }
          ]
        }
      ]
    }
  ]
}
```

---

### Task 1A.7: Implement /api/vehicle/{vehicleId} Endpoint

**Subtasks:**
- [ ] Query realtime vehicle feed by ID
- [ ] Return current location (lat, lon, heading)
- [ ] Return current route + trip
- [ ] Return next 5 stops from current trip
- [ ] Compute ETA for each next stop (based on vehicle speed + distance)
- [ ] Return occupancy (if available from vehicle telemetry)
- [ ] Add trip end time (when vehicle finishes route)

**Acceptance Criteria:**
- [ ] Response time < 200ms (P95)
- [ ] Handles non-existent vehicle IDs gracefully (404)
- [ ] Location accurate to ±50 meters (from MBTA feed)
- [ ] Next stops include headsign + accessibility info
- [ ] Occupancy field optional (Phase 1 may not have this data)

**Owner:** Backend Lead
**Effort:** 2 days

**Response Example:**
```json
{
  "vehicle_id": "veh-4421",
  "route_id": "route-38",
  "location": { "lat": 42.36, "lon": -71.06, "heading": 180 },
  "occupancy": 45,
  "next_stops": [
    {
      "stop_id": "stop-456",
      "stop_name": "Park Street",
      "eta_seconds": 540,
      "headsign": "Downtown"
    }
  ]
}
```

---

### Task 1A.8: Setup Caching & Data Pipeline

**Subtasks:**
- [ ] Integrate Redis (or in-memory cache) for stops, routes, schedules
- [ ] Setup MBTA data refresh job (6-hour TTL)
- [ ] Cache predictions with 30-second TTL
- [ ] Implement fallback to cached data if API unavailable
- [ ] Add stale data indicators (e.g., "Last updated 5 min ago")
- [ ] Setup cache invalidation on alerts (clear immediately when disruption)

**Acceptance Criteria:**
- [ ] Cache hit rate > 90% for repeated queries
- [ ] Cache refresh job completes < 5 seconds
- [ ] No cascade failures if MBTA API down
- [ ] Stale indicators shown when cache age > 2 minutes

**Owner:** Backend Lead
**Effort:** 2-3 days

---

### Task 1A.9: Load Testing & Performance Tuning

**Subtasks:**
- [ ] Write load test (Apache JMeter or K6)
- [ ] Simulate 100 QPS search traffic (realistic peak)
- [ ] Profile database queries (find N+1 problems)
- [ ] Measure response time distributions (p50, p95, p99)
- [ ] Identify bottlenecks (database, API calls, compute)
- [ ] Tune indexes, connection pools, query optimization
- [ ] Verify targets met: < 350ms P95

**Acceptance Criteria:**
- [ ] 100 QPS sustained with < 350ms P95 latency
- [ ] No memory leaks (sustained load 10 min)
- [ ] CPU usage < 70% at peak traffic
- [ ] Database query time < 100ms per search

**Owner:** Backend Lead + Infra Engineer
**Effort:** 2-3 days

---

### Task 1A.10: Unit Tests & Integration Tests

**Subtasks:**
- [ ] Write unit tests for query parser (test cases: routes, stops, addresses, vehicles, landmarks)
- [ ] Write unit tests for resolver (mocked MBTA API calls)
- [ ] Write integration tests for search endpoint (real MBTA data)
- [ ] Write integration tests for arrivals endpoint
- [ ] Write integration tests for route/stops endpoint
- [ ] Write integration tests for vehicle endpoint
- [ ] Achieve > 85% code coverage

**Acceptance Criteria:**
- [ ] All tests pass
- [ ] Code coverage > 85%
- [ ] Test runtime < 30 seconds

**Owner:** Backend Lead
**Effort:** 3 days

---

### Task 1A.11: API Documentation & Deployment

**Subtasks:**
- [ ] Write OpenAPI/Swagger docs for all endpoints
- [ ] Create Postman collection for manual testing
- [ ] Write runbooks (common failures, debugging)
- [ ] Deploy to staging environment
- [ ] Verify endpoints accessible from staging
- [ ] Document environment variables (API keys, URLs)

**Acceptance Criteria:**
- [ ] OpenAPI spec complete and reviewable by FE team
- [ ] Staging deployment passes smoke tests
- [ ] All endpoints respond from staging environment

**Owner:** Backend Lead
**Effort:** 1-2 days

---

## Sprint 1B: Frontend Search UI & Views (Weeks 2-3)

### Task 1B.1: Setup Frontend Project Structure

**Subtasks:**
- [ ] Create SvelteKit route structure (`+page.svelte` for search, layout)
- [ ] Setup component library structure (`lib/components/` folder)
- [ ] Configure TypeScript strict mode
- [ ] Setup Vitest for unit tests
- [ ] Configure Tailwind CSS (or custom CSS framework)
- [ ] Setup ESLint + Prettier
- [ ] Add bundle size analyzer

**Acceptance Criteria:**
- [ ] Project scaffolding complete
- [ ] TypeScript strict mode passes
- [ ] First component renders without errors
- [ ] Build produces dist/ folder

**Owner:** Frontend Lead
**Effort:** 1 day

---

### Task 1B.2: Build SearchBox Component

**Subtasks:**
- [ ] Create input field (text, placeholder "Search by route, stop, or address...")
- [ ] Implement onChange handler → call autocomplete API
- [ ] Display autocomplete dropdown (10 suggestions max)
- [ ] Handle keyboard navigation (arrow keys, enter)
- [ ] Show recent searches (localStorage, max 10)
- [ ] Show favorite searches (if available)
- [ ] Add voice input placeholder (Phase 2)
- [ ] Handle mobile keyboard (show on focus, dismiss on blur)

**Acceptance Criteria:**
- [ ] Input accepts text, special characters
- [ ] Autocomplete shows < 100ms after typing
- [ ] Keyboard navigation works (arrows, enter, escape)
- [ ] Recent searches persist across sessions
- [ ] Mobile keyboard doesn't break layout
- [ ] Accessibility: labeling, ARIA attributes

**Owner:** Frontend Engineer 1
**Effort:** 2-3 days

**Mockup:**
```
┌─────────────────────────────────────────┐
│ 🔍 Search by route, stop, or address... │
├─────────────────────────────────────────┤
│ ✓ Recent:                               │
│   • Park Street                         │
│   • Route 38                            │
│                                         │
│ ✓ Suggestions:                          │
│   • Park St (Green Line)                │
│   • Parkside Ave                        │
│   • Park & Ride Station                 │
└─────────────────────────────────────────┘
```

---

### Task 1B.3: Build Search Results Page Layout

**Subtasks:**
- [ ] Create search results page (handles empty state, loading, error states)
- [ ] Implement dynamic layout based on result type (RouteLayout, StopLayout, etc.)
- [ ] Add loading spinner (while fetching results)
- [ ] Add error message (if search fails)
- [ ] Add empty state (no results found, try another search)
- [ ] Implement back button (return to search)
- [ ] Add result metadata (e.g., "Found 3 stops near downtown")

**Acceptance Criteria:**
- [ ] Layout adapts to all result types
- [ ] Loading state shows within 100ms
- [ ] Error messages are helpful (not generic)
- [ ] Empty state encourages alternative search
- [ ] No horizontal scroll on mobile

**Owner:** Frontend Engineer 1
**Effort:** 2 days

---

### Task 1B.4: Build ArrivalCard Component

**Subtasks:**
- [ ] Create card layout (route + time + status)
- [ ] Display route info (route number, mode icon, headsign)
- [ ] Display arrival time (countdown, e.g., "5 min", "on-time", "delayed +3 min")
- [ ] Add status badges (Live GPS, Scheduled, Delayed, Alert)
- [ ] Add accessibility icons (wheelchair, bike rack)
- [ ] Add hover/tap effects (highlight, show details)
- [ ] Implement color coding by mode (red for Red Line, green for Green, etc.)

**Acceptance Criteria:**
- [ ] Card renders correctly for all mode types
- [ ] Time displays in human-readable format
- [ ] Status badges clear and visible
- [ ] Touch targets ≥ 44×44 px
- [ ] Accessible colors (WCAG AA contrast)

**Owner:** Frontend Engineer 1
**Effort:** 2 days

**Mockup:**
```
┌────────────────────────────────────────┐
│ 🟦 Route 38  [Bus]                     │
│ │ 5 min  ✓ Live GPS                    │
│ │ ⊕ Downtown via Main St               │
│ │ ♿ Wheelchair accessible             │
└────────────────────────────────────────┘
```

---

### Task 1B.5: Implement Stop-Centric View

**Subtasks:**
- [ ] Create stop detail page layout (header + inbound + outbound sections)
- [ ] Display stop name + location (address, distance from user if available)
- [ ] Render inbound section (routes sorted by next arrival)
- [ ] Render outbound section (same structure)
- [ ] Each section shows ArrivalCards
- [ ] Add section toggle (if crowded, allow collapse/expand)
- [ ] Implement realtime updates (WebSocket or polling)
- [ ] Add favorite button (save stop)
- [ ] Add alerts button (get notifications)

**Acceptance Criteria:**
- [ ] Stop info displays correctly
- [ ] Inbound/Outbound sections render arrivals in order
- [ ] Realtime updates every 10-30 seconds without page refresh
- [ ] Favorite stop persists (localStorage)
- [ ] Layout responsive on mobile (stacked sections)

**Owner:** Frontend Engineer 2
**Effort:** 3-4 days

**Mockup:**
```
┌────────────────────────────────────────┐
│ Park Street Station                    │
│ Charles St, Downtown • 0.3 km away    │
├────────────────────────────────────────┤
│ INBOUND → Downtown                     │
│                                        │
│ ┌─ 🟦 Route 38   5 min ✓              │
│ ┌─ 🟩 Green Line  1 min ✓              │
│ ┌─ 🟦 Route 22   18 min ⊕              │
│                                        │
├────────────────────────────────────────┤
│ OUTBOUND → Suburbs                     │
│                                        │
│ ┌─ 🟦 Route 38   12 min ⊕              │
│ ┌─ 🔴 Route 57   10 min ⚠ Delayed      │
│                                        │
├────────────────────────────────────────┤
│ 🔔 Get alerts  📌 Add to favorites     │
└────────────────────────────────────────┘
```

---

### Task 1B.6: Implement Route-Centric View

**Subtasks:**
- [ ] Create route detail page layout (header + direction picker + stop sequence)
- [ ] Display route info (name, mode, vehicle count, service status)
- [ ] Add direction selector (if route has multiple directions)
- [ ] Render stop sequence as vertical list (scrollable)
- [ ] For each stop, show vehicles arriving + ETAs
- [ ] Display current vehicle highlighted (vehicle currently at this stop)
- [ ] Add crowding placeholder (Phase 2 will populate)
- [ ] Add map toggle (optional to show map)

**Acceptance Criteria:**
- [ ] Route info displays correctly
- [ ] Direction picker works smoothly
- [ ] Stop sequence renders all stops (100+ stops ok)
- [ ] Vehicle positions accurate
- [ ] No horizontal scroll on mobile

**Owner:** Frontend Engineer 2
**Effort:** 3 days

**Mockup:**
```
┌────────────────────────────────────────┐
│ 🚌 Route 38 (Forest Hills → Downtown)  │
│ 14 vehicles active | Service: Normal ✓ │
│ ← Direction: Downtown →                │
├────────────────────────────────────────┤
│ Stop Sequence:                         │
│                                        │
│ ⊙ Forest Hills                        │
│   └─ Veh#4421 arriving in 0 min       │
│      └─ Then Veh#4422 (11 min)        │
│                                        │
│ → Green Street                         │
│   └─ Veh#4421 arriving in 4 min       │
│      └─ Then Veh#4422 (15 min)        │
│                                        │
│ → Park Street ⭐                       │
│   └─ Veh#4421 arriving in 9 min  ♿  │
│      └─ Then Veh#4422 (20 min)        │
│                                        │
│ → Downtown Crossing (final)            │
│   └─ Veh#4421 arriving in 17 min      │
│                                        │
└────────────────────────────────────────┘
```

---

### Task 1B.7: Implement Vehicle-Centric View

**Subtasks:**
- [ ] Create vehicle detail page
- [ ] Display vehicle info (ID, route, current location, occupancy)
- [ ] Show driver name + photo (if available)
- [ ] Render next stops list (5 stops, with ETAs)
- [ ] Add current delay info (if running late)
- [ ] Add notification button (notify when reaching stop X)
- [ ] Add feedback button (report issue with this vehicle)
- [ ] Optional: show map with vehicle location

**Acceptance Criteria:**
- [ ] Vehicle info displays correctly
- [ ] Next stops render with accurate ETAs
- [ ] Notification request captures stop selection + time
- [ ] Mobile layout responsive

**Owner:** Frontend Engineer 2
**Effort:** 2 days

**Mockup:**
```
┌────────────────────────────────────────┐
│ 🚌 Bus #4421                           │
│ Route 38 (Downtown-bound)              │
│ Driver: James M. • Occupancy: 34/60    │
│ 📍 Currently: Green Street (4 min late)│
├────────────────────────────────────────┤
│ Next Stops:                            │
│                                        │
│ ➊ Park Street                          │
│   ETA: 9 min (scheduled: 8 min)       │
│   Stop #3 of 8                         │
│                                        │
│ ➋ Boylston                             │
│   ETA: 13 min                          │
│                                        │
│ ➌ Downtown Crossing (final)            │
│   ETA: 17 min                          │
│                                        │
├────────────────────────────────────────┤
│ 🔔 Notify me at Park Street            │
│ 📢 Send feedback about this trip       │
└────────────────────────────────────────┘
```

---

### Task 1B.8: Add Direction Toggle & Navigation

**Subtasks:**
- [ ] Create DirectionToggle component (inbound ↔ outbound switcher)
- [ ] Implement smooth transition between directions
- [ ] Handle routes with > 2 directions (e.g., loops)
- [ ] Add breadcrumb navigation (Search > Stop > Details)
- [ ] Implement browser back button (return to previous view)

**Acceptance Criteria:**
- [ ] Direction toggle switches instantly
- [ ] Breadcrumbs navigate correctly
- [ ] Browser back button works as expected

**Owner:** Frontend Engineer 1
**Effort:** 1 day

---

### Task 1B.9: Accessibility & Inclusive Design

**Subtasks:**
- [ ] Add semantic HTML (`<button>`, `<nav>`, `<main>`, etc.)
- [ ] Add ARIA labels (`aria-label`, `aria-describedby`)
- [ ] Ensure keyboard navigation (Tab, Enter, Escape)
- [ ] Implement skip links (jump to main content)
- [ ] Test with screen reader (NVDA or VoiceOver)
- [ ] Use high contrast colors (WCAG AA, contrast ratio > 4.5:1)
- [ ] Support dyslexia-friendly font option (via settings)
- [ ] Test with keyboard only (no mouse)

**Acceptance Criteria:**
- [ ] All interactive elements keyboard accessible
- [ ] Screen reader announces: route, time, status, alerts
- [ ] Color contrast ratios > 4.5:1 for text
- [ ] Dyslexia font option toggleable

**Owner:** Frontend Engineer 1 + QA
**Effort:** 2-3 days

---

### Task 1B.10: Mobile Optimization & Responsive Design

**Subtasks:**
- [ ] Test on iPhone 12, 14, 15 (Safari)
- [ ] Test on Android 12, 13, 14 (Chrome)
- [ ] Verify touch targets ≥ 44×44 px
- [ ] Optimize for small screens (font sizes, spacing)
- [ ] Remove horizontal scroll (mobile must be vertical scroll only)
- [ ] Optimize images (lazy load, responsive sizes)
- [ ] Test with slow network (throttle to 3G)
- [ ] Test offline mode (show cached data)

**Acceptance Criteria:**
- [ ] All views render correctly on mobile
- [ ] No horizontal scroll
- [ ] Touch targets accessible without zooming
- [ ] Loads < 5 seconds on 3G network

**Owner:** Frontend Engineer 1
**Effort:** 2-3 days

---

### Task 1B.11: Styling & Design System

**Subtasks:**
- [ ] Define color palette (mode colors: red for Red Line, etc.)
- [ ] Create typography system (font family, sizes, weights)
- [ ] Build spacing/grid system (4px base)
- [ ] Define component styles (buttons, cards, inputs)
- [ ] Create dark mode support (optional Phase 2)
- [ ] Document design tokens in Figma/Storybook

**Acceptance Criteria:**
- [ ] Consistent styling across all components
- [ ] Design tokens documented
- [ ] Storybook preview available (optional)

**Owner:** Frontend Lead + Designer
**Effort:** 2-3 days

---

## Sprint 1C: Integration & QA (Weeks 3-4)

### Task 1C.1: Connect Frontend to Backend APIs

**Subtasks:**
- [ ] Import fetch client library or axios
- [ ] Create API client wrapper (`lib/api.ts`)
- [ ] Implement search endpoint call (searchByQuery)
- [ ] Implement arrivals endpoint call (getStopArrivals)
- [ ] Implement route stops endpoint call (getRouteStops)
- [ ] Implement vehicle endpoint call (getVehicle)
- [ ] Add error handling (retry logic, user-friendly messages)
- [ ] Setup environment variables (API URL, endpoints)

**Acceptance Criteria:**
- [ ] All API calls integrated
- [ ] Error handling works (shows user-friendly messages)
- [ ] Environment variables configured
- [ ] Realtime data updates visible in UI

**Owner:** Frontend Engineer 1
**Effort:** 2 days

---

### Task 1C.2: End-to-End Testing

**Subtasks:**
- [ ] Write E2E test for search flow (open app → search → view results)
- [ ] Write E2E test for stop view (open stop → verify arrivals)
- [ ] Write E2E test for route view (open route → verify stop sequence)
- [ ] Write E2E test for vehicle view (open vehicle → verify next stops)
- [ ] Test address search (geocoding fallback)
- [ ] Test ambiguous queries (show multiple matches)
- [ ] Test empty results (no matches found)
- [ ] Test error scenarios (API down, network error)

**Acceptance Criteria:**
- [ ] All E2E tests pass
- [ ] Happy path + error paths covered
- [ ] No flaky tests

**Owner:** QA Engineer
**Effort:** 3 days

---

### Task 1C.3: Performance Audit

**Subtasks:**
- [ ] Measure Time to First Contentful Paint (FCP) - target < 1.5s
- [ ] Measure Time to Largest Contentful Paint (LCP) - target < 2.5s
- [ ] Measure Cumulative Layout Shift (CLS) - target < 0.1
- [ ] Measure bundle size - target < 150KB gzipped
- [ ] Profile JavaScript execution (DevTools)
- [ ] Identify slow components (render time > 100ms)
- [ ] Optimize if needed (code splitting, lazy loading, memoization)

**Acceptance Criteria:**
- [ ] FCP < 1.5s
- [ ] LCP < 2.5s
- [ ] CLS < 0.1
- [ ] Bundle < 150KB gzipped
- [ ] No jank on scroll (60 FPS)

**Owner:** Frontend Engineer 1
**Effort:** 2 days

---

### Task 1C.4: Accessibility Testing (Manual)

**Subtasks:**
- [ ] Test with VoiceOver (macOS) - read through entire flow
- [ ] Test with NVDA (Windows) - read through entire flow
- [ ] Test with keyboard only (no mouse, Tab to navigate)
- [ ] Verify ARIA labels are announced correctly
- [ ] Test skip links (jump to main content)
- [ ] Test form inputs (labels, error messages announced)
- [ ] Test page structure (headings, landmarks)

**Acceptance Criteria:**
- [ ] Screen reader can access all content
- [ ] Keyboard navigation complete (Tab, Enter, Escape work)
- [ ] ARIA labels announced clearly
- [ ] No keyboard traps

**Owner:** QA + Accessibility Specialist
**Effort:** 2-3 days

---

### Task 1C.5: Mobile Device Testing

**Subtasks:**
- [ ] Test on iPhone 12 (Safari)
- [ ] Test on iPhone 14 (Safari)
- [ ] Test on iPhone 15 (Safari)
- [ ] Test on Android 12 (Chrome)
- [ ] Test on Android 13 (Chrome)
- [ ] Test on Android 14 (Chrome)
- [ ] Verify on each device:
  - [ ] Text readable (no zoom needed)
  - [ ] Touch targets accessible
  - [ ] No horizontal scroll
  - [ ] Keyboard layout correct
  - [ ] Images load properly
  - [ ] Performance acceptable

**Acceptance Criteria:**
- [ ] All devices pass manual testing
- [ ] No layout shifts between devices
- [ ] Performance consistent

**Owner:** QA Engineer
**Effort:** 3 days

---

### Task 1C.6: Slow Network Testing

**Subtasks:**
- [ ] Throttle to 3G (slow-4g profile in DevTools)
- [ ] Verify loading spinner shows
- [ ] Verify data loads within reasonable time (5-10 sec)
- [ ] Test offline mode (cached data shown)
- [ ] Verify stale indicators shown (if data age > 2 min)

**Acceptance Criteria:**
- [ ] App loads within 10 seconds on 3G
- [ ] Loading states are clear
- [ ] Offline fallback works

**Owner:** QA Engineer
**Effort:** 1 day

---

### Task 1C.7: Staging Deployment

**Subtasks:**
- [ ] Build production bundle
- [ ] Deploy to staging environment
- [ ] Verify all endpoints responding
- [ ] Run smoke tests
- [ ] Verify environment variables correct
- [ ] Create rollback procedure
- [ ] Document deployment process

**Acceptance Criteria:**
- [ ] Staging deployment successful
- [ ] All endpoints accessible
- [ ] Smoke tests pass

**Owner:** DevOps / Backend Lead
**Effort:** 1-2 days

---

## Sprint 1D: Launch & Monitoring (Week 4)

### Task 1D.1: Soft Launch (Internal + Early Access)

**Subtasks:**
- [ ] Deploy to internal staging with tracking code
- [ ] Invite 50-100 early access users (company + beta testers)
- [ ] Collect feedback via survey
- [ ] Monitor error logs
- [ ] Measure key metrics (search accuracy, task completion)
- [ ] Fix critical issues
- [ ] Iterate based on feedback

**Acceptance Criteria:**
- [ ] Internal testing complete, feedback collected
- [ ] No critical bugs found
- [ ] Error rate < 1%

**Owner:** PM + Engineering
**Effort:** 2-3 days

---

### Task 1D.2: Gradual Rollout Strategy

**Subtasks:**
- [ ] Prepare gradual rollout (10% → 50% → 100% over 2 weeks)
- [ ] Setup feature flag (enable/disable map-free mode per user)
- [ ] Deploy v1.0.0 to 10% of production
- [ ] Monitor error metrics (target: < 0.5% error rate)
- [ ] Monitor latency (target: P95 < 350ms)
- [ ] Wait 24-48 hours, then roll to 50%
- [ ] Wait another 24-48 hours, then roll to 100%

**Acceptance Criteria:**
- [ ] Gradual rollout completes without major incidents
- [ ] SLOs maintained throughout rollout
- [ ] User feedback positive

**Owner:** PM + DevOps
**Effort:** Ongoing (over 2 weeks)

---

### Task 1D.3: Telemetry & Monitoring Dashboards

**Subtasks:**
- [ ] Create Grafana dashboard (search volume, latency, errors)
- [ ] Setup alerts (error rate > 1%, latency P95 > 500ms, availability < 99%)
- [ ] Create user analytics dashboard (search queries, results clicked, task completion)
- [ ] Track NPS (Net Promoter Score) survey
- [ ] Monitor server resources (CPU, memory, disk)
- [ ] Create incident runbooks (common issues, remediation steps)

**Acceptance Criteria:**
- [ ] Dashboards live and operational
- [ ] Alerts configured
- [ ] Runbooks documented

**Owner:** DevOps + Product
**Effort:** 2 days

---

### Task 1D.4: Documentation & Runbooks

**Subtasks:**
- [ ] Write user guide (how to search, interpret results, save favorites)
- [ ] Create troubleshooting doc (search not finding stops, arrivals delayed, etc.)
- [ ] Document API contracts (OpenAPI spec, Postman collection)
- [ ] Write deployment runbook (how to deploy Phase 1, rollback procedure)
- [ ] Create incident response playbook (handling outages)

**Acceptance Criteria:**
- [ ] Documentation complete and reviewable
- [ ] Runbooks tested (dry run)

**Owner:** Tech Writer + PM
**Effort:** 2 days

---

## Definition of Done (Phase 1)

✅ **Functional Requirements**
- [ ] Search parser accuracy > 95%
- [ ] Stop-centric view displays arrivals correctly
- [ ] Route-centric view displays stop sequence correctly
- [ ] Vehicle-centric view displays next stops correctly
- [ ] Autocomplete response time < 100ms
- [ ] Search response time < 350ms (P95)
- [ ] Realtime updates every 10-30 seconds

✅ **Performance & Reliability**
- [ ] Bundle size < 150KB gzipped
- [ ] Time to Largest Contentful Paint < 2.5s
- [ ] 60 FPS scroll performance
- [ ] Availability > 99.5%
- [ ] Error rate < 0.5%
- [ ] Database latency < 100ms (P95)

✅ **Accessibility & Usability**
- [ ] WCAG 2.1 Level AA compliance
- [ ] Screen reader testing passed
- [ ] Keyboard navigation complete
- [ ] Touch targets ≥ 44×44 px
- [ ] Task completion rate > 90%
- [ ] User NPS > 40

✅ **Testing**
- [ ] Unit test coverage > 85%
- [ ] Integration tests pass (100%)
- [ ] E2E tests pass (100%)
- [ ] Mobile device testing (6 devices, all pass)
- [ ] Accessibility testing (screen reader + keyboard)
- [ ] Load testing (100 QPS, P95 < 350ms)

✅ **Documentation & Deployment**
- [ ] User guide written
- [ ] API documentation complete
- [ ] Deployment runbook written
- [ ] Incident response playbook written
- [ ] Staging deployment successful
- [ ] Gradual rollout complete (10% → 50% → 100%)
- [ ] Telemetry dashboards live
- [ ] SLOs defined and monitored

---

## Next Steps

1. **Assign team members** to sprints (backend lead, frontend engineers 1-2)
2. **Lock sprint dates** (e.g., Week 1-2 for Sprint 1A)
3. **Setup JIRA/Linear** with all tasks above
4. **Kickoff Sprint 1A** with team
5. **Daily standups** to track progress
6. **Weekly demos** to stakeholders

**Phase 1 Timeline:** 4-6 weeks
**Team Size:** 4-5 people
**Expected Outcome:** Public beta of map-free search with > 40 NPS score
