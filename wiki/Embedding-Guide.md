# Embedding guide

Use the public tracker in an iframe when a school, nonprofit, neighborhood group, or publication needs a focused transit view without coupling to the app build system.

```html
<iframe
  src="https://mbta.ai-aarti.com/embed?embed=1&ws=wss://YOUR_FEED_HOST/ws"
  title="MBTA Live Tracker"
  loading="lazy"
  style="width:100%;height:720px;border:0"
></iframe>
```

Use a descriptive iframe title, a secure `wss://` endpoint on HTTPS pages, and an explicit height. Nearby editorial text should link to the full [MBTA Tracker](https://mbta.ai-aarti.com/) so riders can expand beyond the embedded view.

For all supported configuration values and programmatic mounting, use the [complete embed guide](https://github.com/aartisr/mbta-tracker/blob/main/doc/mbta-widget-embed.md).
