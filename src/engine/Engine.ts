import { GameLoop } from './core/GameLoop';
import { Input } from './input/Input';
import { Renderer } from './render/Renderer';

export interface EngineConfig {
  canvas: HTMLCanvasElement;
  tickRate?: number;
}

export class Engine {
  readonly loop: GameLoop;
  readonly input: Input;
  readonly renderer: Renderer;

  constructor(config: EngineConfig) {
    this.loop = new GameLoop(config.tickRate ?? 20);
    this.input = new Input();
    this.renderer = new Renderer(config.canvas);

    // Auto-update input at end of each tick
    this.loop.onTick(() => {
      this.input.update();
    });
  }

  onTick(callback: (dt: number) => void): void {
    // Insert before the input.update() call
    this.loop.onTick(callback);
  }

  onDraw(callback: () => void): void {
    this.loop.onDraw(callback);
  }

  start(): void {
    this.loop.start();
  }

  stop(): void {
    this.loop.stop();
  }

  setSpeed(speed: number): void {
    this.loop.setSpeed(speed);
  }
}
