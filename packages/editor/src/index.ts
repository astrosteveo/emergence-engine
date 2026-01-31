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

// Context and hooks
export { EditorProvider, useEditor } from './hooks/useEditorContext';
export type { EditorMode, EditorTool, ProjectInfo, EditorProviderProps } from './hooks/useEditorContext';

// Components
export { EditorShell } from './components/EditorShell';
export { Toolbar } from './components/Toolbar';
export { Sidebar } from './components/Sidebar';
export { Viewport } from './components/Viewport';
export { Inspector } from './components/Inspector';
export { RightSidebar } from './components/RightSidebar';
export { StatusBar } from './components/StatusBar';
export { TerrainPalette } from './components/TerrainPalette';
export { BuildingPalette } from './components/BuildingPalette';
export { EntityPalette } from './components/EntityPalette';
export { EntityList } from './components/EntityList';
export { ToolsPanel } from './components/ToolsPanel';
export { FileMenu } from './components/FileMenu';

// Types
export type { GameDefinitions, TerrainDefinition, BuildingDefinition } from './types/GameDefinitions';
export type { EntityTemplate, ComponentTemplate } from './types/templates';

// Hooks
export { useUndo } from './hooks/useUndo';
export type { UndoState, UndoActions, UndoEntry, TileChange } from './hooks/useUndo';

// Utilities
export { getBrushTiles } from './utils/brush';
export type { BrushSize, BrushShape } from './utils/brush';

// Storage utilities
export { exportToFile, importFromFile } from './storage/fileIO';
export { saveToLocalStorage, loadFromLocalStorage, listSavedProjects, deleteProject } from './storage/localStorage';
