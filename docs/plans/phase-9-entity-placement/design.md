# Phase 9: Entity Placement & Inspector - Design

## Overview

Add entity placement and component inspection to the editor. Users place pre-defined entity templates onto the map, then click entities to inspect and edit their component values.

**Approach:** Hybrid system - template-based placement for speed, inspector for fine-tuning.

## Architecture

```
Left Sidebar (existing)          Right Sidebar (new)
├── TerrainPalette               ├── EntityList
├── BuildingPalette              │   └── Lists all entities on map
├── EntityPalette (new)          │   └── Click to select
│   └── Shows registered         └── Inspector
│       entity templates             └── Shows selected entity's
└── ToolsPanel                           components and values
    └── Paint / Erase / Entity       └── Edit primitive fields
```

**Data Flow:**

1. Game registers templates via `editor.registerEntityTemplates([...])`
2. Editor renders templates in EntityPalette
3. User selects template, switches to Entity mode, clicks viewport
4. Editor spawns entity with template's default components
5. User clicks existing entity (viewport or list) to select
6. Inspector renders component fields, user edits values
7. Changes apply directly to entity

## Entity Template System

### Template Definition

```typescript
interface EntityTemplate {
  name: string;                    // Unique identifier
  label: string;                   // Display name in palette
  icon?: string;                   // Optional icon (emoji or asset path)
  components: ComponentTemplate[]; // What gets spawned
}

interface ComponentTemplate {
  type: string;                    // Component name (e.g., "Position")
  defaults: Record<string, unknown>; // Default values
  readonly?: boolean;              // If true, inspector shows disabled fields
}
```

### Example Template (Colony)

```typescript
const pawnTemplate: EntityTemplate = {
  name: "pawn",
  label: "Pawn",
  icon: "🧑",
  components: [
    { type: "Position", defaults: { x: 0, y: 0 } },
    { type: "Renderable", defaults: { char: "@", color: "#fff" } },
    { type: "Hunger", defaults: { current: 100, max: 100 } },
    { type: "Faction", defaults: { factionId: 0 } },
  ]
};
```

### Registration API

Games register templates during editor initialization:

```typescript
editorContext.registerEntityTemplates([
  pawnTemplate,
  stockpileTemplate,
  caravanDepotTemplate,
]);
```

## UI Components

### EntityPalette (Left Sidebar)

Renders registered templates as clickable items. Selecting a template sets it as the active brush for Entity mode.

### EntityList (Right Sidebar)

Lists all entities on the map. Each row shows entity ID and label (from template name or Name component). Click to select and pan camera to entity.

### Inspector (Right Sidebar)

Renders selected entity's components as collapsible sections with editable fields:

```
┌─ Inspector ─────────────────┐
│ Entity #42 (Pawn)           │
├─────────────────────────────┤
│ ▼ Position                  │
│   x: [___10___]             │
│   y: [___15___]             │
│                             │
│ ▼ Hunger                    │
│   current: [__80__]         │
│   max: [__100__]            │
└─────────────────────────────┘
```

Includes Delete button to remove the selected entity.

## Selection & Viewport

### Selection Behavior

- Click entity in viewport (any mode) to select
- Click entity in EntityList to select and pan camera
- `Escape` to deselect
- Selection state stored in editor context as `selectedEntityId`

### Viewport Changes

1. **Hit detection** - Check if clicked tile contains an entity
2. **Selection highlight** - Border around selected entity's tile
3. **Placement preview** - Ghost icon at cursor in Entity mode

### Hit Detection

```typescript
function getEntityAtTile(x: number, y: number): Entity | null {
  for (const entity of engine.ecs.query("Position")) {
    const pos = engine.ecs.getComponent(entity, "Position");
    if (pos.x === x && pos.y === y) return entity;
  }
  return null;
}
```

Single-tile entities only for Phase 9.

## Inspector Field Editing

### Field Type Mapping

| Value Type | Input Control |
|------------|---------------|
| `number` | Number input |
| `string` | Text input |
| `boolean` | Checkbox |
| `object`/`array` | Read-only JSON preview |

### Change Application

Changes apply immediately to the entity (direct manipulation, no Apply button).

### Validation

- Number fields reject non-numeric input
- Required fields revert on blur if empty
- Components marked `readonly: true` render as disabled

## Editor Context Extensions

```typescript
interface EditorContextValue {
  // Existing...
  mode: "paint" | "erase" | "entity";

  // New for Phase 9
  entityTemplates: EntityTemplate[];
  registerEntityTemplates: (templates: EntityTemplate[]) => void;
  selectedTemplate: string | null;
  selectTemplate: (name: string) => void;

  selectedEntityId: Entity | null;
  selectEntity: (id: Entity | null) => void;
  deleteSelectedEntity: () => void;
}
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `E` | Switch to Entity mode |
| `P` | Switch to Paint mode |
| `X` | Switch to Erase mode |
| `Escape` | Deselect entity |
| `Delete` / `Backspace` | Delete selected entity |

## File Structure

### New Files

```
packages/editor/src/
├── components/
│   ├── EntityPalette.tsx
│   ├── EntityList.tsx
│   ├── Inspector.tsx
│   └── RightSidebar.tsx
└── types/
    └── templates.ts
```

### Modified Files

- `EditorShell.tsx` - Add RightSidebar to layout
- `Viewport.tsx` - Hit detection, selection highlight, placement preview
- `ToolsPanel.tsx` - Add Entity mode button
- `Sidebar.tsx` - Add EntityPalette section
- `useEditorContext.tsx` - Extended with entity state

## Save/Load Integration

Entities serialize via existing engine API. No changes needed.

Templates are NOT saved - they're provided by the game at runtime.

## Out of Scope

- Undo/redo for entity changes
- Multi-tile entities / footprints
- Drag-to-move entities
- Copy/paste entities
- Entity layers / visibility toggles
- Component add/remove in inspector
