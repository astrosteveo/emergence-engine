# Phase 3: World — Design Document

## Overview

Add a tile-based world system to Emergence Engine: tile storage, camera with pan/zoom, and noise-based terrain generation.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| World scale | Small (32-128 tiles) | Fast iteration, YAGNI — add chunks later |
| Tile data | Terrain + building layer | Matches Colony's needs |
| Camera | Pan + discrete zoom (1x, 2x, 4x) | Avoids sub-pixel rendering issues |
| Tile visuals | Solid colors | Focus on data structures, sprites later |
| Coordinate origin | Center (0,0) | Easier expansion to negative coords |
| Map generation | Simplex noise | Immediate visual feedback |
| Architecture | TileMap separate from ECS | Tiles are data, not actors |

---

## TileMap Data Structure

Terrain and building types are registered with metadata:

```typescript
interface TerrainDef {
  id: number;
  name: string;
  color: string;
  walkable: boolean;
}

interface BuildingDef {
  id: number;
  name: string;
  color: string;
  solid: boolean;  // Blocks movement
}

interface Tile {
  terrain: number;   // TerrainDef.id
  building: number;  // BuildingDef.id (0 = none)
}
```

**Storage:** Flat typed arrays (`Uint8Array` or `Uint16Array`) for terrain and building IDs. Indexed by `y * width + x`. Cache-friendly and fast.

**Coordinate system:** Integer tile coordinates. Origin (0,0) is world center. A 64x64 map spans from (-32,-32) to (31,31).

**Public API:**

```typescript
class TileMap {
  readonly width: number;
  readonly height: number;

  // Registration (before create)
  defineTerrain(name: string, def: Omit<TerrainDef, 'id'>): void;
  defineBuilding(name: string, def: Omit<BuildingDef, 'id'>): void;

  // Initialization
  create(width: number, height: number): void;

  // Tile access
  getTerrain(x: number, y: number): TerrainDef | undefined;
  getBuilding(x: number, y: number): BuildingDef | undefined;
  setTerrain(x: number, y: number, name: string): void;
  setBuilding(x: number, y: number, name: string | null): void;
  clearBuilding(x: number, y: number): void;

  // Queries
  isInBounds(x: number, y: number): boolean;
  isWalkable(x: number, y: number): boolean;  // Checks terrain + building

  // Lookups
  getTerrainDef(name: string): TerrainDef | undefined;
  getBuildingDef(name: string): BuildingDef | undefined;
}
```

---

## Camera System

Handles viewport position, discrete zoom levels, and coordinate transforms.

```typescript
class Camera {
  x: number;              // World position (center of viewport)
  y: number;
  readonly zoom: number;  // Current scale factor (1, 2, or 4)

  constructor(viewportWidth: number, viewportHeight: number);

  // Movement
  pan(dx: number, dy: number): void;
  centerOn(x: number, y: number): void;

  // Zoom
  zoomIn(): void;
  zoomOut(): void;
  setZoomLevel(level: number): void;  // 0, 1, or 2

  // Coordinate transforms
  worldToScreen(worldX: number, worldY: number): { x: number; y: number };
  screenToWorld(screenX: number, screenY: number): { x: number; y: number };
  worldToTile(worldX: number, worldY: number, tileSize: number): { x: number; y: number };

  // Culling
  getVisibleBounds(tileSize: number): { minX: number; minY: number; maxX: number; maxY: number };
}
```

**Zoom levels:** Fixed at `[1, 2, 4]`. Index 0 = 1x, index 1 = 2x, index 2 = 4x.

---

## Tile Rendering

Camera integrates with Renderer. All world-space drawing transforms through camera.

```typescript
class Renderer {
  readonly camera: Camera;

  // World-space drawing (transformed by camera)
  drawRect(worldX: number, worldY: number, width: number, height: number, color: string): void;
  drawRectCentered(worldX: number, worldY: number, width: number, height: number, color: string): void;
  drawCircle(worldX: number, worldY: number, radius: number, color: string): void;

  // Screen-space drawing (for UI, no transform)
  drawRectScreen(screenX: number, screenY: number, width: number, height: number, color: string): void;
  drawTextScreen(text: string, screenX: number, screenY: number, options?: TextOptions): void;

  // Tile map rendering
  drawTileMap(tileMap: TileMap, tileSize: number): void;
}
```

**drawTileMap behavior:**
1. Get visible tile bounds from camera
2. Iterate only visible tiles (frustum culling)
3. Draw terrain layer (solid color rectangles)
4. Draw building layer on top (if present)

**Draw order:**
1. `renderer.clear()`
2. `renderer.drawTileMap()` — terrain, then buildings
3. Entity sprites (world-space)
4. UI elements (screen-space)

---

## Map Generation

Simplex noise-based terrain generator.

```typescript
// src/engine/world/noise.ts
function simplex2(x: number, y: number, seed?: number): number;  // Returns -1 to 1

// src/engine/world/generate.ts
interface GeneratorConfig {
  width: number;
  height: number;
  seed?: number;
  scale?: number;       // Noise frequency (default: 0.1)
  waterLevel?: number;  // Threshold (default: -0.2)
}

function generateTerrain(tileMap: TileMap, config: GeneratorConfig): void;
```

**Default terrain thresholds:**

| Noise Value | Terrain |
|-------------|---------|
| < -0.2 | water |
| -0.2 to 0.3 | grass |
| > 0.3 | stone |

**Standard terrain definitions:**

| Terrain | Color | Walkable |
|---------|-------|----------|
| water | `#1d3557` | false |
| grass | `#3a5a40` | true |
| stone | `#6c757d` | true |

---

## Engine Integration

```typescript
interface EngineConfig {
  canvas: HTMLCanvasElement;
  tickRate?: number;
  tileSize?: number;  // Pixels per tile (default: 16)
}

class Engine {
  readonly loop: GameLoop;
  readonly ecs: World;
  readonly input: Input;
  readonly renderer: Renderer;
  readonly tileMap: TileMap;

  get camera(): Camera;  // Convenience accessor to renderer.camera
}
```

**Initialization order:**
1. Create GameLoop
2. Create ECS World
3. Create Input
4. Create TileMap (empty)
5. Create Renderer with Camera
6. Game code defines terrain/building types
7. Game code calls `tileMap.create()` or generator

---

## File Structure

```
src/engine/
├── world/
│   ├── TileMap.ts          # Tile storage, terrain/building registry
│   ├── TileMap.test.ts
│   ├── generate.ts         # Noise-based terrain generator
│   ├── generate.test.ts
│   └── noise.ts            # Simplex noise implementation
├── render/
│   ├── Camera.ts           # Pan, zoom, coordinate transforms
│   ├── Camera.test.ts
│   ├── Renderer.ts         # Modified: camera integration, tile rendering
│   └── Renderer.test.ts    # Modified: new method tests
├── Engine.ts               # Modified: add tileMap, camera accessor
└── index.ts                # Modified: export new types
```

---

## Public API Exports

```typescript
// Types
export { TileMap };
export type { TerrainDef, BuildingDef, Tile };
export { Camera };
export { generateTerrain };
export type { GeneratorConfig };
```

---

## Demo Application

```typescript
import { Engine, generateTerrain } from './engine';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const engine = new Engine({ canvas, tickRate: 20, tileSize: 16 });

// Define terrain types
engine.tileMap.defineTerrain('water', { color: '#1d3557', walkable: false });
engine.tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
engine.tileMap.defineTerrain('stone', { color: '#6c757d', walkable: true });

// Generate 64x64 world centered at origin
generateTerrain(engine.tileMap, { width: 64, height: 64 });

// Camera control system
engine.ecs.addSystem({
  name: 'CameraControl',
  query: [],
  update(_, dt) {
    const { input, camera } = engine;
    const panSpeed = 200 / camera.zoom;

    if (input.isKeyDown('ArrowUp') || input.isKeyDown('KeyW')) camera.pan(0, -panSpeed * dt);
    if (input.isKeyDown('ArrowDown') || input.isKeyDown('KeyS')) camera.pan(0, panSpeed * dt);
    if (input.isKeyDown('ArrowLeft') || input.isKeyDown('KeyA')) camera.pan(-panSpeed * dt, 0);
    if (input.isKeyDown('ArrowRight') || input.isKeyDown('KeyD')) camera.pan(panSpeed * dt, 0);

    if (input.isKeyPressed('Equal')) camera.zoomIn();
    if (input.isKeyPressed('Minus')) camera.zoomOut();
  }
});

// Render
engine.onDraw(() => {
  engine.renderer.clear();
  engine.renderer.drawTileMap(engine.tileMap, 16);

  // UI (screen-space)
  const { camera } = engine;
  engine.renderer.drawTextScreen(`Zoom: ${camera.zoom}x`, 10, 30, { color: '#666' });
  engine.renderer.drawTextScreen(`Pos: (${Math.round(camera.x)}, ${Math.round(camera.y)})`, 10, 50, { color: '#666' });
});

engine.start();
```

---

## Testing Strategy

**TileMap tests:**
- Define terrain/building types
- Create map, verify dimensions
- Get/set terrain and buildings
- Bounds checking
- Walkability queries (terrain + building combined)

**Camera tests:**
- Pan updates position
- Zoom cycles through discrete levels
- Coordinate transforms (round-trip: world → screen → world)
- Visible bounds calculation

**Renderer tests:**
- Camera-transformed drawing
- Screen-space drawing unchanged
- Tile map rendering calls (mock tile iteration)

**Generator tests:**
- Generates correct dimensions
- All tiles have valid terrain
- Seed produces deterministic output
