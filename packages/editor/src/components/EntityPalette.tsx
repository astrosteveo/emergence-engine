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

export function EntityPalette() {
  const { entityTemplates, selectedTemplate, selectTemplate, tool } = useEditor();

  if (entityTemplates.length === 0) {
    return (
      <div className="p-3 border-b border-editor-border">
        <h3 className="text-xs font-semibold text-editor-text-muted uppercase tracking-wider mb-2">
          Entities
        </h3>
        <div className="text-sm text-editor-text-muted italic">
          No entity templates registered
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 border-b border-editor-border">
      <h3 className="text-xs font-semibold text-editor-text-muted uppercase tracking-wider mb-2">
        Entities
      </h3>
      <div className="grid grid-cols-2 gap-1">
        {entityTemplates.map((template) => (
          <button
            key={template.name}
            className={`px-2 py-1.5 text-xs rounded text-left transition-colors ${
              selectedTemplate === template.name && tool === 'entity'
                ? 'bg-editor-primary text-white'
                : 'bg-editor-accent text-editor-text hover:bg-editor-border'
            }`}
            onClick={() => selectTemplate(template.name)}
            title={template.name}
          >
            {template.icon && <span className="mr-1">{template.icon}</span>}
            {template.label}
          </button>
        ))}
      </div>
    </div>
  );
}
