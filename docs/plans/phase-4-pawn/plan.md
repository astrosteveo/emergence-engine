# Phase 4: A Pawn Lives - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert the keyboard-controlled player into a click-to-move pawn with A* pathfinding and a hunger need.

**Architecture:** Extend the engine's Input class with mouse tracking, add a standalone A* pathfinder in `ai/`, then rewrite Colony to use click-to-move systems with ECS components for path following and hunger.

**Tech Stack:** TypeScript, Vitest, Canvas 2D

---

## Task 1: Add Mouse Input to Input Class

**Files:**
- Modify: `packages/engine/src/input/Input.ts`
- Test: `packages/engine/src/input/Input.test.ts`

**Step 1: Write failing tests for mouse position tracking**

Add to `Input.test.ts`:

```typescript
describe('Mouse input', () => {
  function moveMouse(x: number, y: number): void {
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y }));
  }

  function mouseDown(button: number): void {
    window.dispatchEvent(new MouseEvent('mousedown', { button }));
  }

  function mouseUp(button: number): void {
    window.dispatchEvent(new MouseEvent('mouseup', { button }));
  }

  it('should track mouse position', () => {
    moveMouse(100, 200);
    expect(input.mouseX).toBe(100);
    expect(input.mouseY).toBe(200);
  });

  it('should detect mouse button down', () => {
    expect(input.isMouseDown('left')).toBe(false);
    mouseDown(0);
    expect(input.isMouseDown('left')).toBe(true);
  });

  it('should detect mouse button up', () => {
    mouseDown(0);
    expect(input.isMouseDown('left')).toBe(true);
    mouseUp(0);
    expect(input.isMouseDown('left')).toBe(false);
  });

  it('should detect mouse pressed only on first frame', () => {
    expect(input.isMousePressed('left')).toBe(false);
    mouseDown(0);
    expect(input.isMousePressed('left')).toBe(true);
    input.update();
    expect(input.isMousePressed('left')).toBe(false);
    expect(input.isMouseDown('left')).toBe(true);
  });

  it('should detect mouse released only on release frame', () => {
    mouseDown(0);
    input.update();
    expect(input.isMouseReleased('left')).toBe(false);
    mouseUp(0);
    expect(input.isMouseReleased('left')).toBe(true);
    input.update();
    expect(input.isMouseReleased('left')).toBe(false);
  });

  it('should track right and middle mouse buttons', () => {
    mouseDown(2); // right
    expect(input.isMouseDown('right')).toBe(true);
    mouseDown(1); // middle
    expect(input.isMouseDown('middle')).toBe(true);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- --run packages/engine/src/input/Input.test.ts`
Expected: FAIL - mouseX, mouseY, isMouseDown, isMousePressed, isMouseReleased not defined

**Step 3: Implement mouse input in Input.ts**

Add to `Input.ts` (after keyboard properties):

```typescript
export type MouseButton = 'left' | 'right' | 'middle';

export class Input {
  private keysDown: Set<string> = new Set();
  private keysPressed: Set<string> = new Set();
  private keysReleased: Set<string> = new Set();

  // Mouse state
  mouseX = 0;
  mouseY = 0;
  private mouseButtonsDown: Set<MouseButton> = new Set();
  private mouseButtonsPressed: Set<MouseButton> = new Set();
  private mouseButtonsReleased: Set<MouseButton> = new Set();

  constructor() {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    window.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    window.addEventListener('mouseup', (e) => this.handleMouseUp(e));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.keysDown.has(e.code)) {
      this.keysPressed.add(e.code);
    }
    this.keysDown.add(e.code);
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keysDown.delete(e.code);
    this.keysReleased.add(e.code);
  }

  private handleMouseMove(e: MouseEvent): void {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
  }

  private buttonFromEvent(e: MouseEvent): MouseButton {
    if (e.button === 2) return 'right';
    if (e.button === 1) return 'middle';
    return 'left';
  }

  private handleMouseDown(e: MouseEvent): void {
    const button = this.buttonFromEvent(e);
    if (!this.mouseButtonsDown.has(button)) {
      this.mouseButtonsPressed.add(button);
    }
    this.mouseButtonsDown.add(button);
  }

  private handleMouseUp(e: MouseEvent): void {
    const button = this.buttonFromEvent(e);
    this.mouseButtonsDown.delete(button);
    this.mouseButtonsReleased.add(button);
  }

  /** Call at end of each tick to clear per-frame state */
  update(): void {
    this.keysPressed.clear();
    this.keysReleased.clear();
    this.mouseButtonsPressed.clear();
    this.mouseButtonsReleased.clear();
  }

  /** True if key is currently held down */
  isKeyDown(code: string): boolean {
    return this.keysDown.has(code);
  }

  /** True only on the tick the key was first pressed */
  isKeyPressed(code: string): boolean {
    return this.keysPressed.has(code);
  }

  /** True only on the tick the key was released */
  isKeyReleased(code: string): boolean {
    return this.keysReleased.has(code);
  }

  /** True if mouse button is currently held down */
  isMouseDown(button: MouseButton): boolean {
    return this.mouseButtonsDown.has(button);
  }

  /** True only on the tick the mouse button was first pressed */
  isMousePressed(button: MouseButton): boolean {
    return this.mouseButtonsPressed.has(button);
  }

  /** True only on the tick the mouse button was released */
  isMouseReleased(button: MouseButton): boolean {
    return this.mouseButtonsReleased.has(button);
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- --run packages/engine/src/input/Input.test.ts`
Expected: PASS

**Step 5: Export MouseButton type from index.ts**

In `packages/engine/src/index.ts`, update the Input export:

```typescript
export { Input } from './input/Input';
export type { MouseButton } from './input/Input';
```

**Step 6: Commit**

```bash
git add packages/engine/src/input/Input.ts packages/engine/src/input/Input.test.ts packages/engine/src/index.ts
git commit -m "feat(input): add mouse position and button tracking"
```

---

## Task 2: Add screenToTile Convenience Method to Camera

**Files:**
- Modify: `packages/engine/src/render/Camera.ts`
- Test: `packages/engine/src/render/Camera.test.ts`

**Step 1: Write failing test for screenToTile**

Add to `Camera.test.ts`:

```typescript
describe('screenToTile', () => {
  it('should convert screen coordinates to tile coordinates', () => {
    const camera = new Camera(800, 600);
    camera.centerOn(0, 0);
    // Screen center (400, 300) -> world (0, 0) -> tile (0, 0) with tileSize 16
    const tile = camera.screenToTile(400, 300, 16);
    expect(tile.x).toBe(0);
    expect(tile.y).toBe(0);
  });

  it('should account for camera position', () => {
    const camera = new Camera(800, 600);
    camera.centerOn(32, 32); // 2 tiles offset
    // Screen center -> world (32, 32) -> tile (2, 2)
    const tile = camera.screenToTile(400, 300, 16);
    expect(tile.x).toBe(2);
    expect(tile.y).toBe(2);
  });

  it('should account for zoom', () => {
    const camera = new Camera(800, 600);
    camera.centerOn(0, 0);
    camera.zoomIn(); // 2x zoom
    // Screen (400 + 16, 300 + 16) with 2x zoom -> world (8, 8) -> tile (0, 0)
    const tile = camera.screenToTile(400 + 16, 300 + 16, 16);
    expect(tile.x).toBe(0);
    expect(tile.y).toBe(0);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- --run packages/engine/src/render/Camera.test.ts`
Expected: FAIL - screenToTile is not a function

**Step 3: Implement screenToTile**

Add to `Camera.ts`:

```typescript
screenToTile(screenX: number, screenY: number, tileSize: number): { x: number; y: number } {
  const world = this.screenToWorld(screenX, screenY);
  return this.worldToTile(world.x, world.y, tileSize);
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- --run packages/engine/src/render/Camera.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/engine/src/render/Camera.ts packages/engine/src/render/Camera.test.ts
git commit -m "feat(camera): add screenToTile convenience method"
```

---

## Task 3: Implement A* Pathfinder

**Files:**
- Create: `packages/engine/src/ai/Pathfinder.ts`
- Create: `packages/engine/src/ai/Pathfinder.test.ts`

**Step 1: Create ai directory**

```bash
mkdir -p packages/engine/src/ai
```

**Step 2: Write failing tests for Pathfinder**

Create `packages/engine/src/ai/Pathfinder.test.ts`:

```typescript
/*
 * This file is part of Emergence Engine.
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

import { describe, it, expect } from 'vitest';
import { Pathfinder } from './Pathfinder';

describe('Pathfinder', () => {
  it('should find a straight path on open grid', () => {
    const pathfinder = new Pathfinder(() => true);
    const path = pathfinder.findPath(0, 0, 3, 0);

    expect(path).not.toBeNull();
    expect(path!.length).toBe(4); // start + 3 steps
    expect(path![0]).toEqual({ x: 0, y: 0 });
    expect(path![path!.length - 1]).toEqual({ x: 3, y: 0 });
  });

  it('should find path around obstacle', () => {
    // Grid with wall at (1, 0)
    const pathfinder = new Pathfinder((x, y) => !(x === 1 && y === 0));
    const path = pathfinder.findPath(0, 0, 2, 0);

    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(3); // Must go around
    expect(path![0]).toEqual({ x: 0, y: 0 });
    expect(path![path!.length - 1]).toEqual({ x: 2, y: 0 });
    // Should not contain the blocked tile
    expect(path!.some(n => n.x === 1 && n.y === 0)).toBe(false);
  });

  it('should return null for unreachable destination', () => {
    // Completely walled off destination
    const pathfinder = new Pathfinder((x, y) => {
      // Wall around (5, 5)
      if (x === 4 && y >= 4 && y <= 6) return false;
      if (x === 6 && y >= 4 && y <= 6) return false;
      if (y === 4 && x >= 4 && x <= 6) return false;
      if (y === 6 && x >= 4 && x <= 6) return false;
      return true;
    });
    const path = pathfinder.findPath(0, 0, 5, 5);

    expect(path).toBeNull();
  });

  it('should return null for unwalkable start', () => {
    const pathfinder = new Pathfinder((x, y) => !(x === 0 && y === 0));
    const path = pathfinder.findPath(0, 0, 5, 5);

    expect(path).toBeNull();
  });

  it('should return null for unwalkable destination', () => {
    const pathfinder = new Pathfinder((x, y) => !(x === 5 && y === 5));
    const path = pathfinder.findPath(0, 0, 5, 5);

    expect(path).toBeNull();
  });

  it('should return single-node path when start equals destination', () => {
    const pathfinder = new Pathfinder(() => true);
    const path = pathfinder.findPath(3, 3, 3, 3);

    expect(path).not.toBeNull();
    expect(path!.length).toBe(1);
    expect(path![0]).toEqual({ x: 3, y: 3 });
  });

  it('should respect max iterations limit', () => {
    // Very restrictive walkability - forces long search
    const pathfinder = new Pathfinder(() => true, { maxIterations: 5 });
    const path = pathfinder.findPath(0, 0, 100, 100);

    // Should give up before finding path
    expect(path).toBeNull();
  });
});
```

**Step 3: Run tests to verify they fail**

Run: `npm test -- --run packages/engine/src/ai/Pathfinder.test.ts`
Expected: FAIL - Cannot find module './Pathfinder'

**Step 4: Implement Pathfinder**

Create `packages/engine/src/ai/Pathfinder.ts`:

```typescript
/*
 * This file is part of Emergence Engine.
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

export interface PathNode {
  x: number;
  y: number;
}

export type WalkabilityFn = (x: number, y: number) => boolean;

export interface PathfinderOptions {
  maxIterations?: number;
}

interface AStarNode {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic to goal
  f: number; // g + h
  parent: AStarNode | null;
}

export class Pathfinder {
  private maxIterations: number;

  constructor(
    private isWalkable: WalkabilityFn,
    options: PathfinderOptions = {}
  ) {
    this.maxIterations = options.maxIterations ?? 1000;
  }

  findPath(fromX: number, fromY: number, toX: number, toY: number): PathNode[] | null {
    // Early exit for unwalkable endpoints
    if (!this.isWalkable(fromX, fromY) || !this.isWalkable(toX, toY)) {
      return null;
    }

    // Same position
    if (fromX === toX && fromY === toY) {
      return [{ x: fromX, y: fromY }];
    }

    const openSet: AStarNode[] = [];
    const closedSet = new Set<string>();

    const startNode: AStarNode = {
      x: fromX,
      y: fromY,
      g: 0,
      h: this.heuristic(fromX, fromY, toX, toY),
      f: 0,
      parent: null,
    };
    startNode.f = startNode.g + startNode.h;
    openSet.push(startNode);

    let iterations = 0;

    while (openSet.length > 0 && iterations < this.maxIterations) {
      iterations++;

      // Find node with lowest f score
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;

      // Reached goal
      if (current.x === toX && current.y === toY) {
        return this.reconstructPath(current);
      }

      closedSet.add(`${current.x},${current.y}`);

      // Check 4-directional neighbors
      const neighbors = [
        { x: current.x - 1, y: current.y },
        { x: current.x + 1, y: current.y },
        { x: current.x, y: current.y - 1 },
        { x: current.x, y: current.y + 1 },
      ];

      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;

        if (closedSet.has(key) || !this.isWalkable(neighbor.x, neighbor.y)) {
          continue;
        }

        const g = current.g + 1;
        const existingIndex = openSet.findIndex(n => n.x === neighbor.x && n.y === neighbor.y);

        if (existingIndex === -1) {
          // New node
          const h = this.heuristic(neighbor.x, neighbor.y, toX, toY);
          openSet.push({
            x: neighbor.x,
            y: neighbor.y,
            g,
            h,
            f: g + h,
            parent: current,
          });
        } else if (g < openSet[existingIndex].g) {
          // Better path to existing node
          openSet[existingIndex].g = g;
          openSet[existingIndex].f = g + openSet[existingIndex].h;
          openSet[existingIndex].parent = current;
        }
      }
    }

    // No path found
    return null;
  }

  private heuristic(x1: number, y1: number, x2: number, y2: number): number {
    // Manhattan distance for 4-directional movement
    return Math.abs(x2 - x1) + Math.abs(y2 - y1);
  }

  private reconstructPath(node: AStarNode): PathNode[] {
    const path: PathNode[] = [];
    let current: AStarNode | null = node;

    while (current !== null) {
      path.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }

    return path;
  }
}
```

**Step 5: Run tests to verify they pass**

Run: `npm test -- --run packages/engine/src/ai/Pathfinder.test.ts`
Expected: PASS

**Step 6: Export Pathfinder from index.ts**

Add to `packages/engine/src/index.ts`:

```typescript
export { Pathfinder } from './ai/Pathfinder';
export type { PathNode, WalkabilityFn, PathfinderOptions } from './ai/Pathfinder';
```

**Step 7: Commit**

```bash
git add packages/engine/src/ai/Pathfinder.ts packages/engine/src/ai/Pathfinder.test.ts packages/engine/src/index.ts
git commit -m "feat(ai): add A* pathfinder"
```

---

## Task 4: Rewrite Colony with Click-to-Move

**Files:**
- Modify: `packages/colony/src/main.ts`

**Step 1: Replace keyboard player with click-to-move pawn**

Replace entire contents of `packages/colony/src/main.ts`:

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

import { Engine, generateTerrain, Pathfinder } from 'emergence-engine';
import type { Entity, PathNode } from 'emergence-engine';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const engine = new Engine({ canvas, tickRate: 20 });
const TILE_SIZE = 16;
const PAWN_SPEED = 80; // pixels per second

// Define terrain types
engine.tileMap.defineTerrain('water', { color: '#1d3557', walkable: false });
engine.tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
engine.tileMap.defineTerrain('stone', { color: '#6c757d', walkable: true });

// Generate 64x64 world
generateTerrain(engine.tileMap, { width: 64, height: 64, seed: Date.now() });

// Create pathfinder using TileMap walkability
const pathfinder = new Pathfinder((x, y) => engine.tileMap.isWalkable(x, y));

// Define components
engine.ecs.defineComponent('Position', { x: 0, y: 0 });
engine.ecs.defineComponent('Sprite', { width: 24, height: 24, color: '#e94560' });
engine.ecs.defineComponent('Pawn', {}); // Marker for the controllable pawn
engine.ecs.defineComponent('PathTarget', { x: 0, y: 0 }); // Target tile
engine.ecs.defineComponent('PathFollow', { path: [] as PathNode[], nodeIndex: 0 });
engine.ecs.defineComponent('Hunger', { current: 0, max: 100, rate: 2 }); // rate = per second
engine.ecs.defineComponent('DestinationMarker', {}); // Marker for destination indicator

// Create pawn entity at world center
const pawn = engine.ecs.createEntity();
engine.ecs.addComponent(pawn, 'Position', { x: 0, y: 0 });
engine.ecs.addComponent(pawn, 'Sprite');
engine.ecs.addComponent(pawn, 'Pawn');
engine.ecs.addComponent(pawn, 'Hunger', { current: 25, max: 100, rate: 2 });

// Destination marker (hidden until path is set)
let destinationMarker: Entity | null = null;

// Camera control system
engine.ecs.addSystem({
  name: 'CameraControl',
  query: [],
  update() {
    const { input, camera } = engine;

    if (input.isKeyPressed('Equal') || input.isKeyPressed('NumpadAdd')) {
      camera.zoomIn();
    }
    if (input.isKeyPressed('Minus') || input.isKeyPressed('NumpadSubtract')) {
      camera.zoomOut();
    }
  },
});

// Click-to-move system: on left click, set PathTarget on pawn
engine.ecs.addSystem({
  name: 'ClickToMove',
  query: ['Pawn', 'Position'],
  update(entities) {
    if (!engine.input.isMousePressed('left')) return;

    const tile = engine.camera.screenToTile(engine.input.mouseX, engine.input.mouseY, TILE_SIZE);

    // Only set target if tile is walkable
    if (!engine.tileMap.isWalkable(tile.x, tile.y)) return;

    for (const e of entities) {
      // Remove any existing path
      if (engine.ecs.hasComponent(e, 'PathFollow')) {
        engine.ecs.removeComponent(e, 'PathFollow');
      }
      // Set new target
      if (engine.ecs.hasComponent(e, 'PathTarget')) {
        engine.ecs.removeComponent(e, 'PathTarget');
      }
      engine.ecs.addComponent(e, 'PathTarget', { x: tile.x, y: tile.y });
    }
  },
});

// Pathfinding system: when entity has PathTarget but no PathFollow, calculate path
engine.ecs.addSystem({
  name: 'Pathfinding',
  query: ['Position', 'PathTarget'],
  update(entities) {
    for (const e of entities) {
      if (engine.ecs.hasComponent(e, 'PathFollow')) continue;

      const pos = engine.ecs.getComponent<{ x: number; y: number }>(e, 'Position')!;
      const target = engine.ecs.getComponent<{ x: number; y: number }>(e, 'PathTarget')!;

      // Convert current position to tile
      const currentTile = engine.camera.worldToTile(pos.x, pos.y, TILE_SIZE);

      const path = pathfinder.findPath(currentTile.x, currentTile.y, target.x, target.y);

      if (path && path.length > 1) {
        // Skip first node (current position)
        engine.ecs.addComponent(e, 'PathFollow', { path: path.slice(1), nodeIndex: 0 });

        // Create destination marker
        if (destinationMarker !== null) {
          engine.ecs.destroyEntity(destinationMarker);
        }
        destinationMarker = engine.ecs.createEntity();
        engine.ecs.addComponent(destinationMarker, 'Position', {
          x: target.x * TILE_SIZE + TILE_SIZE / 2,
          y: target.y * TILE_SIZE + TILE_SIZE / 2,
        });
        engine.ecs.addComponent(destinationMarker, 'DestinationMarker');
      } else {
        // No valid path, remove target
        engine.ecs.removeComponent(e, 'PathTarget');
      }
    }
  },
});

// Path follow system: move entity along path
engine.ecs.addSystem({
  name: 'PathFollow',
  query: ['Position', 'PathFollow'],
  update(entities, dt) {
    for (const e of entities) {
      const pos = engine.ecs.getComponent<{ x: number; y: number }>(e, 'Position')!;
      const pathFollow = engine.ecs.getComponent<{ path: PathNode[]; nodeIndex: number }>(
        e,
        'PathFollow'
      )!;

      if (pathFollow.nodeIndex >= pathFollow.path.length) {
        // Path complete
        engine.ecs.removeComponent(e, 'PathFollow');
        if (engine.ecs.hasComponent(e, 'PathTarget')) {
          engine.ecs.removeComponent(e, 'PathTarget');
        }
        // Remove destination marker
        if (destinationMarker !== null) {
          engine.ecs.destroyEntity(destinationMarker);
          destinationMarker = null;
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
        // Close enough, snap and advance
        pos.x = targetX;
        pos.y = targetY;
        pathFollow.nodeIndex++;
      } else {
        // Move toward target
        const moveDistance = PAWN_SPEED * dt;
        const ratio = Math.min(moveDistance / distance, 1);
        pos.x += dx * ratio;
        pos.y += dy * ratio;
      }
    }
  },
});

// Hunger system: increase hunger over time
engine.ecs.addSystem({
  name: 'Hunger',
  query: ['Hunger'],
  update(entities, dt) {
    for (const e of entities) {
      const hunger = engine.ecs.getComponent<{ current: number; max: number; rate: number }>(
        e,
        'Hunger'
      )!;
      hunger.current = Math.min(hunger.current + hunger.rate * dt, hunger.max);
    }
  },
});

// Camera follow system
engine.ecs.addSystem({
  name: 'CameraFollow',
  query: ['Pawn', 'Position'],
  update(entities) {
    for (const e of entities) {
      const pos = engine.ecs.getComponent<{ x: number; y: number }>(e, 'Position')!;
      engine.camera.centerOn(pos.x, pos.y);
    }
  },
});

// Render loop
engine.onDraw(() => {
  engine.renderer.clear();

  // Draw tile map
  engine.renderer.drawTileMap(engine.tileMap, TILE_SIZE);

  // Draw destination marker
  for (const e of engine.ecs.query(['DestinationMarker', 'Position'])) {
    const pos = engine.ecs.getComponent<{ x: number; y: number }>(e, 'Position')!;
    // Draw a small X
    engine.renderer.drawCircle(pos.x, pos.y, 4, '#ffdd57');
  }

  // Draw entities (pawns)
  for (const e of engine.ecs.query(['Position', 'Sprite'])) {
    const pos = engine.ecs.getComponent<{ x: number; y: number }>(e, 'Position')!;
    const sprite = engine.ecs.getComponent<{ width: number; height: number; color: string }>(
      e,
      'Sprite'
    )!;
    engine.renderer.drawRectCentered(pos.x, pos.y, sprite.width, sprite.height, sprite.color);
  }

  // UI: Stats panel (screen-space, bottom-left)
  const hunger = engine.ecs.getComponent<{ current: number; max: number }>(pawn, 'Hunger')!;
  const panelX = 10;
  const panelY = canvas.height - 90;
  const panelWidth = 160;
  const panelHeight = 80;

  // Panel background
  engine.renderer.drawRectScreen(panelX, panelY, panelWidth, panelHeight, 'rgba(26, 26, 46, 0.9)');

  // Title
  engine.renderer.drawTextScreen('Pawn Stats', panelX + 10, panelY + 22, {
    font: '14px monospace',
    color: '#ffffff',
  });

  // Hunger label
  engine.renderer.drawTextScreen('Hunger', panelX + 10, panelY + 45, {
    font: '12px monospace',
    color: '#aaaaaa',
  });

  // Hunger bar background
  const barX = panelX + 10;
  const barY = panelY + 52;
  const barWidth = 120;
  const barHeight = 14;
  engine.renderer.drawRectScreen(barX, barY, barWidth, barHeight, '#333333');

  // Hunger bar fill
  const fillWidth = barWidth * (hunger.current / hunger.max);
  const hungerColor = hunger.current > 70 ? '#e94560' : hunger.current > 40 ? '#ffdd57' : '#4ade80';
  engine.renderer.drawRectScreen(barX, barY, fillWidth, barHeight, hungerColor);

  // Hunger value
  engine.renderer.drawTextScreen(
    `${Math.round(hunger.current)}/${hunger.max}`,
    barX + barWidth + 5,
    barY + 11,
    { font: '11px monospace', color: '#888888' }
  );

  // Instructions (top-left)
  engine.renderer.drawTextScreen('Click to move | +/-: Zoom', 10, 30, { color: '#888' });
});

engine.start();
console.log('Colony - Built with Emergence Engine (Phase 4: A Pawn Lives)');
```

**Step 2: Build and test manually**

Run: `npm run dev`
Expected: Browser opens, click on grass tiles to move pawn, hunger bar fills over time

**Step 3: Commit**

```bash
git add packages/colony/src/main.ts
git commit -m "feat(colony): click-to-move pawn with pathfinding and hunger"
```

---

## Task 5: Run Full Test Suite and Verify Build

**Step 1: Run all engine tests**

Run: `npm test`
Expected: All tests pass

**Step 2: Build the project**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Final commit if any fixes needed**

If tests or build revealed issues, fix and commit.

---

## Task 6: Update PRD Status

**Files:**
- Modify: `docs/PRD.md`

**Step 1: Mark Phase 4 as complete**

In `docs/PRD.md`, change the Phase 4 line from:

```markdown
| Phase 4: A Pawn Lives | 🔲 Next | Click-to-move, pathfinding, hunger |
```

to:

```markdown
| Phase 4: A Pawn Lives | ✅ Done | Click-to-move, pathfinding, hunger |
```

And change Phase 5:

```markdown
| Phase 5: Pawn Thinks | 🔲 Planned | Utility AI, actions, food items |
```

to:

```markdown
| Phase 5: Pawn Thinks | 🔲 Next | Utility AI, actions, food items |
```

**Step 2: Commit**

```bash
git add docs/PRD.md
git commit -m "docs: mark Phase 4 complete"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Mouse input | `Input.ts`, `Input.test.ts`, `index.ts` |
| 2 | screenToTile | `Camera.ts`, `Camera.test.ts` |
| 3 | A* Pathfinder | `ai/Pathfinder.ts`, `ai/Pathfinder.test.ts`, `index.ts` |
| 4 | Colony rewrite | `colony/src/main.ts` |
| 5 | Test & build | - |
| 6 | Update PRD | `docs/PRD.md` |
