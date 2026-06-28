# Modularization Refactoring Roadmap

## ✅ Phase 1: Service Layer Foundation (COMPLETED)

### 1.1 Transport Adapter Pattern ✅
- [x] `services/transport.ts` - RealtimeTransport interface + implementations
  - WebSocketTransport with reconnection logic
  - SSETransport for alternative transports
  - BaseTransport for shared concerns
  - Full event system (data, error, close)

**Why:** Enables swapping websocket for SSE, polling, gRPC, etc. without changing controller.

**Impact:** Controller no longer tightly coupled to WebSocket API.

### 1.2 Repository Pattern ✅
- [x] `services/repositories.ts` - Data access abstraction
  - TransitDataRepository interface
  - GeoRepository interface for geocoding
  - MBTARepository with MBTA API implementation
  - MockTransitDataRepository for testing
  - Centralized caching logic

**Why:** Separates data-fetching concerns from business logic; enables testing without network calls.

**Impact:** API changes only need updates in one place; add new data sources without changing controllers.

### 1.3 Mode Detection & Styling Factory ✅
- [x] `services/mode-service.ts` - Mode inference + route styling
  - ModeDetector interface with priority-based rule system
  - MBTAModeDetector with 5-level heuristic detection
  - RouteStyleProvider for consistent branding
  - MBTARouteStyleProvider with MBTA official colors
  - ModeService singleton for global access

**Why:** Removes hardcoded mode/color logic from components; enables custom rules per deployment.

**Impact:** Mode detection logic now testable; colors can be customized without code changes.

### 1.4 Service Container (Dependency Injection) ✅
- [x] `services/container.ts` - DI configuration & lifecycle
  - ServiceContainer interface
  - DefaultServiceContainer (production)
  - TestServiceContainer (testing with mocks)
  - Logger abstraction (ConsoleLogger, SilentLogger)
  - Global container functions

**Why:** Single point of service configuration; enables easy testing and runtime configuration.

**Impact:** All services injected, not created locally; tests can mock everything.

### 1.5 Services Module Index ✅
- [x] `services/index.ts` - Clean, organized exports

---

## ❌ Phase 2: Migration of Existing Code (READY TO START)

### 2.1 Update Normalize Transform ⏳
**File:** `normalize.ts`

**Current State:**
```typescript
function normalizeMode(modeValue, routeId, routeLabel, routeType): TrackerMode {
  const normalized = modeValue?.trim().toLowerCase() ?? null;
  // ... hardcoded logic
}
```

**Target State:**
```typescript
import { ModeService } from './services';

function normalizeMode(data: RawVehicleData): TrackerMode {
  return ModeService.detectMode(data);
}
```

**Steps:**
1. Remove mode detection logic
2. Use ModeService for all mode inference
3. Keep transform logic (vehicle → normalized shape)

**Effort:** 1-2 hours

### 2.2 Update Controller for DI ⏳
**File:** `controller.ts`

**Current State:**
```typescript
function createTrackerController(config: TrackerWidgetConfig): TrackerController {
  const socketUrl = resolveTransportUrl(config.wsUrl);
  const socket = new WebSocket(socketUrl); // Direct instantiation
  
  socket.onmessage = (event) => {
    const parsed = JSON.parse(String(event.data));
    // ...
  };
}
```

**Target State:**
```typescript
import { getGlobalContainer, type ServiceContainer } from './services';

function createTrackerController(
  config: TrackerWidgetConfig,
  container: ServiceContainer = getGlobalContainer()
): TrackerController {
  const transport = container.getTransport();
  
  transport.on('data', (message) => {
    const vehicles = parseVehicleList(message.vehicles);
    // ...
  });
}
```

**Steps:**
1. Accept optional ServiceContainer parameter
2. Use default if not provided (backward compatible)
3. Delegate transport creation to container
4. Event handling remains the same

**Effort:** 1-2 hours

### 2.3 Refactor TrackerWidget Component ⏳
**File:** `TrackerWidget.svelte`

**Current State:**
```svelte
<script>
  const controller = createTrackerController(config);
  // Tightly coupled to controller internals
  // Direct WebSocket handling
  // Hardcoded colors/modes
</script>
```

**Target State:**
```svelte
<script>
  import { initializeGlobalContainer } from '$lib/tracker/services';
  
  initializeGlobalContainer({ enableLogging: true });
  
  const controller = createTrackerController(config);
  // Only knows about controller interface
  // Uses ModeService for styling
  // More testable
</script>
```

**Steps:**
1. Initialize container on mount
2. Remove hardcoded mode/color logic
3. Use ModeService for styling
4. Remove WebSocket initialization code

**Effort:** 2-3 hours

### 2.4 Update StopFinder Component ⏳
**File:** `StopFinder.svelte`

**Current State:**
```svelte
export let vehicles: TrackerVehicle[] = [];

async function loadNearbyStops(location) {
  let stops = await getAllStops(); // Global function
  stops = enrichStopsWithArrivals(stops, vehicles);
}
```

**Target State:**
```svelte
<script>
  import { getGlobalContainer } from '$lib/tracker/services';
  
  const container = getGlobalContainer();
  const repository = container.getRepository();
  
  async function loadNearbyStops(location) {
    const stops = await repository.getNearbyStops(location);
    // Enrichment via container if needed
  }
</script>
```

**Steps:**
1. Accept or retrieve container
2. Use repository from container
3. Make enrichment pluggable
4. Becomes truly independent component

**Effort:** 1-2 hours

---

## ❌ Phase 3: Backend Abstraction (READY TO START)

### 3.1 Create Backend Transport Interface ⏳
**Files:** `apps/server/` and `apps/realtime-worker/`

**Current State:**
- Bun server: Polling GTFS-RT + WebSocket broadcast (hardcoded 5s interval)
- Cloudflare: Durable Object + separate polling logic

**Target State:**
- Both use abstract FeedPoller interface
- Pluggable: GTFS-RT, MBTA JSON API, mock data
- Shared normalization & diff logic

**Interface:**
```typescript
interface FeedPoller {
  poll(): Promise<RawVehicleData[]>;
  getDiff(previous: RawVehicleData[]): RawVehicleData[];
}

class GtfsRtPoller implements FeedPoller {
  // GTFS-RT specific logic
}

class MbtaJsonPoller implements FeedPoller {
  // MBTA JSON API logic
}
```

**Effort:** 3-4 hours

### 3.2 Extract Shared Backend Utilities ⏳
**New File:** `packages/transit-core/`

**What to share:**
- Normalization logic (vehicle parsing)
- Diff algorithm
- Route type → mode mapping
- Type definitions

**Benefits:**
- Frontend and backend use same normalization
- Easier to add new backends
- Smaller bundle size

**Effort:** 2-3 hours

---

## ❌ Phase 4: UI Component Modularization (READY TO START)

### 4.1 Extract Map Controls ⏳
**New Files:**
- `MapControls.svelte` - View toggles, mode filters
- `VehiclePopup.svelte` - Vehicle info popup
- `StopPopup.svelte` - Stop info popup

**Why:** Reduces TrackerWidget complexity; enables reuse.

**Effort:** 2-3 hours

### 4.2 Extract Vehicle List ⏳
**New File:** `VehicleList.svelte`

**Current:** Inline in TrackerWidget (100+ lines)

**Target:** Standalone, reusable component

**Props:**
```typescript
interface VehicleListProps {
  vehicles: TrackerVehicle[];
  selectedId: string | null;
  mode: TrackerMode;
  onSelect: (id: string) => void;
  emptyMessage?: string;
}
```

**Effort:** 1-2 hours

### 4.3 Extract Trip Summary ⏳
**New File:** `TripSnapshot.svelte`

**Props:**
```typescript
interface TripSnapshotProps {
  trips: TrackerTrip[];
  mode: TrackerMode;
}
```

**Effort:** 1 hour

### 4.4 Create Composable Stop Enricher ⏳
**New Files:**
- `services/enrichers.ts` - Enrichment interface
- `RealtimeArrivalsEnricher.ts` - Vehicle-based arrivals
- `AccessibilityEnricher.ts` - ADA info
- `WalkabilityEnricher.ts` - Distance + walk time

**Interface:**
```typescript
interface StopEnricher {
  enrich(
    stops: MBTAStop[],
    context: EnrichmentContext
  ): Promise<EnrichedStop[]>;
}
```

**Benefit:** Stop enrichment now pluggable; easy to add "nearby restrooms", "bike parking", etc.

**Effort:** 3-4 hours

---

## ❌ Phase 5: Testing Infrastructure (READY TO START)

### 5.1 Create Test Utilities ⏳
**New File:** `testing/test-utils.ts`

```typescript
export function createTestContainer(overrides: Partial<ServiceContainer>) {
  return new TestServiceContainer(overrides);
}

export function createMockTransport() {
  return {
    on: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    status: () => 'open',
    lastOpenedAt: () => Date.now()
  };
}

export function createMockRepository() {
  return new MockTransitDataRepository();
}
```

**Effort:** 1-2 hours

### 5.2 Add Service Tests ⏳
**New Files:**
- `__tests__/services/transport.test.ts`
- `__tests__/services/repositories.test.ts`
- `__tests__/services/mode-service.test.ts`

**Coverage Goals:**
- Transport reconnection logic
- Repository caching
- Mode detection heuristics
- Styling provider

**Effort:** 4-6 hours

### 5.3 Add Component Tests ⏳
**Test:** Each component with injected services

```typescript
it('should use injected mode service', async () => {
  const customModeService = new MockModeDetector();
  const container = createTestContainer({
    getModeDetector: () => customModeService
  });

  render(TrackerWidget, { props: { config, container } });
  // Test logic
});
```

**Effort:** 5-8 hours

---

## ❌ Phase 6: Documentation & Cleanup (READY TO START)

### 6.1 Update README ✅ [ARCHITECTURE.md already created]
- [ ] Add "Architecture Overview" section
- [ ] Link to ARCHITECTURE.md
- [ ] Add "Contributing" guidelines

### 6.2 Add Inline Documentation ⏳
- [ ] JSDoc for all public APIs
- [ ] Example usage blocks
- [ ] Error handling patterns

### 6.3 Clean Up Old Code ⏳
- [ ] Remove unused utilities
- [ ] Consolidate duplicate logic
- [ ] Remove hardcoded values

**Effort:** 2-3 hours

---

## Timeline Estimate

| Phase | Effort | Duration |
|-------|--------|----------|
| 1: Foundations | 15-20 hours | ✅ DONE |
| 2: Migrate Code | 8-12 hours | ~1 week |
| 3: Backend | 5-7 hours | ~1 week |
| 4: UI Components | 7-10 hours | ~1 week |
| 5: Testing | 10-15 hours | ~2 weeks |
| 6: Docs & Cleanup | 4-6 hours | 2-3 days |
| **TOTAL** | **50-70 hours** | **~6-8 weeks** |

---

## Success Metrics

Upon completion, the codebase will have:

✅ **Modularity:**
- No circular dependencies
- Each module has single responsibility
- Services easily replaceable

✅ **Maintainability:**
- New features don't require changes across multiple files
- Adding new modes/transports = add new implementation
- Consistent patterns throughout

✅ **Testability:**
- 80%+ code coverage possible
- Unit tests without mocking HTTP
- Component tests with isolated services

✅ **Extensibility:**
- Custom transports by implementing interface
- Custom data sources via repository
- Custom rules via mode service

✅ **Performance:**
- No performance regression
- Better memory management (service cleanup)
- Optimized caching

---

## Key Files Summary

```
apps/web/src/lib/tracker/
├── services/                    # NEW - Pluggable services
│   ├── transport.ts             # 200 lines - Transport abstraction
│   ├── repositories.ts          # 300 lines - Data access layer
│   ├── mode-service.ts          # 250 lines - Mode detection & styling
│   ├── container.ts             # 280 lines - Dependency injection
│   └── index.ts                 # Clean exports
│
├── ARCHITECTURE.md              # NEW - Architecture guide (updated)
├── controller.ts                # REFACTOR - Use ServiceContainer
├── normalize.ts                 # REFACTOR - Use ModeService
├── TrackerWidget.svelte         # REFACTOR - Component extraction
├── StopFinder.svelte            # REFACTOR - Make standalone
└── types.ts                     # (no changes)

Total New Code: ~1,300 lines (highly documented)
```

---

## Notes for Future Maintainers

1. **Always use ServiceContainer** - Never instantiate services directly
2. **Implement interfaces** - Don't add new implementations directly; extend via interfaces
3. **Use ModeService** - Central place for mode/color logic
4. **Add tests first** - Use TDD for new features
5. **Document patterns** - Link to ARCHITECTURE.md in PR descriptions
6. **Review checklist:** Does the PR follow patterns? Are services injected? Are there tests?

---

**Next Immediate Action:** Start Phase 2.1 - Update `normalize.ts` to use ModeService
