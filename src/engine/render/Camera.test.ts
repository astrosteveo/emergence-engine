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
});
