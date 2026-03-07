---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9]
inputDocuments: [product-brief-schyrim-2026-03-04.md, PRD.md]
workflowType: 'architecture'
project_name: 'Schyrim'
user_name: 'Acydyca'
date: '2026-03-04'
---

# Architecture Decision Document — Schyrim

_This document captures all technical architecture decisions for the Schyrim AI-first CLI RPG._

---

## 1. Architecture Overview

### High-Level Architecture Pattern: Layered Architecture with Event Bus

Schyrim uses a **three-layer architecture** with a cross-cutting **event bus** for system-to-system communication:

```
┌──────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │  CLI Renderer │  │ Input Parser  │  │ AI Narrative UI  │  │
│  └──────────────┘  └───────────────┘  └──────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│                      SYSTEMS LAYER                           │
│  ┌──────────┐ ┌────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │Inventory │ │ Combat │ │Dialogue  │ │   Navigation     │  │
│  │ System   │ │ System │ │& Quests  │ │   System         │  │
│  ├──────────┤ ├────────┤ ├──────────┤ ├──────────────────┤  │
│  │ Economy  │ │Progres-│ │ Faction  │ │  AI Narrative    │  │
│  │ System   │ │ sion   │ │ System   │ │  Engine          │  │
│  └──────────┘ └────────┘ └──────────┘ └──────────────────┘  │
│                     ┌─────────────┐                          │
│                     │  Event Bus  │ (cross-cutting)          │
│                     └─────────────┘                          │
├──────────────────────────────────────────────────────────────┤
│                     CORE LAYER                               │
│  ┌─────────────┐ ┌──────────────┐ ┌────────────────────┐    │
│  │ Game State   │ │ Data Loader  │ │ Entity Manager     │    │
│  │ Manager      │ │ & Validator  │ │ (Items, NPCs, etc) │    │
│  └─────────────┘ └──────────────┘ └────────────────────┘    │
├──────────────────────────────────────────────────────────────┤
│                     DATA LAYER                               │
│  ┌─────────────┐ ┌──────────────┐ ┌────────────────────┐    │
│  │ JSON Content │ │ JSON Schemas │ │ YAML Config        │    │
│  │ (items,quests│ │ (validation) │ │ (settings,         │    │
│  │  locations)  │ │              │ │  difficulty)       │    │
│  └─────────────┘ └──────────────┘ └────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### Rationale

- **Layered** over ECS: While ECS excels in real-time simulations, Schyrim's turn-based/round-based CLI gameplay benefits more from clearly separated business logic modules. Layered architecture is simpler to understand, test, and extend for AI agents and human modders. The 8 game systems (inventory, combat, dialogue/quests, navigation, economy, progression, factions, AI narrative) map cleanly to service-style modules.
- **Event Bus** provides loose coupling between systems without direct module imports. When combat ends, the event bus notifies the progression system (XP gain), quest system (quest objective check), faction system (reputation change), and the AI narrative engine (scene description update).
- **Data Layer** is separate from code: all game content lives in JSON files validated by JSON Schemas. This is the key architectural decision enabling AI-first moddability.

---

## 2. Technology Stack

| Component | Technology | Rationale |
|---|---|---|
| **Language** | TypeScript 5.x | Type safety for complex game systems, excellent AI code-generation support, rich type inference for data schemas. |
| **Runtime** | Node.js 20+ | Async I/O for AI provider calls, large ecosystem, cross-platform CLI support. |
| **Build** | tsc (TypeScript compiler) | Simple, no bundler needed for CLI. Output to `dist/`. |
| **Test Framework** | Vitest | Fast, TypeScript-native, excellent mocking, compatible with Node.js. |
| **Data Format** | JSON (content), YAML (config) | JSON: machine-readable, AI-friendly, validatable. YAML: human-friendly for settings. |
| **Schema Validation** | Ajv (JSON Schema) | Industry-standard, fast, composable schemas. |
| **CLI Framework** | Inquirer.js + chalk | Inquirer for prompts/menus, chalk for ANSI colors. Minimal, well-maintained. |
| **LLM SDKs** | @google/generative-ai, groq-sdk, openai (for OpenRouter), custom HTTP for Cerebras/Ollama | Official SDKs where available; HTTP fallback for others. |
| **Package Manager** | npm | Standard, no additional tooling. |

---

## 3. Project Structure

```
schyrim/
├── _bmad/                          # BMAD Method configuration
├── _bmad-output/                   # BMAD planning + implementation artifacts
├── src/
│   ├── index.ts                    # Entry point
│   ├── core/
│   │   ├── game-state.ts           # Central game state manager
│   │   ├── data-loader.ts          # JSON data loading + schema validation
│   │   ├── event-bus.ts            # Typed event pub/sub system
│   │   ├── entity-manager.ts       # Registry for items, NPCs, locations, etc.
│   │   ├── save-manager.ts         # Save/load game state to/from JSON
│   │   ├── config-manager.ts       # YAML config loading (difficulty, immersion)
│   │   └── types/
│   │       ├── game-state.types.ts
│   │       ├── items.types.ts
│   │       ├── combat.types.ts
│   │       ├── dialogue.types.ts
│   │       ├── quest.types.ts
│   │       ├── location.types.ts
│   │       ├── character.types.ts
│   │       ├── faction.types.ts
│   │       ├── events.types.ts
│   │       └── ai.types.ts
│   ├── systems/
│   │   ├── inventory/
│   │   │   ├── inventory-system.ts
│   │   │   ├── loot-generator.ts
│   │   │   └── equipment-manager.ts
│   │   ├── combat/
│   │   │   ├── combat-system.ts
│   │   │   ├── damage-calculator.ts
│   │   │   ├── status-effects.ts
│   │   │   ├── stealth-system.ts
│   │   │   └── spell-system.ts
│   │   ├── dialogue/
│   │   │   ├── dialogue-engine.ts
│   │   │   └── condition-evaluator.ts
│   │   ├── quest/
│   │   │   ├── quest-system.ts
│   │   │   └── radiant-quest-generator.ts
│   │   ├── navigation/
│   │   │   ├── navigation-system.ts
│   │   │   ├── time-system.ts
│   │   │   └── weather-system.ts
│   │   ├── economy/
│   │   │   ├── economy-system.ts
│   │   │   ├── price-calculator.ts
│   │   │   └── vendor-manager.ts
│   │   ├── progression/
│   │   │   ├── skill-system.ts
│   │   │   ├── leveling-system.ts
│   │   │   └── perk-system.ts
│   │   ├── faction/
│   │   │   └── faction-system.ts
│   │   └── ai/
│   │       ├── ai-engine.ts            # Orchestrator for the AI narrative loop
│   │       ├── prompt-builder.ts       # Constructs structured prompts
│   │       ├── response-parser.ts      # Parses structured AI JSON responses
│   │       ├── action-validator.ts     # Validates AI-proposed actions
│   │       └── providers/
│   │           ├── provider-interface.ts
│   │           ├── gemini-provider.ts
│   │           ├── groq-provider.ts
│   │           ├── openrouter-provider.ts
│   │           ├── cerebras-provider.ts
│   │           └── ollama-provider.ts
│   └── presentation/
│       ├── cli-renderer.ts         # Main CLI output formatting
│       ├── input-handler.ts        # CLI input parsing + routing
│       ├── scene-display.ts        # AI scene rendering
│       ├── combat-display.ts       # Combat log formatting
│       ├── inventory-display.ts    # Inventory table formatting
│       ├── dialogue-display.ts     # Dialogue choice formatting
│       ├── character-display.ts    # Character sheet formatting
│       └── game-loop.ts           # Main game loop orchestration
├── data/
│   ├── schemas/                    # JSON Schema files for validation
│   │   ├── items.schema.json
│   │   ├── locations.schema.json
│   │   ├── quests.schema.json
│   │   ├── dialogue.schema.json
│   │   ├── factions.schema.json
│   │   ├── perks.schema.json
│   │   ├── spells.schema.json
│   │   ├── enemies.schema.json
│   │   ├── races.schema.json
│   │   └── leveled-lists.schema.json
│   ├── content/                    # Game content (the "mod data")
│   │   ├── items/
│   │   │   ├── weapons.json
│   │   │   ├── armor.json
│   │   │   ├── potions.json
│   │   │   ├── spell-tomes.json
│   │   │   └── misc.json
│   │   ├── locations/
│   │   │   ├── whiterun-hold.json
│   │   │   └── bleakfalls-barrow.json
│   │   ├── quests/
│   │   │   ├── main-quest-01.json
│   │   │   └── radiant-templates.json
│   │   ├── dialogue/
│   │   │   ├── innkeeper-dialogue.json
│   │   │   └── guard-dialogue.json
│   │   ├── factions/
│   │   │   └── factions.json
│   │   ├── enemies/
│   │   │   ├── bandits.json
│   │   │   └── draugr.json
│   │   ├── perks/
│   │   │   └── perk-trees.json
│   │   ├── spells/
│   │   │   └── destruction-spells.json
│   │   ├── races/
│   │   │   └── races.json
│   │   └── leveled-lists/
│   │       └── dungeon-loot.json
│   └── config/
│       ├── settings.yaml           # Player/developer settings
│       └── ai-config.yaml          # AI provider configuration (gitignored)
├── test/
│   ├── unit/
│   │   ├── core/
│   │   ├── systems/
│   │   │   ├── inventory.test.ts
│   │   │   ├── combat.test.ts
│   │   │   ├── price-calculator.test.ts
│   │   │   ├── dialogue-engine.test.ts
│   │   │   ├── quest-system.test.ts
│   │   │   ├── navigation.test.ts
│   │   │   ├── faction.test.ts
│   │   │   ├── skill-system.test.ts
│   │   │   └── ai-response-parser.test.ts
│   │   └── presentation/
│   └── integration/
│       ├── gameplay-loop.test.ts
│       └── ai-loop.test.ts
├── docs/
│   └── ai-modder-guide.md
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── .gitignore
```

---

## 4. Key Architectural Decisions

### ADR-001: Layered Architecture over ECS

**Context:** Schyrim has 8+ interacting game systems. Need a pattern that's maintainable, testable, and understandable by AI agents.

**Decision:** Use a three-layer architecture (Core → Systems → Presentation) with a cross-cutting event bus, NOT an Entity-Component-System pattern.

**Rationale:**
- ECS excels in real-time games with thousands of entities and per-frame updates. Schyrim is turn-based CLI with ~100 entities in play at any time.
- Layered + services maps cleanly to the 8 systems, each with clear inputs/outputs and testable boundaries.
- AI agents and modders understand service-style modules more easily than ECS query patterns.
- Event bus provides the loose coupling ECS offers, without the paradigm shift.

**Consequences:**
- (+) Each system is a standalone module, easily unit-tested.
- (+) Clear interfaces between systems documented by TypeScript types.
- (-) Cross-system queries require going through interfaces rather than direct component queries.
- (-) If the game ever needs real-time simulation, we'd need to refactor.

### ADR-002: JSON Data Files with JSON Schema Validation

**Context:** All game content (items, quests, locations, etc.) must be addable/editable without touching source code. Must be AI-readable and validatable.

**Decision:** Store all content in JSON files. Validate against JSON Schemas using Ajv at load time. JSON Schemas serve as the "modder's contract."

**Rationale:**
- JSON is universally parseable by AI models, humans, and tooling.
- JSON Schema provides a formal contract: if a data file passes schema validation, it's guaranteed to work with the engine.
- Ajv is fast and well-maintained, supports draft-07 and later.
- YAML was considered for content but rejected: JSON is more precise (no indentation ambiguity), better for AI generation, and has native schema validation.

**Consequences:**
- (+) AI agents can generate valid content by following schemas.
- (+) Modders get immediate validation feedback.
- (+) Engine never encounters malformed data at runtime.
- (-) JSON is verbose for hand-editing (mitigated: content is AI-authored).
- (-) Schema maintenance overhead (mitigated: schemas co-evolve with types).

### ADR-003: Event Bus for Cross-System Communication

**Context:** Systems must interact (combat grants XP → progression, quest objective updates → quest system, faction reputation changes → economy) without tight coupling.

**Decision:** Implement a typed pub/sub event bus. Each system subscribes to relevant event types and emits its own.

**Defined Event Types:**
```typescript
enum GameEvent {
  COMBAT_START, COMBAT_END, COMBAT_DAMAGE,
  ITEM_ACQUIRED, ITEM_DROPPED, ITEM_EQUIPPED, ITEM_UNEQUIPPED,
  QUEST_STARTED, QUEST_STAGE_CHANGE, QUEST_COMPLETED, QUEST_FAILED,
  LOCATION_ENTERED, LOCATION_EXITED,
  REPUTATION_CHANGE,
  SKILL_XP_GAINED, SKILL_LEVEL_UP, CHARACTER_LEVEL_UP,
  TRADE_COMPLETED,
  DIALOGUE_STARTED, DIALOGUE_CHOICE_MADE,
  TIME_ADVANCED, WEATHER_CHANGED,
  RANDOM_ENCOUNTER, WORLD_EVENT,
  SAVE_GAME, LOAD_GAME
}
```

**Rationale:**
- Systems never import each other directly — they communicate through events.
- New systems (future survival, lockpicking) can subscribe to existing events without modifying emitting systems.
- Event logs provide built-in observability for debugging.

**Consequences:**
- (+) Extremely loose coupling.
- (+) Easy to add new systems.
- (+) Event log = automatic audit trail.
- (-) Event ordering can be subtle; need deterministic dispatch order.
- (-) Debugging "why didn't X happen" requires tracing event chains.

### ADR-004: AI as Narrative Layer, Engine as Authority

**Context:** The AI narrative engine must enhance the player experience without compromising game integrity. AI models are non-deterministic and can produce invalid outputs.

**Decision:** The AI is strictly a narrative/UX layer. The deterministic game engine is always the source of truth. The AI proposes actions; the engine validates and resolves them. Game saves are reproducible without AI involvement.

**Architecture:**
```
Player Input → AI Engine → Proposed Actions (JSON)
                                    ↓
                          Engine Validator
                            ↓ valid    ↓ invalid
                      Engine Resolves    Error + Re-prompt
                            ↓
                      State Updated
                            ↓
                      AI Renders Scene
```

**Rationale:**
- Non-deterministic AI must never be authoritative for game state.
- Players must be able to save/load and get identical game states.
- If AI is down, the game must be fully playable in deterministic-only mode.
- Invalid AI proposals must be caught and handled gracefully.

**Consequences:**
- (+) Game integrity guaranteed regardless of AI behavior.
- (+) Saves are portable and reproducible.
- (+) Deterministic mode = full game without any AI dependency.
- (-) AI must adhere to a strict contract (prompt engineering challenge).
- (-) Additional validation layer adds complexity.

### ADR-005: Pluggable LLM Provider Abstraction

**Context:** Multiple LLM providers have different APIs, pricing, and capabilities. The game should work with any of them and support switching at runtime.

**Decision:** Define a `LLMProvider` interface with methods `generateResponse(prompt: StructuredPrompt): Promise<AIResponse>`. Implement one adapter per provider. Provider selection is configurable at runtime.

**Interface:**
```typescript
interface LLMProvider {
  name: string;
  initialize(config: ProviderConfig): Promise<void>;
  generateResponse(prompt: StructuredPrompt): Promise<RawAIResponse>;
  isAvailable(): Promise<boolean>;
}
```

**Supported Providers (Milestone 1):**
1. Google AI Studio / Gemini — generous free tier, good for long context
2. Groq — fast inference, free tier on open models
3. OpenRouter — meta-API with multiple model options
4. Cerebras — fast inference, generous free limits
5. Ollama (local) — no API key needed, fully offline

**Consequences:**
- (+) No vendor lock-in.
- (+) Players choose based on their situation (free tier, speed, quality).
- (+) Testing can use a mock provider.
- (-) Must maintain 5 adapter implementations.
- (-) Response format normalization across providers adds complexity.

### ADR-006: Game State Management Pattern

**Context:** The game state is a complex object modified by multiple systems. Need deterministic, inspectable state mutations.

**Decision:** Use a centralized `GameState` object managed by a `GameStateManager` with controlled mutation methods. State is always serializable to JSON.

**State Structure:**
```typescript
interface GameState {
  meta: { version: string; saveDate: string; playTime: number };
  player: PlayerState;       // stats, skills, perks, equipment, inventory
  world: WorldState;         // locations, NPCs, containers, time, weather
  quests: QuestState;        // active, completed, failed quests
  factions: FactionState;    // reputation scores per faction
  events: EventHistory;      // recent events for AI context
  config: RuntimeConfig;     // difficulty, immersion settings
}
```

**Rationale:**
- Single source of truth prevents state desynchronization between systems.
- JSON-serializable = trivial save/load.
- Controlled mutation = audit trail via event bus.
- Systems read state via the manager and request mutations, never mutate directly.

**Consequences:**
- (+) Deterministic, inspectable, serializable.
- (+) Save/load is a simple JSON write/read.
- (-) Large state object in memory (acceptable for CLI game scale).
- (-) Systems must go through manager, not direct mutation.

### ADR-007: TypeScript Strict Mode with Discriminated Unions for Data

**Context:** Game data has many variants (item types, damage types, location types). Need type safety that catches errors at compile time.

**Decision:** Use TypeScript strict mode. Model data variants using discriminated union types (tagged unions).

**Example:**
```typescript
type Item =
  | { type: 'weapon'; weaponClass: WeaponClass; damage: number; damageType: DamageType; /* ... */ }
  | { type: 'armor'; armorRating: number; slot: ArmorSlot; armorType: ArmorType; /* ... */ }
  | { type: 'potion'; effect: PotionEffect; duration: number; /* ... */ }
  | { type: 'spell_tome'; spellId: string; /* ... */ }
  // ...
```

**Rationale:**
- Discriminated unions force exhaustive handling of all variants.
- TypeScript catches missing cases at compile time.
- AI code generators produce better code with explicit type constraints.

### ADR-008: Turn-Based Combat with Structured Rounds

**Context:** Skyrim has real-time combat, but CLI cannot support real-time. Need an abstraction that captures tactical depth.

**Decision:** Use structured turn-based combat with rounds. Each round has phases: initiative → player action → enemy action → status effect processing → round summary. This is similar to D&D-style combat.

**Rationale:**
- Turn-based is natural for CLI (player reads, thinks, types).
- Round structure enables interesting tactical choices (buff vs attack, heal vs dodge).
- Status effects and multi-turn spells work naturally in rounds.
- Combat logs are structured per-round for readability.

**Consequences:**
- (+) Tactical depth without real-time constraints.
- (+) Clean combat log formatting.
- (-) Loses Skyrim's real-time feel (acceptable tradeoff for CLI).
- (-) Initiative system adds complexity (mitigated: simple speed-based initiative).

---

## 5. Data Flow Architecture

### Main Game Loop

```
┌───────────────────────────┐
│      Game Loop Start      │
│  (presentation/game-loop) │
└─────────┬─────────────────┘
          │
          v
┌───────────────────────────┐       ┌──────────────────┐
│   Build AI Context        │──────→│ Prompt Builder   │
│   (from GameState)        │       │ (systems/ai)     │
└─────────┬─────────────────┘       └──────────────────┘
          │
          v
┌───────────────────────────┐
│   AI Provider Generate    │
│   (or deterministic       │
│    fallback)              │
└─────────┬─────────────────┘
          │
          v
┌───────────────────────────┐
│   Parse AI Response       │
│   (response-parser)       │
└─────────┬─────────────────┘
          │
          v
┌───────────────────────────┐
│   Display Scene           │
│   (presentation layer)    │
└─────────┬─────────────────┘
          │
          v
┌───────────────────────────┐
│   Await Player Input      │
│   (input-handler)         │
└─────────┬─────────────────┘
          │
          v
┌───────────────────────────┐
│   Route to System         │
│   (combat/dialogue/nav/   │
│    inventory/trade/etc.)  │
└─────────┬─────────────────┘
          │
          v
┌───────────────────────────┐
│   System Processes Action │
│   + Emits Events          │
└─────────┬─────────────────┘
          │
          v
┌───────────────────────────┐
│   Event Bus Dispatches    │
│   to Subscribers          │
└─────────┬─────────────────┘
          │
          v
┌───────────────────────────┐
│   GameState Updated       │
│   (via GameStateManager)  │
└─────────┬─────────────────┘
          │
          └──→ Back to Game Loop Start
```

### AI Prompt Pipeline

```
GameState ──→ PromptBuilder ──→ StructuredPrompt ──→ LLMProvider ──→ RawResponse
                                                                        │
                                                                        v
                                                               ResponseParser
                                                                        │
                                                                        v
                                                              ParsedAIResponse
                                                                  │         │
                                                     scene_description   proposed_actions
                                                          │                   │
                                                     CLI Display      ActionValidator
                                                                           │
                                                                    valid / invalid
                                                                     │         │
                                                              System Execute  Error→Reprompt
```

---

## 6. System Interface Contracts

Each system exposes a service interface. Systems never import each other — they communicate only through the event bus and the game state manager.

```typescript
// Example: InventorySystem interface
interface IInventorySystem {
  addItem(entityId: string, item: Item, quantity?: number): InventoryResult;
  removeItem(entityId: string, itemId: string, quantity?: number): InventoryResult;
  equipItem(entityId: string, itemId: string): EquipResult;
  unequipItem(entityId: string, slot: EquipmentSlot): EquipResult;
  getInventory(entityId: string): InventoryView;
  canCarry(entityId: string, item: Item): boolean;
  getEquipped(entityId: string): EquippedGear;
}

// Example: CombatSystem interface
interface ICombatSystem {
  initiateCombat(participants: CombatParticipant[]): CombatSession;
  executePlayerAction(session: CombatSession, action: CombatAction): RoundResult;
  processRound(session: CombatSession): RoundResult;
  isCombatOver(session: CombatSession): boolean;
  getCombatSummary(session: CombatSession): CombatSummary;
}

// Example: NavigationSystem interface
interface INavigationSystem {
  getCurrentLocation(): Location;
  getAvailableExits(): Exit[];
  moveTo(locationId: string): MoveResult;
  fastTravel(locationId: string): FastTravelResult;
  getDiscoveredLocations(): Location[];
}
```

---

## 7. Security & Configuration

### API Key Management

- API keys stored in `data/config/ai-config.yaml` which is `.gitignore`d.
- First-run wizard writes the config file.
- Keys are never logged, even in debug mode.
- Provider config supports environment variables as alternative: `SCHYRIM_GEMINI_KEY`, etc.

### Content Validation

- All JSON content files are validated against their respective JSON Schemas at load time.
- Invalid content produces a clear error message identifying the file, field, and violation.
- The game refuses to start with invalid content to prevent runtime errors.

---

## 8. Testing Strategy

| Level | Scope | Framework | Coverage Target |
|---|---|---|---|
| **Unit** | Individual system functions (damage calc, price calc, condition eval, loot generation) | Vitest | ≥80% |
| **Integration** | Cross-system flows (combat → XP → level up, quest → dialogue → reputation) | Vitest | Key paths |
| **E2E Gameplay** | Full vertical slice loop (create char → dungeon → combat → town → vendor → quest) | Vitest | Happy path + key failure paths |
| **AI Loop** | Prompt building, response parsing, action validation, provider failover | Vitest with mock providers | All paths |

### Mock Provider for AI Testing

```typescript
class MockLLMProvider implements LLMProvider {
  name = 'mock';
  private responses: Map<string, RawAIResponse>;
  
  async generateResponse(prompt: StructuredPrompt): Promise<RawAIResponse> {
    // Return canned responses based on prompt content
  }
}
```

---

## 9. Deployment & Build

```bash
# Development
npm run dev          # ts-node src/index.ts
npm run test         # vitest run
npm run test:watch   # vitest
npm run test:coverage # vitest --coverage

# Production
npm run build        # tsc → dist/
npm start            # node dist/index.js

# Play
npm run play         # alias for npm start
```

### Package.json Scripts

```json
{
  "name": "schyrim",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "play": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest --coverage",
    "validate-content": "tsx src/core/data-loader.ts --validate-only"
  }
}
```

---

## 10. AI & Modder Extensibility Architecture

### Content Extension Points

| Extension Point | Data Location | Schema | How to Add |
|---|---|---|---|
| New Items | `data/content/items/` | `items.schema.json` | Add JSON file or append to existing |
| New Locations | `data/content/locations/` | `locations.schema.json` | Add JSON file with exits referencing existing locations |
| New Quests | `data/content/quests/` | `quests.schema.json` | Add JSON file with stages and conditions |
| New Dialogue | `data/content/dialogue/` | `dialogue.schema.json` | Add JSON file with dialogue nodes |
| New Factions | `data/content/factions/` | `factions.schema.json` | Add or extend factions.json |
| New Perks | `data/content/perks/` | `perks.schema.json` | Add perk trees or extend existing |
| New Spells | `data/content/spells/` | `spells.schema.json` | Add spell definitions |
| New Enemies | `data/content/enemies/` | `enemies.schema.json` | Add enemy templates |
| New Races | `data/content/races/` | `races.schema.json` | Add race definitions |
| New Leveled Lists | `data/content/leveled-lists/` | `leveled-lists.schema.json` | Add loot table definitions |

### AI Content Generation Workflow

1. AI reads the target JSON Schema.
2. AI generates content following the schema.
3. `npm run validate-content` validates all content files.
4. If valid → content is immediately available in-game.
5. If invalid → clear error messages guide correction.
