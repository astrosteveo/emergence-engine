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

import { describe, it, expect } from 'vitest';
import { TileMap } from './TileMap';

describe('TileMap', () => {
  describe('terrain registry', () => {
    it('should define terrain types', () => {
      const tileMap = new TileMap();

      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });

      const def = tileMap.getTerrainDef('grass');
      expect(def).toBeDefined();
      expect(def!.name).toBe('grass');
      expect(def!.color).toBe('#3a5a40');
      expect(def!.walkable).toBe(true);
      expect(def!.id).toBe(1); // First terrain gets id 1 (0 reserved)
    });

    it('should assign sequential IDs to terrain types', () => {
      const tileMap = new TileMap();

      tileMap.defineTerrain('water', { color: '#1d3557', walkable: false });
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      tileMap.defineTerrain('stone', { color: '#6c757d', walkable: true });

      expect(tileMap.getTerrainDef('water')!.id).toBe(1);
      expect(tileMap.getTerrainDef('grass')!.id).toBe(2);
      expect(tileMap.getTerrainDef('stone')!.id).toBe(3);
    });

    it('should throw when defining duplicate terrain', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });

      expect(() => tileMap.defineTerrain('grass', { color: '#fff', walkable: true }))
        .toThrow('Terrain "grass" already defined');
    });

    it('should return undefined for unknown terrain', () => {
      const tileMap = new TileMap();

      expect(tileMap.getTerrainDef('unknown')).toBeUndefined();
    });
  });

  describe('building registry', () => {
    it('should define building types', () => {
      const tileMap = new TileMap();

      tileMap.defineBuilding('wall', { color: '#4a4a4a', solid: true });

      const def = tileMap.getBuildingDef('wall');
      expect(def).toBeDefined();
      expect(def!.name).toBe('wall');
      expect(def!.color).toBe('#4a4a4a');
      expect(def!.solid).toBe(true);
      expect(def!.id).toBe(1);
    });

    it('should assign sequential IDs to building types', () => {
      const tileMap = new TileMap();

      tileMap.defineBuilding('wall', { color: '#4a4a4a', solid: true });
      tileMap.defineBuilding('door', { color: '#8b4513', solid: false });

      expect(tileMap.getBuildingDef('wall')!.id).toBe(1);
      expect(tileMap.getBuildingDef('door')!.id).toBe(2);
    });

    it('should throw when defining duplicate building', () => {
      const tileMap = new TileMap();
      tileMap.defineBuilding('wall', { color: '#4a4a4a', solid: true });

      expect(() => tileMap.defineBuilding('wall', { color: '#fff', solid: false }))
        .toThrow('Building "wall" already defined');
    });

    it('should return undefined for unknown building', () => {
      const tileMap = new TileMap();

      expect(tileMap.getBuildingDef('unknown')).toBeUndefined();
    });
  });

  describe('map creation', () => {
    it('should create map with specified dimensions', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });

      tileMap.create(64, 64, 'grass');

      expect(tileMap.width).toBe(64);
      expect(tileMap.height).toBe(64);
    });

    it('should fill map with default terrain', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });

      tileMap.create(4, 4, 'grass');

      // Check a few tiles (4x4 map centered: valid range is -2 to 1)
      expect(tileMap.getTerrain(0, 0)?.name).toBe('grass');
      expect(tileMap.getTerrain(1, 1)?.name).toBe('grass');
      expect(tileMap.getTerrain(-2, -2)?.name).toBe('grass'); // Center origin
    });

    it('should throw when creating with undefined terrain', () => {
      const tileMap = new TileMap();

      expect(() => tileMap.create(64, 64, 'grass'))
        .toThrow('Terrain "grass" not defined');
    });

    it('should report dimensions as 0 before create', () => {
      const tileMap = new TileMap();

      expect(tileMap.width).toBe(0);
      expect(tileMap.height).toBe(0);
    });
  });

  describe('coordinate system', () => {
    it('should use center origin (0,0 is center)', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });

      tileMap.create(4, 4, 'grass'); // -2 to 1 in both axes

      // Valid coordinates
      expect(tileMap.isInBounds(-2, -2)).toBe(true);
      expect(tileMap.isInBounds(1, 1)).toBe(true);
      expect(tileMap.isInBounds(0, 0)).toBe(true);

      // Invalid coordinates
      expect(tileMap.isInBounds(-3, 0)).toBe(false);
      expect(tileMap.isInBounds(2, 0)).toBe(false);
    });
  });

  describe('tile access', () => {
    it('should set and get terrain', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      tileMap.defineTerrain('water', { color: '#1d3557', walkable: false });
      tileMap.create(4, 4, 'grass');

      tileMap.setTerrain(0, 0, 'water');

      expect(tileMap.getTerrain(0, 0)?.name).toBe('water');
      expect(tileMap.getTerrain(1, 0)?.name).toBe('grass'); // Others unchanged
    });

    it('should set and get buildings', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      tileMap.defineBuilding('wall', { color: '#4a4a4a', solid: true });
      tileMap.create(4, 4, 'grass');

      expect(tileMap.getBuilding(0, 0)).toBeUndefined();

      tileMap.setBuilding(0, 0, 'wall');

      expect(tileMap.getBuilding(0, 0)?.name).toBe('wall');
    });

    it('should clear buildings', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      tileMap.defineBuilding('wall', { color: '#4a4a4a', solid: true });
      tileMap.create(4, 4, 'grass');

      tileMap.setBuilding(0, 0, 'wall');
      tileMap.clearBuilding(0, 0);

      expect(tileMap.getBuilding(0, 0)).toBeUndefined();
    });

    it('should throw when setting undefined terrain', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      tileMap.create(4, 4, 'grass');

      expect(() => tileMap.setTerrain(0, 0, 'lava'))
        .toThrow('Terrain "lava" not defined');
    });

    it('should throw when setting undefined building', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      tileMap.create(4, 4, 'grass');

      expect(() => tileMap.setBuilding(0, 0, 'castle'))
        .toThrow('Building "castle" not defined');
    });

    it('should ignore out-of-bounds set operations', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      tileMap.defineTerrain('water', { color: '#1d3557', walkable: false });
      tileMap.create(4, 4, 'grass');

      // Should not throw
      tileMap.setTerrain(100, 100, 'water');
    });
  });

  describe('walkability', () => {
    it('should check terrain walkability', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      tileMap.defineTerrain('water', { color: '#1d3557', walkable: false });
      tileMap.create(4, 4, 'grass');

      expect(tileMap.isWalkable(0, 0)).toBe(true);

      tileMap.setTerrain(0, 0, 'water');

      expect(tileMap.isWalkable(0, 0)).toBe(false);
    });

    it('should check building solidity', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      tileMap.defineBuilding('wall', { color: '#4a4a4a', solid: true });
      tileMap.defineBuilding('floor', { color: '#8b7355', solid: false });
      tileMap.create(4, 4, 'grass');

      expect(tileMap.isWalkable(0, 0)).toBe(true);

      tileMap.setBuilding(0, 0, 'wall');
      expect(tileMap.isWalkable(0, 0)).toBe(false);

      tileMap.setBuilding(0, 0, 'floor');
      expect(tileMap.isWalkable(0, 0)).toBe(true);
    });

    it('should return false for out-of-bounds', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      tileMap.create(4, 4, 'grass');

      expect(tileMap.isWalkable(100, 100)).toBe(false);
    });
  });

  describe('territory', () => {
    it('returns null for tiles with no territory', () => {
      const map = new TileMap();
      map.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      map.create(10, 10, 'grass');

      expect(map.getTerritory(0, 0)).toBeNull();
    });

    it('stores and retrieves territory faction id', () => {
      const map = new TileMap();
      map.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      map.create(10, 10, 'grass');

      map.setTerritory(0, 0, 'red');
      expect(map.getTerritory(0, 0)).toBe('red');
    });

    it('clears territory', () => {
      const map = new TileMap();
      map.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      map.create(10, 10, 'grass');

      map.setTerritory(0, 0, 'red');
      map.clearTerritory(0, 0);
      expect(map.getTerritory(0, 0)).toBeNull();
    });

    it('claims radius around a point', () => {
      const map = new TileMap();
      map.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      map.create(20, 20, 'grass');

      map.claimRadius(0, 0, 2, 'blue');

      // Center and adjacent tiles should be claimed
      expect(map.getTerritory(0, 0)).toBe('blue');
      expect(map.getTerritory(1, 0)).toBe('blue');
      expect(map.getTerritory(0, 1)).toBe('blue');
      expect(map.getTerritory(2, 0)).toBe('blue');

      // Outside radius should not be claimed
      expect(map.getTerritory(3, 0)).toBeNull();
    });

    it('returns null for out of bounds territory queries', () => {
      const map = new TileMap();
      map.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      map.create(10, 10, 'grass');

      expect(map.getTerritory(100, 100)).toBeNull();
    });
  });

  describe('serialization', () => {
    it('should return null for raw data before map is created', () => {
      const map = new TileMap();

      expect(map.getRawTerrainData()).toBeNull();
      expect(map.getRawBuildingData()).toBeNull();
    });

    it('should return copies of raw terrain and building data', () => {
      const map = new TileMap();
      map.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      map.defineTerrain('water', { color: '#1d3557', walkable: false });
      map.defineBuilding('wall', { color: '#4a4a4a', solid: true });
      map.create(4, 4, 'grass');

      map.setTerrain(0, 0, 'water');
      map.setBuilding(1, 0, 'wall');

      const terrainData = map.getRawTerrainData();
      const buildingData = map.getRawBuildingData();

      expect(terrainData).not.toBeNull();
      expect(buildingData).not.toBeNull();
      expect(terrainData!.length).toBe(16);
      expect(buildingData!.length).toBe(16);

      // Verify it's a copy by modifying and checking original is unchanged
      terrainData![0] = 255;
      expect(map.getRawTerrainData()![0]).not.toBe(255);
    });

    it('should return all terrain definitions', () => {
      const map = new TileMap();
      map.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      map.defineTerrain('water', { color: '#1d3557', walkable: false });

      const defs = map.getAllTerrainDefs();

      expect(defs).toHaveLength(2);
      expect(defs.find(d => d.name === 'grass')).toBeDefined();
      expect(defs.find(d => d.name === 'water')).toBeDefined();
    });

    it('should return all building definitions', () => {
      const map = new TileMap();
      map.defineBuilding('wall', { color: '#4a4a4a', solid: true });
      map.defineBuilding('floor', { color: '#8b7355', solid: false });

      const defs = map.getAllBuildingDefs();

      expect(defs).toHaveLength(2);
      expect(defs.find(d => d.name === 'wall')).toBeDefined();
      expect(defs.find(d => d.name === 'floor')).toBeDefined();
    });

    it('should return all territory assignments', () => {
      const map = new TileMap();
      map.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      map.create(10, 10, 'grass');

      map.setTerritory(0, 0, 'red');
      map.setTerritory(1, 0, 'blue');

      const territory = map.getAllTerritory();

      expect(territory.length).toBe(2);
      expect(territory.some(([_, faction]) => faction === 'red')).toBe(true);
      expect(territory.some(([_, faction]) => faction === 'blue')).toBe(true);
    });

    it('should load from serialized data', () => {
      const map = new TileMap();
      map.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      map.defineTerrain('water', { color: '#1d3557', walkable: false });
      map.defineBuilding('wall', { color: '#4a4a4a', solid: true });

      // Create terrain data: 4x4 grid, mostly grass (id=1), one water (id=2)
      const terrainData = new Uint8Array(16);
      terrainData.fill(1);
      terrainData[0] = 2; // Water at index 0

      // Create building data: one wall
      const buildingData = new Uint8Array(16);
      buildingData[1] = 1; // Wall at index 1

      // Territory data
      const territory: [number, string][] = [[5, 'red'], [6, 'blue']];

      map.loadFromData(4, 4, terrainData, buildingData, territory);

      expect(map.width).toBe(4);
      expect(map.height).toBe(4);
      expect(map.getTerrain(-2, -2)?.name).toBe('water'); // Index 0
      expect(map.getTerrain(-1, -2)?.name).toBe('grass'); // Index 1
      expect(map.getBuilding(-1, -2)?.name).toBe('wall'); // Index 1
    });

    it('should round-trip serialize/deserialize correctly', () => {
      // Create and populate a map
      const original = new TileMap();
      original.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      original.defineTerrain('water', { color: '#1d3557', walkable: false });
      original.defineBuilding('wall', { color: '#4a4a4a', solid: true });
      original.create(8, 8, 'grass');

      original.setTerrain(0, 0, 'water');
      original.setTerrain(1, 1, 'water');
      original.setBuilding(2, 2, 'wall');
      original.setTerritory(0, 0, 'red');
      original.setTerritory(-1, -1, 'blue');

      // Serialize
      const terrainData = original.getRawTerrainData()!;
      const buildingData = original.getRawBuildingData()!;
      const territory = original.getAllTerritory();

      // Create new map with same definitions
      const restored = new TileMap();
      restored.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      restored.defineTerrain('water', { color: '#1d3557', walkable: false });
      restored.defineBuilding('wall', { color: '#4a4a4a', solid: true });

      // Deserialize
      restored.loadFromData(8, 8, terrainData, buildingData, territory);

      // Verify
      expect(restored.width).toBe(original.width);
      expect(restored.height).toBe(original.height);
      expect(restored.getTerrain(0, 0)?.name).toBe('water');
      expect(restored.getTerrain(1, 1)?.name).toBe('water');
      expect(restored.getTerrain(2, 0)?.name).toBe('grass');
      expect(restored.getBuilding(2, 2)?.name).toBe('wall');
      expect(restored.getBuilding(0, 0)).toBeUndefined();
      expect(restored.getTerritory(0, 0)).toBe('red');
      expect(restored.getTerritory(-1, -1)).toBe('blue');
    });

    it('should throw on terrain data length mismatch', () => {
      const map = new TileMap();
      map.defineTerrain('grass', { color: '#3a5a40', walkable: true });

      const terrainData = new Uint8Array(10); // Wrong size
      const buildingData = new Uint8Array(16);

      expect(() => map.loadFromData(4, 4, terrainData, buildingData, []))
        .toThrow('Terrain data length mismatch');
    });

    it('should throw on building data length mismatch', () => {
      const map = new TileMap();
      map.defineTerrain('grass', { color: '#3a5a40', walkable: true });

      const terrainData = new Uint8Array(16);
      const buildingData = new Uint8Array(10); // Wrong size

      expect(() => map.loadFromData(4, 4, terrainData, buildingData, []))
        .toThrow('Building data length mismatch');
    });
  });
});
