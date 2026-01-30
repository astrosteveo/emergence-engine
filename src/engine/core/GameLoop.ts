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

export type TickCallback = (dt: number) => void;
export type DrawCallback = () => void;

export class GameLoop {
  private tickDuration: number;
  private accumulator: number = 0;
  private lastTime: number = 0;
  private running: boolean = false;
  private speed: number = 1;

  private tickCallbacks: TickCallback[] = [];
  private drawCallbacks: DrawCallback[] = [];

  constructor(tickRate: number = 20) {
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
