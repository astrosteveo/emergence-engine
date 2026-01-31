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
import type { Entity, PathNode, ActionContext } from 'emergence-engine';

let debugMode = true; // On by default in dev

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
engine.ecs.defineComponent('Food', { nutrition: 30 });
engine.ecs.defineComponent('CurrentTask', { action: '', target: null as Entity | null });
engine.ecs.defineComponent('AIState', { lastHungerPercent: 0, needsReeval: true });

function spawnFood(count: number): void {
  const halfW = Math.floor(engine.tileMap.width / 2);
  const halfH = Math.floor(engine.tileMap.height / 2);
  let spawned = 0;
  let attempts = 0;
  const maxAttempts = count * 10;

  while (spawned < count && attempts < maxAttempts) {
    attempts++;
    const tileX = Math.floor(Math.random() * engine.tileMap.width) - halfW;
    const tileY = Math.floor(Math.random() * engine.tileMap.height) - halfH;

    if (engine.tileMap.isWalkable(tileX, tileY)) {
      const food = engine.ecs.createEntity();
      engine.ecs.addComponent(food, 'Position', {
        x: tileX * TILE_SIZE + TILE_SIZE / 2,
        y: tileY * TILE_SIZE + TILE_SIZE / 2,
      });
      engine.ecs.addComponent(food, 'Food', { nutrition: 30 });
      engine.ecs.addComponent(food, 'Sprite', { width: 12, height: 12, color: '#4ade80' });
      spawned++;
    }
  }
}

// Spawn food items
spawnFood(20);

// Create pawn entity at world center
const pawn = engine.ecs.createEntity();
engine.ecs.addComponent(pawn, 'Position', { x: 0, y: 0 });
engine.ecs.addComponent(pawn, 'Sprite');
engine.ecs.addComponent(pawn, 'Pawn');
engine.ecs.addComponent(pawn, 'Hunger', { current: 25, max: 100, rate: 2 });
engine.ecs.addComponent(pawn, 'AIState', { lastHungerPercent: 0.25, needsReeval: true });

// Used by AIDecisionSystem (Task 12)
export function createActionContext(): ActionContext {
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

engine.ai.defineAction('eat', {
  canExecute(entity, context) {
    return context.findNearest(entity, 'Food') !== null;
  },
  score(entity, context) {
    const hunger = context.ecs.getComponent<{ current: number; max: number }>(entity, 'Hunger');
    if (!hunger) return 0;
    return hunger.current / hunger.max;
  },
  execute(entity, context) {
    const food = context.findNearest(entity, 'Food');
    if (!food) return;

    const foodPos = context.ecs.getComponent<{ x: number; y: number }>(food, 'Position');
    if (!foodPos) return;

    const entityPos = context.ecs.getComponent<{ x: number; y: number }>(entity, 'Position');
    if (!entityPos) return;

    const tileX = Math.floor(foodPos.x / TILE_SIZE);
    const tileY = Math.floor(foodPos.y / TILE_SIZE);
    const entityTileX = Math.floor(entityPos.x / TILE_SIZE);
    const entityTileY = Math.floor(entityPos.y / TILE_SIZE);

    // Check if path exists before committing to task
    const path = pathfinder.findPath(entityTileX, entityTileY, tileX, tileY);
    if (!path) return; // Food is unreachable, don't set task

    if (context.ecs.hasComponent(entity, 'PathFollow')) {
      context.ecs.removeComponent(entity, 'PathFollow');
    }
    if (context.ecs.hasComponent(entity, 'PathTarget')) {
      context.ecs.removeComponent(entity, 'PathTarget');
    }

    context.ecs.addComponent(entity, 'PathTarget', { x: tileX, y: tileY });

    if (context.ecs.hasComponent(entity, 'CurrentTask')) {
      context.ecs.removeComponent(entity, 'CurrentTask');
    }
    context.ecs.addComponent(entity, 'CurrentTask', { action: 'eat', target: food });
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
    if (input.isKeyPressed('Backquote')) {
      debugMode = !debugMode;
    }
  },
});

// AI Decision system: re-evaluate when needed
engine.ecs.addSystem({
  name: 'AIDecision',
  query: ['Pawn', 'Hunger', 'AIState'],
  update(entities) {
    const context = createActionContext();

    for (const e of entities) {
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

// Pathfinding system: when entity has PathTarget but no PathFollow, calculate path
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

// Task execution system: handle task completion when arrived
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
      } else if (task.action === 'wander') {
        engine.ecs.removeComponent(e, 'CurrentTask');
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
  const currentTask = engine.ecs.getComponent<{ action: string; target: Entity | null }>(pawn, 'CurrentTask');
  const taskLabel = currentTask ? currentTask.action.charAt(0).toUpperCase() + currentTask.action.slice(1) : 'Idle';

  const panelX = 10;
  const panelY = canvas.height - 110;
  const panelWidth = 160;
  const panelHeight = 100;

  // Panel background
  engine.renderer.drawRectScreen(panelX, panelY, panelWidth, panelHeight, 'rgba(26, 26, 46, 0.9)');

  // Title
  engine.renderer.drawTextScreen('Pawn Stats', panelX + 10, panelY + 22, {
    font: '14px monospace',
    color: '#ffffff',
  });

  // Task label
  engine.renderer.drawTextScreen(`Task: ${taskLabel}`, panelX + 10, panelY + 42, {
    font: '12px monospace',
    color: '#aaaaaa',
  });

  // Hunger label
  engine.renderer.drawTextScreen('Hunger', panelX + 10, panelY + 62, {
    font: '12px monospace',
    color: '#aaaaaa',
  });

  // Hunger bar background
  const barX = panelX + 10;
  const barY = panelY + 69;
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

  // Debug overlay (` toggle)
  if (debugMode) {
    const context = createActionContext();
    const scores = engine.ai.evaluateAll(pawn, context);
    const currentTask = engine.ecs.getComponent<{ action: string }>(pawn, 'CurrentTask');

    const debugX = 10;
    const debugY = canvas.height - 220;
    const debugWidth = 160;
    const debugHeight = 100;

    engine.renderer.drawRectScreen(debugX, debugY, debugWidth, debugHeight, 'rgba(26, 26, 46, 0.9)');
    engine.renderer.drawTextScreen('AI Debug (`)', debugX + 10, debugY + 22, {
      font: '14px monospace',
      color: '#ffffff',
    });

    let yOffset = 42;
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

  // Instructions (top-left)
  engine.renderer.drawTextScreen('Autonomous mode | +/-: Zoom | `: Debug', 10, 30, { color: '#888' });
});

engine.start();
console.log('Colony - Built with Emergence Engine (Phase 5: Pawn Thinks)');
