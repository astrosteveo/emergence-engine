# Emergence Engine - Product Requirements Document

## Vision

A complete browser-native 2D game engine with built-in editor. No downloads, no subscriptions, no thick clients. Everything runs in the browser — engine, editor, and your game.

**The Problem:**
- Heavy desktop engines (Unity, Unreal, Godot) require thick client installs for what could run in a browser
- Existing web-based engines (Phaser, PixiJS, etc.) are code-only or have paid editors
- Browser tech has caught up (WebGL, WebGPU, modern JS) but engine tooling hasn't followed

**The Solution:**
Emergence Engine — open source, browser-native, with an integrated editor. Focused on tile-based simulation games (RimWorld, Dwarf Fortress style), but usable for any 2D game.

## Core Value Proposition

The first open-source, browser-native game engine with an integrated editor. Everything runs in the browser.

## Milestones

### Milestone 1: Engine Runtime - MVP
*Goal: A working engine that can run tile-based simulation games with AI-driven entities.*

| Feature | Status | Notes |
|---------|--------|-------|
| Phase 1: Game Loop & Renderer | ✅ Done | Fixed timestep, Canvas 2D |
| Phase 2: ECS Foundation | ✅ Done | Entities, components, systems |
| Phase 3: World System | ✅ Done | TileMap, Camera, terrain generation |
| Phase 4: A Pawn Lives | ✅ Done | Click-to-move, pathfinding, hunger |
| Phase 5: Pawn Thinks | 🔲 Next | Utility AI, actions, food items |
| Phase 6: Two Colonies | 🔲 Planned | Factions, regions, trade |

### Milestone 2: Browser Editor
*Goal: Visual editor running entirely in the browser for content creation and level design.*

| Feature | Status | Notes |
|---------|--------|-------|
| Tile painting | 🔲 Planned | Paint terrain, place buildings |
| Entity placement | 🔲 Planned | Spawn pawns, items, structures |
| Component inspector | 🔲 Planned | View/edit entity components |
| Play-in-editor | 🔲 Planned | Test without leaving browser |
| Save/load projects | 🔲 Planned | Browser storage or file export |

### Milestone 3: Distribution & Polish
*Goal: Easy for others to use the engine for their own games.*

| Feature | Status | Notes |
|---------|--------|-------|
| npm package | 🔲 Planned | `npm install emergence-engine` |
| Documentation site | 🔲 Planned | API docs, tutorials |
| Example games | 🔲 Planned | Starter templates |
| WebGPU renderer | 🔲 Planned | Optional high-performance path |

## Future Ideas (Unscheduled)

*Ideas worth revisiting after MVP milestones complete.*

- [ ] Sound and music system
- [ ] Multiplayer / networked play
- [ ] Mobile touch controls
- [ ] Plugin system for editor extensions
- [ ] Asset marketplace integration

---

## User Personas

**Indie Game Developer**
- Wants to build RimWorld/Dwarf Fortress-style simulation games
- Prefers lightweight tools over Unity/Unreal bloat
- Values open source and no vendor lock-in

**Hobbyist Programmer**
- Building games for fun, learning, or game jams
- Wants to code in TypeScript, not learn proprietary scripting
- Appreciates browser-based workflow (no install, works anywhere)

**Engine Tinkerer**
- Wants to understand how game engines work
- Will read and modify engine source code
- GPL license means full access to internals

## Technical Constraints

- **Stack:** TypeScript, Vite, Canvas 2D (WebGPU optional later)
- **Target:** Modern browsers (Chrome, Firefox, Safari, Edge)
- **Performance:** 60fps rendering, 20 ticks/sec simulation (configurable)
- **License:** GPL-3.0 — engine stays free forever

## Repository Structure

Monorepo with engine and game as separate packages:

```
emergence/
├── packages/
│   ├── engine/                 # Emergence Engine (npm: emergence-engine)
│   │   ├── src/
│   │   │   ├── core/           # GameLoop, time
│   │   │   ├── ecs/            # Entity-Component-System
│   │   │   ├── input/          # Keyboard, mouse
│   │   │   ├── render/         # Canvas 2D, Camera
│   │   │   ├── world/          # TileMap, terrain
│   │   │   ├── ai/             # Pathfinding, utility AI
│   │   │   └── index.ts        # Public API
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── colony/                 # Colony game (uses engine API)
│       ├── src/
│       │   ├── components/     # Game-specific components
│       │   ├── systems/        # Game-specific systems
│       │   └── main.ts         # Game entry point
│       ├── package.json        # depends on emergence-engine
│       └── vite.config.ts
│
└── package.json                # Workspace root (npm workspaces)
```

**Principle:** Need a feature for Colony? Build the pipeline in the engine, use it in the game through the public API. Engine code and game code never mix.

## Success Metrics

- Engine can run Colony (reference game) with utility AI pawns
- Editor enables non-programmers to create content
- External developers can clone, build, and ship their own games
- npm package downloads and GitHub stars (community adoption)
