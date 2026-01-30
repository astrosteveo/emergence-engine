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

import type { Entity } from '../ecs/World';

export interface ActionContext {
  ecs: {
    query(components: string[]): Entity[];
    getComponent<T>(entity: Entity, name: string): T | undefined;
    hasComponent(entity: Entity, name: string): boolean;
    addComponent<T extends object>(entity: Entity, name: string, data?: Partial<T>): T;
    removeComponent(entity: Entity, name: string): void;
    isAlive(entity: Entity): boolean;
  };
  findNearest(entity: Entity, componentName: string): Entity | null;
}

export interface ActionDefinition {
  canExecute(entity: Entity, context: ActionContext): boolean;
  score(entity: Entity, context: ActionContext): number;
  execute(entity: Entity, context: ActionContext): void;
}

export class ActionRegistry {
  private actions = new Map<string, ActionDefinition>();

  defineAction(name: string, definition: ActionDefinition): void {
    if (this.actions.has(name)) {
      throw new Error(`Action "${name}" already defined`);
    }
    this.actions.set(name, definition);
  }

  hasAction(name: string): boolean {
    return this.actions.has(name);
  }
}
