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
import { generateTerrain } from './generate';

describe('generateTerrain', () => {
  it('should create map with specified dimensions', () => {
    const tileMap = new TileMap();
    tileMap.defineTerrain('water', { color: '#1d3557', walkable: false });
    tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
    tileMap.defineTerrain('stone', { color: '#6c757d', walkable: true });

    generateTerrain(tileMap, { width: 32, height: 32 });

    expect(tileMap.width).toBe(32);
    expect(tileMap.height).toBe(32);
  });

  it('should fill all tiles with valid terrain', () => {
    const tileMap = new TileMap();
    tileMap.defineTerrain('water', { color: '#1d3557', walkable: false });
    tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
    tileMap.defineTerrain('stone', { color: '#6c757d', walkable: true });

    generateTerrain(tileMap, { width: 16, height: 16 });

    // Check that all tiles have terrain
    for (let y = -8; y < 8; y++) {
      for (let x = -8; x < 8; x++) {
        const terrain = tileMap.getTerrain(x, y);
        expect(terrain).toBeDefined();
        expect(['water', 'grass', 'stone']).toContain(terrain!.name);
      }
    }
  });

  it('should produce deterministic output with same seed', () => {
    const tileMap1 = new TileMap();
    tileMap1.defineTerrain('water', { color: '#1d3557', walkable: false });
    tileMap1.defineTerrain('grass', { color: '#3a5a40', walkable: true });
    tileMap1.defineTerrain('stone', { color: '#6c757d', walkable: true });

    const tileMap2 = new TileMap();
    tileMap2.defineTerrain('water', { color: '#1d3557', walkable: false });
    tileMap2.defineTerrain('grass', { color: '#3a5a40', walkable: true });
    tileMap2.defineTerrain('stone', { color: '#6c757d', walkable: true });

    generateTerrain(tileMap1, { width: 16, height: 16, seed: 12345 });
    generateTerrain(tileMap2, { width: 16, height: 16, seed: 12345 });

    // All tiles should match
    for (let y = -8; y < 8; y++) {
      for (let x = -8; x < 8; x++) {
        expect(tileMap1.getTerrain(x, y)?.name).toBe(tileMap2.getTerrain(x, y)?.name);
      }
    }
  });

  it('should produce different output with different seeds', () => {
    const tileMap1 = new TileMap();
    tileMap1.defineTerrain('water', { color: '#1d3557', walkable: false });
    tileMap1.defineTerrain('grass', { color: '#3a5a40', walkable: true });
    tileMap1.defineTerrain('stone', { color: '#6c757d', walkable: true });

    const tileMap2 = new TileMap();
    tileMap2.defineTerrain('water', { color: '#1d3557', walkable: false });
    tileMap2.defineTerrain('grass', { color: '#3a5a40', walkable: true });
    tileMap2.defineTerrain('stone', { color: '#6c757d', walkable: true });

    generateTerrain(tileMap1, { width: 16, height: 16, seed: 11111 });
    generateTerrain(tileMap2, { width: 16, height: 16, seed: 99999 });

    // At least some tiles should differ
    let differences = 0;
    for (let y = -8; y < 8; y++) {
      for (let x = -8; x < 8; x++) {
        if (tileMap1.getTerrain(x, y)?.name !== tileMap2.getTerrain(x, y)?.name) {
          differences++;
        }
      }
    }
    expect(differences).toBeGreaterThan(0);
  });

  it('should throw if required terrains are not defined', () => {
    const tileMap = new TileMap();
    // Missing water, grass, stone

    expect(() => generateTerrain(tileMap, { width: 16, height: 16 }))
      .toThrow('Required terrain "water" not defined');
  });
});
