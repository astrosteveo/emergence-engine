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
