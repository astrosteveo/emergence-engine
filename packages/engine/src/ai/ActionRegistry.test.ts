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
import { ActionRegistry, ActionContext } from './ActionRegistry';
import { World } from '../ecs/World';

describe('ActionRegistry', () => {
  it('allows defining an action', () => {
    const registry = new ActionRegistry();

    registry.defineAction('test', {
      canExecute: () => true,
      score: () => 0.5,
      execute: () => {},
    });

    expect(registry.hasAction('test')).toBe(true);
  });

  it('throws when defining duplicate action', () => {
    const registry = new ActionRegistry();

    registry.defineAction('test', {
      canExecute: () => true,
      score: () => 0.5,
      execute: () => {},
    });

    expect(() => {
      registry.defineAction('test', {
        canExecute: () => true,
        score: () => 0.5,
        execute: () => {},
      });
    }).toThrow('Action "test" already defined');
  });

  describe('evaluateAll', () => {
    it('returns scores for all executable actions', () => {
      const registry = new ActionRegistry();
      const ecs = new World();
      ecs.defineComponent('Hunger', { current: 50, max: 100 });

      const entity = ecs.createEntity();
      ecs.addComponent(entity, 'Hunger', { current: 50, max: 100 });

      registry.defineAction('eat', {
        canExecute: () => true,
        score: (e, ctx) => {
          const hunger = ctx.ecs.getComponent<{ current: number; max: number }>(e, 'Hunger')!;
          return hunger.current / hunger.max;
        },
        execute: () => {},
      });

      registry.defineAction('sleep', {
        canExecute: () => false, // Cannot execute
        score: () => 0.8,
        execute: () => {},
      });

      registry.defineAction('wander', {
        canExecute: () => true,
        score: () => 0.1,
        execute: () => {},
      });

      const context: ActionContext = {
        ecs: {
          query: (c) => ecs.query(c),
          getComponent: (e, n) => ecs.getComponent(e, n),
          hasComponent: (e, n) => ecs.hasComponent(e, n),
          addComponent: (e, n, d) => ecs.addComponent(e, n, d),
          removeComponent: (e, n) => ecs.removeComponent(e, n),
          isAlive: (e) => ecs.isAlive(e),
        },
        findNearest: () => null,
      };

      const scores = registry.evaluateAll(entity, context);

      expect(scores).toEqual([
        { action: 'eat', score: 0.5, canExecute: true },
        { action: 'wander', score: 0.1, canExecute: true },
        { action: 'sleep', score: 0, canExecute: false },
      ]);
    });
  });
});
