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

export function Sidebar() {
  return (
    <div className="w-64 bg-editor-surface border-r border-editor-border flex flex-col overflow-y-auto">
      <ToolsPanel />
      <TerrainPalette />
      <BuildingPalette />

      {/* Entity palette placeholder */}
      <div className="p-3 border-b border-editor-border flex-1">
        <h3 className="text-xs font-semibold text-editor-text-muted uppercase tracking-wider mb-2">
          Entities
        </h3>
        <div className="text-sm text-editor-text-muted italic">
          Entity placement coming in Phase 9
        </div>
      </div>

      {/* Inspector placeholder */}
      <div className="p-3">
        <h3 className="text-xs font-semibold text-editor-text-muted uppercase tracking-wider mb-2">
          Inspector
        </h3>
        <div className="text-sm text-editor-text-muted italic">
          Select an entity to inspect
        </div>
      </div>
    </div>
  );
}
