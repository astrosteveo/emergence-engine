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

export interface CameraState {
  x: number;
  y: number;
  zoomLevel: number;
}

export class Camera {
  private static readonly ZOOM_LEVELS = [1, 2, 4];
  private _zoomLevel = 0;
  private _viewportWidth: number;
  private _viewportHeight: number;
  x = 0;
  y = 0;

  constructor(viewportWidth: number, viewportHeight: number) {
    this._viewportWidth = viewportWidth;
    this._viewportHeight = viewportHeight;
  }

  get viewportWidth(): number {
    return this._viewportWidth;
  }

  get viewportHeight(): number {
    return this._viewportHeight;
  }

  /**
   * Updates the viewport dimensions. Call this when the canvas is resized.
   */
  resize(width: number, height: number): void {
    this._viewportWidth = width;
    this._viewportHeight = height;
  }

  get zoom(): number {
    return Camera.ZOOM_LEVELS[this._zoomLevel];
  }

  get zoomLevel(): number {
    return this._zoomLevel;
  }

  zoomIn(): void {
    this._zoomLevel = Math.min(this._zoomLevel + 1, Camera.ZOOM_LEVELS.length - 1);
  }

  zoomOut(): void {
    this._zoomLevel = Math.max(this._zoomLevel - 1, 0);
  }

  setZoomLevel(level: number): void {
    this._zoomLevel = Math.max(0, Math.min(level, Camera.ZOOM_LEVELS.length - 1));
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

  // ============================================
  // Serialization accessors
  // ============================================

  /**
   * Returns the current camera state for serialization.
   */
  getState(): CameraState {
    return {
      x: this.x,
      y: this.y,
      zoomLevel: this._zoomLevel,
    };
  }

  /**
   * Restores camera state from serialized data.
   */
  setState(state: CameraState): void {
    this.x = state.x;
    this.y = state.y;
    this._zoomLevel = Math.max(0, Math.min(state.zoomLevel, Camera.ZOOM_LEVELS.length - 1));
  }
}
