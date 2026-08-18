# MBTA Tracker UX research and redesign record

## Goal

Make the immediate question answerable in one glance: **Where do I want to go?**

The product is a decision tool, not a feature catalogue. A rider should be able to search, understand the result, and act without first learning the interface.

## Research set: 25 excellent digital products

This is a pattern study rather than a literal visual copy exercise. The lessons below were cross-checked against Apple Human Interface Guidelines, GOV.UK Design System, Fluent, Carbon, Baymard search research, WCAG-oriented component guidance, and the products' public interfaces.

| Product | Pattern worth borrowing | MBTA Tracker interpretation |
| --- | --- | --- |
| Google Maps | Search is the entry point; map is context | Ask for a place first; open the map only when it answers the next question |
| Apple Maps | Quiet hierarchy and familiar controls | Keep the primary action leading and remove decorative competition |
| Citymapper | Journey-specific language | Use rider verbs such as find, track, and check |
| Transit | Fast live-arrival scan | Show time, direction, and confidence before secondary facts |
| Waze | One decisive action per screen | Avoid parallel panels that ask the rider to choose a workflow and a tool |
| Uber | Destination-first workflow | Make the first input self-explanatory |
| Lyft | Progressive disclosure | Reveal saved and advanced controls only after search or intent |
| Amtrak | Clear state and next steps | Use explicit loading, live, cached, and error labels |
| MBTA.com | Familiar local vocabulary | Retain route, stop, alert, and arrival terminology |
| Transport for London | Mode distinction with restrained color | Use color as an aid, never as the only cue |
| GOV.UK | One task at a time and plain language | Replace product language with short action labels |
| Apple | Hierarchy, alignment, forgiving paths | Preserve a clear Back action and consistent tab meaning |
| Google Search | Direct query-to-answer flow | Avoid interstitial explanation before a rider can search |
| Linear | Focused surface and low visual noise | Prefer whitespace and borders over layered decoration |
| Notion | Predictable progressive disclosure | Keep detailed controls in settings and contextual panels |
| Stripe | Strong information grouping | Separate action, result, and explanation into distinct regions |
| Airbnb | Search suggestions that teach input formats | Make autocomplete indicate route, stop, address, and vehicle types |
| Duolingo | Immediate feedback after an action | Confirm each workflow transition with concise status copy |
| Headspace | Calm visual pacing | Reduce animation and ornamental effects around urgent transit decisions |
| Spotify | Persistent, limited top-level navigation | Keep Search, Map, and Alerts as the only primary destinations |
| Slack | Clear unread urgency | Reserve alert color and count badges for genuinely actionable disruptions |
| Figma | Contextual tools rather than permanent controls | Put planning and accessibility controls behind a labelled settings menu |
| Shopify | Search is reliable and recoverable | Support plain-language queries, typos, recent searches, and no-result guidance |
| Vercel | Dense information without noisy decoration | Let typographic hierarchy carry meaning before cards, gradients, or shadows |
| Revolut | Honest state and concise summaries | Label live/cached/offline states immediately beside relevant data |

## Evidence that guided the decisions

- Apple recommends visible hierarchy, alignment, adequate separation between controls, and progressive disclosure. Its design principles also emphasize focus, agency, familiarity, clear feedback, and easy recovery from mistakes. [Apple layout guidance](https://developer.apple.com/design/human-interface-guidelines/layout) and [Apple design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles)
- GOV.UK advises simplifying an end-to-end journey before adding navigation or task lists; task names should be short verbs and status vocabulary should be minimal. [Navigate a service](https://design-system.service.gov.uk/patterns/navigate-a-service/) and [complete multiple tasks](https://design-system.service.gov.uk/patterns/complete-multiple-tasks/)
- Fluent recommends brief, plain-language navigation organized around the things people want most. [Fluent navigation guidance](https://fluent2.microsoft.design/components/web/react/core/nav/usage)
- Carbon requires logical, predictable keyboard order and native semantic controls. [Carbon accessibility guidance](https://carbondesignsystem.com/guidelines/accessibility/developers/)
- Baymard’s search research shows that autocomplete, query interpretation, result guidance, and no-result recovery are central to successful search—not extra decoration. [Search research](https://baymard.com/research/ecommerce-search)

## Applied changes in this release

1. Replaced the dense hero with one question, one sentence of input guidance, and the search field.
2. Reduced alternate starting points from four large cards to three compact, plain-language options.
3. Removed duplicate decision aids: hero pills, a progress rail, explanatory search guidance, and the large first-time onboarding panel.
4. Reduced the header to a legible product name and three stable destinations: Search, Map, and Alerts.
5. Preserved power-user features—keyboard shortcut, history, saved searches, accessibility choices, commute insight, trip planning, sharing, and embedding—but moved them outside the first decision path.
6. Kept live-state, alert counts, semantic buttons, skip link, and high-contrast support.

## Product-wide UX rules

- Each page opens with one primary action or answer, never a choice between multiple product concepts.
- Primary navigation has at most three destinations and never changes its meaning by context.
- A result card answers “what is this?” and “what happens if I select it?” before any decorative detail.
- Map content is demand-driven, not forced on a rider who already knows what they need.
- Loading, stale, offline, and error states are explicit and actionable.
- Keyboard and screen-reader flows use the same logical reading order as the visual flow.
- Mobile controls remain thumb reachable; persistent navigation must not cover results or input.

## Follow-up measurement

Use existing analytics only with appropriate consent and evaluate these outcomes after deployment:

1. Time from page load to first successful search.
2. Search abandonment rate before an input is submitted.
3. Result selection rate and time to open a stop or route.
4. No-result recovery rate.
5. Mobile task completion for “nearest stop,” “track a line,” and “check disruption.”
6. Accessibility regression checks at keyboard-only, 200% zoom, and narrow mobile widths.
