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

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Engine, Entity } from 'emergence-engine';
import type { EmergenceSaveFile } from 'emergence-engine';
import type { EntityTemplate } from '../types/templates';
import { useUndo, type UndoState, type UndoActions } from './useUndo';
import type { BrushSize, BrushShape } from '../utils/brush';

export type EditorTool = 'paint' | 'erase' | 'entity';

export type EditorMode = 'edit' | 'play';

export interface ProjectInfo {
  name: string;
  savedAt: string | null;
  modified: boolean;
}

interface EditorContextValue {
  engine: Engine | null;
  setEngine: (engine: Engine | null) => void;
  mode: EditorMode;
  setMode: (mode: EditorMode) => void;
  project: ProjectInfo;
  setProject: (info: Partial<ProjectInfo>) => void;
  mouseWorldPos: { x: number; y: number } | null;
  setMouseWorldPos: (pos: { x: number; y: number } | null) => void;
  currentSave: EmergenceSaveFile | null;
  setCurrentSave: (save: EmergenceSaveFile | null) => void;
  // Painting state (Phase 8)
  tool: EditorTool;
  setTool: (tool: EditorTool) => void;
  brushSize: BrushSize;
  setBrushSize: (size: BrushSize) => void;
  brushShape: BrushShape;
  setBrushShape: (shape: BrushShape) => void;
  selectedTerrain: string | null;
  setSelectedTerrain: (name: string | null) => void;
  selectedBuilding: string | null;
  setSelectedBuilding: (name: string | null) => void;
  // Undo system
  undoState: UndoState;
  undoActions: UndoActions;
  // Entity placement (Phase 9)
  entityTemplates: EntityTemplate[];
  registerEntityTemplates: (templates: EntityTemplate[]) => void;
  selectedTemplate: string | null;
  selectTemplate: (name: string | null) => void;
  selectedEntityId: Entity | null;
  selectEntity: (id: Entity | null) => void;
  deleteSelectedEntity: () => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [engine, setEngine] = useState<Engine | null>(null);
  const [mode, setModeState] = useState<EditorMode>('edit');
  const [project, setProjectState] = useState<ProjectInfo>({
    name: 'Untitled Project',
    savedAt: null,
    modified: false,
  });
  const [mouseWorldPos, setMouseWorldPos] = useState<{ x: number; y: number } | null>(null);
  const [currentSave, setCurrentSave] = useState<EmergenceSaveFile | null>(null);

  // Painting state
  const [tool, setTool] = useState<EditorTool>('paint');
  const [brushSize, setBrushSize] = useState<BrushSize>(1);
  const [brushShape, setBrushShape] = useState<BrushShape>('square');
  const [selectedTerrain, setSelectedTerrainState] = useState<string | null>('grass');
  const [selectedBuilding, setSelectedBuildingState] = useState<string | null>(null);

  // Undo system
  const [undoState, undoActions] = useUndo();

  // Entity placement state
  const [entityTemplates, setEntityTemplates] = useState<EntityTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<Entity | null>(null);

  const registerEntityTemplates = useCallback((templates: EntityTemplate[]) => {
    setEntityTemplates(templates);
  }, []);

  const selectTemplate = useCallback((name: string | null) => {
    setSelectedTemplate(name);
    if (name) {
      setTool('entity');
    }
  }, []);

  const selectEntity = useCallback((id: Entity | null) => {
    setSelectedEntityId(id);
  }, []);

  const deleteSelectedEntity = useCallback(() => {
    if (engine && selectedEntityId !== null && engine.ecs.isAlive(selectedEntityId)) {
      engine.ecs.destroyEntity(selectedEntityId);
      setSelectedEntityId(null);
      setProjectState((prev) => ({ ...prev, modified: true }));
    }
  }, [engine, selectedEntityId]);

  // Selection handlers - terrain and building are mutually exclusive
  const setSelectedTerrain = useCallback((name: string | null) => {
    setSelectedTerrainState(name);
    if (name) {
      setSelectedBuildingState(null);
    }
  }, []);

  const setSelectedBuilding = useCallback((name: string | null) => {
    setSelectedBuildingState(name);
    if (name) {
      setSelectedTerrainState(null);
    }
  }, []);

  const setMode = useCallback(
    (newMode: EditorMode) => {
      if (engine) {
        if (newMode === 'play') {
          engine.start();
        } else {
          engine.stop();
        }
      }
      setModeState(newMode);
    },
    [engine]
  );

  const setProject = useCallback((info: Partial<ProjectInfo>) => {
    setProjectState((prev) => ({ ...prev, ...info }));
  }, []);

  return (
    <EditorContext.Provider
      value={{
        engine,
        setEngine,
        mode,
        setMode,
        project,
        setProject,
        mouseWorldPos,
        setMouseWorldPos,
        currentSave,
        setCurrentSave,
        tool,
        setTool,
        brushSize,
        setBrushSize,
        brushShape,
        setBrushShape,
        selectedTerrain,
        setSelectedTerrain,
        selectedBuilding,
        setSelectedBuilding,
        undoState,
        undoActions,
        entityTemplates,
        registerEntityTemplates,
        selectedTemplate,
        selectTemplate,
        selectedEntityId,
        selectEntity,
        deleteSelectedEntity,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor(): EditorContextValue {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
}
