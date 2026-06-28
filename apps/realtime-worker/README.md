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

Wrangler currently requires Node.js 22 or newer for `dev`, `deploy`, and `deploy:dry-run`. If those commands fail locally, switch your shell to Node 22 first.

If you use Wrangler type generation for the web app or worker configs, keep any `worker-configuration.d.ts` file in the Wrangler-generated format. Cloudflare's build checks reject hand-written placeholders.

## Deploy

Use the single repo checklist in [`../../doc/DEPLOYMENT_ZERO_BUDGET.md`](../../doc/DEPLOYMENT_ZERO_BUDGET.md).

That checklist covers:

- `npm run deploy:cf:worker:dry-run`
- `npm run deploy:cf:worker`
- the worker health endpoint
- the `PUBLIC_WS_URL` value for Pages

## Troubleshooting

- If deploy fails with auth errors, run `npx wrangler login`
- If the worker endpoint works but Pages cannot connect, confirm `PUBLIC_WS_URL`
- If local dev fails, run `npm run dev` in `apps/realtime-worker`
