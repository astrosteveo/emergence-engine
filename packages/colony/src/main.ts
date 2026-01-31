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

import { Engine, generateTerrain, Pathfinder } from 'emergence-engine';
import type { Entity, PathNode, ActionContext } from 'emergence-engine';

let debugMode = true; // On by default in dev

const canvas = document.getElementById('game') as HTMLCanvasElement;
const engine = new Engine({ canvas, tickRate: 20 });
const TILE_SIZE = 16;
const PAWN_SPEED = 80; // pixels per second

// Phase 6 constants
const TERRITORY_RADIUS = 8;
const SURPLUS_THRESHOLD = 10;
const DEFICIT_THRESHOLD = 5;
const MEMORY_DECAY_TICKS = 600;
const PROXIMITY_SIGNAL_RANGE = 12;
const PAWN_CARRY_CAPACITY = 5;

// Define terrain types
engine.tileMap.defineTerrain('water', { color: '#1d3557', walkable: false });
engine.tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
engine.tileMap.defineTerrain('stone', { color: '#6c757d', walkable: true });

// Generate 64x64 world
generateTerrain(engine.tileMap, { width: 64, height: 64, seed: Date.now() });

// Create pathfinder using TileMap walkability
const pathfinder = new Pathfinder((x, y) => engine.tileMap.isWalkable(x, y));

// Define components
engine.ecs.defineComponent('Position', { x: 0, y: 0 });
engine.ecs.defineComponent('Sprite', { width: 24, height: 24, color: '#e94560' });
engine.ecs.defineComponent('Pawn', {}); // Marker for the controllable pawn
engine.ecs.defineComponent('PathTarget', { x: 0, y: 0 }); // Target tile
engine.ecs.defineComponent('PathFollow', { path: [] as PathNode[], nodeIndex: 0 });
engine.ecs.defineComponent('Hunger', { current: 0, max: 100, rate: 2 }); // rate = per second
engine.ecs.defineComponent('Food', { nutrition: 30 });
engine.ecs.defineComponent('CurrentTask', { action: '', target: null as Entity | null });
engine.ecs.defineComponent('AIState', { lastHungerPercent: 0, needsReeval: true });

// Phase 6 components
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

function spawnFood(count: number): void {
  const halfW = Math.floor(engine.tileMap.width / 2);
  const halfH = Math.floor(engine.tileMap.height / 2);
  let spawned = 0;
  let attempts = 0;
  const maxAttempts = count * 10;

  while (spawned < count && attempts < maxAttempts) {
    attempts++;
    const tileX = Math.floor(Math.random() * engine.tileMap.width) - halfW;
    const tileY = Math.floor(Math.random() * engine.tileMap.height) - halfH;

    if (engine.tileMap.isWalkable(tileX, tileY)) {
      const food = engine.ecs.createEntity();
      engine.ecs.addComponent(food, 'Position', {
        x: tileX * TILE_SIZE + TILE_SIZE / 2,
        y: tileY * TILE_SIZE + TILE_SIZE / 2,
      });
      engine.ecs.addComponent(food, 'Food', { nutrition: 30 });
      engine.ecs.addComponent(food, 'Sprite', { width: 12, height: 12, color: '#4ade80' });
      spawned++;
    }
  }
}

function spawnStockpile(tileX: number, tileY: number, factionId: string, initialFood: number): Entity {
  const stockpile = engine.ecs.createEntity();
  engine.ecs.addComponent(stockpile, 'Position', {
    x: tileX * TILE_SIZE + TILE_SIZE / 2,
    y: tileY * TILE_SIZE + TILE_SIZE / 2,
  });
  engine.ecs.addComponent(stockpile, 'Stockpile', { factionId, food: initialFood });
  engine.ecs.addComponent(stockpile, 'Sprite', { width: 32, height: 32, color: factionId === 'red' ? '#dc2626' : '#2563eb' });

  // Claim territory around stockpile
  engine.tileMap.claimRadius(tileX, tileY, TERRITORY_RADIUS, factionId);

  return stockpile;
}

function spawnFactionPawn(tileX: number, tileY: number, factionId: string): Entity {
  const pawn = engine.ecs.createEntity();
  engine.ecs.addComponent(pawn, 'Position', {
    x: tileX * TILE_SIZE + TILE_SIZE / 2,
    y: tileY * TILE_SIZE + TILE_SIZE / 2,
  });
  engine.ecs.addComponent(pawn, 'Sprite', {
    width: 24,
    height: 24,
    color: factionId === 'red' ? '#f87171' : '#60a5fa',
  });
  engine.ecs.addComponent(pawn, 'Pawn');
  engine.ecs.addComponent(pawn, 'Faction', { id: factionId });
  engine.ecs.addComponent(pawn, 'Inventory', { capacity: PAWN_CARRY_CAPACITY, food: 0 });
  engine.ecs.addComponent(pawn, 'Hunger', { current: 20, max: 100, rate: 2 });
  engine.ecs.addComponent(pawn, 'AIState', { lastHungerPercent: 0.2, needsReeval: true });
  engine.ecs.addComponent(pawn, 'ColonyMemory', { known: [] });

  return pawn;
}

// Phase 6: Two-colony setup
// Colony A (Rich) - Red faction on the left
const redStockpile = spawnStockpile(-20, 0, 'red', 30);
const redPawn1 = spawnFactionPawn(-19, 1, 'red');
const redPawn2 = spawnFactionPawn(-21, 1, 'red');
const redPawn3 = spawnFactionPawn(-20, -1, 'red');

// Colony B (Poor) - Blue faction on the right
const blueStockpile = spawnStockpile(20, 0, 'blue', 5);
const bluePawn1 = spawnFactionPawn(21, 0, 'blue');

// Track first pawn for camera/UI (use red pawn 1)
const pawn = redPawn1;

// Used by AIDecisionSystem (Task 12)
export function createActionContext(): ActionContext {
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

engine.ai.defineAction('eat', {
  canExecute(entity, context) {
    // Check for loose food
    const nearestFood = context.findNearest(entity, 'Food');
    if (nearestFood) return true;

    // Check for own faction's stockpile with food
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
    return hunger.current / hunger.max;
  },
  execute(entity, context) {
    const entityPos = context.ecs.getComponent<{ x: number; y: number }>(entity, 'Position');
    if (!entityPos) return;

    const entityTileX = Math.floor(entityPos.x / TILE_SIZE);
    const entityTileY = Math.floor(entityPos.y / TILE_SIZE);

    // Find nearest food source (loose food or own stockpile)
    let targetX: number | null = null;
    let targetY: number | null = null;
    let targetType: 'food' | 'stockpile' = 'food';
    let targetEntity: Entity | null = null;
    let bestDistSq = Infinity;

    // Check loose food
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

    // Check own stockpile
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

    // Check if path exists
    const path = pathfinder.findPath(entityTileX, entityTileY, targetX, targetY);
    if (!path) return;

    // Clear existing path components
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
    return 0.15; // Slightly higher than wander (0.1)
  },
  execute(entity, context) {
    const pos = context.ecs.getComponent<{ x: number; y: number }>(entity, 'Position');
    if (!pos) return;

    const currentTileX = Math.floor(pos.x / TILE_SIZE);
    const currentTileY = Math.floor(pos.y / TILE_SIZE);

    // Explore toward the opposite side of the map (toward other colony)
    const faction = context.ecs.getComponent<{ id: string }>(entity, 'Faction');
    const direction = faction?.id === 'red' ? 1 : -1; // Red goes right, blue goes left

    // Pick a random tile biased toward the other colony's direction
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

function findHomeStockpile(pawnEntity: Entity): Entity | null {
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

function findStockpileByFaction(factionId: string): Entity | null {
  for (const s of engine.ecs.query(['Stockpile', 'Position'])) {
    const stockpile = engine.ecs.getComponent<{ factionId: string }>(s, 'Stockpile')!;
    if (stockpile.factionId === factionId) {
      return s;
    }
  }
  return null;
}

engine.ai.defineAction('caravan', {
  canExecute(entity, context) {
    // Already on a caravan?
    if (context.ecs.hasComponent(entity, 'CaravanTask')) return false;

    const faction = context.ecs.getComponent<{ id: string }>(entity, 'Faction');
    if (!faction) return false;

    // Own stockpile has surplus?
    const homeStockpile = findHomeStockpile(entity);
    if (!homeStockpile) return false;

    const stockpileComp = context.ecs.getComponent<{ food: number }>(homeStockpile, 'Stockpile');
    if (!stockpileComp || stockpileComp.food <= SURPLUS_THRESHOLD) return false;

    // Know of a colony in deficit?
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

    const homeStockpile = findHomeStockpile(entity);
    if (!homeStockpile) return 0;

    const stockpileComp = context.ecs.getComponent<{ food: number }>(homeStockpile, 'Stockpile');
    if (!stockpileComp) return 0;

    const memory = context.ecs.getComponent<{
      known: Array<{ factionId: string; lastSeenFood: number; ticksSinceVisit: number }>;
    }>(entity, 'ColonyMemory');
    if (!memory) return 0;

    const hunger = context.ecs.getComponent<{ current: number; max: number }>(entity, 'Hunger');
    if (!hunger) return 0;

    // Find the neediest known colony
    const needyColony = memory.known.find(
      (k) => k.lastSeenFood < DEFICIT_THRESHOLD && k.ticksSinceVisit < MEMORY_DECAY_TICKS
    );
    if (!needyColony) return 0;

    // Calculate score
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

    const targetStockpile = findStockpileByFaction(needyColony.factionId);
    if (!targetStockpile) return;

    const homeStockpile = findHomeStockpile(entity);
    if (!homeStockpile) return;

    const homePos = context.ecs.getComponent<{ x: number; y: number }>(homeStockpile, 'Position');
    if (!homePos) return;

    const entityPos = context.ecs.getComponent<{ x: number; y: number }>(entity, 'Position');
    if (!entityPos) return;

    const homeTileX = Math.floor(homePos.x / TILE_SIZE);
    const homeTileY = Math.floor(homePos.y / TILE_SIZE);
    const entityTileX = Math.floor(entityPos.x / TILE_SIZE);
    const entityTileY = Math.floor(entityPos.y / TILE_SIZE);

    // Verify path to home stockpile exists
    const path = pathfinder.findPath(entityTileX, entityTileY, homeTileX, homeTileY);
    if (!path) return;

    // Set up caravan task
    context.ecs.addComponent(entity, 'CaravanTask', {
      targetFactionId: needyColony.factionId,
      targetStockpile,
      phase: 'pickup',
      homeStockpile,
    });

    // Clear existing path and set path to home stockpile
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

// Camera control system
engine.ecs.addSystem({
  name: 'CameraControl',
  query: [],
  update() {
    const { input, camera } = engine;

    if (input.isKeyPressed('Equal') || input.isKeyPressed('NumpadAdd')) {
      camera.zoomIn();
    }
    if (input.isKeyPressed('Minus') || input.isKeyPressed('NumpadSubtract')) {
      camera.zoomOut();
    }
    if (input.isKeyPressed('Backquote')) {
      debugMode = !debugMode;
    }
  },
});

// Memory decay system: increment ticksSinceVisit for all known colonies
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

// Memory update system: when near a foreign stockpile, update memory
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

        // Skip own faction's stockpile
        if (stockpileComp.factionId === pawnFaction.id) continue;

        const stockpileTileX = Math.floor(stockpilePos.x / TILE_SIZE);
        const stockpileTileY = Math.floor(stockpilePos.y / TILE_SIZE);

        const dx = pawnTileX - stockpileTileX;
        const dy = pawnTileY - stockpileTileY;
        const distSq = dx * dx + dy * dy;

        // Within visual range (3 tiles)
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

// Proximity signal system: hear "we need food" from nearby low-food stockpiles
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

        // Skip own faction
        if (stockpileComp.factionId === pawnFaction.id) continue;

        // Only broadcast if in deficit
        if (stockpileComp.food >= DEFICIT_THRESHOLD) continue;

        const stockpileTileX = Math.floor(stockpilePos.x / TILE_SIZE);
        const stockpileTileY = Math.floor(stockpilePos.y / TILE_SIZE);

        const dx = pawnTileX - stockpileTileX;
        const dy = pawnTileY - stockpileTileY;
        const distSq = dx * dx + dy * dy;

        // Within signal range
        if (distSq <= PROXIMITY_SIGNAL_RANGE * PROXIMITY_SIGNAL_RANGE) {
          const existing = memory.known.find((k) => k.factionId === stockpileComp.factionId);
          if (existing) {
            // Update if this info is fresher (they're broadcasting need)
            existing.lastSeenFood = stockpileComp.food;
            existing.stockpileX = stockpileTileX;
            existing.stockpileY = stockpileTileY;
            // Don't reset ticksSinceVisit - they haven't actually visited
          } else {
            memory.known.push({
              factionId: stockpileComp.factionId,
              stockpileX: stockpileTileX,
              stockpileY: stockpileTileY,
              lastSeenFood: stockpileComp.food,
              ticksSinceVisit: MEMORY_DECAY_TICKS, // Mark as stale since not visited
            });
          }
        }
      }
    }
  },
});

// Caravan system: handle caravan state machine
engine.ecs.addSystem({
  name: 'Caravan',
  query: ['CaravanTask', 'Position', 'Inventory'],
  update(entities) {
    for (const e of entities) {
      // Skip if still moving
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
        // At home stockpile - pick up food
        if (caravan.homeStockpile && engine.ecs.isAlive(caravan.homeStockpile)) {
          const stockpile = engine.ecs.getComponent<{ food: number }>(caravan.homeStockpile, 'Stockpile');
          if (stockpile && stockpile.food > 0) {
            const toTake = Math.min(inventory.capacity - inventory.food, stockpile.food);
            stockpile.food -= toTake;
            inventory.food += toTake;
          }
        }

        // Move to target stockpile
        if (caravan.targetStockpile && engine.ecs.isAlive(caravan.targetStockpile)) {
          const targetPos = engine.ecs.getComponent<{ x: number; y: number }>(caravan.targetStockpile, 'Position');
          if (targetPos) {
            const targetTileX = Math.floor(targetPos.x / TILE_SIZE);
            const targetTileY = Math.floor(targetPos.y / TILE_SIZE);
            engine.ecs.addComponent(e, 'PathTarget', { x: targetTileX, y: targetTileY });
            caravan.phase = 'traveling-there';
          }
        } else {
          // Target gone, abort
          engine.ecs.removeComponent(e, 'CaravanTask');
          if (engine.ecs.hasComponent(e, 'CurrentTask')) {
            engine.ecs.removeComponent(e, 'CurrentTask');
          }
        }
      } else if (caravan.phase === 'traveling-there') {
        // Arrived at target - transition to dropoff
        caravan.phase = 'dropoff';
      } else if (caravan.phase === 'dropoff') {
        // At target stockpile - drop off food
        if (caravan.targetStockpile && engine.ecs.isAlive(caravan.targetStockpile)) {
          const stockpile = engine.ecs.getComponent<{ food: number }>(caravan.targetStockpile, 'Stockpile');
          if (stockpile) {
            stockpile.food += inventory.food;
            inventory.food = 0;
          }
        }

        // Return home
        if (caravan.homeStockpile && engine.ecs.isAlive(caravan.homeStockpile)) {
          const homePos = engine.ecs.getComponent<{ x: number; y: number }>(caravan.homeStockpile, 'Position');
          if (homePos) {
            const homeTileX = Math.floor(homePos.x / TILE_SIZE);
            const homeTileY = Math.floor(homePos.y / TILE_SIZE);
            engine.ecs.addComponent(e, 'PathTarget', { x: homeTileX, y: homeTileY });
            caravan.phase = 'returning';
          }
        } else {
          // Home gone, just clear task
          engine.ecs.removeComponent(e, 'CaravanTask');
          if (engine.ecs.hasComponent(e, 'CurrentTask')) {
            engine.ecs.removeComponent(e, 'CurrentTask');
          }
        }
      } else if (caravan.phase === 'returning') {
        // Arrived home - caravan complete
        engine.ecs.removeComponent(e, 'CaravanTask');
        if (engine.ecs.hasComponent(e, 'CurrentTask')) {
          engine.ecs.removeComponent(e, 'CurrentTask');
        }

        // Trigger AI re-evaluation
        const aiState = engine.ecs.getComponent<{ needsReeval: boolean }>(e, 'AIState');
        if (aiState) {
          aiState.needsReeval = true;
        }
      }
    }
  },
});

// AI Decision system: re-evaluate when needed
engine.ecs.addSystem({
  name: 'AIDecision',
  query: ['Pawn', 'Hunger', 'AIState'],
  update(entities) {
    const context = createActionContext();

    for (const e of entities) {
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

// Pathfinding system: when entity has PathTarget but no PathFollow, calculate path
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

// Path follow system: move entity along path
engine.ecs.addSystem({
  name: 'PathFollow',
  query: ['Position', 'PathFollow'],
  update(entities, dt) {
    for (const e of entities) {
      const pos = engine.ecs.getComponent<{ x: number; y: number }>(e, 'Position')!;
      const pathFollow = engine.ecs.getComponent<{ path: PathNode[]; nodeIndex: number }>(
        e,
        'PathFollow'
      )!;

      if (pathFollow.nodeIndex >= pathFollow.path.length) {
        // Path complete
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
        // Close enough, snap and advance
        pos.x = targetX;
        pos.y = targetY;
        pathFollow.nodeIndex++;
      } else {
        // Move toward target
        const moveDistance = PAWN_SPEED * dt;
        const ratio = Math.min(moveDistance / distance, 1);
        pos.x += dx * ratio;
        pos.y += dy * ratio;
      }
    }
  },
});

// Task execution system: handle task completion when arrived
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
            const consumed = Math.min(30, stockpile.food); // Consume up to 30 nutrition
            stockpile.food -= consumed;
            hunger.current = Math.max(0, hunger.current - consumed);
          }
        }
        engine.ecs.removeComponent(e, 'CurrentTask');
      } else if (task.action === 'wander') {
        engine.ecs.removeComponent(e, 'CurrentTask');
      }
    }
  },
});

// Hunger system: increase hunger over time
engine.ecs.addSystem({
  name: 'Hunger',
  query: ['Hunger'],
  update(entities, dt) {
    for (const e of entities) {
      const hunger = engine.ecs.getComponent<{ current: number; max: number; rate: number }>(
        e,
        'Hunger'
      )!;
      hunger.current = Math.min(hunger.current + hunger.rate * dt, hunger.max);
    }
  },
});

// Camera follow system
engine.ecs.addSystem({
  name: 'CameraFollow',
  query: ['Pawn', 'Position'],
  update(entities) {
    for (const e of entities) {
      const pos = engine.ecs.getComponent<{ x: number; y: number }>(e, 'Position')!;
      engine.camera.centerOn(pos.x, pos.y);
    }
  },
});

// Render loop
engine.onDraw(() => {
  engine.renderer.clear();

  // Draw tile map
  engine.renderer.drawTileMap(engine.tileMap, TILE_SIZE);

  // Draw entities (pawns)
  for (const e of engine.ecs.query(['Position', 'Sprite'])) {
    const pos = engine.ecs.getComponent<{ x: number; y: number }>(e, 'Position')!;
    const sprite = engine.ecs.getComponent<{ width: number; height: number; color: string }>(
      e,
      'Sprite'
    )!;
    engine.renderer.drawRectCentered(pos.x, pos.y, sprite.width, sprite.height, sprite.color);
  }

  // UI: Stats panel (screen-space, bottom-left)
  const hunger = engine.ecs.getComponent<{ current: number; max: number }>(pawn, 'Hunger')!;
  const currentTask = engine.ecs.getComponent<{ action: string; target: Entity | null }>(pawn, 'CurrentTask');
  const taskLabel = currentTask ? currentTask.action.charAt(0).toUpperCase() + currentTask.action.slice(1) : 'Idle';

  const panelX = 10;
  const panelY = canvas.height - 110;
  const panelWidth = 160;
  const panelHeight = 100;

  // Panel background
  engine.renderer.drawRectScreen(panelX, panelY, panelWidth, panelHeight, 'rgba(26, 26, 46, 0.9)');

  // Title
  engine.renderer.drawTextScreen('Pawn Stats', panelX + 10, panelY + 22, {
    font: '14px monospace',
    color: '#ffffff',
  });

  // Task label
  engine.renderer.drawTextScreen(`Task: ${taskLabel}`, panelX + 10, panelY + 42, {
    font: '12px monospace',
    color: '#aaaaaa',
  });

  // Hunger label
  engine.renderer.drawTextScreen('Hunger', panelX + 10, panelY + 62, {
    font: '12px monospace',
    color: '#aaaaaa',
  });

  // Hunger bar background
  const barX = panelX + 10;
  const barY = panelY + 69;
  const barWidth = 120;
  const barHeight = 14;
  engine.renderer.drawRectScreen(barX, barY, barWidth, barHeight, '#333333');

  // Hunger bar fill
  const fillWidth = barWidth * (hunger.current / hunger.max);
  const hungerColor = hunger.current > 70 ? '#e94560' : hunger.current > 40 ? '#ffdd57' : '#4ade80';
  engine.renderer.drawRectScreen(barX, barY, fillWidth, barHeight, hungerColor);

  // Hunger value
  engine.renderer.drawTextScreen(
    `${Math.round(hunger.current)}/${hunger.max}`,
    barX + barWidth + 5,
    barY + 11,
    { font: '11px monospace', color: '#888888' }
  );

  // Debug overlay (` toggle)
  if (debugMode) {
    const context = createActionContext();
    const scores = engine.ai.evaluateAll(pawn, context);
    const currentTask = engine.ecs.getComponent<{ action: string }>(pawn, 'CurrentTask');

    const debugX = 10;
    const debugY = canvas.height - 220;
    const debugWidth = 160;
    const debugHeight = 100;

    engine.renderer.drawRectScreen(debugX, debugY, debugWidth, debugHeight, 'rgba(26, 26, 46, 0.9)');
    engine.renderer.drawTextScreen('AI Debug (`)', debugX + 10, debugY + 22, {
      font: '14px monospace',
      color: '#ffffff',
    });

    let yOffset = 42;
    for (const { action, score, canExecute } of scores) {
      const isActive = currentTask?.action === action;
      const color = !canExecute ? '#666666' : isActive ? '#4ade80' : '#aaaaaa';
      const marker = isActive ? ' ◄' : '';
      const scoreText = canExecute ? score.toFixed(2) : '-.--';

      engine.renderer.drawTextScreen(
        `${action}: ${scoreText}${marker}`,
        debugX + 10,
        debugY + yOffset,
        { font: '12px monospace', color }
      );
      yOffset += 18;
    }
  }

  // Instructions (top-left)
  engine.renderer.drawTextScreen('Autonomous mode | +/-: Zoom | `: Debug', 10, 30, { color: '#888' });
});

engine.start();
console.log('Colony - Built with Emergence Engine (Phase 5: Pawn Thinks)');
