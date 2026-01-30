# Phase 5: Pawn Thinks - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the pawn autonomous - it evaluates needs and tasks, picks the best action, and executes it.

**Architecture:** Engine provides a utility AI framework (ActionRegistry) that games use to define actions with `canExecute`, `score`, and `execute` methods. Actions set ECS components; existing systems (pathfinding, movement) handle execution. Re-evaluation happens on task completion or hunger threshold changes.

**Tech Stack:** TypeScript, Vitest, existing ECS/Pathfinding from Phase 4

---

## Task 1: ActionRegistry - Types and Interface

**Files:**
- Create: `packages/engine/src/ai/ActionRegistry.ts`
- Test: `packages/engine/src/ai/ActionRegistry.test.ts`

**Step 1: Write the failing test for action definition**

```typescript
// packages/engine/src/ai/ActionRegistry.test.ts
/*
 * This file is part of Emergence Engine.
 * Copyright (C) 2026 astrosteveo
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { describe, it, expect } from 'vitest';
import { ActionRegistry } from './ActionRegistry';
import { World } from '../ecs/World';

describe('ActionRegistry', () => {
  it('allows defining an action', () => {
    const registry = new ActionRegistry();

    registry.defineAction('test', {
      canExecute: () => true,
      score: () => 0.5,
      execute: () => {},
    });

    expect(registry.hasAction('test')).toBe(true);
  });

  it('throws when defining duplicate action', () => {
    const registry = new ActionRegistry();

    registry.defineAction('test', {
      canExecute: () => true,
      score: () => 0.5,
      execute: () => {},
    });

    expect(() => {
      registry.defineAction('test', {
        canExecute: () => true,
        score: () => 0.5,
        execute: () => {},
      });
    }).toThrow('Action "test" already defined');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run packages/engine/src/ai/ActionRegistry.test.ts`
Expected: FAIL with "Cannot find module './ActionRegistry'"

**Step 3: Write minimal implementation**

```typescript
// packages/engine/src/ai/ActionRegistry.ts
/*
 * This file is part of Emergence Engine.
 * Copyright (C) 2026 astrosteveo
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import type { Entity } from '../ecs/World';

export interface ActionContext {
  ecs: {
    query(components: string[]): Entity[];
    getComponent<T>(entity: Entity, name: string): T | undefined;
    hasComponent(entity: Entity, name: string): boolean;
    addComponent<T extends object>(entity: Entity, name: string, data?: Partial<T>): T;
    removeComponent(entity: Entity, name: string): void;
    isAlive(entity: Entity): boolean;
  };
  findNearest(entity: Entity, componentName: string): Entity | null;
}

export interface ActionDefinition {
  canExecute(entity: Entity, context: ActionContext): boolean;
  score(entity: Entity, context: ActionContext): number;
  execute(entity: Entity, context: ActionContext): void;
}

export class ActionRegistry {
  private actions = new Map<string, ActionDefinition>();

  defineAction(name: string, definition: ActionDefinition): void {
    if (this.actions.has(name)) {
      throw new Error(`Action "${name}" already defined`);
    }
    this.actions.set(name, definition);
  }

  hasAction(name: string): boolean {
    return this.actions.has(name);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --run packages/engine/src/ai/ActionRegistry.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/engine/src/ai/ActionRegistry.ts packages/engine/src/ai/ActionRegistry.test.ts
git commit -m "feat(ai): add ActionRegistry with defineAction"
```

---

## Task 2: ActionRegistry - evaluateAll method

**Files:**
- Modify: `packages/engine/src/ai/ActionRegistry.ts`
- Modify: `packages/engine/src/ai/ActionRegistry.test.ts`

**Step 1: Write the failing test for evaluateAll**

Add to `ActionRegistry.test.ts`:

```typescript
describe('evaluateAll', () => {
  it('returns scores for all executable actions', () => {
    const registry = new ActionRegistry();
    const ecs = new World();
    ecs.defineComponent('Hunger', { current: 50, max: 100 });

    const entity = ecs.createEntity();
    ecs.addComponent(entity, 'Hunger', { current: 50, max: 100 });

    registry.defineAction('eat', {
      canExecute: () => true,
      score: (e, ctx) => {
        const hunger = ctx.ecs.getComponent<{ current: number; max: number }>(e, 'Hunger')!;
        return hunger.current / hunger.max;
      },
      execute: () => {},
    });

    registry.defineAction('sleep', {
      canExecute: () => false, // Cannot execute
      score: () => 0.8,
      execute: () => {},
    });

    registry.defineAction('wander', {
      canExecute: () => true,
      score: () => 0.1,
      execute: () => {},
    });

    const context: ActionContext = {
      ecs: {
        query: (c) => ecs.query(c),
        getComponent: (e, n) => ecs.getComponent(e, n),
        hasComponent: (e, n) => ecs.hasComponent(e, n),
        addComponent: (e, n, d) => ecs.addComponent(e, n, d),
        removeComponent: (e, n) => ecs.removeComponent(e, n),
        isAlive: (e) => ecs.isAlive(e),
      },
      findNearest: () => null,
    };

    const scores = registry.evaluateAll(entity, context);

    expect(scores).toEqual([
      { action: 'eat', score: 0.5, canExecute: true },
      { action: 'wander', score: 0.1, canExecute: true },
      { action: 'sleep', score: 0, canExecute: false },
    ]);
  });
});
```

Add import at top of test file:

```typescript
import { ActionRegistry, ActionContext } from './ActionRegistry';
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run packages/engine/src/ai/ActionRegistry.test.ts`
Expected: FAIL with "registry.evaluateAll is not a function"

**Step 3: Write minimal implementation**

Add to `ActionRegistry` class in `ActionRegistry.ts`:

```typescript
export interface ActionScore {
  action: string;
  score: number;
  canExecute: boolean;
}

// In ActionRegistry class:
evaluateAll(entity: Entity, context: ActionContext): ActionScore[] {
  const scores: ActionScore[] = [];

  for (const [name, definition] of this.actions) {
    const canExec = definition.canExecute(entity, context);
    const score = canExec ? definition.score(entity, context) : 0;
    scores.push({ action: name, score, canExecute: canExec });
  }

  // Sort by score descending, non-executable at end
  scores.sort((a, b) => {
    if (a.canExecute !== b.canExecute) {
      return a.canExecute ? -1 : 1;
    }
    return b.score - a.score;
  });

  return scores;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --run packages/engine/src/ai/ActionRegistry.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/engine/src/ai/ActionRegistry.ts packages/engine/src/ai/ActionRegistry.test.ts
git commit -m "feat(ai): add evaluateAll to score all actions"
```

---

## Task 3: ActionRegistry - pickBest method

**Files:**
- Modify: `packages/engine/src/ai/ActionRegistry.ts`
- Modify: `packages/engine/src/ai/ActionRegistry.test.ts`

**Step 1: Write the failing test for pickBest**

Add to `ActionRegistry.test.ts`:

```typescript
describe('pickBest', () => {
  it('returns the highest scoring executable action', () => {
    const registry = new ActionRegistry();
    const ecs = new World();
    ecs.defineComponent('Hunger', { current: 70, max: 100 });

    const entity = ecs.createEntity();
    ecs.addComponent(entity, 'Hunger', { current: 70, max: 100 });

    registry.defineAction('eat', {
      canExecute: () => true,
      score: (e, ctx) => {
        const hunger = ctx.ecs.getComponent<{ current: number; max: number }>(e, 'Hunger')!;
        return hunger.current / hunger.max;
      },
      execute: () => {},
    });

    registry.defineAction('wander', {
      canExecute: () => true,
      score: () => 0.1,
      execute: () => {},
    });

    const context: ActionContext = {
      ecs: {
        query: (c) => ecs.query(c),
        getComponent: (e, n) => ecs.getComponent(e, n),
        hasComponent: (e, n) => ecs.hasComponent(e, n),
        addComponent: (e, n, d) => ecs.addComponent(e, n, d),
        removeComponent: (e, n) => ecs.removeComponent(e, n),
        isAlive: (e) => ecs.isAlive(e),
      },
      findNearest: () => null,
    };

    const best = registry.pickBest(entity, context);

    expect(best).toBe('eat');
  });

  it('returns null when no actions can execute', () => {
    const registry = new ActionRegistry();
    const ecs = new World();
    const entity = ecs.createEntity();

    registry.defineAction('eat', {
      canExecute: () => false,
      score: () => 0.5,
      execute: () => {},
    });

    const context: ActionContext = {
      ecs: {
        query: (c) => ecs.query(c),
        getComponent: (e, n) => ecs.getComponent(e, n),
        hasComponent: (e, n) => ecs.hasComponent(e, n),
        addComponent: (e, n, d) => ecs.addComponent(e, n, d),
        removeComponent: (e, n) => ecs.removeComponent(e, n),
        isAlive: (e) => ecs.isAlive(e),
      },
      findNearest: () => null,
    };

    const best = registry.pickBest(entity, context);

    expect(best).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run packages/engine/src/ai/ActionRegistry.test.ts`
Expected: FAIL with "registry.pickBest is not a function"

**Step 3: Write minimal implementation**

Add to `ActionRegistry` class:

```typescript
pickBest(entity: Entity, context: ActionContext): string | null {
  const scores = this.evaluateAll(entity, context);
  const best = scores.find((s) => s.canExecute);
  return best?.action ?? null;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --run packages/engine/src/ai/ActionRegistry.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/engine/src/ai/ActionRegistry.ts packages/engine/src/ai/ActionRegistry.test.ts
git commit -m "feat(ai): add pickBest to select highest-scoring action"
```

---

## Task 4: ActionRegistry - execute method

**Files:**
- Modify: `packages/engine/src/ai/ActionRegistry.ts`
- Modify: `packages/engine/src/ai/ActionRegistry.test.ts`

**Step 1: Write the failing test for execute**

Add to `ActionRegistry.test.ts`:

```typescript
describe('execute', () => {
  it('calls the action execute method', () => {
    const registry = new ActionRegistry();
    const ecs = new World();
    const entity = ecs.createEntity();
    let executed = false;

    registry.defineAction('test', {
      canExecute: () => true,
      score: () => 0.5,
      execute: () => {
        executed = true;
      },
    });

    const context: ActionContext = {
      ecs: {
        query: (c) => ecs.query(c),
        getComponent: (e, n) => ecs.getComponent(e, n),
        hasComponent: (e, n) => ecs.hasComponent(e, n),
        addComponent: (e, n, d) => ecs.addComponent(e, n, d),
        removeComponent: (e, n) => ecs.removeComponent(e, n),
        isAlive: (e) => ecs.isAlive(e),
      },
      findNearest: () => null,
    };

    registry.execute('test', entity, context);

    expect(executed).toBe(true);
  });

  it('throws when action does not exist', () => {
    const registry = new ActionRegistry();
    const ecs = new World();
    const entity = ecs.createEntity();

    const context: ActionContext = {
      ecs: {
        query: (c) => ecs.query(c),
        getComponent: (e, n) => ecs.getComponent(e, n),
        hasComponent: (e, n) => ecs.hasComponent(e, n),
        addComponent: (e, n, d) => ecs.addComponent(e, n, d),
        removeComponent: (e, n) => ecs.removeComponent(e, n),
        isAlive: (e) => ecs.isAlive(e),
      },
      findNearest: () => null,
    };

    expect(() => registry.execute('nonexistent', entity, context)).toThrow(
      'Action "nonexistent" not defined'
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run packages/engine/src/ai/ActionRegistry.test.ts`
Expected: FAIL with "registry.execute is not a function"

**Step 3: Write minimal implementation**

Add to `ActionRegistry` class:

```typescript
execute(name: string, entity: Entity, context: ActionContext): void {
  const definition = this.actions.get(name);
  if (!definition) {
    throw new Error(`Action "${name}" not defined`);
  }
  definition.execute(entity, context);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --run packages/engine/src/ai/ActionRegistry.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/engine/src/ai/ActionRegistry.ts packages/engine/src/ai/ActionRegistry.test.ts
git commit -m "feat(ai): add execute method to run action"
```

---

## Task 5: Wire ActionRegistry to Engine

**Files:**
- Modify: `packages/engine/src/Engine.ts`
- Modify: `packages/engine/src/Engine.test.ts`
- Modify: `packages/engine/src/index.ts`

**Step 1: Write the failing test**

Add to `packages/engine/src/Engine.test.ts`:

```typescript
it('exposes ai property with ActionRegistry', () => {
  const engine = new Engine({ canvas });

  expect(engine.ai).toBeDefined();
  expect(typeof engine.ai.defineAction).toBe('function');
  expect(typeof engine.ai.pickBest).toBe('function');
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run packages/engine/src/Engine.test.ts`
Expected: FAIL with "engine.ai is undefined"

**Step 3: Write minimal implementation**

In `packages/engine/src/Engine.ts`, add import at top:

```typescript
import { ActionRegistry } from './ai/ActionRegistry';
```

Add property to Engine class after line 36 (`readonly tileMap: TileMap;`):

```typescript
readonly ai: ActionRegistry;
```

In constructor, after `this.tileMap = new TileMap();` (line 46):

```typescript
this.ai = new ActionRegistry();
```

In `packages/engine/src/index.ts`, add exports after the Pathfinder exports (line 33):

```typescript
export { ActionRegistry } from './ai/ActionRegistry';
export type { ActionDefinition, ActionContext, ActionScore } from './ai/ActionRegistry';
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --run packages/engine/src/Engine.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/engine/src/Engine.ts packages/engine/src/Engine.test.ts packages/engine/src/index.ts
git commit -m "feat(engine): expose ai property with ActionRegistry"
```

---

## Task 6: Add findNearest helper to Engine

**Files:**
- Modify: `packages/engine/src/Engine.ts`
- Modify: `packages/engine/src/Engine.test.ts`

**Step 1: Write the failing test**

Add to `packages/engine/src/Engine.test.ts`:

```typescript
describe('findNearest', () => {
  it('finds the nearest entity with a component', () => {
    const engine = new Engine({ canvas });
    engine.ecs.defineComponent('Position', { x: 0, y: 0 });
    engine.ecs.defineComponent('Food', { nutrition: 30 });

    const pawn = engine.ecs.createEntity();
    engine.ecs.addComponent(pawn, 'Position', { x: 0, y: 0 });

    const food1 = engine.ecs.createEntity();
    engine.ecs.addComponent(food1, 'Position', { x: 100, y: 0 });
    engine.ecs.addComponent(food1, 'Food', { nutrition: 30 });

    const food2 = engine.ecs.createEntity();
    engine.ecs.addComponent(food2, 'Position', { x: 50, y: 0 });
    engine.ecs.addComponent(food2, 'Food', { nutrition: 30 });

    const nearest = engine.findNearest(pawn, 'Food');

    expect(nearest).toBe(food2);
  });

  it('returns null when no entities have the component', () => {
    const engine = new Engine({ canvas });
    engine.ecs.defineComponent('Position', { x: 0, y: 0 });
    engine.ecs.defineComponent('Food', { nutrition: 30 });

    const pawn = engine.ecs.createEntity();
    engine.ecs.addComponent(pawn, 'Position', { x: 0, y: 0 });

    const nearest = engine.findNearest(pawn, 'Food');

    expect(nearest).toBeNull();
  });

  it('returns null when entity has no Position', () => {
    const engine = new Engine({ canvas });
    engine.ecs.defineComponent('Position', { x: 0, y: 0 });
    engine.ecs.defineComponent('Food', { nutrition: 30 });

    const pawn = engine.ecs.createEntity();
    // No Position component

    const food = engine.ecs.createEntity();
    engine.ecs.addComponent(food, 'Position', { x: 50, y: 0 });
    engine.ecs.addComponent(food, 'Food', { nutrition: 30 });

    const nearest = engine.findNearest(pawn, 'Food');

    expect(nearest).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run packages/engine/src/Engine.test.ts`
Expected: FAIL with "engine.findNearest is not a function"

**Step 3: Write minimal implementation**

Add import at top of `Engine.ts`:

```typescript
import type { Entity } from './ecs/World';
```

Add method to Engine class:

```typescript
findNearest(entity: Entity, componentName: string): Entity | null {
  const pos = this.ecs.getComponent<{ x: number; y: number }>(entity, 'Position');
  if (!pos) return null;

  const candidates = this.ecs.query(['Position', componentName]);
  let nearest: Entity | null = null;
  let nearestDist = Infinity;

  for (const candidate of candidates) {
    if (candidate === entity) continue;
    const candidatePos = this.ecs.getComponent<{ x: number; y: number }>(candidate, 'Position')!;
    const dx = candidatePos.x - pos.x;
    const dy = candidatePos.y - pos.y;
    const dist = dx * dx + dy * dy;
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = candidate;
    }
  }

  return nearest;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --run packages/engine/src/Engine.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/engine/src/Engine.ts packages/engine/src/Engine.test.ts
git commit -m "feat(engine): add findNearest helper for spatial queries"
```

---

## Task 7: Run all engine tests

**Step 1: Run all tests**

Run: `npm test`
Expected: All 150+ tests pass

**Step 2: Commit if needed**

No commit needed if tests pass.

---

## Task 8: Define Food component and spawn food in Colony

**Files:**
- Modify: `packages/colony/src/main.ts`

**Step 1: Add Food component definition**

After the existing component definitions (around line 45), add:

```typescript
engine.ecs.defineComponent('Food', { nutrition: 30 });
```

**Step 2: Add food spawning function**

After the component definitions, add:

```typescript
function spawnFood(count: number): void {
  const halfW = Math.floor(engine.tileMap.width / 2);
  const halfH = Math.floor(engine.tileMap.height / 2);
  let spawned = 0;
  let attempts = 0;
  const maxAttempts = count * 10;

  while (spawned < count && attempts < maxAttempts) {
    attempts++;
    const tileX = Math.floor(Math.random() * engine.tileMap.width) - halfW;
    const tileY = Math.floor(Math.random() * engine.tileMap.height) - halfH;

    if (engine.tileMap.isWalkable(tileX, tileY)) {
      const food = engine.ecs.createEntity();
      engine.ecs.addComponent(food, 'Position', {
        x: tileX * TILE_SIZE + TILE_SIZE / 2,
        y: tileY * TILE_SIZE + TILE_SIZE / 2,
      });
      engine.ecs.addComponent(food, 'Food', { nutrition: 30 });
      engine.ecs.addComponent(food, 'Sprite', { width: 12, height: 12, color: '#4ade80' });
      spawned++;
    }
  }
}
```

**Step 3: Call spawnFood after terrain generation**

After `generateTerrain(engine.tileMap, { width: 64, height: 64, seed: Date.now() });` (around line 33), add:

```typescript
spawnFood(20);
```

**Step 4: Verify manually**

Run: `npm run dev`
Expected: See ~20 green squares scattered on walkable terrain

**Step 5: Commit**

```bash
git add packages/colony/src/main.ts
git commit -m "feat(colony): add Food component and spawn food at world gen"
```

---

## Task 9: Add CurrentTask and AIState components

**Files:**
- Modify: `packages/colony/src/main.ts`

**Step 1: Add component definitions**

After the Food component definition, add:

```typescript
engine.ecs.defineComponent('CurrentTask', { action: '', target: null as Entity | null });
engine.ecs.defineComponent('AIState', { lastHungerPercent: 0, needsReeval: true });
```

**Step 2: Add AIState to pawn**

After the pawn's Hunger component is added (around line 52), add:

```typescript
engine.ecs.addComponent(pawn, 'AIState', { lastHungerPercent: 0.25, needsReeval: true });
```

**Step 3: Commit**

```bash
git add packages/colony/src/main.ts
git commit -m "feat(colony): add CurrentTask and AIState components"
```

---

## Task 10: Define eat action

**Files:**
- Modify: `packages/colony/src/main.ts`

**Step 1: Create ActionContext helper**

After component definitions, before systems, add:

```typescript
function createActionContext(): import('emergence-engine').ActionContext {
  return {
    ecs: {
      query: (c) => engine.ecs.query(c),
      getComponent: (e, n) => engine.ecs.getComponent(e, n),
      hasComponent: (e, n) => engine.ecs.hasComponent(e, n),
      addComponent: (e, n, d) => engine.ecs.addComponent(e, n, d),
      removeComponent: (e, n) => engine.ecs.removeComponent(e, n),
      isAlive: (e) => engine.ecs.isAlive(e),
    },
    findNearest: (e, c) => engine.findNearest(e, c),
  };
}
```

**Step 2: Define eat action**

After createActionContext, add:

```typescript
engine.ai.defineAction('eat', {
  canExecute(entity, context) {
    return context.findNearest(entity, 'Food') !== null;
  },
  score(entity, context) {
    const hunger = context.ecs.getComponent<{ current: number; max: number }>(entity, 'Hunger');
    if (!hunger) return 0;
    return hunger.current / hunger.max;
  },
  execute(entity, context) {
    const food = context.findNearest(entity, 'Food');
    if (!food) return;

    const foodPos = context.ecs.getComponent<{ x: number; y: number }>(food, 'Position');
    if (!foodPos) return;

    // Convert world position to tile
    const tileX = Math.floor(foodPos.x / TILE_SIZE);
    const tileY = Math.floor(foodPos.y / TILE_SIZE);

    // Remove any existing path
    if (context.ecs.hasComponent(entity, 'PathFollow')) {
      context.ecs.removeComponent(entity, 'PathFollow');
    }
    if (context.ecs.hasComponent(entity, 'PathTarget')) {
      context.ecs.removeComponent(entity, 'PathTarget');
    }

    context.ecs.addComponent(entity, 'PathTarget', { x: tileX, y: tileY });

    // Remove old task, add new one
    if (context.ecs.hasComponent(entity, 'CurrentTask')) {
      context.ecs.removeComponent(entity, 'CurrentTask');
    }
    context.ecs.addComponent(entity, 'CurrentTask', { action: 'eat', target: food });
  },
});
```

**Step 3: Add import for ActionContext type**

Update the import at top of file:

```typescript
import { Engine, generateTerrain, Pathfinder } from 'emergence-engine';
import type { Entity, PathNode, ActionContext } from 'emergence-engine';
```

**Step 4: Commit**

```bash
git add packages/colony/src/main.ts
git commit -m "feat(colony): define eat action"
```

---

## Task 11: Define wander action

**Files:**
- Modify: `packages/colony/src/main.ts`

**Step 1: Define wander action**

After the eat action definition, add:

```typescript
engine.ai.defineAction('wander', {
  canExecute() {
    return true; // Can always wander
  },
  score() {
    return 0.1; // Low priority fallback
  },
  execute(entity, context) {
    const pos = context.ecs.getComponent<{ x: number; y: number }>(entity, 'Position');
    if (!pos) return;

    // Current tile
    const currentTileX = Math.floor(pos.x / TILE_SIZE);
    const currentTileY = Math.floor(pos.y / TILE_SIZE);

    // Pick a random nearby walkable tile (within 5 tiles)
    const range = 5;
    let targetX = currentTileX;
    let targetY = currentTileY;
    let found = false;

    for (let attempts = 0; attempts < 10 && !found; attempts++) {
      const dx = Math.floor(Math.random() * (range * 2 + 1)) - range;
      const dy = Math.floor(Math.random() * (range * 2 + 1)) - range;
      const tx = currentTileX + dx;
      const ty = currentTileY + dy;

      if (engine.tileMap.isWalkable(tx, ty)) {
        targetX = tx;
        targetY = ty;
        found = true;
      }
    }

    if (!found) return;

    // Remove any existing path
    if (context.ecs.hasComponent(entity, 'PathFollow')) {
      context.ecs.removeComponent(entity, 'PathFollow');
    }
    if (context.ecs.hasComponent(entity, 'PathTarget')) {
      context.ecs.removeComponent(entity, 'PathTarget');
    }

    context.ecs.addComponent(entity, 'PathTarget', { x: targetX, y: targetY });

    // Remove old task, add new one
    if (context.ecs.hasComponent(entity, 'CurrentTask')) {
      context.ecs.removeComponent(entity, 'CurrentTask');
    }
    context.ecs.addComponent(entity, 'CurrentTask', { action: 'wander', target: null });
  },
});
```

**Step 2: Commit**

```bash
git add packages/colony/src/main.ts
git commit -m "feat(colony): define wander action"
```

---

## Task 12: Add AIDecisionSystem

**Files:**
- Modify: `packages/colony/src/main.ts`

**Step 1: Remove ClickToMove system**

Delete the entire ClickToMove system (the system with `name: 'ClickToMove'`).

**Step 2: Add AIDecisionSystem**

After the CameraControl system, add:

```typescript
// AI Decision system: re-evaluate when needed
engine.ecs.addSystem({
  name: 'AIDecision',
  query: ['Pawn', 'Hunger', 'AIState'],
  update(entities) {
    const context = createActionContext();

    for (const e of entities) {
      const aiState = engine.ecs.getComponent<{ lastHungerPercent: number; needsReeval: boolean }>(e, 'AIState')!;
      const hunger = engine.ecs.getComponent<{ current: number; max: number }>(e, 'Hunger')!;
      const currentPercent = hunger.current / hunger.max;

      // Check if hunger crossed 50% threshold
      if (aiState.lastHungerPercent < 0.5 && currentPercent >= 0.5) {
        aiState.needsReeval = true;
      }
      aiState.lastHungerPercent = currentPercent;

      // Check if current task is complete (no path and no target)
      const hasTask = engine.ecs.hasComponent(e, 'CurrentTask');
      const hasPath = engine.ecs.hasComponent(e, 'PathFollow') || engine.ecs.hasComponent(e, 'PathTarget');
      if (hasTask && !hasPath) {
        aiState.needsReeval = true;
      }

      // Check if no task at all
      if (!hasTask) {
        aiState.needsReeval = true;
      }

      // Check if target no longer exists (for eat action)
      if (hasTask) {
        const task = engine.ecs.getComponent<{ action: string; target: Entity | null }>(e, 'CurrentTask')!;
        if (task.target !== null && !engine.ecs.isAlive(task.target)) {
          aiState.needsReeval = true;
        }
      }

      // Re-evaluate if needed
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

**Step 3: Commit**

```bash
git add packages/colony/src/main.ts
git commit -m "feat(colony): add AIDecisionSystem, remove ClickToMove"
```

---

## Task 13: Add TaskExecutionSystem for eating

**Files:**
- Modify: `packages/colony/src/main.ts`

**Step 1: Add TaskExecutionSystem**

After the PathFollow system, add:

```typescript
// Task execution system: handle task completion when arrived
engine.ecs.addSystem({
  name: 'TaskExecution',
  query: ['CurrentTask', 'Position'],
  update(entities) {
    for (const e of entities) {
      // Only execute if we've arrived (no PathFollow or PathTarget)
      if (engine.ecs.hasComponent(e, 'PathFollow') || engine.ecs.hasComponent(e, 'PathTarget')) {
        continue;
      }

      const task = engine.ecs.getComponent<{ action: string; target: Entity | null }>(e, 'CurrentTask')!;

      if (task.action === 'eat' && task.target !== null) {
        // Check if food still exists
        if (engine.ecs.isAlive(task.target)) {
          const food = engine.ecs.getComponent<{ nutrition: number }>(task.target, 'Food');
          const hunger = engine.ecs.getComponent<{ current: number; max: number }>(e, 'Hunger');

          if (food && hunger) {
            // Eat the food
            hunger.current = Math.max(0, hunger.current - food.nutrition);
            engine.ecs.destroyEntity(task.target);
          }
        }

        // Clear task to trigger re-evaluation
        engine.ecs.removeComponent(e, 'CurrentTask');
      } else if (task.action === 'wander') {
        // Wander complete, clear task to trigger re-evaluation
        engine.ecs.removeComponent(e, 'CurrentTask');
      }
    }
  },
});
```

**Step 2: Commit**

```bash
git add packages/colony/src/main.ts
git commit -m "feat(colony): add TaskExecutionSystem for eating"
```

---

## Task 14: Update PathFollow system to remove destination marker management

**Files:**
- Modify: `packages/colony/src/main.ts`

**Step 1: Remove destination marker logic from PathFollow**

In the PathFollow system, remove:
- The `destinationMarker` variable declaration
- The destination marker creation in Pathfinding system
- The destination marker destruction in PathFollow system

The PathFollow system should just handle movement, nothing else.

Updated PathFollow system (replace existing):

```typescript
// Path follow system: move entity along path
engine.ecs.addSystem({
  name: 'PathFollow',
  query: ['Position', 'PathFollow'],
  update(entities, dt) {
    for (const e of entities) {
      const pos = engine.ecs.getComponent<{ x: number; y: number }>(e, 'Position')!;
      const pathFollow = engine.ecs.getComponent<{ path: PathNode[]; nodeIndex: number }>(
        e,
        'PathFollow'
      )!;

      if (pathFollow.nodeIndex >= pathFollow.path.length) {
        // Path complete
        engine.ecs.removeComponent(e, 'PathFollow');
        if (engine.ecs.hasComponent(e, 'PathTarget')) {
          engine.ecs.removeComponent(e, 'PathTarget');
        }
        continue;
      }

      const targetNode = pathFollow.path[pathFollow.nodeIndex];
      const targetX = targetNode.x * TILE_SIZE + TILE_SIZE / 2;
      const targetY = targetNode.y * TILE_SIZE + TILE_SIZE / 2;

      const dx = targetX - pos.x;
      const dy = targetY - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 2) {
        // Close enough, snap and advance
        pos.x = targetX;
        pos.y = targetY;
        pathFollow.nodeIndex++;
      } else {
        // Move toward target
        const moveDistance = PAWN_SPEED * dt;
        const ratio = Math.min(moveDistance / distance, 1);
        pos.x += dx * ratio;
        pos.y += dy * ratio;
      }
    }
  },
});
```

Also update Pathfinding system to remove destination marker creation:

```typescript
// Pathfinding system: when entity has PathTarget but no PathFollow, calculate path
engine.ecs.addSystem({
  name: 'Pathfinding',
  query: ['Position', 'PathTarget'],
  update(entities) {
    for (const e of entities) {
      if (engine.ecs.hasComponent(e, 'PathFollow')) continue;

      const pos = engine.ecs.getComponent<{ x: number; y: number }>(e, 'Position')!;
      const target = engine.ecs.getComponent<{ x: number; y: number }>(e, 'PathTarget')!;

      // Convert current position to tile
      const currentTile = engine.camera.worldToTile(pos.x, pos.y, TILE_SIZE);

      const path = pathfinder.findPath(currentTile.x, currentTile.y, target.x, target.y);

      if (path && path.length > 1) {
        // Skip first node (current position)
        engine.ecs.addComponent(e, 'PathFollow', { path: path.slice(1), nodeIndex: 0 });
      } else {
        // No valid path, remove target
        engine.ecs.removeComponent(e, 'PathTarget');
      }
    }
  },
});
```

Remove the `let destinationMarker: Entity | null = null;` variable and the DestinationMarker component definition.

**Step 2: Remove DestinationMarker from render loop**

In the render loop, remove:

```typescript
// Draw destination marker
for (const e of engine.ecs.query(['DestinationMarker', 'Position'])) {
  const pos = engine.ecs.getComponent<{ x: number; y: number }>(e, 'Position')!;
  // Draw a small X
  engine.renderer.drawCircle(pos.x, pos.y, 4, '#ffdd57');
}
```

**Step 3: Remove DestinationMarker component definition**

Remove:

```typescript
engine.ecs.defineComponent('DestinationMarker', {}); // Marker for destination indicator
```

**Step 4: Commit**

```bash
git add packages/colony/src/main.ts
git commit -m "refactor(colony): simplify PathFollow, remove destination marker"
```

---

## Task 15: Update stats panel to show current task

**Files:**
- Modify: `packages/colony/src/main.ts`

**Step 1: Update render loop to show task**

In the render loop, after the panel background is drawn, update to show task label:

Replace the stats panel section with:

```typescript
// UI: Stats panel (screen-space, bottom-left)
const hunger = engine.ecs.getComponent<{ current: number; max: number }>(pawn, 'Hunger')!;
const currentTask = engine.ecs.getComponent<{ action: string; target: Entity | null }>(pawn, 'CurrentTask');
const taskLabel = currentTask ? currentTask.action.charAt(0).toUpperCase() + currentTask.action.slice(1) : 'Idle';

const panelX = 10;
const panelY = canvas.height - 110;
const panelWidth = 160;
const panelHeight = 100;

// Panel background
engine.renderer.drawRectScreen(panelX, panelY, panelWidth, panelHeight, 'rgba(26, 26, 46, 0.9)');

// Title
engine.renderer.drawTextScreen('Pawn Stats', panelX + 10, panelY + 22, {
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
const fillWidth = barWidth * (hunger.current / hunger.max);
const hungerColor = hunger.current > 70 ? '#e94560' : hunger.current > 40 ? '#ffdd57' : '#4ade80';
engine.renderer.drawRectScreen(barX, barY, fillWidth, barHeight, hungerColor);

// Hunger value
engine.renderer.drawTextScreen(
  `${Math.round(hunger.current)}/${hunger.max}`,
  barX + barWidth + 5,
  barY + 11,
  { font: '11px monospace', color: '#888888' }
);
```

**Step 2: Commit**

```bash
git add packages/colony/src/main.ts
git commit -m "feat(colony): show current task in stats panel"
```

---

## Task 16: Add debug overlay with F3 toggle

**Files:**
- Modify: `packages/colony/src/main.ts`

**Step 1: Add debug mode variable**

After the imports, add:

```typescript
let debugMode = true; // On by default in dev
```

**Step 2: Add F3 toggle in CameraControl system**

In the CameraControl system, add:

```typescript
if (input.isKeyPressed('F3')) {
  debugMode = !debugMode;
}
```

**Step 3: Add debug overlay to render loop**

After the stats panel in the render loop, add:

```typescript
// Debug overlay (F3 toggle)
if (debugMode) {
  const context = createActionContext();
  const scores = engine.ai.evaluateAll(pawn, context);
  const currentTask = engine.ecs.getComponent<{ action: string }>(pawn, 'CurrentTask');

  const debugX = 10;
  const debugY = canvas.height - 220;
  const debugWidth = 160;
  const debugHeight = 100;

  engine.renderer.drawRectScreen(debugX, debugY, debugWidth, debugHeight, 'rgba(26, 26, 46, 0.9)');
  engine.renderer.drawTextScreen('AI Debug (F3)', debugX + 10, debugY + 22, {
    font: '14px monospace',
    color: '#ffffff',
  });

  let yOffset = 42;
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

**Step 4: Update instructions text**

Update the instructions line:

```typescript
// Instructions (top-left)
const instructions = debugMode
  ? 'Autonomous mode | +/-: Zoom | F3: Debug'
  : 'Autonomous mode | +/-: Zoom | F3: Debug';
engine.renderer.drawTextScreen(instructions, 10, 30, { color: '#888' });
```

**Step 5: Commit**

```bash
git add packages/colony/src/main.ts
git commit -m "feat(colony): add debug overlay with F3 toggle"
```

---

## Task 17: Update console log message

**Files:**
- Modify: `packages/colony/src/main.ts`

**Step 1: Update console log**

Change:

```typescript
console.log('Colony - Built with Emergence Engine (Phase 4: A Pawn Lives)');
```

To:

```typescript
console.log('Colony - Built with Emergence Engine (Phase 5: Pawn Thinks)');
```

**Step 2: Commit**

```bash
git add packages/colony/src/main.ts
git commit -m "chore(colony): update console log to Phase 5"
```

---

## Task 18: Manual testing and verification

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Verify behavior**

Check:
- [ ] Pawn wanders when hunger is low
- [ ] Pawn seeks food when hunger reaches 50%
- [ ] Pawn eats food (food disappears, hunger decreases)
- [ ] Stats panel shows current task (Eating, Wandering, Idle)
- [ ] Debug overlay shows action scores (visible by default)
- [ ] F3 toggles debug overlay
- [ ] Pawn continues functioning until food runs out

**Step 3: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 4: Commit any fixes if needed**

---

## Task 19: Final commit and summary

**Step 1: Verify clean state**

Run: `git status`
Expected: Clean working directory

**Step 2: Review commits**

Run: `git log --oneline -15`

Expected commits (newest first):
- chore(colony): update console log to Phase 5
- feat(colony): add debug overlay with F3 toggle
- feat(colony): show current task in stats panel
- refactor(colony): simplify PathFollow, remove destination marker
- feat(colony): add TaskExecutionSystem for eating
- feat(colony): add AIDecisionSystem, remove ClickToMove
- feat(colony): define wander action
- feat(colony): define eat action
- feat(colony): add CurrentTask and AIState components
- feat(colony): add Food component and spawn food at world gen
- feat(engine): add findNearest helper for spatial queries
- feat(engine): expose ai property with ActionRegistry
- feat(ai): add execute method to run action
- feat(ai): add pickBest to select highest-scoring action
- feat(ai): add evaluateAll to score all actions
- feat(ai): add ActionRegistry with defineAction

---

## Summary

Phase 5 implementation complete. The pawn now:
1. Evaluates actions (eat, wander) based on hunger and availability
2. Picks the highest-scoring action
3. Executes actions by setting components (PathTarget, CurrentTask)
4. Eats food when arrived (reduces hunger, destroys food)
5. Re-evaluates when tasks complete or hunger crosses 50%

The engine now provides:
- `ActionRegistry` for defining, scoring, and executing actions
- `engine.findNearest()` for spatial queries
- `engine.ai` as the entry point for utility AI
