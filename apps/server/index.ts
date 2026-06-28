import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import type { FeedPoller } from '@mbta/transit-core';
import { PROTOBUF_FEED_URL, ProtobufFeedPoller, loadFeedMessageType } from './poller';
import apiServer from './src/api-server';

const POLL_MS = 5000;
const HTTP_PORT = process.env.HTTP_PORT || 3000;
const WS_PORT = process.env.WS_PORT || 8080;

// Create HTTP server
const httpServer = createServer(apiServer);

// Create WebSocket server
const wss = new WebSocketServer({ port: parseInt(String(WS_PORT)) });

let poller: FeedPoller | null = null;

void loadFeedMessageType('gtfs-realtime.proto').then((feedMessageType) => {
  poller = new ProtobufFeedPoller(feedMessageType, PROTOBUF_FEED_URL);

  setInterval(async () => {
    if (!poller) {
      return;
    }

    try {
      const changes = await poller.poll();
      if (changes.length) {
        const payload = JSON.stringify(changes);
        wss.clients.forEach((client) => client.send(payload));
      }
    } catch (err) {
      console.error('[server] poll error:', err);
    }
  }, POLL_MS);
});

// Start HTTP server
httpServer.listen(HTTP_PORT, () => {
  console.log(`[server] HTTP API listening on port ${HTTP_PORT}`);
});

// Start WebSocket server
console.log(`[server] WebSocket server listening on port ${WS_PORT}`);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[server] SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('[server] HTTP server closed');
    process.exit(0);
  });
});

