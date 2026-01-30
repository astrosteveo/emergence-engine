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

  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const screenX = (worldX - this.x) * this.zoom + this.viewportWidth / 2;
    const screenY = (worldY - this.y) * this.zoom + this.viewportHeight / 2;
    return { x: screenX, y: screenY };
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const worldX = (screenX - this.viewportWidth / 2) / this.zoom + this.x;
    const worldY = (screenY - this.viewportHeight / 2) / this.zoom + this.y;
    return { x: worldX, y: worldY };
  }

  worldToTile(worldX: number, worldY: number, tileSize: number): { x: number; y: number } {
    return {
      x: Math.floor(worldX / tileSize),
      y: Math.floor(worldY / tileSize),
    };
  }

  screenToTile(screenX: number, screenY: number, tileSize: number): { x: number; y: number } {
    const world = this.screenToWorld(screenX, screenY);
    return this.worldToTile(world.x, world.y, tileSize);
  }

  getVisibleBounds(tileSize: number): { minX: number; minY: number; maxX: number; maxY: number } {
    // Calculate world-space bounds of the viewport
    const halfViewportWorldWidth = this.viewportWidth / this.zoom / 2;
    const halfViewportWorldHeight = this.viewportHeight / this.zoom / 2;

    const worldMinX = this.x - halfViewportWorldWidth;
    const worldMaxX = this.x + halfViewportWorldWidth;
    const worldMinY = this.y - halfViewportWorldHeight;
    const worldMaxY = this.y + halfViewportWorldHeight;

    // Convert to tile coordinates with 1-tile padding for partial tiles
    return {
      minX: Math.floor(worldMinX / tileSize) - 1,
      maxX: Math.ceil(worldMaxX / tileSize) + 1,
      minY: Math.floor(worldMinY / tileSize) - 1,
      maxY: Math.ceil(worldMaxY / tileSize) + 1,
    };
  }
}
