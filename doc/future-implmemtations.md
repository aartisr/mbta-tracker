# Future Implementations: 5 Differentiating MBTA Features

## Purpose

This document defines how to implement five high-differentiation product features:

1. Smart Cluster Boarding Strategy
2. Personal Commute Timeline AI
3. Stranded Passenger Emergency Routing
4. Route Exploration Missions
5. Crowdedness Forecast Heatmap

Each section includes product behavior, architecture changes, data model updates, API contracts, rollout plan, and acceptance criteria.

## Assumptions

- Existing system already provides realtime vehicle updates, route metadata, stop metadata, and a web UI with map + list views.
- MBTA API access remains available for predictions, trips, routes, stops, and alerts.
- Privacy-sensitive features are opt-in and can be fully disabled.

## Cross-Cutting Foundations

### A. New Services and Storage

- Add a lightweight analytics store for historical snapshots.
- Add a user-profile store for preferences and commute history (opt-in only).
- Add a routing engine service that can compute alternatives under disruptions.
- Add a feature-flag layer to progressively enable features.

### B. New Event Pipeline

Ingest and persist the following event types:

- vehicle_observation
- stop_arrival_observation
- route_disruption_observation
- user_departure_event (opt-in)
- user_arrival_event (opt-in)
- reroute_decision_event

### C. Shared Non-Functional Requirements

- P95 API latency under 350 ms for user-facing endpoints.
- No map frame drops on mid-range mobile devices due to feature rendering.
- Graceful degradation when predictive services are unavailable.
- Explicit privacy controls with clear user-facing explanations.

---

## 1) Smart Cluster Boarding Strategy

## Product Behavior

When multiple vehicles for the same route are close together, show a ranked recommendation:

- Board now (vehicle A)
- Wait 2 min for less crowded option (vehicle B)
- Skip this cluster if transfer risk is high

Recommendation considers:

- true ETA to user stop
- estimated dwell time
- inferred crowding
- downstream transfer reliability
- accessibility needs (if user set preferences)

## Architecture

- Add ClusterAnalyzer service in backend.
- Build cluster groups by route + direction + corridor segment.
- Score each candidate vehicle with a weighted decision model.
- Expose ranked recommendations to web client.

## Data Model Additions

- vehicle_cluster
  - cluster_id
  - route_id
  - direction_id
  - vehicle_ids[]
  - time_span_seconds
- boarding_recommendation
  - stop_id
  - route_id
  - ranked_options[]
  - explanation_tags[]
  - confidence_score

## API

- GET /api/cluster-boarding?stopId={id}&routeId={id}
  - returns ranked options with reason codes

Example reason codes:

- fastest_arrival
- lower_crowding
- lower_transfer_risk
- accessibility_match

## Frontend UX

- In stop popup and stop detail panel, add Recommended Boarding card.
- Show top option plus Why this? expandable explanation.
- Keep fallback text: No recommendation available.

## Rollout

- Phase 1: ETA-only ranking.
- Phase 2: Add crowding estimates.
- Phase 3: Add transfer-risk scoring.

## Acceptance Criteria

- Recommendation appears within 1 second of opening stop detail.
- Confidence score present for all ranked options.
- If cluster not detected, API returns no_cluster status, not error.

---

## 2) Personal Commute Timeline AI

## Product Behavior

For opted-in users, show personalized departure guidance:

- You are usually on time if you leave between 8:03-8:09.
- Leaving after 8:14 historically increases late risk.
- Recommended departure now: 8:06 (88% on-time confidence).

## Architecture

- Add CommuteProfile service.
- Build per-user commute templates from repeated origin, destination, and weekday/time patterns.
- Train/update a lightweight prediction model daily.

## Data Model Additions

- user_commute_profile
  - user_id
  - profile_version
  - home_stop_candidates[]
  - destination_stop_candidates[]
  - weekday_patterns[]
- commute_prediction
  - user_id
  - query_time
  - recommended_departure_time
  - on_time_probability
  - confidence_interval_minutes

## API

- POST /api/commute-profile/opt-in
- POST /api/commute-profile/opt-out
- GET /api/commute-timeline?targetArrival=HH:mm

## Privacy and Controls

- Explicit opt-in required.
- Data export and delete endpoint available.
- Predictions unavailable if user is opted out.

## Frontend UX

- Add My Commute Timeline panel in dashboard.
- Show confidence and rationale tags (traffic-like disruption, known bottleneck stops, day-of-week effect).
- Add quick toggle: Pause personalization for today.

## Rollout

- Phase 1: Rule-based prediction from historical medians.
- Phase 2: Add probabilistic on-time model.
- Phase 3: Add anomaly adjustments for events/weather.

## Acceptance Criteria

- Opted-in users can view recommendation within 2 seconds.
- Users can disable feature and purge profile data.
- Recommendation quality improves after at least 7 commute samples.

---

## 3) Stranded Passenger Emergency Routing

## Product Behavior

When a disruption impacts active trip intent, proactively suggest alternatives:

- Your current plan is disrupted (Route 57 delay).
- Best alternate: walk 4 min to Stop X, board Route 39, transfer at Y.
- Estimated new arrival: 8:47 AM (was 8:41 AM).

## Architecture

- Add DisruptionWatcher service to consume alerts + unusual headway gaps + vehicle drop-offs.
- Add EmergencyRouter service for near-real-time alternate path computation.
- Add stateful trip-intent tracking for opted-in sessions.

## Data Model Additions

- disruption_event
  - disruption_id
  - affected_routes[]
  - affected_stop_ids[]
  - severity
  - start_time
  - expected_end_time
- emergency_route_plan
  - plan_id
  - user_session_id
  - original_route_summary
  - alternatives[]
  - selected_alternative

## API

- POST /api/trip-intent/start
- POST /api/trip-intent/stop
- GET /api/emergency-routes?sessionId={id}

## Frontend UX

- Add disruption banner only when current intent is impacted.
- Add one-tap Apply alternative CTA.
- Show transfer instructions with map highlights and countdowns.

## Rollout

- Phase 1: Alert-triggered alternatives.
- Phase 2: Alert + inferred vehicle breakdown conditions.
- Phase 3: Personalized reroute ranking.

## Acceptance Criteria

- If disruption affects active intent, user receives alternative within 10 seconds.
- At least one alternative appears for major disruption scenarios.
- If no safe alternative exists, UI clearly states why.

---

## 4) Route Exploration Missions

## Product Behavior

Offer optional discovery missions to help users explore the network:

- Try 3 new neighborhoods this month.
- Complete a cross-river mission.
- Ride one route from each mode category.

Rewards are non-monetary badges, progress visuals, and optional social sharing.

## Architecture

- Add Missions service with mission templates and eligibility rules.
- Add ActivityTracker to match ride events against mission rules.
- Add Achievement engine for milestone unlocks.

## Data Model Additions

- mission_template
  - mission_id
  - title
  - criteria
  - active_window
- user_mission_progress
  - user_id
  - mission_id
  - progress_value
  - completed_at

## API

- GET /api/missions
- GET /api/missions/progress
- POST /api/missions/claim

## Frontend UX

- Add Explore tab with mission cards and progress rings.
- Add map overlay for unexplored areas visited by transit.
- Add optional share card generation.

## Rollout

- Phase 1: Basic static missions.
- Phase 2: Dynamic missions from user history.
- Phase 3: Seasonal/community missions.

## Acceptance Criteria

- Mission progress updates within one minute of qualifying ride event.
- Completed mission appears with clear completion timestamp.
- User can disable mission prompts independently of other features.

---

## 5) Crowdedness Forecast Heatmap

## Product Behavior

Visualize expected crowdedness by route, stop, and time horizon:

- heatmap now
- +15 min
- +30 min
- +60 min

Also provide suggestions:

- Leave 8 minutes later for lower crowding with same arrival risk.

## Architecture

- Add CrowdingEstimator service combining:
  - historical load proxies
  - headway irregularity
  - schedule adherence
  - event/peak-time multipliers
- Add HeatmapTile endpoint for map rendering efficiency.

## Data Model Additions

- crowding_forecast
  - route_id
  - stop_id
  - forecast_time
  - crowd_index (0-100)
  - confidence
- crowding_snapshot
  - captured_at
  - route_id
  - stop_id
  - observed_proxy_metrics

## API

- GET /api/crowding/forecast?stopId={id}&horizon=60
- GET /api/crowding/heatmap-tiles?bbox={bbox}&time={iso}

## Frontend UX

- Add Crowding layer toggle on map.
- Add legend for Low / Medium / High / Very High.
- Add recommendation chip in stop panel for less crowded departure window.

## Rollout

- Phase 1: Historical crowd index baseline.
- Phase 2: Realtime-adjusted forecast.
- Phase 3: Personalized comfort threshold filtering.

## Acceptance Criteria

- Heatmap render updates within 500 ms after time-horizon change.
- Forecast endpoint includes confidence values for each prediction.
- Color scales are accessible and readable in light/dark modes.

---

## Program-Level Delivery Plan

## Milestone M1 (4-6 weeks)

- Build shared event persistence.
- Release Smart Cluster Boarding (Phase 1).
- Release Crowdedness Heatmap (Phase 1).

## Milestone M2 (4-6 weeks)

- Release Emergency Routing (Phase 1-2).
- Release Personal Commute Timeline (Phase 1).

## Milestone M3 (4-6 weeks)

- Release Route Exploration Missions (Phase 1-2).
- Upgrade crowding and commute predictions to probabilistic models.

## Suggested Team Split

- Realtime/Data: event ingestion, model features, forecast APIs
- Routing/Backend: emergency routing, scoring engines
- Web/UI: map layers, recommendation cards, mission UX
- QA/Analytics: feature metrics, A/B validation, reliability monitoring

## Observability and KPIs

Track these metrics per feature:

- API latency and error rate
- recommendation acceptance rate
- reroute success rate (arrival within predicted band)
- mission engagement and retention impact
- crowding forecast calibration error

## Risk Register

- Data sparsity for crowding inference in low-volume stops.
- Prediction trust risk if confidence is not surfaced clearly.
- Privacy risk for commute profiling without strong controls.
- UI overload risk if multiple recommendation modules compete.

Mitigations:

- Always show confidence and reason tags.
- Keep all personalization opt-in with one-tap disable.
- Use feature flags and gradual rollout by cohort.

## Definition of Done (Feature-Level)

A feature is done only when all are complete:

- Functional acceptance criteria met
- performance budgets met
- telemetry dashboards live
- fallback/empty-state UX complete
- docs and runbooks updated
