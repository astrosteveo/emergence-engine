import { GameLoop } from './engine/core/GameLoop';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const loop = new GameLoop(20); // 20 ticks per second

let x = 400;
let y = 300;

loop.onTick((dt) => {
  // Simulation: move slightly each tick
  x += 10 * dt;
  if (x > canvas.width) x = 0;
});

loop.onDraw(() => {
  // Clear
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw a square
  ctx.fillStyle = '#e94560';
  ctx.fillRect(x - 16, y - 16, 32, 32);
});

loop.start();
console.log('Emergence Engine running...');
