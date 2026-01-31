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

import type { EmergenceSaveFile } from 'emergence-engine';

const FILE_EXTENSION = '.emergence.json';

/**
 * Exports a save file to a downloadable JSON file.
 */
export async function exportToFile(save: EmergenceSaveFile): Promise<void> {
  const json = JSON.stringify(save, null, 2);
  const blob = new Blob([json], { type: 'application/json' });

  // Create a safe filename
  const safeName = save.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const filename = `${safeName}${FILE_EXTENSION}`;

  // Use modern File System Access API if available
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as unknown as {
        showSaveFilePicker: (options: {
          suggestedName: string;
          types: { description: string; accept: Record<string, string[]> }[];
        }) => Promise<FileSystemFileHandle>;
      }).showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'Emergence Project',
            accept: { 'application/json': ['.emergence.json', '.json'] },
          },
        ],
      });

      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      // User cancelled or API not available
      if ((err as Error).name === 'AbortError') {
        return;
      }
      // Fall through to legacy download
    }
  }

  // Fallback: create a download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Imports a save file from user-selected file.
 */
export async function importFromFile(): Promise<EmergenceSaveFile | null> {
  // Use modern File System Access API if available
  if ('showOpenFilePicker' in window) {
    try {
      const [handle] = await (window as unknown as {
        showOpenFilePicker: (options: {
          types: { description: string; accept: Record<string, string[]> }[];
          multiple: boolean;
        }) => Promise<FileSystemFileHandle[]>;
      }).showOpenFilePicker({
        types: [
          {
            description: 'Emergence Project',
            accept: { 'application/json': ['.emergence.json', '.json'] },
          },
        ],
        multiple: false,
      });

      const file = await handle.getFile();
      const text = await file.text();
      return validateAndParseFile(text);
    } catch (err) {
      // User cancelled
      if ((err as Error).name === 'AbortError') {
        return null;
      }
      throw err;
    }
  }

  // Fallback: use file input
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.emergence.json,.json';

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      try {
        const text = await file.text();
        const save = validateAndParseFile(text);
        resolve(save);
      } catch (err) {
        reject(err);
      }
    };

    input.oncancel = () => resolve(null);
    input.click();
  });
}

/**
 * Validates and parses a JSON string as an EmergenceSaveFile.
 */
function validateAndParseFile(text: string): EmergenceSaveFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON file');
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Invalid save file: not an object');
  }

  const save = data as Record<string, unknown>;

  if (save.version !== 1) {
    throw new Error(`Unsupported save file version: ${save.version}`);
  }

  if (typeof save.name !== 'string') {
    throw new Error('Invalid save file: missing name');
  }

  if (!save.tileMap || typeof save.tileMap !== 'object') {
    throw new Error('Invalid save file: missing tileMap');
  }

  if (!save.ecs || typeof save.ecs !== 'object') {
    throw new Error('Invalid save file: missing ecs');
  }

  if (!save.camera || typeof save.camera !== 'object') {
    throw new Error('Invalid save file: missing camera');
  }

  return save as unknown as EmergenceSaveFile;
}
