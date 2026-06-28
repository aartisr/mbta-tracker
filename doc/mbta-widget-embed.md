# MBTA Widget Embed Guide

## What This Is

The tracker now has a reusable `TrackerWidget` component and a dedicated `/embed` route for iframe embedding.

This is the simplest way to drop the tracker into another website without coupling that site to the app's build system.

## Recommended Embed Pattern

Use an iframe for isolation and reliability:

```html
<iframe
  src="https://YOUR_DOMAIN/embed?embed=1&ws=wss://YOUR_FEED_HOST/ws"
  title="MBTA Live Tracker"
  loading="lazy"
  style="width:100%;height:720px;border:0;border-radius:20px;overflow:hidden"
></iframe>
```

## Programmatic Mount

If you are already using Svelte, you can mount the widget directly:

```ts
import { mountTracker } from '@your-package/tracker';

mountTracker({
  target: document.getElementById('tracker-root')!,
  config: {
    wsUrl: 'wss://YOUR_FEED_HOST/ws',
    title: 'MBTA Live',
    embedded: false
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

## Default Behavior

If you do not provide values:

- the widget uses a Boston-centered map
- the default MapLibre demo style is used
- the widget shows live vehicles, search, and status
- the layout adapts to narrow screens automatically

## Example With Customization

```html
<iframe
  src="https://YOUR_DOMAIN/embed?embed=1&title=MBTA%20Live&subtitle=Downtown%20corridor&ws=wss://YOUR_FEED_HOST/ws&zoom=12&list=true&alerts=true"
  title="MBTA Live Tracker"
  loading="lazy"
  style="width:100%;height:640px;border:0;border-radius:20px;overflow:hidden"
></iframe>
```

## Operational Notes

- Prefer `wss://` when the host page is served over HTTPS.
- Keep the iframe height explicit so the map has room to breathe.
- If the feed becomes unavailable, the widget will keep showing the last valid state and connection status.
