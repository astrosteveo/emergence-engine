# Phase 10: Play-in-Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert the editor from a standalone app to a reusable component library that games embed, enabling play-in-editor functionality.

**Architecture:** The editor package exports React components. Colony imports these and mounts them with its own engine instance (pre-configured with game systems). Play/Stop toggles the game loop with automatic snapshot/restore.

**Tech Stack:** TypeScript, React, Vite (library mode), emergence-engine serialization API

---

## Task 1: Create GameDefinitions Type

**Files:**
- Create: `packages/editor/src/types/GameDefinitions.ts`

**Step 1: Create the type file**

```typescript
/*
 * This file is part of Emergence Editor.
 * Copyright (C) 2026 astrosteveo
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import type { EntityTemplate } from './templates';

export interface TerrainDefinition {
  name: string;
  color: string;
  label?: string;
}

export interface BuildingDefinition {
  name: string;
  color: string;
  label?: string;
}

export interface GameDefinitions {
  terrain: TerrainDefinition[];
  buildings: BuildingDefinition[];
  entityTemplates: EntityTemplate[];
}
```

**Step 2: Commit**

```bash
git add packages/editor/src/types/GameDefinitions.ts
git commit -m "feat(editor): add GameDefinitions type for game metadata"
```

---

## Task 2: Update EditorProvider to Accept External Engine

**Files:**
- Modify: `packages/editor/src/hooks/useEditorContext.tsx`

**Step 1: Update EditorProvider props and state**

Change the EditorProvider to accept an optional `engine` prop and `gameDefinitions` prop. If an engine is provided, use it instead of creating one internally.

In `useEditorContext.tsx`, update the props interface and provider:

```typescript
// Add imports at top
import type { GameDefinitions } from '../types/GameDefinitions';
import type { EmergenceSaveFile } from 'emergence-engine';
import { serialize, deserialize } from 'emergence-engine';

// Add props interface before EditorContextValue
export interface EditorProviderProps {
  children: ReactNode;
  engine?: Engine | null;
  gameDefinitions?: GameDefinitions;
}

// Add to EditorContextValue interface (after deleteSelectedEntity)
  gameDefinitions: GameDefinitions | null;
  playSnapshot: EmergenceSaveFile | null;
```

Update the EditorProvider function signature:

```typescript
export function EditorProvider({ children, engine: externalEngine, gameDefinitions: externalDefs }: EditorProviderProps) {
```

Add state for game definitions and play snapshot:

```typescript
  const [gameDefinitions, setGameDefinitions] = useState<GameDefinitions | null>(externalDefs ?? null);
  const [playSnapshot, setPlaySnapshot] = useState<EmergenceSaveFile | null>(null);
```

Update the effect to sync external game definitions:

```typescript
  // Sync external game definitions
  useEffect(() => {
    if (externalDefs) {
      setGameDefinitions(externalDefs);
    }
  }, [externalDefs]);
```

Update setMode to handle snapshot/restore:

```typescript
  const setMode = useCallback(
    (newMode: EditorMode) => {
      const currentEngine = externalEngine ?? engine;
      if (currentEngine) {
        if (newMode === 'play') {
          // Snapshot before playing
          const snapshot = serialize(currentEngine);
          setPlaySnapshot(snapshot);
          currentEngine.start();
        } else {
          currentEngine.stop();
          // Restore snapshot when stopping
          if (playSnapshot) {
            deserialize(currentEngine, playSnapshot);
            setPlaySnapshot(null);
          }
        }
      }
      setModeState(newMode);
    },
    [externalEngine, engine, playSnapshot]
  );
```

Add to context value:

```typescript
        gameDefinitions,
        playSnapshot,
```

**Step 2: Verify TypeScript compiles**

Run: `npm run build:editor`
Expected: Build succeeds (or only unrelated warnings)

**Step 3: Commit**

```bash
git add packages/editor/src/hooks/useEditorContext.tsx
git commit -m "feat(editor): EditorProvider accepts external engine and game definitions"
```

---

## Task 3: Update Palettes to Use GameDefinitions

**Files:**
- Modify: `packages/editor/src/components/TerrainPalette.tsx`
- Modify: `packages/editor/src/components/BuildingPalette.tsx`
- Modify: `packages/editor/src/components/EntityPalette.tsx`

**Step 1: Update TerrainPalette**

Read the current file first, then modify it to use gameDefinitions from context with fallback to defaults:

```typescript
// Add to imports
import { useEditor } from '../hooks/useEditorContext';

// Inside component, get gameDefinitions
const { gameDefinitions, selectedTerrain, setSelectedTerrain, setTool } = useEditor();

// Use gameDefinitions.terrain if available, else default
const terrainList = gameDefinitions?.terrain ?? [
  { name: 'grass', color: '#3a5a40' },
  { name: 'water', color: '#1d3557' },
  { name: 'stone', color: '#6c757d' },
  { name: 'sand', color: '#e9c46a' },
];
```

Update the map to use terrainList instead of hardcoded values.

**Step 2: Update BuildingPalette**

Same pattern - use gameDefinitions.buildings with fallback:

```typescript
const { gameDefinitions, selectedBuilding, setSelectedBuilding, setTool } = useEditor();

const buildingList = gameDefinitions?.buildings ?? [
  { name: 'wall', color: '#4a4a4a' },
  { name: 'floor', color: '#8b7355' },
];
```

**Step 3: Update EntityPalette**

Use gameDefinitions.entityTemplates:

```typescript
const { gameDefinitions, entityTemplates, selectedTemplate, selectTemplate } = useEditor();

// Prefer gameDefinitions templates over internally registered ones
const templates = gameDefinitions?.entityTemplates ?? entityTemplates;
```

**Step 4: Verify build**

Run: `npm run build:editor`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add packages/editor/src/components/TerrainPalette.tsx packages/editor/src/components/BuildingPalette.tsx packages/editor/src/components/EntityPalette.tsx
git commit -m "feat(editor): palettes read from gameDefinitions with fallbacks"
```

---

## Task 4: Create Editor Package Exports

**Files:**
- Create: `packages/editor/src/index.ts`

**Step 1: Create the public exports file**

```typescript
/*
 * This file is part of Emergence Editor.
 * Copyright (C) 2026 astrosteveo
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

// Context and hooks
export { EditorProvider, useEditor } from './hooks/useEditorContext';
export type { EditorMode, EditorTool, ProjectInfo, EditorProviderProps } from './hooks/useEditorContext';

// Components
export { EditorShell } from './components/EditorShell';
export { Toolbar } from './components/Toolbar';
export { Sidebar } from './components/Sidebar';
export { Viewport } from './components/Viewport';
export { Inspector } from './components/Inspector';
export { RightSidebar } from './components/RightSidebar';
export { StatusBar } from './components/StatusBar';
export { TerrainPalette } from './components/TerrainPalette';
export { BuildingPalette } from './components/BuildingPalette';
export { EntityPalette } from './components/EntityPalette';
export { EntityList } from './components/EntityList';
export { ToolsPanel } from './components/ToolsPanel';
export { FileMenu } from './components/FileMenu';

// Types
export type { GameDefinitions, TerrainDefinition, BuildingDefinition } from './types/GameDefinitions';
export type { EntityTemplate, ComponentTemplate } from './types/templates';

// Hooks
export { useUndo } from './hooks/useUndo';
export type { UndoState, UndoActions, UndoEntry, TileChange } from './hooks/useUndo';

// Utilities
export { getBrushTiles } from './utils/brush';
export type { BrushSize, BrushShape } from './utils/brush';

// Storage utilities
export { saveToFile, loadFromFile } from './storage/fileIO';
export { saveToLocalStorage, loadFromLocalStorage, listLocalSaves, deleteLocalSave } from './storage/localStorage';
```

**Step 2: Commit**

```bash
git add packages/editor/src/index.ts
git commit -m "feat(editor): add public exports index"
```

---

## Task 5: Configure Editor as Library Build

**Files:**
- Modify: `packages/editor/package.json`
- Modify: `packages/editor/vite.config.ts`
- Modify: `packages/editor/tsconfig.json`

**Step 1: Update package.json**

Add library entry points:

```json
{
  "name": "emergence-editor",
  "version": "0.1.0",
  "private": true,
  "description": "Browser-native visual editor for Emergence Engine",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./styles.css": "./dist/styles.css"
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "dev": "vite",
    "build": "vite build && tsc --emitDeclarationOnly --declaration --outDir dist",
    "preview": "vite preview"
  },
  "author": "astrosteveo",
  "license": "GPL-3.0",
  "dependencies": {
    "emergence-engine": "*"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.3.0",
    "vite": "^7.3.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
```

**Step 2: Update vite.config.ts for library mode**

```typescript
/*
 * This file is part of Emergence Editor.
 * Copyright (C) 2026 astrosteveo
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'EmergenceEditor',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'emergence-engine'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'emergence-engine': 'EmergenceEngine',
        },
      },
    },
    cssCodeSplit: false,
  },
});
```

**Step 3: Verify library build**

Run: `npm run build:editor`
Expected: Creates dist/index.js and CSS file

**Step 4: Commit**

```bash
git add packages/editor/package.json packages/editor/vite.config.ts
git commit -m "feat(editor): configure as library build"
```

---

## Task 6: Update Viewport for External Engine

**Files:**
- Modify: `packages/editor/src/components/Viewport.tsx`

**Step 1: Modify Viewport to use external engine**

The Viewport currently creates its own engine in useEffect. Change it to:
1. Accept engine from context (already there via useEditor)
2. Skip engine creation if engine is already provided
3. Only initialize terrain/buildings/templates if no gameDefinitions provided

Update the initialization useEffect:

```typescript
  // Initialize engine only if not provided externally
  useEffect(() => {
    // If engine already exists (external), skip initialization
    if (engine) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const newEngine = new Engine({ canvas, tickRate: 20 });

    // Only define defaults if no gameDefinitions provided
    // (external engine would have these already registered)
    newEngine.tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
    newEngine.tileMap.defineTerrain('water', { color: '#1d3557', walkable: false });
    newEngine.tileMap.defineTerrain('stone', { color: '#6c757d', walkable: true });
    newEngine.tileMap.defineTerrain('sand', { color: '#e9c46a', walkable: true });

    newEngine.tileMap.defineBuilding('wall', { color: '#4a4a4a', solid: true });
    newEngine.tileMap.defineBuilding('floor', { color: '#8b7355', solid: false });

    newEngine.ecs.defineComponent('Position', { x: 0, y: 0 });
    newEngine.ecs.defineComponent('Renderable', { char: '?', color: '#ffffff' });
    newEngine.ecs.defineComponent('Name', { name: 'Entity' });

    registerEntityTemplates([
      {
        name: 'marker',
        label: 'Marker',
        icon: '📍',
        components: [
          { type: 'Position', defaults: { x: 0, y: 0 } },
          { type: 'Renderable', defaults: { char: '!', color: '#fbbf24' } },
          { type: 'Name', defaults: { name: 'Marker' } },
        ],
      },
      {
        name: 'spawn',
        label: 'Spawn Point',
        icon: '⭐',
        components: [
          { type: 'Position', defaults: { x: 0, y: 0 } },
          { type: 'Renderable', defaults: { char: 'S', color: '#22c55e' } },
          { type: 'Name', defaults: { name: 'Spawn Point' } },
        ],
      },
    ]);

    newEngine.tileMap.create(64, 64, 'grass');

    // ... rest of onDraw setup ...

    setEngine(newEngine);

    return () => {
      newEngine.stop();
    };
  }, [engine, setEngine, registerEntityTemplates]); // Add engine to deps
```

**Step 2: Verify build**

Run: `npm run build:editor`

**Step 3: Commit**

```bash
git add packages/editor/src/components/Viewport.tsx
git commit -m "feat(editor): Viewport supports external engine"
```

---

## Task 7: Add Colony Dependencies

**Files:**
- Modify: `packages/colony/package.json`
- Modify: `packages/colony/index.html`

**Step 1: Add editor and React dependencies to Colony**

```json
{
  "name": "colony",
  "version": "0.1.0",
  "private": true,
  "description": "A 2D top-down emergent faction simulation built with Emergence Engine.",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "author": "astrosteveo",
  "license": "GPL-3.0",
  "dependencies": {
    "emergence-engine": "*",
    "emergence-editor": "*",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.3.0",
    "vite": "^7.3.1"
  }
}
```

**Step 2: Update index.html for React**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Colony</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 3: Commit**

```bash
git add packages/colony/package.json packages/colony/index.html
git commit -m "feat(colony): add editor and React dependencies"
```

---

## Task 8: Create Colony Game Definitions

**Files:**
- Create: `packages/colony/src/definitions.ts`

**Step 1: Create definitions file**

Extract terrain, buildings, and entity templates from main.ts:

```typescript
/*
 * This file is part of Colony.
 * Copyright (C) 2026 astrosteveo
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import type { GameDefinitions } from 'emergence-editor';

export const TILE_SIZE = 16;

export const colonyDefinitions: GameDefinitions = {
  terrain: [
    { name: 'grass', color: '#3a5a40', label: 'Grass' },
    { name: 'water', color: '#1d3557', label: 'Water' },
    { name: 'stone', color: '#6c757d', label: 'Stone' },
  ],
  buildings: [
    { name: 'wall', color: '#4a4a4a', label: 'Wall' },
    { name: 'stockpile', color: '#8b7355', label: 'Stockpile' },
  ],
  entityTemplates: [
    {
      name: 'pawn',
      label: 'Pawn',
      icon: '🧑',
      components: [
        { type: 'Position', defaults: { x: 0, y: 0 } },
        { type: 'Sprite', defaults: { width: 24, height: 24, color: '#f87171' } },
        { type: 'Pawn', defaults: {} },
        { type: 'Faction', defaults: { id: 'red' } },
        { type: 'Inventory', defaults: { capacity: 5, food: 0 } },
        { type: 'Hunger', defaults: { current: 20, max: 100, rate: 2 } },
        { type: 'AIState', defaults: { lastHungerPercent: 0.2, needsReeval: true } },
        { type: 'ColonyMemory', defaults: { known: [] } },
      ],
    },
    {
      name: 'stockpile',
      label: 'Stockpile',
      icon: '📦',
      components: [
        { type: 'Position', defaults: { x: 0, y: 0 } },
        { type: 'Sprite', defaults: { width: 32, height: 32, color: '#dc2626' } },
        { type: 'Stockpile', defaults: { factionId: 'red', food: 10 } },
      ],
    },
    {
      name: 'food',
      label: 'Food',
      icon: '🍖',
      components: [
        { type: 'Position', defaults: { x: 0, y: 0 } },
        { type: 'Sprite', defaults: { width: 16, height: 16, color: '#fbbf24' } },
        { type: 'Food', defaults: { nutrition: 30 } },
      ],
    },
  ],
};
```

**Step 2: Commit**

```bash
git add packages/colony/src/definitions.ts
git commit -m "feat(colony): add game definitions for editor"
```

---

## Task 9: Create Colony Setup Module

**Files:**
- Create: `packages/colony/src/setup.ts`

**Step 1: Extract engine setup from main.ts**

Create a module that sets up all Colony game logic on an engine instance:

```typescript
/*
 * This file is part of Colony.
 * Copyright (C) 2026 astrosteveo
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { Engine, Pathfinder } from 'emergence-engine';
import type { Entity, PathNode, ActionContext } from 'emergence-engine';
import { TILE_SIZE } from './definitions';

// Phase 6 constants
const TERRITORY_RADIUS = 8;
const SURPLUS_THRESHOLD = 10;
const DEFICIT_THRESHOLD = 5;
const MEMORY_DECAY_TICKS = 600;
const PROXIMITY_SIGNAL_RANGE = 12;
const PAWN_CARRY_CAPACITY = 5;
const PAWN_SPEED = 80;

let pathfinder: Pathfinder;

export function createActionContext(engine: Engine): ActionContext {
  return {
    ecs: {
      query: (c) => engine.ecs.query(c),
      getComponent: (e, n) => engine.ecs.getComponent(e, n),
      hasComponent: (e, n) => engine.ecs.hasComponent(e, n),
      addComponent: (e, n, d) => engine.ecs.addComponent(e, n, d),
      removeComponent: (e, n) => engine.ecs.removeComponent(e, n),
      isAlive: (e) => engine.ecs.isAlive(e),
    },
    findNearest: (e, c) => engine.findNearest(e, c),
  };
}

export function setupColonyEngine(engine: Engine): void {
  // Define terrain types
  engine.tileMap.defineTerrain('water', { color: '#1d3557', walkable: false });
  engine.tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
  engine.tileMap.defineTerrain('stone', { color: '#6c757d', walkable: true });

  // Create pathfinder
  pathfinder = new Pathfinder((x, y) => engine.tileMap.isWalkable(x, y));

  // Define components
  engine.ecs.defineComponent('Position', { x: 0, y: 0 });
  engine.ecs.defineComponent('Sprite', { width: 24, height: 24, color: '#e94560' });
  engine.ecs.defineComponent('Pawn', {});
  engine.ecs.defineComponent('PathTarget', { x: 0, y: 0 });
  engine.ecs.defineComponent('PathFollow', { path: [] as PathNode[], nodeIndex: 0 });
  engine.ecs.defineComponent('Hunger', { current: 0, max: 100, rate: 2 });
  engine.ecs.defineComponent('Food', { nutrition: 30 });
  engine.ecs.defineComponent('CurrentTask', { action: '', target: null as Entity | null });
  engine.ecs.defineComponent('AIState', { lastHungerPercent: 0, needsReeval: true });
  engine.ecs.defineComponent('Faction', { id: '' });
  engine.ecs.defineComponent('Inventory', { capacity: PAWN_CARRY_CAPACITY, food: 0 });
  engine.ecs.defineComponent('Stockpile', { factionId: '', food: 0 });
  engine.ecs.defineComponent('ColonyMemory', {
    known: [] as Array<{
      factionId: string;
      stockpileX: number;
      stockpileY: number;
      lastSeenFood: number;
      ticksSinceVisit: number;
    }>,
  });
  engine.ecs.defineComponent('CaravanTask', {
    targetFactionId: '',
    targetStockpile: null as Entity | null,
    phase: 'pickup' as 'pickup' | 'traveling-there' | 'dropoff' | 'returning',
    homeStockpile: null as Entity | null,
  });

  // Register AI actions
  registerActions(engine);

  // Register systems
  registerSystems(engine);
}

function findHomeStockpile(engine: Engine, pawnEntity: Entity): Entity | null {
  const faction = engine.ecs.getComponent<{ id: string }>(pawnEntity, 'Faction');
  if (!faction) return null;

  for (const s of engine.ecs.query(['Stockpile', 'Position'])) {
    const stockpile = engine.ecs.getComponent<{ factionId: string }>(s, 'Stockpile')!;
    if (stockpile.factionId === faction.id) {
      return s;
    }
  }
  return null;
}

function findStockpileByFaction(engine: Engine, factionId: string): Entity | null {
  for (const s of engine.ecs.query(['Stockpile', 'Position'])) {
    const stockpile = engine.ecs.getComponent<{ factionId: string }>(s, 'Stockpile')!;
    if (stockpile.factionId === factionId) {
      return s;
    }
  }
  return null;
}

function registerActions(engine: Engine): void {
  engine.ai.defineAction('eat', {
    canExecute(entity, context) {
      const nearestFood = context.findNearest(entity, 'Food');
      if (nearestFood) return true;

      const faction = context.ecs.getComponent<{ id: string }>(entity, 'Faction');
      if (!faction) return context.findNearest(entity, 'Food') !== null;

      for (const s of context.ecs.query(['Stockpile', 'Position'])) {
        const stockpile = context.ecs.getComponent<{ factionId: string; food: number }>(s, 'Stockpile')!;
        if (stockpile.factionId === faction.id && stockpile.food > 0) {
          return true;
        }
      }
      return false;
    },
    score(entity, context) {
      const hunger = context.ecs.getComponent<{ current: number; max: number }>(entity, 'Hunger');
      if (!hunger) return 0;
      const percent = hunger.current / hunger.max;
      if (percent < 0.4) return 0;
      return percent;
    },
    execute(entity, context) {
      const entityPos = context.ecs.getComponent<{ x: number; y: number }>(entity, 'Position');
      if (!entityPos) return;

      const entityTileX = Math.floor(entityPos.x / TILE_SIZE);
      const entityTileY = Math.floor(entityPos.y / TILE_SIZE);

      let targetX: number | null = null;
      let targetY: number | null = null;
      let targetType: 'food' | 'stockpile' = 'food';
      let targetEntity: Entity | null = null;
      let bestDistSq = Infinity;

      const nearestFood = context.findNearest(entity, 'Food');
      if (nearestFood) {
        const foodPos = context.ecs.getComponent<{ x: number; y: number }>(nearestFood, 'Position');
        if (foodPos) {
          const dx = foodPos.x - entityPos.x;
          const dy = foodPos.y - entityPos.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < bestDistSq) {
            bestDistSq = distSq;
            targetX = Math.floor(foodPos.x / TILE_SIZE);
            targetY = Math.floor(foodPos.y / TILE_SIZE);
            targetType = 'food';
            targetEntity = nearestFood;
          }
        }
      }

      const faction = context.ecs.getComponent<{ id: string }>(entity, 'Faction');
      if (faction) {
        for (const s of context.ecs.query(['Stockpile', 'Position'])) {
          const stockpile = context.ecs.getComponent<{ factionId: string; food: number }>(s, 'Stockpile')!;
          if (stockpile.factionId === faction.id && stockpile.food > 0) {
            const stockpilePos = context.ecs.getComponent<{ x: number; y: number }>(s, 'Position')!;
            const dx = stockpilePos.x - entityPos.x;
            const dy = stockpilePos.y - entityPos.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < bestDistSq) {
              bestDistSq = distSq;
              targetX = Math.floor(stockpilePos.x / TILE_SIZE);
              targetY = Math.floor(stockpilePos.y / TILE_SIZE);
              targetType = 'stockpile';
              targetEntity = s;
            }
          }
        }
      }

      if (targetX === null || targetY === null || targetEntity === null) return;

      const path = pathfinder.findPath(entityTileX, entityTileY, targetX, targetY);
      if (!path) return;

      if (context.ecs.hasComponent(entity, 'PathFollow')) {
        context.ecs.removeComponent(entity, 'PathFollow');
      }
      if (context.ecs.hasComponent(entity, 'PathTarget')) {
        context.ecs.removeComponent(entity, 'PathTarget');
      }

      context.ecs.addComponent(entity, 'PathTarget', { x: targetX, y: targetY });

      if (context.ecs.hasComponent(entity, 'CurrentTask')) {
        context.ecs.removeComponent(entity, 'CurrentTask');
      }
      context.ecs.addComponent(entity, 'CurrentTask', {
        action: targetType === 'food' ? 'eat' : 'eat-stockpile',
        target: targetEntity,
      });
    },
  });

  engine.ai.defineAction('wander', {
    canExecute() {
      return true;
    },
    score() {
      return 0.1;
    },
    execute(entity, context) {
      const pos = context.ecs.getComponent<{ x: number; y: number }>(entity, 'Position');
      if (!pos) return;

      const currentTileX = Math.floor(pos.x / TILE_SIZE);
      const currentTileY = Math.floor(pos.y / TILE_SIZE);

      const range = 5;
      let targetX = currentTileX;
      let targetY = currentTileY;
      let found = false;

      for (let attempts = 0; attempts < 10 && !found; attempts++) {
        const dx = Math.floor(Math.random() * (range * 2 + 1)) - range;
        const dy = Math.floor(Math.random() * (range * 2 + 1)) - range;
        const tx = currentTileX + dx;
        const ty = currentTileY + dy;

        if (engine.tileMap.isWalkable(tx, ty)) {
          targetX = tx;
          targetY = ty;
          found = true;
        }
      }

      if (!found) return;

      if (context.ecs.hasComponent(entity, 'PathFollow')) {
        context.ecs.removeComponent(entity, 'PathFollow');
      }
      if (context.ecs.hasComponent(entity, 'PathTarget')) {
        context.ecs.removeComponent(entity, 'PathTarget');
      }

      context.ecs.addComponent(entity, 'PathTarget', { x: targetX, y: targetY });

      if (context.ecs.hasComponent(entity, 'CurrentTask')) {
        context.ecs.removeComponent(entity, 'CurrentTask');
      }
      context.ecs.addComponent(entity, 'CurrentTask', { action: 'wander', target: null });
    },
  });

  engine.ai.defineAction('explore', {
    canExecute() {
      return true;
    },
    score() {
      return 0.15;
    },
    execute(entity, context) {
      const pos = context.ecs.getComponent<{ x: number; y: number }>(entity, 'Position');
      if (!pos) return;

      const currentTileX = Math.floor(pos.x / TILE_SIZE);
      const currentTileY = Math.floor(pos.y / TILE_SIZE);

      const faction = context.ecs.getComponent<{ id: string }>(entity, 'Faction');
      const direction = faction?.id === 'red' ? 1 : -1;

      const range = 10;
      let targetX = currentTileX;
      let targetY = currentTileY;
      let found = false;

      for (let attempts = 0; attempts < 15 && !found; attempts++) {
        const dx = Math.floor(Math.random() * range) * direction + Math.floor(Math.random() * 5) - 2;
        const dy = Math.floor(Math.random() * 11) - 5;
        const tx = currentTileX + dx;
        const ty = currentTileY + dy;

        if (engine.tileMap.isWalkable(tx, ty)) {
          const path = pathfinder.findPath(currentTileX, currentTileY, tx, ty);
          if (path) {
            targetX = tx;
            targetY = ty;
            found = true;
          }
        }
      }

      if (!found) return;

      if (context.ecs.hasComponent(entity, 'PathFollow')) {
        context.ecs.removeComponent(entity, 'PathFollow');
      }
      if (context.ecs.hasComponent(entity, 'PathTarget')) {
        context.ecs.removeComponent(entity, 'PathTarget');
      }

      context.ecs.addComponent(entity, 'PathTarget', { x: targetX, y: targetY });

      if (context.ecs.hasComponent(entity, 'CurrentTask')) {
        context.ecs.removeComponent(entity, 'CurrentTask');
      }
      context.ecs.addComponent(entity, 'CurrentTask', { action: 'explore', target: null });
    },
  });

  engine.ai.defineAction('caravan', {
    canExecute(entity, context) {
      if (context.ecs.hasComponent(entity, 'CaravanTask')) return false;

      const faction = context.ecs.getComponent<{ id: string }>(entity, 'Faction');
      if (!faction) return false;

      const homeStockpile = findHomeStockpile(engine, entity);
      if (!homeStockpile) return false;

      const stockpileComp = context.ecs.getComponent<{ food: number }>(homeStockpile, 'Stockpile');
      if (!stockpileComp || stockpileComp.food <= SURPLUS_THRESHOLD) return false;

      const memory = context.ecs.getComponent<{
        known: Array<{ factionId: string; lastSeenFood: number; ticksSinceVisit: number }>;
      }>(entity, 'ColonyMemory');
      if (!memory) return false;

      const needyColony = memory.known.find(
        (k) => k.lastSeenFood < DEFICIT_THRESHOLD && k.ticksSinceVisit < MEMORY_DECAY_TICKS
      );
      return needyColony !== undefined;
    },
    score(entity, context) {
      const faction = context.ecs.getComponent<{ id: string }>(entity, 'Faction');
      if (!faction) return 0;

      const homeStockpile = findHomeStockpile(engine, entity);
      if (!homeStockpile) return 0;

      const stockpileComp = context.ecs.getComponent<{ food: number }>(homeStockpile, 'Stockpile');
      if (!stockpileComp) return 0;

      const memory = context.ecs.getComponent<{
        known: Array<{ factionId: string; lastSeenFood: number; ticksSinceVisit: number }>;
      }>(entity, 'ColonyMemory');
      if (!memory) return 0;

      const hunger = context.ecs.getComponent<{ current: number; max: number }>(entity, 'Hunger');
      if (!hunger) return 0;

      const needyColony = memory.known.find(
        (k) => k.lastSeenFood < DEFICIT_THRESHOLD && k.ticksSinceVisit < MEMORY_DECAY_TICKS
      );
      if (!needyColony) return 0;

      const surplusFactor = (stockpileComp.food - SURPLUS_THRESHOLD) / stockpileComp.food;
      const deficitFactor = 1 - needyColony.lastSeenFood / DEFICIT_THRESHOLD;
      const hungerPercent = hunger.current / hunger.max;
      const hungerPenalty = 1 - hungerPercent * 0.8;

      return surplusFactor * deficitFactor * hungerPenalty * 0.7;
    },
    execute(entity, context) {
      const faction = context.ecs.getComponent<{ id: string }>(entity, 'Faction');
      if (!faction) return;

      const memory = context.ecs.getComponent<{
        known: Array<{ factionId: string; stockpileX: number; stockpileY: number; lastSeenFood: number }>;
      }>(entity, 'ColonyMemory');
      if (!memory) return;

      const needyColony = memory.known.find((k) => k.lastSeenFood < DEFICIT_THRESHOLD);
      if (!needyColony) return;

      const targetStockpile = findStockpileByFaction(engine, needyColony.factionId);
      if (!targetStockpile) return;

      const homeStockpile = findHomeStockpile(engine, entity);
      if (!homeStockpile) return;

      const homePos = context.ecs.getComponent<{ x: number; y: number }>(homeStockpile, 'Position');
      if (!homePos) return;

      const entityPos = context.ecs.getComponent<{ x: number; y: number }>(entity, 'Position');
      if (!entityPos) return;

      const homeTileX = Math.floor(homePos.x / TILE_SIZE);
      const homeTileY = Math.floor(homePos.y / TILE_SIZE);
      const entityTileX = Math.floor(entityPos.x / TILE_SIZE);
      const entityTileY = Math.floor(entityPos.y / TILE_SIZE);

      const path = pathfinder.findPath(entityTileX, entityTileY, homeTileX, homeTileY);
      if (!path) return;

      context.ecs.addComponent(entity, 'CaravanTask', {
        targetFactionId: needyColony.factionId,
        targetStockpile,
        phase: 'pickup',
        homeStockpile,
      });

      if (context.ecs.hasComponent(entity, 'PathFollow')) {
        context.ecs.removeComponent(entity, 'PathFollow');
      }
      if (context.ecs.hasComponent(entity, 'PathTarget')) {
        context.ecs.removeComponent(entity, 'PathTarget');
      }
      context.ecs.addComponent(entity, 'PathTarget', { x: homeTileX, y: homeTileY });

      if (context.ecs.hasComponent(entity, 'CurrentTask')) {
        context.ecs.removeComponent(entity, 'CurrentTask');
      }
      context.ecs.addComponent(entity, 'CurrentTask', { action: 'caravan', target: homeStockpile });
    },
  });
}

function registerSystems(engine: Engine): void {
  // Memory decay system
  engine.ecs.addSystem({
    name: 'MemoryDecay',
    query: ['ColonyMemory'],
    update(entities) {
      for (const e of entities) {
        const memory = engine.ecs.getComponent<{
          known: Array<{ ticksSinceVisit: number }>;
        }>(e, 'ColonyMemory')!;
        for (const entry of memory.known) {
          entry.ticksSinceVisit++;
        }
      }
    },
  });

  // Memory update system
  engine.ecs.addSystem({
    name: 'MemoryUpdate',
    query: ['Pawn', 'Position', 'Faction', 'ColonyMemory'],
    update(entities) {
      const stockpiles = engine.ecs.query(['Stockpile', 'Position']);

      for (const pawn of entities) {
        const pawnPos = engine.ecs.getComponent<{ x: number; y: number }>(pawn, 'Position')!;
        const pawnFaction = engine.ecs.getComponent<{ id: string }>(pawn, 'Faction')!;
        const memory = engine.ecs.getComponent<{
          known: Array<{
            factionId: string;
            stockpileX: number;
            stockpileY: number;
            lastSeenFood: number;
            ticksSinceVisit: number;
          }>;
        }>(pawn, 'ColonyMemory')!;

        const pawnTileX = Math.floor(pawnPos.x / TILE_SIZE);
        const pawnTileY = Math.floor(pawnPos.y / TILE_SIZE);

        for (const s of stockpiles) {
          const stockpileComp = engine.ecs.getComponent<{ factionId: string; food: number }>(s, 'Stockpile')!;
          const stockpilePos = engine.ecs.getComponent<{ x: number; y: number }>(s, 'Position')!;

          if (stockpileComp.factionId === pawnFaction.id) continue;

          const stockpileTileX = Math.floor(stockpilePos.x / TILE_SIZE);
          const stockpileTileY = Math.floor(stockpilePos.y / TILE_SIZE);

          const dx = pawnTileX - stockpileTileX;
          const dy = pawnTileY - stockpileTileY;
          const distSq = dx * dx + dy * dy;

          if (distSq <= 9) {
            const existing = memory.known.find((k) => k.factionId === stockpileComp.factionId);
            if (existing) {
              existing.lastSeenFood = stockpileComp.food;
              existing.ticksSinceVisit = 0;
              existing.stockpileX = stockpileTileX;
              existing.stockpileY = stockpileTileY;
            } else {
              memory.known.push({
                factionId: stockpileComp.factionId,
                stockpileX: stockpileTileX,
                stockpileY: stockpileTileY,
                lastSeenFood: stockpileComp.food,
                ticksSinceVisit: 0,
              });
            }
          }
        }
      }
    },
  });

  // Proximity signal system
  engine.ecs.addSystem({
    name: 'ProximitySignal',
    query: ['Pawn', 'Position', 'Faction', 'ColonyMemory'],
    update(entities) {
      const stockpiles = engine.ecs.query(['Stockpile', 'Position']);

      for (const pawn of entities) {
        const pawnPos = engine.ecs.getComponent<{ x: number; y: number }>(pawn, 'Position')!;
        const pawnFaction = engine.ecs.getComponent<{ id: string }>(pawn, 'Faction')!;
        const memory = engine.ecs.getComponent<{
          known: Array<{
            factionId: string;
            stockpileX: number;
            stockpileY: number;
            lastSeenFood: number;
            ticksSinceVisit: number;
          }>;
        }>(pawn, 'ColonyMemory')!;

        const pawnTileX = Math.floor(pawnPos.x / TILE_SIZE);
        const pawnTileY = Math.floor(pawnPos.y / TILE_SIZE);

        for (const s of stockpiles) {
          const stockpileComp = engine.ecs.getComponent<{ factionId: string; food: number }>(s, 'Stockpile')!;
          const stockpilePos = engine.ecs.getComponent<{ x: number; y: number }>(s, 'Position')!;

          if (stockpileComp.factionId === pawnFaction.id) continue;
          if (stockpileComp.food >= DEFICIT_THRESHOLD) continue;

          const stockpileTileX = Math.floor(stockpilePos.x / TILE_SIZE);
          const stockpileTileY = Math.floor(stockpilePos.y / TILE_SIZE);

          const dx = pawnTileX - stockpileTileX;
          const dy = pawnTileY - stockpileTileY;
          const distSq = dx * dx + dy * dy;

          if (distSq <= PROXIMITY_SIGNAL_RANGE * PROXIMITY_SIGNAL_RANGE) {
            const existing = memory.known.find((k) => k.factionId === stockpileComp.factionId);
            if (existing) {
              existing.lastSeenFood = stockpileComp.food;
              existing.stockpileX = stockpileTileX;
              existing.stockpileY = stockpileTileY;
            } else {
              memory.known.push({
                factionId: stockpileComp.factionId,
                stockpileX: stockpileTileX,
                stockpileY: stockpileTileY,
                lastSeenFood: stockpileComp.food,
                ticksSinceVisit: MEMORY_DECAY_TICKS,
              });
            }
          }
        }
      }
    },
  });

  // Caravan system
  engine.ecs.addSystem({
    name: 'Caravan',
    query: ['CaravanTask', 'Position', 'Inventory'],
    update(entities) {
      for (const e of entities) {
        if (engine.ecs.hasComponent(e, 'PathFollow') || engine.ecs.hasComponent(e, 'PathTarget')) {
          continue;
        }

        const caravan = engine.ecs.getComponent<{
          targetFactionId: string;
          targetStockpile: Entity | null;
          phase: 'pickup' | 'traveling-there' | 'dropoff' | 'returning';
          homeStockpile: Entity | null;
        }>(e, 'CaravanTask')!;

        const inventory = engine.ecs.getComponent<{ capacity: number; food: number }>(e, 'Inventory')!;

        if (caravan.phase === 'pickup') {
          if (caravan.homeStockpile && engine.ecs.isAlive(caravan.homeStockpile)) {
            const stockpile = engine.ecs.getComponent<{ food: number }>(caravan.homeStockpile, 'Stockpile');
            if (stockpile && stockpile.food > 0) {
              const toTake = Math.min(inventory.capacity - inventory.food, stockpile.food);
              stockpile.food -= toTake;
              inventory.food += toTake;
            }
          }

          if (caravan.targetStockpile && engine.ecs.isAlive(caravan.targetStockpile)) {
            const targetPos = engine.ecs.getComponent<{ x: number; y: number }>(caravan.targetStockpile, 'Position');
            if (targetPos) {
              const targetTileX = Math.floor(targetPos.x / TILE_SIZE);
              const targetTileY = Math.floor(targetPos.y / TILE_SIZE);
              engine.ecs.addComponent(e, 'PathTarget', { x: targetTileX, y: targetTileY });
              caravan.phase = 'traveling-there';
            }
          } else {
            engine.ecs.removeComponent(e, 'CaravanTask');
            if (engine.ecs.hasComponent(e, 'CurrentTask')) {
              engine.ecs.removeComponent(e, 'CurrentTask');
            }
          }
        } else if (caravan.phase === 'traveling-there') {
          caravan.phase = 'dropoff';
        } else if (caravan.phase === 'dropoff') {
          if (caravan.targetStockpile && engine.ecs.isAlive(caravan.targetStockpile)) {
            const stockpile = engine.ecs.getComponent<{ food: number }>(caravan.targetStockpile, 'Stockpile');
            if (stockpile) {
              stockpile.food += inventory.food;
              inventory.food = 0;
            }
          }

          if (caravan.homeStockpile && engine.ecs.isAlive(caravan.homeStockpile)) {
            const homePos = engine.ecs.getComponent<{ x: number; y: number }>(caravan.homeStockpile, 'Position');
            if (homePos) {
              const homeTileX = Math.floor(homePos.x / TILE_SIZE);
              const homeTileY = Math.floor(homePos.y / TILE_SIZE);
              engine.ecs.addComponent(e, 'PathTarget', { x: homeTileX, y: homeTileY });
              caravan.phase = 'returning';
            }
          } else {
            engine.ecs.removeComponent(e, 'CaravanTask');
            if (engine.ecs.hasComponent(e, 'CurrentTask')) {
              engine.ecs.removeComponent(e, 'CurrentTask');
            }
          }
        } else if (caravan.phase === 'returning') {
          engine.ecs.removeComponent(e, 'CaravanTask');
          if (engine.ecs.hasComponent(e, 'CurrentTask')) {
            engine.ecs.removeComponent(e, 'CurrentTask');
          }

          const aiState = engine.ecs.getComponent<{ needsReeval: boolean }>(e, 'AIState');
          if (aiState) {
            aiState.needsReeval = true;
          }
        }
      }
    },
  });

  // AI Decision system
  engine.ecs.addSystem({
    name: 'AIDecision',
    query: ['Pawn', 'Hunger', 'AIState'],
    update(entities) {
      const context = createActionContext(engine);

      for (const e of entities) {
        if (engine.ecs.hasComponent(e, 'CaravanTask')) {
          continue;
        }

        const aiState = engine.ecs.getComponent<{ lastHungerPercent: number; needsReeval: boolean }>(e, 'AIState')!;
        const hunger = engine.ecs.getComponent<{ current: number; max: number }>(e, 'Hunger')!;
        const currentPercent = hunger.current / hunger.max;

        if (aiState.lastHungerPercent < 0.5 && currentPercent >= 0.5) {
          aiState.needsReeval = true;
        }
        aiState.lastHungerPercent = currentPercent;

        const hasTask = engine.ecs.hasComponent(e, 'CurrentTask');
        const hasPath = engine.ecs.hasComponent(e, 'PathFollow') || engine.ecs.hasComponent(e, 'PathTarget');
        if (hasTask && !hasPath) {
          aiState.needsReeval = true;
        }

        if (!hasTask) {
          aiState.needsReeval = true;
        }

        if (hasTask) {
          const task = engine.ecs.getComponent<{ action: string; target: Entity | null }>(e, 'CurrentTask')!;
          if (task.target !== null && !engine.ecs.isAlive(task.target)) {
            aiState.needsReeval = true;
          }
        }

        if (aiState.needsReeval) {
          aiState.needsReeval = false;
          const actionName = engine.ai.pickBest(e, context);
          if (actionName) {
            engine.ai.execute(actionName, e, context);
          }
        }
      }
    },
  });

  // Pathfinding system
  engine.ecs.addSystem({
    name: 'Pathfinding',
    query: ['Position', 'PathTarget'],
    update(entities) {
      for (const e of entities) {
        if (engine.ecs.hasComponent(e, 'PathFollow')) continue;

        const pos = engine.ecs.getComponent<{ x: number; y: number }>(e, 'Position')!;
        const target = engine.ecs.getComponent<{ x: number; y: number }>(e, 'PathTarget')!;

        const currentTile = engine.camera.worldToTile(pos.x, pos.y, TILE_SIZE);
        const path = pathfinder.findPath(currentTile.x, currentTile.y, target.x, target.y);

        if (path && path.length > 1) {
          engine.ecs.addComponent(e, 'PathFollow', { path: path.slice(1), nodeIndex: 0 });
        } else {
          engine.ecs.removeComponent(e, 'PathTarget');
        }
      }
    },
  });

  // Path follow system
  engine.ecs.addSystem({
    name: 'PathFollow',
    query: ['Position', 'PathFollow'],
    update(entities, dt) {
      for (const e of entities) {
        const pos = engine.ecs.getComponent<{ x: number; y: number }>(e, 'Position')!;
        const pathFollow = engine.ecs.getComponent<{ path: PathNode[]; nodeIndex: number }>(e, 'PathFollow')!;

        if (pathFollow.nodeIndex >= pathFollow.path.length) {
          engine.ecs.removeComponent(e, 'PathFollow');
          if (engine.ecs.hasComponent(e, 'PathTarget')) {
            engine.ecs.removeComponent(e, 'PathTarget');
          }
          continue;
        }

        const targetNode = pathFollow.path[pathFollow.nodeIndex];
        const targetX = targetNode.x * TILE_SIZE + TILE_SIZE / 2;
        const targetY = targetNode.y * TILE_SIZE + TILE_SIZE / 2;

        const dx = targetX - pos.x;
        const dy = targetY - pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 2) {
          pos.x = targetX;
          pos.y = targetY;
          pathFollow.nodeIndex++;
        } else {
          const moveDistance = PAWN_SPEED * dt;
          const ratio = Math.min(moveDistance / distance, 1);
          pos.x += dx * ratio;
          pos.y += dy * ratio;
        }
      }
    },
  });

  // Task execution system
  engine.ecs.addSystem({
    name: 'TaskExecution',
    query: ['CurrentTask', 'Position'],
    update(entities) {
      for (const e of entities) {
        if (engine.ecs.hasComponent(e, 'PathFollow') || engine.ecs.hasComponent(e, 'PathTarget')) {
          continue;
        }

        const task = engine.ecs.getComponent<{ action: string; target: Entity | null }>(e, 'CurrentTask')!;

        if (task.action === 'eat' && task.target !== null) {
          if (engine.ecs.isAlive(task.target)) {
            const food = engine.ecs.getComponent<{ nutrition: number }>(task.target, 'Food');
            const hunger = engine.ecs.getComponent<{ current: number; max: number }>(e, 'Hunger');

            if (food && hunger) {
              hunger.current = Math.max(0, hunger.current - food.nutrition);
              engine.ecs.destroyEntity(task.target);
            }
          }
          engine.ecs.removeComponent(e, 'CurrentTask');
        } else if (task.action === 'eat-stockpile' && task.target !== null) {
          if (engine.ecs.isAlive(task.target)) {
            const stockpile = engine.ecs.getComponent<{ food: number }>(task.target, 'Stockpile');
            const hunger = engine.ecs.getComponent<{ current: number; max: number }>(e, 'Hunger');

            if (stockpile && hunger && stockpile.food > 0) {
              stockpile.food -= 1;
              hunger.current = Math.max(0, hunger.current - 30);
            }
          }
          engine.ecs.removeComponent(e, 'CurrentTask');
        } else if (task.action === 'wander') {
          engine.ecs.removeComponent(e, 'CurrentTask');
        }
      }
    },
  });

  // Hunger system
  engine.ecs.addSystem({
    name: 'Hunger',
    query: ['Hunger'],
    update(entities, dt) {
      for (const e of entities) {
        const hunger = engine.ecs.getComponent<{ current: number; max: number; rate: number }>(e, 'Hunger')!;
        hunger.current = Math.min(hunger.current + hunger.rate * dt, hunger.max);
      }
    },
  });
}

export { pathfinder, TERRITORY_RADIUS, TILE_SIZE as TILE_SIZE_CONSTANT };
```

**Step 2: Commit**

```bash
git add packages/colony/src/setup.ts
git commit -m "feat(colony): extract engine setup to reusable module"
```

---

## Task 10: Create Colony Render Module

**Files:**
- Create: `packages/colony/src/render.ts`

**Step 1: Extract rendering logic**

```typescript
/*
 * This file is part of Colony.
 * Copyright (C) 2026 astrosteveo
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import type { Engine, Entity } from 'emergence-engine';
import { TILE_SIZE } from './definitions';
import { createActionContext } from './setup';

export function setupColonyRenderer(engine: Engine, canvas: HTMLCanvasElement, debugMode: boolean): void {
  engine.onDraw(() => {
    engine.renderer.clear();

    // Draw tile map
    engine.renderer.drawTileMap(engine.tileMap, TILE_SIZE);

    // Draw entities (pawns)
    for (const e of engine.ecs.query(['Position', 'Sprite'])) {
      const pos = engine.ecs.getComponent<{ x: number; y: number }>(e, 'Position')!;
      const sprite = engine.ecs.getComponent<{ width: number; height: number; color: string }>(e, 'Sprite')!;
      engine.renderer.drawRectCentered(pos.x, pos.y, sprite.width, sprite.height, sprite.color);
    }

    // Draw stockpile food counts
    for (const s of engine.ecs.query(['Stockpile', 'Position'])) {
      const stockpile = engine.ecs.getComponent<{ factionId: string; food: number }>(s, 'Stockpile')!;
      const pos = engine.ecs.getComponent<{ x: number; y: number }>(s, 'Position')!;
      const screenPos = engine.camera.worldToScreen(pos.x, pos.y - 24);
      engine.renderer.drawTextScreen(`${stockpile.food}`, screenPos.x, screenPos.y, {
        font: '14px monospace',
        color: '#ffffff',
        align: 'center',
      });
    }

    // Debug overlay
    if (debugMode) {
      const context = createActionContext(engine);
      const pawns = engine.ecs.query(['Pawn', 'Faction']);
      let debugPawn: Entity | null = null;

      for (const p of pawns) {
        const faction = engine.ecs.getComponent<{ id: string }>(p, 'Faction');
        if (faction?.id === 'red') {
          debugPawn = p;
          break;
        }
      }

      if (debugPawn !== null) {
        const scores = engine.ai.evaluateAll(debugPawn, context);
        const currentTask = engine.ecs.getComponent<{ action: string }>(debugPawn, 'CurrentTask');
        const caravanTask = engine.ecs.getComponent<{ phase: string }>(debugPawn, 'CaravanTask');
        const inventory = engine.ecs.getComponent<{ food: number }>(debugPawn, 'Inventory');
        const memory = engine.ecs.getComponent<{ known: Array<{ factionId: string; lastSeenFood: number }> }>(debugPawn, 'ColonyMemory');

        const debugX = 10;
        let debugY = canvas.height - 340;
        const debugWidth = 180;
        const debugHeight = 220;

        engine.renderer.drawRectScreen(debugX, debugY, debugWidth, debugHeight, 'rgba(26, 26, 46, 0.9)');
        engine.renderer.drawTextScreen('AI Debug', debugX + 10, debugY + 22, {
          font: '14px monospace',
          color: '#ffffff',
        });

        let yOffset = 42;

        if (caravanTask) {
          engine.renderer.drawTextScreen(`Caravan: ${caravanTask.phase}`, debugX + 10, debugY + yOffset, {
            font: '12px monospace',
            color: '#fbbf24',
          });
          yOffset += 18;
        }

        if (inventory) {
          engine.renderer.drawTextScreen(`Carrying: ${inventory.food} food`, debugX + 10, debugY + yOffset, {
            font: '12px monospace',
            color: '#60a5fa',
          });
          yOffset += 18;
        }

        if (memory && memory.known.length > 0) {
          engine.renderer.drawTextScreen('Known colonies:', debugX + 10, debugY + yOffset, {
            font: '12px monospace',
            color: '#888888',
          });
          yOffset += 16;
          for (const k of memory.known) {
            engine.renderer.drawTextScreen(`  ${k.factionId}: ${k.lastSeenFood} food`, debugX + 10, debugY + yOffset, {
              font: '11px monospace',
              color: '#aaaaaa',
            });
            yOffset += 14;
          }
        }

        yOffset += 4;

        for (const { action, score, canExecute } of scores) {
          const isActive = currentTask?.action === action;
          const color = !canExecute ? '#666666' : isActive ? '#4ade80' : '#aaaaaa';
          const marker = isActive ? ' ◄' : '';
          const scoreText = canExecute ? score.toFixed(2) : '-.--';

          engine.renderer.drawTextScreen(
            `${action}: ${scoreText}${marker}`,
            debugX + 10,
            debugY + yOffset,
            { font: '12px monospace', color }
          );
          yOffset += 18;
        }
      }
    }
  });
}
```

**Step 2: Commit**

```bash
git add packages/colony/src/render.ts
git commit -m "feat(colony): extract render setup to module"
```

---

## Task 11: Create Colony Editor App

**Files:**
- Create: `packages/colony/src/EditorApp.tsx`

**Step 1: Create the integrated editor app**

```tsx
/*
 * This file is part of Colony.
 * Copyright (C) 2026 astrosteveo
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { useEffect, useRef, useState } from 'react';
import { Engine, generateTerrain } from 'emergence-engine';
import { EditorProvider, EditorShell } from 'emergence-editor';
import 'emergence-editor/styles.css';
import { colonyDefinitions, TILE_SIZE } from './definitions';
import { setupColonyEngine } from './setup';
import { setupColonyRenderer } from './render';

export function EditorApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [engine, setEngine] = useState<Engine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || engine) return;

    // Create engine
    const newEngine = new Engine({ canvas, tickRate: 20 });

    // Setup Colony game logic (components, systems, AI)
    setupColonyEngine(newEngine);

    // Generate initial world
    generateTerrain(newEngine.tileMap, { width: 64, height: 64, seed: Date.now() });

    // Ensure walkable corridor between colonies
    for (let x = -22; x <= 22; x++) {
      for (let y = -2; y <= 2; y++) {
        if (!newEngine.tileMap.isWalkable(x, y)) {
          newEngine.tileMap.setTerrain(x, y, 'grass');
        }
      }
    }

    // Setup rendering
    setupColonyRenderer(newEngine, canvas, false);

    setEngine(newEngine);

    return () => {
      newEngine.stop();
    };
  }, [engine]);

  return (
    <div className="h-screen w-screen">
      <canvas ref={canvasRef} className="hidden" />
      {engine && (
        <EditorProvider engine={engine} gameDefinitions={colonyDefinitions}>
          <EditorShell />
        </EditorProvider>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/colony/src/EditorApp.tsx
git commit -m "feat(colony): add EditorApp with integrated editor"
```

---

## Task 12: Create Colony Main Entry Point

**Files:**
- Create: `packages/colony/src/main.tsx`
- Keep: `packages/colony/src/main.ts` (rename to `game.ts` for standalone mode)

**Step 1: Rename main.ts to game.ts**

```bash
git mv packages/colony/src/main.ts packages/colony/src/game.ts
```

**Step 2: Create new main.tsx**

```tsx
/*
 * This file is part of Colony.
 * Copyright (C) 2026 astrosteveo
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { EditorApp } from './EditorApp';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <EditorApp />
  </StrictMode>
);
```

**Step 3: Commit**

```bash
git add packages/colony/src/main.tsx packages/colony/src/game.ts
git commit -m "feat(colony): add React entry point for editor mode"
```

---

## Task 13: Add Tailwind and PostCSS to Colony

**Files:**
- Create: `packages/colony/tailwind.config.js`
- Create: `packages/colony/postcss.config.js`
- Modify: `packages/colony/vite.config.ts`

**Step 1: Create tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../editor/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        editor: {
          bg: '#0a0a0f',
          surface: '#1a1a2e',
          border: '#2a2a4e',
          accent: '#4f46e5',
          text: '#e2e8f0',
          'text-muted': '#94a3b8',
          success: '#22c55e',
          warning: '#eab308',
          error: '#ef4444',
        },
      },
    },
  },
  plugins: [],
};
```

**Step 2: Create postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

**Step 3: Update vite.config.ts**

```typescript
/*
 * This file is part of Colony.
 * Copyright (C) 2026 astrosteveo
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist',
  },
});
```

**Step 4: Commit**

```bash
git add packages/colony/tailwind.config.js packages/colony/postcss.config.js packages/colony/vite.config.ts
git commit -m "feat(colony): add Tailwind CSS configuration"
```

---

## Task 14: Install Dependencies and Test Build

**Step 1: Install dependencies**

Run: `npm install`

**Step 2: Build editor first**

Run: `npm run build:editor`
Expected: Build succeeds, creates dist/index.js

**Step 3: Build colony**

Run: `npm run build:colony`
Expected: Build succeeds

**Step 4: Test dev server**

Run: `npm run dev:colony`
Expected: Opens browser with Colony editor UI

**Step 5: Commit any lockfile changes**

```bash
git add package-lock.json
git commit -m "chore: update lockfile after phase 10 dependencies"
```

---

## Task 15: Verify Play/Stop Functionality

**Step 1: Manual test**

1. Run `npm run dev:colony`
2. Open browser to localhost:5173
3. Verify editor UI loads
4. Place some entities using entity mode
5. Click Play button
6. Verify entities start moving (AI activates)
7. Click Stop button
8. Verify world resets to pre-play state

**Step 2: Fix any issues found during testing**

If issues are found, create commits to fix them.

---

## Task 16: Update Documentation

**Files:**
- Modify: `docs/PRD.md`
- Modify: `CLAUDE.md`
- Modify: `README.md`

**Step 1: Update PRD.md**

Mark Phase 10 as complete in the milestones table.

**Step 2: Update CLAUDE.md**

Update current status and add any new gotchas discovered.

**Step 3: Update README.md**

Update the quick start to mention the integrated editor.

**Step 4: Commit**

```bash
git add docs/PRD.md CLAUDE.md README.md
git commit -m "docs: update documentation for Phase 10"
```

---

## Task 17: Final Commit and PR

**Step 1: Verify all changes**

Run: `git status`
Ensure no uncommitted changes.

**Step 2: Push branch**

Run: `git push -u origin feature/phase-10-play-in-editor`

**Step 3: Create PR**

```bash
gh pr create --title "Phase 10: Play-in-Editor" --body "$(cat <<'EOF'
## Summary
- Convert editor from standalone app to reusable component library
- Games embed editor UI and mount with their own engine instance
- Play/Stop toggles game loop with automatic snapshot/restore
- Colony now has integrated editor mode

## Test plan
- [ ] `npm run dev:colony` shows editor UI
- [ ] Can paint terrain and place entities
- [ ] Click Play starts game loop (pawns move, AI runs)
- [ ] Click Stop restores world to pre-play state
- [ ] Undo/redo works in edit mode
EOF
)"
```
