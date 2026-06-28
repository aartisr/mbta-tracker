import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocketTransport } from './transport';

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }

  open(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  message(data: unknown): void {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  badMessage(data = 'not-json'): void {
    this.onmessage?.({ data });
  }
}

describe('WebSocketTransport', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket as unknown as typeof WebSocket);
  });

  it('emits parsed data messages and tracks open status', async () => {
    const transport = new WebSocketTransport({ url: 'ws://test.local' });
    const handler = vi.fn();
    transport.on('data', handler);

    await transport.connect();
    const socket = MockWebSocket.instances[0];
    socket.open();
    socket.message({ timestamp: 1, vehicles: [{ id: 'v1' }] });

    expect(transport.status()).toBe('open');
    expect(handler).toHaveBeenCalledWith({ timestamp: 1, vehicles: [{ id: 'v1' }] });
  });

  it('emits parse errors for malformed websocket messages', async () => {
    const transport = new WebSocketTransport({ url: 'ws://test.local' });
    const handler = vi.fn();
    transport.on('error', handler);

    await transport.connect();
    MockWebSocket.instances[0].badMessage();

    expect(handler).toHaveBeenCalled();
    expect(String(handler.mock.calls[0][0])).toContain('Failed to parse message');
  });
});