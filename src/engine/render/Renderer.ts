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

import { Camera } from './Camera';
import { TileMap } from '../world/TileMap';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  readonly width: number;
  readonly height: number;
  readonly camera: Camera;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
    this.camera = new Camera(this.width, this.height);
  }

  clear(color: string = '#1a1a2e'): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawRect(worldX: number, worldY: number, width: number, height: number, color: string): void {
    const screen = this.camera.worldToScreen(worldX, worldY);
    const scaledWidth = width * this.camera.zoom;
    const scaledHeight = height * this.camera.zoom;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(screen.x, screen.y, scaledWidth, scaledHeight);
  }

  drawRectCentered(worldX: number, worldY: number, width: number, height: number, color: string): void {
    const screen = this.camera.worldToScreen(worldX, worldY);
    const scaledWidth = width * this.camera.zoom;
    const scaledHeight = height * this.camera.zoom;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(screen.x - scaledWidth / 2, screen.y - scaledHeight / 2, scaledWidth, scaledHeight);
  }

  drawCircle(worldX: number, worldY: number, radius: number, color: string): void {
    const screen = this.camera.worldToScreen(worldX, worldY);
    const scaledRadius = radius * this.camera.zoom;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(screen.x, screen.y, scaledRadius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawText(
    text: string,
    x: number,
    y: number,
    options: { font?: string; color?: string; align?: CanvasTextAlign } = {}
  ): void {
    const { font = '16px monospace', color = '#ffffff', align = 'left' } = options;
    this.ctx.font = font;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = align;
    this.ctx.fillText(text, x, y);
  }

  drawRectScreen(screenX: number, screenY: number, width: number, height: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(screenX, screenY, width, height);
  }

  drawTextScreen(
    text: string,
    screenX: number,
    screenY: number,
    options: { font?: string; color?: string; align?: CanvasTextAlign } = {}
  ): void {
    const { font = '16px monospace', color = '#ffffff', align = 'left' } = options;
    this.ctx.font = font;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = align;
    this.ctx.fillText(text, screenX, screenY);
  }

  drawTileMap(tileMap: TileMap, tileSize: number): void {
    const bounds = this.camera.getVisibleBounds(tileSize);

    // Draw terrain layer
    for (let y = bounds.minY; y <= bounds.maxY; y++) {
      for (let x = bounds.minX; x <= bounds.maxX; x++) {
        const terrain = tileMap.getTerrain(x, y);
        if (terrain) {
          const worldX = x * tileSize;
          const worldY = y * tileSize;
          this.drawRect(worldX, worldY, tileSize, tileSize, terrain.color);
        }
      }
    }

    // Draw building layer on top
    for (let y = bounds.minY; y <= bounds.maxY; y++) {
      for (let x = bounds.minX; x <= bounds.maxX; x++) {
        const building = tileMap.getBuilding(x, y);
        if (building) {
          const worldX = x * tileSize;
          const worldY = y * tileSize;
          this.drawRect(worldX, worldY, tileSize, tileSize, building.color);
        }
      }
    }
  }
}
