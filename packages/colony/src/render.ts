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

import type { Engine, Entity } from 'emergence-engine';
import { TILE_SIZE } from './definitions';
import { createActionContext } from './setup';

export function setupColonyRenderer(engine: Engine, canvas: HTMLCanvasElement, debugMode: boolean): void {
  engine.onDraw(() => {
    engine.renderer.clear();

    // Draw tile map
    engine.renderer.drawTileMap(engine.tileMap, TILE_SIZE);

    // Draw entities (pawns)
    for (const e of engine.ecs.query(['Position', 'Sprite'])) {
      const pos = engine.ecs.getComponent<{ x: number; y: number }>(e, 'Position')!;
      const sprite = engine.ecs.getComponent<{ width: number; height: number; color: string }>(e, 'Sprite')!;
      engine.renderer.drawRectCentered(pos.x, pos.y, sprite.width, sprite.height, sprite.color);
    }

    // Draw stockpile food counts
    for (const s of engine.ecs.query(['Stockpile', 'Position'])) {
      const stockpile = engine.ecs.getComponent<{ factionId: string; food: number }>(s, 'Stockpile')!;
      const pos = engine.ecs.getComponent<{ x: number; y: number }>(s, 'Position')!;
      const screenPos = engine.camera.worldToScreen(pos.x, pos.y - 24);
      engine.renderer.drawTextScreen(`${stockpile.food}`, screenPos.x, screenPos.y, {
        font: '14px monospace',
        color: '#ffffff',
        align: 'center',
      });
    }

    // Debug overlay
    if (debugMode) {
      const context = createActionContext(engine);
      const pawns = engine.ecs.query(['Pawn', 'Faction']);
      let debugPawn: Entity | null = null;

      for (const p of pawns) {
        const faction = engine.ecs.getComponent<{ id: string }>(p, 'Faction');
        if (faction?.id === 'red') {
          debugPawn = p;
          break;
        }
      }

      if (debugPawn !== null) {
        const scores = engine.ai.evaluateAll(debugPawn, context);
        const currentTask = engine.ecs.getComponent<{ action: string }>(debugPawn, 'CurrentTask');
        const caravanTask = engine.ecs.getComponent<{ phase: string }>(debugPawn, 'CaravanTask');
        const inventory = engine.ecs.getComponent<{ food: number }>(debugPawn, 'Inventory');
        const memory = engine.ecs.getComponent<{ known: Array<{ factionId: string; lastSeenFood: number }> }>(debugPawn, 'ColonyMemory');

        const debugX = 10;
        const debugY = canvas.height - 340;
        const debugWidth = 180;
        const debugHeight = 220;

        engine.renderer.drawRectScreen(debugX, debugY, debugWidth, debugHeight, 'rgba(26, 26, 46, 0.9)');
        engine.renderer.drawTextScreen('AI Debug', debugX + 10, debugY + 22, {
          font: '14px monospace',
          color: '#ffffff',
        });

        let yOffset = 42;

        if (caravanTask) {
          engine.renderer.drawTextScreen(`Caravan: ${caravanTask.phase}`, debugX + 10, debugY + yOffset, {
            font: '12px monospace',
            color: '#fbbf24',
          });
          yOffset += 18;
        }

        if (inventory) {
          engine.renderer.drawTextScreen(`Carrying: ${inventory.food} food`, debugX + 10, debugY + yOffset, {
            font: '12px monospace',
            color: '#60a5fa',
          });
          yOffset += 18;
        }

        if (memory && memory.known.length > 0) {
          engine.renderer.drawTextScreen('Known colonies:', debugX + 10, debugY + yOffset, {
            font: '12px monospace',
            color: '#888888',
          });
          yOffset += 16;
          for (const k of memory.known) {
            engine.renderer.drawTextScreen(`  ${k.factionId}: ${k.lastSeenFood} food`, debugX + 10, debugY + yOffset, {
              font: '11px monospace',
              color: '#aaaaaa',
            });
            yOffset += 14;
          }
        }

        yOffset += 4;

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
    }
  });
}
