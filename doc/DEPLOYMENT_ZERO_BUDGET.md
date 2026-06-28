# Zero Budget Deployment Guide

This guide shows the free deployment path for the repo with no paid services.

## Recommended Free Stack

- Frontend: Cloudflare Pages
- Realtime backend: Cloudflare Workers
- Widget/embed assets: Cloudflare-hosted release artifacts or skip at first

## What You Need

- A free Cloudflare account
- A GitHub repo connected to Cloudflare Pages
- Cloudflare Wrangler auth for Worker deployment
- Your MBTA Tracker repo checked out locally

## What You Do Not Need

- Vercel
- Paid hosting
- Paid database
- Paid CDN

## Step 1: Confirm the repository layout

The repo is already split into:

- `apps/web` for the SvelteKit frontend
- `apps/realtime-worker` for the Cloudflare Worker backend
- `apps/server` for local development only

For zero-budget deployment, use Cloudflare for the public app and worker. Keep `apps/server` local-only.

## Step 2: Deploy the realtime worker

The web app needs a public websocket endpoint.

From the repo root:

```bash
npm run deploy:cf:worker:dry-run
```

If that looks good, deploy for real:

```bash
npm run deploy:cf:worker
```

When this succeeds, you will get a Worker URL like:

```text
wss://<worker-name>.<subdomain>.workers.dev/ws
```

Keep that URL handy.

## Step 3: Create the Cloudflare Pages project

In Cloudflare Pages:

1. Click `Create a project`
2. Connect your GitHub repo
3. Set the root directory to `apps/web`
4. Keep the framework preset as `SvelteKit`
5. Set the build command to `npm run pages:build`
6. Set the output directory to `.svelte-kit/cloudflare`
7. Set the Node.js version to `22`
8. Let Cloudflare handle the output from the SvelteKit adapter

The web app already uses the Cloudflare adapter, so you do not need to change it for this free deployment path.

## Step 4: Set the websocket environment variable

In the Pages project settings, add:

```text
PUBLIC_WS_URL=wss://<worker-name>.<subdomain>.workers.dev/ws
```

This tells the frontend where to connect for realtime updates.

## Step 5: Deploy the Pages site

Push your code to GitHub.

Cloudflare Pages should build and deploy automatically.

If you just fixed registry settings or other install problems, clear the Pages cache once before retrying.

When it is live, open the Pages URL and confirm:

- the homepage loads
- search works
- realtime status connects
- vehicles and arrivals appear

## Step 6: Verify the Worker endpoint

Check the worker health endpoint in your browser or with curl:

```bash
curl https://<worker-name>.<subdomain>.workers.dev/health
```

You want a healthy response before assuming the frontend is broken.

## Step 7: Optional widget deployment

If you want the embeddable widget to be used on another site:

- keep the same worker URL
- build the widget release artifacts
- host them on a free Cloudflare-compatible static location if available

If you do not need external embeds yet, skip this step.

## Common Free-Tier Limits

- Pages builds can be rate-limited on the free plan
- Workers free tier has request limits
- Durable Objects on free are more limited than paid plans

For a personal project or low traffic, this is usually enough.

## If Something Fails

- If the frontend cannot connect, confirm `PUBLIC_WS_URL`
- If the worker fails, redeploy with `npm run deploy:cf:worker`
- If search or arrivals fail locally, use `npm run dev` in the repo root to debug
- If Pages still sees old install metadata, clear the Pages build cache and redeploy

## Summary

The simplest zero-budget path is:

1. Deploy the Cloudflare Worker
2. Deploy `apps/web` to Cloudflare Pages
3. Set `PUBLIC_WS_URL`
4. Verify the app in production
