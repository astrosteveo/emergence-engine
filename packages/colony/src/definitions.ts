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

import type { GameDefinitions } from 'emergence-editor';

export const TILE_SIZE = 16;

export const colonyDefinitions: GameDefinitions = {
  terrain: [
    { name: 'grass', color: '#3a5a40', label: 'Grass' },
    { name: 'water', color: '#1d3557', label: 'Water' },
    { name: 'stone', color: '#6c757d', label: 'Stone' },
  ],
  buildings: [
    { name: 'wall', color: '#4a4a4a', label: 'Wall' },
    { name: 'stockpile', color: '#8b7355', label: 'Stockpile' },
  ],
  entityTemplates: [
    {
      name: 'pawn',
      label: 'Pawn',
      icon: '🧑',
      components: [
        { type: 'Position', defaults: { x: 0, y: 0 } },
        { type: 'Sprite', defaults: { width: 24, height: 24, color: '#f87171' } },
        { type: 'Pawn', defaults: {} },
        { type: 'Faction', defaults: { id: 'red' } },
        { type: 'Inventory', defaults: { capacity: 5, food: 0 } },
        { type: 'Hunger', defaults: { current: 20, max: 100, rate: 2 } },
        { type: 'AIState', defaults: { lastHungerPercent: 0.2, needsReeval: true } },
        { type: 'ColonyMemory', defaults: { known: [] } },
      ],
    },
    {
      name: 'stockpile',
      label: 'Stockpile',
      icon: '📦',
      components: [
        { type: 'Position', defaults: { x: 0, y: 0 } },
        { type: 'Sprite', defaults: { width: 32, height: 32, color: '#dc2626' } },
        { type: 'Stockpile', defaults: { factionId: 'red', food: 10 } },
      ],
    },
    {
      name: 'food',
      label: 'Food',
      icon: '🍖',
      components: [
        { type: 'Position', defaults: { x: 0, y: 0 } },
        { type: 'Sprite', defaults: { width: 16, height: 16, color: '#fbbf24' } },
        { type: 'Food', defaults: { nutrition: 30 } },
      ],
    },
  ],
};
