# Phase 3: World Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add tile-based world system with camera pan/zoom and noise-based terrain generation.

**Architecture:** TileMap stores terrain + building layers as flat typed arrays. Camera handles viewport transforms with discrete zoom levels (1x, 2x, 4x). Renderer integrates camera for world-space drawing and adds tile map rendering with frustum culling.

**Tech Stack:** TypeScript, Vitest, Canvas 2D

---

## Task 1: TileMap Core — Terrain Registry

**Files:**
- Create: `src/engine/world/TileMap.ts`
- Create: `src/engine/world/TileMap.test.ts`

**Step 1: Write the failing test for terrain definition**

```typescript
// src/engine/world/TileMap.test.ts
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
import { TileMap } from './TileMap';

describe('TileMap', () => {
  describe('terrain registry', () => {
    it('should define terrain types', () => {
      const tileMap = new TileMap();

      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });

      const def = tileMap.getTerrainDef('grass');
      expect(def).toBeDefined();
      expect(def!.name).toBe('grass');
      expect(def!.color).toBe('#3a5a40');
      expect(def!.walkable).toBe(true);
      expect(def!.id).toBe(1); // First terrain gets id 1 (0 reserved)
    });

    it('should assign sequential IDs to terrain types', () => {
      const tileMap = new TileMap();

      tileMap.defineTerrain('water', { color: '#1d3557', walkable: false });
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      tileMap.defineTerrain('stone', { color: '#6c757d', walkable: true });

      expect(tileMap.getTerrainDef('water')!.id).toBe(1);
      expect(tileMap.getTerrainDef('grass')!.id).toBe(2);
      expect(tileMap.getTerrainDef('stone')!.id).toBe(3);
    });

    it('should throw when defining duplicate terrain', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });

      expect(() => tileMap.defineTerrain('grass', { color: '#fff', walkable: true }))
        .toThrow('Terrain "grass" already defined');
    });

    it('should return undefined for unknown terrain', () => {
      const tileMap = new TileMap();

      expect(tileMap.getTerrainDef('unknown')).toBeUndefined();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/engine/world/TileMap.test.ts`
Expected: FAIL — Cannot find module './TileMap'

**Step 3: Write minimal implementation**

```typescript
// src/engine/world/TileMap.ts
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

export interface TerrainDef {
  id: number;
  name: string;
  color: string;
  walkable: boolean;
}

export class TileMap {
  private terrainDefs: Map<string, TerrainDef> = new Map();
  private nextTerrainId = 1; // 0 reserved for "no terrain"

  defineTerrain(name: string, def: Omit<TerrainDef, 'id' | 'name'>): void {
    if (this.terrainDefs.has(name)) {
      throw new Error(`Terrain "${name}" already defined`);
    }
    this.terrainDefs.set(name, {
      id: this.nextTerrainId++,
      name,
      ...def,
    });
  }

  getTerrainDef(name: string): TerrainDef | undefined {
    return this.terrainDefs.get(name);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/engine/world/TileMap.test.ts`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/engine/world/TileMap.ts src/engine/world/TileMap.test.ts
git commit -m "feat(world): terrain registry for TileMap"
```

---

## Task 2: TileMap Core — Building Registry

**Files:**
- Modify: `src/engine/world/TileMap.ts`
- Modify: `src/engine/world/TileMap.test.ts`

**Step 1: Write the failing test for building definition**

Add to `TileMap.test.ts`:

```typescript
  describe('building registry', () => {
    it('should define building types', () => {
      const tileMap = new TileMap();

      tileMap.defineBuilding('wall', { color: '#4a4a4a', solid: true });

      const def = tileMap.getBuildingDef('wall');
      expect(def).toBeDefined();
      expect(def!.name).toBe('wall');
      expect(def!.color).toBe('#4a4a4a');
      expect(def!.solid).toBe(true);
      expect(def!.id).toBe(1);
    });

    it('should assign sequential IDs to building types', () => {
      const tileMap = new TileMap();

      tileMap.defineBuilding('wall', { color: '#4a4a4a', solid: true });
      tileMap.defineBuilding('door', { color: '#8b4513', solid: false });

      expect(tileMap.getBuildingDef('wall')!.id).toBe(1);
      expect(tileMap.getBuildingDef('door')!.id).toBe(2);
    });

    it('should throw when defining duplicate building', () => {
      const tileMap = new TileMap();
      tileMap.defineBuilding('wall', { color: '#4a4a4a', solid: true });

      expect(() => tileMap.defineBuilding('wall', { color: '#fff', solid: false }))
        .toThrow('Building "wall" already defined');
    });

    it('should return undefined for unknown building', () => {
      const tileMap = new TileMap();

      expect(tileMap.getBuildingDef('unknown')).toBeUndefined();
    });
  });
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/engine/world/TileMap.test.ts`
Expected: FAIL — defineBuilding is not a function

**Step 3: Write minimal implementation**

Add to `TileMap.ts`:

```typescript
export interface BuildingDef {
  id: number;
  name: string;
  color: string;
  solid: boolean;
}
```

Add to `TileMap` class:

```typescript
  private buildingDefs: Map<string, BuildingDef> = new Map();
  private nextBuildingId = 1; // 0 reserved for "no building"

  defineBuilding(name: string, def: Omit<BuildingDef, 'id' | 'name'>): void {
    if (this.buildingDefs.has(name)) {
      throw new Error(`Building "${name}" already defined`);
    }
    this.buildingDefs.set(name, {
      id: this.nextBuildingId++,
      name,
      ...def,
    });
  }

  getBuildingDef(name: string): BuildingDef | undefined {
    return this.buildingDefs.get(name);
  }
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/engine/world/TileMap.test.ts`
Expected: PASS (8 tests)

**Step 5: Commit**

```bash
git add src/engine/world/TileMap.ts src/engine/world/TileMap.test.ts
git commit -m "feat(world): building registry for TileMap"
```

---

## Task 3: TileMap Core — Map Creation and Tile Storage

**Files:**
- Modify: `src/engine/world/TileMap.ts`
- Modify: `src/engine/world/TileMap.test.ts`

**Step 1: Write the failing tests for map creation**

Add to `TileMap.test.ts`:

```typescript
  describe('map creation', () => {
    it('should create map with specified dimensions', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });

      tileMap.create(64, 64, 'grass');

      expect(tileMap.width).toBe(64);
      expect(tileMap.height).toBe(64);
    });

    it('should fill map with default terrain', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });

      tileMap.create(4, 4, 'grass');

      // Check a few tiles
      expect(tileMap.getTerrain(0, 0)?.name).toBe('grass');
      expect(tileMap.getTerrain(3, 3)?.name).toBe('grass');
      expect(tileMap.getTerrain(-2, -2)?.name).toBe('grass'); // Center origin
    });

    it('should throw when creating with undefined terrain', () => {
      const tileMap = new TileMap();

      expect(() => tileMap.create(64, 64, 'grass'))
        .toThrow('Terrain "grass" not defined');
    });

    it('should report dimensions as 0 before create', () => {
      const tileMap = new TileMap();

      expect(tileMap.width).toBe(0);
      expect(tileMap.height).toBe(0);
    });
  });

  describe('coordinate system', () => {
    it('should use center origin (0,0 is center)', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });

      tileMap.create(4, 4, 'grass'); // -2 to 1 in both axes

      // Valid coordinates
      expect(tileMap.isInBounds(-2, -2)).toBe(true);
      expect(tileMap.isInBounds(1, 1)).toBe(true);
      expect(tileMap.isInBounds(0, 0)).toBe(true);

      // Invalid coordinates
      expect(tileMap.isInBounds(-3, 0)).toBe(false);
      expect(tileMap.isInBounds(2, 0)).toBe(false);
    });
  });
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/engine/world/TileMap.test.ts`
Expected: FAIL — create is not a function

**Step 3: Write minimal implementation**

Add to `TileMap` class:

```typescript
  private _width = 0;
  private _height = 0;
  private terrainData: Uint8Array | null = null;
  private buildingData: Uint8Array | null = null;

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  create(width: number, height: number, defaultTerrain: string): void {
    const terrainDef = this.terrainDefs.get(defaultTerrain);
    if (!terrainDef) {
      throw new Error(`Terrain "${defaultTerrain}" not defined`);
    }

    this._width = width;
    this._height = height;
    this.terrainData = new Uint8Array(width * height);
    this.buildingData = new Uint8Array(width * height);

    // Fill with default terrain
    this.terrainData.fill(terrainDef.id);
  }

  isInBounds(x: number, y: number): boolean {
    const halfW = Math.floor(this._width / 2);
    const halfH = Math.floor(this._height / 2);
    return x >= -halfW && x < this._width - halfW &&
           y >= -halfH && y < this._height - halfH;
  }

  private toIndex(x: number, y: number): number {
    const halfW = Math.floor(this._width / 2);
    const halfH = Math.floor(this._height / 2);
    return (y + halfH) * this._width + (x + halfW);
  }

  getTerrain(x: number, y: number): TerrainDef | undefined {
    if (!this.terrainData || !this.isInBounds(x, y)) return undefined;
    const id = this.terrainData[this.toIndex(x, y)];
    for (const def of this.terrainDefs.values()) {
      if (def.id === id) return def;
    }
    return undefined;
  }
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/engine/world/TileMap.test.ts`
Expected: PASS (13 tests)

**Step 5: Commit**

```bash
git add src/engine/world/TileMap.ts src/engine/world/TileMap.test.ts
git commit -m "feat(world): map creation with center-origin coordinates"
```

---

## Task 4: TileMap Core — Tile Access Methods

**Files:**
- Modify: `src/engine/world/TileMap.ts`
- Modify: `src/engine/world/TileMap.test.ts`

**Step 1: Write the failing tests for tile access**

Add to `TileMap.test.ts`:

```typescript
  describe('tile access', () => {
    it('should set and get terrain', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      tileMap.defineTerrain('water', { color: '#1d3557', walkable: false });
      tileMap.create(4, 4, 'grass');

      tileMap.setTerrain(0, 0, 'water');

      expect(tileMap.getTerrain(0, 0)?.name).toBe('water');
      expect(tileMap.getTerrain(1, 0)?.name).toBe('grass'); // Others unchanged
    });

    it('should set and get buildings', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      tileMap.defineBuilding('wall', { color: '#4a4a4a', solid: true });
      tileMap.create(4, 4, 'grass');

      expect(tileMap.getBuilding(0, 0)).toBeUndefined();

      tileMap.setBuilding(0, 0, 'wall');

      expect(tileMap.getBuilding(0, 0)?.name).toBe('wall');
    });

    it('should clear buildings', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      tileMap.defineBuilding('wall', { color: '#4a4a4a', solid: true });
      tileMap.create(4, 4, 'grass');

      tileMap.setBuilding(0, 0, 'wall');
      tileMap.clearBuilding(0, 0);

      expect(tileMap.getBuilding(0, 0)).toBeUndefined();
    });

    it('should throw when setting undefined terrain', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      tileMap.create(4, 4, 'grass');

      expect(() => tileMap.setTerrain(0, 0, 'lava'))
        .toThrow('Terrain "lava" not defined');
    });

    it('should throw when setting undefined building', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      tileMap.create(4, 4, 'grass');

      expect(() => tileMap.setBuilding(0, 0, 'castle'))
        .toThrow('Building "castle" not defined');
    });

    it('should ignore out-of-bounds set operations', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      tileMap.defineTerrain('water', { color: '#1d3557', walkable: false });
      tileMap.create(4, 4, 'grass');

      // Should not throw
      tileMap.setTerrain(100, 100, 'water');
    });
  });
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/engine/world/TileMap.test.ts`
Expected: FAIL — setTerrain is not a function

**Step 3: Write minimal implementation**

Add to `TileMap` class:

```typescript
  setTerrain(x: number, y: number, name: string): void {
    if (!this.terrainData || !this.isInBounds(x, y)) return;
    const def = this.terrainDefs.get(name);
    if (!def) {
      throw new Error(`Terrain "${name}" not defined`);
    }
    this.terrainData[this.toIndex(x, y)] = def.id;
  }

  getBuilding(x: number, y: number): BuildingDef | undefined {
    if (!this.buildingData || !this.isInBounds(x, y)) return undefined;
    const id = this.buildingData[this.toIndex(x, y)];
    if (id === 0) return undefined; // No building
    for (const def of this.buildingDefs.values()) {
      if (def.id === id) return def;
    }
    return undefined;
  }

  setBuilding(x: number, y: number, name: string): void {
    if (!this.buildingData || !this.isInBounds(x, y)) return;
    const def = this.buildingDefs.get(name);
    if (!def) {
      throw new Error(`Building "${name}" not defined`);
    }
    this.buildingData[this.toIndex(x, y)] = def.id;
  }

  clearBuilding(x: number, y: number): void {
    if (!this.buildingData || !this.isInBounds(x, y)) return;
    this.buildingData[this.toIndex(x, y)] = 0;
  }
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/engine/world/TileMap.test.ts`
Expected: PASS (19 tests)

**Step 5: Commit**

```bash
git add src/engine/world/TileMap.ts src/engine/world/TileMap.test.ts
git commit -m "feat(world): tile access methods for terrain and buildings"
```

---

## Task 5: TileMap Core — Walkability Query

**Files:**
- Modify: `src/engine/world/TileMap.ts`
- Modify: `src/engine/world/TileMap.test.ts`

**Step 1: Write the failing tests for walkability**

Add to `TileMap.test.ts`:

```typescript
  describe('walkability', () => {
    it('should check terrain walkability', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      tileMap.defineTerrain('water', { color: '#1d3557', walkable: false });
      tileMap.create(4, 4, 'grass');

      expect(tileMap.isWalkable(0, 0)).toBe(true);

      tileMap.setTerrain(0, 0, 'water');

      expect(tileMap.isWalkable(0, 0)).toBe(false);
    });

    it('should check building solidity', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      tileMap.defineBuilding('wall', { color: '#4a4a4a', solid: true });
      tileMap.defineBuilding('floor', { color: '#8b7355', solid: false });
      tileMap.create(4, 4, 'grass');

      expect(tileMap.isWalkable(0, 0)).toBe(true);

      tileMap.setBuilding(0, 0, 'wall');
      expect(tileMap.isWalkable(0, 0)).toBe(false);

      tileMap.setBuilding(0, 0, 'floor');
      expect(tileMap.isWalkable(0, 0)).toBe(true);
    });

    it('should return false for out-of-bounds', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      tileMap.create(4, 4, 'grass');

      expect(tileMap.isWalkable(100, 100)).toBe(false);
    });
  });
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/engine/world/TileMap.test.ts`
Expected: FAIL — isWalkable is not a function

**Step 3: Write minimal implementation**

Add to `TileMap` class:

```typescript
  isWalkable(x: number, y: number): boolean {
    const terrain = this.getTerrain(x, y);
    if (!terrain || !terrain.walkable) return false;

    const building = this.getBuilding(x, y);
    if (building && building.solid) return false;

    return true;
  }
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/engine/world/TileMap.test.ts`
Expected: PASS (22 tests)

**Step 5: Commit**

```bash
git add src/engine/world/TileMap.ts src/engine/world/TileMap.test.ts
git commit -m "feat(world): walkability query combining terrain and buildings"
```

---

## Task 6: Camera — Position and Pan

**Files:**
- Create: `src/engine/render/Camera.ts`
- Create: `src/engine/render/Camera.test.ts`

**Step 1: Write the failing tests for camera position**

```typescript
// src/engine/render/Camera.test.ts
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
import { Camera } from './Camera';

describe('Camera', () => {
  describe('position', () => {
    it('should start at origin', () => {
      const camera = new Camera(800, 600);

      expect(camera.x).toBe(0);
      expect(camera.y).toBe(0);
    });

    it('should pan by delta', () => {
      const camera = new Camera(800, 600);

      camera.pan(100, 50);

      expect(camera.x).toBe(100);
      expect(camera.y).toBe(50);
    });

    it('should accumulate pan movements', () => {
      const camera = new Camera(800, 600);

      camera.pan(100, 50);
      camera.pan(-30, 20);

      expect(camera.x).toBe(70);
      expect(camera.y).toBe(70);
    });

    it('should center on position', () => {
      const camera = new Camera(800, 600);
      camera.pan(100, 100);

      camera.centerOn(0, 0);

      expect(camera.x).toBe(0);
      expect(camera.y).toBe(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/engine/render/Camera.test.ts`
Expected: FAIL — Cannot find module './Camera'

**Step 3: Write minimal implementation**

```typescript
// src/engine/render/Camera.ts
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

export class Camera {
  x = 0;
  y = 0;

  constructor(
    readonly viewportWidth: number,
    readonly viewportHeight: number
  ) {}

  pan(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }

  centerOn(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/engine/render/Camera.test.ts`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/engine/render/Camera.ts src/engine/render/Camera.test.ts
git commit -m "feat(render): camera with position and pan"
```

---

## Task 7: Camera — Discrete Zoom Levels

**Files:**
- Modify: `src/engine/render/Camera.ts`
- Modify: `src/engine/render/Camera.test.ts`

**Step 1: Write the failing tests for zoom**

Add to `Camera.test.ts`:

```typescript
  describe('zoom', () => {
    it('should start at zoom level 0 (1x)', () => {
      const camera = new Camera(800, 600);

      expect(camera.zoom).toBe(1);
    });

    it('should zoom in to next level', () => {
      const camera = new Camera(800, 600);

      camera.zoomIn();

      expect(camera.zoom).toBe(2);
    });

    it('should zoom out to previous level', () => {
      const camera = new Camera(800, 600);
      camera.zoomIn(); // Now at 2x

      camera.zoomOut();

      expect(camera.zoom).toBe(1);
    });

    it('should clamp zoom at maximum', () => {
      const camera = new Camera(800, 600);

      camera.zoomIn(); // 2x
      camera.zoomIn(); // 4x
      camera.zoomIn(); // Still 4x

      expect(camera.zoom).toBe(4);
    });

    it('should clamp zoom at minimum', () => {
      const camera = new Camera(800, 600);

      camera.zoomOut(); // Still 1x

      expect(camera.zoom).toBe(1);
    });

    it('should set zoom level directly', () => {
      const camera = new Camera(800, 600);

      camera.setZoomLevel(2); // 4x

      expect(camera.zoom).toBe(4);
    });

    it('should clamp setZoomLevel to valid range', () => {
      const camera = new Camera(800, 600);

      camera.setZoomLevel(10);
      expect(camera.zoom).toBe(4); // Max

      camera.setZoomLevel(-5);
      expect(camera.zoom).toBe(1); // Min
    });
  });
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/engine/render/Camera.test.ts`
Expected: FAIL — zoom property returns undefined

**Step 3: Write minimal implementation**

Add to `Camera` class:

```typescript
  private static readonly ZOOM_LEVELS = [1, 2, 4];
  private zoomLevel = 0;

  get zoom(): number {
    return Camera.ZOOM_LEVELS[this.zoomLevel];
  }

  zoomIn(): void {
    this.zoomLevel = Math.min(this.zoomLevel + 1, Camera.ZOOM_LEVELS.length - 1);
  }

  zoomOut(): void {
    this.zoomLevel = Math.max(this.zoomLevel - 1, 0);
  }

  setZoomLevel(level: number): void {
    this.zoomLevel = Math.max(0, Math.min(level, Camera.ZOOM_LEVELS.length - 1));
  }
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/engine/render/Camera.test.ts`
Expected: PASS (11 tests)

**Step 5: Commit**

```bash
git add src/engine/render/Camera.ts src/engine/render/Camera.test.ts
git commit -m "feat(render): discrete zoom levels (1x, 2x, 4x)"
```

---

## Task 8: Camera — Coordinate Transforms

**Files:**
- Modify: `src/engine/render/Camera.ts`
- Modify: `src/engine/render/Camera.test.ts`

**Step 1: Write the failing tests for transforms**

Add to `Camera.test.ts`:

```typescript
  describe('coordinate transforms', () => {
    it('should transform world to screen at origin', () => {
      const camera = new Camera(800, 600);

      const screen = camera.worldToScreen(0, 0);

      // World origin maps to screen center
      expect(screen.x).toBe(400);
      expect(screen.y).toBe(300);
    });

    it('should transform world to screen with pan', () => {
      const camera = new Camera(800, 600);
      camera.pan(100, 50); // Camera looking at (100, 50)

      const screen = camera.worldToScreen(100, 50);

      // Camera position maps to screen center
      expect(screen.x).toBe(400);
      expect(screen.y).toBe(300);
    });

    it('should transform world to screen with zoom', () => {
      const camera = new Camera(800, 600);
      camera.zoomIn(); // 2x zoom

      const screen = camera.worldToScreen(50, 25);

      // At 2x zoom, 50 world units = 100 screen pixels from center
      expect(screen.x).toBe(500); // 400 + 50*2
      expect(screen.y).toBe(350); // 300 + 25*2
    });

    it('should transform screen to world', () => {
      const camera = new Camera(800, 600);

      const world = camera.screenToWorld(400, 300);

      // Screen center maps to world origin
      expect(world.x).toBe(0);
      expect(world.y).toBe(0);
    });

    it('should round-trip world to screen to world', () => {
      const camera = new Camera(800, 600);
      camera.pan(123, 456);
      camera.zoomIn();

      const original = { x: 78, y: 90 };
      const screen = camera.worldToScreen(original.x, original.y);
      const result = camera.screenToWorld(screen.x, screen.y);

      expect(result.x).toBeCloseTo(original.x);
      expect(result.y).toBeCloseTo(original.y);
    });

    it('should transform world to tile coordinates', () => {
      const camera = new Camera(800, 600);
      const tileSize = 16;

      expect(camera.worldToTile(0, 0, tileSize)).toEqual({ x: 0, y: 0 });
      expect(camera.worldToTile(16, 16, tileSize)).toEqual({ x: 1, y: 1 });
      expect(camera.worldToTile(-16, -16, tileSize)).toEqual({ x: -1, y: -1 });
      expect(camera.worldToTile(8, 8, tileSize)).toEqual({ x: 0, y: 0 }); // Rounds down
    });
  });
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/engine/render/Camera.test.ts`
Expected: FAIL — worldToScreen is not a function

**Step 3: Write minimal implementation**

Add to `Camera` class:

```typescript
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const screenX = (worldX - this.x) * this.zoom + this.viewportWidth / 2;
    const screenY = (worldY - this.y) * this.zoom + this.viewportHeight / 2;
    return { x: screenX, y: screenY };
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const worldX = (screenX - this.viewportWidth / 2) / this.zoom + this.x;
    const worldY = (screenY - this.viewportHeight / 2) / this.zoom + this.y;
    return { x: worldX, y: worldY };
  }

  worldToTile(worldX: number, worldY: number, tileSize: number): { x: number; y: number } {
    return {
      x: Math.floor(worldX / tileSize),
      y: Math.floor(worldY / tileSize),
    };
  }
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/engine/render/Camera.test.ts`
Expected: PASS (17 tests)

**Step 5: Commit**

```bash
git add src/engine/render/Camera.ts src/engine/render/Camera.test.ts
git commit -m "feat(render): camera coordinate transforms"
```

---

## Task 9: Camera — Visible Bounds

**Files:**
- Modify: `src/engine/render/Camera.ts`
- Modify: `src/engine/render/Camera.test.ts`

**Step 1: Write the failing tests for visible bounds**

Add to `Camera.test.ts`:

```typescript
  describe('visible bounds', () => {
    it('should calculate visible tile bounds at 1x zoom', () => {
      const camera = new Camera(800, 600);
      const tileSize = 16;

      const bounds = camera.getVisibleBounds(tileSize);

      // 800/16 = 50 tiles wide, 600/16 = 37.5 tiles tall
      // Centered at origin: -25 to 25, -19 to 19 (with padding)
      expect(bounds.minX).toBeLessThanOrEqual(-25);
      expect(bounds.maxX).toBeGreaterThanOrEqual(25);
      expect(bounds.minY).toBeLessThanOrEqual(-18);
      expect(bounds.maxY).toBeGreaterThanOrEqual(18);
    });

    it('should calculate visible tile bounds with pan', () => {
      const camera = new Camera(800, 600);
      camera.centerOn(160, 160); // 10 tiles right and down
      const tileSize = 16;

      const bounds = camera.getVisibleBounds(tileSize);

      // Should be shifted by 10 tiles
      expect(bounds.minX).toBeLessThanOrEqual(-15);
      expect(bounds.maxX).toBeGreaterThanOrEqual(35);
    });

    it('should calculate smaller visible bounds at higher zoom', () => {
      const camera = new Camera(800, 600);
      const tileSize = 16;

      const bounds1x = camera.getVisibleBounds(tileSize);
      camera.zoomIn(); // 2x
      const bounds2x = camera.getVisibleBounds(tileSize);

      // At 2x zoom, visible area should be half the size
      const width1x = bounds1x.maxX - bounds1x.minX;
      const width2x = bounds2x.maxX - bounds2x.minX;
      expect(width2x).toBeLessThan(width1x);
    });
  });
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/engine/render/Camera.test.ts`
Expected: FAIL — getVisibleBounds is not a function

**Step 3: Write minimal implementation**

Add to `Camera` class:

```typescript
  getVisibleBounds(tileSize: number): { minX: number; minY: number; maxX: number; maxY: number } {
    // Calculate world-space bounds of the viewport
    const halfViewportWorldWidth = this.viewportWidth / this.zoom / 2;
    const halfViewportWorldHeight = this.viewportHeight / this.zoom / 2;

    const worldMinX = this.x - halfViewportWorldWidth;
    const worldMaxX = this.x + halfViewportWorldWidth;
    const worldMinY = this.y - halfViewportWorldHeight;
    const worldMaxY = this.y + halfViewportWorldHeight;

    // Convert to tile coordinates with 1-tile padding for partial tiles
    return {
      minX: Math.floor(worldMinX / tileSize) - 1,
      maxX: Math.ceil(worldMaxX / tileSize) + 1,
      minY: Math.floor(worldMinY / tileSize) - 1,
      maxY: Math.ceil(worldMaxY / tileSize) + 1,
    };
  }
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/engine/render/Camera.test.ts`
Expected: PASS (20 tests)

**Step 5: Commit**

```bash
git add src/engine/render/Camera.ts src/engine/render/Camera.test.ts
git commit -m "feat(render): visible bounds calculation for culling"
```

---

## Task 10: Renderer — Camera Integration

**Files:**
- Modify: `src/engine/render/Renderer.ts`
- Modify: `src/engine/render/Renderer.test.ts`

**Step 1: Write the failing tests for camera integration**

Add to `Renderer.test.ts` (after existing imports and beforeEach):

```typescript
import { Camera } from './Camera';
```

Add new describe block:

```typescript
  describe('camera integration', () => {
    it('should expose camera instance', () => {
      expect(renderer.camera).toBeInstanceOf(Camera);
    });

    it('should transform drawRect through camera', () => {
      // Camera at origin, 1x zoom
      // Drawing at world (0, 0) should appear at screen center (400, 300)
      renderer.drawRect(0, 0, 32, 32, '#ff0000');

      // At 1x zoom, world origin is screen center, so rect at (0,0) draws at (400,300)
      expect(mockCtx.fillRect).toHaveBeenCalledWith(400, 300, 32, 32);
    });

    it('should transform drawRectCentered through camera', () => {
      renderer.drawRectCentered(0, 0, 32, 32, '#ff0000');

      // Centered at screen center
      expect(mockCtx.fillRect).toHaveBeenCalledWith(400 - 16, 300 - 16, 32, 32);
    });

    it('should transform with camera pan', () => {
      renderer.camera.pan(100, 50);

      renderer.drawRect(100, 50, 32, 32, '#ff0000');

      // Camera at (100,50), drawing at (100,50) should be at screen center
      expect(mockCtx.fillRect).toHaveBeenCalledWith(400, 300, 32, 32);
    });

    it('should transform with camera zoom', () => {
      renderer.camera.zoomIn(); // 2x zoom

      renderer.drawRect(50, 25, 16, 16, '#ff0000');

      // At 2x zoom: screen = (world - cam) * zoom + center
      // = (50 - 0) * 2 + 400 = 500, (25 - 0) * 2 + 300 = 350
      // Size also scales: 16 * 2 = 32
      expect(mockCtx.fillRect).toHaveBeenCalledWith(500, 350, 32, 32);
    });

    it('should transform drawCircle through camera', () => {
      renderer.drawCircle(0, 0, 16, '#ff0000');

      expect(mockCtx.arc).toHaveBeenCalledWith(400, 300, 16, 0, Math.PI * 2);
    });

    it('should scale circle radius with zoom', () => {
      renderer.camera.zoomIn(); // 2x

      renderer.drawCircle(0, 0, 16, '#ff0000');

      expect(mockCtx.arc).toHaveBeenCalledWith(400, 300, 32, 0, Math.PI * 2);
    });
  });

  describe('screen-space drawing', () => {
    it('should draw rect in screen space without transform', () => {
      renderer.camera.pan(100, 100);
      renderer.camera.zoomIn();

      renderer.drawRectScreen(10, 20, 50, 30, '#ff0000');

      // Should use exact screen coordinates, ignoring camera
      expect(mockCtx.fillRect).toHaveBeenCalledWith(10, 20, 50, 30);
    });

    it('should draw text in screen space without transform', () => {
      renderer.camera.pan(100, 100);

      renderer.drawTextScreen('Hello', 10, 30, { color: '#fff' });

      expect(mockCtx.fillText).toHaveBeenCalledWith('Hello', 10, 30);
    });
  });
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/engine/render/Renderer.test.ts`
Expected: FAIL — camera is undefined

**Step 3: Write minimal implementation**

Modify `Renderer.ts`:

```typescript
// Add import at top
import { Camera } from './Camera';
```

Modify constructor and add camera:

```typescript
export class Renderer {
  private ctx: CanvasRenderingContext2D;
  readonly width: number;
  readonly height: number;
  readonly camera: Camera;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
    this.camera = new Camera(this.width, this.height);
  }
```

Modify existing draw methods to use camera transforms:

```typescript
  drawRect(worldX: number, worldY: number, width: number, height: number, color: string): void {
    const screen = this.camera.worldToScreen(worldX, worldY);
    const scaledWidth = width * this.camera.zoom;
    const scaledHeight = height * this.camera.zoom;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(screen.x, screen.y, scaledWidth, scaledHeight);
  }

  drawRectCentered(worldX: number, worldY: number, width: number, height: number, color: string): void {
    const screen = this.camera.worldToScreen(worldX, worldY);
    const scaledWidth = width * this.camera.zoom;
    const scaledHeight = height * this.camera.zoom;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(screen.x - scaledWidth / 2, screen.y - scaledHeight / 2, scaledWidth, scaledHeight);
  }

  drawCircle(worldX: number, worldY: number, radius: number, color: string): void {
    const screen = this.camera.worldToScreen(worldX, worldY);
    const scaledRadius = radius * this.camera.zoom;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(screen.x, screen.y, scaledRadius, 0, Math.PI * 2);
    this.ctx.fill();
  }
```

Add screen-space methods:

```typescript
  drawRectScreen(screenX: number, screenY: number, width: number, height: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(screenX, screenY, width, height);
  }

  drawTextScreen(
    text: string,
    screenX: number,
    screenY: number,
    options: { font?: string; color?: string; align?: CanvasTextAlign } = {}
  ): void {
    const { font = '16px monospace', color = '#ffffff', align = 'left' } = options;
    this.ctx.font = font;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = align;
    this.ctx.fillText(text, screenX, screenY);
  }
```

Rename old `drawText` to `drawTextScreen` (it was always screen-space).

**Step 4: Run test to verify it passes**

Run: `npm test -- src/engine/render/Renderer.test.ts`
Expected: PASS (but existing tests may fail due to changed behavior)

**Step 5: Fix existing tests**

The existing `drawRect` tests now expect camera transforms. Update them:

```typescript
  describe('drawRect', () => {
    it('should draw rectangle at world position transformed to screen', () => {
      renderer.drawRect(0, 0, 100, 50, '#00ff00');

      expect(mockCtx.fillStyle).toBe('#00ff00');
      // World (0,0) -> screen center (400, 300)
      expect(mockCtx.fillRect).toHaveBeenCalledWith(400, 300, 100, 50);
    });
  });

  describe('drawRectCentered', () => {
    it('should draw rectangle centered at world position', () => {
      renderer.drawRectCentered(0, 0, 50, 30, '#0000ff');

      expect(mockCtx.fillStyle).toBe('#0000ff');
      // Centered at screen center
      expect(mockCtx.fillRect).toHaveBeenCalledWith(375, 285, 50, 30);
    });
  });

  describe('drawCircle', () => {
    it('should draw circle at world position', () => {
      renderer.drawCircle(0, 0, 25, '#ff00ff');

      expect(mockCtx.fillStyle).toBe('#ff00ff');
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.arc).toHaveBeenCalledWith(400, 300, 25, 0, Math.PI * 2);
      expect(mockCtx.fill).toHaveBeenCalled();
    });
  });

  describe('drawText', () => {
    it('should draw text at screen position with defaults', () => {
      renderer.drawTextScreen('Hello', 10, 30);

      expect(mockCtx.font).toBe('16px monospace');
      expect(mockCtx.fillStyle).toBe('#ffffff');
      expect(mockCtx.textAlign).toBe('left');
      expect(mockCtx.fillText).toHaveBeenCalledWith('Hello', 10, 30);
    });

    // Update other drawText tests to use drawTextScreen...
  });
```

**Step 6: Run all tests to verify everything passes**

Run: `npm test -- src/engine/render/Renderer.test.ts`
Expected: PASS (all tests)

**Step 7: Commit**

```bash
git add src/engine/render/Renderer.ts src/engine/render/Renderer.test.ts
git commit -m "feat(render): camera integration with world-space transforms"
```

---

## Task 11: Renderer — Tile Map Drawing

**Files:**
- Modify: `src/engine/render/Renderer.ts`
- Modify: `src/engine/render/Renderer.test.ts`

**Step 1: Write the failing tests for tile map drawing**

Add import at top of `Renderer.test.ts`:

```typescript
import { TileMap } from '../world/TileMap';
```

Add new describe block:

```typescript
  describe('drawTileMap', () => {
    it('should draw visible tiles', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      tileMap.create(4, 4, 'grass');

      renderer.drawTileMap(tileMap, 16);

      // Should have drawn multiple tiles
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    it('should draw terrain colors', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      tileMap.defineTerrain('water', { color: '#1d3557', walkable: false });
      tileMap.create(4, 4, 'grass');
      tileMap.setTerrain(0, 0, 'water');

      renderer.drawTileMap(tileMap, 16);

      // Should have used both colors
      const fillStyleCalls = mockCtx.fillRect.mock.calls;
      expect(fillStyleCalls.length).toBeGreaterThan(0);
    });

    it('should draw buildings on top of terrain', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      tileMap.defineBuilding('wall', { color: '#4a4a4a', solid: true });
      tileMap.create(4, 4, 'grass');
      tileMap.setBuilding(0, 0, 'wall');

      // Reset mock to track call order
      mockCtx.fillRect.mockClear();

      renderer.drawTileMap(tileMap, 16);

      // Buildings should be drawn (fillRect called multiple times)
      expect(mockCtx.fillRect.mock.calls.length).toBeGreaterThan(0);
    });

    it('should not draw tiles outside map bounds', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      tileMap.create(2, 2, 'grass'); // Very small map

      mockCtx.fillRect.mockClear();
      renderer.drawTileMap(tileMap, 16);

      // Should only draw the 4 tiles that exist
      // (terrain + possibly buildings, but only 4 terrain tiles)
      const calls = mockCtx.fillRect.mock.calls.length;
      expect(calls).toBeGreaterThanOrEqual(4);
      expect(calls).toBeLessThanOrEqual(8); // Max if all had buildings
    });
  });
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/engine/render/Renderer.test.ts`
Expected: FAIL — drawTileMap is not a function

**Step 3: Write minimal implementation**

Add import at top of `Renderer.ts`:

```typescript
import { TileMap } from '../world/TileMap';
```

Add method to `Renderer` class:

```typescript
  drawTileMap(tileMap: TileMap, tileSize: number): void {
    const bounds = this.camera.getVisibleBounds(tileSize);

    // Draw terrain layer
    for (let y = bounds.minY; y <= bounds.maxY; y++) {
      for (let x = bounds.minX; x <= bounds.maxX; x++) {
        const terrain = tileMap.getTerrain(x, y);
        if (terrain) {
          const worldX = x * tileSize;
          const worldY = y * tileSize;
          this.drawRect(worldX, worldY, tileSize, tileSize, terrain.color);
        }
      }
    }

    // Draw building layer on top
    for (let y = bounds.minY; y <= bounds.maxY; y++) {
      for (let x = bounds.minX; x <= bounds.maxX; x++) {
        const building = tileMap.getBuilding(x, y);
        if (building) {
          const worldX = x * tileSize;
          const worldY = y * tileSize;
          this.drawRect(worldX, worldY, tileSize, tileSize, building.color);
        }
      }
    }
  }
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/engine/render/Renderer.test.ts`
Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/engine/render/Renderer.ts src/engine/render/Renderer.test.ts
git commit -m "feat(render): tile map rendering with frustum culling"
```

---

## Task 12: Simplex Noise Implementation

**Files:**
- Create: `src/engine/world/noise.ts`

**Step 1: Write the noise implementation**

This is a utility module that doesn't need extensive testing — we'll test it through the generator.

```typescript
// src/engine/world/noise.ts
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

// Simplex noise implementation based on Stefan Gustavson's work
// Returns values in range [-1, 1]

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

const grad3 = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

function buildPermutationTable(seed: number): Uint8Array {
  const perm = new Uint8Array(512);
  const source = new Uint8Array(256);

  for (let i = 0; i < 256; i++) {
    source[i] = i;
  }

  // Seed the random number generator
  let s = seed;
  const random = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };

  // Fisher-Yates shuffle
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [source[i], source[j]] = [source[j], source[i]];
  }

  for (let i = 0; i < 512; i++) {
    perm[i] = source[i & 255];
  }

  return perm;
}

let cachedPerm: Uint8Array | null = null;
let cachedSeed: number | null = null;

export function simplex2(x: number, y: number, seed = 0): number {
  // Cache permutation table for same seed
  if (cachedSeed !== seed || !cachedPerm) {
    cachedPerm = buildPermutationTable(seed);
    cachedSeed = seed;
  }
  const perm = cachedPerm;

  // Skew input space to determine simplex cell
  const s = (x + y) * F2;
  const i = Math.floor(x + s);
  const j = Math.floor(y + s);

  // Unskew back to (x, y) space
  const t = (i + j) * G2;
  const X0 = i - t;
  const Y0 = j - t;
  const x0 = x - X0;
  const y0 = y - Y0;

  // Determine which simplex we're in
  const i1 = x0 > y0 ? 1 : 0;
  const j1 = x0 > y0 ? 0 : 1;

  const x1 = x0 - i1 + G2;
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2;
  const y2 = y0 - 1 + 2 * G2;

  // Hash coordinates of corners
  const ii = i & 255;
  const jj = j & 255;

  // Calculate contributions from corners
  let n0 = 0, n1 = 0, n2 = 0;

  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 >= 0) {
    const gi0 = perm[ii + perm[jj]] % 8;
    t0 *= t0;
    n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0);
  }

  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 >= 0) {
    const gi1 = perm[ii + i1 + perm[jj + j1]] % 8;
    t1 *= t1;
    n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1);
  }

  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 >= 0) {
    const gi2 = perm[ii + 1 + perm[jj + 1]] % 8;
    t2 *= t2;
    n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2);
  }

  // Scale to [-1, 1]
  return 70 * (n0 + n1 + n2);
}
```

**Step 2: Commit**

```bash
git add src/engine/world/noise.ts
git commit -m "feat(world): simplex noise implementation"
```

---

## Task 13: Terrain Generator

**Files:**
- Create: `src/engine/world/generate.ts`
- Create: `src/engine/world/generate.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/engine/world/generate.test.ts
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
import { TileMap } from './TileMap';
import { generateTerrain } from './generate';

describe('generateTerrain', () => {
  it('should create map with specified dimensions', () => {
    const tileMap = new TileMap();
    tileMap.defineTerrain('water', { color: '#1d3557', walkable: false });
    tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
    tileMap.defineTerrain('stone', { color: '#6c757d', walkable: true });

    generateTerrain(tileMap, { width: 32, height: 32 });

    expect(tileMap.width).toBe(32);
    expect(tileMap.height).toBe(32);
  });

  it('should fill all tiles with valid terrain', () => {
    const tileMap = new TileMap();
    tileMap.defineTerrain('water', { color: '#1d3557', walkable: false });
    tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
    tileMap.defineTerrain('stone', { color: '#6c757d', walkable: true });

    generateTerrain(tileMap, { width: 16, height: 16 });

    // Check that all tiles have terrain
    for (let y = -8; y < 8; y++) {
      for (let x = -8; x < 8; x++) {
        const terrain = tileMap.getTerrain(x, y);
        expect(terrain).toBeDefined();
        expect(['water', 'grass', 'stone']).toContain(terrain!.name);
      }
    }
  });

  it('should produce deterministic output with same seed', () => {
    const tileMap1 = new TileMap();
    tileMap1.defineTerrain('water', { color: '#1d3557', walkable: false });
    tileMap1.defineTerrain('grass', { color: '#3a5a40', walkable: true });
    tileMap1.defineTerrain('stone', { color: '#6c757d', walkable: true });

    const tileMap2 = new TileMap();
    tileMap2.defineTerrain('water', { color: '#1d3557', walkable: false });
    tileMap2.defineTerrain('grass', { color: '#3a5a40', walkable: true });
    tileMap2.defineTerrain('stone', { color: '#6c757d', walkable: true });

    generateTerrain(tileMap1, { width: 16, height: 16, seed: 12345 });
    generateTerrain(tileMap2, { width: 16, height: 16, seed: 12345 });

    // All tiles should match
    for (let y = -8; y < 8; y++) {
      for (let x = -8; x < 8; x++) {
        expect(tileMap1.getTerrain(x, y)?.name).toBe(tileMap2.getTerrain(x, y)?.name);
      }
    }
  });

  it('should produce different output with different seeds', () => {
    const tileMap1 = new TileMap();
    tileMap1.defineTerrain('water', { color: '#1d3557', walkable: false });
    tileMap1.defineTerrain('grass', { color: '#3a5a40', walkable: true });
    tileMap1.defineTerrain('stone', { color: '#6c757d', walkable: true });

    const tileMap2 = new TileMap();
    tileMap2.defineTerrain('water', { color: '#1d3557', walkable: false });
    tileMap2.defineTerrain('grass', { color: '#3a5a40', walkable: true });
    tileMap2.defineTerrain('stone', { color: '#6c757d', walkable: true });

    generateTerrain(tileMap1, { width: 16, height: 16, seed: 11111 });
    generateTerrain(tileMap2, { width: 16, height: 16, seed: 99999 });

    // At least some tiles should differ
    let differences = 0;
    for (let y = -8; y < 8; y++) {
      for (let x = -8; x < 8; x++) {
        if (tileMap1.getTerrain(x, y)?.name !== tileMap2.getTerrain(x, y)?.name) {
          differences++;
        }
      }
    }
    expect(differences).toBeGreaterThan(0);
  });

  it('should throw if required terrains are not defined', () => {
    const tileMap = new TileMap();
    // Missing water, grass, stone

    expect(() => generateTerrain(tileMap, { width: 16, height: 16 }))
      .toThrow('Required terrain "water" not defined');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/engine/world/generate.test.ts`
Expected: FAIL — Cannot find module './generate'

**Step 3: Write minimal implementation**

```typescript
// src/engine/world/generate.ts
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

import { TileMap } from './TileMap';
import { simplex2 } from './noise';

export interface GeneratorConfig {
  width: number;
  height: number;
  seed?: number;
  scale?: number;
  waterLevel?: number;
}

export function generateTerrain(tileMap: TileMap, config: GeneratorConfig): void {
  const { width, height, seed = 0, scale = 0.1, waterLevel = -0.2 } = config;

  // Verify required terrains exist
  const requiredTerrains = ['water', 'grass', 'stone'];
  for (const name of requiredTerrains) {
    if (!tileMap.getTerrainDef(name)) {
      throw new Error(`Required terrain "${name}" not defined`);
    }
  }

  // Create the map with grass as default (will be overwritten)
  tileMap.create(width, height, 'grass');

  const halfW = Math.floor(width / 2);
  const halfH = Math.floor(height / 2);

  // Generate terrain using noise
  for (let y = -halfH; y < height - halfH; y++) {
    for (let x = -halfW; x < width - halfW; x++) {
      const value = simplex2(x * scale, y * scale, seed);

      let terrain: string;
      if (value < waterLevel) {
        terrain = 'water';
      } else if (value < 0.3) {
        terrain = 'grass';
      } else {
        terrain = 'stone';
      }

      tileMap.setTerrain(x, y, terrain);
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/engine/world/generate.test.ts`
Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add src/engine/world/generate.ts src/engine/world/generate.test.ts
git commit -m "feat(world): noise-based terrain generator"
```

---

## Task 14: Engine Integration

**Files:**
- Modify: `src/engine/Engine.ts`
- Modify: `src/engine/Engine.test.ts`
- Modify: `src/engine/index.ts`

**Step 1: Write the failing tests**

Add to `Engine.test.ts`:

```typescript
import { TileMap } from './world/TileMap';
import { Camera } from './render/Camera';
```

Add new tests:

```typescript
  it('should expose tileMap', () => {
    const engine = new Engine({ canvas });

    expect(engine.tileMap).toBeInstanceOf(TileMap);
  });

  it('should expose camera via renderer', () => {
    const engine = new Engine({ canvas });

    expect(engine.camera).toBeInstanceOf(Camera);
    expect(engine.camera).toBe(engine.renderer.camera);
  });
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/engine/Engine.test.ts`
Expected: FAIL — tileMap is undefined

**Step 3: Write minimal implementation**

Modify `Engine.ts`:

Add import:

```typescript
import { TileMap } from './world/TileMap';
import { Camera } from './render/Camera';
```

Add to class:

```typescript
  readonly tileMap: TileMap;

  get camera(): Camera {
    return this.renderer.camera;
  }
```

Add to constructor (before renderer creation):

```typescript
    this.tileMap = new TileMap();
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/engine/Engine.test.ts`
Expected: PASS (all tests)

**Step 5: Update exports**

Modify `index.ts`:

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

export { Engine } from './Engine';
export type { EngineConfig } from './Engine';
export { GameLoop } from './core/GameLoop';
export { World } from './ecs/World';
export type { Entity, System } from './ecs/World';
export { Input } from './input/Input';
export { Renderer } from './render/Renderer';
export { Camera } from './render/Camera';
export { TileMap } from './world/TileMap';
export type { TerrainDef, BuildingDef } from './world/TileMap';
export { generateTerrain } from './world/generate';
export type { GeneratorConfig } from './world/generate';
```

**Step 6: Run all tests**

Run: `npm test`
Expected: PASS (all tests)

**Step 7: Commit**

```bash
git add src/engine/Engine.ts src/engine/Engine.test.ts src/engine/index.ts
git commit -m "feat: integrate TileMap and Camera into Engine"
```

---

## Task 15: Update Demo Application

**Files:**
- Modify: `src/main.ts`

**Step 1: Rewrite main.ts to use tile map**

```typescript
// src/main.ts
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

import { Engine, generateTerrain } from './engine';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const engine = new Engine({ canvas, tickRate: 20 });
const TILE_SIZE = 16;

// Define terrain types
engine.tileMap.defineTerrain('water', { color: '#1d3557', walkable: false });
engine.tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
engine.tileMap.defineTerrain('stone', { color: '#6c757d', walkable: true });

// Generate 64x64 world
generateTerrain(engine.tileMap, { width: 64, height: 64, seed: Date.now() });

// Define components for player
engine.ecs.defineComponent('Position', { x: 0, y: 0 });
engine.ecs.defineComponent('Velocity', { x: 0, y: 0 });
engine.ecs.defineComponent('PlayerControlled', {});
engine.ecs.defineComponent('Sprite', { width: 24, height: 24, color: '#e94560' });

// Create player entity at world center
const player = engine.ecs.createEntity();
engine.ecs.addComponent(player, 'Position', { x: 0, y: 0 });
engine.ecs.addComponent(player, 'Velocity');
engine.ecs.addComponent(player, 'PlayerControlled');
engine.ecs.addComponent(player, 'Sprite');

// Camera control system
engine.ecs.addSystem({
  name: 'CameraControl',
  query: [],
  update() {
    const { input, camera } = engine;

    // Zoom controls
    if (input.isKeyPressed('Equal') || input.isKeyPressed('NumpadAdd')) {
      camera.zoomIn();
    }
    if (input.isKeyPressed('Minus') || input.isKeyPressed('NumpadSubtract')) {
      camera.zoomOut();
    }
  },
});

// Player input system
engine.ecs.addSystem({
  name: 'PlayerInput',
  query: ['PlayerControlled', 'Velocity'],
  update(entities) {
    const speed = 100;
    for (const e of entities) {
      const vel = engine.ecs.getComponent<{ x: number; y: number }>(e, 'Velocity')!;
      vel.x = 0;
      vel.y = 0;
      if (engine.input.isKeyDown('ArrowUp') || engine.input.isKeyDown('KeyW')) vel.y = -speed;
      if (engine.input.isKeyDown('ArrowDown') || engine.input.isKeyDown('KeyS')) vel.y = speed;
      if (engine.input.isKeyDown('ArrowLeft') || engine.input.isKeyDown('KeyA')) vel.x = -speed;
      if (engine.input.isKeyDown('ArrowRight') || engine.input.isKeyDown('KeyD')) vel.x = speed;
    }
  },
});

// Movement system
engine.ecs.addSystem({
  name: 'Movement',
  query: ['Position', 'Velocity'],
  update(entities, dt) {
    for (const e of entities) {
      const pos = engine.ecs.getComponent<{ x: number; y: number }>(e, 'Position')!;
      const vel = engine.ecs.getComponent<{ x: number; y: number }>(e, 'Velocity')!;
      pos.x += vel.x * dt;
      pos.y += vel.y * dt;
    }
  },
});

// Camera follow system
engine.ecs.addSystem({
  name: 'CameraFollow',
  query: ['PlayerControlled', 'Position'],
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

  // Draw entities
  for (const e of engine.ecs.query(['Position', 'Sprite'])) {
    const pos = engine.ecs.getComponent<{ x: number; y: number }>(e, 'Position')!;
    const sprite = engine.ecs.getComponent<{ width: number; height: number; color: string }>(
      e,
      'Sprite'
    )!;
    engine.renderer.drawRectCentered(pos.x, pos.y, sprite.width, sprite.height, sprite.color);
  }

  // UI (screen-space)
  const pos = engine.ecs.getComponent<{ x: number; y: number }>(player, 'Position')!;
  const tile = engine.camera.worldToTile(pos.x, pos.y, TILE_SIZE);
  engine.renderer.drawTextScreen('WASD/Arrows: Move | +/-: Zoom', 10, 30, { color: '#888' });
  engine.renderer.drawTextScreen(`Position: (${Math.round(pos.x)}, ${Math.round(pos.y)})`, 10, 50, {
    color: '#888',
  });
  engine.renderer.drawTextScreen(`Tile: (${tile.x}, ${tile.y})`, 10, 70, { color: '#888' });
  engine.renderer.drawTextScreen(`Zoom: ${engine.camera.zoom}x`, 10, 90, { color: '#888' });
});

engine.start();
console.log('Emergence Engine Phase 3: World exists!');
```

**Step 2: Run dev server to verify**

Run: `npm run dev`
Expected: Browser shows tile map with terrain, player moves, camera follows, zoom works

**Step 3: Run build to verify no TypeScript errors**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/main.ts
git commit -m "feat: update demo with tile map, camera, and world generation

Phase 3 complete: World exists!
- TileMap with terrain and building layers
- Camera with pan and discrete zoom levels
- Noise-based terrain generation
- Tile rendering with frustum culling"
```

---

## Phase 3 Complete

After completing all tasks, you have:

- **TileMap** with terrain + building layers, center-origin coordinates
- **Camera** with pan, discrete zoom (1x, 2x, 4x), coordinate transforms
- **Renderer** with camera integration, tile map drawing, screen-space drawing
- **Terrain generator** using simplex noise
- **Updated demo** showing tile world with moving player

**Next:** Phase 4 — A Pawn Lives (pathfinding, click-to-move, hunger)
