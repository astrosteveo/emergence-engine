# Phase 8: Tile Painting Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add brush-based tile painting to the editor with undo/redo support.

**Architecture:** Editor-only changes. New state in EditorContext for tool/brush/selection. Undo system uses delta-based entries (stores changed tiles, not full snapshots). Sidebar gets three new panel components. Viewport handles mouse events for painting.

**Tech Stack:** React, TypeScript, Tailwind CSS, emergence-engine TileMap API

---

## Task 1: Brush Utility Functions

Create the brush tile calculation utility that determines which tiles are affected by a brush stroke.

**Files:**
- Create: `packages/editor/src/utils/brush.ts`

**Step 1: Create the brush utility file**

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

export type BrushSize = 1 | 3 | 5;
export type BrushShape = 'square' | 'circle';

export interface TileCoord {
  x: number;
  y: number;
}

/**
 * Returns all tile coordinates affected by a brush centered at (centerX, centerY).
 * For size 1, returns just the center tile.
 * For size 3, returns a 3x3 area (or circle approximation).
 * For size 5, returns a 5x5 area (or circle approximation).
 */
export function getBrushTiles(
  centerX: number,
  centerY: number,
  size: BrushSize,
  shape: BrushShape
): TileCoord[] {
  const radius = Math.floor(size / 2);
  const tiles: TileCoord[] = [];

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (shape === 'circle') {
        // Include tile if within circular radius
        if (dx * dx + dy * dy <= radius * radius) {
          tiles.push({ x: centerX + dx, y: centerY + dy });
        }
      } else {
        // Square: include all tiles in the bounding box
        tiles.push({ x: centerX + dx, y: centerY + dy });
      }
    }
  }

  return tiles;
}
```

**Step 2: Verify the file was created**

Run: `ls packages/editor/src/utils/`
Expected: `brush.ts`

**Step 3: Commit**

```bash
git add packages/editor/src/utils/brush.ts
git commit -m "feat(editor): add brush utility functions for tile painting"
```

---

## Task 2: Undo System Types and Hook

Create the undo/redo system with delta-based change tracking.

**Files:**
- Create: `packages/editor/src/hooks/useUndo.ts`

**Step 1: Create the undo hook**

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

import { useState, useCallback } from 'react';
import type { Engine } from 'emergence-engine';

const MAX_UNDO_ENTRIES = 50;

export interface TileChange {
  x: number;
  y: number;
  before: {
    terrainName: string | null;
    buildingName: string | null;
  };
  after: {
    terrainName: string | null;
    buildingName: string | null;
  };
}

export interface UndoEntry {
  type: 'paint';
  changes: TileChange[];
}

export interface UndoState {
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
}

export interface UndoActions {
  pushEntry: (entry: UndoEntry) => void;
  undo: (engine: Engine) => void;
  redo: (engine: Engine) => void;
  canUndo: boolean;
  canRedo: boolean;
  clear: () => void;
}

function applyTileState(
  engine: Engine,
  x: number,
  y: number,
  state: { terrainName: string | null; buildingName: string | null }
): void {
  if (state.terrainName) {
    engine.tileMap.setTerrain(x, y, state.terrainName);
  }
  if (state.buildingName) {
    engine.tileMap.setBuilding(x, y, state.buildingName);
  } else {
    engine.tileMap.clearBuilding(x, y);
  }
}

export function useUndo(): [UndoState, UndoActions] {
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [redoStack, setRedoStack] = useState<UndoEntry[]>([]);

  const pushEntry = useCallback((entry: UndoEntry) => {
    setUndoStack((prev) => {
      const next = [...prev, entry];
      // Limit stack size
      if (next.length > MAX_UNDO_ENTRIES) {
        return next.slice(next.length - MAX_UNDO_ENTRIES);
      }
      return next;
    });
    // Clear redo stack on new action
    setRedoStack([]);
  }, []);

  const undo = useCallback((engine: Engine) => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;

      const entry = prev[prev.length - 1];
      const remaining = prev.slice(0, -1);

      // Apply before states
      for (const change of entry.changes) {
        applyTileState(engine, change.x, change.y, change.before);
      }

      // Push to redo stack
      setRedoStack((redo) => [...redo, entry]);

      return remaining;
    });
  }, []);

  const redo = useCallback((engine: Engine) => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;

      const entry = prev[prev.length - 1];
      const remaining = prev.slice(0, -1);

      // Apply after states
      for (const change of entry.changes) {
        applyTileState(engine, change.x, change.y, change.after);
      }

      // Push back to undo stack
      setUndoStack((undo) => [...undo, entry]);

      return remaining;
    });
  }, []);

  const clear = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  return [
    { undoStack, redoStack },
    {
      pushEntry,
      undo,
      redo,
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,
      clear,
    },
  ];
}
```

**Step 2: Verify the file was created**

Run: `ls packages/editor/src/hooks/`
Expected: `useEditorContext.tsx useUndo.ts`

**Step 3: Commit**

```bash
git add packages/editor/src/hooks/useUndo.ts
git commit -m "feat(editor): add undo/redo hook with delta-based change tracking"
```

---

## Task 3: Extend Editor Context with Painting State

Add tool, brush, and selection state to the editor context.

**Files:**
- Modify: `packages/editor/src/hooks/useEditorContext.tsx`

**Step 1: Add imports and types**

Add after line 27 (`import type { EmergenceSaveFile } from 'emergence-engine';`):

```typescript
import { useUndo, type UndoState, type UndoActions, type UndoEntry } from './useUndo';
import type { BrushSize, BrushShape } from '../utils/brush';

export type EditorTool = 'paint' | 'erase';
```

**Step 2: Extend EditorContextValue interface**

Replace the `EditorContextValue` interface (lines 37-48) with:

```typescript
interface EditorContextValue {
  engine: Engine | null;
  setEngine: (engine: Engine | null) => void;
  mode: EditorMode;
  setMode: (mode: EditorMode) => void;
  project: ProjectInfo;
  setProject: (info: Partial<ProjectInfo>) => void;
  mouseWorldPos: { x: number; y: number } | null;
  setMouseWorldPos: (pos: { x: number; y: number } | null) => void;
  currentSave: EmergenceSaveFile | null;
  setCurrentSave: (save: EmergenceSaveFile | null) => void;
  // Painting state (Phase 8)
  tool: EditorTool;
  setTool: (tool: EditorTool) => void;
  brushSize: BrushSize;
  setBrushSize: (size: BrushSize) => void;
  brushShape: BrushShape;
  setBrushShape: (shape: BrushShape) => void;
  selectedTerrain: string | null;
  setSelectedTerrain: (name: string | null) => void;
  selectedBuilding: string | null;
  setSelectedBuilding: (name: string | null) => void;
  // Undo system
  undoState: UndoState;
  undoActions: UndoActions;
}
```

**Step 3: Add state hooks in EditorProvider**

Add after line 61 (`const [currentSave, setCurrentSave] = useState<EmergenceSaveFile | null>(null);`):

```typescript
  // Painting state
  const [tool, setTool] = useState<EditorTool>('paint');
  const [brushSize, setBrushSize] = useState<BrushSize>(1);
  const [brushShape, setBrushShape] = useState<BrushShape>('square');
  const [selectedTerrain, setSelectedTerrainState] = useState<string | null>('grass');
  const [selectedBuilding, setSelectedBuildingState] = useState<string | null>(null);

  // Undo system
  const [undoState, undoActions] = useUndo();

  // Selection handlers - terrain and building are mutually exclusive
  const setSelectedTerrain = useCallback((name: string | null) => {
    setSelectedTerrainState(name);
    if (name) {
      setSelectedBuildingState(null);
    }
  }, []);

  const setSelectedBuilding = useCallback((name: string | null) => {
    setSelectedBuildingState(name);
    if (name) {
      setSelectedTerrainState(null);
    }
  }, []);
```

**Step 4: Update the Provider value**

Replace the Provider value object (inside `<EditorContext.Provider value={...}>`) with:

```typescript
      value={{
        engine,
        setEngine,
        mode,
        setMode,
        project,
        setProject,
        mouseWorldPos,
        setMouseWorldPos,
        currentSave,
        setCurrentSave,
        tool,
        setTool,
        brushSize,
        setBrushSize,
        brushShape,
        setBrushShape,
        selectedTerrain,
        setSelectedTerrain,
        selectedBuilding,
        setSelectedBuilding,
        undoState,
        undoActions,
      }}
```

**Step 5: Verify build**

Run: `npm run build:editor`
Expected: Build succeeds with no errors

**Step 6: Commit**

```bash
git add packages/editor/src/hooks/useEditorContext.tsx
git commit -m "feat(editor): extend context with painting state and undo system"
```

---

## Task 4: Tools Panel Component

Create the tools panel with paint/erase toggle, brush size, and brush shape controls.

**Files:**
- Create: `packages/editor/src/components/ToolsPanel.tsx`

**Step 1: Create the component**

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

import { useEditor } from '../hooks/useEditorContext';
import type { BrushSize, BrushShape } from '../utils/brush';

const BRUSH_SIZES: BrushSize[] = [1, 3, 5];
const BRUSH_SHAPES: BrushShape[] = ['square', 'circle'];

export function ToolsPanel() {
  const { tool, setTool, brushSize, setBrushSize, brushShape, setBrushShape } = useEditor();

  return (
    <div className="p-3 border-b border-editor-border">
      <h3 className="text-xs font-semibold text-editor-text-muted uppercase tracking-wider mb-3">
        Tools
      </h3>

      {/* Paint/Erase toggle */}
      <div className="mb-3">
        <label className="text-xs text-editor-text-muted mb-1 block">Mode</label>
        <div className="flex gap-1">
          <button
            className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
              tool === 'paint'
                ? 'bg-editor-primary text-white'
                : 'bg-editor-accent text-editor-text hover:bg-editor-border'
            }`}
            onClick={() => setTool('paint')}
          >
            Paint
          </button>
          <button
            className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
              tool === 'erase'
                ? 'bg-editor-error text-white'
                : 'bg-editor-accent text-editor-text hover:bg-editor-border'
            }`}
            onClick={() => setTool('erase')}
          >
            Erase
          </button>
        </div>
      </div>

      {/* Brush size */}
      <div className="mb-3">
        <label className="text-xs text-editor-text-muted mb-1 block">Size</label>
        <div className="flex gap-1">
          {BRUSH_SIZES.map((size) => (
            <button
              key={size}
              className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                brushSize === size
                  ? 'bg-editor-primary text-white'
                  : 'bg-editor-accent text-editor-text hover:bg-editor-border'
              }`}
              onClick={() => setBrushSize(size)}
            >
              {size}x{size}
            </button>
          ))}
        </div>
      </div>

      {/* Brush shape */}
      <div>
        <label className="text-xs text-editor-text-muted mb-1 block">Shape</label>
        <div className="flex gap-1">
          {BRUSH_SHAPES.map((shape) => (
            <button
              key={shape}
              className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                brushShape === shape
                  ? 'bg-editor-primary text-white'
                  : 'bg-editor-accent text-editor-text hover:bg-editor-border'
              }`}
              onClick={() => setBrushShape(shape)}
            >
              {shape === 'square' ? '■' : '●'} {shape.charAt(0).toUpperCase() + shape.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify the file was created**

Run: `ls packages/editor/src/components/ToolsPanel.tsx`
Expected: File exists

**Step 3: Commit**

```bash
git add packages/editor/src/components/ToolsPanel.tsx
git commit -m "feat(editor): add ToolsPanel component with paint/erase and brush controls"
```

---

## Task 5: Terrain Palette Component

Create the terrain palette that displays available terrain types.

**Files:**
- Create: `packages/editor/src/components/TerrainPalette.tsx`

**Step 1: Create the component**

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

import { useEditor } from '../hooks/useEditorContext';

export function TerrainPalette() {
  const { engine, selectedTerrain, setSelectedTerrain, setTool } = useEditor();

  const terrainDefs = engine?.tileMap.getAllTerrainDefs() ?? [];

  const handleSelect = (name: string) => {
    setSelectedTerrain(name);
    setTool('paint');
  };

  return (
    <div className="p-3 border-b border-editor-border">
      <h3 className="text-xs font-semibold text-editor-text-muted uppercase tracking-wider mb-2">
        Terrain
      </h3>
      <div className="grid grid-cols-2 gap-1">
        {terrainDefs.map((def) => (
          <button
            key={def.name}
            className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
              selectedTerrain === def.name
                ? 'ring-2 ring-editor-primary bg-editor-accent'
                : 'bg-editor-surface hover:bg-editor-accent'
            }`}
            onClick={() => handleSelect(def.name)}
          >
            <span
              className="w-4 h-4 rounded border border-editor-border"
              style={{ backgroundColor: def.color }}
            />
            <span className="text-editor-text capitalize">{def.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/editor/src/components/TerrainPalette.tsx
git commit -m "feat(editor): add TerrainPalette component"
```

---

## Task 6: Building Palette Component

Create the building palette that displays available building types.

**Files:**
- Create: `packages/editor/src/components/BuildingPalette.tsx`

**Step 1: Create the component**

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

import { useEditor } from '../hooks/useEditorContext';

export function BuildingPalette() {
  const { engine, selectedBuilding, setSelectedBuilding, setTool } = useEditor();

  const buildingDefs = engine?.tileMap.getAllBuildingDefs() ?? [];

  const handleSelect = (name: string) => {
    setSelectedBuilding(name);
    setTool('paint');
  };

  return (
    <div className="p-3 border-b border-editor-border">
      <h3 className="text-xs font-semibold text-editor-text-muted uppercase tracking-wider mb-2">
        Buildings
      </h3>
      <div className="grid grid-cols-2 gap-1">
        {buildingDefs.map((def) => (
          <button
            key={def.name}
            className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
              selectedBuilding === def.name
                ? 'ring-2 ring-editor-primary bg-editor-accent'
                : 'bg-editor-surface hover:bg-editor-accent'
            }`}
            onClick={() => handleSelect(def.name)}
          >
            <span
              className="w-4 h-4 rounded border border-editor-border"
              style={{ backgroundColor: def.color }}
            />
            <span className="text-editor-text capitalize">{def.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/editor/src/components/BuildingPalette.tsx
git commit -m "feat(editor): add BuildingPalette component"
```

---

## Task 7: Update Sidebar to Use New Panels

Replace the placeholder sidebar content with the real painting panels.

**Files:**
- Modify: `packages/editor/src/components/Sidebar.tsx`

**Step 1: Replace entire Sidebar.tsx content**

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

import { ToolsPanel } from './ToolsPanel';
import { TerrainPalette } from './TerrainPalette';
import { BuildingPalette } from './BuildingPalette';

export function Sidebar() {
  return (
    <div className="w-64 bg-editor-surface border-r border-editor-border flex flex-col overflow-y-auto">
      <ToolsPanel />
      <TerrainPalette />
      <BuildingPalette />

      {/* Entity palette placeholder */}
      <div className="p-3 border-b border-editor-border flex-1">
        <h3 className="text-xs font-semibold text-editor-text-muted uppercase tracking-wider mb-2">
          Entities
        </h3>
        <div className="text-sm text-editor-text-muted italic">
          Entity placement coming in Phase 9
        </div>
      </div>

      {/* Inspector placeholder */}
      <div className="p-3">
        <h3 className="text-xs font-semibold text-editor-text-muted uppercase tracking-wider mb-2">
          Inspector
        </h3>
        <div className="text-sm text-editor-text-muted italic">
          Select an entity to inspect
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npm run build:editor`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add packages/editor/src/components/Sidebar.tsx
git commit -m "feat(editor): integrate painting panels into Sidebar"
```

---

## Task 8: Add Painting Logic to Viewport

Add mouse event handlers for painting, erasing, and brush preview to the Viewport.

**Files:**
- Modify: `packages/editor/src/components/Viewport.tsx`

**Step 1: Add imports**

Add after line 19 (`import { useEditor } from '../hooks/useEditorContext';`):

```typescript
import { getBrushTiles } from '../utils/brush';
import type { TileChange } from '../hooks/useUndo';
```

**Step 2: Extend useEditor destructuring**

Replace line 28:
```typescript
const { engine, setEngine, mode, setMouseWorldPos, setProject } = useEditor();
```

With:
```typescript
  const {
    engine,
    setEngine,
    mode,
    setMouseWorldPos,
    setProject,
    tool,
    brushSize,
    brushShape,
    selectedTerrain,
    selectedBuilding,
    undoActions,
  } = useEditor();
```

**Step 3: Add painting refs and state**

Add after line 28 (the useEditor call):

```typescript
  // Painting state
  const isPaintingRef = useRef(false);
  const strokeChangesRef = useRef<TileChange[]>([]);
  const paintedTilesRef = useRef<Set<string>>(new Set());
  const [hoverTile, setHoverTile] = useState<{ x: number; y: number } | null>(null);
```

Also add `useState` to the React imports at line 19:
```typescript
import { useRef, useEffect, useCallback, useState } from 'react';
```

**Step 4: Add the painting helper function**

Add before the `return` statement (around line 225):

```typescript
  // Capture current tile state for undo
  const captureTileState = useCallback(
    (x: number, y: number) => {
      if (!engine) return { terrainName: null, buildingName: null };
      const terrain = engine.tileMap.getTerrain(x, y);
      const building = engine.tileMap.getBuilding(x, y);
      return {
        terrainName: terrain?.name ?? null,
        buildingName: building?.name ?? null,
      };
    },
    [engine]
  );

  // Paint a single tile (terrain or building)
  const paintTile = useCallback(
    (tileX: number, tileY: number) => {
      if (!engine || mode !== 'edit') return;
      if (!engine.tileMap.isInBounds(tileX, tileY)) return;

      const tileKey = `${tileX},${tileY}`;
      if (paintedTilesRef.current.has(tileKey)) return;
      paintedTilesRef.current.add(tileKey);

      const before = captureTileState(tileX, tileY);

      if (tool === 'erase') {
        // Erase: remove building first, then revert terrain to grass
        const building = engine.tileMap.getBuilding(tileX, tileY);
        if (building) {
          engine.tileMap.clearBuilding(tileX, tileY);
        } else {
          engine.tileMap.setTerrain(tileX, tileY, 'grass');
        }
      } else if (selectedBuilding) {
        engine.tileMap.setBuilding(tileX, tileY, selectedBuilding);
      } else if (selectedTerrain) {
        engine.tileMap.setTerrain(tileX, tileY, selectedTerrain);
      }

      const after = captureTileState(tileX, tileY);

      // Only record if something changed
      if (before.terrainName !== after.terrainName || before.buildingName !== after.buildingName) {
        strokeChangesRef.current.push({ x: tileX, y: tileY, before, after });
      }
    },
    [engine, mode, tool, selectedTerrain, selectedBuilding, captureTileState]
  );

  // Paint all tiles under the brush
  const paintBrush = useCallback(
    (centerX: number, centerY: number) => {
      const tiles = getBrushTiles(centerX, centerY, brushSize, brushShape);
      for (const tile of tiles) {
        paintTile(tile.x, tile.y);
      }
    },
    [brushSize, brushShape, paintTile]
  );

  // Commit the current stroke to undo stack
  const commitStroke = useCallback(() => {
    if (strokeChangesRef.current.length > 0) {
      undoActions.pushEntry({ type: 'paint', changes: [...strokeChangesRef.current] });
      setProject({ modified: true });
    }
    strokeChangesRef.current = [];
    paintedTilesRef.current.clear();
  }, [undoActions, setProject]);
```

**Step 5: Add mouse event handlers**

Add after the `commitStroke` function:

```typescript
  // Mouse down: start painting
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!engine || mode !== 'edit') return;
      if (e.button !== 0 && e.button !== 2) return; // Only left or right click

      const rect = e.currentTarget.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldPos = engine.camera.screenToWorld(screenX, screenY);
      const tilePos = engine.camera.worldToTile(worldPos.x, worldPos.y, TILE_SIZE);

      isPaintingRef.current = true;
      strokeChangesRef.current = [];
      paintedTilesRef.current.clear();

      // Right-click forces erase mode for this stroke
      if (e.button === 2) {
        const originalTool = tool;
        // Temporarily switch to erase
        const tiles = getBrushTiles(tilePos.x, tilePos.y, brushSize, brushShape);
        for (const tile of tiles) {
          if (!engine.tileMap.isInBounds(tile.x, tile.y)) continue;
          const tileKey = `${tile.x},${tile.y}`;
          paintedTilesRef.current.add(tileKey);

          const before = captureTileState(tile.x, tile.y);
          const building = engine.tileMap.getBuilding(tile.x, tile.y);
          if (building) {
            engine.tileMap.clearBuilding(tile.x, tile.y);
          } else {
            engine.tileMap.setTerrain(tile.x, tile.y, 'grass');
          }
          const after = captureTileState(tile.x, tile.y);

          if (before.terrainName !== after.terrainName || before.buildingName !== after.buildingName) {
            strokeChangesRef.current.push({ x: tile.x, y: tile.y, before, after });
          }
        }
      } else {
        paintBrush(tilePos.x, tilePos.y);
      }
    },
    [engine, mode, tool, brushSize, brushShape, captureTileState, paintBrush]
  );

  // Mouse move: continue painting if dragging
  const handleMouseMovePaint = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!engine) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldPos = engine.camera.screenToWorld(screenX, screenY);
      const tilePos = engine.camera.worldToTile(worldPos.x, worldPos.y, TILE_SIZE);

      setHoverTile(tilePos);
      setMouseWorldPos(worldPos);

      if (isPaintingRef.current && mode === 'edit') {
        // Check if right button is held (for erase)
        if (e.buttons === 2) {
          const tiles = getBrushTiles(tilePos.x, tilePos.y, brushSize, brushShape);
          for (const tile of tiles) {
            if (!engine.tileMap.isInBounds(tile.x, tile.y)) continue;
            const tileKey = `${tile.x},${tile.y}`;
            if (paintedTilesRef.current.has(tileKey)) continue;
            paintedTilesRef.current.add(tileKey);

            const before = captureTileState(tile.x, tile.y);
            const building = engine.tileMap.getBuilding(tile.x, tile.y);
            if (building) {
              engine.tileMap.clearBuilding(tile.x, tile.y);
            } else {
              engine.tileMap.setTerrain(tile.x, tile.y, 'grass');
            }
            const after = captureTileState(tile.x, tile.y);

            if (before.terrainName !== after.terrainName || before.buildingName !== after.buildingName) {
              strokeChangesRef.current.push({ x: tile.x, y: tile.y, before, after });
            }
          }
        } else {
          paintBrush(tilePos.x, tilePos.y);
        }
      }
    },
    [engine, mode, brushSize, brushShape, captureTileState, paintBrush, setMouseWorldPos]
  );

  // Mouse up: commit stroke
  const handleMouseUp = useCallback(() => {
    if (isPaintingRef.current) {
      isPaintingRef.current = false;
      commitStroke();
    }
  }, [commitStroke]);

  // Mouse leave: commit stroke and clear hover
  const handleMouseLeavePaint = useCallback(() => {
    setMouseWorldPos(null);
    setHoverTile(null);
    if (isPaintingRef.current) {
      isPaintingRef.current = false;
      commitStroke();
    }
  }, [setMouseWorldPos, commitStroke]);

  // Prevent context menu on right-click
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);
```

**Step 6: Add brush preview rendering**

Find the `newEngine.onDraw(() => {` callback (around line 51) and add brush preview rendering after the entity rendering loop, before the closing `});`:

Add this after the entity rendering for loop (after line 107):

```typescript
      // Draw brush preview in edit mode
      if (mode === 'edit' && hoverTile) {
        const previewTiles = getBrushTiles(hoverTile.x, hoverTile.y, brushSize, brushShape);
        for (const tile of previewTiles) {
          if (!tileMap.isInBounds(tile.x, tile.y)) continue;

          const screenPos = camera.worldToScreen(tile.x * TILE_SIZE, tile.y * TILE_SIZE);
          const size = TILE_SIZE * camera.zoom;

          // Draw preview overlay
          const previewColor = tool === 'erase' ? '#ef444480' : '#4f46e580';
          renderer.drawRectScreen(screenPos.x, screenPos.y, size, size, previewColor);
        }
      }
```

Note: The onDraw callback needs access to the current state. Since it's defined inside useEffect, we need to move the brush preview rendering to the draw loop. However, the onDraw callback captures initial values.

**Step 6b: Fix the brush preview by moving it outside onDraw**

The onDraw callback is created once during engine initialization, so it can't access changing React state. Instead, we need to draw the brush preview in the separate edit-mode animation frame.

Find the edit-mode draw loop (around line 210-227) and replace it:

```typescript
  // Trigger draw frame for edit mode
  useEffect(() => {
    if (!engine || mode !== 'edit') return;

    let animationId: number;
    const drawFrame = () => {
      // In edit mode, we still need to render even though the game loop is stopped
      engine.loop.drawOnce?.();

      // Draw brush preview on top
      if (hoverTile) {
        const ctx = engine.renderer.getContext();
        const camera = engine.camera;
        const tileMap = engine.tileMap;

        const previewTiles = getBrushTiles(hoverTile.x, hoverTile.y, brushSize, brushShape);
        for (const tile of previewTiles) {
          if (!tileMap.isInBounds(tile.x, tile.y)) continue;

          const screenPos = camera.worldToScreen(tile.x * TILE_SIZE, tile.y * TILE_SIZE);
          const size = TILE_SIZE * camera.zoom;

          ctx.fillStyle = tool === 'erase' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(79, 70, 229, 0.5)';
          ctx.fillRect(screenPos.x, screenPos.y, size, size);
        }
      }

      animationId = requestAnimationFrame(drawFrame);
    };

    drawFrame();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [engine, mode, hoverTile, brushSize, brushShape, tool]);
```

**Step 7: Update canvas event handlers in JSX**

Replace the canvas element (around line 230-237):

```typescript
      <canvas
        ref={canvasRef}
        className="block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMovePaint}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeavePaint}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      />
```

**Step 8: Verify build**

Run: `npm run build:editor`
Expected: Build succeeds

**Step 9: Commit**

```bash
git add packages/editor/src/components/Viewport.tsx
git commit -m "feat(editor): add tile painting with brush preview to Viewport"
```

---

## Task 9: Add Keyboard Shortcuts

Add keyboard shortcuts for undo/redo and brush controls.

**Files:**
- Modify: `packages/editor/src/components/Viewport.tsx`

**Step 1: Extend the keyboard handler**

Find the `handleKeyDown` function in the keyboard controls useEffect (around line 179-207).

Replace the entire useEffect block:

```typescript
  // Handle keyboard controls for camera panning and shortcuts
  useEffect(() => {
    if (!engine) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const panSpeed = 16;

      // Undo/Redo
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          undoActions.undo(engine);
          return;
        }
        if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
          e.preventDefault();
          undoActions.redo(engine);
          return;
        }
      }

      // Brush size shortcuts
      if (e.key === '1') {
        setBrushSize(1);
        return;
      }
      if (e.key === '2') {
        setBrushSize(3);
        return;
      }
      if (e.key === '3') {
        setBrushSize(5);
        return;
      }

      // Toggle eraser
      if (e.key === 'e' || e.key === 'E') {
        setTool(tool === 'erase' ? 'paint' : 'erase');
        return;
      }

      // Camera panning
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          engine.camera.pan(0, -panSpeed);
          setProject({ modified: true });
          break;
        case 'ArrowDown':
        case 's':
          engine.camera.pan(0, panSpeed);
          setProject({ modified: true });
          break;
        case 'ArrowLeft':
        case 'a':
          engine.camera.pan(-panSpeed, 0);
          setProject({ modified: true });
          break;
        case 'ArrowRight':
        case 'd':
          engine.camera.pan(panSpeed, 0);
          setProject({ modified: true });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine, setProject, undoActions, tool, setTool, setBrushSize]);
```

**Step 2: Add missing state to useEditor destructuring**

Update the useEditor call to include `setTool` and `setBrushSize` if not already present:

```typescript
  const {
    engine,
    setEngine,
    mode,
    setMouseWorldPos,
    setProject,
    tool,
    setTool,
    brushSize,
    setBrushSize,
    brushShape,
    selectedTerrain,
    selectedBuilding,
    undoActions,
  } = useEditor();
```

**Step 3: Verify build**

Run: `npm run build:editor`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add packages/editor/src/components/Viewport.tsx
git commit -m "feat(editor): add keyboard shortcuts for undo/redo and brush controls"
```

---

## Task 10: Update Status Bar with Brush Info

Show the current brush selection in the status bar.

**Files:**
- Modify: `packages/editor/src/components/StatusBar.tsx`

**Step 1: Replace entire StatusBar.tsx content**

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

import { useEditor } from '../hooks/useEditorContext';

export function StatusBar() {
  const {
    engine,
    mode,
    mouseWorldPos,
    tool,
    brushSize,
    brushShape,
    selectedTerrain,
    selectedBuilding,
  } = useEditor();

  const tilePos =
    mouseWorldPos && engine
      ? engine.camera.worldToTile(mouseWorldPos.x, mouseWorldPos.y, 16)
      : null;

  const zoom = engine?.camera.zoom ?? 1;
  const entityCount = engine?.ecs.getAllEntities().length ?? 0;

  // Build brush info string
  const getBrushInfo = () => {
    if (tool === 'erase') {
      return `Eraser ${brushSize}x${brushSize} ${brushShape}`;
    }
    const selection = selectedBuilding || selectedTerrain || 'None';
    return `Brush: ${selection} ${brushSize}x${brushSize} ${brushShape}`;
  };

  return (
    <div className="h-6 bg-editor-surface border-t border-editor-border flex items-center px-3 text-xs text-editor-text-muted gap-6">
      {/* Mode indicator */}
      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${
            mode === 'play' ? 'bg-editor-success animate-pulse' : 'bg-editor-text-muted'
          }`}
        />
        <span className="uppercase">{mode}</span>
      </div>

      {/* Brush info */}
      <div className="text-editor-text">{getBrushInfo()}</div>

      {/* Tile coordinates */}
      <div>
        {tilePos ? (
          <span>
            Tile: ({tilePos.x}, {tilePos.y})
          </span>
        ) : (
          <span>Tile: --</span>
        )}
      </div>

      {/* Zoom level */}
      <div>Zoom: {zoom}x</div>

      {/* Entity count */}
      <div>Entities: {entityCount}</div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Engine info */}
      <div>Emergence Engine v0.1.0</div>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npm run build:editor`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add packages/editor/src/components/StatusBar.tsx
git commit -m "feat(editor): show brush info in StatusBar"
```

---

## Task 11: Final Build and Manual Testing

Verify the complete feature works end-to-end.

**Step 1: Full build**

Run: `npm run build`
Expected: All packages build successfully

**Step 2: Start dev server**

Run: `npm run dev:editor`
Expected: Editor opens in browser at localhost:5173

**Step 3: Manual testing checklist**

Test each feature:

- [ ] Tools panel shows Paint/Erase toggle
- [ ] Brush size buttons (1x1, 3x3, 5x5) work
- [ ] Brush shape buttons (Square, Circle) work
- [ ] Terrain palette shows grass, water, stone, sand
- [ ] Building palette shows wall, floor
- [ ] Clicking terrain selects it and deselects building
- [ ] Clicking building selects it and deselects terrain
- [ ] Left-click paints selected terrain/building
- [ ] Left-drag paints continuous stroke
- [ ] Right-click erases (building first, then terrain to grass)
- [ ] Right-drag erases continuously
- [ ] Brush preview shows on hover
- [ ] Ctrl+Z undoes last stroke
- [ ] Ctrl+Shift+Z redoes
- [ ] Keys 1/2/3 change brush size
- [ ] Key E toggles eraser
- [ ] Status bar shows brush info
- [ ] Modified indicator (*) appears after painting
- [ ] Save/Load preserves painted tiles

**Step 4: Commit any fixes if needed**

---

## Task 12: Update Documentation

Update PRD.md to mark Phase 8 as complete.

**Files:**
- Modify: `docs/PRD.md`

**Step 1: Update Phase 8 status**

Find the Phase 8 row in the Milestone 2 table and change:
```
| Tile painting | 🔲 Planned | Paint terrain, place buildings (Phase 8) |
```

To:
```
| Tile painting | ✅ Done | Paint terrain, place buildings |
```

**Step 2: Commit**

```bash
git add docs/PRD.md
git commit -m "docs(prd): mark Phase 8 tile painting as complete"
```

---

## Summary

This plan implements tile painting in 12 tasks:

1. Brush utility functions
2. Undo system hook
3. Extend editor context with painting state
4. Tools panel component
5. Terrain palette component
6. Building palette component
7. Update Sidebar to use new panels
8. Add painting logic to Viewport
9. Add keyboard shortcuts
10. Update StatusBar with brush info
11. Final build and testing
12. Update documentation

Each task is self-contained and can be committed independently.
