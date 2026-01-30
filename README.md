# Emergence Engine

A web-based 2D game engine for simulation games. Code-first, browser-native, minimal by design.

## Features

- **Game Loop** — Fixed timestep simulation with variable rendering
- **ECS** — Entity-Component-System with generational IDs
- **Input System** — Keyboard polling with press/release detection
- **Renderer** — Canvas 2D drawing primitives
- **Unified API** — Single `Engine` class ties it all together

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173
```

## Usage

```typescript
import { Engine } from './engine';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const engine = new Engine({ canvas, tickRate: 20 });

engine.onTick((dt) => {
  // Game logic runs at fixed timestep
  if (engine.input.isKeyDown('ArrowRight')) {
    player.x += speed * dt;
  }
});

engine.onDraw(() => {
  // Rendering runs every frame
  engine.renderer.clear();
  engine.renderer.drawRectCentered(player.x, player.y, 32, 32, '#e94560');
});

engine.start();
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |

## Architecture

```
src/
├── engine/
│   ├── core/
│   │   └── GameLoop.ts    # Fixed timestep loop
│   ├── ecs/
│   │   └── World.ts       # Entity-Component-System
│   ├── input/
│   │   └── Input.ts       # Keyboard polling
│   ├── render/
│   │   └── Renderer.ts    # Canvas 2D primitives
│   ├── Engine.ts          # Unified API
│   └── index.ts           # Public exports
└── main.ts                # Demo application
```

## Roadmap

- [x] Phase 1: Proof of Life — Game loop, input, renderer
- [x] Phase 2: ECS Foundation — Entity-Component-System
- [ ] Phase 3: World — Chunks, tiles, camera
- [ ] Phase 4: Pawns — Pathfinding, needs
- [ ] Phase 5: AI — Utility AI framework
- [ ] Phase 6: Factions — Multiple colonies, trade

## License

GPL-3.0 — See [LICENSE](LICENSE) for details.
