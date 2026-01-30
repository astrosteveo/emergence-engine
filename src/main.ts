import { Engine } from './engine';

const canvas = document.getElementById('game') as HTMLCanvasElement;

const engine = new Engine({ canvas, tickRate: 20 });

let x = 400;
let y = 300;
const speed = 200;

engine.onTick((dt) => {
  const { input } = engine;

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

  const { renderer } = engine;
  x = Math.max(16, Math.min(renderer.width - 16, x));
  y = Math.max(16, Math.min(renderer.height - 16, y));
});

engine.onDraw(() => {
  const { renderer } = engine;
  renderer.clear();
  renderer.drawRectCentered(x, y, 32, 32, '#e94560');
  renderer.drawText('Use arrow keys or WASD to move', 10, 30, { color: '#666' });
  renderer.drawText(`Position: (${Math.round(x)}, ${Math.round(y)})`, 10, 50, { color: '#666' });
});

engine.start();
console.log('Emergence Engine running...');
