# Emergence Engine

**Browser-native 2D game engine** with integrated editor for simulation games. TypeScript + Vite + Canvas 2D.

Monorepo containing:
- `packages/engine/` - Emergence Engine (the product)
- `packages/editor/` - Browser-native visual editor (React + Vite)
- `packages/colony/` - Colony game (built with the engine, proves it works)

## Project Docs

- `docs/PRD.md` - Product vision and milestones (living document)
- `docs/plans/mvp/design.md` - Architecture and API design
- `docs/plans/phase-N-*/` - Individual phase designs and plans

## Current Status

Phases 1-10 complete. Engine provides: GameLoop, ECS, Input (keyboard + mouse), Camera, TileMap, Terrain Generation, Renderer, A* Pathfinding, Utility AI (ActionRegistry), Serialization (save/load). Colony game demonstrates multi-colony caravan system. Editor is now a reusable component library that games can embed. Colony imports and mounts editor components with its own engine instance. Play/Stop toggles the game loop with automatic snapshot/restore so you can test changes and revert to the edit-time state.

## Quick Start

```bash
npm install           # Install all workspace dependencies (run from root)
npm run dev:editor    # Start the editor
```

## Commands

All commands should be run from the repository root (uses npm workspaces).

```bash
# Development
npm run dev           # Start Colony dev server (http://localhost:5173)
npm run dev:editor    # Start Editor dev server (http://localhost:5173)
npm run build         # Build engine, Colony, and Editor
npm run build:engine  # Build engine only
npm run build:colony  # Build Colony only
npm run build:editor  # Build Editor only
npm test              # Run engine tests once
npm run test:watch    # Tests in watch mode
npm run test:coverage # Tests with coverage report

# From packages/engine
npm run build         # Build engine library
npm test              # Run tests

# From packages/colony
npm run dev           # Start dev server
npm run build         # Build for production

# From packages/editor
npm run dev           # Start editor dev server
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
│   │   ├── ai/             # A* pathfinding, Utility AI
│   │   ├── serialization/  # Save/load game state
│   │   ├── Engine.ts       # Unified entry point
│   │   └── index.ts        # Public exports
│   └── package.json
│
├── editor/                 # Visual Editor (React + Vite)
│   ├── src/
│   │   ├── components/     # UI components (Toolbar, Viewport, etc.)
│   │   ├── hooks/          # React hooks (useEditorContext)
│   │   ├── storage/        # localStorage and file I/O
│   │   ├── styles/         # Tailwind CSS
│   │   └── main.tsx        # Entry point
│   └── package.json        # depends on emergence-engine
│
└── colony/                 # Colony game (uses engine API)
    ├── src/
    │   ├── definitions.ts  # Game definitions for editor integration
    │   ├── setup.ts        # Engine setup (components, systems, AI)
    │   ├── render.ts       # Colony-specific rendering
    │   ├── EditorApp.tsx   # React app integrating editor
    │   ├── main.tsx        # Entry point (editor mode)
    │   └── game.ts         # Standalone game mode
    ├── index.html
    └── package.json        # depends on emergence-engine, emergence-editor
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
- Component order matters - define components before any code that uses them (including spawn functions)
- Browser captures certain keys (F1-F12) - use backtick or letter keys for game hotkeys
- AI actions should verify path reachability in execute() before committing to a task
- Components must be defined BEFORE calling deserialize() - save file includes schemas but games define runtime behavior
- Terrain/building definitions get sequential IDs - register in same order when loading saves
- Actions are not serialized - re-register actions after loading a save

## Editor Controls

- **Pan**: Middle mouse button drag
- **Zoom**: Mouse scroll wheel (discrete levels: 1x, 2x, 4x)
- **Play/Stop**: Button in toolbar (toggles simulation)
- **Paint mode**: P key
- **Erase mode**: X key
- **Entity mode**: E key
- **Brush size**: 1, 2, 3 keys (1x1, 3x3, 5x5)
- **Undo/Redo**: Ctrl+Z / Ctrl+Shift+Z (tile painting only)
- **Delete entity**: Delete or Backspace (when entity selected)
- **Deselect**: Escape

## Public API

All public exports are in `packages/engine/src/index.ts`. Colony (and external consumers) import from `'emergence-engine'`:

```typescript
import { Engine, generateTerrain, Pathfinder, ActionRegistry, serialize, deserialize } from 'emergence-engine';
import type { Entity, System, EngineConfig, PathNode, ActionDefinition, ActionContext, TerrainDef, BuildingDef, GeneratorConfig, ActionScore, MouseButton, EmergenceSaveFile, CameraState } from 'emergence-engine';
```

Key exports:
- `Engine` - Main entry point (creates ECS, Input, Renderer, TileMap, Camera)
- `GameLoop` - Fixed timestep game loop (also accessible via `engine.loop`)
- `generateTerrain` - Procedural terrain generation
- `Pathfinder` - A* pathfinding with walkability callback
- `World`, `Entity`, `System` - ECS primitives (also accessible via `engine.ecs`)
- `Camera`, `Renderer`, `TileMap` - Subsystems (also accessible via engine instance)
- `ActionRegistry` - Utility AI framework for autonomous entities (also accessible via `engine.ai`)
- `serialize`, `deserialize` - Save/load game state
- Type exports: `MouseButton`, `PathNode`, `ActionDefinition`, `ActionContext`, `TerrainDef`, `BuildingDef`, `GeneratorConfig`, `ActionScore`, `EmergenceSaveFile`, `CameraState`

## Git Workflow

- Branch naming: `feature/phase-N-description`
- Branch naming for docs: `docs/description`
- Status updates: keep CLAUDE.md, README.md, and docs/PRD.md in sync
- GPL-3.0 license
