/*
 * This file is part of Emergence Engine.
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

export type MouseButton = 'left' | 'right' | 'middle';

export class Input {
  private keysDown: Set<string> = new Set();
  private keysPressed: Set<string> = new Set();
  private keysReleased: Set<string> = new Set();

  // Mouse state
  mouseX = 0;
  mouseY = 0;
  private mouseButtonsDown: Set<MouseButton> = new Set();
  private mouseButtonsPressed: Set<MouseButton> = new Set();
  private mouseButtonsReleased: Set<MouseButton> = new Set();

  private targetElement: HTMLElement | null = null;

  // Bound handlers for cleanup
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;

  constructor(targetElement?: HTMLElement) {
    this.targetElement = targetElement ?? null;

    // Bind handlers so they can be removed later
    this.boundKeyDown = (e) => this.handleKeyDown(e);
    this.boundKeyUp = (e) => this.handleKeyUp(e);
    this.boundMouseMove = (e) => this.handleMouseMove(e);
    this.boundMouseDown = (e) => this.handleMouseDown(e);
    this.boundMouseUp = (e) => this.handleMouseUp(e);

    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    window.addEventListener('mousemove', this.boundMouseMove);
    window.addEventListener('mousedown', this.boundMouseDown);
    window.addEventListener('mouseup', this.boundMouseUp);
  }

  /** Remove all event listeners. Call when destroying the Input instance. */
  destroy(): void {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    window.removeEventListener('mousemove', this.boundMouseMove);
    window.removeEventListener('mousedown', this.boundMouseDown);
    window.removeEventListener('mouseup', this.boundMouseUp);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.keysDown.has(e.code)) {
      this.keysPressed.add(e.code);
    }
    this.keysDown.add(e.code);
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keysDown.delete(e.code);
    this.keysReleased.add(e.code);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.targetElement) {
      const rect = this.targetElement.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    } else {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    }
  }

  private buttonFromEvent(e: MouseEvent): MouseButton {
    if (e.button === 2) return 'right';
    if (e.button === 1) return 'middle';
    return 'left';
  }

  private handleMouseDown(e: MouseEvent): void {
    const button = this.buttonFromEvent(e);
    if (!this.mouseButtonsDown.has(button)) {
      this.mouseButtonsPressed.add(button);
    }
    this.mouseButtonsDown.add(button);
  }

  private handleMouseUp(e: MouseEvent): void {
    const button = this.buttonFromEvent(e);
    this.mouseButtonsDown.delete(button);
    this.mouseButtonsReleased.add(button);
  }

  /** Call at end of each tick to clear per-frame state */
  update(): void {
    this.keysPressed.clear();
    this.keysReleased.clear();
    this.mouseButtonsPressed.clear();
    this.mouseButtonsReleased.clear();
  }

  /** True if key is currently held down */
  isKeyDown(code: string): boolean {
    return this.keysDown.has(code);
  }

  /** True only on the tick the key was first pressed */
  isKeyPressed(code: string): boolean {
    return this.keysPressed.has(code);
  }

  /** True only on the tick the key was released */
  isKeyReleased(code: string): boolean {
    return this.keysReleased.has(code);
  }

  /** True if mouse button is currently held down */
  isMouseDown(button: MouseButton): boolean {
    return this.mouseButtonsDown.has(button);
  }

  /** True only on the tick the mouse button was first pressed */
  isMousePressed(button: MouseButton): boolean {
    return this.mouseButtonsPressed.has(button);
  }

  /** True only on the tick the mouse button was released */
  isMouseReleased(button: MouseButton): boolean {
    return this.mouseButtonsReleased.has(button);
  }
}
