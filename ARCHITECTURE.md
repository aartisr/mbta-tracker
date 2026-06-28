# MBTA Tracker - Modular Architecture Guide

## Overview

This document describes the new modular, highly maintainable architecture using proven design patterns.

## Architecture Layers

```
┌─────────────────────────────────────────────┐
│     UI Layer (Svelte Components)            │
│  ┌────────────────┬────────────────────┐   │
│  │  TrackerWidget │   StopFinder       │   │
│  │ (Refactored)   │ (Pluggable)        │   │
│  └────────────────┴────────────────────┘   │
└─────────────────────────────────────────────┘
                      ↓ (uses)
┌─────────────────────────────────────────────┐
│   Business Logic / State Management Layer   │
│  ┌────────────────────────────────────────┐ │
│  │   TrackerController (refactored)       │ │
│  │   - Event handling                     │ │
│  │   - State normalization                │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
                      ↓ (depends on)
┌─────────────────────────────────────────────┐
│         Services Layer (Pluggable)          │
│  ┌──────────────┐  ┌──────────────────────┐ │
│  │  Transport   │  │  Mode Detection      │ │
│  │  Abstraction │  │  & Route Styling     │ │
│  └──────────────┘  └──────────────────────┘ │
│                                              │
│  ┌──────────────┐  ┌──────────────────────┐ │
│  │ Repositories │  │  Service Container   │ │
│  │   (Data      │  │   (Dependency        │ │
│  │   Layer)     │  │    Injection)        │ │
│  └──────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────┘
                      ↓ (communicates with)
┌─────────────────────────────────────────────┐
│    External APIs / Data Sources             │
│  ┌──────────────┬────────────────────────┐  │
│  │  MBTA API    │  Nominatim / WebSocket │  │
│  └──────────────┴────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## Design Patterns Used

### 1. **Transport Adapter Pattern** (`services/transport.ts`)

**Problem Solved:** Different realtime data delivery mechanisms without changing consumer code.

**Components:**
- `RealtimeTransport` - Interface defining contract
- `BaseTransport` - Shared logic (reconnection, event dispatch, status tracking)
- `WebSocketTransport` - WebSocket implementation
- `SSETransport` - Server-Sent Events implementation

**Benefits:**
- Easy to add new transports (polling, gRPC, etc.)
- Testable in isolation
- Decouples frontend from transport mechanism

**Usage Example:**

```typescript
// Create preferred transport
const transport = new WebSocketTransport({
  url: 'ws://api.example.com/realtime',
  retryMs: 1000,
  maxRetryMs: 30000
});

// Same interface regardless of implementation
transport.on('data', (message) => {
  console.log('Received:', message);
});

await transport.connect();
```

### 2. **Repository Pattern** (`services/repositories.ts`)

**Problem Solved:** Centralized data access with caching, error handling, and testability.

**Components:**
- `TransitDataRepository` - Interface for transit data
- `GeoRepository` - Interface for geocoding/location services
- `MBTARepository` - MBTA API implementation with caching
- `MockTransitDataRepository` - Test implementation

**Benefits:**
- All API calls in one place
- Caching logic centralized
- Easy to swap implementations for testing
- Add new data sources without changing business logic

**Usage Example:**

```typescript
const repository = new MBTARepository();

// Automatic caching (24 hours)
const allStops = await repository.getAllStops();

// Nearby stops with distance calculation
const nearby = await repository.getNearbyStops({
  latitude: 42.36,
  longitude: -71.06
}, 800); // meters
```

### 3. **Factory Pattern** (`services/mode-service.ts`)

**Problem Solved:** Detecting transit mode from varied data sources with pluggable rules.

**Components:**
- `ModeDetector` - Interface for mode detection
- `MBTAModeDetector` - Multi-rule heuristic detector with priorities
- `RouteStyleProvider` - Central source for route colors/styling
- `ModeService` - Singleton access point

**Benefits:**
- Priority-based detection (route_type > ferry patterns > text heuristics > fallback)
- Easy to add custom detection rules
- Centralized styling removes hardcoding
- Testable rule system

**Usage Example:**

```typescript
// Use default detector
const mode = ModeService.detectMode({
  routeId: 'boat-1',
  routeLabel: 'Ferry',
  routeType: 4
}); // Returns 'ferry'

// Add custom rule for local system
ModeService.addModeRule((data) => {
  if (data.routeId?.startsWith('express-')) {
    return 'bus'; // Custom categorization
  }
  return null; // Let other rules decide
}, 850); // Priority

// Get styling
const style = ModeService.getStyle('red', 'subway');
// { body: '#DA291C', stroke: '#A31F15', accent: '#FF8A80' }
```

### 4. **Dependency Injection / Service Container** (`services/container.ts`)

**Problem Solved:** Loosely coupled services, easy testing, runtime configuration.

**Components:**
- `ServiceContainer` - Interface
- `DefaultServiceContainer` - Production implementation
- `TestServiceContainer` - Test implementation with overrides
- `Logger` - Logging interface (ConsoleLogger, SilentLogger)

**Benefits:**
- Single point of service configuration
- Easy to mock services for testing
- Consistent logging across app
- Easy to swap implementations globally

**Usage Example:**

```typescript
// Production setup (automatic defaults)
const container = new DefaultServiceContainer({
  transportType: 'websocket',
  enableLogging: true
});

const transport = container.getTransport();
const repository = container.getRepository();

// Test setup (with mocks)
const mockTransport = vi.fn();
const testContainer = new TestServiceContainer({
  getTransport: () => mockTransport as any
});

const testTransport = testContainer.getTransport();
// Now it's mocked for testing
```

### 5. **Composite Pattern** (For Future Stop Enrichment)

**Future Pattern:** Multiple data enrichment strategies combined.

**Example:**

```typescript
const enricher = new CompositeStopEnricher([
  new RealtimeArrivalsStrategy(vehicles),
  new AccessibilityStrategy(db),
  new StopWalkabilityStrategy(userLocation)
]);

const enrichedStops = await enricher.enrich(rawStops);
// Each stop now has arrivals, accessibility info, walk times
```

## Module Organization

```
apps/web/src/lib/tracker/
├── services/                          # NEW: Service layer (highly modular)
│   ├── index.ts                      # Clean exports
│   ├── transport.ts                  # Adapter: WebSocket, SSE, etc.
│   ├── repositories.ts               # Repository: Data access abstraction
│   ├── mode-service.ts               # Factory: Mode detection & styling
│   └── container.ts                  # DI: Service configuration
├── types.ts                          # Type definitions
├── normalize.ts                      # Data transformation (uses ModeService)
├── controller.ts                     # State management (uses ServiceContainer)
├── config.ts                         # Configuration parsing
├── TrackerWidget.svelte              # Main component (uses ServiceContainer)
├── StopFinder.svelte                 # Reusable stop finder component
└── [other existing files...]
```

## Refactoring Guidelines

### When Adding New Features

1. **New Transport Type** → Implement `RealtimeTransport` interface in `services/transport.ts`
2. **New Data Source** → Implement `TransitDataRepository` interface in `services/repositories.ts`
3. **New Styling Rule** → Use `ModeService.addModeRule()` or extend `MBTAModeDetector`
4. **New UI Component** → Use `ServiceContainer` via dependency injection

### When Testing

1. Create `TestServiceContainer` with mocked services
2. Pass container to component/function being tested
3. No need to mock HTTP, WebSocket, or other infrastructure

```typescript
import { TestServiceContainer } from '$lib/tracker/services';
import { createTrackerController } from '$lib/tracker/controller';

describe('TrackerController', () => {
  it('should handle vehicle updates', async () => {
    const mockTransport = {
      on: vi.fn(),
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      status: () => 'open',
      lastOpenedAt: () => Date.now()
    };

    const testContainer = new TestServiceContainer({
      getTransport: () => mockTransport as any
    });

    const controller = createTrackerController(config, testContainer);
    // Test logic here
  });
});
```

### Naming Conventions

- **Interfaces** - PascalCase, verb pattern or noun pattern
  - `RealtimeTransport`, `ModeDetector`, `TransitDataRepository`
- **Implementations** - PascalCase with descriptive name
  - `WebSocketTransport`, `MBTARepository`, `MBTAModeDetector`
- **Config objects** - lowercase, -Config suffix
  - `transportConfig`, `containerConfig`

## Migration Checklist

✅ **Phase 1 - Transport Layer**
- [x] Extract `RealtimeTransport` interface
- [x] Implement `WebSocketTransport` and `SSETransport`
- [x] Update `TrackerController` to use transport interface

❌ **Phase 2 - Repository Layer** (Next)
- [ ] Migrate API calls to `MBTARepository`
- [ ] Update `normalize.ts` to use mode-service
- [ ] Update `TrackerWidget` to use repositories

❌ **Phase 3 - Service Container Integration** (Next)
- [ ] Inject container throughout app
- [ ] Update tests to use `TestServiceContainer`
- [ ] Remove global singletons

❌ **Phase 4 - UI Component Modularization** (Next)
- [ ] Extract map controls into pluggable components
- [ ] Separate stop enrichment logic
- [ ] Make components reusable and testable

## SOLID Principles Applied

| Principle | How It's Applied |
|-----------|------------------|
| **S**ingle Responsibility | Each service does one thing (Transport, Repository, ModeDetection) |
| **O**pen/Closed | Open for extension (add rules, transports), closed for modification |
| **L**iskov Substitution | All `RealtimeTransport` implementations are interchangeable |
| **I**nterface Segregation | Small, focused interfaces (not one god interface) |
| **D**ependency Inversion | Depend on abstractions, not concrete classes |

## Performance Considerations

- **Lazy Loading** - Services created on-demand
- **Caching** - Repository caches responses (24h default)
- **Backoff Strategy** - Exponential backoff with jitter for reconnection
- **Event Debouncing** - Transport batches messages

## Security Considerations

- All external API calls go through Repository layer
- HTTPS/WSS enforced in production
- Nominatim timeout prevents stalls
- CORS handled by browser

## Extension Points

### Add Custom Transport

```typescript
import { BaseTransport } from '$lib/tracker/services';

export class PollingTransport extends BaseTransport {
  private pollTimer: number | null = null;

  async connect(): Promise<void> {
    // Your polling logic
  }

  disconnect(): void {
    // Your cleanup
  }
}

// Use it
const transport = new PollingTransport({
  url: 'https://api.example.com/vehicles',
  retryMs: 5000
});
```

### Add Mode Detection Rule

```typescript
import { ModeService } from '$lib/tracker/services';

// For custom local transit system
ModeService.addModeRule((data) => {
  if (data.routeId === 'express-1' || data.routeLabel?.includes('Express')) {
    return 'bus';
  }
  if (data.routeId === 'light-rail-1') {
    return 'subway'; // Same as light rail
  }
  return null; // Let other rules handle it
}, 600); // Medium priority
```

### Add Custom Repository

```typescript
import type { TransitDataRepository } from '$lib/tracker/services';

class CustomDataRepository implements TransitDataRepository {
  async getAllStops() {
    // Your API calls
  }
  // ...implement interface
}

const container = new DefaultServiceContainer({
  // Container will use your repository
});
```

## Documentation Files

- **This file** - Architecture overview and patterns
- `services/index.ts` - Clean module exports
- `services/transport.ts` - Transport layer JSDoc
- `services/repositories.ts` - Data layer JSDoc
- `services/mode-service.ts` - Mode/styling JSDoc
- `services/container.ts` - DI container JSDoc

## Next Steps

1. Migrate `normalize.ts` to use `ModeService`
2. Refactor `TrackerWidget.svelte` to accept `ServiceContainer`
3. Create example test files showing new patterns
4. Update backend server to use transport abstraction concepts
5. Add Composite Pattern for stop enrichment

---

**Maintainers:** Ensure all new code follows these patterns. When reviewing PRs, check for:
- Service dependencies properly injected
- No mixed concerns in one module
- Interfaces used instead of concrete classes
- Tests using `TestServiceContainer`
