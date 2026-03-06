```
 ███████╗ ██████╗██╗  ██╗██╗   ██╗██████╗ ██╗███╗   ███╗
 ██╔════╝██╔════╝██║  ██║╚██╗ ██╔╝██╔══██╗██║████╗ ████║
 ███████╗██║     ███████║ ╚████╔╝ ██████╔╝██║██╔████╔██║
 ╚════██║██║     ██╔══██║  ╚██╔╝  ██╔══██╗██║██║╚██╔╝██║
 ███████║╚██████╗██║  ██║   ██║   ██║  ██║██║██║ ╚═╝ ██║
 ╚══════╝ ╚═════╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝╚═╝     ╚═╝

    AI-First CLI RPG Inspired by Skyrim
    A TypeScript vertical slice featuring quests, combat, and modding
```

---

## 🎮 About Schyrim

**Schyrim** is an ambitious AI-first CLI RPG inspired by *The Elder Scrolls V: Skyrim*. Built in TypeScript with a modern game engine foundation, it delivers a fully playable vertical slice with:

- **Dynamic AI Narrative** — Location descriptions powered by OpenRouter, Groq, or Gemini AI
- **Turn-Based Combat** — d20-based hit resolution, spells, status effects, stamina management
- **Quest System** — Branching quests with objectives, dialogue, and world state tracking
- **Dialogue Engine** — NPC conversations with skill checks, quest integration, and effects
- **Full Moddability** — Skyrim-like mod system with `.modpak` format supporting all content types
- **Inventory & Equipment** — Equip weapons/armor, manage items, buy/sell at merchants
- **Progression System** — Level up, gain skill experience, unlock perks

Perfect for:
- **Players** wanting a text-based RPG with depth and replayability
- **Modders** interested in creating custom content without touching code
- **Developers** exploring game architecture, AI integration, and modding systems

**Status**: v0.1.0 vertical slice — Core systems implemented and tested. Ready for community mods and expanded content.

---

## ✨ Key Features

### 🎯 Core Gameplay
- **Turn-based combat** with d20 mechanics (hit/miss, critical hits, fumbles)
- **Dodge/Block mechanics** with stamina costs
- **Spell casting** with schools (Destruction, Restoration, Alteration, etc.)
- **Dynamic locations** with AI-generated atmospheric descriptions
- **Full quest system** with multi-stage objectives and dialogue
- **Merchant interactions** — Buy, sell, trade with NPCs
- **Character progression** — Level up, gain skill XP, earn perks

### 🤖 AI Integration
- **Multiple AI providers** — OpenRouter, Groq, Gemini (fallback to mock)
- **Cached scene descriptions** — AI-generated location text with attribution
- **Smooth fallback** — Game works perfectly with mock AI if no API keys provided
- **Environment variables** — Configure `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`

### 📦 Modding System
- **True Skyrim-like moddability** — Create mods without touching code
- **All content types supported** — Items, spells, quests, locations, enemies, races, perks, dialogue, factions, vendors, leveled-lists
- **Load order precedence** — Later mods override earlier (balance patches enabled)
- **Auto-discovery** — Drop mods in `data/mods/` and they load automatically
- **Complete documentation** — `docs/MODDING.md`, `docs/MOD_QUICK_START.md`, and examples
- **Example mod included** — See `data/mods/example-mod/` for reference

### 🧪 Developer-Friendly
- **TypeScript + ESM** — Modern, type-safe codebase
- **Event bus architecture** — Decoupled systems communication
- **Comprehensive test coverage** — 80+ tests with Vitest
- **Well-documented systems** — Combat, quests, dialogue, AI, and more
- **Extensible design** — Easy to add new content types and features

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ (with npm or compatible package manager)
- **Git** (to clone and contribute)

### Installation

```bash
# Clone the repository
git clone https://github.com/acidyq/schyrim.git
cd schyrim

# Install dependencies
npm install

# (Optional) Set up AI providers
export OPENROUTER_API_KEY=your_key_here
export GROQ_API_KEY=your_key_here
export GEMINI_API_KEY=your_key_here

# Run the game
npm run dev

# Run tests
npm test

# Type-check
npm run type-check
```

### First Playthrough
1. Launch with `npm run dev`
2. Create a new character (choose race, name, class)
3. Explore locations and read AI-generated descriptions
4. Talk to NPCs (Hulda at the Bannered Mare has full dialogue)
5. Accept quests and track progress in your journal
6. Fight enemies with d20 combat system
7. Equip loot and manage your inventory

---

## 📁 Project Structure

```
schyrim/
├── src/
│   ├── index.ts                          # Entry point
│   ├── game-loop.ts                      # Main game loop & action handlers
│   ├── content-registry.ts               # Load game content & mods
│   ├── mod-system.ts                     # Mod loading infrastructure
│   ├── save-system.ts                    # Save/load game state
│   ├── core/
│   │   ├── game-state.ts                 # GameStateManager singleton
│   │   ├── event-bus.ts                  # Pub/sub event system
│   │   ├── data-loader.ts                # JSON loading & validation
│   │   └── types/                        # TypeScript interfaces
│   ├── systems/
│   │   ├── combat/                       # Combat mechanics & damage
│   │   ├── dialogue/                     # NPC dialogue engine
│   │   ├── inventory/                    # Equipment & items
│   │   ├── navigation/                   # Location travel & movement
│   │   ├── progression/                  # Skills, perks, leveling
│   │   ├── quests/                       # Quest tracking & objectives
│   │   └── ai/                           # AI narrative engine
│   └── presentation/
│       └── cli-renderer.ts               # TUI rendering
│
├── data/
│   ├── content/                          # Base game content (JSON)
│   │   ├── items/
│   │   ├── spells/
│   │   ├── locations/
│   │   ├── enemies/
│   │   ├── quests/
│   │   └── ...
│   └── mods/                             # User mods directory
│       ├── example-mod/                  # Working example
│       └── TEMPLATE.modpak/              # Template for new mods
│
├── docs/
│   ├── MODDING.md                        # Complete modding guide
│   ├── MOD_QUICK_START.md                # 5-minute tutorial
│   ├── MOD_SYSTEM_ARCHITECTURE.md        # Technical reference
│   └── ...
│
├── test/
│   └── ...                               # Test files
│
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md                             # This file
```

---

## 🎮 Creating Your First Mod

### The 5-Minute Way

```bash
# 1. Create mod directory
mkdir -p data/mods/my-mod/content/items

# 2. Create modpack.json
cat > data/mods/my-mod/modpack.json << 'EOF'
{
  "id": "my-mod",
  "name": "My Custom Mod",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "My first mod!",
  "loadOrder": 100
}
EOF

# 3. Add an item
cat > data/mods/my-mod/content/items/weapons.json << 'EOF'
[
  {
    "id": "my_mod_awesome_sword",
    "name": "Awesome Sword",
    "type": "weapon",
    "subtype": "sword",
    "damage": 25,
    "value": 1000,
    "weight": 12,
    "description": "An awesome custom sword",
    "equippable": true,
    "equipSlots": ["right_hand", "left_hand"]
  }
]
EOF

# 4. Launch and test!
npm run dev
```

Your item will appear in merchant inventories and loot tables. No code needed!

**For more details**, see:
- [MOD_QUICK_START.md](docs/MOD_QUICK_START.md) — Step-by-step tutorial
- [MODDING.md](docs/MODDING.md) — Complete reference for all content types
- [data/mods/example-mod/](data/mods/example-mod/) — Working example

---

## 🗺️ Development Roadmap

### ✅ Completed (v0.1.0)
- [x] Main game loop with turn-based action system
- [x] Turn-based combat with d20 mechanics
- [x] Spell casting system with multiple schools
- [x] Quest system with multi-stage objectives
- [x] NPC dialogue engine with branching trees
- [x] AI narrative engine (3 providers + mock)
- [x] **Complete modding system** with .modpak format
- [x] Merchant system and inventory management
- [x] Character progression and skills

### 🔄 In Progress
- [ ] **Merchant inventory persistence** — Track buy/sell/loot in world state
- [ ] **Gemini AI provider** — Expand narrative engine options
- [ ] **More quest content** — Main quest line, faction quests
- [ ] **Dialogue for more NPCs** — Guards, merchants, faction leaders

### 📋 Planned
- [ ] Perks that actually affect gameplay
- [ ] Faction reputation system
- [ ] Dynamic encounters and random events
- [ ] Crafting system
- [ ] More AI providers (Gemini, Ollama, etc.)
- [ ] Mod manager UI (list, enable/disable, load order)
- [ ] Skyrim Nexus mod portal integration
- [ ] .ZIP mod packaging support
- [ ] Web-based character creator
- [ ] Performance optimization & async loading

---

## 🛠️ Development

### Scripts

```bash
# Development (watch mode with tsx)
npm run dev

# Run tests
npm test

# Type-check
npm run type-check

# Run specific test file
npm test -- combat.test.ts

# Watch tests
npm test -- --watch
```

### Architecture Highlights

**Game State Management**
- `GameStateManager` singleton holds all game state
- Immutable updates via `mutatePlayer()` and `getPlayer()`
- World state tracks locations, merchants, quest progress

**Event Bus**
- Typed pub/sub for inter-system communication
- Used by quests, dialogue, and combat
- Makes systems loosely coupled

**Combat System**
- d20 hit/miss resolution with skill bonuses
- Natural 1 = fumble, Natural 20 = critical hit
- Block (+3 AC, 50% damage reduction, 10 stamina cost)
- Dodge (disadvantage on enemy attacks, 15 stamina cost)
- Spell effects and status effect duration tracking

**Mod System**
- `discoverModpacks()` finds mods in `data/mods/`
- `mergeModpackIntoRegistry()` loads content into Maps
- Load order sorting ensures precedence
- Graceful error handling (broken mods don't crash game)

---

## 📚 Documentation

- **[MODDING.md](docs/MODDING.md)** — Complete guide to creating mods (all 11 content types)
- **[MOD_QUICK_START.md](docs/MOD_QUICK_START.md)** — 5-minute tutorial for new modders
- **[MOD_SYSTEM_ARCHITECTURE.md](docs/MOD_SYSTEM_ARCHITECTURE.md)** — Technical deep dive
- **[MODDING_IMPLEMENTATION.md](MODDING_IMPLEMENTATION.md)** — What was implemented

---

## 🤝 Contributing

We welcome contributions! Here's how to help:

### Contribute Content (No Coding!)
- Create mods with custom items, spells, quests, or dialogue
- Share them on the repo or eventually on Skyrim Nexus
- See [MOD_QUICK_START.md](docs/MOD_QUICK_START.md)

### Contribute Code
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Run tests: `npm test`
5. Type-check: `npm run type-check`
6. Commit: `git commit -m "Add your feature"`
7. Push and open a PR

### Ideas for Contributions
- [ ] More quest content (main quest line, faction quests)
- [ ] Additional dialogue trees for NPCs
- [ ] More location content
- [ ] Balance adjustments and bug fixes
- [ ] Performance improvements
- [ ] Documentation improvements
- [ ] New AI providers (Gemini, Ollama, Claude)

---

## 🎵 Inspiration

Schyrim draws inspiration from:
- **The Elder Scrolls V: Skyrim** — Combat, dialogue, quests, modding philosophy
- **Baldur's Gate 3** — Turn-based combat, dialogue systems
- **Nethack & Dwarf Fortress** — ASCII/text-based gameplay depth
- **Modern RPG Engines** — Event buses, data-driven design

---

## 📝 License

MIT License — See LICENSE file for details

---

## 🙋 Support & Questions

**Found a bug?** Open an issue on GitHub
**Have a suggestion?** Start a discussion
**Want to create a mod?** Check [MOD_QUICK_START.md](docs/MOD_QUICK_START.md)

---

## 🎯 Vision

Schyrim aims to prove that:
1. AI can enhance immersion in text-based games
2. Turn-based CLI RPGs can be deeply engaging
3. True moddability (like Skyrim) is achievable without complex tools
4. Community-driven content creation drives long-term value

**The ultimate goal**: A thriving community of modders creating and sharing content, with Schyrim as the engine that makes it possible.

---

**Happy adventuring, Dragonborn! ⚔️🐉**
