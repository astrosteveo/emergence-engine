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

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Input } from './Input';

describe('Input', () => {
  let input: Input;

  beforeEach(() => {
    input = new Input();
  });

  afterEach(() => {
    input.destroy();
  });

  function pressKey(code: string): void {
    window.dispatchEvent(new KeyboardEvent('keydown', { code }));
  }

  function releaseKey(code: string): void {
    window.dispatchEvent(new KeyboardEvent('keyup', { code }));
  }

  it('should detect key down', () => {
    expect(input.isKeyDown('KeyA')).toBe(false);

    pressKey('KeyA');
    expect(input.isKeyDown('KeyA')).toBe(true);
  });

  it('should detect key up', () => {
    pressKey('KeyA');
    expect(input.isKeyDown('KeyA')).toBe(true);

    releaseKey('KeyA');
    expect(input.isKeyDown('KeyA')).toBe(false);
  });

  it('should detect key pressed only on first frame', () => {
    expect(input.isKeyPressed('KeyA')).toBe(false);

    pressKey('KeyA');
    expect(input.isKeyPressed('KeyA')).toBe(true);

    // After update, isKeyPressed should be false
    input.update();
    expect(input.isKeyPressed('KeyA')).toBe(false);

    // Key is still held down
    expect(input.isKeyDown('KeyA')).toBe(true);
  });

  it('should detect key released only on release frame', () => {
    pressKey('KeyA');
    input.update();

    expect(input.isKeyReleased('KeyA')).toBe(false);

    releaseKey('KeyA');
    expect(input.isKeyReleased('KeyA')).toBe(true);

    // After update, isKeyReleased should be false
    input.update();
    expect(input.isKeyReleased('KeyA')).toBe(false);
  });

  it('should not trigger isKeyPressed on held key', () => {
    pressKey('KeyA');
    input.update();

    // Simulate another keydown event while key is held
    pressKey('KeyA');
    expect(input.isKeyPressed('KeyA')).toBe(false);
  });

  it('should track multiple keys independently', () => {
    pressKey('KeyA');
    pressKey('KeyB');

    expect(input.isKeyDown('KeyA')).toBe(true);
    expect(input.isKeyDown('KeyB')).toBe(true);
    expect(input.isKeyDown('KeyC')).toBe(false);

    releaseKey('KeyA');
    expect(input.isKeyDown('KeyA')).toBe(false);
    expect(input.isKeyDown('KeyB')).toBe(true);
  });

  it('should handle arrow keys', () => {
    pressKey('ArrowUp');
    expect(input.isKeyDown('ArrowUp')).toBe(true);

    pressKey('ArrowDown');
    expect(input.isKeyDown('ArrowDown')).toBe(true);

    pressKey('ArrowLeft');
    expect(input.isKeyDown('ArrowLeft')).toBe(true);

    pressKey('ArrowRight');
    expect(input.isKeyDown('ArrowRight')).toBe(true);
  });

  it('should clear pressed/released state on update', () => {
    pressKey('KeyA');
    releaseKey('KeyB');

    expect(input.isKeyPressed('KeyA')).toBe(true);
    expect(input.isKeyReleased('KeyB')).toBe(true);

    input.update();

    expect(input.isKeyPressed('KeyA')).toBe(false);
    expect(input.isKeyReleased('KeyB')).toBe(false);
  });

  describe('Mouse input', () => {
    function moveMouse(x: number, y: number): void {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y }));
    }

    function mouseDown(button: number): void {
      window.dispatchEvent(new MouseEvent('mousedown', { button }));
    }

    function mouseUp(button: number): void {
      window.dispatchEvent(new MouseEvent('mouseup', { button }));
    }

    it('should track mouse position', () => {
      moveMouse(100, 200);
      expect(input.mouseX).toBe(100);
      expect(input.mouseY).toBe(200);
    });

    it('should detect mouse button down', () => {
      expect(input.isMouseDown('left')).toBe(false);
      mouseDown(0);
      expect(input.isMouseDown('left')).toBe(true);
    });

    it('should detect mouse button up', () => {
      mouseDown(0);
      expect(input.isMouseDown('left')).toBe(true);
      mouseUp(0);
      expect(input.isMouseDown('left')).toBe(false);
    });

    it('should detect mouse pressed only on first frame', () => {
      expect(input.isMousePressed('left')).toBe(false);
      mouseDown(0);
      expect(input.isMousePressed('left')).toBe(true);
      input.update();
      expect(input.isMousePressed('left')).toBe(false);
      expect(input.isMouseDown('left')).toBe(true);
    });

    it('should detect mouse released only on release frame', () => {
      mouseDown(0);
      input.update();
      expect(input.isMouseReleased('left')).toBe(false);
      mouseUp(0);
      expect(input.isMouseReleased('left')).toBe(true);
      input.update();
      expect(input.isMouseReleased('left')).toBe(false);
    });

    it('should track right and middle mouse buttons', () => {
      mouseDown(2); // right
      expect(input.isMouseDown('right')).toBe(true);
      mouseDown(1); // middle
      expect(input.isMouseDown('middle')).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should stop receiving events after destroy', () => {
      const testInput = new Input();
      testInput.destroy();

      // Events after destroy should not be tracked
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ' }));
      expect(testInput.isKeyDown('KeyZ')).toBe(false);

      window.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
      expect(testInput.isMouseDown('left')).toBe(false);
    });
  });
});
