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

import { TileMap } from './TileMap';
import { simplex2 } from './noise';

export interface GeneratorConfig {
  width: number;
  height: number;
  seed?: number;
  scale?: number;
  waterLevel?: number;
}

export function generateTerrain(tileMap: TileMap, config: GeneratorConfig): void {
  const { width, height, seed = 0, scale = 0.1, waterLevel = -0.2 } = config;

  // Verify required terrains exist
  const requiredTerrains = ['water', 'grass', 'stone'];
  for (const name of requiredTerrains) {
    if (!tileMap.getTerrainDef(name)) {
      throw new Error(`Required terrain "${name}" not defined`);
    }
  }

  // Create the map with grass as default (will be overwritten)
  tileMap.create(width, height, 'grass');

  const halfW = Math.floor(width / 2);
  const halfH = Math.floor(height / 2);

  // Generate terrain using noise
  for (let y = -halfH; y < height - halfH; y++) {
    for (let x = -halfW; x < width - halfW; x++) {
      const value = simplex2(x * scale, y * scale, seed);

      let terrain: string;
      if (value < waterLevel) {
        terrain = 'water';
      } else if (value < 0.3) {
        terrain = 'grass';
      } else {
        terrain = 'stone';
      }

      tileMap.setTerrain(x, y, terrain);
    }
  }
}
