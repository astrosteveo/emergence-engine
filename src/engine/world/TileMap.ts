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

export interface TerrainDef {
  id: number;
  name: string;
  color: string;
  walkable: boolean;
}

export interface BuildingDef {
  id: number;
  name: string;
  color: string;
  solid: boolean;
}

export class TileMap {
  private terrainDefs: Map<string, TerrainDef> = new Map();
  private nextTerrainId = 1; // 0 reserved for "no terrain"
  private buildingDefs: Map<string, BuildingDef> = new Map();
  private nextBuildingId = 1; // 0 reserved for "no building"

  defineTerrain(name: string, def: Omit<TerrainDef, 'id' | 'name'>): void {
    if (this.terrainDefs.has(name)) {
      throw new Error(`Terrain "${name}" already defined`);
    }
    this.terrainDefs.set(name, {
      id: this.nextTerrainId++,
      name,
      ...def,
    });
  }

  getTerrainDef(name: string): TerrainDef | undefined {
    return this.terrainDefs.get(name);
  }

  defineBuilding(name: string, def: Omit<BuildingDef, 'id' | 'name'>): void {
    if (this.buildingDefs.has(name)) {
      throw new Error(`Building "${name}" already defined`);
    }
    this.buildingDefs.set(name, {
      id: this.nextBuildingId++,
      name,
      ...def,
    });
  }

  getBuildingDef(name: string): BuildingDef | undefined {
    return this.buildingDefs.get(name);
  }
}
