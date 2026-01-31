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

import { entityIndex } from 'emergence-engine';
import { useEditor } from '../hooks/useEditorContext';

export function StatusBar() {
  const {
    engine,
    mode,
    mouseWorldPos,
    tool,
    brushSize,
    brushShape,
    selectedTerrain,
    selectedBuilding,
    selectedTemplate,
    selectedEntityId,
    entityTemplates,
  } = useEditor();

  const tilePos =
    mouseWorldPos && engine
      ? engine.camera.worldToTile(mouseWorldPos.x, mouseWorldPos.y, 16)
      : null;

  const zoom = engine?.camera.zoom ?? 1;
  const entityCount = engine?.ecs.getAllEntities().length ?? 0;

  // Build brush info string
  const getBrushInfo = () => {
    if (tool === 'entity') {
      if (selectedTemplate) {
        const template = entityTemplates.find((t) => t.name === selectedTemplate);
        return `Entity: ${template?.label ?? selectedTemplate}`;
      }
      return 'Entity: None selected';
    }
    if (tool === 'erase') {
      return `Eraser ${brushSize}x${brushSize} ${brushShape}`;
    }
    const selection = selectedBuilding || selectedTerrain || 'None';
    return `Brush: ${selection} ${brushSize}x${brushSize} ${brushShape}`;
  };

  return (
    <div className="h-6 bg-editor-surface border-t border-editor-border flex items-center px-3 text-xs text-editor-text-muted gap-6">
      {/* Mode indicator */}
      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${
            mode === 'play' ? 'bg-editor-success animate-pulse' : 'bg-editor-text-muted'
          }`}
        />
        <span className="uppercase">{mode}</span>
      </div>

      {/* Brush info */}
      <div className="text-editor-text">{getBrushInfo()}</div>

      {/* Selection info */}
      {selectedEntityId !== null && (
        <div className="text-editor-text">
          Selected: #{entityIndex(selectedEntityId)}
        </div>
      )}

      {/* Tile coordinates */}
      <div>
        {tilePos ? (
          <span>
            Tile: ({tilePos.x}, {tilePos.y})
          </span>
        ) : (
          <span>Tile: --</span>
        )}
      </div>

      {/* Zoom level */}
      <div>Zoom: {zoom}x</div>

      {/* Entity count */}
      <div>Entities: {entityCount}</div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Engine info */}
      <div>Emergence Engine v0.1.0</div>
    </div>
  );
}
