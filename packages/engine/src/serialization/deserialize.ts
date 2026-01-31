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
 * Decodes a Base64 string to a Uint8Array.
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export interface DeserializeOptions {
  /**
   * If true, skip component definition validation.
   * Components must still be defined before deserialize is called.
   */
  skipValidation?: boolean;
}

/**
 * Deserializes a save file and restores the engine state.
 *
 * IMPORTANT: Component definitions must be registered with engine.ecs.defineComponent()
 * BEFORE calling this function. Terrain and building definitions must be registered
 * with engine.tileMap.defineTerrain() and engine.tileMap.defineBuilding() BEFORE
 * calling this function.
 *
 * The save file includes schema information for validation, but the game is
 * responsible for defining components since they may contain runtime behavior
 * that cannot be serialized.
 */
export function deserialize(
  engine: Engine,
  saveFile: EmergenceSaveFile,
  options: DeserializeOptions = {}
): void {
  const { tileMap, ecs, camera } = engine;

  // Validate version
  if (saveFile.version !== 1) {
    throw new Error(`Unsupported save file version: ${saveFile.version}`);
  }

  // Validate terrain definitions exist
  for (const savedDef of saveFile.tileMap.terrainDefs) {
    const def = tileMap.getTerrainDef(savedDef.name);
    if (!def) {
      throw new Error(
        `Terrain "${savedDef.name}" is in save file but not defined. ` +
        `Call tileMap.defineTerrain("${savedDef.name}", ...) before deserialize.`
      );
    }
    // Warn if ID mismatch (definitions were registered in different order)
    if (def.id !== savedDef.id) {
      console.warn(
        `Terrain "${savedDef.name}" has different ID (save: ${savedDef.id}, current: ${def.id}). ` +
        `Define terrains in the same order as when the file was saved.`
      );
    }
  }

  // Validate building definitions exist
  for (const savedDef of saveFile.tileMap.buildingDefs) {
    const def = tileMap.getBuildingDef(savedDef.name);
    if (!def) {
      throw new Error(
        `Building "${savedDef.name}" is in save file but not defined. ` +
        `Call tileMap.defineBuilding("${savedDef.name}", ...) before deserialize.`
      );
    }
    if (def.id !== savedDef.id) {
      console.warn(
        `Building "${savedDef.name}" has different ID (save: ${savedDef.id}, current: ${def.id}). ` +
        `Define buildings in the same order as when the file was saved.`
      );
    }
  }

  // Validate component definitions if not skipped
  if (!options.skipValidation) {
    const currentDefs = ecs.getAllComponentDefs();
    const currentDefNames = new Set(currentDefs.map(d => d.name));

    for (const savedDef of saveFile.ecs.componentDefs) {
      if (!currentDefNames.has(savedDef.name)) {
        throw new Error(
          `Component "${savedDef.name}" is in save file but not defined. ` +
          `Call ecs.defineComponent("${savedDef.name}", ...) before deserialize.`
        );
      }
    }
  }

  // Decode tile data
  const terrainData = base64ToUint8Array(saveFile.tileMap.terrainData);
  const buildingData = base64ToUint8Array(saveFile.tileMap.buildingData);

  // Load tile map
  tileMap.loadFromData(
    saveFile.tileMap.width,
    saveFile.tileMap.height,
    terrainData,
    buildingData,
    saveFile.tileMap.territory
  );

  // Clear existing entities and load saved ones
  ecs.clear();
  ecs.loadEntities(saveFile.ecs.entities);

  // Restore camera state
  camera.setState(saveFile.camera);
}
