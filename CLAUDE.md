# Emergence Engine

**Standalone 2D game engine** for simulation games. TypeScript + Vite + Canvas 2D.

This is an engine meant for public release, not a game with embedded engine code. The engine (`src/engine/`) is the product; `main.ts` is a demo proving it works.

## Project Docs

- `docs/plans/mvp/design.md` - Architecture vision and roadmap
- `docs/plans/phase-2-ecs/design.md` - ECS architecture decisions
- `docs/plans/phase-3-world/plan.md` - World, Camera, TileMap implementation

## Current Status

Phases 1-3 complete. Engine provides: GameLoop, ECS, Input, Camera, TileMap, Terrain Generation, Renderer.

## Commands

```bash
npm run dev           # Start dev server (http://localhost:5173)
npm run build         # TypeScript check + Vite build (demo app)
npm run build:lib     # Build engine as library for npm publishing
npm test              # Run tests once
npm run test:watch    # Tests in watch mode
npm run test:coverage # Tests with coverage report
```

## Architecture

```
src/
├── engine/           # Core engine (importable API)
│   ├── core/         # GameLoop (fixed timestep)
│   ├── ecs/          # Entity-Component-System
│   ├── input/        # Keyboard polling
│   ├── render/       # Canvas 2D primitives + Camera
│   ├── world/        # TileMap, terrain generation, noise
│   ├── Engine.ts     # Unified entry point
│   └── index.ts      # Public exports
└── main.ts           # Demo application
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

## Public API

All public exports are in `src/engine/index.ts`. External consumers import from `'emergence-engine'`:

```typescript
import { Engine, generateTerrain } from 'emergence-engine';
import type { Entity, System, EngineConfig } from 'emergence-engine';
```

Key exports:
- `Engine` - Main entry point (creates ECS, Input, Renderer, TileMap, Camera)
- `generateTerrain` - Procedural terrain generation
- `World`, `Entity`, `System` - ECS primitives (also accessible via `engine.ecs`)
- `Camera`, `Renderer`, `TileMap` - Subsystems (also accessible via engine instance)

## Git Workflow

- Branch naming: `feature/phase-N-description`
- GPL-3.0 license - use `gh repo create --license gpl-3.0`
