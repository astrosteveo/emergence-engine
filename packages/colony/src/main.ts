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
