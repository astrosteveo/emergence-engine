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
    it('should draw rectangle at position', () => {
      renderer.drawRect(10, 20, 100, 50, '#00ff00');

      expect(mockCtx.fillStyle).toBe('#00ff00');
      expect(mockCtx.fillRect).toHaveBeenCalledWith(10, 20, 100, 50);
    });
  });

  describe('drawRectCentered', () => {
    it('should draw rectangle centered at position', () => {
      renderer.drawRectCentered(100, 100, 50, 30, '#0000ff');

      expect(mockCtx.fillStyle).toBe('#0000ff');
      // x - width/2 = 100 - 25 = 75
      // y - height/2 = 100 - 15 = 85
      expect(mockCtx.fillRect).toHaveBeenCalledWith(75, 85, 50, 30);
    });
  });

  describe('drawCircle', () => {
    it('should draw circle at position', () => {
      renderer.drawCircle(200, 150, 25, '#ff00ff');

      expect(mockCtx.fillStyle).toBe('#ff00ff');
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.arc).toHaveBeenCalledWith(200, 150, 25, 0, Math.PI * 2);
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
});
