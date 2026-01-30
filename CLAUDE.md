# Emergence Engine

2D game engine for simulation games. TypeScript + Vite + Canvas 2D.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # TypeScript check + Vite build
npm test             # Run tests once
npm run test:watch   # Tests in watch mode
npm run test:coverage # Tests with coverage report
```

## Architecture

```
src/
├── engine/           # Core engine (importable API)
│   ├── core/         # GameLoop (fixed timestep)
│   ├── input/        # Keyboard polling
│   ├── render/       # Canvas 2D primitives
│   ├── Engine.ts     # Unified entry point
│   └── index.ts      # Public exports
└── main.ts           # Demo application
```

## Code Style

- GPL-3.0 license headers on all source files
- Colocated tests (`*.test.ts` next to source)
- Strict TypeScript (noUnusedLocals, noUnusedParameters)

## Testing

- Vitest with jsdom environment
- Mock `requestAnimationFrame` and `performance.now()` for GameLoop tests
- Mock canvas context for Renderer tests

## Gotchas

- Test files excluded from `tsconfig.json` to avoid build errors (Vitest handles its own TS)
- GameLoop uses fixed timestep (20 ticks/sec default) with variable rendering
- Input.update() must be called each tick to clear pressed/released state
