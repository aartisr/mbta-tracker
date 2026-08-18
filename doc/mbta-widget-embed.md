# MBTA Widget Embed Guide

## What This Is

The tracker now has a reusable `TrackerWidget` component and a dedicated `/embed` route for iframe embedding.

This is the simplest way to drop the tracker into another website without coupling that site to the app's build system.

## Recommended Embed Pattern

Use an iframe for isolation and reliability:

```html
<iframe
  src="https://mbta.ai-aarti.com/embed"
  title="MBTA Tracker: live Boston transit"
  loading="lazy"
  style="width:100%;min-height:560px;border:0;border-radius:20px;overflow:hidden"
></iframe>
```

That is all a host needs. The iframe defaults to the calm **compact preset**: map, search, live state, mode filter, and a visible credit link to MBTA Tracker and Aarti S Ravikumar. Live vehicle data is resolved by the tracker’s production configuration; a host only supplies `ws` when it intentionally operates its own compatible feed.

## Choose a preset, not a pile of controls

| Use case | URL | What riders see |
| --- | --- | --- |
| School, community, or article embed | `/embed` | Compact map-first tracker, search, mode filter, author credit |
| Operations dashboard | `/embed?compact=false&list=true&alerts=true` | Full map controls, vehicle list, and disruption panel |
| Fixed transit display | `/embed?search=false&compact=true` | Calm live-map display with only mode filters |

## Programmatic Mount

If you are already using Svelte, you can mount the widget directly:

```ts
import { mountTracker } from '@your-package/tracker';

mountTracker({
  target: document.getElementById('tracker-root')!,
  config: {
    title: 'MBTA Live',
    embedded: true,
    compact: true
  }
});
```

## Global Bootstrap

If you are loading a browser bundle from a script tag, install the global helper once and let the page auto-mount:

```html
<div
  data-mbta-tracker
  data-ws="wss://YOUR_FEED_HOST/ws"
  data-title="MBTA Live"
  data-embed="true"
  data-compact="true"
></div>

<script type="module">
  import { installTrackerBootstrap, mountTrackerAuto } from '/path/to/tracker.js';

  installTrackerBootstrap(window);
  mountTrackerAuto();
</script>
```

## Supported Query Parameters

- `ws` - WebSocket URL for the realtime feed
- `title` - main heading text
- `subtitle` - supporting text under the heading
- `style` - MapLibre style URL
- `center` - initial map center as `lon,lat`
- `zoom` - initial zoom level
- `list` - `true` or `false` to show the vehicle list
- `trips` - `true` or `false` to show trip snapshots
- `alerts` - `true` or `false` to show the status panel
- `search` - `true` or `false` to show search
- `embed` - `true` or `false` to switch to embedded layout mode
- `compact` - `true` for the minimal map-first embed preset, `false` for full controls

### Data attributes for auto-mount

- `data-mbta-tracker` - marks a mount root
- `data-ws` or `data-ws-url` - WebSocket URL
- `data-title` - widget title
- `data-subtitle` - widget subtitle
- `data-map-style` - MapLibre style URL
- `data-center` - initial center as `lon,lat`
- `data-zoom` - initial zoom
- `data-list` - `true` or `false`
- `data-trips` - `true` or `false`
- `data-alerts` - `true` or `false`
- `data-search` - `true` or `false`
- `data-embed` - `true` or `false`
- `data-compact` - `true` or `false`

## Default Behavior

If you do not provide values:

- the widget uses a Boston-centered map
- the default MapLibre demo style is used
- iframe and script-tag embeds use the compact map-first preset
- every instance shows a direct credit link to MBTA Tracker and Aarti S Ravikumar
- the layout adapts to narrow screens automatically

## Example With Customization

```html
<iframe
  src="https://mbta.ai-aarti.com/embed?title=MBTA%20Live&subtitle=Downtown%20corridor&zoom=12&compact=false&list=true&alerts=true"
  title="MBTA Live Tracker"
  loading="lazy"
  style="width:100%;height:640px;border:0;border-radius:20px;overflow:hidden"
></iframe>
```

## Operational Notes

- Prefer `wss://` when the host page is served over HTTPS.
- Keep the iframe height explicit so the map has room to breathe.
- If the feed becomes unavailable, the widget will keep showing the last valid state and connection status.
