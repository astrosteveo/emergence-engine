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
import type { Engine } from 'emergence-engine';
import type { EmergenceSaveFile } from 'emergence-engine';

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
