---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: []
date: 2026-03-04
author: Acydyca
---

# Product Brief: Schyrim

## 1. Vision & Purpose

### Product Vision Statement

Schyrim is a deeply systemic, AI-narrated, CLI-only RPG that delivers the emergent, open-world experience of a heavily-modded Skyrim — survival, guilds, factions, dragons, magic schools, shouts, and rich character builds — rendered entirely through text with AI-generated narrative, fast feedback loops, and a moddable, data-driven architecture designed for AI-first content authoring.

### Problem Statement

Existing CLI/text RPGs fall into two camps: classic text adventures with shallow mechanics driven by linear scripts, or roguelikes with deep systems but no narrative cohesion. Neither captures the emergent, open-world, build-driven experience that has made Skyrim and its modding ecosystem beloved for over a decade. Meanwhile, modern AI capabilities are underutilized in game design — they're bolted on as chatbots rather than woven into the core gameplay loop as a narrative engine that sits on top of authoritative, deterministic game systems.

### Core Value Proposition

- **Deep Systems, Not Scripts**: Every interaction (combat, dialogue, bartering, inventory, exploration) is driven by robust simulation rules — not linear scripting. Players feel the emergent complexity of a heavily-modded Skyrim.
- **AI-Narrated Gameplay**: An LLM-powered narrative engine describes scenes, reacts to player free-text input, and proposes actions — but the deterministic game engine is always the source of truth. Saves are reproducible.
- **Terminal-Native**: Purpose-built for CLI/terminal. No GUI dependencies. Fast iteration. Playable over SSH.
- **Moddable & AI-First**: Data schemas, leveled lists, content packs, perk trees, quest templates, and faction definitions are all structured so that AI agents or human modders can safely extend the game without touching core systems.

## 2. Target Users

### Primary User Persona: The Tinkerer

- **Who**: Developers, technical enthusiasts, and power-gamers who love Skyrim's depth and modding ecosystem.
- **Motivation**: Wants to experience emergent RPG gameplay in a terminal, enjoy AI-generated narrative, and potentially author content (items, quests, factions) using AI tooling.
- **Context**: Plays in a terminal during breaks. Appreciates fast save/load, keyboard-driven interfaces, and transparent mechanics.
- **Pain Points**: Existing text RPGs are too shallow or too linear. GUI games can't run in a terminal. No good AI-integrated RPG exists.

### Secondary User Persona: The AI Modder

- **Who**: AI agents or technical users who want to extend the game by adding content packs, new quests, faction questlines, spell systems, and balance passes through data files and structured schemas.
- **Motivation**: Extend the game's content surface area rapidly using AI without breaking core mechanics.

## 3. Core Gameplay Systems (Feature Summary)

| System | Description |
|---|---|
| **Inventory, Loot & Equipment** | Typed items (weapons, armor, potions, spell tomes, soul gems, etc.) with rarity, condition, weight, tags (enchanted/stolen/unique), equipment slots, carry weight limits, CLI sorting/filtering, leveled loot lists. |
| **Bartering & Economy** | Price model (base value × speech skill × perks × racial bonuses × faction rep × regional scarcity × stolen flags), vendor archetypes (blacksmith, alchemist, fence, court mage), gold pools, CLI trade interface, hooks for dynamic economy events. |
| **Combat** | Player & enemy stat blocks (HP, stamina, magicka, armor, resistances, skills). Weapon types (melee/ranged/dual/2H), spells, shout-like powers with cooldowns, stealth abstraction, multiple damage types (physical/fire/frost/shock/poison), status effects, readable combat logs. |
| **Dialogue, Quests, Guilds & Reputation** | Branching CLI dialogue (numbered choices, skill/perk/race/guild-gated options, persuasion/intimidation checks). Reusable dialogue node data structures. Multiple factions (mages/thieves/warriors/assassins/nobles/cities/cults). Layered reputation. Quest system (main, faction, side, radiant) with stages, conditions, rewards, fail states, CLI journal. |
| **Navigation & World** | Interconnected regions (holds, cities, villages, dungeons, wilderness) with tags. CLI navigation with exits, time-of-day, weather, nearby entities. Context-sensitive actions. Fast-travel text abstraction. Points of interest, rumors, radiant quest dispatchers. |
| **Character Progression** | Skills level by use → overall character level. Attributes (HP/stamina/magicka) with level-up choices. Data-driven perk trees (warrior/mage/thief/hybrid). Skills/perks influence combat, dialogue, stealth, bartering, and exploration meaningfully. |
| **AI Narrative Engine** | LLM describes scene → player responds in plain text → AI advances story and proposes engine actions → deterministic engine validates and resolves → loop. Pluggable LLM providers (Gemini, Groq, OpenRouter, Cerebras, Ollama). Structured prompt schema (system message, context block, rules block, player input). Parsed JSON responses (scene_description, summarized_options, proposed_actions, meta). |
| **Interaction & Event Layer** | Unified interaction model. Event system for random encounters, environmental hazards (cold/hunger/fatigue), timed world events (dragon attacks, war), NPC routines. Extensible via data. |

## 4. Success Metrics

| Metric | Target |
|---|---|
| **Vertical Slice Completeness** | First milestone delivers: 1 dungeon, 1 town with vendor, 1 quest with branching dialogue, navigation across 5+ locations, combat with weapons + spells, inventory & equipment interactions. |
| **Test Coverage** | ≥ 80% unit test coverage on core systems (inventory, combat, price calc, dialogue branching, quest state, navigation). Integration test for full "quest + dungeon + vendor" loop. |
| **AI Loop Reliability** | AI narrative engine gracefully handles: missing API key, rate limits, malformed responses, provider timeouts. Fallback to deterministic-only mode. |
| **Moddability** | A new item, quest, or faction can be added by creating/editing only data files (JSON/YAML) without modifying core engine code. |
| **Performance** | CLI response time < 200ms for all non-AI actions. AI responses stream within 3s for typical prompts. |

## 5. Scope & Boundaries

### In Scope (Milestone 1 — Vertical Slice)

- Core engine with all systems above at MVP depth
- 1 short dungeon/wilderness area with combat encounters
- 1 town/inn with a vendor and basic economy loop
- 1 short quest with branching dialogue and faction/reputation check
- Navigation between 5-8 interconnected locations
- Inventory, equipment, and basic character progression
- AI narrative engine with at least 2 provider options (Gemini + Groq)
- First-run setup (provider selection, API key configuration)
- Save/load game state
- Configurable difficulty and immersion settings

### Out of Scope (Future)

- Full crafting/enchanting/alchemy systems (hooks only in M1)
- Complete open world (M1 is a slice)
- Multiplayer
- GUI/web/TUI frontends (architecture supports it, but CLI only for now)
- Full lockpicking/pickpocketing minigames (hooks only)
- Full survival system (hooks for cold/hunger/fatigue, not full implementation)
- Advanced NPC daily routines
- Mod marketplace or packaging system

## 6. Technical Constraints

- **Platform**: Node.js 20+ (for ecosystem, tooling, and async I/O)
- **Language**: TypeScript (type safety for complex game systems, AI-friendly)
- **Architecture**: Layered (Game State Core → Systems Layer → Presentation Layer), so same systems can power future GUI/web/TUI
- **Data Format**: JSON for game content (items, quests, locations, factions, perks, spells) — AI-readable and validatable via JSON Schema
- **LLM Integration**: Pluggable provider abstraction. No vendor lock-in.
- **Testing**: Vitest for unit/integration tests
- **Config**: YAML for player/developer settings (difficulty, immersion, verbosity)
- **Save Format**: JSON (deterministic, reproducible, version-migratable)

## 7. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| AI model produces invalid/inconsistent game actions | High | High | Engine is always authoritative. AI proposes, engine disposes. Validation layer rejects invalid actions and returns structured error for re-prompting. |
| Scope creep across 8+ interacting systems | High | High | Vertical slice first. Each system has clear interfaces. BMAD epics/stories enforce incremental delivery. |
| LLM costs/rate limits during development | Medium | Medium | Prioritize free-tier providers (Gemini, Groq, Cerebras). Support Ollama for local models. |
| Complex system interactions create emergent bugs | Medium | High | Strong unit + integration test coverage. Event-driven architecture with clear system boundaries. Debug/trace mode for system interactions. |
| TypeScript/Node.js performance for complex combat calculations | Low | Low | Combat is turn-based/abstracted, not real-time. Node.js is more than sufficient. |
