---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments: [product-brief-schyrim-2026-03-04.md]
workflowType: 'prd'
---

# Product Requirements Document - Schyrim

**Author:** Acydyca
**Date:** 2026-03-04
**Version:** 1.0
**Status:** Draft

---

## 1. Executive Summary

Schyrim is a CLI-only, AI-narrated RPG that brings the emergent, systemic gameplay of a heavily-modded Skyrim to the terminal. It combines deterministic game systems (inventory, combat, bartering, dialogue, navigation, progression, factions) with an AI-powered narrative engine that describes scenes, interprets player free-text input, and proposes actions — all validated by the authoritative game engine. The game is designed from the ground up for moddability and AI-first content authoring.

## 2. Goals and Objectives

### Business Goals

1. Deliver a compelling vertical slice demonstrating the viability of AI-narrated, systemically deep CLI RPGs.
2. Create a moddable, extensible platform where AI agents and human modders can add content via data files.
3. Establish architectural patterns that separate engine logic from presentation, enabling future GUI/web/TUI frontends.

### User Goals

1. Experience emergent, Skyrim-like RPG gameplay in a terminal with rich AI-generated narrative.
2. Make meaningful character build decisions through data-driven perk trees, skills, and equipment.
3. Explore an interconnected world with branching quests, factions, and reputation-driven consequences.
4. Extend the game easily by adding items, quests, factions, and spells via structured data files.

### Non-Goals

- Full implementation of crafting, enchanting, or alchemy (hooks only in Milestone 1).
- GUI, web, or TUI frontends (architecture supports it; CLI only for now).
- Multiplayer or networking.
- Complete open-world content (Milestone 1 is a vertical slice).
- Real-time combat simulation (turn-based/abstracted combat).

## 3. Functional Requirements

### FR-1: Game State Core

**FR-1.1** The system SHALL maintain a single authoritative game state object containing player data, world state, quest states, faction standings, time, weather, and event history.

**FR-1.2** The system SHALL support save/load of the complete game state to/from JSON files with version metadata for future migration.

**FR-1.3** The system SHALL support configurable difficulty and immersion settings (survival toggles, damage multipliers, discovery frequency, log verbosity, color usage, confirmation prompts) through a YAML configuration file.

**FR-1.4** The system SHALL provide a debug/trace mode that logs system interactions, event dispatches, and state transitions for development and modding.

### FR-2: Inventory, Loot & Equipment System

**FR-2.1** The system SHALL support item types: weapons, armor, clothing, jewelry, spell tomes, potions, food, ingredients, scrolls, soul gems, and misc/quest items.

**FR-2.2** Each item SHALL have properties: id, name, type, subtype, rarity (common/uncommon/rare/epic/legendary/unique), weight, base_value, description, and tags (enchanted, stolen, faction-made, unique, crafted, quest).

**FR-2.3** Weapons SHALL have additional properties: damage, damage_type (physical/fire/frost/shock/poison), speed, weapon_class (one-handed/two-handed/ranged), and optional enchantment reference.

**FR-2.4** Armor SHALL have additional properties: armor_rating, slot (head/chest/hands/feet/shield), armor_type (light/heavy/clothing), and optional enchantment reference.

**FR-2.5** The system SHALL enforce a carry weight limit derived from player stamina and relevant perks, with clear CLI feedback when exceeded.

**FR-2.6** The system SHALL support equipment slots: head, chest, hands, feet, ring_left, ring_right, amulet, weapon_main, weapon_off, ammo.

**FR-2.7** The system SHALL provide CLI inventory display with sorting (by type, weight, value, name) and filtering (by type, tag, equipped status).

**FR-2.8** The system SHALL support leveled loot lists that generate appropriate items based on player level, location type, and rarity curves.

**FR-2.9** Containers (chests, barrels, corpses) SHALL have their own inventories with capacity limits.

**FR-2.10** The system SHALL provide hooks (data interfaces) for future crafting, enchanting, and alchemy systems without implementing them.

### FR-3: Bartering, Economy & Vendors

**FR-3.1** The system SHALL calculate trade prices using the formula:
`final_price = base_value × condition_modifier × speech_skill_factor × perk_bonuses × racial_bonus × faction_reputation_modifier × regional_scarcity_modifier × stolen_penalty`

**FR-3.2** The system SHALL support vendor archetypes: general_goods, blacksmith, alchemist, court_mage, fence, trainer — each with distinct inventory pools, gold reserves, and pricing biases (e.g., blacksmith pays more for weapons, alchemist for ingredients).

**FR-3.3** Vendors SHALL have gold pools that deplete when buying from the player and replenish on configurable timers.

**FR-3.4** The system SHALL provide a CLI trade interface with: item listings, filtering, price comparison (buy vs. sell), buy/sell actions, and clear textual feedback on price calculations.

**FR-3.5** Stolen items SHALL only be sellable to fence vendors and at reduced prices.

**FR-3.6** The system SHALL provide data hooks for dynamic economy events (regional scarcity, war impacts, economic shocks) that modify prices or vendor availability.

### FR-4: Combat System

**FR-4.1** The system SHALL maintain combat stats for all combatants: health, stamina, magicka, armor_rating, resistances (fire, frost, shock, poison, magic), and skill levels (one_handed, two_handed, archery, destruction, restoration, conjuration, alteration, illusion, sneak, block, light_armor, heavy_armor).

**FR-4.2** Combat SHALL proceed in rounds with structured phases: initiative → player action → enemy action → status effect processing → round summary.

**FR-4.3** Player combat actions SHALL include: attack (weapon), cast_spell, use_shout, use_item (potion/scroll), block, dodge, sneak, flee.

**FR-4.4** Damage calculation SHALL account for: base weapon/spell damage, skill modifiers, perk bonuses, armor rating reduction, resistance/weakness multipliers, critical hit chance (derived from skill + perks), and sneak attack multipliers.

**FR-4.5** The system SHALL support damage types: physical, fire, frost, shock, poison, and magic (undifferentiated).

**FR-4.6** The system SHALL support status effects: burning (fire DoT), slowed (frost movement penalty), staggered (skip turn), paralyzed (skip multiple turns), bleeding (physical DoT), drain_magicka, drain_stamina, poisoned (poison DoT).

**FR-4.7** Spells SHALL have properties: name, school (destruction/restoration/conjuration/alteration/illusion), magicka_cost, damage/heal amount, range, cast_time, effects, and skill_requirement.

**FR-4.8** Shout-like powers SHALL have properties: name, words (1-3 levels), cooldown_seconds, effects, and unlock requirements.

**FR-4.9** The system SHALL provide stealth abstraction: detection_level (hidden/detected/combat) based on sneak skill, armor weight, movement, light level, and enemy perception.

**FR-4.10** Combat logs SHALL have two modes: succinct (1-2 line summaries per action) and detailed (full damage breakdown, resistance application, crit calculations).

**FR-4.11** The system as a whole SHALL integrate the AI narrative engine to enhance combat descriptions while the deterministic engine resolves all mechanical outcomes.

### FR-5: Dialogue, Quests, Guilds & Reputation

**FR-5.1** The system SHALL implement a branching dialogue system with numbered CLI choices.

**FR-5.2** Dialogue options SHALL support conditions: skill_check (speech/intimidation/persuasion), perk_required, race_required, guild_membership, reputation_threshold, quest_stage, item_possessed, and hidden (revealed only when conditions met).

**FR-5.3** Dialogue nodes SHALL be defined as data structures (JSON) with: id, speaker, text, options (each with text, conditions, next_node, effects).

**FR-5.4** The system SHALL support factions: mages_guild, thieves_guild, warriors_guild, assassins_guild, city_guard, nobles, divine_cults, daedric_cults, and custom factions defined in data.

**FR-5.5** Each faction SHALL maintain a reputation score (-100 to +100) per player, affecting: dialogue options, prices (via FR-3.1), quest access, vendor access, and hostility.

**FR-5.6** The quest system SHALL support quest types: main, faction, side, and radiant (template-based, dynamically generated).

**FR-5.7** Each quest SHALL have: id, title, description, type, faction, stages (with objectives, completion_conditions, rewards, next_stage or fail_stage), and prerequisites.

**FR-5.8** Radiant quests SHALL be generated from templates with parameterized targets, locations, rewards, and dialogue.

**FR-5.9** The system SHALL provide a CLI quest journal showing: active quests, current objectives, completed quests, and failed quests.

**FR-5.10** Quest state transitions SHALL be event-driven and trigger effects (reputation changes, item grants, world state changes).

### FR-6: Navigation, World & Exploration

**FR-6.1** The world SHALL be represented as a graph of interconnected locations (nodes) with tagged exits (edges).

**FR-6.2** Each location SHALL have: id, name, type (city/town/village/inn/dungeon/cave/ruins/wilderness/fort/tower/dragon_lair/sacred_site), region (hold), description, exits (list of connected locations with travel_time), entities (NPCs, enemies, containers, crafting stations), tags, and ambient data (default weather, light level, danger level).

**FR-6.3** The CLI SHALL display for each location: current location name and description, available exits with destination names, time of day, weather/conditions, and present entities and available context-sensitive actions.

**FR-6.4** Context-sensitive actions SHALL be dynamically generated based on location type and present entities: talk, pickpocket, inspect, loot, mine, harvest, craft, read, attack, trade, train, rest.

**FR-6.5** The system SHALL track time of day (morning/afternoon/evening/night) affecting: ambient descriptions, NPC availability, enemy spawns, and stealth effectiveness.

**FR-6.6** The system SHALL support fast-travel between previously-visited locations with time passage and random encounter chance.

**FR-6.7** Points of interest SHALL be surfaced via: innkeeper rumors, NPC dialogue, notice boards, and radiant quest dispatchers.

**FR-6.8** The system SHALL provide hooks for weather systems (clear/rain/snow/storm/fog) affecting combat, stealth, and navigation descriptions.

### FR-7: Character Progression, Skills, Perks & Builds

**FR-7.1** Skills SHALL level by use: each successful use of a skill (weapon hit, spell cast, successful sneak, successful barter) grants skill XP. Skills level at configurable XP thresholds.

**FR-7.2** Character level SHALL be derived from the sum of all skill levels, with configurable leveling curves.

**FR-7.3** On each character level-up, the player SHALL choose to increase one attribute: health (+10), stamina (+10), or magicka (+10), and receive one perk point.

**FR-7.4** Perk trees SHALL be data-driven (JSON): each perk has id, name, tree (one_handed/destruction/sneak/etc.), tier, prerequisite_perks, skill_requirement, and effects (modifier to damage, cost reduction, new ability, etc.).

**FR-7.5** Skills and perks SHALL meaningfully influence all systems: combat damage/defense, spell costs, sneak effectiveness, barter prices, dialogue options, loot quality.

**FR-7.6** The system SHALL support character creation with: name, race (with racial bonuses to stats/skills), and optional starting background (affecting initial skills, equipment, and faction standing).

**FR-7.7** The system SHALL provide a CLI character sheet displaying: level, attributes, skills with levels, active perks, equipped gear, and derived stats (damage, armor rating, carry weight, etc.).

### FR-8: AI Narrative Engine

**FR-8.1** On first run, the system SHALL prompt the player to select an AI provider from: Google AI Studio/Gemini, Groq, OpenRouter, Cerebras, Local/Ollama.

**FR-8.2** The system SHALL securely store the selected provider and API key in a local config file (excluded from version control).

**FR-8.3** The AI narrative loop SHALL follow the cycle: AI describes scene → player responds (free-text CLI) → AI advances narrative and proposes engine actions → engine validates and resolves → updated state fed back to AI → loop.

**FR-8.4** Each AI prompt SHALL include:
- **System message**: Role definition constraining the AI to be consistent with authoritative game state and rules.
- **Context block**: Serialized game state snapshot (location, time, weather, player stats, inventory highlights, active quests, nearby NPCs/enemies, recent events).
- **Rules block**: Concise mechanics summary + content safety rails.
- **Player message**: The latest free-form input.

**FR-8.5** AI responses SHALL be parsed into a structured JSON format:
```json
{
  "scene_description": "string",
  "summarized_options": ["string"],
  "proposed_actions": [{"type": "string", "params": {}}],
  "meta": {"flags": ["string"]}
}
```

**FR-8.6** The engine SHALL validate all `proposed_actions`: if any action is invalid (impossible movement, insufficient resources, non-existent item), the engine SHALL reject it and return a structured error for re-prompting.

**FR-8.7** The system SHALL provide a `/model` or `/ai` CLI command group for: switching providers/models, toggling verbosity (minimal/cinematic), enabling/disabling AI-suggested options (deterministic-only mode vs AI-augmented mode).

**FR-8.8** The system SHALL gracefully handle AI failures: missing API key, rate limits, malformed responses, timeouts — falling back to deterministic descriptions with clear player notification.

**FR-8.9** Game saves SHALL be fully reproducible without re-calling the AI model. The AI is strictly a narrative/UX layer on top of deterministic mechanics.

### FR-9: Interaction & Event System

**FR-9.1** The system SHALL implement a pub/sub event bus allowing systems to subscribe to and emit typed events (COMBAT_START, ITEM_ACQUIRED, QUEST_STAGE_CHANGE, LOCATION_ENTERED, REPUTATION_CHANGE, LEVEL_UP, etc.).

**FR-9.2** The event system SHALL support random encounter triggers on travel between locations, based on: route danger level, time of day, player level, and configurable frequency.

**FR-9.3** The system SHALL provide hooks for environmental hazards (cold, hunger, fatigue, disease, storms) that can be enabled via immersion settings.

**FR-9.4** The system SHALL support scheduled world events (dragon attacks, faction conflicts, NPC routine changes) through a time-based event scheduler.

**FR-9.5** New interaction types (lockpicking, pickpocketing, detailed sneaking, alchemy checks) SHALL be addable via the event system and skill/perk interfaces without modifying core engine code.

## 4. Non-Functional Requirements

### NFR-1: Testing & Quality

**NFR-1.1** The codebase SHALL achieve ≥80% unit test coverage on core systems (inventory, combat resolution, price calculation, dialogue branching, quest state, navigation, event handling).

**NFR-1.2** Integration tests SHALL validate a complete gameplay loop: character creation → navigate to dungeon → combat encounter → loot → navigate to town → sell to vendor → dialogue with quest giver → accept quest.

**NFR-1.3** The AI narrative loop SHALL have dedicated tests: given a fixed game state and canned LLM response, verify parsing and engine updates behave correctly.

**NFR-1.4** Tests SHALL cover failure modes: missing API key, rate-limit errors, malformed AI responses, provider timeouts.

### NFR-2: Architecture & Maintainability

**NFR-2.1** The system SHALL maintain clear separation between: Game State Core, Systems Layer (inventory, combat, dialogue, etc.), and Presentation Layer (CLI renderer).

**NFR-2.2** All game content (items, locations, quests, factions, perks, spells, enemies) SHALL be defined in JSON data files, not hardcoded in source.

**NFR-2.3** All JSON content files SHALL be validated against JSON Schemas at load time.

**NFR-2.4** Module boundaries SHALL be enforced: no direct imports between system modules except through defined service interfaces.

### NFR-3: Performance

**NFR-3.1** CLI response time SHALL be < 200ms for all non-AI actions (inventory operations, navigation, combat resolution, dialogue display).

**NFR-3.2** AI responses SHALL begin streaming within 3 seconds for typical prompts on supported providers.

### NFR-4: Extensibility & Moddability

**NFR-4.1** A new item, quest, faction, perk, spell, location, or enemy type SHALL be addable by creating/editing only data files (JSON) without modifying core engine source code.

**NFR-4.2** JSON Schema files SHALL serve as the "modder's contract" — any data file that passes validation is guaranteed to work with the engine.

**NFR-4.3** The system SHALL provide an "AI & Modder Guide" document describing how to safely extend the game.

### NFR-5: Observability & Debugging

**NFR-5.1** The system SHALL support a debug mode with verbose logging of: event dispatches, state mutations, combat calculations, price computations, and AI prompt/response pairs.

**NFR-5.2** The system SHALL support dev console commands for: teleporting, spawning items, changing stats, advancing quests, and triggering events.

## 5. User Interaction & Design

### CLI Interface Design Principles

1. **Information Density**: Show relevant information without overwhelming. Use progressive disclosure (summary → detail on demand).
2. **Consistent Commands**: Standard verbs (`look`, `go`, `talk`, `attack`, `inventory`, `journal`, `stats`, `save`, `load`, `help`).
3. **Color & Formatting**: Optional ANSI color coding for: damage types (red/blue/yellow), item rarity, system messages, NPC dialogue, AI narration. Respects terminal capabilities.
4. **Input Flexibility**: Accept both numbered choices and natural language (parsed by AI engine when enabled).
5. **Accessibility**: All information available without color. Configurable verbosity. Confirmation prompts for destructive actions.

### First-Run Experience

1. Welcome screen with game title and brief description.
2. AI provider selection (list of supported providers with free-tier indicators).
3. API key input (or endpoint URL for local models).
4. Character creation (name, race, optional background).
5. Opening narrative describing the starting location.

### Core Gameplay Flow

```
┌─────────────────────────────────────────┐
│           AI Describes Scene            │
│  (location, NPCs, atmosphere, options)  │
└─────────────┬───────────────────────────┘
              │
              v
┌─────────────────────────────────────────┐
│        Player Input (CLI)               │
│  (free-text or numbered choice)         │
└─────────────┬───────────────────────────┘
              │
              v
┌─────────────────────────────────────────┐
│     AI Interprets & Proposes Actions    │
│  (structured JSON: move, attack, talk)  │
└─────────────┬───────────────────────────┘
              │
              v
┌─────────────────────────────────────────┐
│    Engine Validates & Resolves          │
│  (authoritative state, deterministic)   │
└─────────────┬───────────────────────────┘
              │
              v
┌─────────────────────────────────────────┐
│    Updated Game State → Back to AI      │
└─────────────────────────────────────────┘
```

## 6. Technical Assumptions

1. **Runtime**: Node.js 20+ with TypeScript 5.x.
2. **Package Manager**: npm.
3. **Test Framework**: Vitest.
4. **Build**: tsc for compilation; no bundler needed for CLI.
5. **LLM SDKs**: Official SDKs or HTTP clients for each supported provider.
6. **Terminal**: Assumes a VT100-compatible terminal with at least 80-column width.
7. **Local Storage**: Game saves, config, and content all stored in local filesystem.
8. **No Network Required** (except for AI): Game is fully playable offline in deterministic mode.

## 7. Epic Overview

| Epic | Name | Description |
|---|---|---|
| E1 | **Project Foundation** | Project setup, build system, testing infrastructure, core game state, data loading pipeline, JSON Schema validation. |
| E2 | **Character & Progression** | Character creation, stats, skills, leveling, perk trees, character sheet display. |
| E3 | **Inventory & Equipment** | Item system, inventory management, equipment slots, carry weight, CLI display, loot generation. |
| E4 | **World & Navigation** | Location graph, navigation, time system, weather, context-sensitive actions, fast travel. |
| E5 | **Combat System** | Combat loop, damage calculation, spells, shouts, stealth, status effects, combat logs. |
| E6 | **Dialogue & Quests** | Dialogue tree engine, quest system, quest journal, radiant quest templates. |
| E7 | **Factions & Reputation** | Faction definitions, reputation tracking, reputation effects on all systems. |
| E8 | **Economy & Bartering** | Price calculation, vendor system, trade CLI, economy hooks. |
| E9 | **AI Narrative Engine** | LLM provider abstraction, prompt schema, response parsing, AI loop, provider configuration, error handling. |
| E10 | **Events & Interactions** | Event bus, random encounters, world events, environmental hooks, extensibility framework. |
| E11 | **Vertical Slice Content** | Content authoring for the playable slice: locations, NPCs, enemies, items, quests, dialogue trees. |
| E12 | **Polish & Documentation** | Save/load, settings, help system, debug console, AI & Modder Guide, final integration testing. |

## 8. Constraints & Dependencies

| Constraint | Impact |
|---|---|
| Free-tier LLM rate limits | AI features may be rate-limited during heavy play; deterministic fallback must be robust. |
| No GUI framework | All UI is text-based; rich formatting depends on terminal ANSI support. |
| Single developer (AI-assisted) | Vertical slice scope must be achievable; architecture must support incremental delivery. |
| JSON data loading at startup | Game start time grows with content volume; consider lazy loading for future. |

## 9. Appendix: Data Schema Overview

### Item Schema (items.schema.json)
```json
{
  "type": "object",
  "required": ["id", "name", "type", "weight", "base_value"],
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "type": { "type": "string", "enum": ["weapon", "armor", "clothing", "jewelry", "spell_tome", "potion", "food", "ingredient", "scroll", "soul_gem", "misc", "quest_item"] },
    "rarity": { "type": "string", "enum": ["common", "uncommon", "rare", "epic", "legendary", "unique"] },
    "weight": { "type": "number" },
    "base_value": { "type": "number" },
    "tags": { "type": "array", "items": { "type": "string" } }
  }
}
```

### Location Schema (locations.schema.json)
```json
{
  "type": "object",
  "required": ["id", "name", "type", "region", "exits"],
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "type": { "type": "string", "enum": ["city", "town", "village", "inn", "dungeon", "cave", "ruins", "wilderness", "fort", "tower", "dragon_lair", "sacred_site"] },
    "region": { "type": "string" },
    "exits": { "type": "array", "items": { "$ref": "#/$defs/Exit" } }
  }
}
```

### Quest Schema (quests.schema.json)
```json
{
  "type": "object",
  "required": ["id", "title", "type", "stages"],
  "properties": {
    "id": { "type": "string" },
    "title": { "type": "string" },
    "type": { "type": "string", "enum": ["main", "faction", "side", "radiant"] },
    "faction": { "type": "string" },
    "stages": { "type": "array", "items": { "$ref": "#/$defs/QuestStage" } }
  }
}
```
