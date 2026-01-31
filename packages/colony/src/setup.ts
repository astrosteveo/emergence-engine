/*
 * This file is part of Colony.
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

import { Engine, Pathfinder } from 'emergence-engine';
import type { Entity, PathNode, ActionContext } from 'emergence-engine';
import { TILE_SIZE } from './definitions';

// Phase 6 constants
const TERRITORY_RADIUS = 8;
const SURPLUS_THRESHOLD = 10;
const DEFICIT_THRESHOLD = 5;
const MEMORY_DECAY_TICKS = 600;
const PROXIMITY_SIGNAL_RANGE = 12;
const PAWN_CARRY_CAPACITY = 5;
const PAWN_SPEED = 80;

let pathfinder: Pathfinder;

export function createActionContext(engine: Engine): ActionContext {
  return {
    ecs: {
      query: (c) => engine.ecs.query(c),
      getComponent: (e, n) => engine.ecs.getComponent(e, n),
      hasComponent: (e, n) => engine.ecs.hasComponent(e, n),
      addComponent: (e, n, d) => engine.ecs.addComponent(e, n, d),
      removeComponent: (e, n) => engine.ecs.removeComponent(e, n),
      isAlive: (e) => engine.ecs.isAlive(e),
    },
    findNearest: (e, c) => engine.findNearest(e, c),
  };
}

export function setupColonyEngine(engine: Engine): void {
  // Define terrain types
  engine.tileMap.defineTerrain('water', { color: '#1d3557', walkable: false });
  engine.tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
  engine.tileMap.defineTerrain('stone', { color: '#6c757d', walkable: true });

  // Create pathfinder
  pathfinder = new Pathfinder((x, y) => engine.tileMap.isWalkable(x, y));

  // Define components
  engine.ecs.defineComponent('Position', { x: 0, y: 0 });
  engine.ecs.defineComponent('Sprite', { width: 24, height: 24, color: '#e94560' });
  engine.ecs.defineComponent('Pawn', {});
  engine.ecs.defineComponent('PathTarget', { x: 0, y: 0 });
  engine.ecs.defineComponent('PathFollow', { path: [] as PathNode[], nodeIndex: 0 });
  engine.ecs.defineComponent('Hunger', { current: 0, max: 100, rate: 2 });
  engine.ecs.defineComponent('Food', { nutrition: 30 });
  engine.ecs.defineComponent('CurrentTask', { action: '', target: null as Entity | null });
  engine.ecs.defineComponent('AIState', { lastHungerPercent: 0, needsReeval: true });
  engine.ecs.defineComponent('Faction', { id: '' });
  engine.ecs.defineComponent('Inventory', { capacity: PAWN_CARRY_CAPACITY, food: 0 });
  engine.ecs.defineComponent('Stockpile', { factionId: '', food: 0 });
  engine.ecs.defineComponent('ColonyMemory', {
    known: [] as Array<{
      factionId: string;
      stockpileX: number;
      stockpileY: number;
      lastSeenFood: number;
      ticksSinceVisit: number;
    }>,
  });
  engine.ecs.defineComponent('CaravanTask', {
    targetFactionId: '',
    targetStockpile: null as Entity | null,
    phase: 'pickup' as 'pickup' | 'traveling-there' | 'dropoff' | 'returning',
    homeStockpile: null as Entity | null,
  });

  // Register AI actions
  registerActions(engine);

  // Register systems
  registerSystems(engine);
}

function findHomeStockpile(engine: Engine, pawnEntity: Entity): Entity | null {
  const faction = engine.ecs.getComponent<{ id: string }>(pawnEntity, 'Faction');
  if (!faction) return null;

  for (const s of engine.ecs.query(['Stockpile', 'Position'])) {
    const stockpile = engine.ecs.getComponent<{ factionId: string }>(s, 'Stockpile')!;
    if (stockpile.factionId === faction.id) {
      return s;
    }
  }
  return null;
}

function findStockpileByFaction(engine: Engine, factionId: string): Entity | null {
  for (const s of engine.ecs.query(['Stockpile', 'Position'])) {
    const stockpile = engine.ecs.getComponent<{ factionId: string }>(s, 'Stockpile')!;
    if (stockpile.factionId === factionId) {
      return s;
    }
  }
  return null;
}

function registerActions(engine: Engine): void {
  engine.ai.defineAction('eat', {
    canExecute(entity, context) {
      const nearestFood = context.findNearest(entity, 'Food');
      if (nearestFood) return true;

      const faction = context.ecs.getComponent<{ id: string }>(entity, 'Faction');
      if (!faction) return context.findNearest(entity, 'Food') !== null;

      for (const s of context.ecs.query(['Stockpile', 'Position'])) {
        const stockpile = context.ecs.getComponent<{ factionId: string; food: number }>(s, 'Stockpile')!;
        if (stockpile.factionId === faction.id && stockpile.food > 0) {
          return true;
        }
      }
      return false;
    },
    score(entity, context) {
      const hunger = context.ecs.getComponent<{ current: number; max: number }>(entity, 'Hunger');
      if (!hunger) return 0;
      const percent = hunger.current / hunger.max;
      if (percent < 0.4) return 0;
      return percent;
    },
    execute(entity, context) {
      const entityPos = context.ecs.getComponent<{ x: number; y: number }>(entity, 'Position');
      if (!entityPos) return;

      const entityTileX = Math.floor(entityPos.x / TILE_SIZE);
      const entityTileY = Math.floor(entityPos.y / TILE_SIZE);

      let targetX: number | null = null;
      let targetY: number | null = null;
      let targetType: 'food' | 'stockpile' = 'food';
      let targetEntity: Entity | null = null;
      let bestDistSq = Infinity;

      const nearestFood = context.findNearest(entity, 'Food');
      if (nearestFood) {
        const foodPos = context.ecs.getComponent<{ x: number; y: number }>(nearestFood, 'Position');
        if (foodPos) {
          const dx = foodPos.x - entityPos.x;
          const dy = foodPos.y - entityPos.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < bestDistSq) {
            bestDistSq = distSq;
            targetX = Math.floor(foodPos.x / TILE_SIZE);
            targetY = Math.floor(foodPos.y / TILE_SIZE);
            targetType = 'food';
            targetEntity = nearestFood;
          }
        }
      }

      const faction = context.ecs.getComponent<{ id: string }>(entity, 'Faction');
      if (faction) {
        for (const s of context.ecs.query(['Stockpile', 'Position'])) {
          const stockpile = context.ecs.getComponent<{ factionId: string; food: number }>(s, 'Stockpile')!;
          if (stockpile.factionId === faction.id && stockpile.food > 0) {
            const stockpilePos = context.ecs.getComponent<{ x: number; y: number }>(s, 'Position')!;
            const dx = stockpilePos.x - entityPos.x;
            const dy = stockpilePos.y - entityPos.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < bestDistSq) {
              bestDistSq = distSq;
              targetX = Math.floor(stockpilePos.x / TILE_SIZE);
              targetY = Math.floor(stockpilePos.y / TILE_SIZE);
              targetType = 'stockpile';
              targetEntity = s;
            }
          }
        }
      }

      if (targetX === null || targetY === null || targetEntity === null) return;

      const path = pathfinder.findPath(entityTileX, entityTileY, targetX, targetY);
      if (!path) return;

      if (context.ecs.hasComponent(entity, 'PathFollow')) {
        context.ecs.removeComponent(entity, 'PathFollow');
      }
      if (context.ecs.hasComponent(entity, 'PathTarget')) {
        context.ecs.removeComponent(entity, 'PathTarget');
      }

      context.ecs.addComponent(entity, 'PathTarget', { x: targetX, y: targetY });

      if (context.ecs.hasComponent(entity, 'CurrentTask')) {
        context.ecs.removeComponent(entity, 'CurrentTask');
      }
      context.ecs.addComponent(entity, 'CurrentTask', {
        action: targetType === 'food' ? 'eat' : 'eat-stockpile',
        target: targetEntity,
      });
    },
  });

  engine.ai.defineAction('wander', {
    canExecute() {
      return true;
    },
    score() {
      return 0.1;
    },
    execute(entity, context) {
      const pos = context.ecs.getComponent<{ x: number; y: number }>(entity, 'Position');
      if (!pos) return;

      const currentTileX = Math.floor(pos.x / TILE_SIZE);
      const currentTileY = Math.floor(pos.y / TILE_SIZE);

      const range = 5;
      let targetX = currentTileX;
      let targetY = currentTileY;
      let found = false;

      for (let attempts = 0; attempts < 10 && !found; attempts++) {
        const dx = Math.floor(Math.random() * (range * 2 + 1)) - range;
        const dy = Math.floor(Math.random() * (range * 2 + 1)) - range;
        const tx = currentTileX + dx;
        const ty = currentTileY + dy;

        if (engine.tileMap.isWalkable(tx, ty)) {
          targetX = tx;
          targetY = ty;
          found = true;
        }
      }

      if (!found) return;

      if (context.ecs.hasComponent(entity, 'PathFollow')) {
        context.ecs.removeComponent(entity, 'PathFollow');
      }
      if (context.ecs.hasComponent(entity, 'PathTarget')) {
        context.ecs.removeComponent(entity, 'PathTarget');
      }

      context.ecs.addComponent(entity, 'PathTarget', { x: targetX, y: targetY });

      if (context.ecs.hasComponent(entity, 'CurrentTask')) {
        context.ecs.removeComponent(entity, 'CurrentTask');
      }
      context.ecs.addComponent(entity, 'CurrentTask', { action: 'wander', target: null });
    },
  });

  engine.ai.defineAction('explore', {
    canExecute() {
      return true;
    },
    score() {
      return 0.15;
    },
    execute(entity, context) {
      const pos = context.ecs.getComponent<{ x: number; y: number }>(entity, 'Position');
      if (!pos) return;

      const currentTileX = Math.floor(pos.x / TILE_SIZE);
      const currentTileY = Math.floor(pos.y / TILE_SIZE);

      const faction = context.ecs.getComponent<{ id: string }>(entity, 'Faction');
      const direction = faction?.id === 'red' ? 1 : -1;

      const range = 10;
      let targetX = currentTileX;
      let targetY = currentTileY;
      let found = false;

      for (let attempts = 0; attempts < 15 && !found; attempts++) {
        const dx = Math.floor(Math.random() * range) * direction + Math.floor(Math.random() * 5) - 2;
        const dy = Math.floor(Math.random() * 11) - 5;
        const tx = currentTileX + dx;
        const ty = currentTileY + dy;

        if (engine.tileMap.isWalkable(tx, ty)) {
          const path = pathfinder.findPath(currentTileX, currentTileY, tx, ty);
          if (path) {
            targetX = tx;
            targetY = ty;
            found = true;
          }
        }
      }

      if (!found) return;

      if (context.ecs.hasComponent(entity, 'PathFollow')) {
        context.ecs.removeComponent(entity, 'PathFollow');
      }
      if (context.ecs.hasComponent(entity, 'PathTarget')) {
        context.ecs.removeComponent(entity, 'PathTarget');
      }

      context.ecs.addComponent(entity, 'PathTarget', { x: targetX, y: targetY });

      if (context.ecs.hasComponent(entity, 'CurrentTask')) {
        context.ecs.removeComponent(entity, 'CurrentTask');
      }
      context.ecs.addComponent(entity, 'CurrentTask', { action: 'explore', target: null });
    },
  });

  engine.ai.defineAction('caravan', {
    canExecute(entity, context) {
      if (context.ecs.hasComponent(entity, 'CaravanTask')) return false;

      const faction = context.ecs.getComponent<{ id: string }>(entity, 'Faction');
      if (!faction) return false;

      const homeStockpile = findHomeStockpile(engine, entity);
      if (!homeStockpile) return false;

      const stockpileComp = context.ecs.getComponent<{ food: number }>(homeStockpile, 'Stockpile');
      if (!stockpileComp || stockpileComp.food <= SURPLUS_THRESHOLD) return false;

      const memory = context.ecs.getComponent<{
        known: Array<{ factionId: string; lastSeenFood: number; ticksSinceVisit: number }>;
      }>(entity, 'ColonyMemory');
      if (!memory) return false;

      const needyColony = memory.known.find(
        (k) => k.lastSeenFood < DEFICIT_THRESHOLD && k.ticksSinceVisit < MEMORY_DECAY_TICKS
      );
      return needyColony !== undefined;
    },
    score(entity, context) {
      const faction = context.ecs.getComponent<{ id: string }>(entity, 'Faction');
      if (!faction) return 0;

      const homeStockpile = findHomeStockpile(engine, entity);
      if (!homeStockpile) return 0;

      const stockpileComp = context.ecs.getComponent<{ food: number }>(homeStockpile, 'Stockpile');
      if (!stockpileComp) return 0;

      const memory = context.ecs.getComponent<{
        known: Array<{ factionId: string; lastSeenFood: number; ticksSinceVisit: number }>;
      }>(entity, 'ColonyMemory');
      if (!memory) return 0;

      const hunger = context.ecs.getComponent<{ current: number; max: number }>(entity, 'Hunger');
      if (!hunger) return 0;

      const needyColony = memory.known.find(
        (k) => k.lastSeenFood < DEFICIT_THRESHOLD && k.ticksSinceVisit < MEMORY_DECAY_TICKS
      );
      if (!needyColony) return 0;

      const surplusFactor = (stockpileComp.food - SURPLUS_THRESHOLD) / stockpileComp.food;
      const deficitFactor = 1 - needyColony.lastSeenFood / DEFICIT_THRESHOLD;
      const hungerPercent = hunger.current / hunger.max;
      const hungerPenalty = 1 - hungerPercent * 0.8;

      return surplusFactor * deficitFactor * hungerPenalty * 0.7;
    },
    execute(entity, context) {
      const faction = context.ecs.getComponent<{ id: string }>(entity, 'Faction');
      if (!faction) return;

      const memory = context.ecs.getComponent<{
        known: Array<{ factionId: string; stockpileX: number; stockpileY: number; lastSeenFood: number }>;
      }>(entity, 'ColonyMemory');
      if (!memory) return;

      const needyColony = memory.known.find((k) => k.lastSeenFood < DEFICIT_THRESHOLD);
      if (!needyColony) return;

      const targetStockpile = findStockpileByFaction(engine, needyColony.factionId);
      if (!targetStockpile) return;

      const homeStockpile = findHomeStockpile(engine, entity);
      if (!homeStockpile) return;

      const homePos = context.ecs.getComponent<{ x: number; y: number }>(homeStockpile, 'Position');
      if (!homePos) return;

      const entityPos = context.ecs.getComponent<{ x: number; y: number }>(entity, 'Position');
      if (!entityPos) return;

      const homeTileX = Math.floor(homePos.x / TILE_SIZE);
      const homeTileY = Math.floor(homePos.y / TILE_SIZE);
      const entityTileX = Math.floor(entityPos.x / TILE_SIZE);
      const entityTileY = Math.floor(entityPos.y / TILE_SIZE);

      const path = pathfinder.findPath(entityTileX, entityTileY, homeTileX, homeTileY);
      if (!path) return;

      context.ecs.addComponent(entity, 'CaravanTask', {
        targetFactionId: needyColony.factionId,
        targetStockpile,
        phase: 'pickup',
        homeStockpile,
      });

      if (context.ecs.hasComponent(entity, 'PathFollow')) {
        context.ecs.removeComponent(entity, 'PathFollow');
      }
      if (context.ecs.hasComponent(entity, 'PathTarget')) {
        context.ecs.removeComponent(entity, 'PathTarget');
      }
      context.ecs.addComponent(entity, 'PathTarget', { x: homeTileX, y: homeTileY });

      if (context.ecs.hasComponent(entity, 'CurrentTask')) {
        context.ecs.removeComponent(entity, 'CurrentTask');
      }
      context.ecs.addComponent(entity, 'CurrentTask', { action: 'caravan', target: homeStockpile });
    },
  });
}

function registerSystems(engine: Engine): void {
  // Memory decay system
  engine.ecs.addSystem({
    name: 'MemoryDecay',
    query: ['ColonyMemory'],
    update(entities) {
      for (const e of entities) {
        const memory = engine.ecs.getComponent<{
          known: Array<{ ticksSinceVisit: number }>;
        }>(e, 'ColonyMemory')!;
        for (const entry of memory.known) {
          entry.ticksSinceVisit++;
        }
      }
    },
  });

  // Memory update system
  engine.ecs.addSystem({
    name: 'MemoryUpdate',
    query: ['Pawn', 'Position', 'Faction', 'ColonyMemory'],
    update(entities) {
      const stockpiles = engine.ecs.query(['Stockpile', 'Position']);

      for (const pawn of entities) {
        const pawnPos = engine.ecs.getComponent<{ x: number; y: number }>(pawn, 'Position')!;
        const pawnFaction = engine.ecs.getComponent<{ id: string }>(pawn, 'Faction')!;
        const memory = engine.ecs.getComponent<{
          known: Array<{
            factionId: string;
            stockpileX: number;
            stockpileY: number;
            lastSeenFood: number;
            ticksSinceVisit: number;
          }>;
        }>(pawn, 'ColonyMemory')!;

        const pawnTileX = Math.floor(pawnPos.x / TILE_SIZE);
        const pawnTileY = Math.floor(pawnPos.y / TILE_SIZE);

        for (const s of stockpiles) {
          const stockpileComp = engine.ecs.getComponent<{ factionId: string; food: number }>(s, 'Stockpile')!;
          const stockpilePos = engine.ecs.getComponent<{ x: number; y: number }>(s, 'Position')!;

          if (stockpileComp.factionId === pawnFaction.id) continue;

          const stockpileTileX = Math.floor(stockpilePos.x / TILE_SIZE);
          const stockpileTileY = Math.floor(stockpilePos.y / TILE_SIZE);

          const dx = pawnTileX - stockpileTileX;
          const dy = pawnTileY - stockpileTileY;
          const distSq = dx * dx + dy * dy;

          if (distSq <= 9) {
            const existing = memory.known.find((k) => k.factionId === stockpileComp.factionId);
            if (existing) {
              existing.lastSeenFood = stockpileComp.food;
              existing.ticksSinceVisit = 0;
              existing.stockpileX = stockpileTileX;
              existing.stockpileY = stockpileTileY;
            } else {
              memory.known.push({
                factionId: stockpileComp.factionId,
                stockpileX: stockpileTileX,
                stockpileY: stockpileTileY,
                lastSeenFood: stockpileComp.food,
                ticksSinceVisit: 0,
              });
            }
          }
        }
      }
    },
  });

  // Proximity signal system
  engine.ecs.addSystem({
    name: 'ProximitySignal',
    query: ['Pawn', 'Position', 'Faction', 'ColonyMemory'],
    update(entities) {
      const stockpiles = engine.ecs.query(['Stockpile', 'Position']);

      for (const pawn of entities) {
        const pawnPos = engine.ecs.getComponent<{ x: number; y: number }>(pawn, 'Position')!;
        const pawnFaction = engine.ecs.getComponent<{ id: string }>(pawn, 'Faction')!;
        const memory = engine.ecs.getComponent<{
          known: Array<{
            factionId: string;
            stockpileX: number;
            stockpileY: number;
            lastSeenFood: number;
            ticksSinceVisit: number;
          }>;
        }>(pawn, 'ColonyMemory')!;

        const pawnTileX = Math.floor(pawnPos.x / TILE_SIZE);
        const pawnTileY = Math.floor(pawnPos.y / TILE_SIZE);

        for (const s of stockpiles) {
          const stockpileComp = engine.ecs.getComponent<{ factionId: string; food: number }>(s, 'Stockpile')!;
          const stockpilePos = engine.ecs.getComponent<{ x: number; y: number }>(s, 'Position')!;

          if (stockpileComp.factionId === pawnFaction.id) continue;
          if (stockpileComp.food >= DEFICIT_THRESHOLD) continue;

          const stockpileTileX = Math.floor(stockpilePos.x / TILE_SIZE);
          const stockpileTileY = Math.floor(stockpilePos.y / TILE_SIZE);

          const dx = pawnTileX - stockpileTileX;
          const dy = pawnTileY - stockpileTileY;
          const distSq = dx * dx + dy * dy;

          if (distSq <= PROXIMITY_SIGNAL_RANGE * PROXIMITY_SIGNAL_RANGE) {
            const existing = memory.known.find((k) => k.factionId === stockpileComp.factionId);
            if (existing) {
              existing.lastSeenFood = stockpileComp.food;
              existing.stockpileX = stockpileTileX;
              existing.stockpileY = stockpileTileY;
            } else {
              memory.known.push({
                factionId: stockpileComp.factionId,
                stockpileX: stockpileTileX,
                stockpileY: stockpileTileY,
                lastSeenFood: stockpileComp.food,
                ticksSinceVisit: MEMORY_DECAY_TICKS,
              });
            }
          }
        }
      }
    },
  });

  // Caravan system
  engine.ecs.addSystem({
    name: 'Caravan',
    query: ['CaravanTask', 'Position', 'Inventory'],
    update(entities) {
      for (const e of entities) {
        if (engine.ecs.hasComponent(e, 'PathFollow') || engine.ecs.hasComponent(e, 'PathTarget')) {
          continue;
        }

        const caravan = engine.ecs.getComponent<{
          targetFactionId: string;
          targetStockpile: Entity | null;
          phase: 'pickup' | 'traveling-there' | 'dropoff' | 'returning';
          homeStockpile: Entity | null;
        }>(e, 'CaravanTask')!;

        const inventory = engine.ecs.getComponent<{ capacity: number; food: number }>(e, 'Inventory')!;

        if (caravan.phase === 'pickup') {
          if (caravan.homeStockpile && engine.ecs.isAlive(caravan.homeStockpile)) {
            const stockpile = engine.ecs.getComponent<{ food: number }>(caravan.homeStockpile, 'Stockpile');
            if (stockpile && stockpile.food > 0) {
              const toTake = Math.min(inventory.capacity - inventory.food, stockpile.food);
              stockpile.food -= toTake;
              inventory.food += toTake;
            }
          }

          if (caravan.targetStockpile && engine.ecs.isAlive(caravan.targetStockpile)) {
            const targetPos = engine.ecs.getComponent<{ x: number; y: number }>(caravan.targetStockpile, 'Position');
            if (targetPos) {
              const targetTileX = Math.floor(targetPos.x / TILE_SIZE);
              const targetTileY = Math.floor(targetPos.y / TILE_SIZE);
              engine.ecs.addComponent(e, 'PathTarget', { x: targetTileX, y: targetTileY });
              caravan.phase = 'traveling-there';
            }
          } else {
            engine.ecs.removeComponent(e, 'CaravanTask');
            if (engine.ecs.hasComponent(e, 'CurrentTask')) {
              engine.ecs.removeComponent(e, 'CurrentTask');
            }
          }
        } else if (caravan.phase === 'traveling-there') {
          caravan.phase = 'dropoff';
        } else if (caravan.phase === 'dropoff') {
          if (caravan.targetStockpile && engine.ecs.isAlive(caravan.targetStockpile)) {
            const stockpile = engine.ecs.getComponent<{ food: number }>(caravan.targetStockpile, 'Stockpile');
            if (stockpile) {
              stockpile.food += inventory.food;
              inventory.food = 0;
            }
          }

          if (caravan.homeStockpile && engine.ecs.isAlive(caravan.homeStockpile)) {
            const homePos = engine.ecs.getComponent<{ x: number; y: number }>(caravan.homeStockpile, 'Position');
            if (homePos) {
              const homeTileX = Math.floor(homePos.x / TILE_SIZE);
              const homeTileY = Math.floor(homePos.y / TILE_SIZE);
              engine.ecs.addComponent(e, 'PathTarget', { x: homeTileX, y: homeTileY });
              caravan.phase = 'returning';
            }
          } else {
            engine.ecs.removeComponent(e, 'CaravanTask');
            if (engine.ecs.hasComponent(e, 'CurrentTask')) {
              engine.ecs.removeComponent(e, 'CurrentTask');
            }
          }
        } else if (caravan.phase === 'returning') {
          engine.ecs.removeComponent(e, 'CaravanTask');
          if (engine.ecs.hasComponent(e, 'CurrentTask')) {
            engine.ecs.removeComponent(e, 'CurrentTask');
          }

          const aiState = engine.ecs.getComponent<{ needsReeval: boolean }>(e, 'AIState');
          if (aiState) {
            aiState.needsReeval = true;
          }
        }
      }
    },
  });

  // AI Decision system
  engine.ecs.addSystem({
    name: 'AIDecision',
    query: ['Pawn', 'Hunger', 'AIState'],
    update(entities) {
      const context = createActionContext(engine);

      for (const e of entities) {
        if (engine.ecs.hasComponent(e, 'CaravanTask')) {
          continue;
        }

        const aiState = engine.ecs.getComponent<{ lastHungerPercent: number; needsReeval: boolean }>(e, 'AIState')!;
        const hunger = engine.ecs.getComponent<{ current: number; max: number }>(e, 'Hunger')!;
        const currentPercent = hunger.current / hunger.max;

        if (aiState.lastHungerPercent < 0.5 && currentPercent >= 0.5) {
          aiState.needsReeval = true;
        }
        aiState.lastHungerPercent = currentPercent;

        const hasTask = engine.ecs.hasComponent(e, 'CurrentTask');
        const hasPath = engine.ecs.hasComponent(e, 'PathFollow') || engine.ecs.hasComponent(e, 'PathTarget');
        if (hasTask && !hasPath) {
          aiState.needsReeval = true;
        }

        if (!hasTask) {
          aiState.needsReeval = true;
        }

        if (hasTask) {
          const task = engine.ecs.getComponent<{ action: string; target: Entity | null }>(e, 'CurrentTask')!;
          if (task.target !== null && !engine.ecs.isAlive(task.target)) {
            aiState.needsReeval = true;
          }
        }

        if (aiState.needsReeval) {
          aiState.needsReeval = false;
          const actionName = engine.ai.pickBest(e, context);
          if (actionName) {
            engine.ai.execute(actionName, e, context);
          }
        }
      }
    },
  });

  // Pathfinding system
  engine.ecs.addSystem({
    name: 'Pathfinding',
    query: ['Position', 'PathTarget'],
    update(entities) {
      for (const e of entities) {
        if (engine.ecs.hasComponent(e, 'PathFollow')) continue;

        const pos = engine.ecs.getComponent<{ x: number; y: number }>(e, 'Position')!;
        const target = engine.ecs.getComponent<{ x: number; y: number }>(e, 'PathTarget')!;

        const currentTile = engine.camera.worldToTile(pos.x, pos.y, TILE_SIZE);
        const path = pathfinder.findPath(currentTile.x, currentTile.y, target.x, target.y);

        if (path && path.length > 1) {
          engine.ecs.addComponent(e, 'PathFollow', { path: path.slice(1), nodeIndex: 0 });
        } else {
          engine.ecs.removeComponent(e, 'PathTarget');
        }
      }
    },
  });

  // Path follow system
  engine.ecs.addSystem({
    name: 'PathFollow',
    query: ['Position', 'PathFollow'],
    update(entities, dt) {
      for (const e of entities) {
        const pos = engine.ecs.getComponent<{ x: number; y: number }>(e, 'Position')!;
        const pathFollow = engine.ecs.getComponent<{ path: PathNode[]; nodeIndex: number }>(e, 'PathFollow')!;

        if (pathFollow.nodeIndex >= pathFollow.path.length) {
          engine.ecs.removeComponent(e, 'PathFollow');
          if (engine.ecs.hasComponent(e, 'PathTarget')) {
            engine.ecs.removeComponent(e, 'PathTarget');
          }
          continue;
        }

        const targetNode = pathFollow.path[pathFollow.nodeIndex];
        const targetX = targetNode.x * TILE_SIZE + TILE_SIZE / 2;
        const targetY = targetNode.y * TILE_SIZE + TILE_SIZE / 2;

        const dx = targetX - pos.x;
        const dy = targetY - pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 2) {
          pos.x = targetX;
          pos.y = targetY;
          pathFollow.nodeIndex++;
        } else {
          const moveDistance = PAWN_SPEED * dt;
          const ratio = Math.min(moveDistance / distance, 1);
          pos.x += dx * ratio;
          pos.y += dy * ratio;
        }
      }
    },
  });

  // Task execution system
  engine.ecs.addSystem({
    name: 'TaskExecution',
    query: ['CurrentTask', 'Position'],
    update(entities) {
      for (const e of entities) {
        if (engine.ecs.hasComponent(e, 'PathFollow') || engine.ecs.hasComponent(e, 'PathTarget')) {
          continue;
        }

        const task = engine.ecs.getComponent<{ action: string; target: Entity | null }>(e, 'CurrentTask')!;

        if (task.action === 'eat' && task.target !== null) {
          if (engine.ecs.isAlive(task.target)) {
            const food = engine.ecs.getComponent<{ nutrition: number }>(task.target, 'Food');
            const hunger = engine.ecs.getComponent<{ current: number; max: number }>(e, 'Hunger');

            if (food && hunger) {
              hunger.current = Math.max(0, hunger.current - food.nutrition);
              engine.ecs.destroyEntity(task.target);
            }
          }
          engine.ecs.removeComponent(e, 'CurrentTask');
        } else if (task.action === 'eat-stockpile' && task.target !== null) {
          if (engine.ecs.isAlive(task.target)) {
            const stockpile = engine.ecs.getComponent<{ food: number }>(task.target, 'Stockpile');
            const hunger = engine.ecs.getComponent<{ current: number; max: number }>(e, 'Hunger');

            if (stockpile && hunger && stockpile.food > 0) {
              stockpile.food -= 1;
              hunger.current = Math.max(0, hunger.current - 30);
            }
          }
          engine.ecs.removeComponent(e, 'CurrentTask');
        } else if (task.action === 'wander') {
          engine.ecs.removeComponent(e, 'CurrentTask');
        }
      }
    },
  });

  // Hunger system
  engine.ecs.addSystem({
    name: 'Hunger',
    query: ['Hunger'],
    update(entities, dt) {
      for (const e of entities) {
        const hunger = engine.ecs.getComponent<{ current: number; max: number; rate: number }>(e, 'Hunger')!;
        hunger.current = Math.min(hunger.current + hunger.rate * dt, hunger.max);
      }
    },
  });
}

export { pathfinder, TERRITORY_RADIUS, TILE_SIZE as TILE_SIZE_CONSTANT };
