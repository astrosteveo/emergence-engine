# Phase 4: A Pawn Lives

## Overview

Convert the current keyboard-controlled player into a click-to-move pawn with pathfinding and a hunger need. This establishes the foundation for Phase 5's utility AI.

## Goals

1. **Mouse input** - Extend `Input` class with mouse position tracking and click detection
2. **Pathfinding** - A* pathfinder in `packages/engine/src/ai/` that works with any walkability grid
3. **Click-to-move** - Click a tile, pawn pathfinds there, destination marker shows target
4. **Hunger** - Component that increases over time, displayed in a stats panel

## Non-Goals

- Multiple selectable pawns (Phase 5+)
- Hunger consequences (Phase 5 - AI decides to eat)
- UI framework (just draw primitives)
- Food items (Phase 5)

---

## Design

### 1. Mouse Input

Extend the `Input` class with mouse state tracking alongside existing keyboard handling.

**New properties on Input:**

```typescript
// Screen coordinates (pixels from top-left of canvas)
input.mouseX: number
input.mouseY: number

// Mouse button state (mirrors keyboard pattern)
input.isMouseDown(button: 'left' | 'right' | 'middle'): boolean
input.isMousePressed(button): boolean   // Just pressed this tick
input.isMouseReleased(button): boolean  // Just released this tick
```

**Coordinate conversion (on Camera):**

```typescript
camera.screenToWorld(screenX, screenY): { x: number, y: number }
camera.screenToTile(screenX, screenY, tileSize): { x: number, y: number }
```

Input stays pure (raw mouse position). Camera handles coordinate transforms since it knows zoom/pan state.

**Implementation:**
- Add `mousemove`, `mousedown`, `mouseup` listeners in Input constructor
- Track `mouseButtons: Map<string, ButtonState>` like keyboard
- Call `input.update()` each tick to clear pressed/released (already happens)

### 2. Pathfinding

Standalone A* implementation in `packages/engine/src/ai/Pathfinder.ts`. Takes a walkability function, returns a path. No dependency on TileMap.

**API:**

```typescript
interface PathNode {
  x: number;
  y: number;
}

type WalkabilityFn = (x: number, y: number) => boolean;

class Pathfinder {
  constructor(isWalkable: WalkabilityFn);

  findPath(
    fromX: number, fromY: number,
    toX: number, toY: number
  ): PathNode[] | null;  // null if no path exists
}
```

**Usage with TileMap:**

```typescript
const pathfinder = new Pathfinder((x, y) => {
  const terrain = tileMap.getTerrain(x, y);
  return terrain?.walkable ?? false;
});

const path = pathfinder.findPath(0, 0, 10, 5);
// Returns: [{ x: 0, y: 0 }, { x: 1, y: 0 }, ... { x: 10, y: 5 }]
```

**Algorithm details:**
- Standard A* with Manhattan distance heuristic (4-directional movement)
- Returns full path as array of tile coordinates
- First node is start, last node is destination
- Returns `null` if destination unreachable or unwalkable
- Max iterations limit to prevent infinite loops (configurable, default 1000)

**Not included (YAGNI):**
- Diagonal movement
- Weighted terrain costs
- Path smoothing
- Dynamic replanning

### 3. Click-to-Move Components & Systems

**New components:**

```typescript
// Target destination (tile coordinates)
'PathTarget': { x: number, y: number }

// Current path being followed
'PathFollow': {
  path: PathNode[],   // Remaining nodes to visit
  nodeIndex: number   // Current node in path
}

// Hunger need
'Hunger': { current: number, max: number, rate: number }
```

**New/modified systems:**

1. **ClickToMoveSystem** - On mouse click, sets `PathTarget` on the pawn
2. **PathfindingSystem** - When entity has `PathTarget` but no `PathFollow`, calculate path and add `PathFollow`
3. **PathFollowSystem** - Move entity along path nodes, remove components when destination reached
4. **HungerSystem** - Increase `hunger.current` by `hunger.rate * dt` each tick

**Movement approach:**

Pawn moves in world coordinates (smooth), but path is in tile coordinates. PathFollowSystem:
1. Get current target node from path
2. Move toward node center at fixed speed
3. When close enough (within threshold), advance to next node
4. When path complete, remove `PathTarget` and `PathFollow`

**Destination marker:**

Entity with `Position` and `DestinationMarker` component. Created when path starts, destroyed when pawn arrives. Rendered as simple shape (small X or circle) at target tile center.

### 4. Stats Panel UI

Not a UI framework - just organized draw calls in Colony's render loop.

**What we're drawing:**

```
┌─────────────────┐
│ Pawn Stats      │
│                 │
│ Hunger: ███░░░  │
│         45/100  │
└─────────────────┘
```

Fixed position (bottom-left of screen). Simple box with:
- Title text
- Progress bar (two rects: background + filled portion)
- Numeric value

**Renderer additions:**

```typescript
// Filled rectangle in screen space (no camera transform)
renderer.drawRectScreen(x, y, width, height, color): void
```

**In Colony's draw loop:**

```typescript
engine.onDraw(() => {
  // ... existing world/entity rendering ...

  // Stats panel (screen space)
  const hunger = engine.ecs.getComponent(pawn, 'Hunger');
  const panelX = 10, panelY = canvas.height - 80;

  renderer.drawRectScreen(panelX, panelY, 150, 70, '#1a1a2e');
  renderer.drawTextScreen('Pawn Stats', panelX + 10, panelY + 20, { color: '#fff' });

  // Hunger bar
  const barWidth = 100 * (hunger.current / hunger.max);
  renderer.drawRectScreen(panelX + 10, panelY + 35, 100, 12, '#333');
  renderer.drawRectScreen(panelX + 10, panelY + 35, barWidth, 12, '#e94560');
});
```

---

## File Structure

**New files:**

```
packages/engine/src/
├── ai/
│   ├── Pathfinder.ts        # A* implementation
│   └── Pathfinder.test.ts   # Unit tests
```

**Modified files:**

```
packages/engine/src/
├── input/
│   └── Input.ts             # Add mouse tracking + click detection
│   └── Input.test.ts        # Add mouse tests
├── render/
│   ├── Camera.ts            # Add screenToWorld, screenToTile
│   ├── Camera.test.ts       # Add conversion tests
│   └── Renderer.ts          # Add drawRectScreen
├── index.ts                 # Export Pathfinder, PathNode, WalkabilityFn

packages/colony/src/
└── main.ts                  # Rewrite: click-to-move, hunger, stats panel
```

**New exports in `index.ts`:**

```typescript
export { Pathfinder } from './ai/Pathfinder';
export type { PathNode, WalkabilityFn } from './ai/Pathfinder';
```

---

## Implementation Order

1. **Mouse input** - Extend Input class. No dependencies.

2. **Camera coordinate conversion** - Add `screenToWorld` and `screenToTile`. Depends on understanding zoom/pan math already in Camera.

3. **Pathfinder** - Standalone A* in `ai/Pathfinder.ts`. Pure algorithm, no dependencies.

4. **Click-to-move systems** - `ClickToMoveSystem`, `PathfindingSystem`, `PathFollowSystem`. Depends on mouse input, camera conversion, and pathfinder.

5. **Hunger component & system** - `HungerSystem` that increments over time. Independent of pathfinding.

6. **Colony rewrite** - Wire everything together: click-to-move pawn, destination marker, hunger, stats panel. Depends on all above.

**Parallelizable work:**
- Mouse input + Camera conversion (both input/render layer)
- Pathfinder (completely standalone)
- Hunger system (independent of movement)

---

## Test Coverage

- `Pathfinder.test.ts` - Path found, no path, unreachable destination, max iterations
- `Input.test.ts` - Mouse position, button states, pressed/released detection
- `Camera.test.ts` - screenToWorld at various zoom levels, screenToTile rounding
