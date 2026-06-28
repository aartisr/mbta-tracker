# MBTA Realtime Worker

Cloudflare Worker + Durable Object backend for MBTA realtime vehicle updates.

## What this does

- Exposes `GET /health` for deploy verification
- Exposes `GET /ws` for the realtime websocket
- Polls MBTA vehicle data and fans updates out through a Durable Object

## Cloudflare runtime

This worker is configured in [`wrangler.toml`](./wrangler.toml) with:

- `name = "mbta-realtime-worker"`
- `main = "src/index.ts"`
- `compatibility_date = "2026-06-24"`
- Durable Object binding `VEHICLE_HUB`

## Deploy

From the repo root:

```bash
cd apps/realtime-worker
npm install
npm run deploy
```

Or from the repo root:

```bash
npm run deploy:cf:worker
```

Dry-run preflight:

```bash
npm run deploy:dry-run
```

## Verify

After deploy, confirm the worker responds:

```bash
curl https://<worker-name>.<subdomain>.workers.dev/health
```

The Pages app should use:

```text
PUBLIC_WS_URL=wss://<worker-name>.<subdomain>.workers.dev/ws
```

## Troubleshooting

- If deploy fails with auth errors, run `npx wrangler login`
- If the worker endpoint works but Pages cannot connect, confirm `PUBLIC_WS_URL`
- If local dev fails, run `npm run dev` in `apps/realtime-worker`
