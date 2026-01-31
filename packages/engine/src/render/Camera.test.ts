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
import { Camera } from './Camera';

describe('Camera', () => {
  describe('position', () => {
    it('should start at origin', () => {
      const camera = new Camera(800, 600);

      expect(camera.x).toBe(0);
      expect(camera.y).toBe(0);
    });

    it('should pan by delta', () => {
      const camera = new Camera(800, 600);

      camera.pan(100, 50);

      expect(camera.x).toBe(100);
      expect(camera.y).toBe(50);
    });

    it('should accumulate pan movements', () => {
      const camera = new Camera(800, 600);

      camera.pan(100, 50);
      camera.pan(-30, 20);

      expect(camera.x).toBe(70);
      expect(camera.y).toBe(70);
    });

    it('should center on position', () => {
      const camera = new Camera(800, 600);
      camera.pan(100, 100);

      camera.centerOn(0, 0);

      expect(camera.x).toBe(0);
      expect(camera.y).toBe(0);
    });
  });

  describe('zoom', () => {
    it('should start at zoom level 0 (1x)', () => {
      const camera = new Camera(800, 600);

      expect(camera.zoom).toBe(1);
    });

    it('should zoom in to next level', () => {
      const camera = new Camera(800, 600);

      camera.zoomIn();

      expect(camera.zoom).toBe(2);
    });

    it('should zoom out to previous level', () => {
      const camera = new Camera(800, 600);
      camera.zoomIn(); // Now at 2x

      camera.zoomOut();

      expect(camera.zoom).toBe(1);
    });

    it('should clamp zoom at maximum', () => {
      const camera = new Camera(800, 600);

      camera.zoomIn(); // 2x
      camera.zoomIn(); // 4x
      camera.zoomIn(); // Still 4x

      expect(camera.zoom).toBe(4);
    });

    it('should clamp zoom at minimum', () => {
      const camera = new Camera(800, 600);

      camera.zoomOut(); // Still 1x

      expect(camera.zoom).toBe(1);
    });

    it('should set zoom level directly', () => {
      const camera = new Camera(800, 600);

      camera.setZoomLevel(2); // 4x

      expect(camera.zoom).toBe(4);
    });

    it('should clamp setZoomLevel to valid range', () => {
      const camera = new Camera(800, 600);

      camera.setZoomLevel(10);
      expect(camera.zoom).toBe(4); // Max

      camera.setZoomLevel(-5);
      expect(camera.zoom).toBe(1); // Min
    });
  });

  describe('coordinate transforms', () => {
    it('should transform world to screen at origin', () => {
      const camera = new Camera(800, 600);

      const screen = camera.worldToScreen(0, 0);

      // World origin maps to screen center
      expect(screen.x).toBe(400);
      expect(screen.y).toBe(300);
    });

    it('should transform world to screen with pan', () => {
      const camera = new Camera(800, 600);
      camera.pan(100, 50); // Camera looking at (100, 50)

      const screen = camera.worldToScreen(100, 50);

      // Camera position maps to screen center
      expect(screen.x).toBe(400);
      expect(screen.y).toBe(300);
    });

    it('should transform world to screen with zoom', () => {
      const camera = new Camera(800, 600);
      camera.zoomIn(); // 2x zoom

      const screen = camera.worldToScreen(50, 25);

      // At 2x zoom, 50 world units = 100 screen pixels from center
      expect(screen.x).toBe(500); // 400 + 50*2
      expect(screen.y).toBe(350); // 300 + 25*2
    });

    it('should transform screen to world', () => {
      const camera = new Camera(800, 600);

      const world = camera.screenToWorld(400, 300);

      // Screen center maps to world origin
      expect(world.x).toBe(0);
      expect(world.y).toBe(0);
    });

    it('should round-trip world to screen to world', () => {
      const camera = new Camera(800, 600);
      camera.pan(123, 456);
      camera.zoomIn();

      const original = { x: 78, y: 90 };
      const screen = camera.worldToScreen(original.x, original.y);
      const result = camera.screenToWorld(screen.x, screen.y);

      expect(result.x).toBeCloseTo(original.x);
      expect(result.y).toBeCloseTo(original.y);
    });

    it('should transform world to tile coordinates', () => {
      const camera = new Camera(800, 600);
      const tileSize = 16;

      expect(camera.worldToTile(0, 0, tileSize)).toEqual({ x: 0, y: 0 });
      expect(camera.worldToTile(16, 16, tileSize)).toEqual({ x: 1, y: 1 });
      expect(camera.worldToTile(-16, -16, tileSize)).toEqual({ x: -1, y: -1 });
      expect(camera.worldToTile(8, 8, tileSize)).toEqual({ x: 0, y: 0 }); // Rounds down
    });
  });

  describe('screenToTile', () => {
    it('should convert screen coordinates to tile coordinates', () => {
      const camera = new Camera(800, 600);
      camera.centerOn(0, 0);
      // Screen center (400, 300) -> world (0, 0) -> tile (0, 0) with tileSize 16
      const tile = camera.screenToTile(400, 300, 16);
      expect(tile.x).toBe(0);
      expect(tile.y).toBe(0);
    });

    it('should account for camera position', () => {
      const camera = new Camera(800, 600);
      camera.centerOn(32, 32); // 2 tiles offset
      // Screen center -> world (32, 32) -> tile (2, 2)
      const tile = camera.screenToTile(400, 300, 16);
      expect(tile.x).toBe(2);
      expect(tile.y).toBe(2);
    });

    it('should account for zoom', () => {
      const camera = new Camera(800, 600);
      camera.centerOn(0, 0);
      camera.zoomIn(); // 2x zoom
      // Screen (400 + 16, 300 + 16) with 2x zoom -> world (8, 8) -> tile (0, 0)
      const tile = camera.screenToTile(400 + 16, 300 + 16, 16);
      expect(tile.x).toBe(0);
      expect(tile.y).toBe(0);
    });
  });

  describe('visible bounds', () => {
    it('should calculate visible tile bounds at 1x zoom', () => {
      const camera = new Camera(800, 600);
      const tileSize = 16;

      const bounds = camera.getVisibleBounds(tileSize);

      // 800/16 = 50 tiles wide, 600/16 = 37.5 tiles tall
      // Centered at origin: -25 to 25, -19 to 19 (with padding)
      expect(bounds.minX).toBeLessThanOrEqual(-25);
      expect(bounds.maxX).toBeGreaterThanOrEqual(25);
      expect(bounds.minY).toBeLessThanOrEqual(-18);
      expect(bounds.maxY).toBeGreaterThanOrEqual(18);
    });

    it('should calculate visible tile bounds with pan', () => {
      const camera = new Camera(800, 600);
      camera.centerOn(160, 160); // 10 tiles right and down
      const tileSize = 16;

      const bounds = camera.getVisibleBounds(tileSize);

      // Should be shifted by 10 tiles
      expect(bounds.minX).toBeLessThanOrEqual(-15);
      expect(bounds.maxX).toBeGreaterThanOrEqual(35);
    });

    it('should calculate smaller visible bounds at higher zoom', () => {
      const camera = new Camera(800, 600);
      const tileSize = 16;

      const bounds1x = camera.getVisibleBounds(tileSize);
      camera.zoomIn(); // 2x
      const bounds2x = camera.getVisibleBounds(tileSize);

      // At 2x zoom, visible area should be half the size
      const width1x = bounds1x.maxX - bounds1x.minX;
      const width2x = bounds2x.maxX - bounds2x.minX;
      expect(width2x).toBeLessThan(width1x);
    });
  });

  describe('serialization', () => {
    it('should return current state', () => {
      const camera = new Camera(800, 600);
      camera.pan(100, 200);
      camera.zoomIn();

      const state = camera.getState();

      expect(state.x).toBe(100);
      expect(state.y).toBe(200);
      expect(state.zoomLevel).toBe(1); // Index 1 = 2x zoom
    });

    it('should restore state from saved data', () => {
      const camera = new Camera(800, 600);

      camera.setState({ x: 50, y: 75, zoomLevel: 2 });

      expect(camera.x).toBe(50);
      expect(camera.y).toBe(75);
      expect(camera.zoom).toBe(4); // Level 2 = 4x zoom
    });

    it('should clamp invalid zoom levels when restoring', () => {
      const camera = new Camera(800, 600);

      camera.setState({ x: 0, y: 0, zoomLevel: 10 });
      expect(camera.zoom).toBe(4); // Max level

      camera.setState({ x: 0, y: 0, zoomLevel: -5 });
      expect(camera.zoom).toBe(1); // Min level
    });

    it('should round-trip state correctly', () => {
      const camera1 = new Camera(800, 600);
      camera1.pan(123, 456);
      camera1.zoomIn();
      camera1.zoomIn();

      const state = camera1.getState();

      const camera2 = new Camera(800, 600);
      camera2.setState(state);

      expect(camera2.x).toBe(camera1.x);
      expect(camera2.y).toBe(camera1.y);
      expect(camera2.zoom).toBe(camera1.zoom);
    });

    it('should expose zoom level getter', () => {
      const camera = new Camera(800, 600);

      expect(camera.zoomLevel).toBe(0);

      camera.zoomIn();
      expect(camera.zoomLevel).toBe(1);

      camera.zoomIn();
      expect(camera.zoomLevel).toBe(2);
    });
  });

  describe('resize', () => {
    it('should update viewport dimensions', () => {
      const camera = new Camera(800, 600);

      expect(camera.viewportWidth).toBe(800);
      expect(camera.viewportHeight).toBe(600);

      camera.resize(1024, 768);

      expect(camera.viewportWidth).toBe(1024);
      expect(camera.viewportHeight).toBe(768);
    });

    it('should affect coordinate transforms after resize', () => {
      const camera = new Camera(800, 600);

      // Screen center should map to world origin
      let world = camera.screenToWorld(400, 300);
      expect(world.x).toBe(0);
      expect(world.y).toBe(0);

      // After resize, new screen center should map to world origin
      camera.resize(1024, 768);
      world = camera.screenToWorld(512, 384);
      expect(world.x).toBe(0);
      expect(world.y).toBe(0);
    });
  });
});
