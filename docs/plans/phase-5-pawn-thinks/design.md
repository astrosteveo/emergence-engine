# Phase 5: Pawn Thinks

## Overview

Convert the player-controlled pawn into an autonomous agent. The pawn evaluates its needs and available tasks, picks the best action, and executes it. This establishes the utility AI foundation for RimWorld-style gameplay.

## Goals

1. **Utility AI framework** in the engine - action definition, scoring, selection
2. **Two actions** to prove the system: `eat` and `wander`
3. **Food items** scattered at world generation
4. **Autonomous pawn** that keeps itself alive without player input
5. **Task label UI** showing current action
6. **Debug overlay** showing action scores (F3 toggle, on by default in dev)

## Non-Goals

- Player task designation (marking trees for harvest, etc.)
- Priority system for task types
- Multiple pawns
- Food regrowth or farming
- Needs beyond hunger (rest, social, etc.)

---

## Design

### 1. Utility AI Framework

**Location:** `packages/engine/src/ai/`

**Core concepts:**

| Concept | Description |
|---------|-------------|
| **Action** | Something a pawn can do (eat, wander). Has `canExecute`, `score`, and `execute` methods. |
| **ActionRegistry** | Stores all defined actions. Lives on the engine as `engine.ai`. |
| **Evaluation** | Given an entity, score all actions, return the highest-scoring valid one. |

**API:**

```typescript
// Define an action (in Colony's game code)
engine.ai.defineAction('eat', {
  canExecute(entity, context) {
    // Is there food on the map?
    return context.findNearest(entity, 'Food') !== null;
  },
  score(entity, context) {
    // Higher hunger = higher score
    const hunger = context.ecs.getComponent(entity, 'Hunger');
    return hunger.current / hunger.max; // 0 to 1
  },
  execute(entity, context) {
    // Set components to trigger eating behavior
    const food = context.findNearest(entity, 'Food');
    const foodPos = context.ecs.getComponent(food, 'Position');
    context.ecs.addComponent(entity, 'PathTarget', { x: foodPos.x, y: foodPos.y });
    context.ecs.addComponent(entity, 'CurrentTask', { type: 'eat', target: food });
  }
});

// Evaluate and pick best action
const action = engine.ai.pickBest(pawn); // Returns action name or null
```

**The `context` object** provides access to ECS, spatial queries, and world state without actions needing direct engine references.

### 2. Components

**New components:**

```typescript
// What the pawn is currently doing
'CurrentTask': {
  action: string,      // 'eat', 'wander'
  target: Entity | null // Food entity, or null for wander
}

// Food item data
'Food': {
  nutrition: number    // How much hunger it satisfies
}

// AI state tracking
'AIState': {
  lastHungerPercent: number,  // Track for threshold detection
  needsReeval: boolean        // Flag set by other systems
}
```

### 3. Action Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│ AIDecisionSystem (runs when re-evaluation needed)           │
├─────────────────────────────────────────────────────────────┤
│ 1. Check: should we re-evaluate?                            │
│    - No CurrentTask, OR                                     │
│    - Task complete (no PathFollow + at destination), OR     │
│    - Hunger crossed threshold (e.g., went above 50%)        │
│                                                             │
│ 2. If yes: action = engine.ai.pickBest(entity)              │
│                                                             │
│ 3. action.execute() sets:                                   │
│    - PathTarget (where to go)                               │
│    - CurrentTask (what we're doing)                         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ PathfindingSystem + PathFollowSystem (existing from Phase 4)│
│ → Pawn walks to target                                      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ TaskExecutionSystem (runs when pawn arrives)                │
├─────────────────────────────────────────────────────────────┤
│ If CurrentTask.action === 'eat' AND no PathFollow:          │
│   - Get Food component from target                          │
│   - Reduce pawn's hunger by food.nutrition                  │
│   - Destroy food entity                                     │
│   - Remove CurrentTask (triggers re-evaluation next tick)   │
└─────────────────────────────────────────────────────────────┘
```

**Wander action:** Sets `PathTarget` to a random nearby walkable tile. No target entity. When arrived, `CurrentTask` is cleared, triggering re-evaluation.

### 4. Re-evaluation Triggers

The `AIDecisionSystem` tracks state and triggers re-evaluation when:

| Trigger | How it's detected |
|---------|-------------------|
| **No current task** | Entity has no `CurrentTask` component |
| **Task complete** | Has `CurrentTask` but no `PathFollow` and no `PathTarget` |
| **Hunger threshold crossed** | Hunger went from below 50% to above 50% |
| **Task impossible** | Target entity no longer exists (food was eaten) |

**Threshold detection:**

```typescript
// In AIDecisionSystem
const hunger = ecs.getComponent(entity, 'Hunger');
const aiState = ecs.getComponent(entity, 'AIState');
const currentPercent = hunger.current / hunger.max;

// Crossed 50% threshold going up?
if (aiState.lastHungerPercent < 0.5 && currentPercent >= 0.5) {
  aiState.needsReeval = true;
}
aiState.lastHungerPercent = currentPercent;
```

### 5. Food Items

**Food as entities:**

Food items are entities with `Position`, `Food`, and `Sprite` components:

```typescript
const food = engine.ecs.createEntity();
engine.ecs.addComponent(food, 'Position', { x: 100, y: 50 });
engine.ecs.addComponent(food, 'Food', { nutrition: 30 });
engine.ecs.addComponent(food, 'Sprite', { width: 12, height: 12, color: '#4ade80' });
```

**Spawning at world generation:**

After terrain generation, scatter ~20 food items on walkable tiles:

```typescript
function spawnFood(engine: Engine, count: number) {
  const bounds = engine.tileMap.getBounds();
  let spawned = 0;

  while (spawned < count) {
    const x = randomInt(bounds.minX, bounds.maxX);
    const y = randomInt(bounds.minY, bounds.maxY);

    if (engine.tileMap.isWalkable(x, y)) {
      createFoodAt(engine, x * TILE_SIZE, y * TILE_SIZE);
      spawned++;
    }
  }
}
```

### 6. UI & Debug Overlay

**Task label in stats panel:**

```
┌─────────────────┐
│ Pawn Stats      │
│                 │
│ Task: Eating    │
│                 │
│ Hunger: ███░░░  │
│         45/100  │
└─────────────────┘
```

**Debug overlay (F3 toggle):**

```
┌─────────────────┐
│ AI Debug        │
│                 │
│ eat:    0.72 ◄  │
│ wander: 0.10    │
└─────────────────┘
```

- Arrow (◄) indicates the currently selected action
- Scores update in real-time
- Red text for actions where `canExecute` is false

**Toggle implementation:**

```typescript
let debugMode = import.meta.env.DEV; // On by default in dev

engine.input.onKeyPressed('F3', () => {
  debugMode = !debugMode;
});
```

---

## File Structure

**New files:**

```
packages/engine/src/
├── ai/
│   ├── Pathfinder.ts           # (existing)
│   ├── ActionRegistry.ts       # Action definition & storage
│   ├── ActionRegistry.test.ts
│   └── index.ts                # Export AI module

packages/colony/src/
├── actions/
│   ├── eat.ts                  # Eat action definition
│   └── wander.ts               # Wander action definition
└── main.ts                     # Updated with AI integration
```

**Modified files:**

```
packages/engine/src/
├── Engine.ts                   # Add engine.ai property
├── index.ts                    # Export ActionRegistry, Action type

packages/colony/src/
└── main.ts                     # Remove click-to-move, add AI systems
```

---

## Implementation Order

1. **ActionRegistry** - Engine-side framework (define, score, pick)
2. **Engine integration** - Wire up `engine.ai`
3. **Food component & spawning** - Create food entities at world gen
4. **Eat action** - Define in Colony using the framework
5. **Wander action** - Define in Colony
6. **AIDecisionSystem** - Re-evaluation logic
7. **TaskExecutionSystem** - Handle arrival and task completion
8. **UI updates** - Task label + debug overlay
9. **Remove click-to-move** - Pawn is now fully autonomous

**Parallelizable:** ActionRegistry and Food spawning are independent. Actions depend on registry. Systems depend on actions.

---

## Success Criteria

- Pawn wanders when not hungry
- Pawn finds and eats nearest food when hunger rises above 50%
- Hunger decreases by food's nutrition value when eaten
- Food entity is destroyed when consumed
- Pawn keeps itself alive until food runs out
- Player can see current task in stats panel
- F3 toggles debug overlay showing action scores

---

## Test Coverage

- `ActionRegistry.test.ts` - Define actions, score evaluation, pickBest selection
- Integration test - Pawn with hunger finds and eats food
