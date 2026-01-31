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

import type { Engine } from '../Engine';
import type { EmergenceSaveFile } from './types';

/**
 * Encodes a Uint8Array to a Base64 string.
 */
function uint8ArrayToBase64(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

export interface SerializeOptions {
  /** Project name to store in the save file */
  name?: string;
  /** Tick rate (ticks per second) */
  tickRate?: number;
  /** Tile size in pixels */
  tileSize?: number;
}

/**
 * Serializes the entire engine state to a save file format.
 */
export function serialize(engine: Engine, options: SerializeOptions = {}): EmergenceSaveFile {
  const { tileMap, ecs, camera } = engine;

  // Get raw tile data
  const terrainData = tileMap.getRawTerrainData();
  const buildingData = tileMap.getRawBuildingData();

  if (!terrainData || !buildingData) {
    throw new Error('TileMap has not been created. Call tileMap.create() before serializing.');
  }

  // Serialize all entities
  const entities = ecs.getAllEntities().map(entity => ({
    id: entity,
    components: ecs.getComponentsForEntity(entity),
  }));

  return {
    version: 1,
    name: options.name ?? 'Untitled Project',
    createdAt: new Date().toISOString(),
    settings: {
      tickRate: options.tickRate ?? 20,
      tileSize: options.tileSize ?? 16,
    },
    tileMap: {
      width: tileMap.width,
      height: tileMap.height,
      terrainDefs: tileMap.getAllTerrainDefs(),
      buildingDefs: tileMap.getAllBuildingDefs(),
      terrainData: uint8ArrayToBase64(terrainData),
      buildingData: uint8ArrayToBase64(buildingData),
      territory: tileMap.getAllTerritory(),
    },
    ecs: {
      componentDefs: ecs.getAllComponentDefs(),
      entities,
    },
    camera: camera.getState(),
  };
}
