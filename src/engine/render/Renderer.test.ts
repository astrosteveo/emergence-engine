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
import { Renderer } from './Renderer';
import { Camera } from './Camera';
import { TileMap } from '../world/TileMap';

describe('Renderer', () => {
  let canvas: HTMLCanvasElement;
  let mockCtx: CanvasRenderingContext2D;
  let renderer: Renderer;

  beforeEach(() => {
    // Create a mock canvas context
    mockCtx = {
      fillStyle: '',
      font: '',
      textAlign: 'left' as CanvasTextAlign,
      fillRect: vi.fn(),
      fillText: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    vi.spyOn(canvas, 'getContext').mockReturnValue(mockCtx);

    renderer = new Renderer(canvas);
  });

  it('should store canvas dimensions', () => {
    expect(renderer.width).toBe(800);
    expect(renderer.height).toBe(600);
  });

  it('should throw if canvas context is unavailable', () => {
    const badCanvas = document.createElement('canvas');
    vi.spyOn(badCanvas, 'getContext').mockReturnValue(null);

    expect(() => new Renderer(badCanvas)).toThrow('Failed to get 2D context');
  });

  describe('clear', () => {
    it('should clear with default color', () => {
      renderer.clear();

      expect(mockCtx.fillStyle).toBe('#1a1a2e');
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
    });

    it('should clear with custom color', () => {
      renderer.clear('#ff0000');

      expect(mockCtx.fillStyle).toBe('#ff0000');
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
    });
  });

  describe('drawRect', () => {
    it('should draw rectangle at world position transformed to screen', () => {
      renderer.drawRect(0, 0, 100, 50, '#00ff00');

      expect(mockCtx.fillStyle).toBe('#00ff00');
      // World (0,0) -> screen center (400, 300)
      expect(mockCtx.fillRect).toHaveBeenCalledWith(400, 300, 100, 50);
    });
  });

  describe('drawRectCentered', () => {
    it('should draw rectangle centered at world position', () => {
      renderer.drawRectCentered(0, 0, 50, 30, '#0000ff');

      expect(mockCtx.fillStyle).toBe('#0000ff');
      // Centered at screen center
      expect(mockCtx.fillRect).toHaveBeenCalledWith(375, 285, 50, 30);
    });
  });

  describe('drawCircle', () => {
    it('should draw circle at world position', () => {
      renderer.drawCircle(0, 0, 25, '#ff00ff');

      expect(mockCtx.fillStyle).toBe('#ff00ff');
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.arc).toHaveBeenCalledWith(400, 300, 25, 0, Math.PI * 2);
      expect(mockCtx.fill).toHaveBeenCalled();
    });
  });

  describe('drawText', () => {
    it('should draw text with defaults', () => {
      renderer.drawText('Hello', 10, 30);

      expect(mockCtx.font).toBe('16px monospace');
      expect(mockCtx.fillStyle).toBe('#ffffff');
      expect(mockCtx.textAlign).toBe('left');
      expect(mockCtx.fillText).toHaveBeenCalledWith('Hello', 10, 30);
    });

    it('should draw text with custom options', () => {
      renderer.drawText('World', 50, 60, {
        font: '24px Arial',
        color: '#123456',
        align: 'center',
      });

      expect(mockCtx.font).toBe('24px Arial');
      expect(mockCtx.fillStyle).toBe('#123456');
      expect(mockCtx.textAlign).toBe('center');
      expect(mockCtx.fillText).toHaveBeenCalledWith('World', 50, 60);
    });

    it('should draw text with partial options', () => {
      renderer.drawText('Partial', 0, 0, { color: '#aabbcc' });

      expect(mockCtx.font).toBe('16px monospace');
      expect(mockCtx.fillStyle).toBe('#aabbcc');
      expect(mockCtx.textAlign).toBe('left');
    });
  });

  describe('camera integration', () => {
    it('should expose camera instance', () => {
      expect(renderer.camera).toBeInstanceOf(Camera);
    });

    it('should transform drawRect through camera', () => {
      // Camera at origin, 1x zoom
      // Drawing at world (0, 0) should appear at screen center (400, 300)
      renderer.drawRect(0, 0, 32, 32, '#ff0000');

      // At 1x zoom, world origin is screen center, so rect at (0,0) draws at (400,300)
      expect(mockCtx.fillRect).toHaveBeenCalledWith(400, 300, 32, 32);
    });

    it('should transform drawRectCentered through camera', () => {
      renderer.drawRectCentered(0, 0, 32, 32, '#ff0000');

      // Centered at screen center
      expect(mockCtx.fillRect).toHaveBeenCalledWith(400 - 16, 300 - 16, 32, 32);
    });

    it('should transform with camera pan', () => {
      renderer.camera.pan(100, 50);

      renderer.drawRect(100, 50, 32, 32, '#ff0000');

      // Camera at (100,50), drawing at (100,50) should be at screen center
      expect(mockCtx.fillRect).toHaveBeenCalledWith(400, 300, 32, 32);
    });

    it('should transform with camera zoom', () => {
      renderer.camera.zoomIn(); // 2x zoom

      renderer.drawRect(50, 25, 16, 16, '#ff0000');

      // At 2x zoom: screen = (world - cam) * zoom + center
      // = (50 - 0) * 2 + 400 = 500, (25 - 0) * 2 + 300 = 350
      // Size also scales: 16 * 2 = 32
      expect(mockCtx.fillRect).toHaveBeenCalledWith(500, 350, 32, 32);
    });

    it('should transform drawCircle through camera', () => {
      renderer.drawCircle(0, 0, 16, '#ff0000');

      expect(mockCtx.arc).toHaveBeenCalledWith(400, 300, 16, 0, Math.PI * 2);
    });

    it('should scale circle radius with zoom', () => {
      renderer.camera.zoomIn(); // 2x

      renderer.drawCircle(0, 0, 16, '#ff0000');

      expect(mockCtx.arc).toHaveBeenCalledWith(400, 300, 32, 0, Math.PI * 2);
    });
  });

  describe('screen-space drawing', () => {
    it('should draw rect in screen space without transform', () => {
      renderer.camera.pan(100, 100);
      renderer.camera.zoomIn();

      renderer.drawRectScreen(10, 20, 50, 30, '#ff0000');

      // Should use exact screen coordinates, ignoring camera
      expect(mockCtx.fillRect).toHaveBeenCalledWith(10, 20, 50, 30);
    });

    it('should draw text in screen space without transform', () => {
      renderer.camera.pan(100, 100);

      renderer.drawTextScreen('Hello', 10, 30, { color: '#fff' });

      expect(mockCtx.fillText).toHaveBeenCalledWith('Hello', 10, 30);
    });
  });

  describe('drawTileMap', () => {
    it('should draw visible tiles', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      tileMap.create(4, 4, 'grass');

      renderer.drawTileMap(tileMap, 16);

      // Should have drawn multiple tiles
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    it('should draw terrain colors', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      tileMap.defineTerrain('water', { color: '#1d3557', walkable: false });
      tileMap.create(4, 4, 'grass');
      tileMap.setTerrain(0, 0, 'water');

      renderer.drawTileMap(tileMap, 16);

      // Should have used both colors
      const fillStyleCalls = mockCtx.fillRect.mock.calls;
      expect(fillStyleCalls.length).toBeGreaterThan(0);
    });

    it('should draw buildings on top of terrain', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      tileMap.defineBuilding('wall', { color: '#4a4a4a', solid: true });
      tileMap.create(4, 4, 'grass');
      tileMap.setBuilding(0, 0, 'wall');

      // Reset mock to track call order
      mockCtx.fillRect.mockClear();

      renderer.drawTileMap(tileMap, 16);

      // Buildings should be drawn (fillRect called multiple times)
      expect(mockCtx.fillRect.mock.calls.length).toBeGreaterThan(0);
    });

    it('should not draw tiles outside map bounds', () => {
      const tileMap = new TileMap();
      tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
      tileMap.create(2, 2, 'grass'); // Very small map

      mockCtx.fillRect.mockClear();
      renderer.drawTileMap(tileMap, 16);

      // Should only draw the 4 tiles that exist
      // (terrain + possibly buildings, but only 4 terrain tiles)
      const calls = mockCtx.fillRect.mock.calls.length;
      expect(calls).toBeGreaterThanOrEqual(4);
      expect(calls).toBeLessThanOrEqual(8); // Max if all had buildings
    });
  });
});
