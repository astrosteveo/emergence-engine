# Emergence Engine

A browser-native 2D game engine with an integrated visual editor for simulation games.

**This is a standalone engine.** Clone it, extend it, build your own games. The editor runs entirely in the browser—no downloads required. We're building [Colony](docs/plans/mvp/design.md#target-game-colony) (a RimWorld-like) to prove it works.

![Emergence Engine Demo](docs/screenshot.png)

## Features

- **Game Loop** — Fixed timestep simulation (20 ticks/sec) with variable rendering
- **ECS** — Entity-Component-System with generational entity IDs
- **Input** — Keyboard and mouse polling with press/release/held detection
- **Camera** — World-to-screen transforms, discrete zoom levels, viewport culling
- **TileMap** — Terrain and building layers with center-origin coordinates
- **Terrain Generation** — Simplex noise-based procedural generation
- **Pathfinding** — A* pathfinding with customizable walkability
- **Utility AI** — Action-based decision system for autonomous entities
- **Renderer** — Canvas 2D with world-space and screen-space drawing

## Quick Start

```bash
npm install
npm run dev
# Open http://localhost:5173
```

## Usage

```typescript
import { Engine, generateTerrain, Pathfinder, ActionRegistry } from 'emergence-engine';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const engine = new Engine({ canvas, tickRate: 20 });

// Define terrain types
engine.tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
engine.tileMap.defineTerrain('water', { color: '#1d3557', walkable: false });

// Generate world
generateTerrain(engine.tileMap, { width: 64, height: 64, seed: 12345 });

// Define components
engine.ecs.defineComponent('Position', { x: 0, y: 0 });
engine.ecs.defineComponent('Velocity', { x: 0, y: 0 });

// Create entities
const player = engine.ecs.createEntity();
engine.ecs.addComponent(player, 'Position', { x: 0, y: 0 });
engine.ecs.addComponent(player, 'Velocity');

// Add systems (run every tick automatically)
engine.ecs.addSystem({
  name: 'Movement',
  query: ['Position', 'Velocity'],
  update(entities, dt) {
    for (const e of entities) {
      const pos = engine.ecs.getComponent(e, 'Position');
      const vel = engine.ecs.getComponent(e, 'Velocity');
      pos.x += vel.x * dt;
      pos.y += vel.y * dt;
    }
  },
});

// Render loop
engine.onDraw(() => {
  engine.renderer.clear();
  engine.renderer.drawTileMap(engine.tileMap, 16);

  // Draw entities, UI, etc.
});

engine.start();
```

## API Overview

### Engine

```typescript
const engine = new Engine({ canvas, tickRate: 20 });

engine.ecs        // ECS World
engine.input      // Input system
engine.renderer   // Canvas renderer
engine.camera     // Camera (via renderer)
engine.tileMap    // Tile map
engine.ai         // Action registry (utility AI)

engine.start()           // Start game loop
engine.stop()            // Stop game loop
engine.setSpeed(2)       // 2x speed (0 = paused)
engine.onDraw(() => {})  // Render callback
```

### ECS

```typescript
engine.ecs.defineComponent('Health', { current: 100, max: 100 });

const entity = engine.ecs.createEntity();
engine.ecs.addComponent(entity, 'Health', { current: 50 });
engine.ecs.getComponent(entity, 'Health');  // { current: 50, max: 100 }
engine.ecs.hasComponent(entity, 'Health');  // true
engine.ecs.removeComponent(entity, 'Health');
engine.ecs.destroyEntity(entity);
engine.ecs.isAlive(entity);  // false (stale reference detection)

engine.ecs.addSystem({ name, query, update(entities, dt) {} });
engine.ecs.removeSystem('name');
engine.ecs.query(['Position', 'Velocity']);  // Manual queries
```

### Input

```typescript
// Keyboard
engine.input.isKeyDown('ArrowUp');     // Held this tick
engine.input.isKeyPressed('Space');    // Just pressed this tick
engine.input.isKeyReleased('Escape');  // Just released this tick

// Mouse
engine.input.mouseX;                   // Canvas-relative X position
engine.input.mouseY;                   // Canvas-relative Y position
engine.input.isMouseDown('left');      // 'left' | 'right' | 'middle'
engine.input.isMousePressed('left');   // Just clicked this tick
engine.input.isMouseReleased('left');  // Just released this tick
```

### Camera

```typescript
engine.camera.centerOn(x, y);          // Center camera on world position
engine.camera.pan(dx, dy);             // Pan camera
engine.camera.zoomIn();                // Discrete zoom: 1x → 2x → 4x
engine.camera.zoomOut();               // Discrete zoom: 4x → 2x → 1x
engine.camera.zoom;                    // Current zoom level

engine.camera.worldToScreen(x, y);     // Convert coordinates
engine.camera.screenToWorld(x, y);
engine.camera.worldToTile(x, y, tileSize);
engine.camera.screenToTile(x, y, tileSize);  // Mouse click to tile
engine.camera.getVisibleBounds(tileSize);    // For culling
```

### TileMap

```typescript
engine.tileMap.defineTerrain('stone', { color: '#666', walkable: true });
engine.tileMap.defineBuilding('wall', { color: '#333', solid: true });

engine.tileMap.create(64, 64, 'grass');  // Create map with default terrain
engine.tileMap.setTerrain(x, y, 'stone');
engine.tileMap.getTerrain(x, y);         // TerrainDef | undefined
engine.tileMap.setBuilding(x, y, 'wall');
engine.tileMap.clearBuilding(x, y);
engine.tileMap.isWalkable(x, y);         // Checks terrain + building
engine.tileMap.isInBounds(x, y);

// Note: (0,0) is map center, not top-left
```

### Pathfinder

```typescript
import { Pathfinder } from 'emergence-engine';

// Create with walkability function
const pathfinder = new Pathfinder((x, y) => engine.tileMap.isWalkable(x, y));

// Find path between tile coordinates
const path = pathfinder.findPath(fromX, fromY, toX, toY);
// Returns: PathNode[] | null (null if no path)

// With options
const pathfinder = new Pathfinder(isWalkable, { maxIterations: 1000 });
```

### Utility AI (ActionRegistry)

```typescript
// Define actions with canExecute, score, and execute
engine.ai.defineAction('eat', {
  canExecute(entity, ctx) {
    // Check if action is possible
    return ctx.ecs.hasComponent(entity, 'Hunger') &&
           ctx.findNearest(entity, 'Food') !== null;
  },
  score(entity, ctx) {
    // Return 0-1 priority score
    const hunger = ctx.ecs.getComponent(entity, 'Hunger');
    return hunger.value / 100;  // Higher hunger = higher priority
  },
  execute(entity, ctx) {
    // Perform the action
    const food = ctx.findNearest(entity, 'Food');
    // Set up task to move to and eat food...
  },
});

// Evaluate and pick best action for an entity
const actionContext = { ecs: engine.ecs, findNearest: engine.findNearest.bind(engine) };
const scores = engine.ai.evaluateAll(entity, actionContext);  // All scored actions
const best = engine.ai.pickBest(entity, actionContext);       // Highest scoring action name
engine.ai.execute(best, entity, actionContext);               // Run the action
```

### Renderer

```typescript
engine.renderer.clear('#1a1a2e');
engine.renderer.drawTileMap(tileMap, tileSize);

// World-space (affected by camera)
engine.renderer.drawRect(x, y, w, h, color);
engine.renderer.drawRectCentered(x, y, w, h, color);
engine.renderer.drawCircle(x, y, radius, color);

// Screen-space (fixed position, for UI)
engine.renderer.drawRectScreen(x, y, w, h, color);
engine.renderer.drawTextScreen(text, x, y, { font, color, align });
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Colony dev server |
| `npm run dev:editor` | Start Editor dev server |
| `npm run build` | Build all packages |
| `npm test` | Run tests |
| `npm run test:watch` | Tests in watch mode |
| `npm run test:coverage` | Tests with coverage report |

## Architecture

```
packages/
├── engine/                 # Emergence Engine (npm: emergence-engine)
│   └── src/
│       ├── core/           # GameLoop (fixed timestep)
│       ├── ecs/            # Entity-Component-System
│       ├── input/          # Keyboard + mouse polling
│       ├── render/         # Canvas 2D primitives + Camera
│       ├── world/          # TileMap, terrain generation
│       ├── ai/             # A* pathfinding, utility AI
│       ├── serialization/  # Save/load game state
│       ├── Engine.ts       # Unified entry point
│       └── index.ts        # Public exports
│
├── editor/                 # Browser-native visual editor (React + Vite)
│   └── src/
│       ├── components/     # UI components (Toolbar, Viewport, etc.)
│       ├── hooks/          # React hooks (useEditorContext)
│       └── main.tsx        # Entry point
│
└── colony/                 # Colony game (uses engine API)
    └── src/
        └── main.ts         # Game entry point
```

## Roadmap

- [x] Phase 1: Proof of Life — Game loop, input, renderer
- [x] Phase 2: ECS Foundation — Entity-Component-System
- [x] Phase 3: World — TileMap, Camera, terrain generation
- [x] Phase 4: A Pawn Lives — Click-to-move, pathfinding, hunger
- [x] Phase 5: Pawn Thinks — Utility AI, actions, autonomous behavior
- [x] Phase 6: Two Colonies — Factions, regions, caravan trade
- [x] Phase 7: Persistence & Editor Shell — Save/load, React editor UI
- [x] Phase 8: Tile Painting — Paint terrain/buildings with brush tools
- [x] Phase 9: Entity Placement — Place entities from templates, component inspector

## License

GPL-3.0 — See [LICENSE](LICENSE) for details.

The engine stays free forever. Build what you want.
