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

import { useState, useRef, useEffect } from 'react';
import { useEditor } from '../hooks/useEditorContext';
import { FileMenu } from './FileMenu';

export function Toolbar() {
  const { mode, setMode, project } = useEditor();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  const toggleMode = () => {
    setMode(mode === 'edit' ? 'play' : 'edit');
  };

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuBarRef.current && !menuBarRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    }

    if (activeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activeMenu]);

  return (
    <div className="h-10 bg-editor-surface border-b border-editor-border flex items-center justify-between px-2">
      {/* Left: Menu bar */}
      <div ref={menuBarRef} className="flex items-center gap-1">
        {/* File Menu */}
        <div className="relative">
          <button
            className={`px-3 py-1 text-sm rounded transition-colors ${
              activeMenu === 'file'
                ? 'bg-editor-accent text-editor-text'
                : 'text-editor-text-muted hover:text-editor-text hover:bg-editor-accent/50'
            }`}
            onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
          >
            File
          </button>
          {activeMenu === 'file' && (
            <FileMenu onClose={() => setActiveMenu(null)} />
          )}
        </div>

        {/* Edit Menu Placeholder */}
        <button
          className="px-3 py-1 text-sm text-editor-text-muted hover:text-editor-text hover:bg-editor-accent/50 rounded transition-colors"
          onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')}
        >
          Edit
        </button>

        {/* View Menu Placeholder */}
        <button
          className="px-3 py-1 text-sm text-editor-text-muted hover:text-editor-text hover:bg-editor-accent/50 rounded transition-colors"
          onClick={() => setActiveMenu(activeMenu === 'view' ? null : 'view')}
        >
          View
        </button>
      </div>

      {/* Center: Project name */}
      <div className="absolute left-1/2 transform -translate-x-1/2 text-sm text-editor-text-muted">
        {project.name}
        {project.modified && <span className="ml-1 text-editor-warning">*</span>}
      </div>

      {/* Right: Play/Stop button */}
      <div className="flex items-center gap-2">
        <button
          className={`px-4 py-1 text-sm font-medium rounded transition-colors ${
            mode === 'play'
              ? 'bg-editor-error text-white hover:bg-red-600'
              : 'bg-editor-success text-white hover:bg-green-600'
          }`}
          onClick={toggleMode}
        >
          {mode === 'play' ? 'Stop' : 'Play'}
        </button>
      </div>
    </div>
  );
}
