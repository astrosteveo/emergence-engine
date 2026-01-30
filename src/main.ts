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

import { Engine } from './engine';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const engine = new Engine({ canvas, tickRate: 20 });

// Define components
engine.ecs.defineComponent('Position', { x: 0, y: 0 });
engine.ecs.defineComponent('Velocity', { x: 0, y: 0 });
engine.ecs.defineComponent('PlayerControlled', {});
engine.ecs.defineComponent('Sprite', { width: 32, height: 32, color: '#e94560' });

// Create player entity
const player = engine.ecs.createEntity();
engine.ecs.addComponent(player, 'Position', { x: 400, y: 300 });
engine.ecs.addComponent(player, 'Velocity');
engine.ecs.addComponent(player, 'PlayerControlled');
engine.ecs.addComponent(player, 'Sprite');

// Input system: read keys, set velocity
engine.ecs.addSystem({
  name: 'PlayerInput',
  query: ['PlayerControlled', 'Velocity'],
  update(entities) {
    const speed = 200;
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

// Movement system: apply velocity to position
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

// Bounds system: keep entities on screen
engine.ecs.addSystem({
  name: 'Bounds',
  query: ['Position', 'Sprite'],
  update(entities) {
    for (const e of entities) {
      const pos = engine.ecs.getComponent<{ x: number; y: number }>(e, 'Position')!;
      const sprite = engine.ecs.getComponent<{ width: number; height: number }>(e, 'Sprite')!;
      const halfW = sprite.width / 2;
      const halfH = sprite.height / 2;
      pos.x = Math.max(halfW, Math.min(engine.renderer.width - halfW, pos.x));
      pos.y = Math.max(halfH, Math.min(engine.renderer.height - halfH, pos.y));
    }
  },
});

// Render loop (runs every frame, not every tick)
engine.onDraw(() => {
  engine.renderer.clear();

  // Render all sprites
  for (const e of engine.ecs.query(['Position', 'Sprite'])) {
    const pos = engine.ecs.getComponent<{ x: number; y: number }>(e, 'Position')!;
    const sprite = engine.ecs.getComponent<{ width: number; height: number; color: string }>(
      e,
      'Sprite'
    )!;
    engine.renderer.drawRectCentered(pos.x, pos.y, sprite.width, sprite.height, sprite.color);
  }

  // UI text
  const pos = engine.ecs.getComponent<{ x: number; y: number }>(player, 'Position')!;
  engine.renderer.drawText('Use arrow keys or WASD to move', 10, 30, { color: '#666' });
  engine.renderer.drawText(`Position: (${Math.round(pos.x)}, ${Math.round(pos.y)})`, 10, 50, {
    color: '#666',
  });
});

engine.start();
console.log('Emergence Engine running with ECS...');
