import { GameLoop } from './engine/core/GameLoop';
import { Input } from './engine/input/Input';
import { Renderer } from './engine/render/Renderer';

const canvas = document.getElementById('game') as HTMLCanvasElement;

const loop = new GameLoop(20);
const input = new Input();
const renderer = new Renderer(canvas);

let x = 400;
let y = 300;
const speed = 200;

loop.onTick((dt) => {
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

  x = Math.max(16, Math.min(renderer.width - 16, x));
  y = Math.max(16, Math.min(renderer.height - 16, y));

  input.update();
});

loop.onDraw(() => {
  renderer.clear();
  renderer.drawRectCentered(x, y, 32, 32, '#e94560');
  renderer.drawText('Use arrow keys or WASD to move', 10, 30, { color: '#666' });
  renderer.drawText(`Position: (${Math.round(x)}, ${Math.round(y)})`, 10, 50, { color: '#666' });
});

loop.start();
console.log('Emergence Engine running...');
