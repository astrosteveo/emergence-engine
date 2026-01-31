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

import { useRef, useEffect, useCallback } from 'react';
import { Engine } from 'emergence-engine';
import { useEditor } from '../hooks/useEditorContext';

const TILE_SIZE = 16;

export function Viewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { engine, setEngine, mode, setMouseWorldPos, setProject } = useEditor();

  // Initialize engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const newEngine = new Engine({ canvas, tickRate: 20 });

    // Define basic terrain (editor default)
    newEngine.tileMap.defineTerrain('grass', { color: '#3a5a40', walkable: true });
    newEngine.tileMap.defineTerrain('water', { color: '#1d3557', walkable: false });
    newEngine.tileMap.defineTerrain('stone', { color: '#6c757d', walkable: true });
    newEngine.tileMap.defineTerrain('sand', { color: '#e9c46a', walkable: true });

    // Define basic buildings
    newEngine.tileMap.defineBuilding('wall', { color: '#4a4a4a', solid: true });
    newEngine.tileMap.defineBuilding('floor', { color: '#8b7355', solid: false });

    // Create a default map
    newEngine.tileMap.create(64, 64, 'grass');

    // Set up the render loop
    newEngine.onDraw(() => {
      const renderer = newEngine.renderer;
      const tileMap = newEngine.tileMap;
      const camera = newEngine.camera;

      renderer.clear('#1a1a2e');

      const bounds = camera.getVisibleBounds(TILE_SIZE);

      // Draw tiles
      for (let y = bounds.minY; y <= bounds.maxY; y++) {
        for (let x = bounds.minX; x <= bounds.maxX; x++) {
          const terrain = tileMap.getTerrain(x, y);
          if (!terrain) continue;

          const screenPos = camera.worldToScreen(x * TILE_SIZE, y * TILE_SIZE);
          const size = TILE_SIZE * camera.zoom;

          renderer.drawRectScreen(screenPos.x, screenPos.y, size, size, terrain.color);

          // Draw building on top
          const building = tileMap.getBuilding(x, y);
          if (building) {
            renderer.drawRectScreen(
              screenPos.x + size * 0.1,
              screenPos.y + size * 0.1,
              size * 0.8,
              size * 0.8,
              building.color
            );
          }

          // Draw grid lines in edit mode
          if (mode === 'edit') {
            renderer.strokeRectScreen(screenPos.x, screenPos.y, size, size, '#ffffff10');
          }
        }
      }

      // Draw entities
      const entities = newEngine.ecs.getAllEntities();
      for (const entity of entities) {
        const pos = newEngine.ecs.getComponent<{ x: number; y: number }>(entity, 'Position');
        if (!pos) continue;

        const screenPos = camera.worldToScreen(pos.x, pos.y);
        const size = TILE_SIZE * camera.zoom;

        // Simple entity rendering
        renderer.drawRectScreen(
          screenPos.x - size / 4,
          screenPos.y - size / 4,
          size / 2,
          size / 2,
          '#ef4444'
        );
      }
    });

    setEngine(newEngine);

    return () => {
      newEngine.stop();
    };
  }, [setEngine]);

  // Handle canvas resize
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width;
        canvas.height = height;
        // Update renderer/camera with new dimensions
        if (engine) {
          engine.renderer.resize(width, height);
        }
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [engine]);

  // Handle mouse movement for status bar
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!engine) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldPos = engine.camera.screenToWorld(screenX, screenY);

      setMouseWorldPos(worldPos);
    },
    [engine, setMouseWorldPos]
  );

  const handleMouseLeave = useCallback(() => {
    setMouseWorldPos(null);
  }, [setMouseWorldPos]);

  // Handle camera controls
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      if (!engine) return;
      e.preventDefault();

      if (e.deltaY < 0) {
        engine.camera.zoomIn();
      } else {
        engine.camera.zoomOut();
      }

      setProject({ modified: true });
    },
    [engine, setProject]
  );

  // Handle keyboard controls for camera panning
  useEffect(() => {
    if (!engine) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const panSpeed = 16;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          engine.camera.pan(0, -panSpeed);
          setProject({ modified: true });
          break;
        case 'ArrowDown':
        case 's':
          engine.camera.pan(0, panSpeed);
          setProject({ modified: true });
          break;
        case 'ArrowLeft':
        case 'a':
          engine.camera.pan(-panSpeed, 0);
          setProject({ modified: true });
          break;
        case 'ArrowRight':
        case 'd':
          engine.camera.pan(panSpeed, 0);
          setProject({ modified: true });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine, setProject]);

  // Trigger draw frame for edit mode
  useEffect(() => {
    if (!engine || mode !== 'edit') return;

    let animationId: number;
    const drawFrame = () => {
      // In edit mode, we still need to render even though the game loop is stopped
      // The engine's onDraw callbacks are executed by the game loop, so we need
      // to manually trigger a render frame
      engine.loop.drawOnce?.();
      animationId = requestAnimationFrame(drawFrame);
    };

    drawFrame();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [engine, mode]);

  return (
    <div ref={containerRef} className="w-full h-full bg-editor-bg overflow-hidden">
      <canvas
        ref={canvasRef}
        className="block"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      />
    </div>
  );
}
