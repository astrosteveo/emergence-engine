# Phase 1: Proof of Life Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Get a sprite moving on screen with keyboard input — proof the engine skeleton works.

**Architecture:** Minimal viable structure. Game loop with fixed timestep, Canvas 2D renderer, basic input polling. No ECS yet — that's Phase 2. Just get pixels moving.

**Tech Stack:** TypeScript, Vite, Canvas 2D API

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.ts`

**Step 1: Initialize package.json**

```json
{
  "name": "emergence-engine",
  "version": "0.0.1",
  "description": "A web-based 2D game engine for simulation games",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "license": "GPL-3.0",
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

**Step 3: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
  },
});
```

**Step 4: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Emergence Engine</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        background: #0a0a0f;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
      }
      canvas {
        border: 1px solid #333;
      }
    </style>
  </head>
  <body>
    <canvas id="game" width="800" height="600"></canvas>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

**Step 5: Create src/main.ts with placeholder**

```typescript
const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

ctx.fillStyle = '#1a1a2e';
ctx.fillRect(0, 0, canvas.width, canvas.height);

console.log('Emergence Engine starting...');
```

**Step 6: Install dependencies**

Run: `npm install`
Expected: node_modules created, package-lock.json generated

**Step 7: Verify dev server works**

Run: `npm run dev`
Expected: Vite starts, shows local URL (http://localhost:5173)
Open in browser: Dark canvas visible, console shows "Emergence Engine starting..."

**Step 8: Commit**

```bash
git add package.json tsconfig.json vite.config.ts index.html src/main.ts
git commit -m "feat: project scaffold with Vite and TypeScript"
```

---

## Task 2: Game Loop

**Files:**
- Create: `src/engine/core/GameLoop.ts`
- Modify: `src/main.ts`

**Step 1: Create GameLoop class**

```typescript
// src/engine/core/GameLoop.ts

export type TickCallback = (dt: number) => void;
export type DrawCallback = () => void;

export class GameLoop {
  private tickRate: number;
  private tickDuration: number;
  private accumulator: number = 0;
  private lastTime: number = 0;
  private running: boolean = false;
  private speed: number = 1;

  private tickCallbacks: TickCallback[] = [];
  private drawCallbacks: DrawCallback[] = [];

  constructor(tickRate: number = 20) {
    this.tickRate = tickRate;
    this.tickDuration = 1000 / tickRate;
  }

  onTick(callback: TickCallback): void {
    this.tickCallbacks.push(callback);
  }

  onDraw(callback: DrawCallback): void {
    this.drawCallbacks.push(callback);
  }

  setSpeed(speed: number): void {
    this.speed = Math.max(0, speed);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  stop(): void {
    this.running = false;
  }

  private loop(currentTime: number): void {
    if (!this.running) return;

    const delta = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.accumulator += delta * this.speed;

    // Fixed timestep simulation
    const dt = this.tickDuration / 1000; // Convert to seconds
    while (this.accumulator >= this.tickDuration) {
      for (const callback of this.tickCallbacks) {
        callback(dt);
      }
      this.accumulator -= this.tickDuration;
    }

    // Render every frame
    for (const callback of this.drawCallbacks) {
      callback();
    }

    requestAnimationFrame((t) => this.loop(t));
  }
}
```

**Step 2: Update main.ts to use GameLoop**

```typescript
// src/main.ts

import { GameLoop } from './engine/core/GameLoop';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const loop = new GameLoop(20); // 20 ticks per second

let x = 400;
let y = 300;

loop.onTick((dt) => {
  // Simulation: move slightly each tick
  x += 10 * dt;
  if (x > canvas.width) x = 0;
});

loop.onDraw(() => {
  // Clear
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw a square
  ctx.fillStyle = '#e94560';
  ctx.fillRect(x - 16, y - 16, 32, 32);
});

loop.start();
console.log('Emergence Engine running...');
```

**Step 3: Verify in browser**

Run: `npm run dev` (if not already running)
Expected: Red square moves right across screen, wraps around

**Step 4: Commit**

```bash
git add src/engine/core/GameLoop.ts src/main.ts
git commit -m "feat: game loop with fixed timestep"
```

---

## Task 3: Input System

**Files:**
- Create: `src/engine/input/Input.ts`
- Modify: `src/main.ts`

**Step 1: Create Input class**

```typescript
// src/engine/input/Input.ts

export class Input {
  private keysDown: Set<string> = new Set();
  private keysPressed: Set<string> = new Set();
  private keysReleased: Set<string> = new Set();

  constructor() {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
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

  /** Call at end of each tick to clear per-frame state */
  update(): void {
    this.keysPressed.clear();
    this.keysReleased.clear();
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
}
```

**Step 2: Update main.ts with keyboard control**

```typescript
// src/main.ts

import { GameLoop } from './engine/core/GameLoop';
import { Input } from './engine/input/Input';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const loop = new GameLoop(20);
const input = new Input();

let x = 400;
let y = 300;
const speed = 200; // pixels per second

loop.onTick((dt) => {
  // Movement based on input
  if (input.isKeyDown('ArrowUp') || input.isKeyDown('KeyW')) {
    y -= speed * dt;
  }
  if (input.isKeyDown('ArrowDown') || input.isKeyDown('KeyS')) {
    y += speed * dt;
  }
  if (input.isKeyDown('ArrowLeft') || input.isKeyDown('KeyA')) {
    x -= speed * dt;
  }
  if (input.isKeyDown('ArrowRight') || input.isKeyDown('KeyD')) {
    x += speed * dt;
  }

  // Keep in bounds
  x = Math.max(16, Math.min(canvas.width - 16, x));
  y = Math.max(16, Math.min(canvas.height - 16, y));

  // Clear per-tick input state
  input.update();
});

loop.onDraw(() => {
  // Clear
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw player square
  ctx.fillStyle = '#e94560';
  ctx.fillRect(x - 16, y - 16, 32, 32);
});

loop.start();
console.log('Emergence Engine running... Use arrow keys or WASD to move.');
```

**Step 3: Verify in browser**

Run: `npm run dev`
Expected: Red square responds to arrow keys and WASD, stays within canvas bounds

**Step 4: Commit**

```bash
git add src/engine/input/Input.ts src/main.ts
git commit -m "feat: input system with keyboard polling"
```

---

## Task 4: Basic Renderer

**Files:**
- Create: `src/engine/render/Renderer.ts`
- Modify: `src/main.ts`

**Step 1: Create Renderer class**

```typescript
// src/engine/render/Renderer.ts

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  readonly width: number;
  readonly height: number;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  clear(color: string = '#1a1a2e'): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawRect(x: number, y: number, width: number, height: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, width, height);
  }

  drawRectCentered(x: number, y: number, width: number, height: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x - width / 2, y - height / 2, width, height);
  }

  drawCircle(x: number, y: number, radius: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawText(
    text: string,
    x: number,
    y: number,
    options: { font?: string; color?: string; align?: CanvasTextAlign } = {}
  ): void {
    const { font = '16px monospace', color = '#ffffff', align = 'left' } = options;
    this.ctx.font = font;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = align;
    this.ctx.fillText(text, x, y);
  }
}
```

**Step 2: Update main.ts to use Renderer**

```typescript
// src/main.ts

import { GameLoop } from './engine/core/GameLoop';
import { Input } from './engine/input/Input';
import { Renderer } from './engine/render/Renderer';

const canvas = document.getElementById('game') as HTMLCanvasElement;

const loop = new GameLoop(20);
const input = new Input();
const renderer = new Renderer(canvas);

let x = 400;
let y = 300;
const speed = 200;

loop.onTick((dt) => {
  if (input.isKeyDown('ArrowUp') || input.isKeyDown('KeyW')) {
    y -= speed * dt;
  }
  if (input.isKeyDown('ArrowDown') || input.isKeyDown('KeyS')) {
    y += speed * dt;
  }
  if (input.isKeyDown('ArrowLeft') || input.isKeyDown('KeyA')) {
    x -= speed * dt;
  }
  if (input.isKeyDown('ArrowRight') || input.isKeyDown('KeyD')) {
    x += speed * dt;
  }

  x = Math.max(16, Math.min(renderer.width - 16, x));
  y = Math.max(16, Math.min(renderer.height - 16, y));

  input.update();
});

loop.onDraw(() => {
  renderer.clear();
  renderer.drawRectCentered(x, y, 32, 32, '#e94560');
  renderer.drawText('Use arrow keys or WASD to move', 10, 30, { color: '#666' });
  renderer.drawText(`Position: (${Math.round(x)}, ${Math.round(y)})`, 10, 50, { color: '#666' });
});

loop.start();
console.log('Emergence Engine running...');
```

**Step 3: Verify in browser**

Run: `npm run dev`
Expected: Same movement, but now with position text in top-left corner

**Step 4: Commit**

```bash
git add src/engine/render/Renderer.ts src/main.ts
git commit -m "feat: renderer abstraction with drawing primitives"
```

---

## Task 5: Engine Entry Point

**Files:**
- Create: `src/engine/index.ts`
- Create: `src/engine/Engine.ts`
- Modify: `src/main.ts`

**Step 1: Create Engine class that ties it all together**

```typescript
// src/engine/Engine.ts

import { GameLoop } from './core/GameLoop';
import { Input } from './input/Input';
import { Renderer } from './render/Renderer';

export interface EngineConfig {
  canvas: HTMLCanvasElement;
  tickRate?: number;
}

export class Engine {
  readonly loop: GameLoop;
  readonly input: Input;
  readonly renderer: Renderer;

  constructor(config: EngineConfig) {
    this.loop = new GameLoop(config.tickRate ?? 20);
    this.input = new Input();
    this.renderer = new Renderer(config.canvas);

    // Auto-update input at end of each tick
    this.loop.onTick(() => {
      this.input.update();
    });
  }

  onTick(callback: (dt: number) => void): void {
    // Insert before the input.update() call
    this.loop.onTick(callback);
  }

  onDraw(callback: () => void): void {
    this.loop.onDraw(callback);
  }

  start(): void {
    this.loop.start();
  }

  stop(): void {
    this.loop.stop();
  }

  setSpeed(speed: number): void {
    this.loop.setSpeed(speed);
  }
}
```

**Step 2: Create public API export**

```typescript
// src/engine/index.ts

export { Engine } from './Engine';
export type { EngineConfig } from './Engine';
export { GameLoop } from './core/GameLoop';
export { Input } from './input/Input';
export { Renderer } from './render/Renderer';
```

**Step 3: Simplify main.ts using Engine**

```typescript
// src/main.ts

import { Engine } from './engine';

const canvas = document.getElementById('game') as HTMLCanvasElement;

const engine = new Engine({ canvas, tickRate: 20 });

let x = 400;
let y = 300;
const speed = 200;

engine.onTick((dt) => {
  const { input } = engine;

  if (input.isKeyDown('ArrowUp') || input.isKeyDown('KeyW')) {
    y -= speed * dt;
  }
  if (input.isKeyDown('ArrowDown') || input.isKeyDown('KeyS')) {
    y += speed * dt;
  }
  if (input.isKeyDown('ArrowLeft') || input.isKeyDown('KeyA')) {
    x -= speed * dt;
  }
  if (input.isKeyDown('ArrowRight') || input.isKeyDown('KeyD')) {
    x += speed * dt;
  }

  const { renderer } = engine;
  x = Math.max(16, Math.min(renderer.width - 16, x));
  y = Math.max(16, Math.min(renderer.height - 16, y));
});

engine.onDraw(() => {
  const { renderer } = engine;
  renderer.clear();
  renderer.drawRectCentered(x, y, 32, 32, '#e94560');
  renderer.drawText('Use arrow keys or WASD to move', 10, 30, { color: '#666' });
  renderer.drawText(`Position: (${Math.round(x)}, ${Math.round(y)})`, 10, 50, { color: '#666' });
});

engine.start();
console.log('Emergence Engine running...');
```

**Step 4: Verify in browser**

Run: `npm run dev`
Expected: Same behavior, cleaner code

**Step 5: Commit**

```bash
git add src/engine/Engine.ts src/engine/index.ts src/main.ts
git commit -m "feat: unified Engine entry point

Phase 1 complete: proof of life achieved.
- Game loop with fixed timestep
- Input system with keyboard polling
- Renderer with drawing primitives
- Unified Engine API"
```

---

## Phase 1 Complete

After completing all tasks, you have:

- TypeScript + Vite project structure
- Game loop with fixed timestep (simulation) and variable rendering
- Input system with keyboard polling (isKeyDown, isKeyPressed, isKeyReleased)
- Renderer with basic drawing primitives
- Unified Engine class tying it together

**Next:** Phase 2 — ECS Foundation
