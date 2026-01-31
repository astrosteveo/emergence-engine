# Phase 6: Two Colonies (Trade)

## Goal

Prove autonomous trade works via caravans. A pawn from one colony physically carries food to another colony and returns home. The decision to trade is emergent - driven by Utility AI evaluating surplus, deficit, and risk.

## Scope

### In Scope

- Faction system (tag-based, all neutral)
- Stockpiles (colony storage)
- Territory (radius-based from stockpile)
- Pawn memory (knows visited colonies, decays over time)
- Caravan action (round trip: pickup → travel → deliver → return)
- Imbalanced test scenario (rich colony vs poor colony)

### Out of Scope (Phase 7+)

- Faction relationships (allied, hostile)
- Organic territory claiming
- Production chain (gathering, cooking)
- Multiple resource types

## Data Model

### New Components

```typescript
// Which faction a pawn belongs to
Faction: { id: string }

// Pawn's carrying capacity and current load
Inventory: {
  capacity: number,      // max food units (e.g., 5)
  food: number           // current food carried
}

// Colony storage location
Stockpile: {
  factionId: string,
  food: number
}

// Territory claim on a tile (stored on tile, not entity)
Territory: { factionId: string }

// Pawn's knowledge of other colonies
ColonyMemory: {
  known: Array<{
    factionId: string,
    stockpilePosition: { x: number, y: number },
    lastSeenFood: number,
    ticksSinceVisit: number
  }>
}

// Current caravan mission (when running a caravan)
CaravanTask: {
  targetFactionId: string,
  targetStockpile: Entity,
  phase: 'pickup' | 'traveling-there' | 'dropoff' | 'returning'
}
```

### Modified Components

- `Hunger` - unchanged, but pawns can now eat from stockpiles

## Systems

### New Systems

#### MemoryDecaySystem

Each tick, increment `ticksSinceVisit` for all known colonies in each pawn's ColonyMemory. After threshold (e.g., 600 ticks = 30 seconds), knowledge becomes "stale" and less reliable for decision-making.

#### MemoryUpdateSystem

When a pawn is near a stockpile of another faction, update their ColonyMemory with current food levels and reset `ticksSinceVisit` to zero.

#### ProximitySignalSystem

When a pawn is within N tiles of a foreign stockpile that's low on food (below deficit threshold), they "hear" the need signal and can add/update that colony in their memory.

#### CaravanSystem

Handles the caravan state machine:

1. **pickup**: At home stockpile, transfer food from stockpile to pawn's inventory
2. **traveling-there**: Pathfind to target stockpile
3. **dropoff**: At target stockpile, transfer food from inventory to stockpile
4. **returning**: Pathfind home, then clear CaravanTask

### Modified Systems

- **TaskExecution** - extend to handle eating from stockpiles (reduce stockpile.food, reduce pawn's hunger)

## AI Actions

### Modified Actions

#### `eat` (expanded)

- **canExecute**: Returns true if loose food exists OR own faction's stockpile has food
- **score**: Based on hunger (unchanged: `hunger.current / hunger.max`)
- **execute**: Pathfind to nearest food source (loose food entity or stockpile), consume on arrival

### New Actions

#### `caravan`

- **canExecute**:
  - Own stockpile has surplus (food > threshold, e.g., 10)
  - Pawn knows at least one other colony (from memory)
  - That colony has deficit (lastSeenFood < threshold, e.g., 5)
  - Pawn not already on a caravan

- **score**:
  ```
  surplusFactor = (ownFood - surplusThreshold) / ownFood
  deficitFactor = 1 - (knownFood / deficitThreshold)
  hungerPenalty = 1 - (hunger * 0.8)

  score = surplusFactor * deficitFactor * hungerPenalty * 0.7
  ```
  The 0.7 cap ensures caravans rarely beat critical hunger (eat scores up to 1.0). The strong hunger penalty (0.8 multiplier) creates real risk - a pawn that pushes through hunger might starve mid-journey.

- **execute**: Set CaravanTask with phase `pickup`, pathfind to own stockpile

#### `explore` (optional but useful)

- **canExecute**: Always true
- **score**: Low baseline (0.15), slightly higher than wander (0.1)
- **execute**: Pathfind toward unexplored areas or known colony locations not visited recently

## Test Scenario

### World Setup

- Same 64×64 terrain as current (water, grass, stone)
- Two stockpiles placed on opposite sides of the map on walkable terrain
- No loose food on the map (forces reliance on stockpiles)

### Colony A (Rich) - Red Faction

- Stockpile at approximately (-20, 0)
- 3 pawns, all with `Faction: { id: 'red' }`
- Stockpile starts with 30 food
- Territory radius: 8 tiles

### Colony B (Poor) - Blue Faction

- Stockpile at approximately (+20, 0)
- 1 pawn with `Faction: { id: 'blue' }`
- Stockpile starts with 5 food
- Territory radius: 8 tiles

### Initial State

- Pawns start near their stockpiles
- Pawns have no memory of other colonies yet

### Expected Emergent Behavior

1. Blue pawn gets hungry, eats from stockpile, stockpile depletes
2. Red pawns eat occasionally, surplus remains high
3. A red pawn wanders/explores toward blue territory
4. Red pawn sees blue stockpile is low, updates memory
5. Red pawn returns home, caravan action now scores high
6. Red pawn picks up food, walks to blue stockpile, delivers, returns
7. Blue colony survives thanks to trade

## Implementation Notes

### Engine vs Colony

Following the monorepo principle: new primitives go in the engine, game-specific logic stays in Colony.

**Engine additions (`packages/engine/`):**
- Territory query utilities on TileMap (get/set faction ownership)

**Colony additions (`packages/colony/`):**
- All new components (Faction, Stockpile, ColonyMemory, CaravanTask, Inventory)
- All new systems (MemoryDecay, MemoryUpdate, ProximitySignal, Caravan)
- All new AI actions (caravan, explore)
- Modified eat action
- Test scenario setup

### Tuning Constants

```typescript
const TERRITORY_RADIUS = 8;        // tiles claimed around stockpile
const SURPLUS_THRESHOLD = 10;      // food above this = surplus
const DEFICIT_THRESHOLD = 5;       // food below this = need
const MEMORY_DECAY_TICKS = 600;    // ~30 sec at 20 ticks/sec
const PROXIMITY_SIGNAL_RANGE = 12; // tiles to "hear" need signal
const PAWN_CARRY_CAPACITY = 5;     // food units per trip
```

### Debug UI Additions

- Show faction colors on pawns
- Show stockpile food counts
- Show territory boundaries (optional toggle)
- Show pawn memory state in debug panel

## Success Criteria

Blue colony survives because red pawns autonomously discover their need and deliver food via caravan.

## Summary

| Element | Approach |
|---------|----------|
| Factions | Tag-based, all neutral |
| Storage | Stockpiles + territory claims loose resources |
| Territory | Radius from stockpile (8 tiles) |
| Information | Exploration + memory decay + proximity signals |
| Trade | Caravan action (round trip), scored by surplus × deficit × hunger |
| Eating | AI chooses nearest source (loose food or stockpile) |
| Setup | Imbalanced: rich colony (3 pawns, 30 food) vs poor (1 pawn, 5 food) |
