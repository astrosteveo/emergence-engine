/*
 * This file is part of Emergence Editor.
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

export type BrushSize = 1 | 3 | 5;
export type BrushShape = 'square' | 'circle';

export interface TileCoord {
  x: number;
  y: number;
}

/**
 * Returns all tile coordinates affected by a brush centered at (centerX, centerY).
 * For size 1, returns just the center tile.
 * For size 3, returns a 3x3 area (or circle approximation).
 * For size 5, returns a 5x5 area (or circle approximation).
 */
export function getBrushTiles(
  centerX: number,
  centerY: number,
  size: BrushSize,
  shape: BrushShape
): TileCoord[] {
  const radius = Math.floor(size / 2);
  const tiles: TileCoord[] = [];

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (shape === 'circle') {
        // Include tile if within circular radius
        if (dx * dx + dy * dy <= radius * radius) {
          tiles.push({ x: centerX + dx, y: centerY + dy });
        }
      } else {
        // Square: include all tiles in the bounding box
        tiles.push({ x: centerX + dx, y: centerY + dy });
      }
    }
  }

  return tiles;
}
