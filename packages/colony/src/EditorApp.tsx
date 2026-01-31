/*
 * This file is part of Colony.
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

import { useEffect, useRef, useState } from 'react';
import { Engine, generateTerrain } from 'emergence-engine';
import { EditorProvider, EditorShell } from 'emergence-editor';
import 'emergence-editor/styles.css';
import { colonyDefinitions, TILE_SIZE } from './definitions';
import { setupColonyEngine } from './setup';
import { setupColonyRenderer } from './render';
import './styles/index.css';

export function EditorApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [engine, setEngine] = useState<Engine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || engine) return;

    // Create engine
    const newEngine = new Engine({ canvas, tickRate: 20 });

    // Setup Colony game logic (components, systems, AI)
    setupColonyEngine(newEngine);

    // Generate initial world
    generateTerrain(newEngine.tileMap, { width: 64, height: 64, seed: Date.now() });

    // Ensure walkable corridor between colonies
    for (let x = -22; x <= 22; x++) {
      for (let y = -2; y <= 2; y++) {
        if (!newEngine.tileMap.isWalkable(x, y)) {
          newEngine.tileMap.setTerrain(x, y, 'grass');
        }
      }
    }

    // Setup rendering
    setupColonyRenderer(newEngine, canvas, false);

    setEngine(newEngine);

    return () => {
      newEngine.stop();
    };
  }, [engine]);

  return (
    <div className="h-screen w-screen">
      <canvas ref={canvasRef} className="hidden" />
      {engine && (
        <EditorProvider engine={engine} gameDefinitions={colonyDefinitions}>
          <EditorShell />
        </EditorProvider>
      )}
    </div>
  );
}
