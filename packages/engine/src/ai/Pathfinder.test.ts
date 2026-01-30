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
import { Pathfinder } from './Pathfinder';

describe('Pathfinder', () => {
  it('should find a straight path on open grid', () => {
    const pathfinder = new Pathfinder(() => true);
    const path = pathfinder.findPath(0, 0, 3, 0);

    expect(path).not.toBeNull();
    expect(path!.length).toBe(4); // start + 3 steps
    expect(path![0]).toEqual({ x: 0, y: 0 });
    expect(path![path!.length - 1]).toEqual({ x: 3, y: 0 });
  });

  it('should find path around obstacle', () => {
    // Grid with wall at (1, 0)
    const pathfinder = new Pathfinder((x, y) => !(x === 1 && y === 0));
    const path = pathfinder.findPath(0, 0, 2, 0);

    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(3); // Must go around
    expect(path![0]).toEqual({ x: 0, y: 0 });
    expect(path![path!.length - 1]).toEqual({ x: 2, y: 0 });
    // Should not contain the blocked tile
    expect(path!.some(n => n.x === 1 && n.y === 0)).toBe(false);
  });

  it('should return null for unreachable destination', () => {
    // Completely walled off destination
    const pathfinder = new Pathfinder((x, y) => {
      // Wall around (5, 5)
      if (x === 4 && y >= 4 && y <= 6) return false;
      if (x === 6 && y >= 4 && y <= 6) return false;
      if (y === 4 && x >= 4 && x <= 6) return false;
      if (y === 6 && x >= 4 && x <= 6) return false;
      return true;
    });
    const path = pathfinder.findPath(0, 0, 5, 5);

    expect(path).toBeNull();
  });

  it('should return null for unwalkable start', () => {
    const pathfinder = new Pathfinder((x, y) => !(x === 0 && y === 0));
    const path = pathfinder.findPath(0, 0, 5, 5);

    expect(path).toBeNull();
  });

  it('should return null for unwalkable destination', () => {
    const pathfinder = new Pathfinder((x, y) => !(x === 5 && y === 5));
    const path = pathfinder.findPath(0, 0, 5, 5);

    expect(path).toBeNull();
  });

  it('should return single-node path when start equals destination', () => {
    const pathfinder = new Pathfinder(() => true);
    const path = pathfinder.findPath(3, 3, 3, 3);

    expect(path).not.toBeNull();
    expect(path!.length).toBe(1);
    expect(path![0]).toEqual({ x: 3, y: 3 });
  });

  it('should respect max iterations limit', () => {
    // Very restrictive walkability - forces long search
    const pathfinder = new Pathfinder(() => true, { maxIterations: 5 });
    const path = pathfinder.findPath(0, 0, 100, 100);

    // Should give up before finding path
    expect(path).toBeNull();
  });
});
