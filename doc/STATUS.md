# STATUS

This is the current implementation status for the repo as of now.

## Implemented

- Search-first UI and map-first shell behavior.
- Universal search parser and resolver for routes, stops, addresses, vehicles, and landmarks.
- Cached prefix autocomplete for stops and routes.
- Stop arrivals endpoint.
- Route stops endpoint.
- Vehicle info endpoint.
- Stop and route crowding forecasts.
- Boarding suggestions.
- Stop, route, and vehicle compact views.
- Commute insights, privacy dashboard, and opt-in/out handling.
- Emergency reroute suggestions.
- Missions, leaderboard, mission feedback, and community posts.
- File-backed persistence for Phase 3 and Phase 4 state.
- Collapsed map details and compact desktop/mobile controls.

## Partially Implemented

- Crowding forecasts are still heuristic when live occupancy is missing.
- Crowding persistence is not yet a warehouse or ML model pipeline.
- Phase 3 and Phase 4 persistence use JSON files instead of a database.
- Geocoding still depends on Nominatim and can be rate-limited.
- Voice search is browser-dependent rather than universal.
- Accessibility is strong, but not formally audited end-to-end.
- Telemetry, staging, load testing, and production observability are not fully built out.
- Mission catalog, commute learning, and rerouting are intentionally lightweight compared with the original roadmap.

## Not Implemented

- Redis-backed or database-backed infrastructure for the full app.
- Historical crowding warehouse and aggregation jobs.
- Dedicated crowding ML model with measured accuracy targets.
- Commute clustering with K-means or similar pattern discovery.
- Graph-search emergency routing from live disruption topology.
- Push notification pipeline and reminder scheduling.
- Large rotating mission catalog, email digest, and moderation workflow.
- Full rollout automation, device farm validation, and production SLO dashboards.
- Formal WCAG audit and compliance signoff.

## Notes

- The roadmap docs remain useful for future hardening work, but they should not be read as blockers for the current app.
- If a feature is listed as implemented here, it should exist in code and be covered by tests or direct UI usage.

## Archived UX Spec

This section preserves the former map-free mode feature spec so its product detail is not lost.

### Overview And Design Philosophy

- Map-free mode is a text-first transit discovery experience that removes map friction.
- Users search by route, stop, address, vehicle, or landmark and get a glanceable result view.
- The guiding principle is to optimize for "when is my bus coming?" rather than cartographic exploration.

### Product Behavior

- Entry point is a single universal search box in the app header/navigation.
- Accepted query types:
  - Route number or name, such as `38`, `Red Line`, or `Route 15`.
  - Stop name or ID, such as `Park Street` or `stop-id-123`.
  - Address or intersection, such as `123 Main St` or `Boylston & Arlington`.
  - Vehicle ID, such as `veh-4521`.
  - Landmark or neighborhood, such as `Downtown` or `Airport`.
- Query resolution rules:
  - Route query: show all vehicles on the route, grouped by direction and stop sequence.
  - Stop query: show all routes serving that stop, with next arrival for each.
  - Address query: show nearby stops within 0.5 km, ranked by distance, then route details for the selected stop.
  - Vehicle query: show the vehicle's current trip, next five stops, and passenger manifest if available.
  - Landmark query: resolve to nearby stops or routes, then follow the stop-query flow.

### UX Layouts

#### Stop-Centric View

- Best for stop names and nearby addresses.
- Show the stop title, nearest matched stop, walking distance, and interchange context.
- Split arrivals by direction, usually inbound and outbound.
- Each route card should show next arrival first, then subsequent arrivals.
- Show live or scheduled freshness badges.
- Show delays and service alerts immediately.
- Encourage tap-to-expand instead of cramming every detail into the first screen.
- Design principles:
  - Color-code by mode.
  - Use directional split for inbound/outbound clarity.
  - Prioritize time hierarchy.
  - Keep follow-up details behind progressive disclosure.

#### Route-Centric View

- Best for route numbers and line names.
- Show route name, direction pair, active vehicles, average headway, and service status.
- Present stop sequence linearly, with the current vehicle highlighted at each stop.
- Show three to five lookahead arrivals per stop.
- Include mode-specific badges such as wheelchair, bike rack, or charging port.
- Show crowding heatmap information to reveal busy stops.
- Allow tap on a stop to see all routes serving it.
- Design principles:
  - Make stop sequence linear and easy to scan.
  - Highlight the current vehicle.
  - Keep route and stop metadata compact.

#### Vehicle-Centric View

- Best for vehicle IDs or QR scans.
- Show vehicle ID, route, direction, driver or service info, current location, delay, occupancy, and capacity.
- Show the next stops with countdown timers and schedule comparison.
- Show stop ordinal context, such as stop number N of M.
- Include contextual metadata such as crowding, accessibility, and alerts.
- Provide a direct feedback action on the vehicle.
- Design principles:
  - Center the live vehicle state.
  - Use clean countdown timers.
  - Keep contextual metadata small but visible.

#### Address And Landmark Resolution

- Best for typed addresses or places.
- Present nearby stop suggestions with route coverage.
- Show walking distance and estimated direct walk time.
- Support multi-route coverage for dense urban destinations.
- Offer route discovery near the address after the primary stop match.

### Advanced Features

- Crowding forecast timeline:
  - Show forecast for now, +5m, +15m, +30m, and +60m.
  - Present crowding as a compact trend, not a dense chart.
- Real-time alerts inline:
  - Show service alerts, detours, and delays in the result cards.
  - Keep them visible without forcing a separate alert page.
- Multi-stop selector:
  - Let users compare nearby stops at once.
  - Useful for dense intersections and transfers.
- Smart suggestions:
  - Offer context-aware next steps such as adding a commute shortcut, setting a weekday alert, or showing alternate routes if delayed.

### Data Model And APIs

- Search API:
  - `GET /api/search?q=...&type=route|stop|address|vehicle|landmark`
  - Response includes `query`, `type`, `matches`, and resolution metadata.
- Stop arrivals API:
  - `GET /api/stop/{stopId}/arrivals`
  - Returns route lists by direction with ETA details.
- Vehicle API:
  - `GET /api/vehicle/{vehicleId}`
  - Returns current location, occupancy, capacity, and next stops.
- Search result model:
  - `SearchResult` includes `queryType`, `matches`, `resolution_confidence`, and optional refinements.
  - `StopResult` includes stop metadata, distance, routes, directions, and next arrivals.
  - `RouteResult` includes route metadata, mode, directions, vehicles active, crowding forecast, and stop arrivals.
  - `VehicleResult` includes vehicle metadata, current location, occupancy, capacity, and next stops.

### Frontend Architecture

- Search page:
  - Map-free default.
  - Universal search with autocomplete.
  - Dynamic results area by query type.
  - Recent and pinned favorite shortcuts.
- Stop detail view:
  - Inbound and outbound tabs.
  - Route cards with timing.
  - Inline alerts and accessibility info.
- Route detail view:
  - Direction picker.
  - Stop sequence list.
  - Crowding forecast slider.
  - Vehicle status indicators.
- Vehicle detail view:
  - Real-time location.
  - Countdown to next stops.
  - Occupancy meter.
  - Driver and service info.
- UI components:
  - SearchBox.
  - ArrivalCard.
  - StopSequence.
  - CrowdingTimeline.
  - AlertBadge.
  - DirectionToggle.

### Interaction Patterns

- Gesture support:
  - Swipe down on a stop for full details.
  - Swipe right to favorite.
  - Long-press a route card to set departure notifications.
  - Pinch to zoom the crowding timeline.
- Voice search:
  - Optional Phase 2 support.
  - Example intents included route queries, stop queries, and vehicle lookups.

### Accessibility And Inclusive Design

- Screen reader support:
  - Announce timing as human-friendly minutes.
  - Give route mode icons meaningful alt text.
  - Treat delay badges semantically as alerts.
- High contrast mode:
  - Never rely on color alone.
  - Combine icons, text, and pattern cues.
- Mobile-first responsive:
  - Touch targets at least 44 by 44 px.
  - Text should remain readable at 100% zoom.
  - Avoid horizontal scrolling.
- Dyslexia-friendly typography:
  - Prefer OpenDyslexic or a clear sans-serif.
  - Maintain generous line and letter spacing.

### Performance And Offline Support

- Cache stops, routes, and schedules locally and refresh every six hours.
- Cache realtime arrivals with a 30-second TTL.
- Support offline mode with cached schedule data and a stale indicator.
- Response targets:
  - Search autocomplete under 100 ms.
  - Stop detail load under 350 ms P95.
  - Route detail load under 500 ms P95.
  - Vehicle detail under 200 ms.

### Rollout Plan

- Phase 1 MVP:
  - Search infrastructure.
  - Stop-centric view.
  - Route-centric view.
  - Real-time arrivals.
  - Basic autocomplete.
- Phase 2 Enhance:
  - Address and landmark resolution.
  - Vehicle-centric view.
  - Crowding timeline.
  - Accessibility-oriented UI passes.
- Phase 3 Polish:
  - Compact polish.
  - Collapsed-details behavior.
  - Offline-friendly fallbacks.
  - Future hardening for voice, gestures, and advanced notifications.

### Success Metrics

- Engagement:
  - % of users trying map-free mode.
  - Average searches per session, target above 2.
  - Repeat search rate, target above 40%.
- Performance:
  - Search response time P95 under 350 ms.
  - Time to first meaningful paint under 1 s.
  - Frame rate on arrival updates at 60 FPS.
- Usability:
  - Task completion rate for "find next bus to X" above 90%.
  - Search query parsing accuracy above 95%.
  - User satisfaction NPS above 60.
- Accessibility:
  - WCAG 2.1 Level AA compliance.
  - Screen reader test pass rate of 100%.
  - Manual accessibility audit score above 90%.

### Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Slow geocoding for addresses | Medium | High | Cache results, use local geohashing, fallback to stops only |
| High cardinality search index | Low | High | Use inverted index with prefix trees; shard by geography |
| Voice recognition errors | Medium | Medium | Show top 3 interpretations; require confirmation for actions |
| Offline data staleness | Low | Medium | Show age indicator; suggest refresh when online |
| Search ambiguity, such as `38` meaning route or bus number | Medium | Low | Show both matches; remember the user's last intent |

### Definition Of Done

- Functional acceptance criteria are met for the shipped search-first flows.
- API latency, search accuracy, and accessibility remain active monitoring targets.
- Remaining work is primarily production hardening, telemetry, and formal compliance validation.

## Archived Roadmap Details

This section preserves the remaining planning detail from the former master roadmap so no information is lost.

### Phase Structure

- Phase 1: Map-Free Search MVP, 4-6 weeks, public beta, baseline map + realtime data.
- Phase 2: Crowdedness Forecast + Smart Boarding, 4-6 weeks, general release, depends on Phase 1 and analytics pipeline.
- Phase 3: Personal Commute AI + Emergency Routing, 4-6 weeks, general release, depends on Phase 2 data and user model store.
- Phase 4: Route Exploration Missions + Polish, 2-4 weeks, general release, depends on Phase 3.

### Original Feature Catalog

- Map-Free Search Interface: text-first discovery by route, stop, address, vehicle, and landmark.
- Crowdedness Forecast Heatmap: historical crowding patterns, predictive timeline, real-time occupancy integration, and rider preference pre-filtering.
- Smart Cluster Boarding Strategy: optimize by wait, transfers, and crowding; boarding suggestions; alternative routes; disruption-aware rerouting.
- Personal Commute Timeline AI: learn commute patterns, predict best departure times, personalized alerts, favorite shortcuts.
- Stranded Passenger Emergency Routing: detect disruptions, compute alternatives, crisis notifications, accessibility-aware reroutes.
- Route Exploration Missions: gamified discovery, weekly challenges, badges, and leaderboards.

### Original KPIs

- Phase 1: map-free adoption 40%, search P95 under 350ms, task completion over 90%, WCAG audit 95%+.
- Phase 2: crowding adoption 25%, crowding RMSE under 15%, boarding acceptance above 50%, occupancy -10% vs control.
- Phase 3: commute opt-in 35%, commute variance reduction -15%, reroute acceptance above 40%, DAU +20%.
- Phase 4: mission completion 30%, leaderboard views 1M+, social shares above 5%, churn -10%.

### Original Risk Register

- Search parsing accuracy below 95%.
- Crowding forecast RMSE above 20%.
- Commute model cold-start.
- Emergency routing graph performance risk.
- Leaderboard scalability risk at 1M+ users.

### Original Staffing And Budget

- Peak staffing: about 11 FTE across engineering, design, data science, product, and QA.
- Phase staffing: Phase 1 at 5 FTE, Phase 2 at 7 FTE, Phase 3 at 8 FTE, Phase 4 at 4 FTE.
- Budget estimate: about $259.7K total, based on $150K/FTE/year average cost.

### Original Timeline

- Week 1-4: Phase 1 sprints 1A-1D.
- Week 5-9: Phase 2 sprints 2A-2D.
- Week 9-13: Phase 3 sprints 3A-3D.
- Week 13-16: Phase 4 sprints 4A-4C.

### Original Definition Of Done

- Functional acceptance criteria met.
- Performance targets met with no regressions.
- Availability above 99.5% and error rate below 0.1%.
- WCAG 2.1 AA compliance verified.
- Unit, integration, and E2E tests passing.
- Telemetry dashboards live and SLOs defined.
- Documentation complete.
- Rolled out through 10% -> 50% -> 100%.

### Original Next Steps

- Confirm resource allocation.
- Lock Phase 1 sprint dates.
- Set up development infrastructure.
- Begin Phase 1 Sprint 1A.
- Create detailed task tracking.
