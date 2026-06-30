# MBTA Tracker Mobile UX/UI Master Plan

## Purpose

This document turns a broad UX ambition into a concrete, mobile-first redesign plan for MBTA Tracker.

The goal is not just "better visuals." The goal is to make the product feel immediate, calm, and obvious on a phone:

- One clear primary action per screen.
- The next transit answer visible in seconds.
- Large tap targets and minimal cognitive load.
- Progressive disclosure for everything secondary.
- Honest freshness, offline, and service-state messaging.

This plan is intentionally opinionated. It is built for the current repo, especially:

- `apps/web/src/routes/+page.svelte`
- `apps/web/src/lib/SearchBox.svelte`
- `apps/web/src/lib/ArrivalCard.svelte`
- `apps/web/src/lib/RouteView.svelte`
- `apps/web/src/lib/StopView.svelte`
- `apps/web/src/lib/tracker/TrackerWidget.svelte`
- `apps/web/src/routes/+layout.svelte`

## How The Research Was Done

I reviewed the current app structure and then benchmarked 25 high-traffic, mobile-savvy websites and products that are strong at at least one of these:

- search-first navigation
- mobile conversion flow
- content discovery
- category browsing
- dense-data presentation without overwhelming the screen
- trust, clarity, and action hierarchy

I also used two design-system references as general principles:

- Apple Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/
- Material Design 3 layout and bottom-sheet/search patterns: https://m3.material.io/

Some of the benchmark sites are app-like experiences that are not transit products. That is deliberate: MBTA Tracker should borrow the best mobile interaction patterns from the strongest consumer products, then adapt them for transit.

## Benchmark Set

This is an opinionated benchmark set, not a statistically ranked list.

1. [Apple](https://www.apple.com/)
   - Teaches: extremely clear hierarchy, big media moments, low clutter, and an almost frictionless path from hero to action.
2. [Google Maps](https://www.google.com/maps)
   - Teaches: search-first utility, app-like simplicity, and ruthless focus on the core task.
3. [Uber](https://www.uber.com/)
   - Teaches: a single primary flow with a small number of large fields, immediate payoff, and minimal decision fatigue.
4. [Airbnb](https://www.airbnb.com/)
   - Teaches: structured search inputs, stepwise planning, and a calm booking funnel.
5. [Booking.com](https://www.booking.com/)
   - Teaches: direct task completion, dense-but-scannable inventory, and persistent conversion cues.
6. [Amazon](https://www.amazon.com/)
   - Teaches: utilitarian navigation, deep category coverage, and strong recognition over memorization.
7. [Instacart](https://www.instacart.com/)
   - Teaches: category-first shopping, quick re-entry into common tasks, and highly visible utility.
8. [DoorDash](https://www.doordash.com/)
   - Teaches: category browsing, location/context awareness, and a clear path to the next action.
9. [Spotify](https://www.spotify.com/)
   - Teaches: lightweight entry into personalized content and an interface that stays out of the way.
10. [YouTube](https://www.youtube.com/)
    - Teaches: feed-based discovery, strong thumbnail hierarchy, and massive tap targets.
11. [Duolingo](https://www.duolingo.com/)
    - Teaches: habit loops, compact progress feedback, and delight without clutter.
12. [Pinterest](https://www.pinterest.com/)
    - Teaches: visual discovery, endless browseability, and fast scanning of many options.
13. [Instagram](https://www.instagram.com/)
    - Teaches: immersive content, very thin chrome, and content-first interaction.
14. [LinkedIn](https://www.linkedin.com/)
    - Teaches: controlled density, content chips, and clear segmentation of audiences and actions.
15. [Reddit](https://www.reddit.com/)
    - Teaches: sort/filter controls that remain useful even as content volume rises.
16. [Canva](https://www.canva.com/)
    - Teaches: template-first entry, action-oriented creation, and approachable complexity.
17. [Notion](https://www.notion.com/)
    - Teaches: strong product architecture, modular explanation, and a clean multi-audience landing experience.
18. [Stripe](https://stripe.com/)
    - Teaches: crisp proposition, excellent information hierarchy, and CTAs that do not compete with the message.
19. [Revolut](https://www.revolut.com/)
    - Teaches: app-first banking language, social proof, and a strong mobile signup posture.
20. [Monzo](https://monzo.com/)
    - Teaches: simple banking language, calm visuals, and a focus on trust.
21. [Nike](https://www.nike.com/)
    - Teaches: editorial/product balance, disciplined category structure, and immersive imagery without losing purpose.
22. [Etsy](https://www.etsy.com/)
    - Teaches: search-led shopping, gift/recommendation shortcuts, and category curation that feels human.
23. [Dropbox](https://www.dropbox.com/)
    - Teaches: use-case-driven organization and a clear separation between product families.
24. [Figma](https://www.figma.com/)
    - Teaches: modular explanation of a complex product suite and clear product segmentation.
25. [BBC](https://www.bbc.com/)
    - Teaches: content prioritization, readability, and the importance of keeping the scan path obvious.

## What The Best Mobile Sites Have In Common

Across the benchmark set, the strongest mobile experiences consistently do the following:

- Start with one obvious next action.
- Reduce navigation options until the user has a reason to expand them.
- Use large, separated touch targets.
- Keep the first screen short and decision-light.
- Push details into cards, drawers, or bottom sheets.
- Use bottom-aligned controls when the primary task is frequent and one-handed.
- Separate browse mode from detail mode.
- Make status, freshness, and trust visible, not hidden.
- Use text hierarchy before color.
- Treat search as a primary command surface, not just a utility.
- Make filters and sort options available without taking over the whole screen.
- Use progressive disclosure instead of long dense pages.
- Keep the content tree shallow.

## Current Repo Audit

The current app is already strong on functionality, but the UI has accumulated too many parallel surfaces for mobile:

- The home page in `apps/web/src/routes/+page.svelte` carries search, accessibility settings, mode switches, map controls, boarding intelligence, and multiple detail views in one shell.
- `apps/web/src/lib/SearchBox.svelte` already has recent searches, favorites, voice input, and autocomplete, but it is still shaped like a desktop-first command surface.
- `apps/web/src/lib/ArrivalCard.svelte` is compact, but the card still exposes a lot of metadata at once and uses several small badges.
- `apps/web/src/lib/RouteView.svelte` and `apps/web/src/lib/StopView.svelte` both have strong data density, but they need a more mobile-friendly hierarchy and more collapse-by-default behavior.
- `apps/web/src/lib/tracker/TrackerWidget.svelte` already contains map/list modes, bottom-sheet-like state, and mobile behaviors, which makes it the best place to introduce a truly mobile-first interaction model.
- `apps/web/src/routes/+layout.svelte` currently uses a soft decorative background. It is pleasant, but on mobile it can compete with the actual transit information if the content also becomes visually busy.

## Redesign Principles

### 1. The first screen should answer "what should I tap now?"

For MBTA Tracker, the first tap should usually be one of:

- search for a route, stop, address, or vehicle
- use current location
- open a recent query
- continue a previously viewed stop or route

Everything else should support those actions, not compete with them.

### 2. Mobile needs a bottom-sheet mental model

On a phone, the app should behave like a layered tool:

- top layer: search and primary action
- middle layer: summary results
- lower layer: details, alerts, and secondary controls

This avoids long vertical pages full of competing sections.

### 3. Transit should feel time-native, not dashboard-native

The most important thing is time, then proximity, then service state.

Use this order consistently:

1. next arrival or next useful action
2. route or stop identity
3. live/scheduled/freshness state
4. accessibility or crowding
5. expanded operational detail

### 4. Secondary actions should not steal visual weight

Settings, accessibility preferences, mode switches, and map controls are important, but they should not dominate the first viewport.

### 5. Trust is part of UX

If data is stale, cached, partial, or offline, say so clearly and calmly.

That honesty is more important than decorative polish.

## Proposed Mobile Information Architecture

### Home

Primary purpose:

- let the user find the next transit answer quickly

Recommended structure:

- compact hero
- one search bar
- current location button
- recent searches and favorites
- quick query chips
- a single compact trust/status line

### Search Results

Primary purpose:

- turn a query into the right detail view with one tap

Recommended structure:

- results grouped by type
- strong result title
- one-line reason this match matters
- one primary action per row
- optional expand affordance for detail

### Stop View

Primary purpose:

- show the next arrivals and service context at a stop

Recommended structure:

- stop identity header
- live freshness/status
- inline alerts before arrivals
- inbound/outbound as segmented tabs or stacked accordions
- arrivals sorted by imminence
- details tucked behind expand controls

### Route View

Primary purpose:

- help the user understand the route quickly, then optionally inspect stop sequence

Recommended structure:

- route summary hero
- next service snapshot
- compact sequence list
- collapsible stop groups
- route-wide crowding and alert context

### Vehicle View

Primary purpose:

- show vehicle identity and next movement details at a glance

Recommended structure:

- large route/vehicle identity
- next stop and ETA
- direction and heading
- contextual metadata in a concise grid

### Widget / Map Shell

Primary purpose:

- preserve the power of the map while preventing it from taking over on small screens

Recommended structure:

- map first only when the user chooses it
- otherwise list-first with a map toggle
- bottom sheet for filters, modes, and selected details
- sticky recenter and share actions

## Component-Level Plan

### `SearchBox.svelte`

Changes:

- Convert the search experience into a clearer command bar on mobile.
- Make recent searches and favorites into a compact sheet instead of a large dropdown stack.
- Keep autocomplete suggestions touch-friendly and visually separated.
- Keep voice search as secondary, not as a competing primary control.
- Add stronger empty, loading, and no-results states.

Mobile behavior:

- keyboard opens immediately when search is focused
- suggestions become a bottom sheet or slide-up panel on narrow screens
- the clear button and submit button should be easy to hit with one thumb

### `ArrivalCard.svelte`

Changes:

- Reduce badge noise.
- Use a stricter hierarchy:
  - route badge
  - ETA
  - destination
  - live/scheduled state
  - delay/crowding/accessibility as secondary chips
- Make the whole card feel like one actionable unit.

Mobile behavior:

- increase vertical spacing slightly
- preserve a 44px-ish touch target feel
- keep labels shorter on narrow screens

### `StopView.svelte`

Changes:

- Put the stop name, freshness, and service alerts at the top.
- Make inbound and outbound more visually obvious and easier to switch between.
- Collapse less important diagnostics by default.
- Move boarding suggestions into an expandable assistant-like section.

Mobile behavior:

- sticky summary header when scrolling
- arrivals list can become a swipeable or segmented stack
- alerts should be readable before the user reaches arrival cards

### `RouteView.svelte`

Changes:

- Make route overview the primary section, not the stop list.
- Keep the stop list linear and scannable.
- Use a compact stop index and subtle crowding indicator.
- Collapse long sequences by default on mobile, with progressive expansion.

Mobile behavior:

- route summary should stay pinned while the user scrolls the sequence
- tapping a stop should reveal only the minimum necessary detail first

### `TrackerWidget.svelte`

Changes:

- Use the existing map/stops split as the foundation for a true mobile shell.
- Make the list view the default on narrow screens unless the user explicitly wants the map.
- Turn side panels into bottom sheets or docked drawers on mobile.
- Make selected vehicle and selected stop detail reachable without leaving the main context.

Mobile behavior:

- sticky mode switch
- map expand/collapse control that is thumb reachable
- selected item detail should appear as a sheet, not a side rail

### `+layout.svelte`

Changes:

- Keep the background atmosphere, but simplify it on very small screens.
- Reduce visual competition between the page chrome and the transit content.
- Ensure the page still feels branded without becoming visually busy.

## Visual System Direction

The current palette is calm and pleasant, but the next version should be more decisive.

Recommended direction:

- a restrained transit-blue and slate base
- one accent color for live state
- one warning color for delays/alerts
- one success color for freshness and valid live data
- less decorative gradient layering on mobile
- more functional contrast and stronger type scale

Type direction:

- larger default body text on mobile
- tighter hierarchy between title, subtitle, and metadata
- less use of all-caps labels unless the label is truly a chip or category

Spacing direction:

- fewer stacked sections per viewport
- more breathing room between tap targets
- more visual separation between actionable rows

## Interaction Patterns To Adopt

### Bottom Sheet

Use bottom sheets for:

- search suggestions
- route/stop filters
- settings
- selected stop or selected vehicle detail

### Sticky Summary Bars

Use sticky bars for:

- stop name and freshness
- route name and service state
- search query and result count

### Segmented Controls

Use segmented controls for:

- inbound vs outbound
- list vs map
- all modes vs one mode

### Progressive Disclosure

Hide behind expanders:

- accessibility detail
- platform or stop metadata
- secondary crowding details
- advanced settings

### Thumb-First Layout

Keep the main action and the most common follow-up actions within the thumb zone on tall phones.

## Concrete Mobile Screen Plan

### Phase 1: Rebuild The Home Flow

Goal:

- make the first interaction feel faster and simpler

Deliverables:

- replace competing top-of-page blocks with a focused hero
- make search clearly primary
- add recent queries and shortcut chips
- improve mobile spacing and tap target size
- reduce the number of visible toggles in the first viewport

### Phase 2: Reframe Search And Results

Goal:

- make search results easier to scan and act on

Deliverables:

- redesign suggestion presentation for mobile
- simplify result cards
- create clearer result-type grouping
- make the action label consistent across stop, route, address, vehicle, and landmark

### Phase 3: Make Detail Views Feel Native On Mobile

Goal:

- reduce the feeling that the user is "entering a desktop report"

Deliverables:

- stop view becomes summary first, details second
- route view becomes overview plus collapsible sequence
- vehicle view becomes an identity-and-movement sheet

### Phase 4: Rework The Widget And Map Experience

Goal:

- preserve map power without forcing map-first behavior

Deliverables:

- map/list toggle redesigned for one-thumb use
- bottom sheet for details
- cleaner expand/recenter/share affordances
- stronger small-screen behavior in embedded contexts

### Phase 5: Polish, Accessibility, And Performance

Goal:

- make the experience robust, legible, and trustworthy

Deliverables:

- reduced motion support
- high contrast tuning
- stronger focus states
- better loading skeletons
- clearer stale/offline states
- screen-reader pass on the main flows

## Acceptance Criteria

The redesign is not done until these are true:

- A first-time mobile user can search and open a result without feeling crowded.
- The primary CTA remains obvious on 360 px wide screens.
- No key screen requires horizontal scrolling.
- All important controls remain comfortably tappable.
- Alerts and freshness are visible without hunting.
- The map no longer dominates the screen by default on mobile.
- Search suggestions, settings, and filters feel like supportive layers, not extra pages.
- The interface remains understandable at 100% browser zoom.

## Success Metrics

Measure the redesign against outcomes, not opinions:

- time to first useful result
- search-to-open conversion
- tap error rate on mobile
- scroll depth on home and detail pages
- settings discovery rate
- usage of recent searches and shortcuts
- rate of returning users opening a saved route or stop in one tap
- perceived clarity in a quick usability test

## Suggested Build Order

1. Simplify the home page and search entry.
2. Reduce result-card density.
3. Rework stop and route detail screens for mobile-first hierarchy.
4. Convert secondary controls into bottom sheets or compact drawers.
5. Tune colors, spacing, typography, and motion.
6. Run mobile QA on narrow, medium, and large phones.

## Final Recommendation

MBTA Tracker should feel like a transit-native command surface:

- fast to search
- easy to scan
- calm under pressure
- transparent about data freshness
- designed for the thumb, not just the mouse

The product already has strong functionality. The opportunity now is to make the interface disappear in the best possible way so the user gets to the answer with almost no friction.

## Source Links

- Apple Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/
- Material Design 3: https://m3.material.io/
- Apple: https://www.apple.com/
- Google Maps: https://www.google.com/maps
- Uber: https://www.uber.com/
- Airbnb: https://www.airbnb.com/
- Booking.com: https://www.booking.com/
- Amazon: https://www.amazon.com/
- Instacart: https://www.instacart.com/
- DoorDash: https://www.doordash.com/
- Spotify: https://www.spotify.com/
- YouTube: https://www.youtube.com/
- Duolingo: https://www.duolingo.com/
- Pinterest: https://www.pinterest.com/
- Instagram: https://www.instagram.com/
- LinkedIn: https://www.linkedin.com/
- Reddit: https://www.reddit.com/
- Canva: https://www.canva.com/
- Notion: https://www.notion.so/
- Stripe: https://stripe.com/
- Revolut: https://www.revolut.com/
- Monzo: https://monzo.com/
- Nike: https://www.nike.com/
- Etsy: https://www.etsy.com/
- Dropbox: https://www.dropbox.com/
- Figma: https://www.figma.com/
- BBC: https://www.bbc.com/
