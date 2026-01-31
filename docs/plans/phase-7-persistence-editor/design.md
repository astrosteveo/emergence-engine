# Phase 7: Project Persistence & Editor Shell

**Status:** Complete

## Overview

Phase 7 implements the foundation for Milestone 2 (Browser Editor):
- Serialization API for saving/loading complete game state
- React-based editor package with browser-native UI
- Save/load to localStorage and file export/import
- Edit/Play mode toggle

## Implementation Summary

### Engine Serialization API

#### TileMap Serialization
- `getRawTerrainData()` - Returns Uint8Array copy of terrain IDs
- `getRawBuildingData()` - Returns Uint8Array copy of building IDs
- `getAllTerrainDefs()` - Returns all terrain definitions
- `getAllBuildingDefs()` - Returns all building definitions
- `getAllTerritory()` - Returns [index, factionId] pairs
- `loadFromData()` - Restores TileMap from serialized data

#### ECS Serialization
- `getAllEntities()` - Returns all alive entity IDs
- `getComponentsForEntity(entity)` - Returns all components on an entity
- `getAllComponentDefs()` - Returns component schemas
- `loadEntities(savedEntities)` - Bulk restore with preserved IDs
- `clear()` - Removes all entities but keeps component definitions

#### Camera Serialization
- `getState()` - Returns { x, y, zoomLevel }
- `setState(state)` - Restores camera position and zoom
- `zoomLevel` getter - Exposes current zoom level index

#### GameLoop Enhancement
- `drawOnce()` - Executes draw callbacks without running simulation (for edit mode)

#### Serialization Functions
- `serialize(engine, options)` - Creates EmergenceSaveFile from engine state
- `deserialize(engine, saveFile, options)` - Restores engine state from save file

### Save File Format

```typescript
interface EmergenceSaveFile {
  version: 1;
  name: string;
  createdAt: string;
  settings: { tickRate: number; tileSize: number };
  tileMap: {
    width: number;
    height: number;
    terrainDefs: TerrainDef[];
    buildingDefs: BuildingDef[];
    terrainData: string;    // Base64 Uint8Array
    buildingData: string;   // Base64 Uint8Array
    territory: [number, string][];
  };
  ecs: {
    componentDefs: { name: string; defaults: object }[];
    entities: { id: number; components: Record<string, unknown> }[];
  };
  camera: { x: number; y: number; zoomLevel: number };
}
```

### Editor Package

Created `packages/editor/` with:
- React 18 + Vite + Tailwind CSS
- EditorShell layout (toolbar, sidebar, viewport, status bar)
- Canvas viewport with engine integration
- useEditorContext hook for global state
- localStorage save/load utilities
- File export/import (uses File System Access API with fallback)
- Edit/Play mode toggle

### Key Architecture Decisions

1. **Entity ID Preservation**: Entity IDs are generational (20-bit index + 12-bit generation). Save file preserves exact IDs so entity references remain valid after load.

2. **Component Registration Required**: Games must call `defineComponent()` BEFORE `deserialize()`. Save file includes schemas for validation, but games define runtime behavior.

3. **Actions Not Serialized**: ActionRegistry stores functions which can't be serialized. Games must re-register actions before AI works on loaded saves.

4. **Definition Order Matters**: Terrain/building definitions get sequential IDs. Register in same order as when saved to avoid ID mismatches.

## New Exports

```typescript
// Serialization
export { serialize, deserialize } from './serialization';
export type { EmergenceSaveFile, SerializeOptions, DeserializeOptions } from './serialization';

// ECS helpers
export { entityIndex, entityGeneration, makeEntity } from './ecs/World';
export type { SerializedEntity, ComponentSchema } from './ecs/World';

// Camera state
export type { CameraState } from './render/Camera';
```

## Files Changed/Created

### Engine (packages/engine/)
- `src/world/TileMap.ts` - Added serialization accessors
- `src/ecs/World.ts` - Added entity iteration and bulk load
- `src/render/Camera.ts` - Added getState/setState
- `src/render/Renderer.ts` - Added strokeRectScreen
- `src/core/GameLoop.ts` - Added drawOnce
- `src/serialization/` - NEW: types.ts, serialize.ts, deserialize.ts, index.ts
- `src/serialization/serialization.test.ts` - NEW: comprehensive tests
- `src/index.ts` - Added new exports

### Editor (packages/editor/)
- `package.json` - NEW: React + Vite + Tailwind dependencies
- `tsconfig.json` - NEW: TypeScript config
- `vite.config.ts` - NEW: Vite + React config
- `tailwind.config.js` - NEW: Custom editor theme
- `postcss.config.js` - NEW: PostCSS for Tailwind
- `index.html` - NEW: Entry point
- `src/main.tsx` - NEW: React root
- `src/App.tsx` - NEW: App wrapper
- `src/vite-env.d.ts` - NEW: Vite types
- `src/styles/index.css` - NEW: Tailwind base styles
- `src/hooks/useEditorContext.tsx` - NEW: Global editor state
- `src/components/EditorShell.tsx` - NEW: Layout shell
- `src/components/Toolbar.tsx` - NEW: Menu bar + Play button
- `src/components/FileMenu.tsx` - NEW: File operations menu
- `src/components/Sidebar.tsx` - NEW: Tool palette placeholder
- `src/components/Viewport.tsx` - NEW: Canvas with engine
- `src/components/StatusBar.tsx` - NEW: Status display
- `src/storage/localStorage.ts` - NEW: LocalStorage wrapper
- `src/storage/fileIO.ts` - NEW: File export/import

### Root
- `package.json` - Added dev:editor and build:editor scripts

## Testing

- 200 tests passing (19 new serialization tests)
- Round-trip serialization verified
- Entity reference preservation tested
- All existing tests continue to pass

## Usage

### Development
```bash
npm run dev:editor  # Start editor at localhost:5173
```

### Serialization API
```typescript
import { serialize, deserialize, Engine } from 'emergence-engine';

// Save
const save = serialize(engine, { name: 'My Game' });
localStorage.setItem('game', JSON.stringify(save));

// Load (components must be defined first!)
engine.ecs.defineComponent('Position', { x: 0, y: 0 });
engine.tileMap.defineTerrain('grass', { color: '#3a5', walkable: true });
deserialize(engine, save);
```

## Future Phases

- **Phase 8**: Tile painting tools, undo/redo
- **Phase 9**: Entity placement & inspector
- **Phase 10**: Play-in-editor polish, keyboard shortcuts
