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

export function TerrainPalette() {
  const { engine, selectedTerrain, setSelectedTerrain, setTool } = useEditor();

  const terrainDefs = engine?.tileMap.getAllTerrainDefs() ?? [];

  const handleSelect = (name: string) => {
    setSelectedTerrain(name);
    setTool('paint');
  };

  return (
    <div className="p-3 border-b border-editor-border">
      <h3 className="text-xs font-semibold text-editor-text-muted uppercase tracking-wider mb-2">
        Terrain
      </h3>
      <div className="grid grid-cols-2 gap-1">
        {terrainDefs.map((def) => (
          <button
            key={def.name}
            className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
              selectedTerrain === def.name
                ? 'ring-2 ring-editor-primary bg-editor-accent'
                : 'bg-editor-surface hover:bg-editor-accent'
            }`}
            onClick={() => handleSelect(def.name)}
          >
            <span
              className="w-4 h-4 rounded border border-editor-border"
              style={{ backgroundColor: def.color }}
            />
            <span className="text-editor-text capitalize">{def.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
