/*
 * This file is part of Emergence Editor.
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

import { ToolsPanel } from './ToolsPanel';
import { TerrainPalette } from './TerrainPalette';
import { BuildingPalette } from './BuildingPalette';
import { EntityPalette } from './EntityPalette';

export function Sidebar() {
  return (
    <div className="w-64 bg-editor-surface border-r border-editor-border flex flex-col overflow-y-auto">
      <ToolsPanel />
      <TerrainPalette />
      <BuildingPalette />
      <EntityPalette />
    </div>
  );
}
