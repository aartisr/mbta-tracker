# Quick Reference: Using MBTA Tracker Services

> Fast reference for developers. See `ARCHITECTURE.md` for detailed explanation.

## Initialization

### Production

```typescript
import { initializeGlobalContainer } from '$lib/tracker/services';

// Initialize once on app startup
initializeGlobalContainer({
  transportType: 'websocket',
  enableLogging: process.env.NODE_ENV === 'development'
});
```

### Testing

```typescript
import { TestServiceContainer } from '$lib/tracker/services';
import { vi } from 'vitest';

const mockTransport = {
  on: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  status: () => 'open',
  lastOpenedAt: () => Date.now()
};

const container = new TestServiceContainer({
  getTransport: () => mockTransport as any
});
```

---

## Using Services

### Transport (Realtime Data)

```typescript
import { getGlobalContainer } from '$lib/tracker/services';

const container = getGlobalContainer();
const transport = container.getTransport();

// Listen for data
transport.on('data', (message) => {
  console.log('Vehicles:', message.vehicles);
});

// Handle errors
transport.on('error', (error) => {
  console.error('Transport error:', error);
});

// Handle disconnection
transport.on('close', () => {
  console.log('Connection closed');
});

// Connect
await transport.connect();

// Check status
console.log(transport.status()); // 'open' | 'connecting' | 'error' | etc.

// Disconnect
transport.disconnect();
```

### Data Repository

```typescript
import { getGlobalContainer } from '$lib/tracker/services';

const container = getGlobalContainer();
const repo = container.getRepository();

// Get all stops (cached 24h)
const allStops = await repo.getAllStops();

// Get stops near location (automatic distance filtering)
const nearby = await repo.getNearbyStops({
  latitude: 42.36,
  longitude: -71.06
}, 800); // 800 meters

// Get specific stop
const stop = await repo.getStop('stop-1');
```

### Geo Repository

```typescript
const container = getGlobalContainer();
const geo = container.getGeoRepository();

// Geocode address → coordinates
const location = await geo.geocodeAddress('1 Park Plaza Boston');
// { latitude: 42.355, longitude: -71.063 }

// Get user's location
const myLocation = await geo.getUserLocation();

// Reverse geocode coordinates → address
const address = await geo.reverseGeocode(42.36, -71.06);
// "Boston, MA, USA"
```

### Mode Detection & Styling

```typescript
import { ModeService } from '$lib/tracker/services';

// Detect mode from data
const mode = ModeService.detectMode({
  routeId: 'boat-1',
  routeLabel: 'Harbor Ferry',
  routeType: 4
});
// Returns: 'ferry'

// Get colors for route
const style = ModeService.getStyle('red', 'subway');
// { body: '#DA291C', stroke: '#A31F15', accent: '#FF8A80' }

// Get colors for mode only
const modeStyle = ModeService.getModeStyle('ferry');
// { body: '#0284c7', stroke: '#0369a1', accent: '#7DD3FC' }

// Add custom detection rule (runs before built-in rules)
ModeService.addModeRule((data) => {
  if (data.routeId === 'custom-express') {
    return 'bus';
  }
  return null; // Let other rules decide
}, 600); // Priority (higher = earlier)

// Set custom colors
ModeService.setStyle('custom-line', {
  body: '#FF00FF',
  stroke: '#AA00AA',
  accent: '#FF88FF'
});
```

---

## Component Usage

### In Svelte Components

```svelte
<script>
  import { getGlobalContainer } from '$lib/tracker/services';
  
  const container = getGlobalContainer();
  const transport = container.getTransport();
  const repo = container.getRepository();
  
  let stops = [];
  
  onMount(async () => {
    // Load nearby stops
    stops = await repo.getNearbyStops({
      latitude: 42.36,
      longitude: -71.06
    });
    
    // Listen for realtime updates
    transport.on('data', (message) => {
      // Handle updates
    });
  });
</script>
```

### Create Tracker Controller

```typescript
import { createTrackerController } from '$lib/tracker/controller';
import { getGlobalContainer } from '$lib/tracker/services';

const config = { /* your config */ };
const container = getGlobalContainer();

const controller = createTrackerController(config, container);
// Uses services from container automatically
```

---

## Common Patterns

### Depend on Abstractions, Not Implementations

```typescript
// ❌ WRONG: Tightly coupled
import { WebSocketTransport } from '$lib/tracker/services';
const transport = new WebSocketTransport({ url: '...' });

// ✅ RIGHT: Depend on interface
import type { RealtimeTransport } from '$lib/tracker/services';
const transport: RealtimeTransport = getGlobalContainer().getTransport();
```

### Test with Mocked Services

```typescript
import { TestServiceContainer } from '$lib/tracker/services';
import { vi } from 'vitest';

describe('TrackerWidget', () => {
  it('should handle vehicle updates', async () => {
    const mockTransport = {
      on: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      status: () => 'open',
      lastOpenedAt: () => Date.now()
    };
    
    const container = new TestServiceContainer({
      getTransport: () => mockTransport as any
    });
    
    // Use container in your test
  });
});
```

### Add Custom Detection Rule

```typescript
// For local transit system
import { ModeService } from '$lib/tracker/services';

ModeService.addModeRule((data) => {
  // Check for custom modes first
  if (data.routeId?.startsWith('express-')) {
    return 'bus';
  }
  if (data.routeId === 'light-rail-1') {
    return 'subway';
  }
  return null; // Try other rules
}, 700); // High priority
```

### Create Custom Transport

```typescript
import { BaseTransport, type TransportConfig } from '$lib/tracker/services';

export class PollingTransport extends BaseTransport {
  private pollInterval: number | null = null;
  
  async connect(): Promise<void> {
    this.setStatus('connecting');
    this.pollInterval = window.setInterval(async () => {
      try {
        const response = await fetch(this.config.url);
        const data = await response.json();
        this.emit('data', data);
        this.setStatus('open');
      } catch (error) {
        this.emit('error', error);
      }
    }, 5000);
  }
  
  disconnect(): void {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.setStatus('closed');
  }
}

// Use it
const container = new DefaultServiceContainer({
  transportUrl: 'https://api.example.com/vehicles'
});
```

---

## Error Handling

### Transport Errors

```typescript
transport.on('error', (error) => {
  const logger = container.getLogger();
  logger.error('Transport failed:', error);
  
  // Retry logic is automatic (exponential backoff)
  // Check status() to see connection state
});
```

### Repository Errors

```typescript
try {
  const stops = await repo.getAllStops();
} catch (error) {
  const logger = container.getLogger();
  logger.error('Failed to load stops:', error);
  // Provide fallback UI
}
```

### Logger Usage

```typescript
const logger = container.getLogger();

logger.debug('Debug message', { data });
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error occurred', error);

// Configure at startup
initializeGlobalContainer({
  enableLogging: true  // Uses ConsoleLogger
  // false uses SilentLogger (production)
});
```

---

## Configuration Options

```typescript
interface ServiceContainerConfig {
  transportType?: 'websocket' | 'sse' | 'polling';  // default: 'websocket'
  transportUrl?: string;                             // auto-detected if not provided
  useMockData?: boolean;                             // default: false
  enableLogging?: boolean;                           // default: false
  modeDetector?: ModeDetector;                       // custom detector
  styleProvider?: RouteStyleProvider;                // custom colors
}
```

---

## Lifecycle Management

```typescript
// Initialize once (typically in root +page.ts or main.ts)
import { initializeGlobalContainer, resetGlobalContainer } from '$lib/tracker/services';

// Startup
const container = initializeGlobalContainer({ enableLogging: true });

// During app usage
const currentContainer = getGlobalContainer();

// Cleanup (when destroying app)
resetGlobalContainer();
```

---

## Cheat Sheet

| Task | Code |
|------|------|
| Get container | `getGlobalContainer()` |
| Get transport | `container.getTransport()` |
| Get repository | `container.getRepository()` |
| Get geo | `container.getGeoRepository()` |
| Listen for data | `transport.on('data', handler)` |
| Get nearby stops | `repo.getNearbyStops(location)` |
| Detect mode | `ModeService.detectMode(data)` |
| Get style | `ModeService.getStyle(routeId, mode)` |
| Add rule | `ModeService.addModeRule(predicate, priority)` |
| Get logger | `container.getLogger()` |

---

**See `ARCHITECTURE.md` for detailed explanation of each pattern.**
