# Phase 8: Tile Painting - Design Document

## Overview

A tile painting system for the Emergence Engine editor that enables hand-crafted level design with terrain and buildings.

## Goals

- **Primary use case:** Level design - creating specific, hand-crafted maps
- Enable users to paint complete map layouts using only the editor UI
- Provide undo/redo for confident iteration
- Feel responsive with no lag when painting

## Features

### Brush-based Painting

- **Sizes:** 1x1, 3x3, 5x5
- **Shapes:** Square and circle
- **Interaction:**
  - Left-click: Paint single stamp
  - Left-drag: Continuous paint stroke (batched as one undo unit)
  - Right-click/drag: Erase
  - Brush preview on hover (ghost overlay)

### Categorized Palette

- **Terrain section:** Shows registered terrain types with color swatch + label
- **Buildings section:** Shows registered building types with color swatch + label
- Clicking terrain deselects any building (and vice versa)
- Selected item gets highlighted border

### Eraser Behavior

- Right-click to erase (power user shortcut)
- Explicit eraser tool in toolbar (discoverability)
- Eraser removes buildings first; if no building, reverts terrain to grass

### Undo/Redo

- Full undo/redo stack (50 entry limit)
- Delta-based: stores only changed tiles, not full snapshots
- Each drag stroke = one undo entry
- Ctrl+Z to undo, Ctrl+Shift+Z to redo

## Out of Scope

- Entity placement (Phase 9)
- Component inspector (Phase 9)
- Custom terrain/building type creation
- Copy/paste regions

## UI Design

### Sidebar Layout

```
┌─────────────────────────┐
│ Tools                   │
│ ─────────────────────── │
│ Mode:  [Paint] [Erase]  │
│                         │
│ Size:  ●1x1 ○3x3 ○5x5   │
│                         │
│ Shape: ●Square ○Circle  │
├─────────────────────────┤
│ Terrain                 │
│ ─────────────────────── │
│ [■ Grass  ] [■ Water ]  │
│ [■ Stone  ] [■ Sand  ]  │
├─────────────────────────┤
│ Buildings               │
│ ─────────────────────── │
│ [■ Wall   ] [■ Floor ]  │
└─────────────────────────┘
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
| 1/2/3 | Switch brush size |
| E | Toggle eraser mode |

### Status Bar

Shows current brush info: "Brush: Grass 3x3 Square"

## Architecture

### Editor State (EditorContext)

```typescript
interface EditorState {
  // Existing
  engine: Engine | null;
  mode: 'edit' | 'play';
  project: { name: string; savedAt: string | null; modified: boolean };
  mouseWorldPos: { x: number; y: number } | null;
  currentSave: EmergenceSaveFile | null;

  // New for Phase 8
  tool: 'paint' | 'erase';
  brushSize: 1 | 3 | 5;
  brushShape: 'square' | 'circle';
  selectedTerrain: string | null;
  selectedBuilding: string | null;
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
}
```

### Undo System (Delta-based)

```typescript
interface TileChange {
  x: number;
  y: number;
  before: { terrain?: number; building?: number | null };
  after: { terrain?: number; building?: number | null };
}

interface UndoEntry {
  type: 'paint';
  changes: TileChange[];
}
```

### Brush Tile Calculation

```typescript
function getBrushTiles(centerX: number, centerY: number, size: 1 | 3 | 5, shape: 'square' | 'circle'): Array<{x: number, y: number}> {
  const radius = Math.floor(size / 2);
  const tiles = [];

  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      if (shape === 'circle') {
        if (dx * dx + dy * dy <= radius * radius) {
          tiles.push({ x: centerX + dx, y: centerY + dy });
        }
      } else {
        tiles.push({ x: centerX + dx, y: centerY + dy });
      }
    }
  }
  return tiles;
}
```

## File Changes

### New Files

```
packages/editor/src/
├── components/
│   ├── ToolsPanel.tsx      # Paint/erase toggle, brush size/shape
│   ├── TerrainPalette.tsx  # Terrain type grid with selection
│   └── BuildingPalette.tsx # Building type grid with selection
├── hooks/
│   └── useUndo.ts          # Undo/redo stack management
└── utils/
    └── brush.ts            # getBrushTiles, circle/square math
```

### Modified Files

```
packages/editor/src/
├── components/
│   ├── Sidebar.tsx         # Replace placeholder with real panels
│   ├── Viewport.tsx        # Add paint handlers, brush preview
│   └── StatusBar.tsx       # Show current brush info
├── hooks/
│   └── useEditorContext.tsx # Add tool/brush/selection state
└── styles/
    └── index.css           # Palette item styles, selection states
```

### No Engine Changes

Phase 8 is purely editor-side. The engine's TileMap API already supports:
- `tileMap.setTerrain(x, y, terrainId)`
- `tileMap.setBuilding(x, y, buildingId)`
- `tileMap.getTerrainDefs()` / `getBuildingDefs()`

## Success Criteria

- [ ] User can select terrain/building types from palette
- [ ] Brush sizes (1x1, 3x3, 5x5) work correctly
- [ ] Both square and circle brush shapes work
- [ ] Left-click paints, right-click erases
- [ ] Drag creates continuous strokes
- [ ] Brush preview shows on hover
- [ ] Undo/redo works across all paint operations
- [ ] Keyboard shortcuts work (Ctrl+Z, Ctrl+Shift+Z, 1/2/3, E)
- [ ] Modified indicator (*) appears after painting
- [ ] Painted changes persist through save/load
