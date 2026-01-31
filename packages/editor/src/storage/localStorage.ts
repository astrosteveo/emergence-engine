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

const STORAGE_PREFIX = 'emergence-editor:';
const PROJECTS_INDEX_KEY = `${STORAGE_PREFIX}projects`;

/**
 * Saves a project to localStorage.
 */
export function saveToLocalStorage(name: string, save: EmergenceSaveFile): void {
  const key = `${STORAGE_PREFIX}project:${name}`;
  const json = JSON.stringify(save);

  try {
    localStorage.setItem(key, json);
    updateProjectIndex(name);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      throw new Error('Storage quota exceeded. Try deleting old projects.');
    }
    throw e;
  }
}

/**
 * Loads a project from localStorage.
 */
export function loadFromLocalStorage(name: string): EmergenceSaveFile | null {
  const key = `${STORAGE_PREFIX}project:${name}`;
  const json = localStorage.getItem(key);

  if (!json) return null;

  try {
    return JSON.parse(json) as EmergenceSaveFile;
  } catch {
    console.error(`Failed to parse project "${name}"`);
    return null;
  }
}

/**
 * Lists all saved projects.
 */
export function listSavedProjects(): string[] {
  const indexJson = localStorage.getItem(PROJECTS_INDEX_KEY);
  if (!indexJson) return [];

  try {
    const projects = JSON.parse(indexJson) as string[];
    // Verify each project still exists
    return projects.filter((name) => {
      const key = `${STORAGE_PREFIX}project:${name}`;
      return localStorage.getItem(key) !== null;
    });
  } catch {
    return [];
  }
}

/**
 * Deletes a project from localStorage.
 */
export function deleteProject(name: string): void {
  const key = `${STORAGE_PREFIX}project:${name}`;
  localStorage.removeItem(key);

  // Update the index
  const projects = listSavedProjects().filter((n) => n !== name);
  localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify(projects));
}

/**
 * Adds a project name to the index.
 */
function updateProjectIndex(name: string): void {
  const projects = listSavedProjects();
  if (!projects.includes(name)) {
    projects.push(name);
    localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify(projects));
  }
}

/**
 * Checks if a project with the given name exists.
 */
export function projectExists(name: string): boolean {
  const key = `${STORAGE_PREFIX}project:${name}`;
  return localStorage.getItem(key) !== null;
}

/**
 * Gets the approximate size of all saved projects in bytes.
 */
export function getStorageUsage(): number {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      const value = localStorage.getItem(key);
      if (value) {
        total += key.length + value.length;
      }
    }
  }
  // Approximate: 2 bytes per character (UTF-16)
  return total * 2;
}
