import { GameLoop } from './engine/core/GameLoop';
import { Input } from './engine/input/Input';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const loop = new GameLoop(20);
const input = new Input();

let x = 400;
let y = 300;
const speed = 200; // pixels per second

loop.onTick((dt) => {
  // Movement based on input
  if (input.isKeyDown('ArrowUp') || input.isKeyDown('KeyW')) {
    y -= speed * dt;
  }
  if (input.isKeyDown('ArrowDown') || input.isKeyDown('KeyS')) {
    y += speed * dt;
  }
  if (input.isKeyDown('ArrowLeft') || input.isKeyDown('KeyA')) {
    x -= speed * dt;
  }
  if (input.isKeyDown('ArrowRight') || input.isKeyDown('KeyD')) {
    x += speed * dt;
  }

  // Keep in bounds
  x = Math.max(16, Math.min(canvas.width - 16, x));
  y = Math.max(16, Math.min(canvas.height - 16, y));

  // Clear per-tick input state
  input.update();
});

loop.onDraw(() => {
  // Clear
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw player square
  ctx.fillStyle = '#e94560';
  ctx.fillRect(x - 16, y - 16, 32, 32);
});

loop.start();
console.log('Emergence Engine running... Use arrow keys or WASD to move.');
