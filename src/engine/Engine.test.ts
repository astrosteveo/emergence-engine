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
import { Engine } from './Engine';

describe('Engine', () => {
  let canvas: HTMLCanvasElement;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
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
  });

  it('should create with default tick rate', () => {
    const engine = new Engine({ canvas });

    expect(engine.loop).toBeDefined();
    expect(engine.input).toBeDefined();
    expect(engine.renderer).toBeDefined();
  });

  it('should create with custom tick rate', () => {
    const engine = new Engine({ canvas, tickRate: 60 });

    expect(engine.loop).toBeDefined();
  });

  it('should expose renderer dimensions', () => {
    const engine = new Engine({ canvas });

    expect(engine.renderer.width).toBe(800);
    expect(engine.renderer.height).toBe(600);
  });

  it('should register tick callbacks', () => {
    const engine = new Engine({ canvas });
    const callback = vi.fn();

    engine.onTick(callback);
    // Callback should be registered but not called yet
    expect(callback).not.toHaveBeenCalled();
  });

  it('should register draw callbacks', () => {
    const engine = new Engine({ canvas });
    const callback = vi.fn();

    engine.onDraw(callback);
    expect(callback).not.toHaveBeenCalled();
  });

  it('should delegate start to loop', () => {
    const engine = new Engine({ canvas });

    vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(1));

    engine.start();
    expect(requestAnimationFrame).toHaveBeenCalled();
  });

  it('should delegate stop to loop', () => {
    const engine = new Engine({ canvas });

    vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(1));

    engine.start();
    engine.stop();
    // No error means success
  });

  it('should delegate setSpeed to loop', () => {
    const engine = new Engine({ canvas });

    // Should not throw
    engine.setSpeed(2);
    engine.setSpeed(0);
  });

  it('should auto-update input after tick callbacks', () => {
    const engine = new Engine({ canvas });

    // Press a key
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
    expect(engine.input.isKeyPressed('KeyA')).toBe(true);

    // Simulate a tick by manually triggering the loop
    let rafCallback: ((time: number) => void) | null = null;
    vi.stubGlobal('requestAnimationFrame', (cb: (time: number) => void) => {
      rafCallback = cb;
      return 1;
    });
    vi.stubGlobal('performance', { now: () => 0 });

    engine.start();

    // Advance time enough for one tick (50ms for 20 ticks/sec)
    vi.stubGlobal('performance', { now: () => 50 });
    if (rafCallback) {
      rafCallback(50);
    }

    // After the tick, isKeyPressed should be cleared by auto-update
    expect(engine.input.isKeyPressed('KeyA')).toBe(false);
    // But isKeyDown should still be true
    expect(engine.input.isKeyDown('KeyA')).toBe(true);
  });
});
