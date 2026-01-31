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

import type { TerrainDef, BuildingDef } from '../world/TileMap';

/**
 * Emergence Engine save file format.
 * This is the canonical format for serializing game state.
 */
export interface EmergenceSaveFile {
  /** Format version for future compatibility */
  version: 1;
  /** Project/game name */
  name: string;
  /** ISO 8601 timestamp when saved */
  createdAt: string;
  /** Engine settings */
  settings: {
    tickRate: number;
    tileSize: number;
  };
  /** TileMap data */
  tileMap: {
    width: number;
    height: number;
    terrainDefs: TerrainDef[];
    buildingDefs: BuildingDef[];
    /** Base64-encoded Uint8Array of terrain IDs */
    terrainData: string;
    /** Base64-encoded Uint8Array of building IDs */
    buildingData: string;
    /** Sparse territory data: [linearIndex, factionId] pairs */
    territory: [number, string][];
  };
  /** ECS data */
  ecs: {
    /** Component schemas for validation */
    componentDefs: { name: string; defaults: object }[];
    /** All entities with their components */
    entities: { id: number; components: Record<string, unknown> }[];
  };
  /** Camera state */
  camera: {
    x: number;
    y: number;
    zoomLevel: number;
  };
}
