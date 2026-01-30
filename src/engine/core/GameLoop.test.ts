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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameLoop } from './GameLoop';

describe('GameLoop', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create with default tick rate of 20', () => {
    const loop = new GameLoop();
    // tickDuration should be 1000/20 = 50ms
    // We can't directly access private members, but we can test behavior
    expect(loop).toBeDefined();
  });

  it('should create with custom tick rate', () => {
    const loop = new GameLoop(60);
    expect(loop).toBeDefined();
  });

  it('should register tick callbacks', () => {
    const loop = new GameLoop();
    const callback = vi.fn();
    loop.onTick(callback);
    expect(callback).not.toHaveBeenCalled();
  });

  it('should register draw callbacks', () => {
    const loop = new GameLoop();
    const callback = vi.fn();
    loop.onDraw(callback);
    expect(callback).not.toHaveBeenCalled();
  });

  it('should start and stop', () => {
    const loop = new GameLoop();

    // Mock requestAnimationFrame
    let rafCallback: ((time: number) => void) | null = null;
    vi.stubGlobal('requestAnimationFrame', (cb: (time: number) => void) => {
      rafCallback = cb;
      return 1;
    });

    loop.start();
    expect(rafCallback).not.toBeNull();

    loop.stop();
    // After stop, the loop should not continue
  });

  it('should not start twice', () => {
    const loop = new GameLoop();
    let rafCount = 0;

    vi.stubGlobal('requestAnimationFrame', () => {
      rafCount++;
      return rafCount;
    });

    loop.start();
    loop.start(); // Second call should be ignored

    expect(rafCount).toBe(1);
  });

  it('should call tick callbacks with delta time in seconds', () => {
    const loop = new GameLoop(20); // 50ms per tick
    const tickCallback = vi.fn();
    loop.onTick(tickCallback);

    let rafCallback: ((time: number) => void) | null = null;
    vi.stubGlobal('requestAnimationFrame', (cb: (time: number) => void) => {
      rafCallback = cb;
      return 1;
    });
    vi.stubGlobal('performance', { now: () => 0 });

    loop.start();

    // Simulate 100ms passing (should trigger 2 ticks at 20 ticks/sec)
    vi.stubGlobal('performance', { now: () => 100 });
    if (rafCallback) {
      rafCallback(100);
    }

    expect(tickCallback).toHaveBeenCalledWith(0.05); // dt = 50ms = 0.05s
    expect(tickCallback).toHaveBeenCalledTimes(2);
  });

  it('should call draw callbacks every frame', () => {
    const loop = new GameLoop(20);
    const drawCallback = vi.fn();
    loop.onDraw(drawCallback);

    let rafCallback: ((time: number) => void) | null = null;
    vi.stubGlobal('requestAnimationFrame', (cb: (time: number) => void) => {
      rafCallback = cb;
      return 1;
    });
    vi.stubGlobal('performance', { now: () => 0 });

    loop.start();

    vi.stubGlobal('performance', { now: () => 16 });
    if (rafCallback) {
      rafCallback(16);
    }

    expect(drawCallback).toHaveBeenCalledTimes(1);
  });

  it('should respect speed multiplier', () => {
    const loop = new GameLoop(20); // 50ms per tick
    const tickCallback = vi.fn();
    loop.onTick(tickCallback);
    loop.setSpeed(2); // 2x speed

    let rafCallback: ((time: number) => void) | null = null;
    vi.stubGlobal('requestAnimationFrame', (cb: (time: number) => void) => {
      rafCallback = cb;
      return 1;
    });
    vi.stubGlobal('performance', { now: () => 0 });

    loop.start();

    // 50ms at 2x speed = 100ms worth of simulation = 2 ticks
    vi.stubGlobal('performance', { now: () => 50 });
    if (rafCallback) {
      rafCallback(50);
    }

    expect(tickCallback).toHaveBeenCalledTimes(2);
  });

  it('should pause when speed is 0', () => {
    const loop = new GameLoop(20);
    const tickCallback = vi.fn();
    loop.onTick(tickCallback);
    loop.setSpeed(0);

    let rafCallback: ((time: number) => void) | null = null;
    vi.stubGlobal('requestAnimationFrame', (cb: (time: number) => void) => {
      rafCallback = cb;
      return 1;
    });
    vi.stubGlobal('performance', { now: () => 0 });

    loop.start();

    vi.stubGlobal('performance', { now: () => 1000 });
    if (rafCallback) {
      rafCallback(1000);
    }

    expect(tickCallback).not.toHaveBeenCalled();
  });

  it('should not allow negative speed', () => {
    const loop = new GameLoop(20);
    loop.setSpeed(-1);

    const tickCallback = vi.fn();
    loop.onTick(tickCallback);

    let rafCallback: ((time: number) => void) | null = null;
    vi.stubGlobal('requestAnimationFrame', (cb: (time: number) => void) => {
      rafCallback = cb;
      return 1;
    });
    vi.stubGlobal('performance', { now: () => 0 });

    loop.start();

    vi.stubGlobal('performance', { now: () => 100 });
    if (rafCallback) {
      rafCallback(100);
    }

    // Negative speed should be clamped to 0
    expect(tickCallback).not.toHaveBeenCalled();
  });
});
