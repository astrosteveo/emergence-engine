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

import { Toolbar } from './Toolbar';
import { Sidebar } from './Sidebar';
import { Viewport } from './Viewport';
import { RightSidebar } from './RightSidebar';
import { StatusBar } from './StatusBar';

export function EditorShell() {
  return (
    <div className="h-full w-full flex flex-col">
      {/* Toolbar */}
      <Toolbar />

      {/* Main content area */}
      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Viewport */}
        <div className="flex-1 min-w-0">
          <Viewport />
        </div>

        {/* Right Sidebar */}
        <RightSidebar />
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  );
}
