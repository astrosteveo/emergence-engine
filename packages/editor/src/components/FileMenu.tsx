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
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  listSavedProjects,
  deleteProject,
} from '../storage/localStorage';
import { exportToFile, importFromFile } from '../storage/fileIO';
import { serialize, deserialize } from 'emergence-engine';
import { useState, useEffect } from 'react';

interface FileMenuProps {
  onClose: () => void;
}

export function FileMenu({ onClose }: FileMenuProps) {
  const { engine, project, setProject, setCurrentSave, setMode } = useEditor();
  const [savedProjects, setSavedProjects] = useState<string[]>([]);
  const [showOpenDialog, setShowOpenDialog] = useState(false);

  useEffect(() => {
    setSavedProjects(listSavedProjects());
  }, []);

  const handleNew = () => {
    if (project.modified) {
      if (!confirm('You have unsaved changes. Create new project anyway?')) {
        onClose();
        return;
      }
    }

    // Reset to a new empty project
    if (engine) {
      engine.ecs.clear();
      engine.camera.setState({ x: 0, y: 0, zoomLevel: 0 });
    }

    setProject({
      name: 'Untitled Project',
      savedAt: null,
      modified: false,
    });
    setCurrentSave(null);
    setMode('edit');
    onClose();
  };

  const handleSave = () => {
    if (!engine) {
      alert('Engine not initialized');
      onClose();
      return;
    }

    try {
      const save = serialize(engine, { name: project.name });
      saveToLocalStorage(project.name, save);
      setCurrentSave(save);
      setProject({
        savedAt: new Date().toISOString(),
        modified: false,
      });
      onClose();
    } catch (err) {
      alert(`Save failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleOpen = (name: string) => {
    if (!engine) {
      alert('Engine not initialized');
      return;
    }

    if (project.modified) {
      if (!confirm('You have unsaved changes. Open another project anyway?')) {
        return;
      }
    }

    try {
      const save = loadFromLocalStorage(name);
      if (!save) {
        alert('Project not found');
        return;
      }

      // Define terrain and components before deserialize
      // For the initial version, we just try to deserialize
      // Games should define their schemas before loading
      deserialize(engine, save, { skipValidation: true });

      setCurrentSave(save);
      setProject({
        name: save.name,
        savedAt: save.createdAt,
        modified: false,
      });
      setMode('edit');
      setShowOpenDialog(false);
      onClose();
    } catch (err) {
      alert(`Load failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDelete = (name: string) => {
    if (confirm(`Delete project "${name}"?`)) {
      deleteProject(name);
      setSavedProjects(listSavedProjects());
    }
  };

  const handleExport = async () => {
    if (!engine) {
      alert('Engine not initialized');
      onClose();
      return;
    }

    try {
      const save = serialize(engine, { name: project.name });
      await exportToFile(save);
      onClose();
    } catch (err) {
      alert(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleImport = async () => {
    if (!engine) {
      alert('Engine not initialized');
      onClose();
      return;
    }

    if (project.modified) {
      if (!confirm('You have unsaved changes. Import anyway?')) {
        onClose();
        return;
      }
    }

    try {
      const save = await importFromFile();
      if (!save) {
        onClose();
        return;
      }

      deserialize(engine, save, { skipValidation: true });

      setCurrentSave(save);
      setProject({
        name: save.name,
        savedAt: save.createdAt,
        modified: false,
      });
      setMode('edit');
      onClose();
    } catch (err) {
      alert(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (showOpenDialog) {
    return (
      <div className="absolute top-full left-0 mt-1 w-64 bg-editor-surface border border-editor-border rounded shadow-lg z-50">
        <div className="p-2 border-b border-editor-border flex justify-between items-center">
          <span className="text-sm font-medium">Open Project</span>
          <button
            className="text-editor-text-muted hover:text-editor-text"
            onClick={() => setShowOpenDialog(false)}
          >
            &times;
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {savedProjects.length === 0 ? (
            <div className="p-4 text-sm text-editor-text-muted text-center">
              No saved projects
            </div>
          ) : (
            savedProjects.map((name) => (
              <div
                key={name}
                className="flex items-center justify-between px-3 py-2 hover:bg-editor-accent"
              >
                <button
                  className="flex-1 text-left text-sm"
                  onClick={() => handleOpen(name)}
                >
                  {name}
                </button>
                <button
                  className="text-editor-error hover:text-red-400 text-sm ml-2"
                  onClick={() => handleDelete(name)}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-full left-0 mt-1 w-48 bg-editor-surface border border-editor-border rounded shadow-lg z-50">
      <button className="menu-item" onClick={handleNew}>
        New Project
      </button>
      <button className="menu-item" onClick={() => setShowOpenDialog(true)}>
        Open...
      </button>
      <button className="menu-item" onClick={handleSave}>
        Save
      </button>
      <div className="border-t border-editor-border my-1" />
      <button className="menu-item" onClick={handleExport}>
        Export to File...
      </button>
      <button className="menu-item" onClick={handleImport}>
        Import from File...
      </button>
    </div>
  );
}
