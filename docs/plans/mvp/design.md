# Emergence Engine: Design Document

## Vision

A web-based 2D game engine for simulation games. Code-first, browser-native, minimal by design.

**Philosophy:** Why use heavy engines when you only need so much? Emergence provides the skeleton for tile-based simulation games — ECS, rendering, input, world management, and utility AI — without the bloat.

**License:** GPL. The engine stays free forever.

**Distribution:** Standalone engine repo. Others clone it and build their own games. We build Colony (a RimWorld-like faction sim) as proof it works.

---

## Target Game: Colony

A 2D top-down emergent faction simulation.

- Generated world with multiple colonies
- Your colony is one of many — others are simulated too
- Full simulation nearby, abstract simulation for distant colonies
- Utility AI: pawns decide what to do based on needs and context
- Faction interactions: trade, diplomacy, war, migration, shared threats, cultural spread
- Sandbox survival: no win condition, lose when colony dies

The engine and game co-evolve. The game tells us what the engine needs.

---

## Tech Stack

- **TypeScript** — Type safety, better tooling
- **Canvas 2D** — Simple, fast enough for 2D tiles
- **Vanilla first** — Libraries only when we hit friction
- **Vite** — Dev server and bundling

---

## Architecture

### Repository Structure

Two repos:

```
emergence-engine/           # The engine (this repo)
├── src/
│   ├── core/              # Game loop, time, events
│   ├── ecs/               # Entity-Component-System
│   ├── render/            # Canvas 2D renderer
│   ├── input/             # Keyboard, mouse, touch
│   ├── world/             # Chunks, tiles, spatial queries
│   ├── ai/                # Utility AI framework
│   └── index.ts           # Public API
├── examples/              # Minimal example games
├── docs/
├── package.json
├── LICENSE
└── README.md

colony/                    # The game (separate repo)
├── src/
│   ├── components/
│   ├── systems/
│   ├── content/
│   └── main.ts
└── package.json           # depends on emergence-engine
```

### Core Pattern: Entity-Component-System

- **Entities:** Just IDs. No data, no methods.
- **Components:** Pure data, attached to entities.
- **Systems:** Logic that runs on entities matching component queries.

```typescript
const pawn = engine.ecs.createEntity();
engine.ecs.addComponent(pawn, 'Position', { x: 10, y: 5 });
engine.ecs.addComponent(pawn, 'Hunger', { current: 0, max: 100 });

engine.ecs.addSystem({
  name: 'HungerSystem',
  query: ['Hunger'],
  update(entities, dt) {
    for (const e of entities) {
      const hunger = engine.ecs.get(e, 'Hunger');
      hunger.current += dt * 0.1;  // Get hungrier over time
    }
  }
});
```

---

## Engine API

### Engine Creation

```typescript
import { createEngine } from 'emergence-engine';

const engine = createEngine({
  canvas: document.getElementById('game'),
  tickRate: 20,
  world: {
    chunkSize: 32,
    tileSize: 16
  }
});

engine.start();
```

### ECS

```typescript
// Define components
engine.ecs.defineComponent('Position', { x: 0, y: 0 });
engine.ecs.defineComponent('Velocity', { x: 0, y: 0 });

// Create entities
const entity = engine.ecs.createEntity();
engine.ecs.addComponent(entity, 'Position', { x: 100, y: 100 });

// Query and modify
const pos = engine.ecs.get(entity, 'Position');
pos.x += 10;

// Systems
engine.ecs.addSystem({
  name: 'Movement',
  query: ['Position', 'Velocity'],
  update(entities, dt) { ... }
});
```

### Renderer

```typescript
const renderer = engine.renderer;

// Camera
renderer.camera.follow(entity);
renderer.camera.pan(dx, dy);
renderer.camera.zoom(1.5);
renderer.camera.worldToScreen(x, y);
renderer.camera.screenToWorld(x, y);

// Drawing (low-level, rarely needed)
renderer.clear('#1a1a2e');
renderer.drawRect(x, y, w, h, color);
renderer.drawSprite(texture, x, y, w, h);
renderer.drawText('Hello', x, y, { font: '16px mono', color: '#fff' });

// Assets
await engine.assets.load('pawn.png');
```

### World

```typescript
const world = engine.world;

// Define terrain
world.defineTerrain('grass', { walkable: true, color: '#3a5a40' });
world.defineTerrain('water', { walkable: false, color: '#1d3557' });

// Set/get tiles
world.setTile(10, 20, 'grass');
const terrain = world.getTerrain(10, 20);
const walkable = world.isWalkable(10, 20);

// Chunk events
engine.on('chunkLoad', (cx, cy) => { /* generate content */ });
engine.on('chunkUnload', (cx, cy) => { /* save state */ });
```

### Input

```typescript
const input = engine.input;

// Polling
input.isKeyDown('ArrowUp');
input.isKeyPressed('Space');      // Just pressed this tick
input.isMouseDown('left');

// Positions
input.mouse;        // Screen coordinates
input.mouseWorld;   // World coordinates
input.mouseTile;    // Tile coordinates

// Action mapping
input.defineAction('move_up', ['ArrowUp', 'KeyW']);
input.isActionPressed('move_up');

// Events
input.on('click', (button, x, y) => { ... });
input.on('wheel', (delta) => { ... });
```

### Utility AI

```typescript
const ai = engine.ai;

// Define actions
ai.defineAction('eat', {
  canExecute(entity, world) {
    const hunger = engine.ecs.get(entity, 'Hunger');
    const food = world.findNearby(entity, 'Food', 5);
    return hunger && food.length > 0;
  },
  score(entity, world) {
    const hunger = engine.ecs.get(entity, 'Hunger');
    return hunger.current / hunger.max;
  },
  execute(entity, world) {
    const food = world.findNearest(entity, 'Food');
    // Set goal to go eat
  }
});

// Pick best action for entity
const action = ai.pickBest(entity);
action.execute(entity, world);

// Debug: see all scores
const scores = ai.evaluateAll(entity);
```

### Game Loop

```typescript
// Fixed timestep simulation, variable rendering
// Configured via tickRate at engine creation

engine.setSpeed(2);   // 2x speed
engine.setSpeed(0);   // Paused

// Hooks
engine.on('tick', (dt) => { });   // Every simulation tick
engine.on('draw', () => { });     // Every render frame
engine.on('init', () => { });     // Once at start
```

---

## MVP Roadmap

### Phase 1: Proof of Life
- Project setup: TypeScript, Vite, Canvas
- Game loop (fixed timestep)
- Renderer: clear screen, draw rectangles
- Sprite that moves with arrow keys

### Phase 2: ECS Foundation
- Entity creation/deletion
- Component registry
- System runner with queries
- Refactor Phase 1 to use ECS

### Phase 3: World Exists
- Chunk and tile data structures
- Tile renderer
- Camera: pan and zoom
- Random map generation

### Phase 4: A Pawn Lives
- Pawn entity with Position, Sprite, Hunger
- Click-to-move input
- Pathfinding (A*)
- Hunger increases over time

### Phase 5: Pawn Thinks
- Utility AI framework
- Actions: eat, wander
- Food items on map
- Pawn keeps itself alive

### Phase 6: Two Colonies
- Faction component
- Second AI colony
- Colonies own map regions
- Trade caravan between colonies

**MVP Complete:** Two colonies, pawns with needs, utility AI, trade interaction.

---

## Future (Post-MVP)

- Raiding and combat
- More needs (rest, social, shelter)
- Relationships between pawns
- Distant colony abstraction
- Save/load
- Browser-based editor
- WebGPU renderer option
- Sound and music

---

## Principles

1. **YAGNI** — Don't build it until you need it
2. **Game drives engine** — The game tells us what to build
3. **Simple over clever** — Readable code beats elegant code
4. **Ron test** — Can someone clone this and build their own game?
