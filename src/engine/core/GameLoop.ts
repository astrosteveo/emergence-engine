export type TickCallback = (dt: number) => void;
export type DrawCallback = () => void;

export class GameLoop {
  private tickRate: number;
  private tickDuration: number;
  private accumulator: number = 0;
  private lastTime: number = 0;
  private running: boolean = false;
  private speed: number = 1;

  private tickCallbacks: TickCallback[] = [];
  private drawCallbacks: DrawCallback[] = [];

  constructor(tickRate: number = 20) {
    this.tickRate = tickRate;
    this.tickDuration = 1000 / tickRate;
  }

  onTick(callback: TickCallback): void {
    this.tickCallbacks.push(callback);
  }

  onDraw(callback: DrawCallback): void {
    this.drawCallbacks.push(callback);
  }

  setSpeed(speed: number): void {
    this.speed = Math.max(0, speed);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  stop(): void {
    this.running = false;
  }

  private loop(currentTime: number): void {
    if (!this.running) return;

    const delta = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.accumulator += delta * this.speed;

    // Fixed timestep simulation
    const dt = this.tickDuration / 1000; // Convert to seconds
    while (this.accumulator >= this.tickDuration) {
      for (const callback of this.tickCallbacks) {
        callback(dt);
      }
      this.accumulator -= this.tickDuration;
    }

    // Render every frame
    for (const callback of this.drawCallbacks) {
      callback();
    }

    requestAnimationFrame((t) => this.loop(t));
  }
}
