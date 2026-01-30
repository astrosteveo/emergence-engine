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

export { Engine } from './Engine';
export type { EngineConfig } from './Engine';
export { GameLoop } from './core/GameLoop';
export { World } from './ecs/World';
export type { Entity, System } from './ecs/World';
export { Input } from './input/Input';
export { Renderer } from './render/Renderer';
export { Camera } from './render/Camera';
export { TileMap } from './world/TileMap';
export type { TerrainDef, BuildingDef } from './world/TileMap';
export { generateTerrain } from './world/generate';
export type { GeneratorConfig } from './world/generate';
