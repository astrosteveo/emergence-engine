# Emergence Engine

**Browser-native 2D game engine** with integrated editor for simulation games. TypeScript + Vite + Canvas 2D.

Monorepo containing:
- `packages/engine/` - Emergence Engine (the product)
- `packages/colony/` - Colony game (built with the engine, proves it works)

## Project Docs

- `docs/PRD.md` - Product vision and milestones (living document)
- `docs/plans/mvp/design.md` - Architecture and API design
- `docs/plans/phase-N-*/` - Individual phase designs and plans

## Current Status

Phases 1-4 complete. Engine provides: GameLoop, ECS, Input (keyboard + mouse), Camera, TileMap, Terrain Generation, Renderer, A* Pathfinding.

## Commands

```bash
# From repository root
npm run dev           # Start Colony dev server (http://localhost:5173)
npm run build         # Build engine, then Colony
npm run build:engine  # Build engine only
npm run build:colony  # Build Colony only
npm test              # Run engine tests once
npm run test:watch    # Tests in watch mode
npm run test:coverage # Tests with coverage report

# From packages/engine
npm run build         # Build engine library
npm test              # Run tests

# From packages/colony
npm run dev           # Start dev server
npm run build         # Build for production
```

## Architecture

```
packages/
├── engine/                 # Emergence Engine (npm: emergence-engine)
│   ├── src/
│   │   ├── core/           # GameLoop (fixed timestep)
│   │   ├── ecs/            # Entity-Component-System
│   │   ├── input/          # Keyboard + mouse polling
│   │   ├── render/         # Canvas 2D primitives + Camera
│   │   ├── world/          # TileMap, terrain generation, noise
│   │   ├── ai/             # A* pathfinding
│   │   ├── Engine.ts       # Unified entry point
│   │   └── index.ts        # Public exports
│   └── package.json
│
└── colony/                 # Colony game (uses engine API)
    ├── src/
    │   └── main.ts         # Game entry point
    ├── index.html
    └── package.json        # depends on emergence-engine
```

## Code Style

- GPL-3.0 license headers on all source files
- Colocated tests (`*.test.ts` next to source)
- Strict TypeScript (noUnusedLocals, noUnusedParameters)

## Testing

- Vitest with jsdom environment
- Mock `requestAnimationFrame` and `performance.now()` for GameLoop tests
- Mock canvas context for Renderer tests

## Gotchas

- Test files excluded from `tsconfig.json` to avoid build errors (Vitest handles its own TS)
- GameLoop uses fixed timestep (20 ticks/sec default) with variable rendering
- Input.update() must be called each tick to clear pressed/released state
- ECS systems run before `input.update()` - use systems for game logic, not `engine.onTick()`
- Entity IDs use generational indices (20-bit index + 12-bit generation) for stale reference detection
- Camera uses discrete zoom levels (1x, 2x, 4x) - use `zoomIn()`/`zoomOut()` not arbitrary values
- TileMap uses center-origin coordinates - (0,0) is map center, not top-left
- Mouse coordinates are canvas-relative (Input takes canvas element for offset calculation)

## Public API

All public exports are in `packages/engine/src/index.ts`. Colony (and external consumers) import from `'emergence-engine'`:

```typescript
import { Engine, generateTerrain, Pathfinder } from 'emergence-engine';
import type { Entity, System, EngineConfig, PathNode } from 'emergence-engine';
```

Key exports:
- `Engine` - Main entry point (creates ECS, Input, Renderer, TileMap, Camera)
- `generateTerrain` - Procedural terrain generation
- `Pathfinder` - A* pathfinding with walkability callback
- `World`, `Entity`, `System` - ECS primitives (also accessible via `engine.ecs`)
- `Camera`, `Renderer`, `TileMap` - Subsystems (also accessible via engine instance)
- `MouseButton`, `PathNode` - Type exports

## Git Workflow

- Branch naming: `feature/phase-N-description`
- GPL-3.0 license
