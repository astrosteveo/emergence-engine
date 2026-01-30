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

import { GameLoop } from './core/GameLoop';
import { World } from './ecs/World';
import { Input } from './input/Input';
import { Renderer } from './render/Renderer';

export interface EngineConfig {
  canvas: HTMLCanvasElement;
  tickRate?: number;
}

export class Engine {
  readonly loop: GameLoop;
  readonly ecs: World;
  readonly input: Input;
  readonly renderer: Renderer;

  constructor(config: EngineConfig) {
    this.loop = new GameLoop(config.tickRate ?? 20);
    this.ecs = new World();
    this.input = new Input();
    this.renderer = new Renderer(config.canvas);

    // Run ECS systems each tick
    this.loop.onTick((dt) => {
      this.ecs.update(dt);
    });

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
