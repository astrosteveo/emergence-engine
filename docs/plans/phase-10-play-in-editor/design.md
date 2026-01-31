# Phase 10: Play-in-Editor

## Overview

Enable testing games directly in the editor viewport. Click Play, the game runs. Click Stop, return to editing. No separate window or build step - the browser is both the editor and the runtime.

This mirrors how Unity and Godot work, but entirely in the browser.

## Architecture

### Current State

```
packages/editor/    → Standalone React app, creates its own Engine
packages/colony/    → Standalone game app, creates its own Engine
packages/engine/    → Shared engine library
```

### Target State

```
packages/editor/    → Exports reusable UI components (library, not app)
packages/colony/    → Imports editor components, has integrated editor mode
packages/engine/    → Shared engine library (unchanged)
```

The standalone editor app becomes a component library. Games (like Colony) import these components and mount them with their own engine instance. All game logic (systems, AI actions) is registered on the engine before the editor mounts.

## Component Design

The editor package exports React components for games to import:

```typescript
import {
  EditorProvider,      // Context wrapper - accepts external engine
  EditorShell,         // Main layout (toolbar, sidebars, viewport)
  Toolbar,             // File menu, play/stop, project name
  Sidebar,             // Left panel (terrain, buildings, entities)
  Inspector,           // Right panel (selected entity components)
  Viewport,            // Canvas wrapper with pan/zoom/paint
} from 'emergence-editor';
```

### EditorProvider Changes

Currently creates its own engine. Will instead accept an external engine:

```typescript
// Game's entry point
const engine = new Engine({ canvas });

// Register game logic first
engine.ecs.defineComponent('Hunger', { value: 100 });
engine.ecs.addSystem(hungerSystem);
engine.ai.registerAction(eatAction);

// Mount editor with game's engine
<EditorProvider engine={engine} gameDefinitions={colonyDefs}>
  <EditorShell />
</EditorProvider>
```

## Game Definitions Interface

Games provide metadata about their content for the editor palettes:

```typescript
interface GameDefinitions {
  // Terrain types (already registered on engine.tileMap)
  terrain: { name: string; color: string; label?: string }[];

  // Building types
  buildings: { name: string; color: string; label?: string }[];

  // Entity templates for spawning
  entityTemplates: EntityTemplate[];

  // Optional: custom inspector widgets
  inspectors?: Record<string, ComponentInspector>;
}
```

Example from Colony:

```typescript
export const colonyDefinitions: GameDefinitions = {
  terrain: [
    { name: 'grass', color: '#3a5a40' },
    { name: 'water', color: '#1d3557' },
    { name: 'stone', color: '#6c757d' },
  ],
  buildings: [
    { name: 'wall', color: '#4a4a4a' },
    { name: 'stockpile', color: '#8b7355' },
  ],
  entityTemplates: [
    { name: 'pawn', label: 'Pawn', icon: '🧑', components: [...] },
    { name: 'food', label: 'Food', icon: '🍖', components: [...] },
  ],
};
```

## Play/Stop Behavior

### Edit Mode (default)
- Engine loop stopped (`engine.stop()`)
- Viewport renders via manual `drawOnce()` calls
- Mouse clicks paint tiles / place entities
- Camera pan/zoom works
- Systems do NOT run
- Editor overlays visible (grid, brush preview)

### Play Mode
- Engine loop running (`engine.start()`)
- All registered systems execute each tick
- Mouse/keyboard input goes to game (click-to-move, etc.)
- Editor overlays hidden
- Camera pan/zoom still works

### Snapshot/Restore

Before entering Play mode, the editor snapshots the world state:

```typescript
// Play clicked
const snapshot = serialize(engine);
setPlaySnapshot(snapshot);
engine.start();

// Stop clicked
engine.stop();
deserialize(engine, snapshot);  // Restore pre-play state
setPlaySnapshot(null);
```

Uses existing Phase 7 serialization. Stop always restores - no option to keep play-time changes for MVP.

## File Structure

```
packages/editor/
├── src/
│   ├── components/        # Reusable UI components
│   ├── hooks/             # useEditorContext, useUndo
│   ├── types/
│   │   ├── templates.ts   # EntityTemplate (existing)
│   │   └── GameDefinitions.ts  # NEW
│   ├── utils/             # brush.ts, etc.
│   └── index.ts           # NEW: public exports
├── package.json           # Build as library

packages/colony/
├── src/
│   ├── components/        # Game ECS components
│   ├── systems/           # Game systems
│   ├── actions/           # AI actions
│   ├── definitions.ts     # NEW: GameDefinitions for editor
│   ├── EditorApp.tsx      # NEW: Colony + Editor integrated
│   └── main.ts            # Entry point
```

## Implementation Steps

### Step 1: Convert Editor to Library
- Add `src/index.ts` exporting all components
- Update `EditorProvider` to accept external `engine` prop
- Update `package.json` to build as library (add `"main"`, `"types"` fields)
- Viewport uses provided engine instead of creating one

### Step 2: GameDefinitions Interface
- Create `types/GameDefinitions.ts`
- EditorProvider accepts `gameDefinitions` prop
- Palettes read from definitions (fall back to defaults if not provided)

### Step 3: Snapshot/Restore
- Add `playSnapshot` to EditorContext
- Play: serialize → store → start
- Stop: stop → deserialize → clear snapshot

### Step 4: Colony Integration
- Create `definitions.ts` exporting Colony's game definitions
- Create `EditorApp.tsx` that:
  - Creates engine
  - Registers all components, systems, AI actions
  - Mounts EditorProvider with engine + definitions
- Update `main.ts` to use EditorApp

### Step 5: Play Mode Polish
- Hide editor overlays in Play mode
- Forward input to game systems
- Ensure camera controls work in both modes

## Non-Goals (for Phase 10)

- Persisting changes made during Play
- Custom inspector widgets for game components
- Multiple scenes/levels
- Hot-reloading game code

## Success Criteria

1. Colony runs with integrated editor UI
2. Click Play → game systems run (pawns move, AI executes)
3. Click Stop → world resets to pre-play state
4. Tile painting and entity placement work in Edit mode
5. No standalone editor app needed
