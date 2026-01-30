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

export class World {
  private generations: number[] = [];
  private alive: boolean[] = [];
  private freeList: number[] = [];

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
    this.alive[index] = false;
    this.generations[index]++;
    this.freeList.push(index);
  }
}
