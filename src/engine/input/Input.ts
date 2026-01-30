export class Input {
  private keysDown: Set<string> = new Set();
  private keysPressed: Set<string> = new Set();
  private keysReleased: Set<string> = new Set();

  constructor() {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
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

  /** Call at end of each tick to clear per-frame state */
  update(): void {
    this.keysPressed.clear();
    this.keysReleased.clear();
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
}
