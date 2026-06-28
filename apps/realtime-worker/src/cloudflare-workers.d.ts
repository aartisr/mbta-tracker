declare module "cloudflare:workers" {
  export class DurableObject {
    constructor(ctx: DurableObjectState, env: unknown);
    readonly ctx: DurableObjectState;
    readonly env: unknown;
  }
}

interface DurableObjectNamespace<T = unknown> {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): T;
}

interface DurableObjectId {}

interface DurableObjectState {
  readonly storage: {
    getAlarm(): Promise<number | null>;
    setAlarm(time: number): Promise<void>;
  };
  acceptWebSocket(webSocket: WebSocket): void;
  getWebSockets(): WebSocket[];
}

declare const WebSocketPair: {
  new (): [WebSocket, WebSocket];
};

interface ResponseInit {
  webSocket?: WebSocket;
}
