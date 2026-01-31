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

import { useState, useMemo } from 'react';
import { useEditor } from '../hooks/useEditorContext';
import { entityIndex } from 'emergence-engine';

interface FieldEditorProps {
  name: string;
  value: unknown;
  readonly?: boolean;
  onChange: (value: unknown) => void;
}

function FieldEditor({ name, value, readonly, onChange }: FieldEditorProps) {
  if (typeof value === 'boolean') {
    return (
      <div className="flex items-center justify-between py-1">
        <label className="text-xs text-editor-text">{name}</label>
        <input
          type="checkbox"
          checked={value}
          disabled={readonly}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded"
        />
      </div>
    );
  }

  if (typeof value === 'number') {
    return (
      <div className="flex items-center justify-between py-1">
        <label className="text-xs text-editor-text">{name}</label>
        <input
          type="number"
          value={value}
          disabled={readonly}
          onChange={(e) => {
            const num = parseFloat(e.target.value);
            if (!isNaN(num)) onChange(num);
          }}
          className="w-20 px-1 py-0.5 text-xs bg-editor-bg border border-editor-border rounded text-editor-text disabled:opacity-50"
        />
      </div>
    );
  }

  if (typeof value === 'string') {
    return (
      <div className="flex items-center justify-between py-1">
        <label className="text-xs text-editor-text">{name}</label>
        <input
          type="text"
          value={value}
          disabled={readonly}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 px-1 py-0.5 text-xs bg-editor-bg border border-editor-border rounded text-editor-text disabled:opacity-50"
        />
      </div>
    );
  }

  // Non-editable complex types
  return (
    <div className="flex items-center justify-between py-1">
      <label className="text-xs text-editor-text">{name}</label>
      <span className="text-xs text-editor-text-muted italic">
        {Array.isArray(value) ? `[${value.length}]` : '{...}'}
      </span>
    </div>
  );
}

interface ComponentSectionProps {
  name: string;
  data: Record<string, unknown>;
  readonly?: boolean;
  onFieldChange: (field: string, value: unknown) => void;
}

function ComponentSection({ name, data, readonly, onFieldChange }: ComponentSectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="border border-editor-border rounded mb-2">
      <button
        className="w-full px-2 py-1.5 text-xs font-medium text-editor-text bg-editor-accent rounded-t flex items-center justify-between hover:bg-editor-border transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span>{name}</span>
        <span>{collapsed ? '▶' : '▼'}</span>
      </button>
      {!collapsed && (
        <div className="px-2 py-1 bg-editor-surface">
          {Object.entries(data).map(([field, value]) => (
            <FieldEditor
              key={field}
              name={field}
              value={value}
              readonly={readonly}
              onChange={(newValue) => onFieldChange(field, newValue)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Inspector() {
  const { engine, selectedEntityId, deleteSelectedEntity, setProject } = useEditor();

  const components = useMemo(() => {
    if (!engine || selectedEntityId === null) return null;
    if (!engine.ecs.isAlive(selectedEntityId)) return null;
    try {
      return engine.ecs.getComponentsForEntity(selectedEntityId);
    } catch {
      return null;
    }
  }, [engine, selectedEntityId]);

  const handleFieldChange = (componentName: string, field: string, value: unknown) => {
    if (!engine || selectedEntityId === null) return;
    const component = engine.ecs.getComponent<Record<string, unknown>>(selectedEntityId, componentName);
    if (component) {
      component[field] = value;
      setProject({ modified: true });
    }
  };

  if (selectedEntityId === null) {
    return (
      <div className="p-3 flex-1">
        <h3 className="text-xs font-semibold text-editor-text-muted uppercase tracking-wider mb-2">
          Inspector
        </h3>
        <div className="text-sm text-editor-text-muted italic">Select an entity to inspect</div>
      </div>
    );
  }

  if (!components) {
    return (
      <div className="p-3 flex-1">
        <h3 className="text-xs font-semibold text-editor-text-muted uppercase tracking-wider mb-2">
          Inspector
        </h3>
        <div className="text-sm text-editor-text-muted italic">Entity no longer exists</div>
      </div>
    );
  }

  return (
    <div className="p-3 flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-editor-text-muted uppercase tracking-wider">
          Inspector
        </h3>
        <span className="text-xs text-editor-text-muted">#{entityIndex(selectedEntityId)}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {Object.entries(components).map(([name, data]) => (
          <ComponentSection
            key={name}
            name={name}
            data={data as Record<string, unknown>}
            onFieldChange={(field, value) => handleFieldChange(name, field, value)}
          />
        ))}
      </div>

      <button
        className="mt-2 w-full px-2 py-1.5 text-xs bg-editor-error text-white rounded hover:opacity-90 transition-opacity"
        onClick={deleteSelectedEntity}
      >
        Delete Entity
      </button>
    </div>
  );
}
