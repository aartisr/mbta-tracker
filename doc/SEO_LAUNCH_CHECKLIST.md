# SEO and Share Launch Checklist

Use this checklist before sharing MBTA Tracker publicly or submitting it for indexing.

## Search Essentials

- Confirm the production domain loads with `200` and the canonical URL points to the live host.
- Verify `/robots.txt` is reachable and includes the sitemap reference.
- Verify `/sitemap.xml` includes `/` and `/share`.
- Make sure the home page and `/share` have unique titles and descriptions.
- Confirm the open graph image URL returns `200`.

## Indexing Submissions

- Submit the live sitemap in Google Search Console.
- Submit the live sitemap in Bing Webmaster Tools.
- Inspect the home page URL and the `/share` URL after deployment.
- Request indexing only after the production build is live and stable.

## Social Preview Checks

- Test link previews in iMessage, Slack, Discord, X, and LinkedIn.
- Verify the title, description, and image match the live page.
- Check the 1200x630 social image on desktop and mobile.
- Confirm the share page copy is concise and readable when pasted into chat.

## AI Discovery Checks

- Verify `llms.txt` is reachable from the public site.
- Keep the public copy factual, compact, and route-focused.
- Mention the app name, primary pages, and APIs clearly in docs.
- Avoid duplicating contradictory claims across README, status docs, and the app.

## Release Hygiene

- Rebuild after metadata changes and confirm the sitemap refreshes.
- Clear any stale Cloudflare Pages cache if previews look old.
- Re-test the home page, `/share`, `/embed`, and `/health` after deployment.
- Capture one final screenshot of the homepage and one of the share page before announcing the release.
