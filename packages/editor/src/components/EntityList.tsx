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

import { useMemo } from 'react';
import { useEditor } from '../hooks/useEditorContext';
import { entityIndex } from 'emergence-engine';

export function EntityList() {
  const { engine, selectedEntityId, selectEntity } = useEditor();

  const entities = useMemo(() => {
    if (!engine) return [];
    return engine.ecs.getAllEntities().map((entity) => {
      const pos = engine.ecs.getComponent<{ x: number; y: number }>(entity, 'Position');
      const name = engine.ecs.getComponent<{ name: string }>(entity, 'Name');
      return {
        id: entity,
        index: entityIndex(entity),
        label: name?.name ?? `Entity ${entityIndex(entity)}`,
        position: pos,
      };
    });
  }, [engine, engine?.ecs.getAllEntities().length]);

  const handleSelect = (entityId: number) => {
    selectEntity(entityId);
  };

  return (
    <div className="p-3 border-b border-editor-border">
      <h3 className="text-xs font-semibold text-editor-text-muted uppercase tracking-wider mb-2">
        Entities ({entities.length})
      </h3>
      {entities.length === 0 ? (
        <div className="text-sm text-editor-text-muted italic">No entities on map</div>
      ) : (
        <div className="max-h-48 overflow-y-auto space-y-1">
          {entities.map(({ id, label, position }) => (
            <button
              key={id}
              className={`w-full px-2 py-1 text-xs rounded text-left transition-colors flex justify-between items-center ${
                selectedEntityId === id
                  ? 'bg-editor-primary text-white'
                  : 'bg-editor-accent text-editor-text hover:bg-editor-border'
              }`}
              onClick={() => handleSelect(id)}
            >
              <span className="truncate">{label}</span>
              {position && (
                <span className="text-editor-text-muted ml-2 shrink-0">
                  ({position.x}, {position.y})
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
