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

    const openSet: AStarNode[] = [];
    const closedSet = new Set<string>();

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

    let iterations = 0;

    while (openSet.length > 0 && iterations < this.maxIterations) {
      iterations++;

      // Find node with lowest f score
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;

      // Reached goal
      if (current.x === toX && current.y === toY) {
        return this.reconstructPath(current);
      }

      closedSet.add(`${current.x},${current.y}`);

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
        const existingIndex = openSet.findIndex(n => n.x === neighbor.x && n.y === neighbor.y);

        if (existingIndex === -1) {
          // New node
          const h = this.heuristic(neighbor.x, neighbor.y, toX, toY);
          openSet.push({
            x: neighbor.x,
            y: neighbor.y,
            g,
            h,
            f: g + h,
            parent: current,
          });
        } else if (g < openSet[existingIndex].g) {
          // Better path to existing node
          openSet[existingIndex].g = g;
          openSet[existingIndex].f = g + openSet[existingIndex].h;
          openSet[existingIndex].parent = current;
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
