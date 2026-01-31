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

import { useRef, useEffect, useCallback, useState } from 'react';
import { Engine } from 'emergence-engine';
import { useEditor } from '../hooks/useEditorContext';
import { getBrushTiles } from '../utils/brush';
import type { TileChange } from '../hooks/useUndo';

const TILE_SIZE = 16;

export function Viewport() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    engine,
    setEngine,
    mode,
    setMouseWorldPos,
    setProject,
    tool,
    setTool,
    brushSize,
    setBrushSize,
    brushShape,
    selectedTerrain,
    selectedBuilding,
    undoActions,
    entityTemplates,
    registerEntityTemplates,
    selectedTemplate,
    selectedEntityId,
    selectEntity,
    deleteSelectedEntity,
  } = useEditor();

  // Painting state
  const isPaintingRef = useRef(false);
  const strokeChangesRef = useRef<TileChange[]>([]);
  const paintedTilesRef = useRef<Set<string>>(new Set());
  const [hoverTile, setHoverTile] = useState<{ x: number; y: number } | null>(null);

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

    // Define editor-mode components for entity placement
    newEngine.ecs.defineComponent('Position', { x: 0, y: 0 });
    newEngine.ecs.defineComponent('Renderable', { char: '?', color: '#ffffff' });
    newEngine.ecs.defineComponent('Name', { name: 'Entity' });

    // Register default entity templates
    registerEntityTemplates([
      {
        name: 'marker',
        label: 'Marker',
        icon: '📍',
        components: [
          { type: 'Position', defaults: { x: 0, y: 0 } },
          { type: 'Renderable', defaults: { char: '!', color: '#fbbf24' } },
          { type: 'Name', defaults: { name: 'Marker' } },
        ],
      },
      {
        name: 'spawn',
        label: 'Spawn Point',
        icon: '⭐',
        components: [
          { type: 'Position', defaults: { x: 0, y: 0 } },
          { type: 'Renderable', defaults: { char: 'S', color: '#22c55e' } },
          { type: 'Name', defaults: { name: 'Spawn Point' } },
        ],
      },
    ]);

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
  }, [setEngine, registerEntityTemplates]);

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

  // Capture current tile state for undo
  const captureTileState = useCallback(
    (x: number, y: number) => {
      if (!engine) return { terrainName: null, buildingName: null };
      const terrain = engine.tileMap.getTerrain(x, y);
      const building = engine.tileMap.getBuilding(x, y);
      return {
        terrainName: terrain?.name ?? null,
        buildingName: building?.name ?? null,
      };
    },
    [engine]
  );

  // Paint a single tile (terrain or building)
  const paintTile = useCallback(
    (tileX: number, tileY: number) => {
      if (!engine || mode !== 'edit') return;
      if (!engine.tileMap.isInBounds(tileX, tileY)) return;

      const tileKey = `${tileX},${tileY}`;
      if (paintedTilesRef.current.has(tileKey)) return;
      paintedTilesRef.current.add(tileKey);

      const before = captureTileState(tileX, tileY);

      if (tool === 'erase') {
        // Erase: remove building first, then revert terrain to grass
        const building = engine.tileMap.getBuilding(tileX, tileY);
        if (building) {
          engine.tileMap.clearBuilding(tileX, tileY);
        } else {
          engine.tileMap.setTerrain(tileX, tileY, 'grass');
        }
      } else if (selectedBuilding) {
        engine.tileMap.setBuilding(tileX, tileY, selectedBuilding);
      } else if (selectedTerrain) {
        engine.tileMap.setTerrain(tileX, tileY, selectedTerrain);
      }

      const after = captureTileState(tileX, tileY);

      // Only record if something changed
      if (before.terrainName !== after.terrainName || before.buildingName !== after.buildingName) {
        strokeChangesRef.current.push({ x: tileX, y: tileY, before, after });
      }
    },
    [engine, mode, tool, selectedTerrain, selectedBuilding, captureTileState]
  );

  // Paint all tiles under the brush
  const paintBrush = useCallback(
    (centerX: number, centerY: number) => {
      const tiles = getBrushTiles(centerX, centerY, brushSize, brushShape);
      for (const tile of tiles) {
        paintTile(tile.x, tile.y);
      }
    },
    [brushSize, brushShape, paintTile]
  );

  // Commit the current stroke to undo stack
  const commitStroke = useCallback(() => {
    if (strokeChangesRef.current.length > 0) {
      undoActions.pushEntry({ type: 'paint', changes: [...strokeChangesRef.current] });
      setProject({ modified: true });
    }
    strokeChangesRef.current = [];
    paintedTilesRef.current.clear();
  }, [undoActions, setProject]);

  // Find entity at a tile position
  const getEntityAtTile = useCallback(
    (tileX: number, tileY: number): number | null => {
      if (!engine) return null;
      const entities = engine.ecs.getAllEntities();
      for (const entity of entities) {
        const pos = engine.ecs.getComponent<{ x: number; y: number }>(entity, 'Position');
        if (pos && pos.x === tileX && pos.y === tileY) {
          return entity;
        }
      }
      return null;
    },
    [engine]
  );

  // Spawn entity from template
  const spawnEntity = useCallback(
    (tileX: number, tileY: number) => {
      if (!engine || !selectedTemplate) return;
      const template = entityTemplates.find((t) => t.name === selectedTemplate);
      if (!template) return;

      const entity = engine.ecs.createEntity();
      for (const comp of template.components) {
        const data = { ...comp.defaults };
        // Override position with click location
        if (comp.type === 'Position') {
          data.x = tileX;
          data.y = tileY;
        }
        try {
          engine.ecs.addComponent(entity, comp.type, data);
        } catch {
          // Component type not defined - skip silently
        }
      }
      setProject({ modified: true });
      selectEntity(entity);
    },
    [engine, entityTemplates, selectedTemplate, setProject, selectEntity]
  );

  // Mouse down: start painting or handle entity placement/selection
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!engine || mode !== 'edit') return;
      if (e.button !== 0 && e.button !== 2) return; // Only left or right click

      const rect = e.currentTarget.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldPos = engine.camera.screenToWorld(screenX, screenY);
      const tilePos = engine.camera.worldToTile(worldPos.x, worldPos.y, TILE_SIZE);

      // Entity mode: place or select
      if (tool === 'entity') {
        if (e.button === 0) {
          // Left click: place entity or select existing
          const existingEntity = getEntityAtTile(tilePos.x, tilePos.y);
          if (existingEntity !== null) {
            selectEntity(existingEntity);
          } else if (selectedTemplate) {
            spawnEntity(tilePos.x, tilePos.y);
          }
        }
        return;
      }

      // Paint/Erase mode: existing tile painting logic
      isPaintingRef.current = true;
      strokeChangesRef.current = [];
      paintedTilesRef.current.clear();

      // Right-click forces erase mode for this stroke
      if (e.button === 2) {
        const tiles = getBrushTiles(tilePos.x, tilePos.y, brushSize, brushShape);
        for (const tile of tiles) {
          if (!engine.tileMap.isInBounds(tile.x, tile.y)) continue;
          const tileKey = `${tile.x},${tile.y}`;
          paintedTilesRef.current.add(tileKey);

          const before = captureTileState(tile.x, tile.y);
          const building = engine.tileMap.getBuilding(tile.x, tile.y);
          if (building) {
            engine.tileMap.clearBuilding(tile.x, tile.y);
          } else {
            engine.tileMap.setTerrain(tile.x, tile.y, 'grass');
          }
          const after = captureTileState(tile.x, tile.y);

          if (before.terrainName !== after.terrainName || before.buildingName !== after.buildingName) {
            strokeChangesRef.current.push({ x: tile.x, y: tile.y, before, after });
          }
        }
      } else {
        paintBrush(tilePos.x, tilePos.y);
      }
    },
    [engine, mode, tool, brushSize, brushShape, captureTileState, paintBrush, getEntityAtTile, selectEntity, selectedTemplate, spawnEntity]
  );

  // Mouse move: continue painting if dragging
  const handleMouseMovePaint = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!engine) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldPos = engine.camera.screenToWorld(screenX, screenY);
      const tilePos = engine.camera.worldToTile(worldPos.x, worldPos.y, TILE_SIZE);

      setHoverTile(tilePos);
      setMouseWorldPos(worldPos);

      if (isPaintingRef.current && mode === 'edit') {
        // Check if right button is held (for erase)
        if (e.buttons === 2) {
          const tiles = getBrushTiles(tilePos.x, tilePos.y, brushSize, brushShape);
          for (const tile of tiles) {
            if (!engine.tileMap.isInBounds(tile.x, tile.y)) continue;
            const tileKey = `${tile.x},${tile.y}`;
            if (paintedTilesRef.current.has(tileKey)) continue;
            paintedTilesRef.current.add(tileKey);

            const before = captureTileState(tile.x, tile.y);
            const building = engine.tileMap.getBuilding(tile.x, tile.y);
            if (building) {
              engine.tileMap.clearBuilding(tile.x, tile.y);
            } else {
              engine.tileMap.setTerrain(tile.x, tile.y, 'grass');
            }
            const after = captureTileState(tile.x, tile.y);

            if (before.terrainName !== after.terrainName || before.buildingName !== after.buildingName) {
              strokeChangesRef.current.push({ x: tile.x, y: tile.y, before, after });
            }
          }
        } else {
          paintBrush(tilePos.x, tilePos.y);
        }
      }
    },
    [engine, mode, brushSize, brushShape, captureTileState, paintBrush, setMouseWorldPos]
  );

  // Mouse up: commit stroke
  const handleMouseUp = useCallback(() => {
    if (isPaintingRef.current) {
      isPaintingRef.current = false;
      commitStroke();
    }
  }, [commitStroke]);

  // Mouse leave: commit stroke and clear hover
  const handleMouseLeavePaint = useCallback(() => {
    setMouseWorldPos(null);
    setHoverTile(null);
    if (isPaintingRef.current) {
      isPaintingRef.current = false;
      commitStroke();
    }
  }, [setMouseWorldPos, commitStroke]);

  // Prevent context menu on right-click
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

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

  // Handle keyboard controls for camera panning and shortcuts
  useEffect(() => {
    if (!engine) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const panSpeed = 16;

      // Undo/Redo
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          undoActions.undo(engine);
          return;
        }
        if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
          e.preventDefault();
          undoActions.redo(engine);
          return;
        }
      }

      // Brush size shortcuts
      if (e.key === '1') {
        setBrushSize(1);
        return;
      }
      if (e.key === '2') {
        setBrushSize(3);
        return;
      }
      if (e.key === '3') {
        setBrushSize(5);
        return;
      }

      // Entity mode shortcut
      if (e.key === 'e' || e.key === 'E') {
        setTool('entity');
        return;
      }

      // Paint mode shortcut
      if (e.key === 'p' || e.key === 'P') {
        setTool('paint');
        return;
      }

      // Erase mode shortcut
      if (e.key === 'x' || e.key === 'X') {
        setTool('erase');
        return;
      }

      // Deselect entity
      if (e.key === 'Escape') {
        selectEntity(null);
        return;
      }

      // Delete selected entity
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedEntityId !== null) {
          e.preventDefault();
          deleteSelectedEntity();
          return;
        }
      }

      // Camera panning
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
  }, [engine, setProject, undoActions, tool, setTool, setBrushSize, selectEntity, deleteSelectedEntity, selectedEntityId]);

  // Trigger draw frame for edit mode
  useEffect(() => {
    if (!engine || mode !== 'edit') return;

    let animationId: number;
    const drawFrame = () => {
      // In edit mode, we still need to render even though the game loop is stopped
      engine.loop.drawOnce?.();

      const camera = engine.camera;
      const renderer = engine.renderer;

      // Draw selection highlight
      if (selectedEntityId !== null && engine.ecs.isAlive(selectedEntityId)) {
        const pos = engine.ecs.getComponent<{ x: number; y: number }>(selectedEntityId, 'Position');
        if (pos) {
          const screenPos = camera.worldToScreen(pos.x * TILE_SIZE, pos.y * TILE_SIZE);
          const size = TILE_SIZE * camera.zoom;
          renderer.strokeRectScreen(screenPos.x, screenPos.y, size, size, '#fbbf24');
        }
      }

      // Draw brush/entity preview on top
      if (hoverTile) {
        const tileMap = engine.tileMap;

        if (tool === 'entity' && selectedTemplate) {
          // Entity placement preview
          const screenPos = camera.worldToScreen(hoverTile.x * TILE_SIZE, hoverTile.y * TILE_SIZE);
          const size = TILE_SIZE * camera.zoom;
          renderer.drawRectScreen(screenPos.x, screenPos.y, size, size, 'rgba(34, 197, 94, 0.5)');
        } else if (tool !== 'entity') {
          // Tile brush preview
          const previewTiles = getBrushTiles(hoverTile.x, hoverTile.y, brushSize, brushShape);
          const previewColor = tool === 'erase' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(79, 70, 229, 0.5)';

          for (const tile of previewTiles) {
            if (!tileMap.isInBounds(tile.x, tile.y)) continue;

            const screenPos = camera.worldToScreen(tile.x * TILE_SIZE, tile.y * TILE_SIZE);
            const size = TILE_SIZE * camera.zoom;

            renderer.drawRectScreen(screenPos.x, screenPos.y, size, size, previewColor);
          }
        }
      }

      animationId = requestAnimationFrame(drawFrame);
    };

    drawFrame();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [engine, mode, hoverTile, brushSize, brushShape, tool, selectedEntityId, selectedTemplate]);

  return (
    <div ref={containerRef} className="w-full h-full bg-editor-bg overflow-hidden">
      <canvas
        ref={canvasRef}
        className="block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMovePaint}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeavePaint}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      />
    </div>
  );
}
