# Emergence Engine

2D game engine for simulation games. TypeScript + Vite + Canvas 2D.

## Project Docs

- `docs/plans/mvp/design.md` - Architecture vision and roadmap
- `docs/plans/mvp/plan.md` - Current phase implementation plan
- `docs/plans/phase-2-ecs/design.md` - ECS architecture decisions
- `docs/plans/phase-3-world/plan.md` - World, Camera, TileMap implementation

## Commands

```bash
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # TypeScript check + Vite build
npm test             # Run tests once
npm run test:watch   # Tests in watch mode
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

## Git Workflow

- Branch naming: `feature/phase-N-description`
- GPL-3.0 license - use `gh repo create --license gpl-3.0`
