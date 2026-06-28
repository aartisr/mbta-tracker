# MBTA Pending Tasks Master List

Generated: 2026-06-27

## Scope
This document tracks all currently pending tasks discovered from project docs (unchecked checklist items) and code-level TODO markers.

## Implementation Strategy (Modular + Plug-and-Play + Maintainable)
1. Prefer service modules with single responsibility (API clients, data mappers, view models).
2. Keep feature boundaries explicit (search, stop view, route view, vehicle view, offline, alerts).
3. Use typed contracts at boundary layers and avoid UI coupling to raw API payloads.
4. Add test coverage with each implementation step (unit first, then integration).
5. Maintain backward compatibility while replacing placeholders/TODOs.

## Current Execution Queue
- [x] StopView detailed interaction (replace TODO placeholder)
- [x] Server route stops endpoint implementation
- [x] Server vehicle info endpoint implementation
- [x] Web stops API TODO completion (accessibility + route mapping)
- [x] Search favorites support (persistent + modular)
- [x] Route detail page end-to-end implementation
- [x] Vehicle detail page end-to-end implementation
- [x] Offline mode fallback UX + stale indicators
- [x] Advanced alerts + notifications controls
- [x] Phase 2 accessibility baseline (high contrast + dyslexia font option)
- [x] Phase 2 crowdedness forecast + smart boarding
- [x] Phase 3 commute learning + emergency reroute + privacy flow
- [x] Phase 4 gamification roadmap + launch hardening checklist
- [x] One-liner external widget distribution bundle

## Completed In This Pass
- StopView TODO removed with detailed arrival panel and typed `arrivalSelected` event.
- `/api/route/:routeId/stops` now returns real MBTA-backed stop data.
- `/api/vehicle/:vehicleId` now returns vehicle details + next stops.
- `stops-api` TODOs replaced with route-stop mapping helper and accessibility inference.
- Search favorites implemented with persistent localStorage state and lightweight controls.
- Route detail flow implemented and wired from search results into dedicated `RouteView`.
- Vehicle detail flow implemented and wired from search results into dedicated `VehicleView`.
- Offline fallback utility added (`data-resilience`) and integrated across stop, route, and vehicle live data views with stale-age banners.
- Advanced `AlertCenter` controls implemented with severity/mode/text filters, sorting enhancements, and localStorage-backed browser notification preferences (including mute + severity subscriptions).
- Accessibility baseline for roadmap Phase 2 implemented in main app shell: persistent high-contrast toggle, dyslexia-friendly font toggle, and improved tablist semantics for navigation.
- Phase 2 backend implemented with deterministic crowding forecast engine and endpoints:
  - `GET /api/stop/:stopId/crowding-forecast`
  - `GET /api/route/:routeId/crowding-forecast`
  - `GET /api/boarding-suggestion?from=&to=&preference=`
- Phase 2 frontend implemented with crowding timeline and boarding suggestions in stop view, plus route stop crowding indicators and ArrivalCard crowding badge variant.
- Phase 3 backend implemented with commute learning and emergency reroute APIs:
  - `GET /api/my-commutes?session_id=`
  - `GET /api/commute-recommendation?from=&to=&session_id=`
  - `GET /api/emergency-reroute?from=&to=&disrupted_route=`
  - `GET /api/privacy-dashboard?session_id=`
  - `POST /api/privacy-consent`
- Phase 3 forecasting/ranking helper module added (`src/phase3-commute.ts`) with deterministic hash, commute summarization, departure window recommendation, and emergency alternative scoring.
- Phase 3 frontend home experience implemented with modular panels:
  - My Commutes panel (top patterns, trend chips, one-tap recommendation fetch)
  - Emergency reroute panel (disruption input, ranked alternatives, Accept Reroute, Remind Me)
  - Privacy control panel (opt-in/opt-out + history footprint)
- Phase 4 backend implemented with modular missions engine and endpoints:
  - `GET /api/missions?session_id=`
  - `POST /api/missions/track`
  - `GET /api/leaderboard?timeframe=&session_id=`
  - `GET/POST /api/mission-feedback`
  - `GET/POST /api/community-posts`
- Phase 4 mission domain module added (`src/phase4-missions.ts`) covering mission catalog, progress transitions, and leaderboard generation.
- Phase 4 frontend mission mode implemented in home search experience:
  - Mission hub cards with progress bars and mission tracking actions
  - Leaderboard panel with weekly/all-time toggle and user rank
  - Mission feedback loop form with recent suggestion count
  - Forum lite panel for posting and reading recent community discussions
  - Share achievement action integrated into mission cards
- Phase 4 architecture hardened for plug-and-play reuse:
  - Backend mission/community orchestration extracted into `src/phase4-service.ts` with a repository interface and in-memory adapter.
  - Frontend transport extracted into `src/lib/phase4-api.ts` and UI extracted into `src/lib/Phase4Hub.svelte`.
  - Home page now composes the Phase 4 experience through `Phase4Hub` instead of inline feature-specific state, API calls, and styles.
- Repo-wide modularization pass extended to Phase 3:
  - Backend commute/privacy flows extracted into `src/phase3-service.ts` with repository abstraction and deterministic domain operations.
  - Frontend commute/privacy transport extracted into `src/lib/phase3-api.ts` and UI extracted into `src/lib/Phase3Hub.svelte`.
  - Home page now composes both `Phase3Hub` and `Phase4Hub`, removing embedded Phase 3/4 feature state and panel-specific styles from `+page.svelte`.
- Remaining server composition refactor completed:
  - `src/api-server.ts` converted into a composition root that wires middleware, services, and route modules.
  - Route groups split into dedicated modules under `src/routes/` (`search-routes`, `transit-routes`, `phase3-routes`, `phase4-routes`, `system-routes`).
  - Shared API counters centralized in `src/api-metrics.ts` to keep observability consistent across modules.
- Launch hardening alignment included:
  - Leaderboard response includes explicit cache TTL metadata (300s)
  - Mission/community interactions emit telemetry events for engagement tracking
- One-liner external embed distribution completed:
  - Added dedicated browser entrypoint `src/lib/tracker/browser-entry.ts` that installs `window.MBTATracker` and auto-mounts on host pages.
  - Added dedicated widget build config `vite.widget.config.ts` for IIFE output under `dist-widget/mbta-tracker-widget.js`.
  - Inlined widget CSS into the JS bundle (single script include) via `vite-plugin-css-injected-by-js`.
  - Updated README with script-tag one-liner usage and configurable `data-*` attributes.
- Validation status:
  - Server tests: `apps/server` suite passed (8 files, 64 tests), including `phase3-service.test.ts`, `phase4-missions.test.ts`, and `phase4-service.test.ts`.
  - Web tests: full `apps/web` suite passed (13 files, 56 tests).
  - Web production build passed (non-blocking pre-existing Svelte unused-selector/chunk-size warnings remain).
  - Widget bundle build passed: `npm --workspace apps/web run build:widget`.

## Pending Inventory: Unchecked Doc Tasks

### doc/IMPLEMENTATION_START_HERE.md
42:- [ ] Execs review [`master-implementation-roadmap.md`](master-implementation-roadmap.md)
43:- [ ] Confirm 4-phase plan, timeline, resource allocation
44:- [ ] Decide: proceed with Phase 1 or iterate on roadmap?
47:- [ ] Product/Design review [`map-free-mode-feature.md`](map-free-mode-feature.md)
48:- [ ] Refine layouts, UX flows
49:- [ ] Create Figma prototypes (optional, useful for front-end kickoff)
52:- [ ] Engineering leads review [`phase-1-detailed-tasks.md`](phase-1-detailed-tasks.md)
53:- [ ] Identify resource gaps, hiring needs
54:- [ ] Estimate real effort (may differ from 4-6 weeks based on team)
57:- [ ] Kick-off meeting (all stakeholders)
58:- [ ] Confirm Phase 1 start date
59:- [ ] Assign sprint owners (Backend Lead, Frontend Lead, PM)
64:- [ ] Setup git repo structure (`apps/server/` for new search service)
65:- [ ] Create API clients/SDKs
66:- [ ] Begin Sprint 1A tasks (search parser, resolver, autocomplete)
69:- [ ] Setup SvelteKit project structure (`apps/web/src/routes/search`)
70:- [ ] Create component library scaffolding
71:- [ ] Begin Sprint 1B tasks (SearchBox, ArrivalCard, views)
74:- [ ] Create detailed task board in Jira/Linear
75:- [ ] Setup daily standup rhythm (10:30 AM daily, 15 min)
76:- [ ] Plan weekly demos (Friday 4 PM)
81:- [ ] 10:30 AM: 15-min standup (each person: yesterday, today, blockers)
82:- [ ] Async updates in Slack/Jira
85:- [ ] Friday 4 PM: 30-min demo to stakeholders
86:- [ ] Friday 5 PM: retrospective (team only, what went well, what to improve)
89:- [ ] Sprint planning (next 2-week sprint)
90:- [ ] Review metrics (search accuracy, API latency, errors)
166:- [ ] Commits pushed
167:- [ ] Tests passing
168:- [ ] Blockers filed + resolved
171:- [ ] Sprint velocity (story points completed)
172:- [ ] Bug count (critical vs minor)
173:- [ ] Team morale (retro feedback)
221:- [ ] All stakeholders read [`master-implementation-roadmap.md`](master-implementation-roadmap.md)
222:- [ ] Confirm Phase 1 scope and timeline
223:- [ ] Assign team members
224:- [ ] Setup Jira/Linear project
225:- [ ] Schedule daily standups
228:- [ ] Allocate team members
229:- [ ] Setup dev environment
230:- [ ] Create git branches for Phase 1
231:- [ ] Begin Sprint 1A tasks
232:- [ ] First demo scheduled
235:- [ ] Halfway checkpoint
236:- [ ] Review velocity
237:- [ ] Adjust estimates if needed
238:- [ ] Plan Phase 2 prep tasks
241:- [ ] All Definition of Done criteria met
242:- [ ] Soft launch complete
243:- [ ] Gradual rollout initiated
244:- [ ] Phase 2 planning begins

### doc/master-implementation-roadmap.md
77:- [ ] Create `/api/search` endpoint (route, stop, address, vehicle, landmark resolution)
78:- [ ] Implement query parser + resolver (handle ambiguity, typos, aliases)
79:- [ ] Build autocomplete index (inverted prefix tree with geohashing for addresses)
80:- [ ] Add /api/stop/{stopId}/arrivals endpoint (realtime arrivals grouped by route + direction)
81:- [ ] Add /api/route/{routeId}/stops endpoint (stop sequence with live vehicles)
82:- [ ] Add /api/vehicle/{vehicleId} endpoint (current location, next stops, occupancy)
85:- [ ] Cache MBTA stops, routes, schedules locally (6-hour TTL)
86:- [ ] Implement arrival data cache (30-second TTL for realtime)
87:- [ ] Setup Redis or in-memory cache layer
88:- [ ] Create offline mode fallback (show cached schedules with stale indicators)
91:- [ ] Unit tests for search parser (accuracy > 95%)
92:- [ ] Integration tests for API endpoints (latency targets: < 350ms P95)
93:- [ ] Load test search endpoint (handle 100+ QPS)
94:- [ ] Deploy to staging
99:- [ ] Build SearchBox component (text input + recent/favorites + voice input placeholder)
100:- [ ] Implement autocomplete dropdown (routes, stops, recent searches)
101:- [ ] Create ArrivalCard component (route + time + status + badges)
102:- [ ] Build DirectionToggle (inbound/outbound switcher)
103:- [ ] Setup responsive layout for mobile-first (no horizontal scroll)
106:- [ ] Implement stop detail page
107:- [ ] Display inbound/outbound sections side-by-side (or stacked on mobile)
108:- [ ] Render arrival timings with live badges (Live GPS / Scheduled)
109:- [ ] Show delay/alert badges inline
110:- [ ] Handle empty state (no arrivals)
113:- [ ] Build route detail page with stop sequence list
114:- [ ] Implement linear stop progression (top to bottom)
115:- [ ] Display vehicle indicators at each stop
116:- [ ] Add vehicle detail page with next stops + occupancy
117:- [ ] Handle multi-direction routes (picker)
120:- [ ] Ensure WCAG 2.1 Level AA compliance
121:- [ ] Setup dyslexia-friendly fonts (or OpenDyslexic option)
122:- [ ] High contrast mode support
123:- [ ] Screen reader testing (initial pass)
128:- [ ] Connect frontend to backend search APIs
129:- [ ] Test autocomplete latency (target < 100ms)
130:- [ ] Verify arrival times update in realtime
131:- [ ] Test offline mode graceful degradation
134:- [ ] Test on iPhone 12, 14, 15 (Safari)
135:- [ ] Test on Android 12, 13, 14 (Chrome)
136:- [ ] Verify touch targets ≥ 44×44 px
137:- [ ] Test landscape mode (optional Phase 2)
140:- [ ] Measure Time to First Meaningful Paint (target < 1s)
141:- [ ] Ensure 60 FPS on scroll (arrival lists)
142:- [ ] Profile bundle size (keep < 150KB gzipped)
145:- [ ] 5-user accessibility testing (screen reader + keyboard navigation)
146:- [ ] Cognitive load testing (find next bus for 3 common use cases)
147:- [ ] Task completion rate (target > 90%)
152:- [ ] Deploy to staging environment
153:- [ ] Internal team + early access users (50-100 people)
154:- [ ] Collect feedback on search accuracy + UX
157:- [ ] Gradual rollout (10% → 50% → 100% over 2 weeks)
158:- [ ] Setup telemetry dashboards (search volume, task completion, errors)
159:- [ ] Define SLOs: Search latency P95 < 350ms, availability > 99.5%
160:- [ ] Create runbooks for common issues
163:- [ ] Write user guide for map-free mode
164:- [ ] Create troubleshooting doc (search not finding stops, etc.)
165:- [ ] Document API contracts for future features
183:- [ ] Ingest vehicle occupancy from realtime feed (occupancy_percent field)
184:- [ ] Store historical crowding observations (stop_id, route_id, time_of_day, dow, occupancy_percent)
185:- [ ] Build crowding forecast model (time-series prediction: 5/15/30/60 min ahead)
186:- [ ] Create `/api/stop/{stopId}/crowding-forecast` endpoint (timeline data)
187:- [ ] Create `/api/route/{routeId}/crowding-forecast` endpoint
190:- [ ] Implement vehicle selection logic (minimize: wait_time + transfer_count + crowding + delay)
191:- [ ] Create `/api/boarding-suggestion?from={stop}&to={stop}&depart_after={time}` endpoint
192:- [ ] Return top 3 options (best overall + fastest + least crowded)
193:- [ ] Handle disruption scenarios (reroute if service down)
194:- [ ] Support accessibility filters (wheelchair, bike rack, etc.)
197:- [ ] Add crowding timeline to stop-centric view (swipeable chart)
198:- [ ] Add crowding indicator to route-centric view (dots/colors for each stop)
199:- [ ] Build ArrivalCard variant with crowding badge
200:- [ ] Implement "pick your window" UI (swipe to see crowding at different times)
203:- [ ] Build boarding suggestion card (option 1, 2, 3 with trade-offs shown)
204:- [ ] Add toggle between "fastest", "least crowded", "cheapest fare"
205:- [ ] Show wait time, transfers, crowding, accessibility icons
206:- [ ] "Accept" → add to trip planner (Phase 3 prep)
209:- [ ] Setup occupancy ingestion from vehicle realtime feed
210:- [ ] Create data warehouse for crowding observations (Parquet + DuckDB or similar)
211:- [ ] Build daily aggregation job (compute crowding stats by stop/route/time)
212:- [ ] Implement feature pipeline for ML model (lag features, day-of-week, seasonality)
215:- [ ] Validate forecast accuracy (RMSE < 15% for occupancy predictions)
216:- [ ] A/B test smart boarding suggestions (control vs treatment)
217:- [ ] Performance test crowding forecast (compute must be < 200ms)
218:- [ ] Gradual rollout (10% → 50% → 100%)
236:- [ ] Create user_commutes table (opt-in: capture user_id, from_stop, to_stop, departure_time, dow)
237:- [ ] Implement commute pattern detection (K-means clustering on (stop_pair, time_of_day))
238:- [ ] Build departure time recommender (suggest optimal times to minimize wait)
239:- [ ] Create `/api/my-commutes` endpoint (authenticated, privacy-scoped)
240:- [ ] Create `/api/commute-recommendation?from={stop}&to={stop}` endpoint
243:- [ ] Setup service disruption detection (scan MBTA alerts for "service suspended", "bus diversion", etc.)
244:- [ ] Implement graph search (compute alternative routes when disruption detected)
245:- [ ] Create `/api/emergency-reroute?from={stop}&to={stop}&disrupted_route={route}` endpoint
246:- [ ] Return alternatives ranked by (distance_increase, time_penalty, accessibility_support)
247:- [ ] Setup push notification pipeline (opt-in, location-scoped alerts)
250:- [ ] Add "My Commutes" panel to home (top 3 favorite routes)
251:- [ ] Show "Next train/bus for [Commute Name]" with one-tap access
252:- [ ] Implement bookmark/favorite commute feature
253:- [ ] Display suggested departure times (AI recommendation)
254:- [ ] Show commute time trend (is it getting slower? faster?)
257:- [ ] Create high-priority alert banner (red background, text + icon)
258:- [ ] Show alternative routes suggestion inline
259:- [ ] Add "Accept reroute" button (logs event for ML feedback)
260:- [ ] Support "Remind me at [time]" for delayed service recovery
263:- [ ] Implement privacy-first commute capture (hashed user_id, anonymized after 90 days)
264:- [ ] Create user consent flow (opt-in for commute learning)
265:- [ ] Build privacy dashboard (see/delete commute history)
266:- [ ] Audit commute data retention policy
269:- [ ] Test rerouting accuracy (manual paths for 10 disruption scenarios)
270:- [ ] Validate commute pattern detection (> 85% accuracy on test set)
271:- [ ] Simulate emergency disruption scenario
272:- [ ] Privacy audit (GDPR/CCPA compliance check)
273:- [ ] Phased rollout with privacy safeguards
290:- [ ] Design mission catalog (50+ challenges: "Ride to Airport Station", "Explore Blue Line", etc.)
291:- [ ] Create `/api/missions` endpoint (current + available missions)
292:- [ ] Build mission completion tracking (capture user journey_start → journey_end events)
293:- [ ] Implement achievement/badge system
294:- [ ] Create `/api/leaderboard` endpoint (weekly/all-time rankings)
297:- [ ] Build mission card (name, description, progress bar, reward icon)
298:- [ ] Create mission list view (available + in-progress + completed)
299:- [ ] Display achievement badges (visual gallery)
300:- [ ] Show leaderboard (top 10 this week, your rank)
301:- [ ] Add "Share achievement" buttons (Twitter/social)
304:- [ ] Build community forum/discussion (lite version, moderated)
305:- [ ] Create mission feedback loop (users suggest new missions)
306:- [ ] Setup weekly mission rotation (theme: "Summer exploration")
307:- [ ] Create email digest (weekly mission digest)
310:- [ ] Load test leaderboard (100K+ users updating simultaneously)
311:- [ ] Verify mission completion tracking doesn't impact app performance
312:- [ ] Cache leaderboard (updated every 5 minutes)
313:- [ ] Monitor telemetry for mission engagement
316:- [ ] Visual design refinement (design system audit)
317:- [ ] Accessibility re-test (WCAG AA compliance)
318:- [ ] Mobile landscape support (if needed)
319:- [ ] Offline mode enhancements
320:- [ ] Documentation updates

### doc/phase-1-detailed-tasks.md
16:- [ ] Define `SearchQuery` model (query_string, query_type, filters)
17:- [ ] Define `SearchResult` union type (RouteResult | StopResult | VehicleResult | AddressResult)
18:- [ ] Design ambiguity resolution strategy (show top 3 matches if uncertain)
19:- [ ] Create `ArrivalForecast` model (stop_id, route_id, direction, arrivals[], eta_seconds, scheduled_seconds)
20:- [ ] Design error responses (malformed query, no matches, service unavailable)
21:- [ ] Document API contracts in OpenAPI/Swagger
24:- [ ] OpenAPI spec complete and reviewable
25:- [ ] Schema supports all 5 query types (route, stop, address, vehicle, landmark)
26:- [ ] Response examples provided for each query type
36:- [ ] Build tokenizer (split, lowercase, remove punctuation)
37:- [ ] Implement route recognizer (patterns: "38", "Route 38", "38 bus", "red line", etc.)
38:- [ ] Implement stop recognizer (fuzzy match against stop names + IDs)
39:- [ ] Implement address recognizer (regex + geocoder fallback)
40:- [ ] Implement vehicle recognizer (patterns: "veh-4421", "#4421", "bus 4421")
41:- [ ] Implement landmark recognizer (known landmarks dict + fuzzy match)
42:- [ ] Add typo tolerance (Levenshtein distance for close misses)
45:- [ ] Parser accuracy > 95% on test set (50+ sample queries)
46:- [ ] Handles ambiguous inputs gracefully (returns 3 candidates ranked by confidence)
47:- [ ] No false positives (e.g., "38" correctly disambiguated as route vs bus number)
48:- [ ] Unit test coverage > 90%
69:- [ ] Create query resolver (dispatch to route/stop/address/vehicle/landmark handlers)
70:- [ ] Implement route resolution (lookup in MBTA routes, return route_id + name)
71:- [ ] Implement stop resolution (lookup in MBTA stops, return stop_id + location)
72:- [ ] Implement address resolution (integrate geocoding service like Mapbox or Google Maps)
73:- [ ] Implement vehicle resolution (lookup in realtime vehicle feed)
74:- [ ] Implement landmark resolution (known landmarks map + geohashing for nearby stops)
75:- [ ] Add result ranking (confidence score, distance, recency)
78:- [ ] Resolver returns results within 200ms (P95)
79:- [ ] Address geocoding API calls cached (reduce external calls by 80%)
80:- [ ] All result types ranked consistently (confidence, distance, recency)
81:- [ ] Fallback behavior when external services unavailable
91:- [ ] Design prefix tree (trie) for stops + routes + vehicles
92:- [ ] Implement trie insert + search (character-by-character completion)
93:- [ ] Add geohashing for address prefixes (enable location-based suggestions)
94:- [ ] Populate trie from MBTA data (stops, routes, vehicle IDs)
95:- [ ] Cache in Redis or in-memory store
96:- [ ] Implement refresh job (run nightly, update stops/routes/vehicles)
99:- [ ] Autocomplete response time < 100ms (P95)
100:- [ ] Returns top 10 suggestions for any prefix (1-3 characters)
101:- [ ] Suggestions ranked by popularity (rider frequency if available, else alphabetical)
102:- [ ] Memory footprint < 50MB (compressed trie)
120:- [ ] Query MBTA predictions API for stop (include ?include=route,trip)
121:- [ ] Group arrivals by route + direction (inbound vs outbound)
122:- [ ] Map route direction_id to readable direction name (lookup from route definition)
123:- [ ] Compute eta_seconds = predicted arrival - now (handle past predictions)
124:- [ ] Enrich with trip.headsign (destination) if available
125:- [ ] Add live/scheduled badge (vehicle has realtime data vs schedule)
126:- [ ] Add delay indicator (if predicted > scheduled)
127:- [ ] Add service alerts (from /alerts endpoint, filter by stop + route)
130:- [ ] Response time < 350ms (P95)
131:- [ ] Handles stops with > 50 arrivals gracefully (return top 20, with "load more" option)
132:- [ ] Correctly maps direction_id to human-readable direction
133:- [ ] Headsigns populated for 90%+ of arrivals
134:- [ ] Delay badges accurate to ±1 minute
167:- [ ] Query MBTA shape + stops for route (ordered by position in sequence)
168:- [ ] For each direction, return stop sequence (stop_id, stop_name, sequence_position)
169:- [ ] Get current vehicles on route (from realtime feed)
170:- [ ] For each vehicle, find current stop index (closest to vehicle location)
171:- [ ] Return vehicle list per stop (next 3 arrivals)
172:- [ ] Add accessibility info (wheelchair accessible, bike racks, etc.)
173:- [ ] Add estimated crowding if available (Phase 2 placeholder)
176:- [ ] Response time < 350ms (P95)
177:- [ ] Stop sequence accurate (matches MBTA shape data)
178:- [ ] Vehicle assignments to stops within 2-stop tolerance
179:- [ ] Accessibility badges for 90%+ of stops
180:- [ ] Handles routes with 100+ stops without timeout
218:- [ ] Query realtime vehicle feed by ID
219:- [ ] Return current location (lat, lon, heading)
220:- [ ] Return current route + trip
221:- [ ] Return next 5 stops from current trip
222:- [ ] Compute ETA for each next stop (based on vehicle speed + distance)
223:- [ ] Return occupancy (if available from vehicle telemetry)
224:- [ ] Add trip end time (when vehicle finishes route)
227:- [ ] Response time < 200ms (P95)
228:- [ ] Handles non-existent vehicle IDs gracefully (404)
229:- [ ] Location accurate to ±50 meters (from MBTA feed)
230:- [ ] Next stops include headsign + accessibility info
231:- [ ] Occupancy field optional (Phase 1 may not have this data)
259:- [ ] Integrate Redis (or in-memory cache) for stops, routes, schedules
260:- [ ] Setup MBTA data refresh job (6-hour TTL)
261:- [ ] Cache predictions with 30-second TTL
262:- [ ] Implement fallback to cached data if API unavailable
263:- [ ] Add stale data indicators (e.g., "Last updated 5 min ago")
264:- [ ] Setup cache invalidation on alerts (clear immediately when disruption)
267:- [ ] Cache hit rate > 90% for repeated queries
268:- [ ] Cache refresh job completes < 5 seconds
269:- [ ] No cascade failures if MBTA API down
270:- [ ] Stale indicators shown when cache age > 2 minutes
280:- [ ] Write load test (Apache JMeter or K6)
281:- [ ] Simulate 100 QPS search traffic (realistic peak)
282:- [ ] Profile database queries (find N+1 problems)
283:- [ ] Measure response time distributions (p50, p95, p99)
284:- [ ] Identify bottlenecks (database, API calls, compute)
285:- [ ] Tune indexes, connection pools, query optimization
286:- [ ] Verify targets met: < 350ms P95
289:- [ ] 100 QPS sustained with < 350ms P95 latency
290:- [ ] No memory leaks (sustained load 10 min)
291:- [ ] CPU usage < 70% at peak traffic
292:- [ ] Database query time < 100ms per search
302:- [ ] Write unit tests for query parser (test cases: routes, stops, addresses, vehicles, landmarks)
303:- [ ] Write unit tests for resolver (mocked MBTA API calls)
304:- [ ] Write integration tests for search endpoint (real MBTA data)
305:- [ ] Write integration tests for arrivals endpoint
306:- [ ] Write integration tests for route/stops endpoint
307:- [ ] Write integration tests for vehicle endpoint
308:- [ ] Achieve > 85% code coverage
311:- [ ] All tests pass
312:- [ ] Code coverage > 85%
313:- [ ] Test runtime < 30 seconds
323:- [ ] Write OpenAPI/Swagger docs for all endpoints
324:- [ ] Create Postman collection for manual testing
325:- [ ] Write runbooks (common failures, debugging)
326:- [ ] Deploy to staging environment
327:- [ ] Verify endpoints accessible from staging
328:- [ ] Document environment variables (API keys, URLs)
331:- [ ] OpenAPI spec complete and reviewable by FE team
332:- [ ] Staging deployment passes smoke tests
333:- [ ] All endpoints respond from staging environment
345:- [ ] Create SvelteKit route structure (`+page.svelte` for search, layout)
346:- [ ] Setup component library structure (`lib/components/` folder)
347:- [ ] Configure TypeScript strict mode
348:- [ ] Setup Vitest for unit tests
349:- [ ] Configure Tailwind CSS (or custom CSS framework)
350:- [ ] Setup ESLint + Prettier
351:- [ ] Add bundle size analyzer
354:- [ ] Project scaffolding complete
355:- [ ] TypeScript strict mode passes
356:- [ ] First component renders without errors
357:- [ ] Build produces dist/ folder
367:- [ ] Create input field (text, placeholder "Search by route, stop, or address...")
368:- [ ] Implement onChange handler → call autocomplete API
369:- [ ] Display autocomplete dropdown (10 suggestions max)
370:- [ ] Handle keyboard navigation (arrow keys, enter)
371:- [ ] Show recent searches (localStorage, max 10)
372:- [ ] Show favorite searches (if available)
373:- [ ] Add voice input placeholder (Phase 2)
374:- [ ] Handle mobile keyboard (show on focus, dismiss on blur)
377:- [ ] Input accepts text, special characters
378:- [ ] Autocomplete shows < 100ms after typing
379:- [ ] Keyboard navigation works (arrows, enter, escape)
380:- [ ] Recent searches persist across sessions
381:- [ ] Mobile keyboard doesn't break layout
382:- [ ] Accessibility: labeling, ARIA attributes
408:- [ ] Create search results page (handles empty state, loading, error states)
409:- [ ] Implement dynamic layout based on result type (RouteLayout, StopLayout, etc.)
410:- [ ] Add loading spinner (while fetching results)
411:- [ ] Add error message (if search fails)
412:- [ ] Add empty state (no results found, try another search)
413:- [ ] Implement back button (return to search)
414:- [ ] Add result metadata (e.g., "Found 3 stops near downtown")
417:- [ ] Layout adapts to all result types
418:- [ ] Loading state shows within 100ms
419:- [ ] Error messages are helpful (not generic)
420:- [ ] Empty state encourages alternative search
421:- [ ] No horizontal scroll on mobile
431:- [ ] Create card layout (route + time + status)
432:- [ ] Display route info (route number, mode icon, headsign)
433:- [ ] Display arrival time (countdown, e.g., "5 min", "on-time", "delayed +3 min")
434:- [ ] Add status badges (Live GPS, Scheduled, Delayed, Alert)
435:- [ ] Add accessibility icons (wheelchair, bike rack)
436:- [ ] Add hover/tap effects (highlight, show details)
437:- [ ] Implement color coding by mode (red for Red Line, green for Green, etc.)
440:- [ ] Card renders correctly for all mode types
441:- [ ] Time displays in human-readable format
442:- [ ] Status badges clear and visible
443:- [ ] Touch targets ≥ 44×44 px
444:- [ ] Accessible colors (WCAG AA contrast)
464:- [ ] Create stop detail page layout (header + inbound + outbound sections)
465:- [ ] Display stop name + location (address, distance from user if available)
466:- [ ] Render inbound section (routes sorted by next arrival)
467:- [ ] Render outbound section (same structure)
468:- [ ] Each section shows ArrivalCards
469:- [ ] Add section toggle (if crowded, allow collapse/expand)
470:- [ ] Implement realtime updates (WebSocket or polling)
471:- [ ] Add favorite button (save stop)
472:- [ ] Add alerts button (get notifications)
475:- [ ] Stop info displays correctly
476:- [ ] Inbound/Outbound sections render arrivals in order
477:- [ ] Realtime updates every 10-30 seconds without page refresh
478:- [ ] Favorite stop persists (localStorage)
479:- [ ] Layout responsive on mobile (stacked sections)
512:- [ ] Create route detail page layout (header + direction picker + stop sequence)
513:- [ ] Display route info (name, mode, vehicle count, service status)
514:- [ ] Add direction selector (if route has multiple directions)
515:- [ ] Render stop sequence as vertical list (scrollable)
516:- [ ] For each stop, show vehicles arriving + ETAs
517:- [ ] Display current vehicle highlighted (vehicle currently at this stop)
518:- [ ] Add crowding placeholder (Phase 2 will populate)
519:- [ ] Add map toggle (optional to show map)
522:- [ ] Route info displays correctly
523:- [ ] Direction picker works smoothly
524:- [ ] Stop sequence renders all stops (100+ stops ok)
525:- [ ] Vehicle positions accurate
526:- [ ] No horizontal scroll on mobile
563:- [ ] Create vehicle detail page
564:- [ ] Display vehicle info (ID, route, current location, occupancy)
565:- [ ] Show driver name + photo (if available)
566:- [ ] Render next stops list (5 stops, with ETAs)
567:- [ ] Add current delay info (if running late)
568:- [ ] Add notification button (notify when reaching stop X)
569:- [ ] Add feedback button (report issue with this vehicle)
570:- [ ] Optional: show map with vehicle location
573:- [ ] Vehicle info displays correctly
574:- [ ] Next stops render with accurate ETAs
575:- [ ] Notification request captures stop selection + time
576:- [ ] Mobile layout responsive
612:- [ ] Create DirectionToggle component (inbound ↔ outbound switcher)
613:- [ ] Implement smooth transition between directions
614:- [ ] Handle routes with > 2 directions (e.g., loops)
615:- [ ] Add breadcrumb navigation (Search > Stop > Details)
616:- [ ] Implement browser back button (return to previous view)
619:- [ ] Direction toggle switches instantly
620:- [ ] Breadcrumbs navigate correctly
621:- [ ] Browser back button works as expected
631:- [ ] Add semantic HTML (`<button>`, `<nav>`, `<main>`, etc.)
632:- [ ] Add ARIA labels (`aria-label`, `aria-describedby`)
633:- [ ] Ensure keyboard navigation (Tab, Enter, Escape)
634:- [ ] Implement skip links (jump to main content)
635:- [ ] Test with screen reader (NVDA or VoiceOver)
636:- [ ] Use high contrast colors (WCAG AA, contrast ratio > 4.5:1)
637:- [ ] Support dyslexia-friendly font option (via settings)
638:- [ ] Test with keyboard only (no mouse)
641:- [ ] All interactive elements keyboard accessible
642:- [ ] Screen reader announces: route, time, status, alerts
643:- [ ] Color contrast ratios > 4.5:1 for text
644:- [ ] Dyslexia font option toggleable
654:- [ ] Test on iPhone 12, 14, 15 (Safari)
655:- [ ] Test on Android 12, 13, 14 (Chrome)
656:- [ ] Verify touch targets ≥ 44×44 px
657:- [ ] Optimize for small screens (font sizes, spacing)
658:- [ ] Remove horizontal scroll (mobile must be vertical scroll only)
659:- [ ] Optimize images (lazy load, responsive sizes)
660:- [ ] Test with slow network (throttle to 3G)
661:- [ ] Test offline mode (show cached data)
664:- [ ] All views render correctly on mobile
665:- [ ] No horizontal scroll
666:- [ ] Touch targets accessible without zooming
667:- [ ] Loads < 5 seconds on 3G network
677:- [ ] Define color palette (mode colors: red for Red Line, etc.)
678:- [ ] Create typography system (font family, sizes, weights)
679:- [ ] Build spacing/grid system (4px base)
680:- [ ] Define component styles (buttons, cards, inputs)
681:- [ ] Create dark mode support (optional Phase 2)
682:- [ ] Document design tokens in Figma/Storybook
685:- [ ] Consistent styling across all components
686:- [ ] Design tokens documented
687:- [ ] Storybook preview available (optional)
699:- [ ] Import fetch client library or axios
700:- [ ] Create API client wrapper (`lib/api.ts`)
701:- [ ] Implement search endpoint call (searchByQuery)
702:- [ ] Implement arrivals endpoint call (getStopArrivals)
703:- [ ] Implement route stops endpoint call (getRouteStops)
704:- [ ] Implement vehicle endpoint call (getVehicle)
705:- [ ] Add error handling (retry logic, user-friendly messages)
706:- [ ] Setup environment variables (API URL, endpoints)
709:- [ ] All API calls integrated
710:- [ ] Error handling works (shows user-friendly messages)
711:- [ ] Environment variables configured
712:- [ ] Realtime data updates visible in UI
722:- [ ] Write E2E test for search flow (open app → search → view results)
723:- [ ] Write E2E test for stop view (open stop → verify arrivals)
724:- [ ] Write E2E test for route view (open route → verify stop sequence)
725:- [ ] Write E2E test for vehicle view (open vehicle → verify next stops)
726:- [ ] Test address search (geocoding fallback)
727:- [ ] Test ambiguous queries (show multiple matches)
728:- [ ] Test empty results (no matches found)
729:- [ ] Test error scenarios (API down, network error)
732:- [ ] All E2E tests pass
733:- [ ] Happy path + error paths covered
734:- [ ] No flaky tests
744:- [ ] Measure Time to First Contentful Paint (FCP) - target < 1.5s
745:- [ ] Measure Time to Largest Contentful Paint (LCP) - target < 2.5s
746:- [ ] Measure Cumulative Layout Shift (CLS) - target < 0.1
747:- [ ] Measure bundle size - target < 150KB gzipped
748:- [ ] Profile JavaScript execution (DevTools)
749:- [ ] Identify slow components (render time > 100ms)
750:- [ ] Optimize if needed (code splitting, lazy loading, memoization)
753:- [ ] FCP < 1.5s
754:- [ ] LCP < 2.5s
755:- [ ] CLS < 0.1
756:- [ ] Bundle < 150KB gzipped
757:- [ ] No jank on scroll (60 FPS)
767:- [ ] Test with VoiceOver (macOS) - read through entire flow
768:- [ ] Test with NVDA (Windows) - read through entire flow
769:- [ ] Test with keyboard only (no mouse, Tab to navigate)
770:- [ ] Verify ARIA labels are announced correctly
771:- [ ] Test skip links (jump to main content)
772:- [ ] Test form inputs (labels, error messages announced)
773:- [ ] Test page structure (headings, landmarks)
776:- [ ] Screen reader can access all content
777:- [ ] Keyboard navigation complete (Tab, Enter, Escape work)
778:- [ ] ARIA labels announced clearly
779:- [ ] No keyboard traps
789:- [ ] Test on iPhone 12 (Safari)
790:- [ ] Test on iPhone 14 (Safari)
791:- [ ] Test on iPhone 15 (Safari)
792:- [ ] Test on Android 12 (Chrome)
793:- [ ] Test on Android 13 (Chrome)
794:- [ ] Test on Android 14 (Chrome)
795:- [ ] Verify on each device:
804:- [ ] All devices pass manual testing
805:- [ ] No layout shifts between devices
806:- [ ] Performance consistent
816:- [ ] Throttle to 3G (slow-4g profile in DevTools)
817:- [ ] Verify loading spinner shows
818:- [ ] Verify data loads within reasonable time (5-10 sec)
819:- [ ] Test offline mode (cached data shown)
820:- [ ] Verify stale indicators shown (if data age > 2 min)
823:- [ ] App loads within 10 seconds on 3G
824:- [ ] Loading states are clear
825:- [ ] Offline fallback works
835:- [ ] Build production bundle
836:- [ ] Deploy to staging environment
837:- [ ] Verify all endpoints responding
838:- [ ] Run smoke tests
839:- [ ] Verify environment variables correct
840:- [ ] Create rollback procedure
841:- [ ] Document deployment process
844:- [ ] Staging deployment successful
845:- [ ] All endpoints accessible
846:- [ ] Smoke tests pass
858:- [ ] Deploy to internal staging with tracking code
859:- [ ] Invite 50-100 early access users (company + beta testers)
860:- [ ] Collect feedback via survey
861:- [ ] Monitor error logs
862:- [ ] Measure key metrics (search accuracy, task completion)
863:- [ ] Fix critical issues
864:- [ ] Iterate based on feedback
867:- [ ] Internal testing complete, feedback collected
868:- [ ] No critical bugs found
869:- [ ] Error rate < 1%
879:- [ ] Prepare gradual rollout (10% → 50% → 100% over 2 weeks)
880:- [ ] Setup feature flag (enable/disable map-free mode per user)
881:- [ ] Deploy v1.0.0 to 10% of production
882:- [ ] Monitor error metrics (target: < 0.5% error rate)
883:- [ ] Monitor latency (target: P95 < 350ms)
884:- [ ] Wait 24-48 hours, then roll to 50%
885:- [ ] Wait another 24-48 hours, then roll to 100%
888:- [ ] Gradual rollout completes without major incidents
889:- [ ] SLOs maintained throughout rollout
890:- [ ] User feedback positive
900:- [ ] Create Grafana dashboard (search volume, latency, errors)
901:- [ ] Setup alerts (error rate > 1%, latency P95 > 500ms, availability < 99%)
902:- [ ] Create user analytics dashboard (search queries, results clicked, task completion)
903:- [ ] Track NPS (Net Promoter Score) survey
904:- [ ] Monitor server resources (CPU, memory, disk)
905:- [ ] Create incident runbooks (common issues, remediation steps)
908:- [ ] Dashboards live and operational
909:- [ ] Alerts configured
910:- [ ] Runbooks documented
920:- [ ] Write user guide (how to search, interpret results, save favorites)
921:- [ ] Create troubleshooting doc (search not finding stops, arrivals delayed, etc.)
922:- [ ] Document API contracts (OpenAPI spec, Postman collection)
923:- [ ] Write deployment runbook (how to deploy Phase 1, rollback procedure)
924:- [ ] Create incident response playbook (handling outages)
927:- [ ] Documentation complete and reviewable
928:- [ ] Runbooks tested (dry run)
938:- [ ] Search parser accuracy > 95%
939:- [ ] Stop-centric view displays arrivals correctly
940:- [ ] Route-centric view displays stop sequence correctly
941:- [ ] Vehicle-centric view displays next stops correctly
942:- [ ] Autocomplete response time < 100ms
943:- [ ] Search response time < 350ms (P95)
944:- [ ] Realtime updates every 10-30 seconds
947:- [ ] Bundle size < 150KB gzipped
948:- [ ] Time to Largest Contentful Paint < 2.5s
949:- [ ] 60 FPS scroll performance
950:- [ ] Availability > 99.5%
951:- [ ] Error rate < 0.5%
952:- [ ] Database latency < 100ms (P95)
955:- [ ] WCAG 2.1 Level AA compliance
956:- [ ] Screen reader testing passed
957:- [ ] Keyboard navigation complete
958:- [ ] Touch targets ≥ 44×44 px
959:- [ ] Task completion rate > 90%
960:- [ ] User NPS > 40
963:- [ ] Unit test coverage > 85%
964:- [ ] Integration tests pass (100%)
965:- [ ] E2E tests pass (100%)
966:- [ ] Mobile device testing (6 devices, all pass)
967:- [ ] Accessibility testing (screen reader + keyboard)
968:- [ ] Load testing (100 QPS, P95 < 350ms)
971:- [ ] User guide written
972:- [ ] API documentation complete
973:- [ ] Deployment runbook written
974:- [ ] Incident response playbook written
975:- [ ] Staging deployment successful
976:- [ ] Gradual rollout complete (10% → 50% → 100%)
977:- [ ] Telemetry dashboards live
978:- [ ] SLOs defined and monitored

### doc/map-free-mode-feature.md
495:- [ ] Search infrastructure (parser, resolver).
496:- [ ] Stop-centric view layout.
497:- [ ] Route-centric view layout.
498:- [ ] Real-time arrivals API.
499:- [ ] Basic autocomplete for stops + routes.
503:- [ ] Address/landmark resolution + geocoding.
504:- [ ] Vehicle-centric view.
505:- [ ] Crowding forecast timeline.
506:- [ ] Accessibility audit + fixes.
510:- [ ] Voice search.
511:- [ ] Gesture controls.
512:- [ ] Offline mode.
513:- [ ] Advanced alerts + notifications.
555:- [ ] Functional acceptance criteria met
556:- [ ] All API response times meet targets
557:- [ ] Search accuracy > 95% on test queries
558:- [ ] WCAG 2.1 AA compliance verified
559:- [ ] Mobile UX tested on 5+ devices
560:- [ ] Telemetry dashboards live
561:- [ ] Runbooks and troubleshooting docs complete
562:- [ ] Team training completed

## Pending Inventory: Code TODO Markers

apps/server/SPRINT_1A.md:144:Autocomplete suggestions (placeholder, TODO: implement trie)
apps/server/SPRINT_1A.md:201:Get stops on a route in order (TODO: implement)
apps/server/SPRINT_1A.md:214:Get current vehicle information (TODO: implement)
apps/server/SPRINT_1A.md:365:- [ ] Design prefix tree (trie) - TODO in Sprint 1A.4 task
apps/server/SPRINT_1A.md:366:- [ ] Implement trie insert + search - TODO
apps/server/SPRINT_1A.md:367:- [ ] Add geohashing for address prefixes - TODO
apps/server/SPRINT_1A.md:368:- [ ] Populate trie from MBTA data - TODO
apps/server/SPRINT_1A.md:369:- [ ] Cache in Redis or in-memory store - TODO
apps/server/SPRINT_1A.md:370:- [ ] Implement refresh job (nightly) - TODO
apps/server/SPRINT_1A.md:372:**Status**: PLACEHOLDER (endpoint created, logic TODO)
apps/server/SPRINT_1A.md:418:## Known Limitations & TODOs
apps/server/src/api-server.ts:247:    // TODO: Implement route stops endpoint
apps/server/src/api-server.ts:288:    // TODO: Implement vehicle info endpoint
apps/web/src/lib/StopView.svelte:160:									// TODO: Show detailed view
apps/web/src/lib/StopView.svelte:187:									// TODO: Show detailed view
apps/web/src/lib/tracker/stops-api.ts:205:          wheelchairAccessible: true, // TODO: get from vehicle/route data
apps/web/src/lib/tracker/stops-api.ts:206:          hasAudioAnnouncements: true // TODO: get from stop/route data
apps/web/src/lib/tracker/stops-api.ts:224:  // TODO: implement route-to-stop mapping from MBTA API
