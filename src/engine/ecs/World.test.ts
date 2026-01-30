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

    it('should remove all components when entity is destroyed', () => {
      const world = new World();
      world.defineComponent('Position', { x: 0, y: 0 });
      world.defineComponent('Velocity', { x: 0, y: 0 });
      const entity = world.createEntity();
      world.addComponent(entity, 'Position');
      world.addComponent(entity, 'Velocity');

      world.destroyEntity(entity);

      // Create new entity to reuse the slot
      const e2 = world.createEntity();
      expect(world.hasComponent(e2, 'Position')).toBe(false);
      expect(world.hasComponent(e2, 'Velocity')).toBe(false);
    });
  });

  describe('components', () => {
    it('should define components', () => {
      const world = new World();

      // Should not throw
      world.defineComponent('Position', { x: 0, y: 0 });
    });

    it('should throw when defining duplicate component', () => {
      const world = new World();
      world.defineComponent('Position', { x: 0, y: 0 });

      expect(() => world.defineComponent('Position', { x: 0, y: 0 })).toThrow(
        'Component "Position" already defined'
      );
    });

    it('should add components to entities', () => {
      const world = new World();
      world.defineComponent('Position', { x: 0, y: 0 });
      const entity = world.createEntity();

      const pos = world.addComponent(entity, 'Position', { x: 10, y: 20 });

      expect(pos).toEqual({ x: 10, y: 20 });
    });

    it('should merge partial data with defaults', () => {
      const world = new World();
      world.defineComponent('Position', { x: 0, y: 0 });
      const entity = world.createEntity();

      const pos = world.addComponent(entity, 'Position', { x: 10 });

      expect(pos).toEqual({ x: 10, y: 0 });
    });

    it('should use defaults when no data provided', () => {
      const world = new World();
      world.defineComponent('Position', { x: 5, y: 5 });
      const entity = world.createEntity();

      const pos = world.addComponent(entity, 'Position');

      expect(pos).toEqual({ x: 5, y: 5 });
    });

    it('should throw when adding component to dead entity', () => {
      const world = new World();
      world.defineComponent('Position', { x: 0, y: 0 });
      const entity = world.createEntity();
      world.destroyEntity(entity);

      expect(() => world.addComponent(entity, 'Position')).toThrow(
        'Cannot add component to dead entity'
      );
    });

    it('should throw when adding undefined component', () => {
      const world = new World();
      const entity = world.createEntity();

      expect(() => world.addComponent(entity, 'Position')).toThrow(
        'Component "Position" not defined'
      );
    });

    it('should get components from entities', () => {
      const world = new World();
      world.defineComponent('Position', { x: 0, y: 0 });
      const entity = world.createEntity();
      world.addComponent(entity, 'Position', { x: 10, y: 20 });

      const pos = world.getComponent(entity, 'Position');

      expect(pos).toEqual({ x: 10, y: 20 });
    });

    it('should return undefined for missing component', () => {
      const world = new World();
      world.defineComponent('Position', { x: 0, y: 0 });
      const entity = world.createEntity();

      const pos = world.getComponent(entity, 'Position');

      expect(pos).toBeUndefined();
    });

    it('should return undefined for dead entity', () => {
      const world = new World();
      world.defineComponent('Position', { x: 0, y: 0 });
      const entity = world.createEntity();
      world.addComponent(entity, 'Position', { x: 10, y: 20 });
      world.destroyEntity(entity);

      const pos = world.getComponent(entity, 'Position');

      expect(pos).toBeUndefined();
    });

    it('should check if entity has component', () => {
      const world = new World();
      world.defineComponent('Position', { x: 0, y: 0 });
      const entity = world.createEntity();

      expect(world.hasComponent(entity, 'Position')).toBe(false);

      world.addComponent(entity, 'Position');

      expect(world.hasComponent(entity, 'Position')).toBe(true);
    });

    it('should remove components from entities', () => {
      const world = new World();
      world.defineComponent('Position', { x: 0, y: 0 });
      const entity = world.createEntity();
      world.addComponent(entity, 'Position', { x: 10, y: 20 });

      world.removeComponent(entity, 'Position');

      expect(world.hasComponent(entity, 'Position')).toBe(false);
    });
  });
});
