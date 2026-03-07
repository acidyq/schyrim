---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: [PRD.md, architecture.md]
---

# Schyrim - Epic & Story Breakdown

## Overview

This document provides the complete epic and story breakdown for Schyrim, decomposing the requirements from the PRD and Architecture into implementable stories organized for a vertical slice first approach.

## Requirements Inventory

### Functional Requirements

- FR-1: Game State Core (4 requirements)
- FR-2: Inventory, Loot & Equipment (10 requirements)
- FR-3: Bartering, Economy & Vendors (6 requirements)
- FR-4: Combat System (11 requirements)
- FR-5: Dialogue, Quests, Guilds & Reputation (10 requirements)
- FR-6: Navigation, World & Exploration (8 requirements)
- FR-7: Character Progression, Skills, Perks & Builds (7 requirements)
- FR-8: AI Narrative Engine (9 requirements)
- FR-9: Interaction & Event System (5 requirements)

### Non-Functional Requirements

- NFR-1: Testing & Quality (4 requirements)
- NFR-2: Architecture & Maintainability (4 requirements)
- NFR-3: Performance (2 requirements)
- NFR-4: Extensibility & Moddability (3 requirements)
- NFR-5: Observability & Debugging (2 requirements)

### FR Coverage Map

| FR | Covered By Epics |
|---|---|
| FR-1 | E1 |
| FR-2 | E3 |
| FR-3 | E8 |
| FR-4 | E5 |
| FR-5 | E6, E7 |
| FR-6 | E4 |
| FR-7 | E2 |
| FR-8 | E9 |
| FR-9 | E10 |
| NFR-1-5 | E1 (foundation), E12 (polish) |

## Epic List

| Epic | Title | Stories | Priority |
|---|---|---|---|
| E1 | Project Foundation & Core Infrastructure | 6 | P0 - Must Have |
| E2 | Character Creation & Progression | 5 | P0 - Must Have |
| E3 | Inventory & Equipment System | 5 | P0 - Must Have |
| E4 | World, Navigation & Time | 5 | P0 - Must Have |
| E5 | Combat System | 6 | P0 - Must Have |
| E6 | Dialogue & Quest System | 5 | P0 - Must Have |
| E7 | Factions & Reputation | 3 | P1 - Should Have |
| E8 | Economy & Bartering | 4 | P0 - Must Have |
| E9 | AI Narrative Engine | 6 | P0 - Must Have |
| E10 | Events & Interaction Framework | 4 | P1 - Should Have |
| E11 | Vertical Slice Content | 5 | P0 - Must Have |
| E12 | Polish, Save/Load & Documentation | 5 | P0 - Must Have |

---

## Epic 1: Project Foundation & Core Infrastructure

**Goal:** Establish the project skeleton, build system, testing infrastructure, core TypeScript types, event bus, data loading pipeline with JSON Schema validation, and game state management.

### Story 1.1: Project Initialization & Build Setup

As a developer,
I want a properly initialized TypeScript/Node.js project with build, test, and run scripts,
So that I have a solid foundation to build all game systems upon.

**Acceptance Criteria:**

**Given** a fresh project directory
**When** I run `npm install` and `npm run build`
**Then** the project compiles without errors
**And** `npm run test` executes Vitest with zero tests passing (empty test suite)
**And** `npm run dev` starts the application with tsx
**And** tsconfig.json uses strict mode, ES2022 target, and ESM modules
**And** .gitignore excludes node_modules, dist, data/config/ai-config.yaml

### Story 1.2: Core Type Definitions

As a developer,
I want comprehensive TypeScript type definitions for all game entities,
So that all systems have type-safe contracts to build against.

**Acceptance Criteria:**

**Given** the types directory structure from the architecture doc
**When** I review the type files
**Then** types exist for: GameState, PlayerState, Item (discriminated union by type), Location, Quest, QuestStage, DialogueNode, Faction, Spell, Perk, PerkTree, Race, Enemy, CombatSession, Event types
**And** all types use discriminated unions where variants exist
**And** all types are exportable and importable across the codebase

### Story 1.3: Event Bus Implementation

As a developer,
I want a typed pub/sub event bus,
So that game systems can communicate without direct imports.

**Acceptance Criteria:**

**Given** the GameEvent enum from ADR-003
**When** a system emits an event
**Then** all subscribers for that event type receive the event with typed payload
**And** events are dispatched synchronously in deterministic order
**And** the event bus supports subscriber priority ordering
**And** debug mode logs all event dispatches with payloads
**And** ≥90% unit test coverage on the event bus

### Story 1.4: Data Loader & JSON Schema Validation

As a developer,
I want a data loading pipeline that reads JSON content files and validates them against schemas,
So that invalid content is caught at load time and never causes runtime errors.

**Acceptance Criteria:**

**Given** JSON content files in data/content/ and schemas in data/schemas/
**When** the data loader runs
**Then** all content files are validated against their corresponding schema
**And** invalid files produce clear error messages (file path, field, violation)
**And** the game refuses to start if any content file is invalid
**And** a `validate-only` mode exists for checking content without starting the game
**And** ≥90% test coverage on data loader

### Story 1.5: Game State Manager

As a developer,
I want a centralized game state manager that controls all state mutations,
So that the game state is always consistent, serializable, and inspectable.

**Acceptance Criteria:**

**Given** the GameState interface from ADR-006
**When** a system requests a state mutation
**Then** the mutation is applied through the state manager (not directly)
**And** each mutation emits a corresponding event on the event bus
**And** the full state is always JSON-serializable
**And** the state manager supports snapshot/restore for save/load
**And** ≥90% test coverage

### Story 1.6: Configuration Manager

As a developer,
I want a YAML-based configuration system for difficulty, immersion, and developer settings,
So that gameplay can be tuned without code changes.

**Acceptance Criteria:**

**Given** a settings.yaml file in data/config/
**When** the config manager loads
**Then** all settings have sensible defaults
**And** settings include: difficulty multipliers, survival toggles, log verbosity, color mode, confirmation prompts
**And** settings can be overridden via environment variables
**And** invalid settings produce clear warnings with fallback to defaults

---

## Epic 2: Character Creation & Progression

**Goal:** Implement character creation, stats, skills that level by use, character level derived from skills, perk trees, and the character sheet display.

### Story 2.1: Race Definitions & Character Creation

As a player,
I want to create a character by choosing a name, race, and optional background,
So that I begin the game with a unique character that has racial bonuses and a starting identity.

**Acceptance Criteria:**

**Given** the character creation CLI flow
**When** I select a race (e.g., Nord, Breton, Dunmer, Khajiit, etc.)
**Then** racial bonuses are applied to starting stats and skills
**And** a starting background optionally modifies initial skills, equipment, and faction standing
**And** character data is stored in the game state
**And** race data is loaded from data/content/races/races.json

### Story 2.2: Attributes & Derived Stats

As a player,
I want my character to have health, stamina, and magicka attributes with derived combat stats,
So that my character build meaningfully affects gameplay.

**Acceptance Criteria:**

**Given** a character with attributes
**When** I check derived stats
**Then** carry weight is derived from stamina + perks
**And** spell costs are influenced by relevant skill + magicka
**And** damage is influenced by weapon skill + strength-like derivations
**And** armor rating is sum of equipped armor + perks

### Story 2.3: Skill System (Level by Use)

As a player,
I want my skills to level up through use,
So that playing a certain style naturally improves those skills.

**Acceptance Criteria:**

**Given** a skill (e.g., one_handed)
**When** I successfully use it (hit an enemy with a sword)
**Then** skill XP is granted based on the action
**And** when XP reaches the threshold, the skill levels up
**And** a SKILL_LEVEL_UP event is emitted
**And** overall character level is recalculated from skill levels
**And** ≥80% test coverage on skill XP calculations

### Story 2.4: Level-Up & Perk System

As a player,
I want to choose an attribute increase and a perk when I level up,
So that I can customize my character build meaningfully.

**Acceptance Criteria:**

**Given** enough skill levels to trigger a character level-up
**When** I level up
**Then** I'm prompted to increase HP (+10), stamina (+10), or magicka (+10)
**And** I receive one perk point
**And** I can spend perk points on available perks in data-driven perk trees
**And** perks have prerequisites (other perks, minimum skill level)
**And** perk effects are applied to relevant systems (damage multipliers, cost reductions, new abilities)

### Story 2.5: Character Sheet CLI Display

As a player,
I want to view my character sheet in the CLI,
So that I can see my level, attributes, skills, perks, equipment, and derived stats at a glance.

**Acceptance Criteria:**

**Given** the `stats` command
**When** I view my character sheet
**Then** I see: name, race, level, HP/stamina/magicka (current/max), all skills with levels, active perks, equipped gear, derived stats (damage, armor rating, carry weight)
**And** the display is formatted for readability in a terminal (≥80 columns)

---

## Epic 3: Inventory & Equipment System

**Goal:** Implement the full inventory system with item types, equipment slots, carry weight, sorting/filtering, loot generation from leveled lists, and containers.

### Story 3.1: Item Data Model & Loading

As a developer,
I want all items loaded from JSON data files and validated against schemas,
So that the inventory system works with properly typed, validated item data.

**Acceptance Criteria:**

**Given** item JSON files in data/content/items/
**When** the data loader processes them
**Then** all items are available in the entity manager as typed Item objects
**And** the items.schema.json validates all item properties
**And** weapon subtype has damage, damage_type, speed, weapon_class
**And** armor subtype has armor_rating, slot, armor_type

### Story 3.2: Inventory Management & Carry Weight

As a player,
I want to manage my inventory with carry weight limits,
So that I make meaningful decisions about what to carry.

**Acceptance Criteria:**

**Given** a character with carry weight derived from stamina + perks
**When** I pick up an item that would exceed my carry weight
**Then** I receive a clear warning and can choose to pick up (becoming encumbered) or leave it
**And** encumbered status affects movement speed (stamina drain on travel)
**And** I can drop items to reduce weight

### Story 3.3: Equipment Slots & Stat Effects

As a player,
I want to equip weapons and armor in specific slots,
So that my equipment meaningfully affects my combat stats.

**Acceptance Criteria:**

**Given** equipment slots (head, chest, hands, feet, ring_left, ring_right, amulet, weapon_main, weapon_off, ammo)
**When** I equip an item
**Then** it moves from inventory to the appropriate slot
**And** its stat bonuses are applied to derived stats
**And** equipping a new item in an occupied slot returns the old item to inventory
**And** weapon_off slot only accepts one-handed weapons or shields

### Story 3.4: Inventory CLI Display (Sorting & Filtering)

As a player,
I want to view, sort, and filter my inventory in the CLI,
So that I can efficiently find and manage items.

**Acceptance Criteria:**

**Given** the `inventory` command
**When** I view my inventory
**Then** items are listed with: name, type, weight, value, equipped indicator, tags
**And** I can sort by: type, weight, value, name
**And** I can filter by: type, tag (enchanted, stolen, quest)
**And** current weight / max weight is displayed

### Story 3.5: Loot Generation (Leveled Lists)

As a developer,
I want a leveled loot generation system,
So that dungeons, containers, and enemies drop appropriate items based on player level and location.

**Acceptance Criteria:**

**Given** leveled list definitions in data/content/leveled-lists/
**When** a container or enemy drops loot
**Then** items are selected based on: player level, location type, rarity curves, list weights
**And** rare items appear less frequently than common ones
**And** unique/quest items are only placed in specific locations (not random)
**And** ≥80% test coverage on loot generation

---

## Epic 4: World, Navigation & Time

**Goal:** Implement the world as a location graph, navigation between locations, time-of-day system, weather, context-sensitive actions, and fast travel.

### Story 4.1: Location Graph & Data Loading

As a developer,
I want the world represented as a graph of interconnected locations loaded from JSON,
So that navigation is data-driven and new locations can be added without code changes.

**Acceptance Criteria:**

**Given** location JSON files (e.g., whiterun-hold.json, bleakfalls-barrow.json)
**When** loaded and validated
**Then** each location has: id, name, type, region, description, exits (with destination IDs and travel time), entity references, tags, ambient data
**And** all exit destination IDs reference valid locations
**And** the location graph is traversable from any node

### Story 4.2: Navigation System & Movement

As a player,
I want to navigate between locations using CLI commands,
So that I can explore the world.

**Acceptance Criteria:**

**Given** the current location with available exits
**When** I choose to go to an adjacent location
**Then** I move to that location
**And** time advances by the exit's travel_time
**And** a LOCATION_ENTERED event is emitted
**And** the new location's description, exits, and entities are displayed
**And** random encounter checks occur during travel

### Story 4.3: Time of Day System

As a player,
I want the game to track time of day,
So that the world feels dynamic and time affects gameplay.

**Acceptance Criteria:**

**Given** a time tracking system (morning/afternoon/evening/night)
**When** time advances (via travel, rest, combat, waiting)
**Then** the current time period is displayed with location descriptions
**And** NPC availability changes by time period
**And** enemy spawns may vary by time (undead more active at night)
**And** TIME_ADVANCED events are emitted

### Story 4.4: Context-Sensitive Actions

As a player,
I want to see relevant actions based on my current location and nearby entities,
So that I know what I can do without guessing.

**Acceptance Criteria:**

**Given** a location with entities (NPCs, containers, enemies, crafting stations)
**When** I view the location
**Then** context-sensitive actions are listed: talk (NPCs), loot (containers/corpses), attack (enemies), trade (vendors), train (trainers), rest (inns), read (books), inspect (items)
**And** actions are only shown when applicable

### Story 4.5: Fast Travel

As a player,
I want to fast-travel to previously visited locations,
So that I can move efficiently across the world.

**Acceptance Criteria:**

**Given** a list of previously discovered locations
**When** I use the fast-travel command
**Then** I move to the selected location
**And** time advances proportionally to the distance
**And** there's a configurable chance of a random encounter during fast travel
**And** fast-travel is blocked in combat or certain dungeons

---

## Epic 5: Combat System

**Goal:** Implement turn-based combat with weapons, spells, shout-like powers, stealth, damage types, status effects, and readable combat logs.

### Story 5.1: Combat Session & Round Structure

As a player,
I want combat to proceed in structured turns with clear phases,
So that I can make tactical decisions.

**Acceptance Criteria:**

**Given** a combat encounter initiates (player attacks enemy, enemy detects player)
**When** combat begins
**Then** a CombatSession is created with all participants
**And** each round follows: initiative → player action → enemy actions → status effect processing → round summary
**And** COMBAT_START and COMBAT_END events are emitted
**And** combat ends when all enemies are defeated, player dies, or player flees

### Story 5.2: Weapon Combat & Damage Calculation

As a player,
I want to attack with weapons and see meaningful damage calculations,
So that my equipment and skill choices matter in combat.

**Acceptance Criteria:**

**Given** a player with an equipped weapon
**When** I attack an enemy
**Then** damage = (base_weapon_damage × skill_modifier × perk_bonus × weapon_speed_factor) - (enemy_armor_rating × armor_effectiveness)
**And** critical hits are calculated from skill level + perk bonuses
**And** weapon types (1H, 2H, ranged, dual) have distinct damage and speed tradeoffs
**And** COMBAT_DAMAGE events are emitted
**And** ≥90% test coverage on damage calculation

### Story 5.3: Spell System & Magic

As a player,
I want to cast spells that cost magicka and deal typed damage or provide buffs/heals,
So that I can play a mage-style character.

**Acceptance Criteria:**

**Given** known spells (learned from spell tomes)
**When** I cast a spell
**Then** magicka is consumed (cost affected by skill level + perks)
**And** spell effects are applied (damage, heal, buff, debuff)
**And** spell damage types (fire, frost, shock) interact with resistances
**And** spell data is loaded from data/content/spells/
**And** insufficient magicka prevents casting with clear feedback

### Story 5.4: Stealth & Sneak Attacks

As a player,
I want a stealth system that affects combat initiation and enables sneak attacks,
So that I can play a stealth-based character.

**Acceptance Criteria:**

**Given** a player entering a location with enemies
**When** my detection_level is 'hidden'
**Then** I can initiate combat with a sneak attack at a damage multiplier (base 2x, increased by perks)
**And** detection is calculated from: sneak skill, armor weight, movement, light level, enemy perception
**And** detection level changes during combat based on actions (attacking reveals, hiding resets)

### Story 5.5: Status Effects & Damage Over Time

As a developer,
I want a status effect system that applies ongoing effects during combat rounds,
So that combat has tactical depth beyond hit-point trading.

**Acceptance Criteria:**

**Given** an attack or spell that applies a status effect
**When** the status effect is active
**Then** effects are processed each round: burning (fire DoT), slowed (reduced actions), staggered (skip turn), paralyzed (skip multiple turns), bleeding (physical DoT), drain_magicka, drain_stamina, poisoned
**And** status effects have duration and can stack or refresh
**And** resistances reduce effect chance and duration

### Story 5.6: Combat Log Display

As a player,
I want readable combat logs with configurable verbosity,
So that I can understand what's happening tactically.

**Acceptance Criteria:**

**Given** combat actions occurring
**When** I view combat output
**Then** succinct mode shows: "You hit the Bandit for 23 damage (14 physical + 9 fire)"
**And** detailed mode shows: "Base damage: 18 (Iron Sword) × 1.2 (One-Handed 34) × 1.1 (Armsman I) = 23.8 → 24 - Armor: 8 (Fur Armor) × 0.87 = 7 → Net: 17 physical + 6 fire (Fire Enchant) = 23"
**And** status effects, healing, and shout usage are clearly logged

---

## Epic 6: Dialogue & Quest System

**Goal:** Implement branching dialogue with conditions, quest system with stages and radiant templates, and a CLI quest journal.

### Story 6.1: Dialogue Engine & Branching Choices

As a player,
I want to engage in branching dialogue with NPCs using numbered choices,
So that conversations feel meaningful and affect the game world.

**Acceptance Criteria:**

**Given** dialogue data loaded from JSON (nodes with options, conditions, effects)
**When** I talk to an NPC
**Then** the NPC's dialogue text is displayed
**And** available options are shown as numbered choices
**And** options with unmet conditions are hidden (or shown as [locked] with hints)
**And** selecting an option navigates to the next dialogue node
**And** DIALOGUE_CHOICE_MADE events are emitted

### Story 6.2: Dialogue Condition Evaluator

As a developer,
I want a generic condition evaluation system for dialogue options,
So that dialogue can gate on any game mechanic.

**Acceptance Criteria:**

**Given** condition types: skill_check, perk_required, race_required, guild_membership, reputation_threshold, quest_stage, item_possessed, stat_check
**When** a dialogue option has conditions
**Then** all conditions are evaluated against the current game state
**And** persuasion/intimidation show success probability based on speech skill
**And** hidden checks (skill, perk, race) only reveal the option text when conditions are met
**And** ≥90% test coverage on condition evaluation

### Story 6.3: Quest System with Stages

As a player,
I want to accept, track, and complete quests with multiple stages,
So that I have structured goals driving exploration and gameplay.

**Acceptance Criteria:**

**Given** quest data loaded from JSON
**When** a quest is started (via dialogue, event, or location discovery)
**Then** the quest appears in my journal with current objectives
**And** completing stage conditions advances the quest (QUEST_STAGE_CHANGE event)
**And** quests can have rewards (items, gold, XP, reputation changes)
**And** quests can fail under certain conditions
**And** prerequisites can gate quest availability

### Story 6.4: Quest Journal CLI

As a player,
I want a CLI quest journal showing active, completed, and failed quests,
So that I always know what I'm working toward.

**Acceptance Criteria:**

**Given** the `journal` command
**When** I view my quest journal
**Then** active quests show: title, current objective, quest giver, faction (if applicable)
**And** completed quests are listed separately
**And** failed quests are listed with reason
**And** I can select a quest to see full details and stage history

### Story 6.5: Radiant Quest Generator

As a developer,
I want a template-based radiant quest generator,
So that the game can generate repeatable quests with varied targets and locations.

**Acceptance Criteria:**

**Given** radiant quest templates in data/content/quests/radiant-templates.json
**When** a radiant quest is dispatched (via innkeeper rumor, notice board, faction)
**Then** the template is instantiated with random (valid) target, location, and reward
**And** the generated quest functions like a normal quest with stages and conditions
**And** templates support parameterized dialogue and objectives

---

## Epic 7: Factions & Reputation

**Goal:** Implement faction definitions, reputation tracking, and reputation effects across combat, dialogue, economy, and quest access.

### Story 7.1: Faction Data Model & Reputation Tracking

As a developer,
I want factions defined in JSON with per-player reputation scores,
So that faction relationships drive gameplay across all systems.

**Acceptance Criteria:**

**Given** factions defined in data/content/factions/factions.json
**When** loaded and validated
**Then** each faction has: id, name, description, ranks (with reputation thresholds), hostile_below threshold, allied_above threshold
**And** player has a reputation score (-100 to +100) per faction, stored in game state
**And** REPUTATION_CHANGE events update the score and check rank changes

### Story 7.2: Reputation Effects on Systems

As a player,
I want my faction reputation to affect prices, dialogue, combat, and quest access,
So that my choices have persistent consequences.

**Acceptance Criteria:**

**Given** a player with varying faction reputations
**When** interacting with faction-affiliated NPCs/vendors
**Then** prices are modified by reputation (friendly = cheaper, hostile = refused)
**And** dialogue options unlock/lock based on reputation thresholds
**And** guard NPCs become hostile below the hostile_below threshold
**And** faction questlines require minimum reputation to access

### Story 7.3: Faction Rank Progression

As a player,
I want to rise through faction ranks by building reputation,
So that I earn titles, perks, and storyline access.

**Acceptance Criteria:**

**Given** faction rank definitions with reputation thresholds
**When** my reputation crosses a rank threshold
**Then** I receive a notification of rank promotion
**And** new benefits are unlocked (access to faction vendor, special dialogue, faction gear)
**And** rank titles are displayed in the character sheet

---

## Epic 8: Economy & Bartering

**Goal:** Implement the price calculation model, vendor system with archetypes, CLI trade interface, and economy hooks.

### Story 8.1: Price Calculation Engine

As a developer,
I want a comprehensive price calculation system,
So that trade prices reflect the player's skills, reputation, and world state.

**Acceptance Criteria:**

**Given** the formula: base_value × speech_modifier × perk_bonuses × racial_bonus × faction_rep_modifier × regional_scarcity × stolen_penalty
**When** calculating buy/sell prices
**Then** all modifiers are applied correctly
**And** speech skill reduces buy prices and increases sell prices
**And** stolen items have a sell penalty (only to fences)
**And** faction reputation modifies prices with affiliated vendors
**And** ≥95% test coverage on price calculations (this is core)

### Story 8.2: Vendor System & Archetypes

As a developer,
I want vendor NPCs with typed inventories and gold pools,
So that vendors feel distinct and the economy has structure.

**Acceptance Criteria:**

**Given** vendor archetypes: general_goods, blacksmith, alchemist, court_mage, fence, trainer
**When** a vendor is created
**Then** it has: a typed inventory pool (blacksmith stocks weapons/armor), gold reserve, pricing bias (blacksmith pays more for weapons), and restock timer
**And** vendor data is defined in NPC data files, not hardcoded

### Story 8.3: CLI Trade Interface

As a player,
I want a clear CLI interface for buying, selling, and comparing items,
So that trading feels smooth and informative.

**Acceptance Criteria:**

**Given** I initiate trade with a vendor
**When** the trade interface opens
**Then** I see: vendor's items with buy prices, my items with sell prices, vendor's gold amount
**And** I can filter/sort both inventories
**And** buying deducts gold and adds item to inventory
**And** selling adds gold and removes item from inventory
**And** price calculations are transparently shown
**And** TRADE_COMPLETED events are emitted

### Story 8.4: Economy Event Hooks

As a developer,
I want event hooks that can modify prices and vendor availability,
So that future dynamic economy features can be built on top.

**Acceptance Criteria:**

**Given** the economy system listens on the event bus
**When** world events occur (war, dragon attack, trade route disruption)
**Then** price modifiers can be applied regionally
**And** vendor availability can change
**And** this is implemented as hooks/interfaces for future content, not full features in M1

---

## Epic 9: AI Narrative Engine

**Goal:** Implement the LLM provider abstraction, prompt construction, response parsing, action validation, AI game loop, first-run configuration, and error handling.

### Story 9.1: LLM Provider Interface & Adapters

As a developer,
I want a pluggable LLM provider abstraction with adapters for each supported provider,
So that the game can use any AI model without code changes.

**Acceptance Criteria:**

**Given** the LLMProvider interface from ADR-005
**When** a provider adapter is instantiated
**Then** it implements: initialize(), generateResponse(), isAvailable()
**And** adapters exist for: Gemini, Groq, OpenRouter, Cerebras, Ollama
**And** a MockLLMProvider exists for testing
**And** provider selection is configurable at runtime

### Story 9.2: First-Run Provider Configuration

As a player,
I want to be prompted on first run to select an AI provider and enter an API key,
So that the AI narrative engine is set up without manual config file editing.

**Acceptance Criteria:**

**Given** no ai-config.yaml exists
**When** the game starts for the first time
**Then** a CLI wizard lists supported providers with free-tier indicators
**And** I select a provider and enter my API key (or endpoint URL for Ollama)
**And** the config is saved to data/config/ai-config.yaml (gitignored)
**And** the provider is tested with a health-check call
**And** environment variables are supported as alternative to the wizard

### Story 9.3: Prompt Builder

As a developer,
I want a structured prompt builder that constructs AI prompts from game state,
So that the AI always has consistent, complete context.

**Acceptance Criteria:**

**Given** the current game state
**When** a prompt is built
**Then** it includes: system message (role + rules), context block (location, time, weather, player stats, inventory highlights, active quests, nearby entities, recent events), rules block (mechanics summary, content rails), player message
**And** the context block is efficiently serialized (not the full game state, but a relevant snapshot)
**And** token count is managed to fit within model context windows

### Story 9.4: Response Parser & Validation

As a developer,
I want AI responses parsed into structured JSON and validated,
So that only valid, consistent actions are passed to the engine.

**Acceptance Criteria:**

**Given** a raw AI response
**When** parsed
**Then** it extracts: scene_description, summarized_options, proposed_actions, meta
**And** malformed responses trigger graceful fallback (retry or deterministic mode)
**And** proposed_actions are validated against engine rules (valid locations, existing items, sufficient resources)
**And** invalid actions produce a structured error for re-prompting
**And** ≥90% test coverage with canned responses

### Story 9.5: AI Game Loop Integration

As a player,
I want the AI to describe scenes and interpret my free-text input,
So that gameplay feels like a narrated, immersive RPG.

**Acceptance Criteria:**

**Given** the game loop is running with AI enabled
**When** I enter a new location or take an action
**Then** the AI describes the scene vividly (setting, NPCs, atmospheric details)
**And** I can respond in free text or choose from summarized options
**And** the AI interprets my input and proposes engine actions
**And** the engine validates and resolves the actions
**And** the updated state is fed back to the AI for the next loop

### Story 9.6: AI Error Handling & Deterministic Fallback

As a player,
I want the game to handle AI failures gracefully,
So that I can keep playing even if the AI service is unavailable.

**Acceptance Criteria:**

**Given** an AI provider failure (timeout, rate limit, missing key, malformed response)
**When** the failure occurs
**Then** the game falls back to deterministic descriptions (location descriptions from data, system-generated combat summaries)
**And** the player is notified of the fallback
**And** the AI automatically retries on subsequent turns
**And** the `/ai` command group allows switching providers, toggling AI on/off, and adjusting verbosity

---

## Epic 10: Events & Interaction Framework

**Goal:** Implement the event-driven interaction model for random encounters, world events, and extensible interaction types.

### Story 10.1: Random Encounter System

As a player,
I want random encounters while traveling between locations,
So that the world feels alive and dangerous.

**Acceptance Criteria:**

**Given** travel between locations
**When** a random encounter check succeeds (based on route danger, time, player level, config frequency)
**Then** an encounter is generated (bandits, wolves, dragon, traveling merchant, etc.)
**And** the encounter is presented with options (fight, flee, talk, sneak past)
**And** encounter templates are data-driven

### Story 10.2: Environmental Hazard Hooks

As a developer,
I want hooks for environmental hazards (cold, hunger, fatigue, storms, disease),
So that survival features can be enabled via configuration in the future.

**Acceptance Criteria:**

**Given** immersion settings with survival toggles
**When** survival is enabled
**Then** the event system can trigger hazard checks based on location, weather, and time
**And** hazards affect player stats (health drain, stamina reduction, etc.)
**And** in M1, this is hooks + interfaces only, not full survival gameplay

### Story 10.3: World Event Scheduler

As a developer,
I want a time-based event scheduler for world events,
So that the game world feels dynamic.

**Acceptance Criteria:**

**Given** a game clock advancing
**When** scheduled events trigger
**Then** world events fire (dragon sighting, faction conflict update, NPC schedule change)
**And** events modify game state through standard event bus channels
**And** events are data-driven (defined in content files)

### Story 10.4: Extensible Interaction Types

As a developer,
I want new interaction types (lockpicking, pickpocketing, alchemy checks) to be addable through the event system and skill interfaces,
So that the game can grow without core engine changes.

**Acceptance Criteria:**

**Given** the interaction framework
**When** a new interaction type is needed
**Then** it can be registered as: an event handler, a skill check type, and a context-sensitive action
**And** existing types (talk, attack, trade, loot) serve as reference implementations
**And** documentation describes how to add new interaction types

---

## Epic 11: Vertical Slice Content

**Goal:** Author all content data for the playable vertical slice: a region with locations, NPCs, enemies, items, a quest with dialogue, and a vendor.

### Story 11.1: Locations — Whiterun Region

As a content author,
I want to create 5-8 interconnected locations for the vertical slice,
So that players can explore a meaningful area.

**Acceptance Criteria:**

**Given** the location schema
**When** content is authored
**Then** locations include: Whiterun (city), The Bannered Mare (inn), Whiterun Market, Whiterun Gate (exterior), Road to Bleakfalls, Bleakfalls Approach (wilderness), Bleakfalls Barrow (dungeon entrance), Bleakfalls Depths (dungeon interior)
**And** all exits are bidirectional and valid
**And** each location has descriptions, entities, and appropriate tags

### Story 11.2: NPCs & Vendor Data

As a content author,
I want NPCs with dialogue and a vendor with inventory for the vertical slice,
So that social and economic interactions work.

**Acceptance Criteria:**

**Given** the NPC and vendor data schemas
**When** content is authored
**Then** NPCs include: Innkeeper (quest giver + rumors), Town Guard (basic dialogue), Market Vendor (general goods), and at least one quest-relevant NPC
**And** the vendor has appropriate inventory, gold pool, and pricing archetype

### Story 11.3: Enemies & Combat Encounters

As a content author,
I want enemy definitions and combat encounters for the vertical slice,
So that combat can be tested and experienced.

**Acceptance Criteria:**

**Given** enemy and leveled list schemas
**When** content is authored
**Then** enemies include: Bandit (easy, melee), Bandit Archer (easy, ranged), Draugr (medium, melee), Draugr Wight (medium, melee + shout), and a boss-type Draugr Overlord
**And** each has stats, skills, equipment, loot tables, and combat AI behavior

### Story 11.4: Items — Weapons, Armor, & Consumables

As a content author,
I want a set of items for the vertical slice covering weapons, armor, potions, and spell tomes,
So that the inventory and equipment systems have content to work with.

**Acceptance Criteria:**

**Given** item schemas
**When** content is authored
**Then** items include: 5+ weapons (iron sword, iron dagger, hunting bow, steel greatsword, staff), 5+ armor pieces (iron helm, leather armor, fur boots, iron shield, hide bracers), 5+ potions (health, stamina, magicka, poison, resist fire), 3+ spell tomes (flames, healing, frostbite)
**And** items span common to rare rarity

### Story 11.5: Quest — "The Golden Claw"

As a content author,
I want a complete short quest with multiple stages, branching dialogue, and a faction reputation check,
So that the quest system can be fully tested.

**Acceptance Criteria:**

**Given** quest and dialogue schemas
**When** content is authored
**Then** the quest has: quest giver (innkeeper with a rumor hook), 3+ stages (accept → travel to dungeon → defeat boss → return), branching dialogue (persuasion option to get extra info, intimidation option), a simple faction/reputation check, rewards (gold, item, reputation)
**And** the quest integrates with navigation (travel to location), combat (dungeon encounter), and dialogue systems

---

## Epic 12: Polish, Save/Load & Documentation

**Goal:** Implement save/load, help system, debug console, final integration testing, and the AI & Modder Guide.

### Story 12.1: Save & Load System

As a player,
I want to save and load my game,
So that I can continue playing across sessions.

**Acceptance Criteria:**

**Given** the `save` and `load` commands
**When** I save
**Then** the complete game state is written to a JSON file with version metadata
**And** I can load any save file and resume exactly where I left off
**And** save files include: player state, world state, quest state, faction state, time, config
**And** save file version mismatches produce clear migration guidance

### Story 12.2: Help System & Command Reference

As a player,
I want a comprehensive help system,
So that I can discover all available commands and mechanics.

**Acceptance Criteria:**

**Given** the `help` command
**When** I request help
**Then** I see: list of all commands with descriptions, current keybindings/shortcuts
**And** `help <command>` shows detailed usage for specific commands
**And** help text is context-sensitive (combat commands only shown during combat)

### Story 12.3: Debug Console & Dev Commands

As a developer,
I want debug console commands for testing and content development,
So that I can test systems in isolation and diagnose issues.

**Acceptance Criteria:**

**Given** debug mode is enabled
**When** I use dev commands
**Then** available commands include: teleport (move to any location), spawn_item, set_stat, advance_quest, trigger_event, show_state, set_time, set_weather
**And** all dev commands log their effects
**And** debug mode shows event bus dispatches in real time

### Story 12.4: Integration Testing — Full Gameplay Loop

As a developer,
I want an integration test that validates the complete vertical slice gameplay loop,
So that I can confirm all systems work together correctly.

**Acceptance Criteria:**

**Given** the full test suite
**When** integration tests run
**Then** a test validates: character creation → navigate to inn → dialogue with innkeeper → accept quest → navigate to dungeon → combat encounter → loot items → navigate to town → sell to vendor → complete quest → save and reload
**And** the AI loop integration test uses the MockLLMProvider
**And** all cross-system events fire correctly

### Story 12.5: AI & Modder Guide

As an AI agent or human modder,
I want a comprehensive guide on how to extend the game safely,
So that I can add content without breaking core systems.

**Acceptance Criteria:**

**Given** the docs/ai-modder-guide.md document
**When** a modder reads it
**Then** it explains: data directory structure, JSON Schema contracts, how to add items/quests/locations/factions/perks/spells/enemies, how to validate content, how to test content, example walkthroughs for adding a new item, quest, and location
**And** the guide references specific schema files and provides copy-paste examples
