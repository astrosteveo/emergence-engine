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

import { useState, useCallback } from 'react';
import type { Engine } from 'emergence-engine';

const MAX_UNDO_ENTRIES = 50;

export interface TileChange {
  x: number;
  y: number;
  before: {
    terrainName: string | null;
    buildingName: string | null;
  };
  after: {
    terrainName: string | null;
    buildingName: string | null;
  };
}

export interface UndoEntry {
  type: 'paint';
  changes: TileChange[];
}

export interface UndoState {
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
}

export interface UndoActions {
  pushEntry: (entry: UndoEntry) => void;
  undo: (engine: Engine) => void;
  redo: (engine: Engine) => void;
  canUndo: boolean;
  canRedo: boolean;
  clear: () => void;
}

function applyTileState(
  engine: Engine,
  x: number,
  y: number,
  state: { terrainName: string | null; buildingName: string | null }
): void {
  if (state.terrainName) {
    engine.tileMap.setTerrain(x, y, state.terrainName);
  }
  if (state.buildingName) {
    engine.tileMap.setBuilding(x, y, state.buildingName);
  } else {
    engine.tileMap.clearBuilding(x, y);
  }
}

export function useUndo(): [UndoState, UndoActions] {
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [redoStack, setRedoStack] = useState<UndoEntry[]>([]);

  const pushEntry = useCallback((entry: UndoEntry) => {
    setUndoStack((prev) => {
      const next = [...prev, entry];
      // Limit stack size
      if (next.length > MAX_UNDO_ENTRIES) {
        return next.slice(next.length - MAX_UNDO_ENTRIES);
      }
      return next;
    });
    // Clear redo stack on new action
    setRedoStack([]);
  }, []);

  const undo = useCallback((engine: Engine) => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;

      const entry = prev[prev.length - 1];
      const remaining = prev.slice(0, -1);

      // Apply before states
      for (const change of entry.changes) {
        applyTileState(engine, change.x, change.y, change.before);
      }

      // Push to redo stack
      setRedoStack((redo) => [...redo, entry]);

      return remaining;
    });
  }, []);

  const redo = useCallback((engine: Engine) => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;

      const entry = prev[prev.length - 1];
      const remaining = prev.slice(0, -1);

      // Apply after states
      for (const change of entry.changes) {
        applyTileState(engine, change.x, change.y, change.after);
      }

      // Push back to undo stack
      setUndoStack((undo) => [...undo, entry]);

      return remaining;
    });
  }, []);

  const clear = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  return [
    { undoStack, redoStack },
    {
      pushEntry,
      undo,
      redo,
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,
      clear,
    },
  ];
}
