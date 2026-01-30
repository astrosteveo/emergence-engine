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

/** Entity is a packed 32-bit integer: lower 20 bits = index, upper 12 bits = generation */
export type Entity = number;

function entityIndex(e: Entity): number {
  return e & 0xfffff;
}

function entityGeneration(e: Entity): number {
  return e >>> 20;
}

function makeEntity(index: number, gen: number): Entity {
  return (gen << 20) | index;
}

interface ComponentDefinition<T = unknown> {
  name: string;
  defaults: T;
  storage: (T | undefined)[];
}

export interface System {
  name: string;
  query: string[];
  update(entities: Entity[], dt: number): void;
}

export class World {
  private generations: number[] = [];
  private alive: boolean[] = [];
  private freeList: number[] = [];
  private components = new Map<string, ComponentDefinition>();
  private systems: System[] = [];

  createEntity(): Entity {
    const index = this.freeList.pop() ?? this.generations.length;
    if (index === this.generations.length) {
      this.generations.push(0);
      this.alive.push(false);
    }
    this.alive[index] = true;
    return makeEntity(index, this.generations[index]);
  }

  isAlive(entity: Entity): boolean {
    const index = entityIndex(entity);
    if (index >= this.alive.length) return false;
    return this.alive[index] && this.generations[index] === entityGeneration(entity);
  }

  destroyEntity(entity: Entity): void {
    const index = entityIndex(entity);
    if (!this.isAlive(entity)) return;
    // Remove all components
    for (const def of this.components.values()) {
      def.storage[index] = undefined;
    }
    this.alive[index] = false;
    this.generations[index]++;
    this.freeList.push(index);
  }

  defineComponent<T extends object>(name: string, defaults: T): void {
    if (this.components.has(name)) {
      throw new Error(`Component "${name}" already defined`);
    }
    this.components.set(name, { name, defaults, storage: [] });
  }

  addComponent<T extends object>(entity: Entity, name: string, data?: Partial<T>): T {
    if (!this.isAlive(entity)) {
      throw new Error('Cannot add component to dead entity');
    }
    const def = this.components.get(name);
    if (!def) {
      throw new Error(`Component "${name}" not defined`);
    }
    const index = entityIndex(entity);
    const component = { ...(def.defaults as object), ...data } as T;
    def.storage[index] = component;
    return component;
  }

  getComponent<T>(entity: Entity, name: string): T | undefined {
    if (!this.isAlive(entity)) return undefined;
    const def = this.components.get(name);
    return def?.storage[entityIndex(entity)] as T | undefined;
  }

  hasComponent(entity: Entity, name: string): boolean {
    if (!this.isAlive(entity)) return false;
    const def = this.components.get(name);
    return def?.storage[entityIndex(entity)] !== undefined;
  }

  removeComponent(entity: Entity, name: string): void {
    if (!this.isAlive(entity)) return;
    const def = this.components.get(name);
    if (def) {
      def.storage[entityIndex(entity)] = undefined;
    }
  }

  query(componentNames: string[]): Entity[] {
    const result: Entity[] = [];
    for (let index = 0; index < this.alive.length; index++) {
      if (!this.alive[index]) continue;
      const entity = makeEntity(index, this.generations[index]);
      let hasAll = true;
      for (const name of componentNames) {
        if (!this.hasComponent(entity, name)) {
          hasAll = false;
          break;
        }
      }
      if (hasAll) result.push(entity);
    }
    return result;
  }

  addSystem(system: System): void {
    this.systems.push(system);
  }

  removeSystem(name: string): void {
    const index = this.systems.findIndex((s) => s.name === name);
    if (index !== -1) {
      this.systems.splice(index, 1);
    }
  }

  update(dt: number): void {
    for (const system of this.systems) {
      const entities = this.query(system.query);
      system.update(entities, dt);
    }
  }
}
