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

import { Engine, generateTerrain } from 'emergence-engine';

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
console.log('Colony - Built with Emergence Engine');
