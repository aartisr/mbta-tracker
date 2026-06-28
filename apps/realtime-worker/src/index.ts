import { DurableObject } from "cloudflare:workers";
import { JsonFeedPoller } from './poller';

type Env = {
  VEHICLE_HUB: DurableObjectNamespace<VehicleHub>;
};

const POLL_MS = 5000;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: "mbta-realtime-worker" });
    }

    if (url.pathname === "/ws") {
      const id = env.VEHICLE_HUB.idFromName("global");
      const stub = env.VEHICLE_HUB.get(id);
      return stub.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  }
};

export class VehicleHub extends DurableObject {
  private poller = new JsonFeedPoller();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const upgrade = request.headers.get("Upgrade");
    if (upgrade !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    this.ctx.acceptWebSocket(server);

    const alarm = await this.ctx.storage.getAlarm();
    if (alarm === null) {
      await this.ctx.storage.setAlarm(Date.now() + POLL_MS);
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  async alarm(): Promise<void> {
    const sockets = this.ctx.getWebSockets();
    if (!sockets.length) {
      return;
    }

    try {
      const updates = await this.poller.poll();
      if (updates.length > 0) {
        const payload = JSON.stringify(updates);
        for (const ws of sockets) {
          try {
            ws.send(payload);
          } catch {
            ws.close(1011, "send-failed");
          }
        }
      }
    } finally {
      if (this.ctx.getWebSockets().length > 0) {
        await this.ctx.storage.setAlarm(Date.now() + POLL_MS);
      }
    }
  }

  webSocketMessage(_ws: WebSocket, _message: ArrayBuffer | string): void {
    // Server-push only — no client messages expected.
  }

  webSocketClose(ws: WebSocket): void {
    try {
      ws.close();
    } catch {
      // Ignore close errors from already-closed sockets.
    }
  }
}

