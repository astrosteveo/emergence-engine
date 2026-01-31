# Phase 9: Entity Placement & Inspector - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add entity placement and component inspection to the editor via template-based spawning and a right sidebar inspector.

**Architecture:** Games register entity templates with the editor context. Left sidebar gains EntityPalette for template selection. Right sidebar contains EntityList (all entities) and Inspector (edit selected entity's component fields). Viewport gains entity selection and placement preview.

**Tech Stack:** React, TypeScript, Tailwind CSS, emergence-engine ECS

---

## Task 1: Define Entity Template Types

**Files:**
- Create: `packages/editor/src/types/templates.ts`

**Step 1: Create the types file**

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

export interface ComponentTemplate {
  type: string;
  defaults: Record<string, unknown>;
  readonly?: boolean;
}

export interface EntityTemplate {
  name: string;
  label: string;
  icon?: string;
  components: ComponentTemplate[];
}
```

**Step 2: Commit**

```bash
git add packages/editor/src/types/templates.ts
git commit -m "feat(editor): add entity template types"
```

---

## Task 2: Extend Editor Context with Entity State

**Files:**
- Modify: `packages/editor/src/hooks/useEditorContext.tsx`

**Step 1: Add imports and extend EditorTool type**

At the top of the file (after existing imports), add:

```typescript
import type { Entity } from 'emergence-engine';
import type { EntityTemplate } from '../types/templates';
```

Change the `EditorTool` type from:
```typescript
export type EditorTool = 'paint' | 'erase';
```
to:
```typescript
export type EditorTool = 'paint' | 'erase' | 'entity';
```

**Step 2: Extend EditorContextValue interface**

Add these fields to the `EditorContextValue` interface (after `undoActions`):

```typescript
  // Entity placement (Phase 9)
  entityTemplates: EntityTemplate[];
  registerEntityTemplates: (templates: EntityTemplate[]) => void;
  selectedTemplate: string | null;
  selectTemplate: (name: string | null) => void;
  selectedEntityId: Entity | null;
  selectEntity: (id: Entity | null) => void;
  deleteSelectedEntity: () => void;
```

**Step 3: Add state and callbacks in EditorProvider**

After the undo system state (`const [undoState, undoActions] = useUndo();`), add:

```typescript
  // Entity placement state
  const [entityTemplates, setEntityTemplates] = useState<EntityTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<Entity | null>(null);

  const registerEntityTemplates = useCallback((templates: EntityTemplate[]) => {
    setEntityTemplates(templates);
  }, []);

  const selectTemplate = useCallback((name: string | null) => {
    setSelectedTemplate(name);
    if (name) {
      setTool('entity');
    }
  }, []);

  const selectEntity = useCallback((id: Entity | null) => {
    setSelectedEntityId(id);
  }, []);

  const deleteSelectedEntity = useCallback(() => {
    if (engine && selectedEntityId !== null && engine.ecs.isAlive(selectedEntityId)) {
      engine.ecs.destroyEntity(selectedEntityId);
      setSelectedEntityId(null);
      setProjectState((prev) => ({ ...prev, modified: true }));
    }
  }, [engine, selectedEntityId]);
```

**Step 4: Add to provider value**

In the `<EditorContext.Provider value={{...}}>`, add after `undoActions`:

```typescript
        entityTemplates,
        registerEntityTemplates,
        selectedTemplate,
        selectTemplate,
        selectedEntityId,
        selectEntity,
        deleteSelectedEntity,
```

**Step 5: Commit**

```bash
git add packages/editor/src/hooks/useEditorContext.tsx
git commit -m "feat(editor): extend context with entity placement state"
```

---

## Task 3: Create EntityPalette Component

**Files:**
- Create: `packages/editor/src/components/EntityPalette.tsx`

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

export function EntityPalette() {
  const { entityTemplates, selectedTemplate, selectTemplate, tool } = useEditor();

  if (entityTemplates.length === 0) {
    return (
      <div className="p-3 border-b border-editor-border">
        <h3 className="text-xs font-semibold text-editor-text-muted uppercase tracking-wider mb-2">
          Entities
        </h3>
        <div className="text-sm text-editor-text-muted italic">
          No entity templates registered
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 border-b border-editor-border">
      <h3 className="text-xs font-semibold text-editor-text-muted uppercase tracking-wider mb-2">
        Entities
      </h3>
      <div className="grid grid-cols-2 gap-1">
        {entityTemplates.map((template) => (
          <button
            key={template.name}
            className={`px-2 py-1.5 text-xs rounded text-left transition-colors ${
              selectedTemplate === template.name && tool === 'entity'
                ? 'bg-editor-primary text-white'
                : 'bg-editor-accent text-editor-text hover:bg-editor-border'
            }`}
            onClick={() => selectTemplate(template.name)}
            title={template.name}
          >
            {template.icon && <span className="mr-1">{template.icon}</span>}
            {template.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/editor/src/components/EntityPalette.tsx
git commit -m "feat(editor): add EntityPalette component"
```

---

## Task 4: Create EntityList Component

**Files:**
- Create: `packages/editor/src/components/EntityList.tsx`

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

import { useMemo } from 'react';
import { useEditor } from '../hooks/useEditorContext';
import { entityIndex } from 'emergence-engine';

const TILE_SIZE = 16;

export function EntityList() {
  const { engine, selectedEntityId, selectEntity } = useEditor();

  const entities = useMemo(() => {
    if (!engine) return [];
    return engine.ecs.getAllEntities().map((entity) => {
      const pos = engine.ecs.getComponent<{ x: number; y: number }>(entity, 'Position');
      const name = engine.ecs.getComponent<{ name: string }>(entity, 'Name');
      return {
        id: entity,
        index: entityIndex(entity),
        label: name?.name ?? `Entity ${entityIndex(entity)}`,
        position: pos,
      };
    });
  }, [engine, engine?.ecs.getAllEntities().length]);

  const handleSelect = (entityId: number) => {
    selectEntity(entityId);
    // Pan camera to entity
    if (engine) {
      const pos = engine.ecs.getComponent<{ x: number; y: number }>(entityId, 'Position');
      if (pos) {
        engine.camera.centerOn(pos.x * TILE_SIZE, pos.y * TILE_SIZE);
      }
    }
  };

  return (
    <div className="p-3 border-b border-editor-border">
      <h3 className="text-xs font-semibold text-editor-text-muted uppercase tracking-wider mb-2">
        Entities ({entities.length})
      </h3>
      {entities.length === 0 ? (
        <div className="text-sm text-editor-text-muted italic">No entities on map</div>
      ) : (
        <div className="max-h-48 overflow-y-auto space-y-1">
          {entities.map(({ id, label, position }) => (
            <button
              key={id}
              className={`w-full px-2 py-1 text-xs rounded text-left transition-colors flex justify-between items-center ${
                selectedEntityId === id
                  ? 'bg-editor-primary text-white'
                  : 'bg-editor-accent text-editor-text hover:bg-editor-border'
              }`}
              onClick={() => handleSelect(id)}
            >
              <span className="truncate">{label}</span>
              {position && (
                <span className="text-editor-text-muted ml-2 shrink-0">
                  ({position.x}, {position.y})
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/editor/src/components/EntityList.tsx
git commit -m "feat(editor): add EntityList component"
```

---

## Task 5: Create Inspector Component

**Files:**
- Create: `packages/editor/src/components/Inspector.tsx`

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

import { useState, useMemo } from 'react';
import { useEditor } from '../hooks/useEditorContext';
import { entityIndex } from 'emergence-engine';

interface FieldEditorProps {
  name: string;
  value: unknown;
  readonly?: boolean;
  onChange: (value: unknown) => void;
}

function FieldEditor({ name, value, readonly, onChange }: FieldEditorProps) {
  if (typeof value === 'boolean') {
    return (
      <div className="flex items-center justify-between py-1">
        <label className="text-xs text-editor-text">{name}</label>
        <input
          type="checkbox"
          checked={value}
          disabled={readonly}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded"
        />
      </div>
    );
  }

  if (typeof value === 'number') {
    return (
      <div className="flex items-center justify-between py-1">
        <label className="text-xs text-editor-text">{name}</label>
        <input
          type="number"
          value={value}
          disabled={readonly}
          onChange={(e) => {
            const num = parseFloat(e.target.value);
            if (!isNaN(num)) onChange(num);
          }}
          className="w-20 px-1 py-0.5 text-xs bg-editor-bg border border-editor-border rounded text-editor-text disabled:opacity-50"
        />
      </div>
    );
  }

  if (typeof value === 'string') {
    return (
      <div className="flex items-center justify-between py-1">
        <label className="text-xs text-editor-text">{name}</label>
        <input
          type="text"
          value={value}
          disabled={readonly}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 px-1 py-0.5 text-xs bg-editor-bg border border-editor-border rounded text-editor-text disabled:opacity-50"
        />
      </div>
    );
  }

  // Non-editable complex types
  return (
    <div className="flex items-center justify-between py-1">
      <label className="text-xs text-editor-text">{name}</label>
      <span className="text-xs text-editor-text-muted italic">
        {Array.isArray(value) ? `[${value.length}]` : '{...}'}
      </span>
    </div>
  );
}

interface ComponentSectionProps {
  name: string;
  data: Record<string, unknown>;
  readonly?: boolean;
  onFieldChange: (field: string, value: unknown) => void;
}

function ComponentSection({ name, data, readonly, onFieldChange }: ComponentSectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="border border-editor-border rounded mb-2">
      <button
        className="w-full px-2 py-1.5 text-xs font-medium text-editor-text bg-editor-accent rounded-t flex items-center justify-between hover:bg-editor-border transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span>{name}</span>
        <span>{collapsed ? '▶' : '▼'}</span>
      </button>
      {!collapsed && (
        <div className="px-2 py-1 bg-editor-surface">
          {Object.entries(data).map(([field, value]) => (
            <FieldEditor
              key={field}
              name={field}
              value={value}
              readonly={readonly}
              onChange={(newValue) => onFieldChange(field, newValue)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Inspector() {
  const { engine, selectedEntityId, deleteSelectedEntity, setProject } = useEditor();

  const components = useMemo(() => {
    if (!engine || selectedEntityId === null) return null;
    if (!engine.ecs.isAlive(selectedEntityId)) return null;
    return engine.ecs.getComponentsForEntity(selectedEntityId);
  }, [engine, selectedEntityId]);

  const handleFieldChange = (componentName: string, field: string, value: unknown) => {
    if (!engine || selectedEntityId === null) return;
    const component = engine.ecs.getComponent<Record<string, unknown>>(selectedEntityId, componentName);
    if (component) {
      component[field] = value;
      setProject({ modified: true });
    }
  };

  if (selectedEntityId === null) {
    return (
      <div className="p-3 flex-1">
        <h3 className="text-xs font-semibold text-editor-text-muted uppercase tracking-wider mb-2">
          Inspector
        </h3>
        <div className="text-sm text-editor-text-muted italic">Select an entity to inspect</div>
      </div>
    );
  }

  if (!components) {
    return (
      <div className="p-3 flex-1">
        <h3 className="text-xs font-semibold text-editor-text-muted uppercase tracking-wider mb-2">
          Inspector
        </h3>
        <div className="text-sm text-editor-text-muted italic">Entity no longer exists</div>
      </div>
    );
  }

  return (
    <div className="p-3 flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-editor-text-muted uppercase tracking-wider">
          Inspector
        </h3>
        <span className="text-xs text-editor-text-muted">#{entityIndex(selectedEntityId)}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {Object.entries(components).map(([name, data]) => (
          <ComponentSection
            key={name}
            name={name}
            data={data as Record<string, unknown>}
            onFieldChange={(field, value) => handleFieldChange(name, field, value)}
          />
        ))}
      </div>

      <button
        className="mt-2 w-full px-2 py-1.5 text-xs bg-editor-error text-white rounded hover:opacity-90 transition-opacity"
        onClick={deleteSelectedEntity}
      >
        Delete Entity
      </button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/editor/src/components/Inspector.tsx
git commit -m "feat(editor): add Inspector component for entity editing"
```

---

## Task 6: Create RightSidebar Component

**Files:**
- Create: `packages/editor/src/components/RightSidebar.tsx`

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

import { EntityList } from './EntityList';
import { Inspector } from './Inspector';

export function RightSidebar() {
  return (
    <div className="w-64 bg-editor-surface border-l border-editor-border flex flex-col overflow-y-auto">
      <EntityList />
      <Inspector />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/editor/src/components/RightSidebar.tsx
git commit -m "feat(editor): add RightSidebar container"
```

---

## Task 7: Update ToolsPanel with Entity Mode

**Files:**
- Modify: `packages/editor/src/components/ToolsPanel.tsx`

**Step 1: Update the mode buttons**

Replace the entire `{/* Paint/Erase toggle */}` section (the `<div className="mb-3">` containing the mode buttons) with:

```typescript
      {/* Mode toggle */}
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
            title="Paint (P)"
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
            title="Erase (X)"
          >
            Erase
          </button>
          <button
            className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
              tool === 'entity'
                ? 'bg-editor-primary text-white'
                : 'bg-editor-accent text-editor-text hover:bg-editor-border'
            }`}
            onClick={() => setTool('entity')}
            title="Entity (E)"
          >
            Entity
          </button>
        </div>
      </div>
```

**Step 2: Commit**

```bash
git add packages/editor/src/components/ToolsPanel.tsx
git commit -m "feat(editor): add Entity mode to ToolsPanel"
```

---

## Task 8: Update Sidebar with EntityPalette

**Files:**
- Modify: `packages/editor/src/components/Sidebar.tsx`

**Step 1: Replace file contents**

Replace the entire file with:

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
import { EntityPalette } from './EntityPalette';

export function Sidebar() {
  return (
    <div className="w-64 bg-editor-surface border-r border-editor-border flex flex-col overflow-y-auto">
      <ToolsPanel />
      <TerrainPalette />
      <BuildingPalette />
      <EntityPalette />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/editor/src/components/Sidebar.tsx
git commit -m "feat(editor): add EntityPalette to Sidebar"
```

---

## Task 9: Update EditorShell with RightSidebar

**Files:**
- Modify: `packages/editor/src/components/EditorShell.tsx`

**Step 1: Add import**

Add after the Viewport import:

```typescript
import { RightSidebar } from './RightSidebar';
```

**Step 2: Add RightSidebar to layout**

Change the main content area from:

```typescript
      {/* Main content area */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <Sidebar />

        {/* Viewport */}
        <div className="flex-1 min-w-0">
          <Viewport />
        </div>
      </div>
```

to:

```typescript
      {/* Main content area */}
      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Viewport */}
        <div className="flex-1 min-w-0">
          <Viewport />
        </div>

        {/* Right Sidebar */}
        <RightSidebar />
      </div>
```

**Step 3: Commit**

```bash
git add packages/editor/src/components/EditorShell.tsx
git commit -m "feat(editor): add RightSidebar to EditorShell layout"
```

---

## Task 10: Add Entity Selection and Placement to Viewport

**Files:**
- Modify: `packages/editor/src/components/Viewport.tsx`

**Step 1: Update useEditor destructuring**

Change the useEditor destructuring to include entity-related values:

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
    entityTemplates,
    selectedTemplate,
    selectedEntityId,
    selectEntity,
  } = useEditor();
```

**Step 2: Add getEntityAtTile helper**

After the `commitStroke` callback, add:

```typescript
  // Find entity at a tile position
  const getEntityAtTile = useCallback(
    (tileX: number, tileY: number): number | null => {
      if (!engine) return null;
      const entities = engine.ecs.getAllEntities();
      for (const entity of entities) {
        const pos = engine.ecs.getComponent<{ x: number; y: number }>(entity, 'Position');
        if (pos && pos.x === tileX && pos.y === tileY) {
          return entity;
        }
      }
      return null;
    },
    [engine]
  );

  // Spawn entity from template
  const spawnEntity = useCallback(
    (tileX: number, tileY: number) => {
      if (!engine || !selectedTemplate) return;
      const template = entityTemplates.find((t) => t.name === selectedTemplate);
      if (!template) return;

      const entity = engine.ecs.createEntity();
      for (const comp of template.components) {
        const data = { ...comp.defaults };
        // Override position with click location
        if (comp.type === 'Position') {
          data.x = tileX;
          data.y = tileY;
        }
        try {
          engine.ecs.addComponent(entity, comp.type, data);
        } catch {
          // Component type not defined - skip silently
        }
      }
      setProject({ modified: true });
      selectEntity(entity);
    },
    [engine, entityTemplates, selectedTemplate, setProject, selectEntity]
  );
```

**Step 3: Update handleMouseDown**

Replace the `handleMouseDown` callback with:

```typescript
  // Mouse down: start painting or handle entity placement/selection
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!engine || mode !== 'edit') return;
      if (e.button !== 0 && e.button !== 2) return; // Only left or right click

      const rect = e.currentTarget.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldPos = engine.camera.screenToWorld(screenX, screenY);
      const tilePos = engine.camera.worldToTile(worldPos.x, worldPos.y, TILE_SIZE);

      // Entity mode: place or select
      if (tool === 'entity') {
        if (e.button === 0) {
          // Left click: place entity or select existing
          const existingEntity = getEntityAtTile(tilePos.x, tilePos.y);
          if (existingEntity !== null) {
            selectEntity(existingEntity);
          } else if (selectedTemplate) {
            spawnEntity(tilePos.x, tilePos.y);
          }
        }
        return;
      }

      // Paint/Erase mode: existing tile painting logic
      isPaintingRef.current = true;
      strokeChangesRef.current = [];
      paintedTilesRef.current.clear();

      // Right-click forces erase mode for this stroke
      if (e.button === 2) {
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
    [engine, mode, tool, brushSize, brushShape, captureTileState, paintBrush, getEntityAtTile, selectEntity, selectedTemplate, spawnEntity]
  );
```

**Step 4: Update keyboard handler for entity shortcuts**

In the `handleKeyDown` function inside the keyboard controls useEffect, add after the eraser toggle block:

```typescript
      // Paint mode shortcut
      if (e.key === 'p' || e.key === 'P') {
        setTool('paint');
        return;
      }

      // Erase mode shortcut
      if (e.key === 'x' || e.key === 'X') {
        setTool('erase');
        return;
      }

      // Deselect entity
      if (e.key === 'Escape') {
        selectEntity(null);
        return;
      }
```

And change the existing eraser toggle from:

```typescript
      // Toggle eraser
      if (e.key === 'e' || e.key === 'E') {
        setTool(tool === 'erase' ? 'paint' : 'erase');
        return;
      }
```

to:

```typescript
      // Entity mode shortcut
      if (e.key === 'e' || e.key === 'E') {
        setTool('entity');
        return;
      }
```

**Step 5: Add selectEntity to useEffect dependency array**

Update the keyboard handler useEffect's dependency array to include `selectEntity`:

```typescript
  }, [engine, setProject, undoActions, tool, setTool, setBrushSize, selectEntity]);
```

**Step 6: Update brush preview to show entity preview and selection**

In the draw frame useEffect (the one with `engine.loop.drawOnce?.()`), update the brush preview section. Replace:

```typescript
      // Draw brush preview on top
      if (hoverTile) {
        const camera = engine.camera;
        const tileMap = engine.tileMap;
        const renderer = engine.renderer;

        const previewTiles = getBrushTiles(hoverTile.x, hoverTile.y, brushSize, brushShape);
        const previewColor = tool === 'erase' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(79, 70, 229, 0.5)';

        for (const tile of previewTiles) {
          if (!tileMap.isInBounds(tile.x, tile.y)) continue;

          const screenPos = camera.worldToScreen(tile.x * TILE_SIZE, tile.y * TILE_SIZE);
          const size = TILE_SIZE * camera.zoom;

          renderer.drawRectScreen(screenPos.x, screenPos.y, size, size, previewColor);
        }
      }
```

with:

```typescript
      const camera = engine.camera;
      const renderer = engine.renderer;

      // Draw selection highlight
      if (selectedEntityId !== null && engine.ecs.isAlive(selectedEntityId)) {
        const pos = engine.ecs.getComponent<{ x: number; y: number }>(selectedEntityId, 'Position');
        if (pos) {
          const screenPos = camera.worldToScreen(pos.x * TILE_SIZE, pos.y * TILE_SIZE);
          const size = TILE_SIZE * camera.zoom;
          renderer.strokeRectScreen(screenPos.x, screenPos.y, size, size, '#fbbf24', 2);
        }
      }

      // Draw brush/entity preview on top
      if (hoverTile) {
        const tileMap = engine.tileMap;

        if (tool === 'entity' && selectedTemplate) {
          // Entity placement preview
          const screenPos = camera.worldToScreen(hoverTile.x * TILE_SIZE, hoverTile.y * TILE_SIZE);
          const size = TILE_SIZE * camera.zoom;
          renderer.drawRectScreen(screenPos.x, screenPos.y, size, size, 'rgba(34, 197, 94, 0.5)');
        } else if (tool !== 'entity') {
          // Tile brush preview
          const previewTiles = getBrushTiles(hoverTile.x, hoverTile.y, brushSize, brushShape);
          const previewColor = tool === 'erase' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(79, 70, 229, 0.5)';

          for (const tile of previewTiles) {
            if (!tileMap.isInBounds(tile.x, tile.y)) continue;

            const screenPos = camera.worldToScreen(tile.x * TILE_SIZE, tile.y * TILE_SIZE);
            const size = TILE_SIZE * camera.zoom;

            renderer.drawRectScreen(screenPos.x, screenPos.y, size, size, previewColor);
          }
        }
      }
```

**Step 7: Update the draw frame useEffect dependency array**

Change:

```typescript
  }, [engine, mode, hoverTile, brushSize, brushShape, tool]);
```

to:

```typescript
  }, [engine, mode, hoverTile, brushSize, brushShape, tool, selectedEntityId, selectedTemplate]);
```

**Step 8: Commit**

```bash
git add packages/editor/src/components/Viewport.tsx
git commit -m "feat(editor): add entity selection and placement to Viewport"
```

---

## Task 11: Add Delete Key Handler for Entities

**Files:**
- Modify: `packages/editor/src/components/Viewport.tsx`

**Step 1: Add deleteSelectedEntity to useEditor destructuring**

Add `deleteSelectedEntity` to the destructured values from `useEditor()`.

**Step 2: Add Delete key handler**

In the keyboard handler (handleKeyDown), add after the Escape handler:

```typescript
      // Delete selected entity
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedEntityId !== null) {
          e.preventDefault();
          deleteSelectedEntity();
          return;
        }
      }
```

**Step 3: Update dependency array**

Update the keyboard useEffect dependency array to include `deleteSelectedEntity` and `selectedEntityId`:

```typescript
  }, [engine, setProject, undoActions, tool, setTool, setBrushSize, selectEntity, deleteSelectedEntity, selectedEntityId]);
```

**Step 4: Commit**

```bash
git add packages/editor/src/components/Viewport.tsx
git commit -m "feat(editor): add Delete key handler for entities"
```

---

## Task 12: Register Test Entity Templates

**Files:**
- Modify: `packages/editor/src/components/Viewport.tsx`

**Step 1: Add registerEntityTemplates to useEditor destructuring**

Add `registerEntityTemplates` to the destructured values from `useEditor()`.

**Step 2: Define and register editor components and templates**

In the engine initialization useEffect (the one that creates `new Engine`), after the building definitions and before `newEngine.tileMap.create(64, 64, 'grass');`, add:

```typescript
    // Define editor-mode components for entity placement
    newEngine.ecs.defineComponent('Position', { x: 0, y: 0 });
    newEngine.ecs.defineComponent('Renderable', { char: '?', color: '#ffffff' });
    newEngine.ecs.defineComponent('Name', { name: 'Entity' });

    // Register default entity templates
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
```

**Step 3: Commit**

```bash
git add packages/editor/src/components/Viewport.tsx
git commit -m "feat(editor): register default entity templates"
```

---

## Task 13: Update StatusBar to Show Entity Mode Info

**Files:**
- Modify: `packages/editor/src/components/StatusBar.tsx`

**Step 1: Read the current StatusBar**

First, read the file to understand its current structure.

**Step 2: Add entity info display**

Update the StatusBar to show selected template and entity info when in entity mode.

Add to useEditor destructuring: `selectedTemplate`, `selectedEntityId`, `entityTemplates`

In the display section, after the brush info, add entity mode info:

```typescript
      {/* Entity info */}
      {tool === 'entity' && (
        <span>
          {selectedTemplate
            ? `Entity: ${entityTemplates.find((t) => t.name === selectedTemplate)?.label ?? selectedTemplate}`
            : 'No template selected'}
        </span>
      )}

      {/* Selection info */}
      {selectedEntityId !== null && <span>Selected: #{entityIndex(selectedEntityId)}</span>}
```

Import `entityIndex` from 'emergence-engine' at the top.

**Step 3: Commit**

```bash
git add packages/editor/src/components/StatusBar.tsx
git commit -m "feat(editor): show entity mode info in StatusBar"
```

---

## Task 14: Test Entity Placement Flow

**Step 1: Start the editor**

```bash
npm run dev:editor
```

**Step 2: Manual test checklist**

- [ ] EntityPalette shows "Marker" and "Spawn Point" templates
- [ ] Clicking a template switches to Entity mode
- [ ] Entity mode button is highlighted in ToolsPanel
- [ ] Hovering shows green preview on tiles
- [ ] Clicking places an entity
- [ ] Entity appears in EntityList
- [ ] Clicking entity in viewport selects it (yellow border)
- [ ] Clicking entity in EntityList selects it and pans camera
- [ ] Inspector shows Position, Renderable, Name components
- [ ] Editing a number field updates the entity
- [ ] Delete button removes the entity
- [ ] Delete/Backspace key removes selected entity
- [ ] Escape deselects entity
- [ ] P key switches to Paint mode
- [ ] X key switches to Erase mode
- [ ] E key switches to Entity mode

**Step 3: Stop the editor**

Ctrl+C in the terminal.

---

## Task 15: Update PRD with Phase 9 Status

**Files:**
- Modify: `docs/PRD.md`

**Step 1: Update the milestone table**

Change:
```markdown
| Entity placement | 🔲 Planned | Spawn pawns, items, structures (Phase 9) |
| Component inspector | 🔲 Planned | View/edit entity components (Phase 9) |
```

to:
```markdown
| Entity placement | ✅ Done | Spawn entities from templates |
| Component inspector | ✅ Done | View/edit entity components |
```

**Step 2: Commit**

```bash
git add docs/PRD.md
git commit -m "docs(prd): mark Phase 9 entity placement as complete"
```

---

## Task 16: Final Commit and Cleanup

**Step 1: Verify all changes are committed**

```bash
git status
```

Expected: nothing to commit, working tree clean

**Step 2: Push feature branch (if desired)**

```bash
git push -u origin feature/phase-9-entity-placement
```
