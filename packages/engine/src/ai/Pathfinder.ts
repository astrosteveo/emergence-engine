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

export interface PathNode {
  x: number;
  y: number;
}

export type WalkabilityFn = (x: number, y: number) => boolean;

export interface PathfinderOptions {
  maxIterations?: number;
}

interface AStarNode {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic to goal
  f: number; // g + h
  parent: AStarNode | null;
}

/** Min-heap for A* open set, ordered by f score */
class MinHeap {
  private heap: AStarNode[] = [];

  get length(): number {
    return this.heap.length;
  }

  push(node: AStarNode): void {
    this.heap.push(node);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): AStarNode | undefined {
    if (this.heap.length === 0) return undefined;
    const min = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return min;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].f <= this.heap[index].f) break;
      [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      if (leftChild < length && this.heap[leftChild].f < this.heap[smallest].f) {
        smallest = leftChild;
      }
      if (rightChild < length && this.heap[rightChild].f < this.heap[smallest].f) {
        smallest = rightChild;
      }
      if (smallest === index) break;

      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }
}

export class Pathfinder {
  private maxIterations: number;

  constructor(
    private isWalkable: WalkabilityFn,
    options: PathfinderOptions = {}
  ) {
    this.maxIterations = options.maxIterations ?? 1000;
  }

  findPath(fromX: number, fromY: number, toX: number, toY: number): PathNode[] | null {
    // Early exit for unwalkable endpoints
    if (!this.isWalkable(fromX, fromY) || !this.isWalkable(toX, toY)) {
      return null;
    }

    // Same position
    if (fromX === toX && fromY === toY) {
      return [{ x: fromX, y: fromY }];
    }

    const openSet = new MinHeap();
    const closedSet = new Set<string>();
    const gScores = new Map<string, number>();

    const startNode: AStarNode = {
      x: fromX,
      y: fromY,
      g: 0,
      h: this.heuristic(fromX, fromY, toX, toY),
      f: 0,
      parent: null,
    };
    startNode.f = startNode.g + startNode.h;
    openSet.push(startNode);
    gScores.set(`${fromX},${fromY}`, 0);

    let iterations = 0;

    while (openSet.length > 0 && iterations < this.maxIterations) {
      iterations++;

      const current = openSet.pop()!;
      const currentKey = `${current.x},${current.y}`;

      // Skip if already processed (stale entry from re-insertion)
      if (closedSet.has(currentKey)) {
        continue;
      }

      // Reached goal
      if (current.x === toX && current.y === toY) {
        return this.reconstructPath(current);
      }

      closedSet.add(currentKey);

      // Check 4-directional neighbors
      const neighbors = [
        { x: current.x - 1, y: current.y },
        { x: current.x + 1, y: current.y },
        { x: current.x, y: current.y - 1 },
        { x: current.x, y: current.y + 1 },
      ];

      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;

        if (closedSet.has(key) || !this.isWalkable(neighbor.x, neighbor.y)) {
          continue;
        }

        const g = current.g + 1;
        const existingG = gScores.get(key);

        // Only process if this is a better path
        if (existingG === undefined || g < existingG) {
          gScores.set(key, g);
          const h = this.heuristic(neighbor.x, neighbor.y, toX, toY);
          openSet.push({
            x: neighbor.x,
            y: neighbor.y,
            g,
            h,
            f: g + h,
            parent: current,
          });
        }
      }
    }

    // No path found
    return null;
  }

  private heuristic(x1: number, y1: number, x2: number, y2: number): number {
    // Manhattan distance for 4-directional movement
    return Math.abs(x2 - x1) + Math.abs(y2 - y1);
  }

  private reconstructPath(node: AStarNode): PathNode[] {
    const path: PathNode[] = [];
    let current: AStarNode | null = node;

    while (current !== null) {
      path.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }

    return path;
  }
}
