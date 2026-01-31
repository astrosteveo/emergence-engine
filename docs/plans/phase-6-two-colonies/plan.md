# Phase 6: Two Colonies Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prove autonomous trade works via caravans - pawns physically carry food between colonies based on Utility AI decisions.

**Architecture:** Colony game defines factions, stockpiles, pawn memory, and a caravan AI action. Engine gets minimal addition (territory data on TileMap). Pawns evaluate trade opportunities using existing Utility AI, balancing surplus/deficit knowledge against personal hunger risk.

**Tech Stack:** TypeScript, Vite, Canvas 2D, existing ECS and Utility AI systems.

---

## Task 1: Add Territory Support to TileMap (Engine)

**Files:**
- Modify: `packages/engine/src/world/TileMap.ts`
- Modify: `packages/engine/src/world/TileMap.test.ts`
- Modify: `packages/engine/src/index.ts`

**Step 1: Write the failing test for territory storage**

Add to `packages/engine/src/world/TileMap.test.ts`:

```typescript
describe('territory', () => {
  it('returns null for tiles with no territory', () => {
    const map = new TileMap();
    map.defineTerrain('grass', { color: '#3a5a40', walkable: true });
    map.create(10, 10, 'grass');

    expect(map.getTerritory(0, 0)).toBeNull();
  });

  it('stores and retrieves territory faction id', () => {
    const map = new TileMap();
    map.defineTerrain('grass', { color: '#3a5a40', walkable: true });
    map.create(10, 10, 'grass');

    map.setTerritory(0, 0, 'red');
    expect(map.getTerritory(0, 0)).toBe('red');
  });

  it('clears territory', () => {
    const map = new TileMap();
    map.defineTerrain('grass', { color: '#3a5a40', walkable: true });
    map.create(10, 10, 'grass');

    map.setTerritory(0, 0, 'red');
    map.clearTerritory(0, 0);
    expect(map.getTerritory(0, 0)).toBeNull();
  });

  it('claims radius around a point', () => {
    const map = new TileMap();
    map.defineTerrain('grass', { color: '#3a5a40', walkable: true });
    map.create(20, 20, 'grass');

    map.claimRadius(0, 0, 2, 'blue');

    // Center and adjacent tiles should be claimed
    expect(map.getTerritory(0, 0)).toBe('blue');
    expect(map.getTerritory(1, 0)).toBe('blue');
    expect(map.getTerritory(0, 1)).toBe('blue');
    expect(map.getTerritory(2, 0)).toBe('blue');

    // Outside radius should not be claimed
    expect(map.getTerritory(3, 0)).toBeNull();
  });

  it('returns null for out of bounds territory queries', () => {
    const map = new TileMap();
    map.defineTerrain('grass', { color: '#3a5a40', walkable: true });
    map.create(10, 10, 'grass');

    expect(map.getTerritory(100, 100)).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run`
Expected: FAIL with "map.getTerritory is not a function"

**Step 3: Implement territory storage**

Add to `packages/engine/src/world/TileMap.ts`:

After line 41 (`private buildingData: Uint8Array | null = null;`), add:

```typescript
  private territoryData: Map<number, string> = new Map();
```

After the `clearBuilding` method (around line 149), add these methods:

```typescript
  getTerritory(x: number, y: number): string | null {
    if (!this.terrainData || !this.isInBounds(x, y)) return null;
    return this.territoryData.get(this.toIndex(x, y)) ?? null;
  }

  setTerritory(x: number, y: number, factionId: string): void {
    if (!this.terrainData || !this.isInBounds(x, y)) return;
    this.territoryData.set(this.toIndex(x, y), factionId);
  }

  clearTerritory(x: number, y: number): void {
    if (!this.terrainData || !this.isInBounds(x, y)) return;
    this.territoryData.delete(this.toIndex(x, y));
  }

  claimRadius(centerX: number, centerY: number, radius: number, factionId: string): void {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        if (this.isInBounds(x, y) && dx * dx + dy * dy <= radius * radius) {
          this.setTerritory(x, y, factionId);
        }
      }
    }
  }
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/engine/src/world/TileMap.ts packages/engine/src/world/TileMap.test.ts
git commit -m "feat(engine): add territory support to TileMap"
```

---

## Task 2: Define New Components in Colony

**Files:**
- Modify: `packages/colony/src/main.ts`

**Step 1: Add constants at the top of the file**

After line 27 (`const PAWN_SPEED = 80;`), add:

```typescript
// Phase 6 constants
const TERRITORY_RADIUS = 8;
const SURPLUS_THRESHOLD = 10;
const DEFICIT_THRESHOLD = 5;
const MEMORY_DECAY_TICKS = 600;
const PROXIMITY_SIGNAL_RANGE = 12;
const PAWN_CARRY_CAPACITY = 5;
```

**Step 2: Define new components**

After the existing component definitions (after line 49, `engine.ecs.defineComponent('AIState', ...)`), add:

```typescript
// Phase 6 components
engine.ecs.defineComponent('Faction', { id: '' });
engine.ecs.defineComponent('Inventory', { capacity: PAWN_CARRY_CAPACITY, food: 0 });
engine.ecs.defineComponent('Stockpile', { factionId: '', food: 0 });
engine.ecs.defineComponent('ColonyMemory', {
  known: [] as Array<{
    factionId: string;
    stockpileX: number;
    stockpileY: number;
    lastSeenFood: number;
    ticksSinceVisit: number;
  }>,
});
engine.ecs.defineComponent('CaravanTask', {
  targetFactionId: '',
  targetStockpile: null as Entity | null,
  phase: 'pickup' as 'pickup' | 'traveling-there' | 'dropoff' | 'returning',
  homeStockpile: null as Entity | null,
});
```

**Step 3: Run the dev server to verify no errors**

Run: `npm run dev`
Expected: No TypeScript errors, game loads (though behavior unchanged)

**Step 4: Commit**

```bash
git add packages/colony/src/main.ts
git commit -m "feat(colony): define Phase 6 components (Faction, Inventory, Stockpile, ColonyMemory, CaravanTask)"
```

---

## Task 3: Create Stockpile Spawn Function

**Files:**
- Modify: `packages/colony/src/main.ts`

**Step 1: Create the spawnStockpile function**

After the `spawnFood` function (around line 74), add:

```typescript
function spawnStockpile(tileX: number, tileY: number, factionId: string, initialFood: number): Entity {
  const stockpile = engine.ecs.createEntity();
  engine.ecs.addComponent(stockpile, 'Position', {
    x: tileX * TILE_SIZE + TILE_SIZE / 2,
    y: tileY * TILE_SIZE + TILE_SIZE / 2,
  });
  engine.ecs.addComponent(stockpile, 'Stockpile', { factionId, food: initialFood });
  engine.ecs.addComponent(stockpile, 'Sprite', { width: 32, height: 32, color: factionId === 'red' ? '#dc2626' : '#2563eb' });

  // Claim territory around stockpile
  engine.tileMap.claimRadius(tileX, tileY, TERRITORY_RADIUS, factionId);

  return stockpile;
}
```

**Step 2: Run the dev server to verify no errors**

Run: `npm run dev`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add packages/colony/src/main.ts
git commit -m "feat(colony): add spawnStockpile function with territory claiming"
```

---

## Task 4: Create Faction Pawn Spawn Function

**Files:**
- Modify: `packages/colony/src/main.ts`

**Step 1: Create the spawnFactionPawn function**

After the `spawnStockpile` function, add:

```typescript
function spawnFactionPawn(tileX: number, tileY: number, factionId: string, homeStockpile: Entity): Entity {
  const pawn = engine.ecs.createEntity();
  engine.ecs.addComponent(pawn, 'Position', {
    x: tileX * TILE_SIZE + TILE_SIZE / 2,
    y: tileY * TILE_SIZE + TILE_SIZE / 2,
  });
  engine.ecs.addComponent(pawn, 'Sprite', {
    width: 24,
    height: 24,
    color: factionId === 'red' ? '#f87171' : '#60a5fa',
  });
  engine.ecs.addComponent(pawn, 'Pawn');
  engine.ecs.addComponent(pawn, 'Faction', { id: factionId });
  engine.ecs.addComponent(pawn, 'Inventory', { capacity: PAWN_CARRY_CAPACITY, food: 0 });
  engine.ecs.addComponent(pawn, 'Hunger', { current: 20, max: 100, rate: 2 });
  engine.ecs.addComponent(pawn, 'AIState', { lastHungerPercent: 0.2, needsReeval: true });
  engine.ecs.addComponent(pawn, 'ColonyMemory', { known: [] });

  return pawn;
}
```

**Step 2: Run the dev server to verify no errors**

Run: `npm run dev`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add packages/colony/src/main.ts
git commit -m "feat(colony): add spawnFactionPawn function"
```

---

## Task 5: Set Up Two-Colony Test Scenario

**Files:**
- Modify: `packages/colony/src/main.ts`

**Step 1: Remove old pawn and food spawning**

Find and remove these lines (around lines 77-86):

```typescript
// Spawn food items
spawnFood(20);

// Create pawn entity at world center
const pawn = engine.ecs.createEntity();
engine.ecs.addComponent(pawn, 'Position', { x: 0, y: 0 });
engine.ecs.addComponent(pawn, 'Sprite');
engine.ecs.addComponent(pawn, 'Pawn');
engine.ecs.addComponent(pawn, 'Hunger', { current: 25, max: 100, rate: 2 });
engine.ecs.addComponent(pawn, 'AIState', { lastHungerPercent: 0.25, needsReeval: true });
```

**Step 2: Add the two-colony setup**

In place of the removed code, add:

```typescript
// Phase 6: Two-colony setup
// Colony A (Rich) - Red faction on the left
const redStockpile = spawnStockpile(-20, 0, 'red', 30);
const redPawn1 = spawnFactionPawn(-19, 1, 'red', redStockpile);
const redPawn2 = spawnFactionPawn(-21, 1, 'red', redStockpile);
const redPawn3 = spawnFactionPawn(-20, -1, 'red', redStockpile);

// Colony B (Poor) - Blue faction on the right
const blueStockpile = spawnStockpile(20, 0, 'blue', 5);
const bluePawn1 = spawnFactionPawn(21, 0, 'blue', blueStockpile);

// Track first pawn for camera/UI (use red pawn 1)
const pawn = redPawn1;
```

**Step 3: Run the dev server to verify two colonies appear**

Run: `npm run dev`
Expected: Two colored stockpiles visible on opposite sides of the map, with pawns near each

**Step 4: Commit**

```bash
git add packages/colony/src/main.ts
git commit -m "feat(colony): set up two-colony test scenario (rich red vs poor blue)"
```

---

## Task 6: Implement MemoryDecaySystem

**Files:**
- Modify: `packages/colony/src/main.ts`

**Step 1: Add the MemoryDecaySystem**

After the CameraControl system (around line 213), add:

```typescript
// Memory decay system: increment ticksSinceVisit for all known colonies
engine.ecs.addSystem({
  name: 'MemoryDecay',
  query: ['ColonyMemory'],
  update(entities) {
    for (const e of entities) {
      const memory = engine.ecs.getComponent<{
        known: Array<{ ticksSinceVisit: number }>;
      }>(e, 'ColonyMemory')!;
      for (const entry of memory.known) {
        entry.ticksSinceVisit++;
      }
    }
  },
});
```

**Step 2: Run the dev server to verify no errors**

Run: `npm run dev`
Expected: No errors, game runs normally

**Step 3: Commit**

```bash
git add packages/colony/src/main.ts
git commit -m "feat(colony): add MemoryDecaySystem"
```

---

## Task 7: Implement MemoryUpdateSystem

**Files:**
- Modify: `packages/colony/src/main.ts`

**Step 1: Add helper function to find pawn's home stockpile**

Before the systems section, add this helper:

```typescript
function findHomeStockpile(pawnEntity: Entity): Entity | null {
  const faction = engine.ecs.getComponent<{ id: string }>(pawnEntity, 'Faction');
  if (!faction) return null;

  for (const s of engine.ecs.query(['Stockpile', 'Position'])) {
    const stockpile = engine.ecs.getComponent<{ factionId: string }>(s, 'Stockpile')!;
    if (stockpile.factionId === faction.id) {
      return s;
    }
  }
  return null;
}
```

**Step 2: Add the MemoryUpdateSystem**

After the MemoryDecay system, add:

```typescript
// Memory update system: when near a foreign stockpile, update memory
engine.ecs.addSystem({
  name: 'MemoryUpdate',
  query: ['Pawn', 'Position', 'Faction', 'ColonyMemory'],
  update(entities) {
    const stockpiles = engine.ecs.query(['Stockpile', 'Position']);

    for (const pawn of entities) {
      const pawnPos = engine.ecs.getComponent<{ x: number; y: number }>(pawn, 'Position')!;
      const pawnFaction = engine.ecs.getComponent<{ id: string }>(pawn, 'Faction')!;
      const memory = engine.ecs.getComponent<{
        known: Array<{
          factionId: string;
          stockpileX: number;
          stockpileY: number;
          lastSeenFood: number;
          ticksSinceVisit: number;
        }>;
      }>(pawn, 'ColonyMemory')!;

      const pawnTileX = Math.floor(pawnPos.x / TILE_SIZE);
      const pawnTileY = Math.floor(pawnPos.y / TILE_SIZE);

      for (const s of stockpiles) {
        const stockpileComp = engine.ecs.getComponent<{ factionId: string; food: number }>(s, 'Stockpile')!;
        const stockpilePos = engine.ecs.getComponent<{ x: number; y: number }>(s, 'Position')!;

        // Skip own faction's stockpile
        if (stockpileComp.factionId === pawnFaction.id) continue;

        const stockpileTileX = Math.floor(stockpilePos.x / TILE_SIZE);
        const stockpileTileY = Math.floor(stockpilePos.y / TILE_SIZE);

        const dx = pawnTileX - stockpileTileX;
        const dy = pawnTileY - stockpileTileY;
        const distSq = dx * dx + dy * dy;

        // Within visual range (3 tiles)
        if (distSq <= 9) {
          const existing = memory.known.find((k) => k.factionId === stockpileComp.factionId);
          if (existing) {
            existing.lastSeenFood = stockpileComp.food;
            existing.ticksSinceVisit = 0;
            existing.stockpileX = stockpileTileX;
            existing.stockpileY = stockpileTileY;
          } else {
            memory.known.push({
              factionId: stockpileComp.factionId,
              stockpileX: stockpileTileX,
              stockpileY: stockpileTileY,
              lastSeenFood: stockpileComp.food,
              ticksSinceVisit: 0,
            });
          }
        }
      }
    }
  },
});
```

**Step 3: Run the dev server to verify no errors**

Run: `npm run dev`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/colony/src/main.ts
git commit -m "feat(colony): add MemoryUpdateSystem"
```

---

## Task 8: Implement ProximitySignalSystem

**Files:**
- Modify: `packages/colony/src/main.ts`

**Step 1: Add the ProximitySignalSystem**

After the MemoryUpdate system, add:

```typescript
// Proximity signal system: hear "we need food" from nearby low-food stockpiles
engine.ecs.addSystem({
  name: 'ProximitySignal',
  query: ['Pawn', 'Position', 'Faction', 'ColonyMemory'],
  update(entities) {
    const stockpiles = engine.ecs.query(['Stockpile', 'Position']);

    for (const pawn of entities) {
      const pawnPos = engine.ecs.getComponent<{ x: number; y: number }>(pawn, 'Position')!;
      const pawnFaction = engine.ecs.getComponent<{ id: string }>(pawn, 'Faction')!;
      const memory = engine.ecs.getComponent<{
        known: Array<{
          factionId: string;
          stockpileX: number;
          stockpileY: number;
          lastSeenFood: number;
          ticksSinceVisit: number;
        }>;
      }>(pawn, 'ColonyMemory')!;

      const pawnTileX = Math.floor(pawnPos.x / TILE_SIZE);
      const pawnTileY = Math.floor(pawnPos.y / TILE_SIZE);

      for (const s of stockpiles) {
        const stockpileComp = engine.ecs.getComponent<{ factionId: string; food: number }>(s, 'Stockpile')!;
        const stockpilePos = engine.ecs.getComponent<{ x: number; y: number }>(s, 'Position')!;

        // Skip own faction
        if (stockpileComp.factionId === pawnFaction.id) continue;

        // Only broadcast if in deficit
        if (stockpileComp.food >= DEFICIT_THRESHOLD) continue;

        const stockpileTileX = Math.floor(stockpilePos.x / TILE_SIZE);
        const stockpileTileY = Math.floor(stockpilePos.y / TILE_SIZE);

        const dx = pawnTileX - stockpileTileX;
        const dy = pawnTileY - stockpileTileY;
        const distSq = dx * dx + dy * dy;

        // Within signal range
        if (distSq <= PROXIMITY_SIGNAL_RANGE * PROXIMITY_SIGNAL_RANGE) {
          const existing = memory.known.find((k) => k.factionId === stockpileComp.factionId);
          if (existing) {
            // Update if this info is fresher (they're broadcasting need)
            existing.lastSeenFood = stockpileComp.food;
            existing.stockpileX = stockpileTileX;
            existing.stockpileY = stockpileTileY;
            // Don't reset ticksSinceVisit - they haven't actually visited
          } else {
            memory.known.push({
              factionId: stockpileComp.factionId,
              stockpileX: stockpileTileX,
              stockpileY: stockpileTileY,
              lastSeenFood: stockpileComp.food,
              ticksSinceVisit: MEMORY_DECAY_TICKS, // Mark as stale since not visited
            });
          }
        }
      }
    }
  },
});
```

**Step 2: Run the dev server to verify no errors**

Run: `npm run dev`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/colony/src/main.ts
git commit -m "feat(colony): add ProximitySignalSystem"
```

---

## Task 9: Modify Eat Action to Support Stockpiles

**Files:**
- Modify: `packages/colony/src/main.ts`

**Step 1: Replace the existing eat action**

Find the existing `engine.ai.defineAction('eat', ...)` block (around line 102-144) and replace it with:

```typescript
engine.ai.defineAction('eat', {
  canExecute(entity, context) {
    // Check for loose food
    const nearestFood = context.findNearest(entity, 'Food');
    if (nearestFood) return true;

    // Check for own faction's stockpile with food
    const faction = context.ecs.getComponent<{ id: string }>(entity, 'Faction');
    if (!faction) return context.findNearest(entity, 'Food') !== null;

    for (const s of context.ecs.query(['Stockpile', 'Position'])) {
      const stockpile = context.ecs.getComponent<{ factionId: string; food: number }>(s, 'Stockpile')!;
      if (stockpile.factionId === faction.id && stockpile.food > 0) {
        return true;
      }
    }
    return false;
  },
  score(entity, context) {
    const hunger = context.ecs.getComponent<{ current: number; max: number }>(entity, 'Hunger');
    if (!hunger) return 0;
    return hunger.current / hunger.max;
  },
  execute(entity, context) {
    const entityPos = context.ecs.getComponent<{ x: number; y: number }>(entity, 'Position');
    if (!entityPos) return;

    const entityTileX = Math.floor(entityPos.x / TILE_SIZE);
    const entityTileY = Math.floor(entityPos.y / TILE_SIZE);

    // Find nearest food source (loose food or own stockpile)
    let targetX: number | null = null;
    let targetY: number | null = null;
    let targetType: 'food' | 'stockpile' = 'food';
    let targetEntity: Entity | null = null;
    let bestDistSq = Infinity;

    // Check loose food
    const nearestFood = context.findNearest(entity, 'Food');
    if (nearestFood) {
      const foodPos = context.ecs.getComponent<{ x: number; y: number }>(nearestFood, 'Position');
      if (foodPos) {
        const dx = foodPos.x - entityPos.x;
        const dy = foodPos.y - entityPos.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < bestDistSq) {
          bestDistSq = distSq;
          targetX = Math.floor(foodPos.x / TILE_SIZE);
          targetY = Math.floor(foodPos.y / TILE_SIZE);
          targetType = 'food';
          targetEntity = nearestFood;
        }
      }
    }

    // Check own stockpile
    const faction = context.ecs.getComponent<{ id: string }>(entity, 'Faction');
    if (faction) {
      for (const s of context.ecs.query(['Stockpile', 'Position'])) {
        const stockpile = context.ecs.getComponent<{ factionId: string; food: number }>(s, 'Stockpile')!;
        if (stockpile.factionId === faction.id && stockpile.food > 0) {
          const stockpilePos = context.ecs.getComponent<{ x: number; y: number }>(s, 'Position')!;
          const dx = stockpilePos.x - entityPos.x;
          const dy = stockpilePos.y - entityPos.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < bestDistSq) {
            bestDistSq = distSq;
            targetX = Math.floor(stockpilePos.x / TILE_SIZE);
            targetY = Math.floor(stockpilePos.y / TILE_SIZE);
            targetType = 'stockpile';
            targetEntity = s;
          }
        }
      }
    }

    if (targetX === null || targetY === null || targetEntity === null) return;

    // Check if path exists
    const path = pathfinder.findPath(entityTileX, entityTileY, targetX, targetY);
    if (!path) return;

    // Clear existing path components
    if (context.ecs.hasComponent(entity, 'PathFollow')) {
      context.ecs.removeComponent(entity, 'PathFollow');
    }
    if (context.ecs.hasComponent(entity, 'PathTarget')) {
      context.ecs.removeComponent(entity, 'PathTarget');
    }

    context.ecs.addComponent(entity, 'PathTarget', { x: targetX, y: targetY });

    if (context.ecs.hasComponent(entity, 'CurrentTask')) {
      context.ecs.removeComponent(entity, 'CurrentTask');
    }
    context.ecs.addComponent(entity, 'CurrentTask', {
      action: targetType === 'food' ? 'eat' : 'eat-stockpile',
      target: targetEntity,
    });
  },
});
```

**Step 2: Run the dev server to verify no errors**

Run: `npm run dev`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/colony/src/main.ts
git commit -m "feat(colony): modify eat action to support stockpiles"
```

---

## Task 10: Update TaskExecution for Stockpile Eating

**Files:**
- Modify: `packages/colony/src/main.ts`

**Step 1: Update TaskExecution system**

Find the TaskExecution system and update the task handling to include stockpile eating. Replace the entire TaskExecution system with:

```typescript
// Task execution system: handle task completion when arrived
engine.ecs.addSystem({
  name: 'TaskExecution',
  query: ['CurrentTask', 'Position'],
  update(entities) {
    for (const e of entities) {
      if (engine.ecs.hasComponent(e, 'PathFollow') || engine.ecs.hasComponent(e, 'PathTarget')) {
        continue;
      }

      const task = engine.ecs.getComponent<{ action: string; target: Entity | null }>(e, 'CurrentTask')!;

      if (task.action === 'eat' && task.target !== null) {
        if (engine.ecs.isAlive(task.target)) {
          const food = engine.ecs.getComponent<{ nutrition: number }>(task.target, 'Food');
          const hunger = engine.ecs.getComponent<{ current: number; max: number }>(e, 'Hunger');

          if (food && hunger) {
            hunger.current = Math.max(0, hunger.current - food.nutrition);
            engine.ecs.destroyEntity(task.target);
          }
        }
        engine.ecs.removeComponent(e, 'CurrentTask');
      } else if (task.action === 'eat-stockpile' && task.target !== null) {
        if (engine.ecs.isAlive(task.target)) {
          const stockpile = engine.ecs.getComponent<{ food: number }>(task.target, 'Stockpile');
          const hunger = engine.ecs.getComponent<{ current: number; max: number }>(e, 'Hunger');

          if (stockpile && hunger && stockpile.food > 0) {
            const consumed = Math.min(30, stockpile.food); // Consume up to 30 nutrition
            stockpile.food -= consumed;
            hunger.current = Math.max(0, hunger.current - consumed);
          }
        }
        engine.ecs.removeComponent(e, 'CurrentTask');
      } else if (task.action === 'wander') {
        engine.ecs.removeComponent(e, 'CurrentTask');
      }
    }
  },
});
```

**Step 2: Run the dev server to verify pawns eat from stockpiles**

Run: `npm run dev`
Expected: Pawns should walk to their stockpile when hungry and eat from it

**Step 3: Commit**

```bash
git add packages/colony/src/main.ts
git commit -m "feat(colony): update TaskExecution to handle stockpile eating"
```

---

## Task 11: Implement Explore Action

**Files:**
- Modify: `packages/colony/src/main.ts`

**Step 1: Add the explore action**

After the wander action definition, add:

```typescript
engine.ai.defineAction('explore', {
  canExecute() {
    return true;
  },
  score() {
    return 0.15; // Slightly higher than wander (0.1)
  },
  execute(entity, context) {
    const pos = context.ecs.getComponent<{ x: number; y: number }>(entity, 'Position');
    if (!pos) return;

    const currentTileX = Math.floor(pos.x / TILE_SIZE);
    const currentTileY = Math.floor(pos.y / TILE_SIZE);

    // Explore toward the opposite side of the map (toward other colony)
    const faction = context.ecs.getComponent<{ id: string }>(entity, 'Faction');
    const direction = faction?.id === 'red' ? 1 : -1; // Red goes right, blue goes left

    // Pick a random tile biased toward the other colony's direction
    const range = 10;
    let targetX = currentTileX;
    let targetY = currentTileY;
    let found = false;

    for (let attempts = 0; attempts < 15 && !found; attempts++) {
      const dx = Math.floor(Math.random() * range) * direction + Math.floor(Math.random() * 5) - 2;
      const dy = Math.floor(Math.random() * 11) - 5;
      const tx = currentTileX + dx;
      const ty = currentTileY + dy;

      if (engine.tileMap.isWalkable(tx, ty)) {
        const path = pathfinder.findPath(currentTileX, currentTileY, tx, ty);
        if (path) {
          targetX = tx;
          targetY = ty;
          found = true;
        }
      }
    }

    if (!found) return;

    if (context.ecs.hasComponent(entity, 'PathFollow')) {
      context.ecs.removeComponent(entity, 'PathFollow');
    }
    if (context.ecs.hasComponent(entity, 'PathTarget')) {
      context.ecs.removeComponent(entity, 'PathTarget');
    }

    context.ecs.addComponent(entity, 'PathTarget', { x: targetX, y: targetY });

    if (context.ecs.hasComponent(entity, 'CurrentTask')) {
      context.ecs.removeComponent(entity, 'CurrentTask');
    }
    context.ecs.addComponent(entity, 'CurrentTask', { action: 'explore', target: null });
  },
});
```

**Step 2: Run the dev server to verify pawns explore**

Run: `npm run dev`
Expected: Pawns should sometimes explore toward the opposite colony

**Step 3: Commit**

```bash
git add packages/colony/src/main.ts
git commit -m "feat(colony): add explore action with directional bias"
```

---

## Task 12: Implement Caravan Action

**Files:**
- Modify: `packages/colony/src/main.ts`

**Step 1: Add helper to find stockpile by faction**

After the `findHomeStockpile` function, add:

```typescript
function findStockpileByFaction(factionId: string): Entity | null {
  for (const s of engine.ecs.query(['Stockpile', 'Position'])) {
    const stockpile = engine.ecs.getComponent<{ factionId: string }>(s, 'Stockpile')!;
    if (stockpile.factionId === factionId) {
      return s;
    }
  }
  return null;
}
```

**Step 2: Add the caravan action**

After the explore action, add:

```typescript
engine.ai.defineAction('caravan', {
  canExecute(entity, context) {
    // Already on a caravan?
    if (context.ecs.hasComponent(entity, 'CaravanTask')) return false;

    const faction = context.ecs.getComponent<{ id: string }>(entity, 'Faction');
    if (!faction) return false;

    // Own stockpile has surplus?
    const homeStockpile = findHomeStockpile(entity);
    if (!homeStockpile) return false;

    const stockpileComp = context.ecs.getComponent<{ food: number }>(homeStockpile, 'Stockpile');
    if (!stockpileComp || stockpileComp.food <= SURPLUS_THRESHOLD) return false;

    // Know of a colony in deficit?
    const memory = context.ecs.getComponent<{
      known: Array<{ factionId: string; lastSeenFood: number; ticksSinceVisit: number }>;
    }>(entity, 'ColonyMemory');
    if (!memory) return false;

    const needyColony = memory.known.find(
      (k) => k.lastSeenFood < DEFICIT_THRESHOLD && k.ticksSinceVisit < MEMORY_DECAY_TICKS
    );
    return needyColony !== undefined;
  },
  score(entity, context) {
    const faction = context.ecs.getComponent<{ id: string }>(entity, 'Faction');
    if (!faction) return 0;

    const homeStockpile = findHomeStockpile(entity);
    if (!homeStockpile) return 0;

    const stockpileComp = context.ecs.getComponent<{ food: number }>(homeStockpile, 'Stockpile');
    if (!stockpileComp) return 0;

    const memory = context.ecs.getComponent<{
      known: Array<{ factionId: string; lastSeenFood: number; ticksSinceVisit: number }>;
    }>(entity, 'ColonyMemory');
    if (!memory) return 0;

    const hunger = context.ecs.getComponent<{ current: number; max: number }>(entity, 'Hunger');
    if (!hunger) return 0;

    // Find the neediest known colony
    const needyColony = memory.known.find(
      (k) => k.lastSeenFood < DEFICIT_THRESHOLD && k.ticksSinceVisit < MEMORY_DECAY_TICKS
    );
    if (!needyColony) return 0;

    // Calculate score
    const surplusFactor = (stockpileComp.food - SURPLUS_THRESHOLD) / stockpileComp.food;
    const deficitFactor = 1 - needyColony.lastSeenFood / DEFICIT_THRESHOLD;
    const hungerPercent = hunger.current / hunger.max;
    const hungerPenalty = 1 - hungerPercent * 0.8;

    return surplusFactor * deficitFactor * hungerPenalty * 0.7;
  },
  execute(entity, context) {
    const faction = context.ecs.getComponent<{ id: string }>(entity, 'Faction');
    if (!faction) return;

    const memory = context.ecs.getComponent<{
      known: Array<{ factionId: string; stockpileX: number; stockpileY: number; lastSeenFood: number }>;
    }>(entity, 'ColonyMemory');
    if (!memory) return;

    const needyColony = memory.known.find((k) => k.lastSeenFood < DEFICIT_THRESHOLD);
    if (!needyColony) return;

    const targetStockpile = findStockpileByFaction(needyColony.factionId);
    if (!targetStockpile) return;

    const homeStockpile = findHomeStockpile(entity);
    if (!homeStockpile) return;

    const homePos = context.ecs.getComponent<{ x: number; y: number }>(homeStockpile, 'Position');
    if (!homePos) return;

    const entityPos = context.ecs.getComponent<{ x: number; y: number }>(entity, 'Position');
    if (!entityPos) return;

    const homeTileX = Math.floor(homePos.x / TILE_SIZE);
    const homeTileY = Math.floor(homePos.y / TILE_SIZE);
    const entityTileX = Math.floor(entityPos.x / TILE_SIZE);
    const entityTileY = Math.floor(entityPos.y / TILE_SIZE);

    // Verify path to home stockpile exists
    const path = pathfinder.findPath(entityTileX, entityTileY, homeTileX, homeTileY);
    if (!path) return;

    // Set up caravan task
    context.ecs.addComponent(entity, 'CaravanTask', {
      targetFactionId: needyColony.factionId,
      targetStockpile,
      phase: 'pickup',
      homeStockpile,
    });

    // Clear existing path and set path to home stockpile
    if (context.ecs.hasComponent(entity, 'PathFollow')) {
      context.ecs.removeComponent(entity, 'PathFollow');
    }
    if (context.ecs.hasComponent(entity, 'PathTarget')) {
      context.ecs.removeComponent(entity, 'PathTarget');
    }
    context.ecs.addComponent(entity, 'PathTarget', { x: homeTileX, y: homeTileY });

    if (context.ecs.hasComponent(entity, 'CurrentTask')) {
      context.ecs.removeComponent(entity, 'CurrentTask');
    }
    context.ecs.addComponent(entity, 'CurrentTask', { action: 'caravan', target: homeStockpile });
  },
});
```

**Step 3: Run the dev server to verify no errors**

Run: `npm run dev`
Expected: No errors (caravan behavior won't trigger yet until CaravanSystem is added)

**Step 4: Commit**

```bash
git add packages/colony/src/main.ts
git commit -m "feat(colony): add caravan action with surplus/deficit/hunger scoring"
```

---

## Task 13: Implement CaravanSystem

**Files:**
- Modify: `packages/colony/src/main.ts`

**Step 1: Add the CaravanSystem**

After the ProximitySignal system, add:

```typescript
// Caravan system: handle caravan state machine
engine.ecs.addSystem({
  name: 'Caravan',
  query: ['CaravanTask', 'Position', 'Inventory'],
  update(entities) {
    for (const e of entities) {
      // Skip if still moving
      if (engine.ecs.hasComponent(e, 'PathFollow') || engine.ecs.hasComponent(e, 'PathTarget')) {
        continue;
      }

      const caravan = engine.ecs.getComponent<{
        targetFactionId: string;
        targetStockpile: Entity | null;
        phase: 'pickup' | 'traveling-there' | 'dropoff' | 'returning';
        homeStockpile: Entity | null;
      }>(e, 'CaravanTask')!;

      const inventory = engine.ecs.getComponent<{ capacity: number; food: number }>(e, 'Inventory')!;
      const pos = engine.ecs.getComponent<{ x: number; y: number }>(e, 'Position')!;

      if (caravan.phase === 'pickup') {
        // At home stockpile - pick up food
        if (caravan.homeStockpile && engine.ecs.isAlive(caravan.homeStockpile)) {
          const stockpile = engine.ecs.getComponent<{ food: number }>(caravan.homeStockpile, 'Stockpile');
          if (stockpile && stockpile.food > 0) {
            const toTake = Math.min(inventory.capacity - inventory.food, stockpile.food);
            stockpile.food -= toTake;
            inventory.food += toTake;
          }
        }

        // Move to target stockpile
        if (caravan.targetStockpile && engine.ecs.isAlive(caravan.targetStockpile)) {
          const targetPos = engine.ecs.getComponent<{ x: number; y: number }>(caravan.targetStockpile, 'Position');
          if (targetPos) {
            const targetTileX = Math.floor(targetPos.x / TILE_SIZE);
            const targetTileY = Math.floor(targetPos.y / TILE_SIZE);
            engine.ecs.addComponent(e, 'PathTarget', { x: targetTileX, y: targetTileY });
            caravan.phase = 'traveling-there';
          }
        } else {
          // Target gone, abort
          engine.ecs.removeComponent(e, 'CaravanTask');
          if (engine.ecs.hasComponent(e, 'CurrentTask')) {
            engine.ecs.removeComponent(e, 'CurrentTask');
          }
        }
      } else if (caravan.phase === 'traveling-there') {
        // Arrived at target - transition to dropoff
        caravan.phase = 'dropoff';
      } else if (caravan.phase === 'dropoff') {
        // At target stockpile - drop off food
        if (caravan.targetStockpile && engine.ecs.isAlive(caravan.targetStockpile)) {
          const stockpile = engine.ecs.getComponent<{ food: number }>(caravan.targetStockpile, 'Stockpile');
          if (stockpile) {
            stockpile.food += inventory.food;
            inventory.food = 0;
          }
        }

        // Return home
        if (caravan.homeStockpile && engine.ecs.isAlive(caravan.homeStockpile)) {
          const homePos = engine.ecs.getComponent<{ x: number; y: number }>(caravan.homeStockpile, 'Position');
          if (homePos) {
            const homeTileX = Math.floor(homePos.x / TILE_SIZE);
            const homeTileY = Math.floor(homePos.y / TILE_SIZE);
            engine.ecs.addComponent(e, 'PathTarget', { x: homeTileX, y: homeTileY });
            caravan.phase = 'returning';
          }
        } else {
          // Home gone, just clear task
          engine.ecs.removeComponent(e, 'CaravanTask');
          if (engine.ecs.hasComponent(e, 'CurrentTask')) {
            engine.ecs.removeComponent(e, 'CurrentTask');
          }
        }
      } else if (caravan.phase === 'returning') {
        // Arrived home - caravan complete
        engine.ecs.removeComponent(e, 'CaravanTask');
        if (engine.ecs.hasComponent(e, 'CurrentTask')) {
          engine.ecs.removeComponent(e, 'CurrentTask');
        }

        // Trigger AI re-evaluation
        const aiState = engine.ecs.getComponent<{ needsReeval: boolean }>(e, 'AIState');
        if (aiState) {
          aiState.needsReeval = true;
        }
      }
    }
  },
});
```

**Step 2: Run the dev server to verify caravan behavior**

Run: `npm run dev`
Expected: When a red pawn discovers blue colony is low on food, they should initiate a caravan

**Step 3: Commit**

```bash
git add packages/colony/src/main.ts
git commit -m "feat(colony): add CaravanSystem state machine"
```

---

## Task 14: Update AIDecision to Handle CaravanTask

**Files:**
- Modify: `packages/colony/src/main.ts`

**Step 1: Update AIDecision system to skip re-eval during caravan**

Find the AIDecision system and update it. Replace the entire AIDecision system with:

```typescript
// AI Decision system: re-evaluate when needed
engine.ecs.addSystem({
  name: 'AIDecision',
  query: ['Pawn', 'Hunger', 'AIState'],
  update(entities) {
    const context = createActionContext();

    for (const e of entities) {
      // Skip AI decision if on a caravan
      if (engine.ecs.hasComponent(e, 'CaravanTask')) {
        continue;
      }

      const aiState = engine.ecs.getComponent<{ lastHungerPercent: number; needsReeval: boolean }>(e, 'AIState')!;
      const hunger = engine.ecs.getComponent<{ current: number; max: number }>(e, 'Hunger')!;
      const currentPercent = hunger.current / hunger.max;

      if (aiState.lastHungerPercent < 0.5 && currentPercent >= 0.5) {
        aiState.needsReeval = true;
      }
      aiState.lastHungerPercent = currentPercent;

      const hasTask = engine.ecs.hasComponent(e, 'CurrentTask');
      const hasPath = engine.ecs.hasComponent(e, 'PathFollow') || engine.ecs.hasComponent(e, 'PathTarget');
      if (hasTask && !hasPath) {
        aiState.needsReeval = true;
      }

      if (!hasTask) {
        aiState.needsReeval = true;
      }

      if (hasTask) {
        const task = engine.ecs.getComponent<{ action: string; target: Entity | null }>(e, 'CurrentTask')!;
        if (task.target !== null && !engine.ecs.isAlive(task.target)) {
          aiState.needsReeval = true;
        }
      }

      if (aiState.needsReeval) {
        aiState.needsReeval = false;
        const actionName = engine.ai.pickBest(e, context);
        if (actionName) {
          engine.ai.execute(actionName, e, context);
        }
      }
    }
  },
});
```

**Step 2: Run the dev server to verify no errors**

Run: `npm run dev`
Expected: No errors, caravan pawns don't get interrupted

**Step 3: Commit**

```bash
git add packages/colony/src/main.ts
git commit -m "feat(colony): update AIDecision to skip re-eval during caravan"
```

---

## Task 15: Update Debug UI for Phase 6

**Files:**
- Modify: `packages/colony/src/main.ts`

**Step 1: Update the debug overlay**

Find the debug overlay section in the onDraw callback and replace it with an updated version that shows more information:

After the existing stats panel code, find the debug overlay section and replace it with:

```typescript
  // Debug overlay (` toggle)
  if (debugMode) {
    const context = createActionContext();

    // Find the selected pawn (first red pawn for now)
    const selectedPawn = redPawn1;

    const scores = engine.ai.evaluateAll(selectedPawn, context);
    const currentTask = engine.ecs.getComponent<{ action: string }>(selectedPawn, 'CurrentTask');
    const caravanTask = engine.ecs.getComponent<{ phase: string; targetFactionId: string }>(selectedPawn, 'CaravanTask');
    const inventory = engine.ecs.getComponent<{ food: number }>(selectedPawn, 'Inventory');
    const memory = engine.ecs.getComponent<{ known: Array<{ factionId: string; lastSeenFood: number }> }>(selectedPawn, 'ColonyMemory');

    const debugX = 10;
    let debugY = canvas.height - 340;
    const debugWidth = 180;
    const debugHeight = 220;

    engine.renderer.drawRectScreen(debugX, debugY, debugWidth, debugHeight, 'rgba(26, 26, 46, 0.9)');
    engine.renderer.drawTextScreen('AI Debug (`)', debugX + 10, debugY + 22, {
      font: '14px monospace',
      color: '#ffffff',
    });

    let yOffset = 42;

    // Show caravan status if active
    if (caravanTask) {
      engine.renderer.drawTextScreen(`Caravan: ${caravanTask.phase}`, debugX + 10, debugY + yOffset, {
        font: '12px monospace',
        color: '#fbbf24',
      });
      yOffset += 18;
    }

    // Show inventory
    if (inventory) {
      engine.renderer.drawTextScreen(`Carrying: ${inventory.food} food`, debugX + 10, debugY + yOffset, {
        font: '12px monospace',
        color: '#60a5fa',
      });
      yOffset += 18;
    }

    // Show known colonies
    if (memory && memory.known.length > 0) {
      engine.renderer.drawTextScreen('Known colonies:', debugX + 10, debugY + yOffset, {
        font: '12px monospace',
        color: '#888888',
      });
      yOffset += 16;
      for (const k of memory.known) {
        engine.renderer.drawTextScreen(`  ${k.factionId}: ${k.lastSeenFood} food`, debugX + 10, debugY + yOffset, {
          font: '11px monospace',
          color: '#aaaaaa',
        });
        yOffset += 14;
      }
    }

    yOffset += 4;

    // Show action scores
    for (const { action, score, canExecute } of scores) {
      const isActive = currentTask?.action === action;
      const color = !canExecute ? '#666666' : isActive ? '#4ade80' : '#aaaaaa';
      const marker = isActive ? ' ◄' : '';
      const scoreText = canExecute ? score.toFixed(2) : '-.--';

      engine.renderer.drawTextScreen(
        `${action}: ${scoreText}${marker}`,
        debugX + 10,
        debugY + yOffset,
        { font: '12px monospace', color }
      );
      yOffset += 18;
    }
  }
```

**Step 2: Add stockpile food display**

In the onDraw callback, after drawing entities but before the UI section, add:

```typescript
  // Draw stockpile food counts
  for (const s of engine.ecs.query(['Stockpile', 'Position'])) {
    const stockpile = engine.ecs.getComponent<{ factionId: string; food: number }>(s, 'Stockpile')!;
    const pos = engine.ecs.getComponent<{ x: number; y: number }>(s, 'Position')!;
    const screenPos = engine.camera.worldToScreen(pos.x, pos.y - 24);
    engine.renderer.drawTextScreen(`${stockpile.food}`, screenPos.x, screenPos.y, {
      font: '14px monospace',
      color: '#ffffff',
      align: 'center',
    });
  }
```

**Step 3: Update the stats panel to show selected pawn**

Replace the stats panel section with:

```typescript
  // UI: Stats panel (screen-space, bottom-left)
  const selectedPawn = redPawn1; // Track first red pawn
  const selectedHunger = engine.ecs.getComponent<{ current: number; max: number }>(selectedPawn, 'Hunger')!;
  const selectedTask = engine.ecs.getComponent<{ action: string; target: Entity | null }>(selectedPawn, 'CurrentTask');
  const selectedFaction = engine.ecs.getComponent<{ id: string }>(selectedPawn, 'Faction');
  const taskLabel = selectedTask ? selectedTask.action.charAt(0).toUpperCase() + selectedTask.action.slice(1) : 'Idle';

  const panelX = 10;
  const panelY = canvas.height - 110;
  const panelWidth = 160;
  const panelHeight = 100;

  // Panel background
  engine.renderer.drawRectScreen(panelX, panelY, panelWidth, panelHeight, 'rgba(26, 26, 46, 0.9)');

  // Title
  const factionLabel = selectedFaction ? ` (${selectedFaction.id})` : '';
  engine.renderer.drawTextScreen(`Pawn${factionLabel}`, panelX + 10, panelY + 22, {
    font: '14px monospace',
    color: '#ffffff',
  });

  // Task label
  engine.renderer.drawTextScreen(`Task: ${taskLabel}`, panelX + 10, panelY + 42, {
    font: '12px monospace',
    color: '#aaaaaa',
  });

  // Hunger label
  engine.renderer.drawTextScreen('Hunger', panelX + 10, panelY + 62, {
    font: '12px monospace',
    color: '#aaaaaa',
  });

  // Hunger bar background
  const barX = panelX + 10;
  const barY = panelY + 69;
  const barWidth = 120;
  const barHeight = 14;
  engine.renderer.drawRectScreen(barX, barY, barWidth, barHeight, '#333333');

  // Hunger bar fill
  const fillWidth = barWidth * (selectedHunger.current / selectedHunger.max);
  const hungerColor = selectedHunger.current > 70 ? '#e94560' : selectedHunger.current > 40 ? '#ffdd57' : '#4ade80';
  engine.renderer.drawRectScreen(barX, barY, fillWidth, barHeight, hungerColor);

  // Hunger value
  engine.renderer.drawTextScreen(
    `${Math.round(selectedHunger.current)}/${selectedHunger.max}`,
    barX + barWidth + 5,
    barY + 11,
    { font: '11px monospace', color: '#888888' }
  );
```

**Step 4: Run the dev server to verify UI updates**

Run: `npm run dev`
Expected: Debug panel shows caravan status, inventory, known colonies, and action scores

**Step 5: Commit**

```bash
git add packages/colony/src/main.ts
git commit -m "feat(colony): update debug UI for Phase 6 (stockpiles, memory, caravan status)"
```

---

## Task 16: Update Console Message and Instructions

**Files:**
- Modify: `packages/colony/src/main.ts`

**Step 1: Update the console message and instructions**

Find and update the console.log at the bottom of the file:

```typescript
engine.start();
console.log('Colony - Built with Emergence Engine (Phase 6: Two Colonies)');
```

Find and update the instructions text in the onDraw callback:

```typescript
  // Instructions (top-left)
  engine.renderer.drawTextScreen('Two Colonies | +/-: Zoom | `: Debug', 10, 30, { color: '#888' });
```

**Step 2: Run the dev server to verify**

Run: `npm run dev`
Expected: Updated instructions and console message

**Step 3: Commit**

```bash
git add packages/colony/src/main.ts
git commit -m "chore(colony): update console message and instructions for Phase 6"
```

---

## Task 17: Run Full Test Suite

**Files:** None (verification only)

**Step 1: Run all tests**

Run: `npm test`
Expected: All 154+ tests pass

**Step 2: Run the build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Manual testing checklist**

Run: `npm run dev`

Test the following scenarios:
- [ ] Two stockpiles visible (red on left, blue on right)
- [ ] Pawns have faction-colored sprites
- [ ] Stockpile food counts visible above stockpiles
- [ ] Pawns eat from their own stockpile when hungry
- [ ] Red pawns explore toward blue territory
- [ ] When a red pawn sees blue stockpile is low, they remember it
- [ ] Caravan action triggers when red has surplus and knows blue has deficit
- [ ] Caravan pawn picks up food, walks to blue, delivers, returns
- [ ] Blue colony's stockpile increases after delivery
- [ ] Debug panel shows caravan phase, inventory, and known colonies

**Step 4: Commit if any fixes were needed**

If fixes were made during manual testing, commit them with appropriate messages.

---

## Task 18: Update Camera to Follow Action

**Files:**
- Modify: `packages/colony/src/main.ts`

**Step 1: Update CameraFollow to track caravan pawns**

Find the CameraFollow system and replace it with:

```typescript
// Camera follow system - follow caravan pawns or first red pawn
engine.ecs.addSystem({
  name: 'CameraFollow',
  query: ['Pawn', 'Position'],
  update(entities) {
    // Prefer following a pawn on a caravan
    let followTarget: Entity | null = null;

    for (const e of entities) {
      if (engine.ecs.hasComponent(e, 'CaravanTask')) {
        followTarget = e;
        break;
      }
    }

    // Fall back to first red pawn
    if (!followTarget) {
      for (const e of entities) {
        const faction = engine.ecs.getComponent<{ id: string }>(e, 'Faction');
        if (faction?.id === 'red') {
          followTarget = e;
          break;
        }
      }
    }

    if (followTarget) {
      const pos = engine.ecs.getComponent<{ x: number; y: number }>(followTarget, 'Position')!;
      engine.camera.centerOn(pos.x, pos.y);
    }
  },
});
```

**Step 2: Run the dev server to verify camera follows caravans**

Run: `npm run dev`
Expected: Camera follows caravan pawns when they're active

**Step 3: Commit**

```bash
git add packages/colony/src/main.ts
git commit -m "feat(colony): camera follows caravan pawns"
```

---

## Task 19: Final Verification and Cleanup

**Files:**
- Modify: `packages/colony/src/main.ts` (if needed)

**Step 1: Run the full test suite**

Run: `npm test`
Expected: All tests pass

**Step 2: Run the build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Manual end-to-end test**

Run: `npm run dev`

Watch the simulation for 2-3 minutes. Verify:
1. Blue colony's stockpile depletes as the blue pawn eats
2. A red pawn eventually explores to the blue side
3. The red pawn learns about blue's food shortage
4. The red pawn returns home and initiates a caravan
5. The caravan delivers food to blue
6. Blue colony survives longer due to the trade

**Step 4: Clean up any unused code**

Remove the old `spawnFood(20)` function call if it's still present (should have been removed in Task 5).

Remove the old `pawn` variable references if they're causing issues.

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat(colony): Phase 6 complete - Two Colonies with autonomous trade"
```

---

## Summary

This plan implements Phase 6 in 19 tasks:

| Task | Description |
|------|-------------|
| 1 | Add territory support to TileMap (engine) |
| 2 | Define new components |
| 3 | Create stockpile spawn function |
| 4 | Create faction pawn spawn function |
| 5 | Set up two-colony test scenario |
| 6 | Implement MemoryDecaySystem |
| 7 | Implement MemoryUpdateSystem |
| 8 | Implement ProximitySignalSystem |
| 9 | Modify eat action for stockpiles |
| 10 | Update TaskExecution for stockpile eating |
| 11 | Implement explore action |
| 12 | Implement caravan action |
| 13 | Implement CaravanSystem |
| 14 | Update AIDecision for CaravanTask |
| 15 | Update debug UI |
| 16 | Update console message |
| 17 | Run full test suite |
| 18 | Update camera follow |
| 19 | Final verification |

**Success criteria:** Blue colony survives because red pawns autonomously discover their need and deliver food via caravan.
