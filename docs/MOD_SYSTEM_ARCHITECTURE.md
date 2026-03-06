# Schyrim Mod System Architecture

## Overview

The Schyrim mod system enables users to extend game content without modifying base game files. Mods are distributed as **modpacks** — directories containing a `modpack.json` metadata file and a `content/` folder with JSON files.

## System Components

### 1. Mod Discovery & Loading (`src/mod-system.ts`)

```
loadContent() [content-registry.ts]
    ↓
    Loads base game content (data/content/)
    ↓
mergeAllModpacks() [content-registry.ts → mod-system.ts]
    ↓
    discoverModpacks()
        ├─ Scan data/mods/ directory
        ├─ Load modpack.json from each mod directory
        ├─ loadModpack() reads metadata and content JSON files
        └─ Sort by loadOrder (ascending)
    ↓
    For each modpack in order:
        └─ mergeModpackIntoRegistry()
            └─ For each content type (items, spells, etc.):
                └─ registry.{type}.set(id, content)  [overwrites if ID exists]
```

### 2. Load Order & Precedence

```
Load Timeline (in order of execution):

[Base Game Content]  loadOrder = 0 (implicit)
    |
    ├─ race_nord, item_sword_iron, spell_flames, etc.
    |
[Mod A]  loadOrder = 50
    |
    ├─ Adds: item_ebony_sword, item_glass_armor
    ├─ Overrides: spell_flames (makes it stronger)
    |
[Mod B]  loadOrder = 100
    |
    ├─ Adds: quest_dragon_slayer
    ├─ Overrides: item_ebony_sword (from Mod A)
    |
[Mod C]  loadOrder = 100 (same as B, order may vary)
    |
    └─ Final result in ContentRegistry

Final Item Registry:
  - item_sword_iron (from Base)
  - item_ebony_sword (from Mod B, overrode Mod A's version)
  - item_glass_armor (from Mod A)
  - spell_flames (from Mod A, overrode Base)
  - quest_dragon_slayer (from Mod B)
```

### 3. Directory Structure

```
schyrim/
├─ src/
│  ├─ content-registry.ts          ← Updated to call mergeAllModpacks()
│  ├─ mod-system.ts                ← NEW: Core mod loading logic
│  └─ game-loop.ts
│
├─ data/
│  ├─ content/                     ← Base game content
│  │  ├─ items/
│  │  ├─ spells/
│  │  ├─ locations/
│  │  ├─ enemies/
│  │  ├─ quests/
│  │  ├─ races/
│  │  ├─ dialogue/
│  │  ├─ factions/
│  │  ├─ perks/
│  │  ├─ vendors/
│  │  └─ leveled-lists/
│  │
│  └─ mods/                        ← User and example mods
│     ├─ example-mod/
│     │  ├─ modpack.json
│     │  ├─ content/
│     │  │  ├─ items/
│     │  │  └─ spells/
│     │  └─ README.md
│     │
│     └─ (other mods go here)
│
└─ docs/
   ├─ MODDING.md                   ← Modding guide
   └─ MOD_SYSTEM_ARCHITECTURE.md   ← This file
```

## API Reference

### `src/mod-system.ts`

#### `ModpackMetadata`

```typescript
interface ModpackMetadata {
    id: string;              // Unique mod ID
    name: string;            // Human-readable name
    version: string;         // Semver (e.g., "1.0.0")
    author: string;          // Mod author
    description: string;     // What the mod does
    dependencies?: string[]; // IDs of mods that must load first
    conflictsWith?: string[]; // IDs of incompatible mods
    loadOrder?: number;      // 0-n, higher loads later (overrides)
}
```

#### `LoadedModpack`

```typescript
interface LoadedModpack {
    metadata: ModpackMetadata;
    races: RaceDefinition[];
    locations: LocationDefinition[];
    enemies: EnemyDefinition[];
    quests: QuestDefinition[];
    items: Item[];
    spells: SpellDefinition[];
    dialogueTrees: DialogueTree[];
    factions: FactionDefinition[];
    perks: PerkDefinition[];
    vendors: VendorDefinition[];
    leveledLists: LeveledList[];
}
```

#### `loadModpack(modpackDir: string): LoadedModpack | null`

Loads a single modpack from disk. Reads `modpack.json` and all content JSON files.

#### `discoverModpacks(): LoadedModpack[]`

Scans `data/mods/` for all modpack directories. Returns array sorted by `loadOrder`.

#### `mergeModpackIntoRegistry(registry: ContentRegistry, modpack: LoadedModpack): void`

Merges modpack content into the main registry. Later calls overwrite earlier ones.

#### `mergeAllModpacks(registry: ContentRegistry): void`

Loads all discovered modpacks and merges them in order.

### `src/content-registry.ts` (Updated)

```typescript
export function loadContent(): ContentRegistry {
    // ... loads base game content into Maps
    const registry = { races, locations, enemies, ... };

    // NEW: Load and merge modpacks
    mergeAllModpacks(registry);

    return registry;
}
```

## How Mods Override Content

### Scenario: Buffing a Base Game Spell

1. **Base game** (`data/content/spells/destruction-spells.json`):
   ```json
   { "id": "spell_flames", "magickaCost": 14, "damage": 8, ... }
   ```

2. **Create mod** (`data/mods/balance-patch/modpack.json`):
   ```json
   {
     "id": "balance-patch",
     "name": "Balance Patch",
     "loadOrder": 200
   }
   ```

3. **Add spell to mod** (`data/mods/balance-patch/content/spells/flames-buff.json`):
   ```json
   { "id": "spell_flames", "magickaCost": 12, "damage": 12, ... }
   ```

4. **Result**: The spell is loaded once from base game, then overwritten when the mod loads.

## Conflict Resolution

### Multiple Mods Modifying Same Content

If two mods modify the same item/spell, the one with **higher `loadOrder`** wins:

```
Mod A (loadOrder: 50) adds: { id: "my_item", damage: 10 }
Mod B (loadOrder: 100) adds: { id: "my_item", damage: 20 }

Result: my_item has damage 20 (Mod B's version)
```

### Dependency Ordering (Future Enhancement)

The `dependencies` field allows mods to specify prerequisites. A mod manager could eventually enforce these:

```json
{
  "id": "quest-pack-extended",
  "dependencies": ["base-game", "balance-patch"],
  "loadOrder": 150
}
```

## Future Enhancements

### 1. Conflict Detection

```typescript
// Check for incompatibilities before loading
validateModCompatibility(modpacks: LoadedModpack[]): ConflictReport
```

### 2. .ZIP Archive Support

Enable mods packaged as `.zip` files:

```
data/mods/
  ├─ example-mod/
  └─ amazing-mod-1.2.3.zip  ← Automatically extract
```

### 3. Mod Manager UI

A CLI tool to:
- List installed mods
- Enable/disable mods
- Manage load order
- Check for conflicts
- Download from mod portal

### 4. Skyrim Nexus Integration

- Metadata format compatible with Nexus Mod Manager
- Download mods directly from Nexus
- Automatic dependency resolution
- Community ratings and reviews

## Performance Considerations

- **Load time**: ~O(n) where n = number of content JSON files across all mods
- **Memory**: Each item/spell/etc. stored in Map — O(1) lookup by ID
- **Merge overhead**: Minimal — just Map.set() calls in load order

## Error Handling

```typescript
// Invalid modpack.json → Warning logged, mod skipped
// Invalid content JSON → Warning logged, file skipped
// Missing modpack.json → Warning logged, directory skipped

// Result: Game always starts, even with broken mods
```

## Examples

### Simple Item Mod

```
my-items-mod/
├─ modpack.json
│  {
│    "id": "my-items",
│    "name": "My Custom Items",
│    "version": "1.0.0",
│    "author": "Me",
│    "description": "Adds cool new weapons",
│    "loadOrder": 50
│  }
└─ content/items/my-weapons.json
   [{ "id": "my_items_sword", ... }, ...]
```

### Quest Expansion Mod

```
quest-expansion/
├─ modpack.json
│  {
│    "id": "quest-expansion",
│    "name": "Quest Expansion",
│    "loadOrder": 60,
│    "dependencies": ["base-game"]
│  }
├─ content/quests/new-quests.json
├─ content/locations/new-locations.json
├─ content/enemies/new-enemies.json
└─ content/dialogue/quest-dialogue.json
```

### Balance Patch (Overrides)

```
balance-patch/
├─ modpack.json
│  {
│    "id": "balance-patch",
│    "name": "Balance Fixes",
│    "loadOrder": 999,
│    "description": "Fixes overpowered items and spells"
│  }
└─ content/
   ├─ items/nerfs.json           (overrides base game items)
   ├─ spells/spell-rebalance.json (overrides spells)
   └─ enemies/enemy-buffs.json    (overrides enemies)
```

## Testing

To test the mod system:

1. Create a test mod in `data/mods/test-mod/`
2. Add a `modpack.json` with unique `loadOrder`
3. Add custom content to `content/` subdirectories
4. Run `npm run dev`
5. Check console output for mod loading confirmation
6. Verify content appears in game

## See Also

- [MODDING.md](./MODDING.md) — User-facing modding guide
- [src/mod-system.ts](../src/mod-system.ts) — Implementation
- [src/content-registry.ts](../src/content-registry.ts) — Integration point
