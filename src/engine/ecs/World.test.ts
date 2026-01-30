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
import { World } from './World';

describe('World', () => {
  describe('entity lifecycle', () => {
    it('should create entities with unique IDs', () => {
      const world = new World();
      const e1 = world.createEntity();
      const e2 = world.createEntity();

      expect(e1).not.toBe(e2);
    });

    it('should report created entities as alive', () => {
      const world = new World();
      const entity = world.createEntity();

      expect(world.isAlive(entity)).toBe(true);
    });

    it('should destroy entities', () => {
      const world = new World();
      const entity = world.createEntity();

      world.destroyEntity(entity);

      expect(world.isAlive(entity)).toBe(false);
    });

    it('should invalidate old entity references after reuse', () => {
      const world = new World();
      const e1 = world.createEntity();
      world.destroyEntity(e1);
      const e2 = world.createEntity();

      // e1 and e2 use same index but different generations
      expect(world.isAlive(e1)).toBe(false);
      expect(world.isAlive(e2)).toBe(true);
      expect(e1).not.toBe(e2);
    });
  });
});
