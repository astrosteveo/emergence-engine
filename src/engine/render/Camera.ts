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
  private static readonly ZOOM_LEVELS = [1, 2, 4];
  private zoomLevel = 0;
  x = 0;
  y = 0;

  constructor(
    readonly viewportWidth: number,
    readonly viewportHeight: number
  ) {}

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

  pan(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }

  centerOn(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }
}
