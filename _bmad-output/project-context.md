# Project Context — Schyrim

## Project Overview

Schyrim is a CLI-only, AI-narrated RPG inspired by a heavily-modded Skyrim. It combines deterministic game systems with an LLM-powered narrative engine, designed for moddability and AI-first content authoring.

## Technical Stack

- **Language:** TypeScript 5.x (strict mode)
- **Runtime:** Node.js 20+
- **Build:** tsc → dist/
- **Dev Runner:** tsx
- **Test Framework:** Vitest
- **Package Manager:** npm
- **Data Format:** JSON (content), YAML (config)
- **Schema Validation:** Ajv
- **CLI Libraries:** Inquirer.js, chalk

## Architecture Pattern

Layered Architecture: Core (state, data, events, entities) → Systems (inventory, combat, dialogue, quests, navigation, economy, progression, factions, AI) → Presentation (CLI renderer, input handler, display formatters).

Cross-cutting Event Bus (typed pub/sub) for inter-system communication. Systems never import each other directly.

## Code Conventions

- **File naming:** kebab-case (e.g., `game-state.ts`, `damage-calculator.ts`)
- **Class naming:** PascalCase (e.g., `CombatSystem`, `PriceCalculator`)
- **Function naming:** camelCase
- **Type naming:** PascalCase with `I` prefix for interfaces only when disambiguating (avoid Hungarian notation generally)
- **Imports:** Named imports, no default exports
- **Error handling:** Custom error classes extending `SchyrimError` base
- **Logging:** Structured logger with levels (debug/info/warn/error) gated by config
- **Comments:** JSDoc on all public methods. Inline comments for non-obvious logic.

## Data Conventions

- All game content in `data/content/` as JSON files
- All schemas in `data/schemas/` as JSON Schema files
- Configuration in `data/config/` as YAML
- Content is validated at load time — invalid content prevents game start
- Discriminated unions for variant data types (items, locations, etc.)

## Testing Conventions

- Unit tests in `test/unit/` mirroring src/ structure
- Integration tests in `test/integration/`
- Test files named `*.test.ts`
- Use descriptive `describe`/`it` blocks
- Mock external dependencies (LLM providers, filesystem where needed)
- Target ≥80% coverage on core systems, ≥90% on critical calculations

## AI Integration Rules

- The deterministic engine is ALWAYS the source of truth
- AI proposes actions; engine validates and resolves
- Game saves are reproducible without AI involvement
- AI failures fall back to deterministic mode gracefully
- API keys are never logged or committed to version control
