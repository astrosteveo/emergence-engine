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

import { useEditor } from '../hooks/useEditorContext';

export function BuildingPalette() {
  const { engine, gameDefinitions, selectedBuilding, setSelectedBuilding, setTool } = useEditor();

  // Prefer gameDefinitions if available, otherwise fall back to engine building defs
  const buildingList = gameDefinitions?.buildings ?? engine?.tileMap.getAllBuildingDefs() ?? [];

  const handleSelect = (name: string) => {
    setSelectedBuilding(name);
    setTool('paint');
  };

  return (
    <div className="p-3 border-b border-editor-border">
      <h3 className="text-xs font-semibold text-editor-text-muted uppercase tracking-wider mb-2">
        Buildings
      </h3>
      <div className="grid grid-cols-2 gap-1">
        {buildingList.map((def) => (
          <button
            key={def.name}
            className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
              selectedBuilding === def.name
                ? 'ring-2 ring-editor-primary bg-editor-accent'
                : 'bg-editor-surface hover:bg-editor-accent'
            }`}
            onClick={() => handleSelect(def.name)}
          >
            <span
              className="w-4 h-4 rounded border border-editor-border"
              style={{ backgroundColor: def.color }}
            />
            <span className="text-editor-text capitalize">{'label' in def ? def.label : def.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
