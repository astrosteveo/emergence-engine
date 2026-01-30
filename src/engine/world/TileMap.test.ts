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
});
