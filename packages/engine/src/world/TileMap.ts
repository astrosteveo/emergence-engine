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
  private _width = 0;
  private _height = 0;
  private terrainData: Uint8Array | null = null;
  private buildingData: Uint8Array | null = null;
  private territoryData: Map<number, string> = new Map();

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

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

  create(width: number, height: number, defaultTerrain: string): void {
    const terrainDef = this.terrainDefs.get(defaultTerrain);
    if (!terrainDef) {
      throw new Error(`Terrain "${defaultTerrain}" not defined`);
    }

    this._width = width;
    this._height = height;
    this.terrainData = new Uint8Array(width * height);
    this.buildingData = new Uint8Array(width * height);

    // Fill with default terrain
    this.terrainData.fill(terrainDef.id);
  }

  isInBounds(x: number, y: number): boolean {
    const halfW = Math.floor(this._width / 2);
    const halfH = Math.floor(this._height / 2);
    return x >= -halfW && x < this._width - halfW &&
           y >= -halfH && y < this._height - halfH;
  }

  private toIndex(x: number, y: number): number {
    const halfW = Math.floor(this._width / 2);
    const halfH = Math.floor(this._height / 2);
    return (y + halfH) * this._width + (x + halfW);
  }

  getTerrain(x: number, y: number): TerrainDef | undefined {
    if (!this.terrainData || !this.isInBounds(x, y)) return undefined;
    const id = this.terrainData[this.toIndex(x, y)];
    for (const def of this.terrainDefs.values()) {
      if (def.id === id) return def;
    }
    return undefined;
  }

  setTerrain(x: number, y: number, name: string): void {
    if (!this.terrainData || !this.isInBounds(x, y)) return;
    const def = this.terrainDefs.get(name);
    if (!def) {
      throw new Error(`Terrain "${name}" not defined`);
    }
    this.terrainData[this.toIndex(x, y)] = def.id;
  }

  getBuilding(x: number, y: number): BuildingDef | undefined {
    if (!this.buildingData || !this.isInBounds(x, y)) return undefined;
    const id = this.buildingData[this.toIndex(x, y)];
    if (id === 0) return undefined; // No building
    for (const def of this.buildingDefs.values()) {
      if (def.id === id) return def;
    }
    return undefined;
  }

  setBuilding(x: number, y: number, name: string): void {
    if (!this.buildingData || !this.isInBounds(x, y)) return;
    const def = this.buildingDefs.get(name);
    if (!def) {
      throw new Error(`Building "${name}" not defined`);
    }
    this.buildingData[this.toIndex(x, y)] = def.id;
  }

  clearBuilding(x: number, y: number): void {
    if (!this.buildingData || !this.isInBounds(x, y)) return;
    this.buildingData[this.toIndex(x, y)] = 0;
  }

  getTerritory(x: number, y: number): string | null {
    if (!this.terrainData || !this.isInBounds(x, y)) return null;
    return this.territoryData.get(this.toIndex(x, y)) ?? null;
  }

  setTerritory(x: number, y: number, factionId: string): void {
    if (!this.terrainData || !this.isInBounds(x, y)) return;
    this.territoryData.set(this.toIndex(x, y), factionId);
  }

  clearTerritory(x: number, y: number): void {
    if (!this.terrainData || !this.isInBounds(x, y)) return;
    this.territoryData.delete(this.toIndex(x, y));
  }

  claimRadius(centerX: number, centerY: number, radius: number, factionId: string): void {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        if (this.isInBounds(x, y) && dx * dx + dy * dy <= radius * radius) {
          this.setTerritory(x, y, factionId);
        }
      }
    }
  }

  isWalkable(x: number, y: number): boolean {
    const terrain = this.getTerrain(x, y);
    if (!terrain || !terrain.walkable) return false;

    const building = this.getBuilding(x, y);
    if (building && building.solid) return false;

    return true;
  }

  // ============================================
  // Serialization accessors
  // ============================================

  /**
   * Returns the raw terrain data array as a copy.
   * Returns null if the map has not been created.
   */
  getRawTerrainData(): Uint8Array | null {
    return this.terrainData ? new Uint8Array(this.terrainData) : null;
  }

  /**
   * Returns the raw building data array as a copy.
   * Returns null if the map has not been created.
   */
  getRawBuildingData(): Uint8Array | null {
    return this.buildingData ? new Uint8Array(this.buildingData) : null;
  }

  /**
   * Returns all defined terrain types.
   */
  getAllTerrainDefs(): TerrainDef[] {
    return Array.from(this.terrainDefs.values());
  }

  /**
   * Returns all defined building types.
   */
  getAllBuildingDefs(): BuildingDef[] {
    return Array.from(this.buildingDefs.values());
  }

  /**
   * Returns all territory assignments as [index, factionId] pairs.
   */
  getAllTerritory(): [number, string][] {
    return Array.from(this.territoryData.entries());
  }

  /**
   * Loads map data from serialized state.
   * Terrain and building definitions must already be registered.
   */
  loadFromData(
    width: number,
    height: number,
    terrainData: Uint8Array,
    buildingData: Uint8Array,
    territory: [number, string][]
  ): void {
    if (terrainData.length !== width * height) {
      throw new Error(`Terrain data length mismatch: expected ${width * height}, got ${terrainData.length}`);
    }
    if (buildingData.length !== width * height) {
      throw new Error(`Building data length mismatch: expected ${width * height}, got ${buildingData.length}`);
    }

    this._width = width;
    this._height = height;
    this.terrainData = new Uint8Array(terrainData);
    this.buildingData = new Uint8Array(buildingData);

    this.territoryData.clear();
    for (const [index, factionId] of territory) {
      this.territoryData.set(index, factionId);
    }
  }
}
