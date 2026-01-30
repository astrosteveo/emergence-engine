# Phase 2: ECS Foundation — Design Document

## Overview

Add an Entity-Component-System to Emergence Engine. Entities are IDs, components are data, systems are logic that queries entities by component.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Entity IDs | Sequential integers with recycling | Fast array lookups, memory efficient |
| Stale references | Generation counters | Prevents bugs from referencing deleted entities |
| Component storage | Sparse arrays per type | Cache-friendly iteration for systems |
| Component definitions | Registered with defaults | Convenient partial initialization |
| System ordering | Registration order | Simple, predictable, no magic numbers |
| Engine integration | `engine.ecs` property | Matches design doc, unified API |

---

## Entity Model

Entities are packed 32-bit integers: lower 20 bits = index, upper 12 bits = generation.

```typescript
type Entity = number;

function entityIndex(e: Entity): number { return e & 0xFFFFF; }
function entityGeneration(e: Entity): number { return e >>> 20; }
function makeEntity(index: number, gen: number): Entity { return (gen << 20) | index; }
```

Supports ~1 million concurrent entities with ~4096 reuses per slot before overflow.

### Lifecycle

```typescript
class World {
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

  destroyEntity(entity: Entity): void {
    const index = entityIndex(entity);
    if (!this.isAlive(entity)) return;
    this.alive[index] = false;
    this.generations[index]++;
    this.freeList.push(index);
    // Remove all components for this entity
  }

  isAlive(entity: Entity): boolean {
    const index = entityIndex(entity);
    return this.alive[index] &&
           this.generations[index] === entityGeneration(entity);
  }
}
```

---

## Component Storage

Each component type has a sparse array indexed by entity index:

```typescript
interface ComponentDefinition<T = unknown> {
  name: string;
  defaults: T;
  storage: (T | undefined)[];
}

class World {
  private components = new Map<string, ComponentDefinition>();

  defineComponent<T extends object>(name: string, defaults: T): void {
    if (this.components.has(name)) {
      throw new Error(`Component "${name}" already defined`);
    }
    this.components.set(name, { name, defaults, storage: [] });
  }

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

  getComponent<T>(entity: Entity, name: string): T | undefined {
    if (!this.isAlive(entity)) return undefined;
    const def = this.components.get(name);
    return def?.storage[entityIndex(entity)] as T | undefined;
  }

  hasComponent(entity: Entity, name: string): boolean {
    if (!this.isAlive(entity)) return false;
    const def = this.components.get(name);
    return def?.storage[entityIndex(entity)] !== undefined;
  }

  removeComponent(entity: Entity, name: string): void {
    if (!this.isAlive(entity)) return;
    const def = this.components.get(name);
    if (def) {
      def.storage[entityIndex(entity)] = undefined;
    }
  }
}
```

---

## System Runner

Systems declare required components. Runner iterates matching entities:

```typescript
interface System {
  name: string;
  query: string[];
  update(entities: Entity[], dt: number): void;
}

class World {
  private systems: System[] = [];

  addSystem(system: System): void {
    this.systems.push(system);
  }

  removeSystem(name: string): void {
    const index = this.systems.findIndex(s => s.name === name);
    if (index !== -1) {
      this.systems.splice(index, 1);
    }
  }

  update(dt: number): void {
    for (const system of this.systems) {
      const entities = this.query(system.query);
      system.update(entities, dt);
    }
  }

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
}
```

---

## Engine Integration

Add `ecs` property to Engine, auto-run systems each tick:

```typescript
import { World } from './ecs/World';

export class Engine {
  readonly ecs: World;

  constructor(config: EngineConfig) {
    // ... existing setup ...
    this.ecs = new World();

    this.loop.onTick((dt) => {
      this.ecs.update(dt);
    });
    this.loop.onTick(() => {
      this.input.update();
    });
  }
}
```

---

## Refactored Demo

```typescript
import { Engine } from './engine';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const engine = new Engine({ canvas, tickRate: 20 });

// Define components
engine.ecs.defineComponent('Position', { x: 0, y: 0 });
engine.ecs.defineComponent('Velocity', { x: 0, y: 0 });
engine.ecs.defineComponent('PlayerControlled', {});
engine.ecs.defineComponent('Sprite', { width: 32, height: 32, color: '#e94560' });

// Create player
const player = engine.ecs.createEntity();
engine.ecs.addComponent(player, 'Position', { x: 400, y: 300 });
engine.ecs.addComponent(player, 'Velocity');
engine.ecs.addComponent(player, 'PlayerControlled');
engine.ecs.addComponent(player, 'Sprite');

// Input system
engine.ecs.addSystem({
  name: 'PlayerInput',
  query: ['PlayerControlled', 'Velocity'],
  update(entities) {
    const speed = 200;
    for (const e of entities) {
      const vel = engine.ecs.getComponent(e, 'Velocity')!;
      vel.x = 0;
      vel.y = 0;
      if (engine.input.isKeyDown('ArrowUp') || engine.input.isKeyDown('KeyW')) vel.y = -speed;
      if (engine.input.isKeyDown('ArrowDown') || engine.input.isKeyDown('KeyS')) vel.y = speed;
      if (engine.input.isKeyDown('ArrowLeft') || engine.input.isKeyDown('KeyA')) vel.x = -speed;
      if (engine.input.isKeyDown('ArrowRight') || engine.input.isKeyDown('KeyD')) vel.x = speed;
    }
  }
});

// Movement system
engine.ecs.addSystem({
  name: 'Movement',
  query: ['Position', 'Velocity'],
  update(entities, dt) {
    for (const e of entities) {
      const pos = engine.ecs.getComponent(e, 'Position')!;
      const vel = engine.ecs.getComponent(e, 'Velocity')!;
      pos.x += vel.x * dt;
      pos.y += vel.y * dt;
    }
  }
});

// Render (in draw callback, not ECS)
engine.onDraw(() => {
  engine.renderer.clear();
  for (const e of engine.ecs.query(['Position', 'Sprite'])) {
    const pos = engine.ecs.getComponent(e, 'Position')!;
    const sprite = engine.ecs.getComponent(e, 'Sprite')!;
    engine.renderer.drawRectCentered(pos.x, pos.y, sprite.width, sprite.height, sprite.color);
  }
});

engine.start();
```

---

## File Structure

```
src/engine/
├── ecs/
│   ├── World.ts          # Entity, component, system management
│   └── World.test.ts     # Unit tests
├── Engine.ts             # Modified: add ecs property
├── Engine.test.ts        # Modified: test ECS integration
└── index.ts              # Modified: export World, Entity, System
src/
└── main.ts               # Refactored to use ECS
```

---

## Public API

```typescript
// Types
type Entity = number;

interface System {
  name: string;
  query: string[];
  update(entities: Entity[], dt: number): void;
}

// World methods
world.createEntity(): Entity
world.destroyEntity(entity: Entity): void
world.isAlive(entity: Entity): boolean

world.defineComponent<T>(name: string, defaults: T): void
world.addComponent<T>(entity: Entity, name: string, data?: Partial<T>): T
world.getComponent<T>(entity: Entity, name: string): T | undefined
world.hasComponent(entity: Entity, name: string): boolean
world.removeComponent(entity: Entity, name: string): void

world.addSystem(system: System): void
world.removeSystem(name: string): void
world.update(dt: number): void
world.query(componentNames: string[]): Entity[]
```
