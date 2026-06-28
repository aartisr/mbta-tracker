# MBTA Tracker: Master Implementation Roadmap

## Executive Summary

This document defines a **12-16 week staged rollout** for 6 major features across 4 phases:

| Phase | Duration | Features | Target | Dependencies |
|-------|----------|----------|--------|--------------|
| **Phase 1** | 4-6 weeks | Map-Free Search (MVP) | Public Beta | Baseline map + realtime data |
| **Phase 2** | 4-6 weeks | Crowdedness Forecast + Smart Boarding | General Release | Phase 1 complete, analytics pipeline |
| **Phase 3** | 4-6 weeks | Personal Commute AI + Emergency Routing | General Release | Phase 2 data, user model store |
| **Phase 4** | 2-4 weeks | Route Exploration Missions + Polish | General Release | Phase 3 complete |

---

## Feature Catalog

### Core Features (Map-Free + Differentiation)

1. **Map-Free Search Interface** (Phase 1 MVP)
   - Text-first discovery by route, stop, address, vehicle, landmark
   - Stop-centric, route-centric, vehicle-centric views
   - Real-time arrival forecasts (inbound/outbound)
   - Accessibility-first design

2. **Crowdedness Forecast Heatmap** (Phase 2)
   - Historical crowding patterns by stop + time-of-day
   - Predictive crowding timeline (±5, ±15, ±30, ±60 min)
   - Real-time occupancy integration
   - Rider preference pre-filtering

3. **Smart Cluster Boarding Strategy** (Phase 2)
   - Optimal vehicle selection algorithm (minimize wait + transfer + crowding)
   - Boarding time suggestions
   - Alternative route recommendations
   - Disruption-aware rerouting

4. **Personal Commute Timeline AI** (Phase 3)
   - Learn user's commute patterns (opt-in, privacy-first)
   - Predict best departure times
   - Personalized alerts
   - Favorite commute shortcuts

5. **Stranded Passenger Emergency Routing** (Phase 3)
   - Detect service disruptions in real-time
   - Compute alternative routes on-the-fly
   - Crisis-mode push notifications
   - Accessibility-aware alternatives

6. **Route Exploration Missions** (Phase 4)
   - Gamified discovery of less-explored routes
   - Weekly challenges ("Explore a new neighborhood")
   - Achievement badges
   - Leaderboards + community

---

## Phase 1: Map-Free Search MVP (4-6 weeks)

**Goal:** Launch a revolutionary text-first interface that eliminates map friction and serves power users, accessibility-first users, and speed-focused commuters.

**Deliverables:**
- Search page with universal query input
- Stop-centric view (most common use case)
- Route-centric view (full route planning)
- Vehicle-centric view (tracking specific buses)
- Autocomplete for stops, routes, vehicles
- Basic address-to-stop geocoding fallback

**Team Capacity:** 2-3 engineers (Frontend), 1 engineer (Backend/API), 1 PM

### Phase 1 Tasks

#### Sprint 1A: Infrastructure & Backend (Weeks 1-2)

**Backend Search Service**
- [ ] Create `/api/search` endpoint (route, stop, address, vehicle, landmark resolution)
- [ ] Implement query parser + resolver (handle ambiguity, typos, aliases)
- [ ] Build autocomplete index (inverted prefix tree with geohashing for addresses)
- [ ] Add /api/stop/{stopId}/arrivals endpoint (realtime arrivals grouped by route + direction)
- [ ] Add /api/route/{routeId}/stops endpoint (stop sequence with live vehicles)
- [ ] Add /api/vehicle/{vehicleId} endpoint (current location, next stops, occupancy)

**Data & Caching**
- [ ] Cache MBTA stops, routes, schedules locally (6-hour TTL)
- [ ] Implement arrival data cache (30-second TTL for realtime)
- [ ] Setup Redis or in-memory cache layer
- [ ] Create offline mode fallback (show cached schedules with stale indicators)

**Testing & Deployment**
- [ ] Unit tests for search parser (accuracy > 95%)
- [ ] Integration tests for API endpoints (latency targets: < 350ms P95)
- [ ] Load test search endpoint (handle 100+ QPS)
- [ ] Deploy to staging

#### Sprint 1B: Frontend (Weeks 2-3)

**Search Page Layout & Components**
- [ ] Build SearchBox component (text input + recent/favorites + voice input placeholder)
- [ ] Implement autocomplete dropdown (routes, stops, recent searches)
- [ ] Create ArrivalCard component (route + time + status + badges)
- [ ] Build DirectionToggle (inbound/outbound switcher)
- [ ] Setup responsive layout for mobile-first (no horizontal scroll)

**Stop-Centric View**
- [ ] Implement stop detail page
- [ ] Display inbound/outbound sections side-by-side (or stacked on mobile)
- [ ] Render arrival timings with live badges (Live GPS / Scheduled)
- [ ] Show delay/alert badges inline
- [ ] Handle empty state (no arrivals)

**Route & Vehicle Views**
- [ ] Build route detail page with stop sequence list
- [ ] Implement linear stop progression (top to bottom)
- [ ] Display vehicle indicators at each stop
- [ ] Add vehicle detail page with next stops + occupancy
- [ ] Handle multi-direction routes (picker)

**Accessibility & Theming**
- [ ] Ensure WCAG 2.1 Level AA compliance
- [ ] Setup dyslexia-friendly fonts (or OpenDyslexic option)
- [ ] High contrast mode support
- [ ] Screen reader testing (initial pass)

#### Sprint 1C: Integration & QA (Weeks 3-4)

**End-to-End Integration**
- [ ] Connect frontend to backend search APIs
- [ ] Test autocomplete latency (target < 100ms)
- [ ] Verify arrival times update in realtime
- [ ] Test offline mode graceful degradation

**Mobile Testing**
- [ ] Test on iPhone 12, 14, 15 (Safari)
- [ ] Test on Android 12, 13, 14 (Chrome)
- [ ] Verify touch targets ≥ 44×44 px
- [ ] Test landscape mode (optional Phase 2)

**Performance Audit**
- [ ] Measure Time to First Meaningful Paint (target < 1s)
- [ ] Ensure 60 FPS on scroll (arrival lists)
- [ ] Profile bundle size (keep < 150KB gzipped)

**User Testing**
- [ ] 5-user accessibility testing (screen reader + keyboard navigation)
- [ ] Cognitive load testing (find next bus for 3 common use cases)
- [ ] Task completion rate (target > 90%)

#### Sprint 1D: Launch & Monitor (Week 4)

**Soft Launch**
- [ ] Deploy to staging environment
- [ ] Internal team + early access users (50-100 people)
- [ ] Collect feedback on search accuracy + UX

**Public Beta Launch**
- [ ] Gradual rollout (10% → 50% → 100% over 2 weeks)
- [ ] Setup telemetry dashboards (search volume, task completion, errors)
- [ ] Define SLOs: Search latency P95 < 350ms, availability > 99.5%
- [ ] Create runbooks for common issues

**Documentation**
- [ ] Write user guide for map-free mode
- [ ] Create troubleshooting doc (search not finding stops, etc.)
- [ ] Document API contracts for future features

---

## Phase 2: Crowdedness Forecast + Smart Boarding (4-6 weeks)

**Goal:** Enable riders to make informed crowding decisions and optimize their commute with AI-powered boarding suggestions.

**Dependencies:**
- ✅ Phase 1 complete (map-free infrastructure)
- ✅ Analytics pipeline ingesting occupancy + arrival data
- ✅ Historical crowding database (30+ days of observations)

**Team Capacity:** 2 engineers (Backend ML), 2 engineers (Frontend), 1 Data Scientist, 1 PM

### Phase 2 Key Tasks

#### Backend: Crowding Forecast Engine
- [ ] Ingest vehicle occupancy from realtime feed (occupancy_percent field)
- [ ] Store historical crowding observations (stop_id, route_id, time_of_day, dow, occupancy_percent)
- [ ] Build crowding forecast model (time-series prediction: 5/15/30/60 min ahead)
- [ ] Create `/api/stop/{stopId}/crowding-forecast` endpoint (timeline data)
- [ ] Create `/api/route/{routeId}/crowding-forecast` endpoint

#### Backend: Smart Boarding Algorithm
- [ ] Implement vehicle selection logic (minimize: wait_time + transfer_count + crowding + delay)
- [ ] Create `/api/boarding-suggestion?from={stop}&to={stop}&depart_after={time}` endpoint
- [ ] Return top 3 options (best overall + fastest + least crowded)
- [ ] Handle disruption scenarios (reroute if service down)
- [ ] Support accessibility filters (wheelchair, bike rack, etc.)

#### Frontend: Crowding Display
- [ ] Add crowding timeline to stop-centric view (swipeable chart)
- [ ] Add crowding indicator to route-centric view (dots/colors for each stop)
- [ ] Build ArrivalCard variant with crowding badge
- [ ] Implement "pick your window" UI (swipe to see crowding at different times)

#### Frontend: Smart Boarding UI
- [ ] Build boarding suggestion card (option 1, 2, 3 with trade-offs shown)
- [ ] Add toggle between "fastest", "least crowded", "cheapest fare"
- [ ] Show wait time, transfers, crowding, accessibility icons
- [ ] "Accept" → add to trip planner (Phase 3 prep)

#### Data Pipeline
- [ ] Setup occupancy ingestion from vehicle realtime feed
- [ ] Create data warehouse for crowding observations (Parquet + DuckDB or similar)
- [ ] Build daily aggregation job (compute crowding stats by stop/route/time)
- [ ] Implement feature pipeline for ML model (lag features, day-of-week, seasonality)

#### Testing & Launch
- [ ] Validate forecast accuracy (RMSE < 15% for occupancy predictions)
- [ ] A/B test smart boarding suggestions (control vs treatment)
- [ ] Performance test crowding forecast (compute must be < 200ms)
- [ ] Gradual rollout (10% → 50% → 100%)

---

## Phase 3: AI + Emergency Routing (4-6 weeks)

**Goal:** Personalize commuting and provide intelligent crisis rerouting to stranded passengers.

**Dependencies:**
- ✅ Phase 2 complete
- ✅ User model store (privacy-first opt-in)
- ✅ Routing engine (alternative path computation)

**Team Capacity:** 2 engineers (Backend/ML), 1 engineer (Frontend), 1 Data Scientist, 1 PM

### Phase 3 Key Tasks

#### Backend: Commute Learning Engine
- [ ] Create user_commutes table (opt-in: capture user_id, from_stop, to_stop, departure_time, dow)
- [ ] Implement commute pattern detection (K-means clustering on (stop_pair, time_of_day))
- [ ] Build departure time recommender (suggest optimal times to minimize wait)
- [ ] Create `/api/my-commutes` endpoint (authenticated, privacy-scoped)
- [ ] Create `/api/commute-recommendation?from={stop}&to={stop}` endpoint

#### Backend: Emergency Routing
- [ ] Setup service disruption detection (scan MBTA alerts for "service suspended", "bus diversion", etc.)
- [ ] Implement graph search (compute alternative routes when disruption detected)
- [ ] Create `/api/emergency-reroute?from={stop}&to={stop}&disrupted_route={route}` endpoint
- [ ] Return alternatives ranked by (distance_increase, time_penalty, accessibility_support)
- [ ] Setup push notification pipeline (opt-in, location-scoped alerts)

#### Frontend: Personal Commute Shortcuts
- [ ] Add "My Commutes" panel to home (top 3 favorite routes)
- [ ] Show "Next train/bus for [Commute Name]" with one-tap access
- [ ] Implement bookmark/favorite commute feature
- [ ] Display suggested departure times (AI recommendation)
- [ ] Show commute time trend (is it getting slower? faster?)

#### Frontend: Emergency Alerts
- [ ] Create high-priority alert banner (red background, text + icon)
- [ ] Show alternative routes suggestion inline
- [ ] Add "Accept reroute" button (logs event for ML feedback)
- [ ] Support "Remind me at [time]" for delayed service recovery

#### Privacy & Compliance
- [ ] Implement privacy-first commute capture (hashed user_id, anonymized after 90 days)
- [ ] Create user consent flow (opt-in for commute learning)
- [ ] Build privacy dashboard (see/delete commute history)
- [ ] Audit commute data retention policy

#### Testing & Launch
- [ ] Test rerouting accuracy (manual paths for 10 disruption scenarios)
- [ ] Validate commute pattern detection (> 85% accuracy on test set)
- [ ] Simulate emergency disruption scenario
- [ ] Privacy audit (GDPR/CCPA compliance check)
- [ ] Phased rollout with privacy safeguards

---

## Phase 4: Route Missions + Polish (2-4 weeks)

**Goal:** Drive engagement and discovery through gamified exploration challenges.

**Dependencies:**
- ✅ Phase 3 complete
- ✅ Telemetry infrastructure for tracking user journeys

**Team Capacity:** 1 engineer (Frontend), 1 engineer (Backend), 1 Designer, 1 PM

### Phase 4 Key Tasks

#### Backend: Missions Engine
- [ ] Design mission catalog (50+ challenges: "Ride to Airport Station", "Explore Blue Line", etc.)
- [ ] Create `/api/missions` endpoint (current + available missions)
- [ ] Build mission completion tracking (capture user journey_start → journey_end events)
- [ ] Implement achievement/badge system
- [ ] Create `/api/leaderboard` endpoint (weekly/all-time rankings)

#### Frontend: Mission UI
- [ ] Build mission card (name, description, progress bar, reward icon)
- [ ] Create mission list view (available + in-progress + completed)
- [ ] Display achievement badges (visual gallery)
- [ ] Show leaderboard (top 10 this week, your rank)
- [ ] Add "Share achievement" buttons (Twitter/social)

#### Community & Engagement
- [ ] Build community forum/discussion (lite version, moderated)
- [ ] Create mission feedback loop (users suggest new missions)
- [ ] Setup weekly mission rotation (theme: "Summer exploration")
- [ ] Create email digest (weekly mission digest)

#### Performance & Scale
- [ ] Load test leaderboard (100K+ users updating simultaneously)
- [ ] Verify mission completion tracking doesn't impact app performance
- [ ] Cache leaderboard (updated every 5 minutes)
- [ ] Monitor telemetry for mission engagement

#### Final Polish
- [ ] Visual design refinement (design system audit)
- [ ] Accessibility re-test (WCAG AA compliance)
- [ ] Mobile landscape support (if needed)
- [ ] Offline mode enhancements
- [ ] Documentation updates

---

## Cross-Phase Dependencies & Risks

### Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Map-Free Search MVP                                │
│ (Backend: search APIs, Frontend: search UI)                  │
│ ✓ Deliverable: Public beta search interface                 │
└─────────────────────────────┬───────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │ Analytics Pipeline │
                    │ (occupancy ingestion)
                    └─────────┬──────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│ Phase 2: Crowdedness + Smart Boarding                        │
│ (Crowding forecast model, Boarding algorithm)                │
│ ✓ Deliverable: AI-powered boarding suggestions              │
└─────────────────────────────┬───────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │ User Model Store   │
                    │ (privacy-first opt-in)
                    └─────────┬──────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│ Phase 3: AI + Emergency Routing                              │
│ (Commute learning, Rerouting engine)                         │
│ ✓ Deliverable: Personal AI + crisis alerts                  │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│ Phase 4: Missions + Gamification                             │
│ (Mission engine, Leaderboard, Achievement badges)           │
│ ✓ Deliverable: Engagement + community                       │
└─────────────────────────────────────────────────────────────┘
```

### Critical Path Risks

| Risk | Phase | Probability | Impact | Mitigation |
|------|-------|-------------|--------|-----------|
| Search query parsing accuracy < 95% | 1 | Medium | High | Intensive testing; fallback to stop-only search |
| Crowding forecast RMSE > 20% | 2 | Medium | Medium | Use simple baseline; improve in Phase 3 |
| User commute model cold-start | 3 | Low | Medium | Provide default recommendations; improve with data |
| Emergency routing graph too slow | 3 | Low | High | Pre-compute route alternatives; cache results |
| Leaderboard scalability at 1M+ users | 4 | Low | Medium | Shard by geography; use Redis for caching |

---

## Success Metrics by Phase

### Phase 1 KPIs
- **Engagement:** % of users trying map-free vs map view (target: 40%)
- **Performance:** Search response time P95 < 350ms (target: ✓)
- **Usability:** Task completion rate for "find next bus" (target: > 90%)
- **Accessibility:** WCAG AA compliance audit score (target: 95%+)

### Phase 2 KPIs
- **Adoption:** % users checking crowding before boarding (target: 25%)
- **Trust:** Crowding forecast accuracy (RMSE < 15%, target: ✓)
- **Satisfaction:** Boarding suggestion acceptance rate (target: > 50%)
- **Impact:** Avg occupancy when using smart boarding (target: -10% vs control)

### Phase 3 KPIs
- **Opt-in Rate:** % users enabling commute learning (target: 35%)
- **Personalization:** Commute time variance reduction (target: -15%)
- **Crisis Response:** Reroute acceptance during disruptions (target: > 40%)
- **Retention:** DAU increase post-Phase 3 (target: +20%)

### Phase 4 KPIs
- **Engagement:** % users completing at least 1 mission (target: 30%)
- **Community:** Leaderboard views per week (target: 1M+)
- **Virality:** Social shares per mission completion (target: > 5%)
- **Retention:** Monthly churn reduction (target: -10%)

---

## Resource Allocation

### Total Team (Peak)
- **Engineers:** 8 FTE (2 Frontend, 2 Backend, 1 Infra, 1 Data, 1 ML, 1 QA)
- **Designers:** 1 FTE (UX/Interaction)
- **Data Scientists:** 1 FTE (ML model development)
- **Product Managers:** 1 FTE
- **Total:** ~11 FTE, 12-16 week duration

### Phase-by-Phase Staffing

**Phase 1:** 5 FTE (2 FE, 2 BE, 1 PM) + 0.5 QA
**Phase 2:** 7 FTE (2 FE, 2 BE, 1 Data, 1 ML, 1 PM) + 1 QA
**Phase 3:** 8 FTE (2 FE, 2 BE, 1 Infra, 1 Data, 1 ML, 1 PM) + 1 QA
**Phase 4:** 4 FTE (1 FE, 1 BE, 1 Designer, 1 PM)

---

## Budget Estimate

Assuming $150K/FTE/year avg cost:

| Phase | FTE-Weeks | Cost | Notes |
|-------|-----------|------|-------|
| Phase 1 | 20 FTE-weeks | $57.7K | Search MVP |
| Phase 2 | 28 FTE-weeks | $80.8K | ML + analytics |
| Phase 3 | 28 FTE-weeks | $80.8K | Personalization |
| Phase 4 | 14 FTE-weeks | $40.4K | Gamification |
| **Total** | **90 FTE-weeks** | **$259.7K** | ~16 weeks, 5-6 FTE avg |

---

## Detailed Timeline

```
Week 1-2:   Phase 1 Sprint 1A (Backend search, caching)
Week 2-3:   Phase 1 Sprint 1B (Frontend search UI, stop view)
Week 3-4:   Phase 1 Sprint 1C (Integration, mobile testing)
Week 4:     Phase 1 Sprint 1D (Launch, monitoring)
            ↓
Week 5-6:   Phase 2 Sprint 2A (Crowding ML, boarding algo)
Week 6-7:   Phase 2 Sprint 2B (Frontend crowding UI)
Week 7-8:   Phase 2 Sprint 2C (A/B testing, data pipeline)
Week 8-9:   Phase 2 Sprint 2D (Launch, polish)
            ↓
Week 9-10:  Phase 3 Sprint 3A (Commute learning, routing)
Week 10-11: Phase 3 Sprint 3B (Emergency alerts UI)
Week 11-12: Phase 3 Sprint 3C (Privacy audit, testing)
Week 12-13: Phase 3 Sprint 3D (Launch, ramp)
            ↓
Week 13-14: Phase 4 Sprint 4A (Missions engine, leaderboard)
Week 14-15: Phase 4 Sprint 4B (Gamification UI, polish)
Week 15-16: Phase 4 Sprint 4C (Final QA, community launch)
```

---

## Definition of Done (Release Criteria)

### Each Phase Must Meet

- ✅ **Functional:** All acceptance criteria met (100%)
- ✅ **Performance:** P95 latency targets met, no regressions
- ✅ **Reliability:** Availability > 99.5%, error rate < 0.1%
- ✅ **Accessibility:** WCAG 2.1 AA compliance verified
- ✅ **Testing:** Unit (> 80% coverage), integration, E2E pass rate 100%
- ✅ **Telemetry:** Dashboards live, SLOs defined
- ✅ **Documentation:** Runbooks, API docs, user guides complete
- ✅ **Rollout:** Phased launch (10% → 50% → 100%) complete

---

## Next Steps

1. **Confirm Resource Allocation** → Finalize team composition
2. **Lock Phase 1 Sprint Dates** → Start hiring/ramp if needed
3. **Setup Development Infrastructure** → Git repos, CI/CD, staging env
4. **Begin Phase 1 Sprint 1A** → Kickoff search backend development
5. **Create Detailed Task Tracking** → Jira/Linear with subtasks per sprint

See [`phase-1-detailed-tasks.md`](./phase-1-detailed-tasks.md) for granular Phase 1 breakdown.
