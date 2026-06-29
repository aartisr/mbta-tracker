# Zero Budget Deployment Checklist

This is the single deployment checklist for the repo. It is the free Cloudflare path and the one to follow end to end.

## What This Covers

- `apps/web` on Cloudflare Pages
- `apps/realtime-worker` as the realtime websocket backend
- Same-origin public API routes from the Pages app
- Free-tier Cloudflare-only deployment

## What You Need

- A free Cloudflare account
- A GitHub repo connected to Cloudflare Pages
- Wrangler login on your local machine for the Worker deploy
- Your MBTA Tracker repo checked out locally

## What You Do Not Need

- Vercel
- Paid hosting
- Paid database
- Paid CDN

## Checklist

1. Confirm the repo layout.
   - `apps/web` is the SvelteKit frontend and public API host.
   - `apps/realtime-worker` is the realtime websocket backend.
   - `apps/server` is local-development only.

2. Deploy the realtime worker.
   - From the repo root, run `npm run deploy:cf:worker:dry-run` first.
   - If that succeeds, run `npm run deploy:cf:worker`.
   - The deployed websocket URL will look like `wss://<worker-name>.<subdomain>.workers.dev/ws`.
   - Save that URL for the Pages app.

3. Create or edit the Cloudflare Pages project.
   - Connect the GitHub repo.
   - Set the root directory to `apps/web`.
   - Use the `SvelteKit` framework preset.
   - Set the build command to `npm run pages:build`.
   - Set the output directory to `.svelte-kit/cloudflare`.
   - Set Node.js to `22`.
   - Leave the deploy command at the Cloudflare default unless your account UI requires a custom value.

4. Set the Pages environment variables.
  - `PUBLIC_WS_URL=wss://<worker-name>.<subdomain>.workers.dev/ws`
  - `PUBLIC_API_BASE_URL` is optional and only needed if you deliberately move the API off the Pages origin.
  - `PUBLIC_CLARITY_PROJECT_ID=<your Microsoft Clarity project id>` enables session analytics if you want it.

5. Add the Pages KV binding.
   - Add a KV namespace binding named `MBTA_API_STATE`.
   - This stores commutes, privacy settings, missions, feedback, and community posts.

6. Deploy the Pages site.
   - Push to GitHub.
   - Let Cloudflare build and deploy automatically.
   - If you recently changed package installs or registry settings, clear the Pages build cache once and retry.

7. Verify the live app.
   - Open the Pages URL.
   - Confirm the homepage loads.
   - Confirm search works.
   - Confirm realtime status connects.
   - Confirm `/api/...` routes work on the same origin.

8. Verify the worker health endpoint.
   - Open `https://<worker-name>.<subdomain>.workers.dev/health`.
   - Or run `curl https://<worker-name>.<subdomain>.workers.dev/health`.

9. Optional: deploy the embeddable widget.
   - Keep the same worker URL.
   - Build and host the widget release artifacts if you need external embeds.

## Important Notes

- The Pages app already uses the Cloudflare adapter, so you do not need a separate API host.
- Do not add a handwritten `worker-configuration.d.ts`; if Wrangler generates one locally, keep that generated format only where Wrangler owns it.
- If Pages cannot connect to the worker, the first thing to check is `PUBLIC_WS_URL`.
- If Pages shows stale install behavior, clear the Pages build cache.
- The free Cloudflare plan is usually enough for a personal or low-traffic deployment, but it does have request and build limits.

## Quick Summary

1. Deploy the realtime worker.
2. Deploy `apps/web` to Cloudflare Pages.
3. Set `PUBLIC_WS_URL`.
4. Add `MBTA_API_STATE`.
5. Verify the live app and worker health endpoint.
