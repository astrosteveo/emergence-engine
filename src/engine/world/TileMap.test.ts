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
});
