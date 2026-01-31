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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { serialize } from './serialize';
import { deserialize } from './deserialize';
import { Engine } from '../Engine';
import type { EmergenceSaveFile } from './types';

// Mock canvas for tests
function createMockCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;

  const ctx = {
    fillRect: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    strokeRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
  };

  vi.spyOn(canvas, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);

  return canvas;
}

describe('Serialization', () => {
  let engine: Engine;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = createMockCanvas();
    engine = new Engine({ canvas });
  });

  describe('serialize', () => {
    it('should throw if TileMap not created', () => {
      expect(() => serialize(engine)).toThrow('TileMap has not been created');
    });

    it('should serialize basic engine state', () => {
      // Set up tile map
      engine.tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      engine.tileMap.create(8, 8, 'grass');

      const result = serialize(engine, { name: 'Test Project' });

      expect(result.version).toBe(1);
      expect(result.name).toBe('Test Project');
      expect(result.createdAt).toBeDefined();
      expect(result.tileMap.width).toBe(8);
      expect(result.tileMap.height).toBe(8);
    });

    it('should include terrain and building definitions', () => {
      engine.tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      engine.tileMap.defineTerrain('water', { color: '#1d3557', walkable: false });
      engine.tileMap.defineBuilding('wall', { color: '#4a4a4a', solid: true });
      engine.tileMap.create(4, 4, 'grass');

      const result = serialize(engine);

      expect(result.tileMap.terrainDefs).toHaveLength(2);
      expect(result.tileMap.buildingDefs).toHaveLength(1);
      expect(result.tileMap.terrainDefs.find(d => d.name === 'grass')).toBeDefined();
      expect(result.tileMap.terrainDefs.find(d => d.name === 'water')).toBeDefined();
      expect(result.tileMap.buildingDefs.find(d => d.name === 'wall')).toBeDefined();
    });

    it('should base64 encode tile data', () => {
      engine.tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      engine.tileMap.create(4, 4, 'grass');

      const result = serialize(engine);

      // Should be valid base64
      expect(() => atob(result.tileMap.terrainData)).not.toThrow();
      expect(() => atob(result.tileMap.buildingData)).not.toThrow();
    });

    it('should serialize entities and components', () => {
      engine.tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      engine.tileMap.create(4, 4, 'grass');

      engine.ecs.defineComponent('Position', { x: 0, y: 0 });
      engine.ecs.defineComponent('Name', { value: '' });

      const e1 = engine.ecs.createEntity();
      engine.ecs.addComponent(e1, 'Position', { x: 10, y: 20 });
      engine.ecs.addComponent(e1, 'Name', { value: 'Player' });

      const e2 = engine.ecs.createEntity();
      engine.ecs.addComponent(e2, 'Position', { x: 30, y: 40 });

      const result = serialize(engine);

      expect(result.ecs.componentDefs).toHaveLength(2);
      expect(result.ecs.entities).toHaveLength(2);

      const savedE1 = result.ecs.entities.find(e => e.id === e1);
      expect(savedE1).toBeDefined();
      expect(savedE1!.components['Position']).toEqual({ x: 10, y: 20 });
      expect(savedE1!.components['Name']).toEqual({ value: 'Player' });
    });

    it('should serialize camera state', () => {
      engine.tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      engine.tileMap.create(4, 4, 'grass');

      engine.camera.pan(100, 200);
      engine.camera.zoomIn();

      const result = serialize(engine);

      expect(result.camera.x).toBe(100);
      expect(result.camera.y).toBe(200);
      expect(result.camera.zoomLevel).toBe(1);
    });

    it('should serialize territory data', () => {
      engine.tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      engine.tileMap.create(8, 8, 'grass');

      engine.tileMap.setTerritory(0, 0, 'red');
      engine.tileMap.setTerritory(1, 1, 'blue');

      const result = serialize(engine);

      expect(result.tileMap.territory.length).toBe(2);
    });

    it('should use default settings when not provided', () => {
      engine.tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      engine.tileMap.create(4, 4, 'grass');

      const result = serialize(engine);

      expect(result.name).toBe('Untitled Project');
      expect(result.settings.tickRate).toBe(20);
      expect(result.settings.tileSize).toBe(16);
    });
  });

  describe('deserialize', () => {
    it('should throw on unsupported version', () => {
      const saveFile = { version: 99 } as unknown as EmergenceSaveFile;

      expect(() => deserialize(engine, saveFile)).toThrow('Unsupported save file version: 99');
    });

    it('should throw if terrain definition missing', () => {
      const saveFile: EmergenceSaveFile = {
        version: 1,
        name: 'Test',
        createdAt: new Date().toISOString(),
        settings: { tickRate: 20, tileSize: 16 },
        tileMap: {
          width: 4,
          height: 4,
          terrainDefs: [{ id: 1, name: 'grass', color: '#3a5a40', walkable: true }],
          buildingDefs: [],
          terrainData: btoa(String.fromCharCode(...new Uint8Array(16).fill(1))),
          buildingData: btoa(String.fromCharCode(...new Uint8Array(16))),
          territory: [],
        },
        ecs: { componentDefs: [], entities: [] },
        camera: { x: 0, y: 0, zoomLevel: 0 },
      };

      expect(() => deserialize(engine, saveFile)).toThrow(
        'Terrain "grass" is in save file but not defined'
      );
    });

    it('should throw if building definition missing', () => {
      engine.tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });

      const saveFile: EmergenceSaveFile = {
        version: 1,
        name: 'Test',
        createdAt: new Date().toISOString(),
        settings: { tickRate: 20, tileSize: 16 },
        tileMap: {
          width: 4,
          height: 4,
          terrainDefs: [{ id: 1, name: 'grass', color: '#3a5a40', walkable: true }],
          buildingDefs: [{ id: 1, name: 'wall', color: '#4a4a4a', solid: true }],
          terrainData: btoa(String.fromCharCode(...new Uint8Array(16).fill(1))),
          buildingData: btoa(String.fromCharCode(...new Uint8Array(16))),
          territory: [],
        },
        ecs: { componentDefs: [], entities: [] },
        camera: { x: 0, y: 0, zoomLevel: 0 },
      };

      expect(() => deserialize(engine, saveFile)).toThrow(
        'Building "wall" is in save file but not defined'
      );
    });

    it('should throw if component definition missing', () => {
      engine.tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });

      const saveFile: EmergenceSaveFile = {
        version: 1,
        name: 'Test',
        createdAt: new Date().toISOString(),
        settings: { tickRate: 20, tileSize: 16 },
        tileMap: {
          width: 4,
          height: 4,
          terrainDefs: [{ id: 1, name: 'grass', color: '#3a5a40', walkable: true }],
          buildingDefs: [],
          terrainData: btoa(String.fromCharCode(...new Uint8Array(16).fill(1))),
          buildingData: btoa(String.fromCharCode(...new Uint8Array(16))),
          territory: [],
        },
        ecs: {
          componentDefs: [{ name: 'Position', defaults: { x: 0, y: 0 } }],
          entities: [],
        },
        camera: { x: 0, y: 0, zoomLevel: 0 },
      };

      expect(() => deserialize(engine, saveFile)).toThrow(
        'Component "Position" is in save file but not defined'
      );
    });

    it('should skip component validation when option set', () => {
      engine.tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });

      const saveFile: EmergenceSaveFile = {
        version: 1,
        name: 'Test',
        createdAt: new Date().toISOString(),
        settings: { tickRate: 20, tileSize: 16 },
        tileMap: {
          width: 4,
          height: 4,
          terrainDefs: [{ id: 1, name: 'grass', color: '#3a5a40', walkable: true }],
          buildingDefs: [],
          terrainData: btoa(String.fromCharCode(...new Uint8Array(16).fill(1))),
          buildingData: btoa(String.fromCharCode(...new Uint8Array(16))),
          territory: [],
        },
        ecs: {
          componentDefs: [{ name: 'Position', defaults: { x: 0, y: 0 } }],
          entities: [],
        },
        camera: { x: 0, y: 0, zoomLevel: 0 },
      };

      // Should not throw when validation skipped
      expect(() => deserialize(engine, saveFile, { skipValidation: true })).not.toThrow();
    });

    it('should restore tile map data', () => {
      engine.tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      engine.tileMap.defineTerrain('water', { color: '#1d3557', walkable: false });

      // Create terrain data with one water tile at index 0
      const terrainData = new Uint8Array(16);
      terrainData.fill(1); // grass
      terrainData[0] = 2; // water

      const saveFile: EmergenceSaveFile = {
        version: 1,
        name: 'Test',
        createdAt: new Date().toISOString(),
        settings: { tickRate: 20, tileSize: 16 },
        tileMap: {
          width: 4,
          height: 4,
          terrainDefs: [
            { id: 1, name: 'grass', color: '#3a5a40', walkable: true },
            { id: 2, name: 'water', color: '#1d3557', walkable: false },
          ],
          buildingDefs: [],
          terrainData: btoa(String.fromCharCode(...terrainData)),
          buildingData: btoa(String.fromCharCode(...new Uint8Array(16))),
          territory: [[5, 'red']],
        },
        ecs: { componentDefs: [], entities: [] },
        camera: { x: 0, y: 0, zoomLevel: 0 },
      };

      deserialize(engine, saveFile);

      expect(engine.tileMap.width).toBe(4);
      expect(engine.tileMap.height).toBe(4);
      expect(engine.tileMap.getTerrain(-2, -2)?.name).toBe('water');
      expect(engine.tileMap.getTerrain(-1, -2)?.name).toBe('grass');
    });

    it('should restore entities with preserved IDs', () => {
      engine.tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      engine.ecs.defineComponent('Position', { x: 0, y: 0 });
      engine.ecs.defineComponent('Name', { value: '' });

      const entityId = (0 << 20) | 5; // Index 5, generation 0

      const saveFile: EmergenceSaveFile = {
        version: 1,
        name: 'Test',
        createdAt: new Date().toISOString(),
        settings: { tickRate: 20, tileSize: 16 },
        tileMap: {
          width: 4,
          height: 4,
          terrainDefs: [{ id: 1, name: 'grass', color: '#3a5a40', walkable: true }],
          buildingDefs: [],
          terrainData: btoa(String.fromCharCode(...new Uint8Array(16).fill(1))),
          buildingData: btoa(String.fromCharCode(...new Uint8Array(16))),
          territory: [],
        },
        ecs: {
          componentDefs: [
            { name: 'Position', defaults: { x: 0, y: 0 } },
            { name: 'Name', defaults: { value: '' } },
          ],
          entities: [
            {
              id: entityId,
              components: {
                Position: { x: 100, y: 200 },
                Name: { value: 'Player' },
              },
            },
          ],
        },
        camera: { x: 0, y: 0, zoomLevel: 0 },
      };

      deserialize(engine, saveFile);

      expect(engine.ecs.isAlive(entityId)).toBe(true);
      expect(engine.ecs.getComponent(entityId, 'Position')).toEqual({ x: 100, y: 200 });
      expect(engine.ecs.getComponent(entityId, 'Name')).toEqual({ value: 'Player' });
    });

    it('should restore camera state', () => {
      engine.tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });

      const saveFile: EmergenceSaveFile = {
        version: 1,
        name: 'Test',
        createdAt: new Date().toISOString(),
        settings: { tickRate: 20, tileSize: 16 },
        tileMap: {
          width: 4,
          height: 4,
          terrainDefs: [{ id: 1, name: 'grass', color: '#3a5a40', walkable: true }],
          buildingDefs: [],
          terrainData: btoa(String.fromCharCode(...new Uint8Array(16).fill(1))),
          buildingData: btoa(String.fromCharCode(...new Uint8Array(16))),
          territory: [],
        },
        ecs: { componentDefs: [], entities: [] },
        camera: { x: 150, y: 250, zoomLevel: 2 },
      };

      deserialize(engine, saveFile);

      expect(engine.camera.x).toBe(150);
      expect(engine.camera.y).toBe(250);
      expect(engine.camera.zoom).toBe(4); // zoomLevel 2 = 4x
    });

    it('should clear existing entities before loading', () => {
      engine.tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      engine.ecs.defineComponent('Position', { x: 0, y: 0 });

      // Create an entity that should be cleared
      const existingEntity = engine.ecs.createEntity();
      engine.ecs.addComponent(existingEntity, 'Position', { x: 999, y: 999 });

      const saveFile: EmergenceSaveFile = {
        version: 1,
        name: 'Test',
        createdAt: new Date().toISOString(),
        settings: { tickRate: 20, tileSize: 16 },
        tileMap: {
          width: 4,
          height: 4,
          terrainDefs: [{ id: 1, name: 'grass', color: '#3a5a40', walkable: true }],
          buildingDefs: [],
          terrainData: btoa(String.fromCharCode(...new Uint8Array(16).fill(1))),
          buildingData: btoa(String.fromCharCode(...new Uint8Array(16))),
          territory: [],
        },
        ecs: { componentDefs: [{ name: 'Position', defaults: { x: 0, y: 0 } }], entities: [] },
        camera: { x: 0, y: 0, zoomLevel: 0 },
      };

      deserialize(engine, saveFile);

      expect(engine.ecs.isAlive(existingEntity)).toBe(false);
      expect(engine.ecs.getAllEntities()).toHaveLength(0);
    });
  });

  describe('round-trip', () => {
    it('should preserve full state through serialize/deserialize', () => {
      // Set up original state
      engine.tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      engine.tileMap.defineTerrain('water', { color: '#1d3557', walkable: false });
      engine.tileMap.defineBuilding('wall', { color: '#4a4a4a', solid: true });
      engine.tileMap.create(8, 8, 'grass');

      engine.tileMap.setTerrain(0, 0, 'water');
      engine.tileMap.setBuilding(1, 1, 'wall');
      engine.tileMap.setTerritory(2, 2, 'red');

      engine.ecs.defineComponent('Position', { x: 0, y: 0 });
      engine.ecs.defineComponent('Tag', { value: '' });

      const e1 = engine.ecs.createEntity();
      engine.ecs.addComponent(e1, 'Position', { x: 100, y: 200 });
      engine.ecs.addComponent(e1, 'Tag', { value: 'player' });

      const e2 = engine.ecs.createEntity();
      engine.ecs.addComponent(e2, 'Position', { x: 300, y: 400 });

      engine.camera.pan(50, 100);
      engine.camera.zoomIn();

      // Serialize
      const saved = serialize(engine, { name: 'Test Game', tickRate: 30, tileSize: 32 });

      // Create new engine and restore
      const canvas2 = createMockCanvas();
      const engine2 = new Engine({ canvas: canvas2 });

      // Must define terrain/building/components before deserialize
      engine2.tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      engine2.tileMap.defineTerrain('water', { color: '#1d3557', walkable: false });
      engine2.tileMap.defineBuilding('wall', { color: '#4a4a4a', solid: true });
      engine2.ecs.defineComponent('Position', { x: 0, y: 0 });
      engine2.ecs.defineComponent('Tag', { value: '' });

      deserialize(engine2, saved);

      // Verify tile map
      expect(engine2.tileMap.width).toBe(8);
      expect(engine2.tileMap.height).toBe(8);
      expect(engine2.tileMap.getTerrain(0, 0)?.name).toBe('water');
      expect(engine2.tileMap.getBuilding(1, 1)?.name).toBe('wall');
      expect(engine2.tileMap.getTerritory(2, 2)).toBe('red');

      // Verify entities (exact IDs preserved)
      expect(engine2.ecs.isAlive(e1)).toBe(true);
      expect(engine2.ecs.isAlive(e2)).toBe(true);
      expect(engine2.ecs.getComponent(e1, 'Position')).toEqual({ x: 100, y: 200 });
      expect(engine2.ecs.getComponent(e1, 'Tag')).toEqual({ value: 'player' });
      expect(engine2.ecs.getComponent(e2, 'Position')).toEqual({ x: 300, y: 400 });

      // Verify camera
      expect(engine2.camera.x).toBe(50);
      expect(engine2.camera.y).toBe(100);
      expect(engine2.camera.zoom).toBe(2);
    });

    it('should preserve entity references through round-trip', () => {
      engine.tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      engine.tileMap.create(4, 4, 'grass');

      engine.ecs.defineComponent('Position', { x: 0, y: 0 });
      engine.ecs.defineComponent('Target', { entityRef: 0 });

      const target = engine.ecs.createEntity();
      engine.ecs.addComponent(target, 'Position', { x: 100, y: 100 });

      const follower = engine.ecs.createEntity();
      engine.ecs.addComponent(follower, 'Position', { x: 0, y: 0 });
      engine.ecs.addComponent(follower, 'Target', { entityRef: target });

      // Serialize
      const saved = serialize(engine);

      // Create new engine and restore
      const canvas2 = createMockCanvas();
      const engine2 = new Engine({ canvas: canvas2 });
      engine2.tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      engine2.ecs.defineComponent('Position', { x: 0, y: 0 });
      engine2.ecs.defineComponent('Target', { entityRef: 0 });

      deserialize(engine2, saved);

      // Get the follower's target reference
      const targetRef = engine2.ecs.getComponent<{ entityRef: number }>(follower, 'Target')!.entityRef;

      // The reference should still work
      expect(engine2.ecs.isAlive(targetRef)).toBe(true);
      expect(engine2.ecs.getComponent(targetRef, 'Position')).toEqual({ x: 100, y: 100 });
    });
  });
});
