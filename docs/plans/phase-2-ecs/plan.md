# Phase 2: ECS Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Entity-Component-System to Emergence Engine with entity lifecycle, component storage, and system runner.

**Architecture:** World class manages entities (packed ID + generation), components (sparse arrays per type), and systems (registration-order execution). Engine exposes `engine.ecs` and auto-runs systems each tick.

**Tech Stack:** TypeScript, Vitest

---

## Task 1: Entity Lifecycle

**Files:**
- Create: `src/engine/ecs/World.ts`
- Create: `src/engine/ecs/World.test.ts`

### Step 1: Write failing test for createEntity

Create `src/engine/ecs/World.test.ts`:

```typescript
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
import { World } from './World';

describe('World', () => {
  describe('entity lifecycle', () => {
    it('should create entities with unique IDs', () => {
      const world = new World();
      const e1 = world.createEntity();
      const e2 = world.createEntity();

      expect(e1).not.toBe(e2);
    });
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm test -- src/engine/ecs/World.test.ts`
Expected: FAIL - Cannot find module './World'

### Step 3: Write minimal World with createEntity

Create `src/engine/ecs/World.ts`:

```typescript
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

/** Entity is a packed 32-bit integer: lower 20 bits = index, upper 12 bits = generation */
export type Entity = number;

function entityIndex(e: Entity): number {
  return e & 0xfffff;
}

function entityGeneration(e: Entity): number {
  return e >>> 20;
}

function makeEntity(index: number, gen: number): Entity {
  return (gen << 20) | index;
}

export class World {
  private generations: number[] = [];
  private alive: boolean[] = [];
  private freeList: number[] = [];

  createEntity(): Entity {
    const index = this.freeList.pop() ?? this.generations.length;
    if (index === this.generations.length) {
      this.generations.push(0);
      this.alive.push(false);
    }
    this.alive[index] = true;
    return makeEntity(index, this.generations[index]);
  }
}
```

### Step 4: Run test to verify it passes

Run: `npm test -- src/engine/ecs/World.test.ts`
Expected: PASS

### Step 5: Write failing test for isAlive

Add to `src/engine/ecs/World.test.ts` inside the 'entity lifecycle' describe block:

```typescript
    it('should report created entities as alive', () => {
      const world = new World();
      const entity = world.createEntity();

      expect(world.isAlive(entity)).toBe(true);
    });
```

### Step 6: Run test to verify it fails

Run: `npm test -- src/engine/ecs/World.test.ts`
Expected: FAIL - world.isAlive is not a function

### Step 7: Implement isAlive

Add to `World` class in `src/engine/ecs/World.ts`:

```typescript
  isAlive(entity: Entity): boolean {
    const index = entityIndex(entity);
    if (index >= this.alive.length) return false;
    return this.alive[index] && this.generations[index] === entityGeneration(entity);
  }
```

### Step 8: Run test to verify it passes

Run: `npm test -- src/engine/ecs/World.test.ts`
Expected: PASS

### Step 9: Write failing test for destroyEntity

Add to `src/engine/ecs/World.test.ts`:

```typescript
    it('should destroy entities', () => {
      const world = new World();
      const entity = world.createEntity();

      world.destroyEntity(entity);

      expect(world.isAlive(entity)).toBe(false);
    });
```

### Step 10: Run test to verify it fails

Run: `npm test -- src/engine/ecs/World.test.ts`
Expected: FAIL - world.destroyEntity is not a function

### Step 11: Implement destroyEntity

Add to `World` class in `src/engine/ecs/World.ts`:

```typescript
  destroyEntity(entity: Entity): void {
    const index = entityIndex(entity);
    if (!this.isAlive(entity)) return;
    this.alive[index] = false;
    this.generations[index]++;
    this.freeList.push(index);
  }
```

### Step 12: Run test to verify it passes

Run: `npm test -- src/engine/ecs/World.test.ts`
Expected: PASS

### Step 13: Write failing test for generation counter (stale reference protection)

Add to `src/engine/ecs/World.test.ts`:

```typescript
    it('should invalidate old entity references after reuse', () => {
      const world = new World();
      const e1 = world.createEntity();
      world.destroyEntity(e1);
      const e2 = world.createEntity();

      // e1 and e2 use same index but different generations
      expect(world.isAlive(e1)).toBe(false);
      expect(world.isAlive(e2)).toBe(true);
      expect(e1).not.toBe(e2);
    });
```

### Step 14: Run test to verify it passes

Run: `npm test -- src/engine/ecs/World.test.ts`
Expected: PASS (already implemented via generation counter)

### Step 15: Commit

```bash
git add src/engine/ecs/World.ts src/engine/ecs/World.test.ts
git commit -m "feat(ecs): add entity lifecycle with generation counters

Implements createEntity, destroyEntity, isAlive with stale reference
protection via packed entity IDs (20-bit index + 12-bit generation).

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Component Storage

**Files:**
- Modify: `src/engine/ecs/World.ts`
- Modify: `src/engine/ecs/World.test.ts`

### Step 1: Write failing test for defineComponent

Add new describe block to `src/engine/ecs/World.test.ts`:

```typescript
  describe('components', () => {
    it('should define components', () => {
      const world = new World();

      // Should not throw
      world.defineComponent('Position', { x: 0, y: 0 });
    });

    it('should throw when defining duplicate component', () => {
      const world = new World();
      world.defineComponent('Position', { x: 0, y: 0 });

      expect(() => world.defineComponent('Position', { x: 0, y: 0 })).toThrow(
        'Component "Position" already defined'
      );
    });
  });
```

### Step 2: Run test to verify it fails

Run: `npm test -- src/engine/ecs/World.test.ts`
Expected: FAIL - world.defineComponent is not a function

### Step 3: Implement defineComponent

Add to `src/engine/ecs/World.ts` at class level:

```typescript
interface ComponentDefinition<T = unknown> {
  name: string;
  defaults: T;
  storage: (T | undefined)[];
}
```

Add to `World` class:

```typescript
  private components = new Map<string, ComponentDefinition>();

  defineComponent<T extends object>(name: string, defaults: T): void {
    if (this.components.has(name)) {
      throw new Error(`Component "${name}" already defined`);
    }
    this.components.set(name, { name, defaults, storage: [] });
  }
```

### Step 4: Run test to verify it passes

Run: `npm test -- src/engine/ecs/World.test.ts`
Expected: PASS

### Step 5: Write failing test for addComponent

Add to the 'components' describe block:

```typescript
    it('should add components to entities', () => {
      const world = new World();
      world.defineComponent('Position', { x: 0, y: 0 });
      const entity = world.createEntity();

      const pos = world.addComponent(entity, 'Position', { x: 10, y: 20 });

      expect(pos).toEqual({ x: 10, y: 20 });
    });

    it('should merge partial data with defaults', () => {
      const world = new World();
      world.defineComponent('Position', { x: 0, y: 0 });
      const entity = world.createEntity();

      const pos = world.addComponent(entity, 'Position', { x: 10 });

      expect(pos).toEqual({ x: 10, y: 0 });
    });

    it('should use defaults when no data provided', () => {
      const world = new World();
      world.defineComponent('Position', { x: 5, y: 5 });
      const entity = world.createEntity();

      const pos = world.addComponent(entity, 'Position');

      expect(pos).toEqual({ x: 5, y: 5 });
    });
```

### Step 6: Run test to verify it fails

Run: `npm test -- src/engine/ecs/World.test.ts`
Expected: FAIL - world.addComponent is not a function

### Step 7: Implement addComponent

Add to `World` class:

```typescript
  addComponent<T extends object>(entity: Entity, name: string, data?: Partial<T>): T {
    if (!this.isAlive(entity)) {
      throw new Error('Cannot add component to dead entity');
    }
    const def = this.components.get(name);
    if (!def) {
      throw new Error(`Component "${name}" not defined`);
    }
    const index = entityIndex(entity);
    const component = { ...def.defaults, ...data } as T;
    def.storage[index] = component;
    return component;
  }
```

### Step 8: Run test to verify it passes

Run: `npm test -- src/engine/ecs/World.test.ts`
Expected: PASS

### Step 9: Write failing tests for addComponent error cases

Add to 'components' describe:

```typescript
    it('should throw when adding component to dead entity', () => {
      const world = new World();
      world.defineComponent('Position', { x: 0, y: 0 });
      const entity = world.createEntity();
      world.destroyEntity(entity);

      expect(() => world.addComponent(entity, 'Position')).toThrow(
        'Cannot add component to dead entity'
      );
    });

    it('should throw when adding undefined component', () => {
      const world = new World();
      const entity = world.createEntity();

      expect(() => world.addComponent(entity, 'Position')).toThrow(
        'Component "Position" not defined'
      );
    });
```

### Step 10: Run test to verify it passes

Run: `npm test -- src/engine/ecs/World.test.ts`
Expected: PASS (already implemented)

### Step 11: Write failing test for getComponent

Add to 'components' describe:

```typescript
    it('should get components from entities', () => {
      const world = new World();
      world.defineComponent('Position', { x: 0, y: 0 });
      const entity = world.createEntity();
      world.addComponent(entity, 'Position', { x: 10, y: 20 });

      const pos = world.getComponent(entity, 'Position');

      expect(pos).toEqual({ x: 10, y: 20 });
    });

    it('should return undefined for missing component', () => {
      const world = new World();
      world.defineComponent('Position', { x: 0, y: 0 });
      const entity = world.createEntity();

      const pos = world.getComponent(entity, 'Position');

      expect(pos).toBeUndefined();
    });

    it('should return undefined for dead entity', () => {
      const world = new World();
      world.defineComponent('Position', { x: 0, y: 0 });
      const entity = world.createEntity();
      world.addComponent(entity, 'Position', { x: 10, y: 20 });
      world.destroyEntity(entity);

      const pos = world.getComponent(entity, 'Position');

      expect(pos).toBeUndefined();
    });
```

### Step 12: Run test to verify it fails

Run: `npm test -- src/engine/ecs/World.test.ts`
Expected: FAIL - world.getComponent is not a function

### Step 13: Implement getComponent

Add to `World` class:

```typescript
  getComponent<T>(entity: Entity, name: string): T | undefined {
    if (!this.isAlive(entity)) return undefined;
    const def = this.components.get(name);
    return def?.storage[entityIndex(entity)] as T | undefined;
  }
```

### Step 14: Run test to verify it passes

Run: `npm test -- src/engine/ecs/World.test.ts`
Expected: PASS

### Step 15: Write failing test for hasComponent

Add to 'components' describe:

```typescript
    it('should check if entity has component', () => {
      const world = new World();
      world.defineComponent('Position', { x: 0, y: 0 });
      const entity = world.createEntity();

      expect(world.hasComponent(entity, 'Position')).toBe(false);

      world.addComponent(entity, 'Position');

      expect(world.hasComponent(entity, 'Position')).toBe(true);
    });
```

### Step 16: Run test to verify it fails

Run: `npm test -- src/engine/ecs/World.test.ts`
Expected: FAIL - world.hasComponent is not a function

### Step 17: Implement hasComponent

Add to `World` class:

```typescript
  hasComponent(entity: Entity, name: string): boolean {
    if (!this.isAlive(entity)) return false;
    const def = this.components.get(name);
    return def?.storage[entityIndex(entity)] !== undefined;
  }
```

### Step 18: Run test to verify it passes

Run: `npm test -- src/engine/ecs/World.test.ts`
Expected: PASS

### Step 19: Write failing test for removeComponent

Add to 'components' describe:

```typescript
    it('should remove components from entities', () => {
      const world = new World();
      world.defineComponent('Position', { x: 0, y: 0 });
      const entity = world.createEntity();
      world.addComponent(entity, 'Position', { x: 10, y: 20 });

      world.removeComponent(entity, 'Position');

      expect(world.hasComponent(entity, 'Position')).toBe(false);
    });
```

### Step 20: Run test to verify it fails

Run: `npm test -- src/engine/ecs/World.test.ts`
Expected: FAIL - world.removeComponent is not a function

### Step 21: Implement removeComponent

Add to `World` class:

```typescript
  removeComponent(entity: Entity, name: string): void {
    if (!this.isAlive(entity)) return;
    const def = this.components.get(name);
    if (def) {
      def.storage[entityIndex(entity)] = undefined;
    }
  }
```

### Step 22: Run test to verify it passes

Run: `npm test -- src/engine/ecs/World.test.ts`
Expected: PASS

### Step 23: Write test for destroyEntity removing components

Add to 'entity lifecycle' describe:

```typescript
    it('should remove all components when entity is destroyed', () => {
      const world = new World();
      world.defineComponent('Position', { x: 0, y: 0 });
      world.defineComponent('Velocity', { x: 0, y: 0 });
      const entity = world.createEntity();
      world.addComponent(entity, 'Position');
      world.addComponent(entity, 'Velocity');

      world.destroyEntity(entity);

      // Create new entity to reuse the slot
      const e2 = world.createEntity();
      expect(world.hasComponent(e2, 'Position')).toBe(false);
      expect(world.hasComponent(e2, 'Velocity')).toBe(false);
    });
```

### Step 24: Run test to verify it fails

Run: `npm test -- src/engine/ecs/World.test.ts`
Expected: FAIL - new entity still has old components

### Step 25: Update destroyEntity to remove components

Update `destroyEntity` in `src/engine/ecs/World.ts`:

```typescript
  destroyEntity(entity: Entity): void {
    const index = entityIndex(entity);
    if (!this.isAlive(entity)) return;
    // Remove all components
    for (const def of this.components.values()) {
      def.storage[index] = undefined;
    }
    this.alive[index] = false;
    this.generations[index]++;
    this.freeList.push(index);
  }
```

### Step 26: Run test to verify it passes

Run: `npm test -- src/engine/ecs/World.test.ts`
Expected: PASS

### Step 27: Commit

```bash
git add src/engine/ecs/World.ts src/engine/ecs/World.test.ts
git commit -m "feat(ecs): add component storage with sparse arrays

Implements defineComponent, addComponent, getComponent, hasComponent,
removeComponent. Components merge partial data with defaults.
destroyEntity clears all components.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: System Runner

**Files:**
- Modify: `src/engine/ecs/World.ts`
- Modify: `src/engine/ecs/World.test.ts`

### Step 1: Write failing test for query

Add new describe block to `src/engine/ecs/World.test.ts`:

```typescript
  describe('queries', () => {
    it('should query entities with matching components', () => {
      const world = new World();
      world.defineComponent('Position', { x: 0, y: 0 });
      world.defineComponent('Velocity', { x: 0, y: 0 });

      const e1 = world.createEntity();
      world.addComponent(e1, 'Position');
      world.addComponent(e1, 'Velocity');

      const e2 = world.createEntity();
      world.addComponent(e2, 'Position');

      const e3 = world.createEntity();
      world.addComponent(e3, 'Velocity');

      const withBoth = world.query(['Position', 'Velocity']);
      const withPos = world.query(['Position']);
      const withVel = world.query(['Velocity']);

      expect(withBoth).toEqual([e1]);
      expect(withPos).toContain(e1);
      expect(withPos).toContain(e2);
      expect(withPos).toHaveLength(2);
      expect(withVel).toContain(e1);
      expect(withVel).toContain(e3);
      expect(withVel).toHaveLength(2);
    });

    it('should return empty array when no entities match', () => {
      const world = new World();
      world.defineComponent('Position', { x: 0, y: 0 });

      const result = world.query(['Position']);

      expect(result).toEqual([]);
    });

    it('should exclude dead entities from queries', () => {
      const world = new World();
      world.defineComponent('Position', { x: 0, y: 0 });

      const e1 = world.createEntity();
      world.addComponent(e1, 'Position');
      world.destroyEntity(e1);

      const result = world.query(['Position']);

      expect(result).toEqual([]);
    });
  });
```

### Step 2: Run test to verify it fails

Run: `npm test -- src/engine/ecs/World.test.ts`
Expected: FAIL - world.query is not a function

### Step 3: Implement query

Add to `World` class:

```typescript
  query(componentNames: string[]): Entity[] {
    const result: Entity[] = [];
    for (let index = 0; index < this.alive.length; index++) {
      if (!this.alive[index]) continue;
      const entity = makeEntity(index, this.generations[index]);
      let hasAll = true;
      for (const name of componentNames) {
        if (!this.hasComponent(entity, name)) {
          hasAll = false;
          break;
        }
      }
      if (hasAll) result.push(entity);
    }
    return result;
  }
```

### Step 4: Run test to verify it passes

Run: `npm test -- src/engine/ecs/World.test.ts`
Expected: PASS

### Step 5: Write failing test for addSystem and update

Add new describe block:

```typescript
  describe('systems', () => {
    it('should run systems in registration order', () => {
      const world = new World();
      world.defineComponent('Counter', { value: 0 });
      const entity = world.createEntity();
      world.addComponent(entity, 'Counter');

      const order: string[] = [];

      world.addSystem({
        name: 'First',
        query: ['Counter'],
        update() {
          order.push('first');
        },
      });

      world.addSystem({
        name: 'Second',
        query: ['Counter'],
        update() {
          order.push('second');
        },
      });

      world.update(0.016);

      expect(order).toEqual(['first', 'second']);
    });

    it('should pass matching entities and dt to systems', () => {
      const world = new World();
      world.defineComponent('Position', { x: 0, y: 0 });
      world.defineComponent('Velocity', { x: 1, y: 1 });

      const e1 = world.createEntity();
      world.addComponent(e1, 'Position');
      world.addComponent(e1, 'Velocity');

      const e2 = world.createEntity();
      world.addComponent(e2, 'Position');

      let receivedEntities: Entity[] = [];
      let receivedDt = 0;

      world.addSystem({
        name: 'Movement',
        query: ['Position', 'Velocity'],
        update(entities, dt) {
          receivedEntities = entities;
          receivedDt = dt;
        },
      });

      world.update(0.05);

      expect(receivedEntities).toEqual([e1]);
      expect(receivedDt).toBe(0.05);
    });
  });
```

### Step 6: Run test to verify it fails

Run: `npm test -- src/engine/ecs/World.test.ts`
Expected: FAIL - world.addSystem is not a function

### Step 7: Implement System interface, addSystem, and update

Add to `src/engine/ecs/World.ts` before the World class:

```typescript
export interface System {
  name: string;
  query: string[];
  update(entities: Entity[], dt: number): void;
}
```

Add to `World` class:

```typescript
  private systems: System[] = [];

  addSystem(system: System): void {
    this.systems.push(system);
  }

  update(dt: number): void {
    for (const system of this.systems) {
      const entities = this.query(system.query);
      system.update(entities, dt);
    }
  }
```

### Step 8: Run test to verify it passes

Run: `npm test -- src/engine/ecs/World.test.ts`
Expected: PASS

### Step 9: Write failing test for removeSystem

Add to 'systems' describe:

```typescript
    it('should remove systems by name', () => {
      const world = new World();
      world.defineComponent('Counter', { value: 0 });
      const entity = world.createEntity();
      world.addComponent(entity, 'Counter');

      let called = false;
      world.addSystem({
        name: 'Test',
        query: ['Counter'],
        update() {
          called = true;
        },
      });

      world.removeSystem('Test');
      world.update(0.016);

      expect(called).toBe(false);
    });
```

### Step 10: Run test to verify it fails

Run: `npm test -- src/engine/ecs/World.test.ts`
Expected: FAIL - world.removeSystem is not a function

### Step 11: Implement removeSystem

Add to `World` class:

```typescript
  removeSystem(name: string): void {
    const index = this.systems.findIndex((s) => s.name === name);
    if (index !== -1) {
      this.systems.splice(index, 1);
    }
  }
```

### Step 12: Run test to verify it passes

Run: `npm test -- src/engine/ecs/World.test.ts`
Expected: PASS

### Step 13: Write integration test - system modifies components

Add to 'systems' describe:

```typescript
    it('should allow systems to modify components', () => {
      const world = new World();
      world.defineComponent('Position', { x: 0, y: 0 });
      world.defineComponent('Velocity', { x: 10, y: 5 });

      const entity = world.createEntity();
      world.addComponent(entity, 'Position', { x: 0, y: 0 });
      world.addComponent(entity, 'Velocity', { x: 10, y: 5 });

      world.addSystem({
        name: 'Movement',
        query: ['Position', 'Velocity'],
        update(entities, dt) {
          for (const e of entities) {
            const pos = world.getComponent<{ x: number; y: number }>(e, 'Position')!;
            const vel = world.getComponent<{ x: number; y: number }>(e, 'Velocity')!;
            pos.x += vel.x * dt;
            pos.y += vel.y * dt;
          }
        },
      });

      world.update(1); // 1 second

      const pos = world.getComponent<{ x: number; y: number }>(entity, 'Position');
      expect(pos).toEqual({ x: 10, y: 5 });
    });
```

### Step 14: Run test to verify it passes

Run: `npm test -- src/engine/ecs/World.test.ts`
Expected: PASS

### Step 15: Commit

```bash
git add src/engine/ecs/World.ts src/engine/ecs/World.test.ts
git commit -m "feat(ecs): add system runner with queries

Implements query, addSystem, removeSystem, update. Systems run in
registration order, receiving matching entities and delta time.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Engine Integration

**Files:**
- Modify: `src/engine/Engine.ts`
- Modify: `src/engine/Engine.test.ts`
- Modify: `src/engine/index.ts`

### Step 1: Write failing test for engine.ecs

Add to `src/engine/Engine.test.ts` inside the 'Engine' describe:

```typescript
  it('should expose ecs World', () => {
    const engine = new Engine({ canvas });

    expect(engine.ecs).toBeDefined();
    expect(typeof engine.ecs.createEntity).toBe('function');
  });
```

### Step 2: Run test to verify it fails

Run: `npm test -- src/engine/Engine.test.ts`
Expected: FAIL - engine.ecs is undefined

### Step 3: Add ecs property to Engine

Update `src/engine/Engine.ts`:

Add import at top:
```typescript
import { World } from './ecs/World';
```

Add property declaration:
```typescript
  readonly ecs: World;
```

Add initialization in constructor (before the loop.onTick calls):
```typescript
    this.ecs = new World();
```

### Step 4: Run test to verify it passes

Run: `npm test -- src/engine/Engine.test.ts`
Expected: PASS

### Step 5: Write failing test for ECS auto-update

Add to `src/engine/Engine.test.ts`:

```typescript
  it('should auto-run ECS systems each tick', () => {
    const engine = new Engine({ canvas });

    engine.ecs.defineComponent('Counter', { value: 0 });
    const entity = engine.ecs.createEntity();
    engine.ecs.addComponent(entity, 'Counter');

    engine.ecs.addSystem({
      name: 'Increment',
      query: ['Counter'],
      update(entities) {
        for (const e of entities) {
          const counter = engine.ecs.getComponent<{ value: number }>(e, 'Counter')!;
          counter.value++;
        }
      },
    });

    // Simulate ticks
    let rafCallback: ((time: number) => void) | null = null;
    vi.stubGlobal('requestAnimationFrame', (cb: (time: number) => void) => {
      rafCallback = cb;
      return 1;
    });
    vi.stubGlobal('performance', { now: () => 0 });

    engine.start();

    // Advance time enough for two ticks (100ms for 20 ticks/sec)
    vi.stubGlobal('performance', { now: () => 100 });
    if (rafCallback) rafCallback(100);

    const counter = engine.ecs.getComponent<{ value: number }>(entity, 'Counter');
    expect(counter!.value).toBe(2);
  });
```

### Step 6: Run test to verify it fails

Run: `npm test -- src/engine/Engine.test.ts`
Expected: FAIL - counter.value is 0

### Step 7: Add ECS update to game loop

Update `src/engine/Engine.ts` constructor. Replace the existing onTick callback with:

```typescript
    // Run ECS systems each tick
    this.loop.onTick((dt) => {
      this.ecs.update(dt);
    });

    // Auto-update input at end of each tick
    this.loop.onTick(() => {
      this.input.update();
    });
```

### Step 8: Run test to verify it passes

Run: `npm test -- src/engine/Engine.test.ts`
Expected: PASS

### Step 9: Update public exports

Update `src/engine/index.ts` to add:

```typescript
export { World } from './ecs/World';
export type { Entity, System } from './ecs/World';
```

### Step 10: Run all tests

Run: `npm test`
Expected: All tests pass

### Step 11: Commit

```bash
git add src/engine/Engine.ts src/engine/Engine.test.ts src/engine/index.ts
git commit -m "feat(ecs): integrate World into Engine

Engine now exposes engine.ecs and auto-runs systems each tick before
input cleanup. Exports World, Entity, System from index.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Refactor Demo to Use ECS

**Files:**
- Modify: `src/main.ts`

### Step 1: Refactor main.ts to use ECS

Replace contents of `src/main.ts` with:

```typescript
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

import { Engine } from './engine';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const engine = new Engine({ canvas, tickRate: 20 });

// Define components
engine.ecs.defineComponent('Position', { x: 0, y: 0 });
engine.ecs.defineComponent('Velocity', { x: 0, y: 0 });
engine.ecs.defineComponent('PlayerControlled', {});
engine.ecs.defineComponent('Sprite', { width: 32, height: 32, color: '#e94560' });

// Create player entity
const player = engine.ecs.createEntity();
engine.ecs.addComponent(player, 'Position', { x: 400, y: 300 });
engine.ecs.addComponent(player, 'Velocity');
engine.ecs.addComponent(player, 'PlayerControlled');
engine.ecs.addComponent(player, 'Sprite');

// Input system: read keys, set velocity
engine.ecs.addSystem({
  name: 'PlayerInput',
  query: ['PlayerControlled', 'Velocity'],
  update(entities) {
    const speed = 200;
    for (const e of entities) {
      const vel = engine.ecs.getComponent<{ x: number; y: number }>(e, 'Velocity')!;
      vel.x = 0;
      vel.y = 0;
      if (engine.input.isKeyDown('ArrowUp') || engine.input.isKeyDown('KeyW')) vel.y = -speed;
      if (engine.input.isKeyDown('ArrowDown') || engine.input.isKeyDown('KeyS')) vel.y = speed;
      if (engine.input.isKeyDown('ArrowLeft') || engine.input.isKeyDown('KeyA')) vel.x = -speed;
      if (engine.input.isKeyDown('ArrowRight') || engine.input.isKeyDown('KeyD')) vel.x = speed;
    }
  },
});

// Movement system: apply velocity to position
engine.ecs.addSystem({
  name: 'Movement',
  query: ['Position', 'Velocity'],
  update(entities, dt) {
    for (const e of entities) {
      const pos = engine.ecs.getComponent<{ x: number; y: number }>(e, 'Position')!;
      const vel = engine.ecs.getComponent<{ x: number; y: number }>(e, 'Velocity')!;
      pos.x += vel.x * dt;
      pos.y += vel.y * dt;
    }
  },
});

// Bounds system: keep entities on screen
engine.ecs.addSystem({
  name: 'Bounds',
  query: ['Position', 'Sprite'],
  update(entities) {
    for (const e of entities) {
      const pos = engine.ecs.getComponent<{ x: number; y: number }>(e, 'Position')!;
      const sprite = engine.ecs.getComponent<{ width: number; height: number }>(e, 'Sprite')!;
      const halfW = sprite.width / 2;
      const halfH = sprite.height / 2;
      pos.x = Math.max(halfW, Math.min(engine.renderer.width - halfW, pos.x));
      pos.y = Math.max(halfH, Math.min(engine.renderer.height - halfH, pos.y));
    }
  },
});

// Render loop (runs every frame, not every tick)
engine.onDraw(() => {
  engine.renderer.clear();

  // Render all sprites
  for (const e of engine.ecs.query(['Position', 'Sprite'])) {
    const pos = engine.ecs.getComponent<{ x: number; y: number }>(e, 'Position')!;
    const sprite = engine.ecs.getComponent<{ width: number; height: number; color: string }>(
      e,
      'Sprite'
    )!;
    engine.renderer.drawRectCentered(pos.x, pos.y, sprite.width, sprite.height, sprite.color);
  }

  // UI text
  const pos = engine.ecs.getComponent<{ x: number; y: number }>(player, 'Position')!;
  engine.renderer.drawText('Use arrow keys or WASD to move', 10, 30, { color: '#666' });
  engine.renderer.drawText(`Position: (${Math.round(pos.x)}, ${Math.round(pos.y)})`, 10, 50, {
    color: '#666',
  });
});

engine.start();
console.log('Emergence Engine running with ECS...');
```

### Step 2: Run dev server to verify visually

Run: `npm run dev`
Expected: Opens browser, square moves with arrow keys/WASD, stays on screen

### Step 3: Run all tests

Run: `npm test`
Expected: All tests pass

### Step 4: Commit

```bash
git add src/main.ts
git commit -m "refactor(demo): convert to ECS architecture

Demo now uses entity-component-system pattern:
- Player is an entity with Position, Velocity, PlayerControlled, Sprite
- PlayerInput system reads keyboard, sets velocity
- Movement system applies velocity to position
- Bounds system keeps entities on screen
- Render loop queries entities with Position+Sprite

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Update Documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`

### Step 1: Update CLAUDE.md

Add to Architecture section in `CLAUDE.md`:

```markdown
│   ├── ecs/          # Entity-Component-System
```

Update the full tree to:

```markdown
## Architecture

```
src/
├── engine/           # Core engine (importable API)
│   ├── core/         # GameLoop (fixed timestep)
│   ├── ecs/          # Entity-Component-System
│   ├── input/        # Keyboard polling
│   ├── render/       # Canvas 2D primitives
│   ├── Engine.ts     # Unified entry point
│   └── index.ts      # Public exports
└── main.ts           # Demo application
```
```

### Step 2: Update README.md

Update the roadmap checkboxes:

```markdown
- [x] Phase 1: Proof of Life — Game loop, input, renderer
- [x] Phase 2: ECS Foundation — Entity-Component-System
```

Update the Features section to include:

```markdown
- **ECS** — Entity-Component-System with generational IDs
```

### Step 3: Commit

```bash
git add CLAUDE.md README.md
git commit -m "docs: update for Phase 2 ECS completion

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Final Verification

### Step 1: Run all tests with coverage

Run: `npm run test:coverage`
Expected: All tests pass, good coverage on World.ts

### Step 2: Run type check and build

Run: `npm run build`
Expected: No errors

### Step 3: Run dev server final check

Run: `npm run dev`
Expected: Demo works with ECS, square moves smoothly

### Step 4: Review git log

Run: `git log --oneline -10`
Expected: Clean commit history with descriptive messages

---

## Summary

**Tasks:**
1. Entity Lifecycle - createEntity, destroyEntity, isAlive with generation counters
2. Component Storage - defineComponent, addComponent, getComponent, hasComponent, removeComponent
3. System Runner - query, addSystem, removeSystem, update
4. Engine Integration - engine.ecs property, auto-run systems each tick
5. Refactor Demo - convert main.ts to ECS architecture
6. Update Documentation - CLAUDE.md, README.md
7. Final Verification - tests, build, manual check

**Files created:**
- `src/engine/ecs/World.ts`
- `src/engine/ecs/World.test.ts`

**Files modified:**
- `src/engine/Engine.ts`
- `src/engine/Engine.test.ts`
- `src/engine/index.ts`
- `src/main.ts`
- `CLAUDE.md`
- `README.md`
