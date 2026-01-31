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
import type { BrushSize, BrushShape } from '../utils/brush';

const BRUSH_SIZES: BrushSize[] = [1, 3, 5];
const BRUSH_SHAPES: BrushShape[] = ['square', 'circle'];

export function ToolsPanel() {
  const { tool, setTool, brushSize, setBrushSize, brushShape, setBrushShape } = useEditor();

  return (
    <div className="p-3 border-b border-editor-border">
      <h3 className="text-xs font-semibold text-editor-text-muted uppercase tracking-wider mb-3">
        Tools
      </h3>

      {/* Paint/Erase toggle */}
      <div className="mb-3">
        <label className="text-xs text-editor-text-muted mb-1 block">Mode</label>
        <div className="flex gap-1">
          <button
            className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
              tool === 'paint'
                ? 'bg-editor-primary text-white'
                : 'bg-editor-accent text-editor-text hover:bg-editor-border'
            }`}
            onClick={() => setTool('paint')}
          >
            Paint
          </button>
          <button
            className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
              tool === 'erase'
                ? 'bg-editor-error text-white'
                : 'bg-editor-accent text-editor-text hover:bg-editor-border'
            }`}
            onClick={() => setTool('erase')}
          >
            Erase
          </button>
        </div>
      </div>

      {/* Brush size */}
      <div className="mb-3">
        <label className="text-xs text-editor-text-muted mb-1 block">Size</label>
        <div className="flex gap-1">
          {BRUSH_SIZES.map((size) => (
            <button
              key={size}
              className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                brushSize === size
                  ? 'bg-editor-primary text-white'
                  : 'bg-editor-accent text-editor-text hover:bg-editor-border'
              }`}
              onClick={() => setBrushSize(size)}
            >
              {size}x{size}
            </button>
          ))}
        </div>
      </div>

      {/* Brush shape */}
      <div>
        <label className="text-xs text-editor-text-muted mb-1 block">Shape</label>
        <div className="flex gap-1">
          {BRUSH_SHAPES.map((shape) => (
            <button
              key={shape}
              className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                brushShape === shape
                  ? 'bg-editor-primary text-white'
                  : 'bg-editor-accent text-editor-text hover:bg-editor-border'
              }`}
              onClick={() => setBrushShape(shape)}
            >
              {shape === 'square' ? '■' : '●'} {shape.charAt(0).toUpperCase() + shape.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
