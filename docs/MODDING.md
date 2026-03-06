# Schyrim Modding Guide

Schyrim is designed to be as moddable as Skyrim itself. Mods are distributed as **modpacks** (`.modpak` directories) and can extend nearly every aspect of the game: items, spells, quests, locations, NPCs, and more.

## Quick Start

1. Create a directory in `data/mods/` with your mod name (e.g., `data/mods/my-awesome-mod/`)
2. Add a `modpack.json` metadata file
3. Create a `content/` subdirectory with your content
4. Add JSON files for items, spells, quests, etc.
5. Launch the game — your mod will load automatically

## Modpack Structure

```
data/mods/
  my-awesome-mod/                    # Your mod directory (ID: my-awesome-mod)
    modpack.json                      # Metadata (REQUIRED)
    content/
      items/                          # Custom items
        weapons.json
        armor.json
        potions.json
      spells/                         # Custom spells
        destruction-spells.json
        restoration-spells.json
      locations/                      # Custom locations
        new-dungeons.json
      enemies/                        # Custom enemies
        creatures.json
      quests/                         # Custom quests
        custom-quests.json
      races/                          # Custom races
        races.json
      perks/                          # Custom perks
        custom-perks.json
      dialogue/                       # Custom dialogue trees
        npc-dialogue.json
      factions/                       # Custom factions
        factions.json
      vendors/                        # Custom vendors
        merchants.json
      leveled-lists/                  # Custom leveled lists (for random loot)
        loot-lists.json
```

## modpack.json Reference

Every modpack **must** have a `modpack.json` file in its root directory. This file contains metadata about your mod.

```json
{
  "id": "my-awesome-mod",
  "name": "My Awesome Mod",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "This mod adds awesome new weapons and quests to Schyrim",
  "dependencies": ["base-game"],
  "conflictsWith": [],
  "loadOrder": 100
}
```

### Fields

- **id** (string, REQUIRED): Unique identifier for your mod. Use lowercase with hyphens (e.g., `better-weapons`, `new-quest-pack`). Must be unique across all mods.
- **name** (string, REQUIRED): Human-readable name displayed in the mod list
- **version** (string, REQUIRED): Semantic versioning (e.g., `1.0.0`, `2.1.3`)
- **author** (string, REQUIRED): Your name or team name
- **description** (string, REQUIRED): Brief description of what your mod adds
- **dependencies** (string[], optional): Array of mod IDs that must be loaded before this mod
- **conflictsWith** (string[], optional): Array of mod IDs that are incompatible with this mod (for future conflict detection)
- **loadOrder** (number, optional): Load order priority. Higher numbers load later (and can override earlier mods). Default: 0

## Content Reference

### Items

Create `.json` files in `content/items/`:

```json
[
  {
    "id": "sword_daedric",
    "name": "Daedric Sword",
    "type": "weapon",
    "subtype": "sword",
    "description": "A wicked blade forged in the fires of Oblivion",
    "weight": 16,
    "value": 2500,
    "damage": 20,
    "enchantment": {
      "name": "Dremora's Wrath",
      "effects": [
        { "type": "fire_damage", "magnitude": 5 }
      ]
    },
    "equippable": true,
    "equipSlots": ["right_hand", "left_hand"]
  }
]
```

**Item Types:** `weapon`, `armor`, `potion`, `ingredient`, `misc`, `shout`, `spellbook`

**Subtypes for weapons:** `sword`, `axe`, `mace`, `bow`, `dagger`, `staff`

**Subtypes for armor:** `helmet`, `chestplate`, `gauntlets`, `boots`, `shield`

### Spells

Create `.json` files in `content/spells/`:

```json
[
  {
    "id": "spell_paralyze",
    "name": "Paralyze",
    "school": "alteration",
    "description": "Temporarily freezes a target in place",
    "magickaCost": 150,
    "range": "ranged",
    "castTime": "instant",
    "effects": [
      {
        "type": "paralyzed",
        "magnitude": 1,
        "duration": 5
      }
    ],
    "skillRequirement": 75
  }
]
```

**Schools:** `destruction`, `restoration`, `alteration`, `illusion`, `conjuration`, `enchanting`

**Effect Types:** `direct_damage`, `direct_heal`, `burning`, `frozen`, `paralyzed`, `drain_magicka`, `drain_stamina`, `fortified`, `slowed`, etc.

### Quests

Create `.json` files in `content/quests/`:

```json
[
  {
    "id": "quest_dragon_slayer",
    "name": "The Dragon Slayer",
    "type": "side",
    "giver": "jarl_balgruuf",
    "description": "Slay a dragon terrorizing the hold",
    "prerequisites": {
      "minLevel": 10
    },
    "rewards": {
      "gold": 5000,
      "xp": 5000
    },
    "stages": [
      {
        "number": 1,
        "description": "Speak to Jarl Balgruuf about the dragon",
        "objectives": [
          { "type": "talk", "targetId": "jarl_balgruuf" }
        ],
        "onComplete": []
      },
      {
        "number": 2,
        "description": "Travel to the dragon's lair and slay it",
        "objectives": [
          { "type": "kill_enemy", "targetId": "dragon_alduin", "count": 1 }
        ],
        "onComplete": []
      },
      {
        "number": 3,
        "description": "Return to Jarl Balgruuf",
        "objectives": [
          { "type": "talk", "targetId": "jarl_balgruuf" }
        ],
        "onComplete": [
          { "type": "grant_reward", "reward": { "gold": 5000, "xp": 5000 } }
        ]
      }
    ]
  }
]
```

### Locations

Create `.json` files in `content/locations/`:

```json
[
  {
    "id": "blackreach",
    "name": "Blackreach",
    "type": "dungeon",
    "region": "skyrim",
    "description": "An ancient underground city",
    "detailedDescription": "You enter a vast cavern filled with bioluminescent flora...",
    "exits": [
      {
        "targetLocationId": "dwemer_ruins_entrance",
        "direction": "north",
        "travelTime": 5,
        "dangerLevel": 8
      }
    ],
    "entities": [
      {
        "type": "enemy",
        "entityId": "dwemer_centurion",
        "spawnCondition": { "type": "always", "params": {} }
      }
    ],
    "tags": ["dangerous", "underground", "dungeon"],
    "ambient": {
      "defaultWeather": "clear",
      "lightLevel": "dim",
      "dangerLevel": 8
    }
  }
]
```

### Enemies

Create `.json` files in `content/enemies/`:

```json
[
  {
    "id": "dragon_alduin",
    "name": "Alduin, World-Eater",
    "type": "dragon",
    "level": 40,
    "race": "dragon",
    "description": "The draconic god of destruction",
    "health": 500,
    "stamina": 400,
    "magicka": 300,
    "attributes": {
      "strength": 20,
      "dexterity": 15,
      "constitution": 25,
      "intelligence": 18,
      "wisdom": 16,
      "charisma": 14
    },
    "skills": {
      "destruction": 90,
      "restoration": 85
    },
    "loot": {
      "listId": "dragon_loot_legendary"
    },
    "resistance": {
      "fire": 0.5,
      "frost": 0.3
    }
  }
]
```

### Races

Create `.json` files in `content/races/`:

```json
[
  {
    "id": "dwemer",
    "name": "Dwemer",
    "description": "An ancient mechanical race long extinct",
    "attributeBonuses": {
      "intelligence": 3,
      "constitution": 2
    },
    "skillBonuses": {
      "enchanting": 5,
      "alteration": 3
    },
    "racialAbility": "Tonal Resonance: Can activate machinery",
    "startingSpells": ["spell_flames"]
  }
]
```

### Perks

Create `.json` files in `content/perks/`:

```json
[
  {
    "id": "perk_berserk",
    "name": "Berserk",
    "tree": "two_handed",
    "tier": 2,
    "description": "Attacks with two-handed weapons do 25% more damage",
    "prerequisitePerks": [],
    "skillRequirement": 20,
    "effects": [
      {
        "type": "damage_multiplier",
        "target": "two_handed",
        "value": 1.25
      }
    ]
  }
]
```

### Dialogue Trees

Create `.json` files in `content/dialogue/`:

```json
[
  {
    "id": "tavern_bard_dialogue",
    "startingNode": "greeting",
    "nodes": {
      "greeting": {
        "npcSays": "Hail, traveler. What brings you to our humble tavern?",
        "choices": [
          {
            "playerSays": "I seek rumors and gossip",
            "nextNodeId": "gossip"
          },
          {
            "playerSays": "Just passing through",
            "nextNodeId": "farewell"
          }
        ]
      },
      "gossip": {
        "npcSays": "They say a dragon has been spotted to the north...",
        "choices": [
          {
            "playerSays": "A dragon, you say? That's troubling.",
            "nextNodeId": "dragon_info"
          }
        ]
      },
      "dragon_info": {
        "npcSays": "It was seen near the old dragon mound. Dangerous stuff.",
        "choices": [
          {
            "playerSays": "Thank you for the information",
            "nextNodeId": "farewell"
          }
        ]
      },
      "farewell": {
        "npcSays": "Safe travels, friend.",
        "choices": []
      }
    }
  }
]
```

### Factions

Create `.json` files in `content/factions/`:

```json
[
  {
    "id": "dawnguard",
    "name": "Dawnguard",
    "description": "An order dedicated to fighting vampires",
    "ranks": [
      { "rankNumber": 0, "title": "Initiate" },
      { "rankNumber": 1, "title": "Crossbowman" },
      { "rankNumber": 2, "title": "Sentinel" },
      { "rankNumber": 3, "title": "Knight-Commander" }
    ],
    "benefits": [
      { "minRank": 1, "description": "Can purchase enhanced crossbows" },
      { "minRank": 2, "description": "Can craft vampire-slaying weapons" }
    ]
  }
]
```

### Leveled Lists

Create `.json` files in `content/leveled-lists/`:

```json
[
  {
    "id": "loot_chest_dungeon_easy",
    "type": "loot",
    "entries": [
      {
        "itemId": "gold_coins",
        "weight": 100,
        "minLevel": 1,
        "maxQuantity": 50
      },
      {
        "itemId": "sword_iron",
        "weight": 30,
        "minLevel": 1
      },
      {
        "itemId": "armor_steel",
        "weight": 20,
        "minLevel": 5
      }
    ]
  }
]
```

## Load Order

Modpacks are loaded in order of their `loadOrder` value in `modpack.json`:

- Mods with `loadOrder: 10` load before mods with `loadOrder: 20`
- If two mods have the same ID for an item, spell, etc., the later-loading mod overrides it
- Default `loadOrder` is `0`

**Example load order:**
```
loadOrder: 0   → Base game content
loadOrder: 50  → Better Weapons mod (overrides some base weapons)
loadOrder: 100 → Custom Quest Pack (adds new quests)
loadOrder: 150 → Balance Patch (overrides everything)
```

## ID Naming Conventions

To avoid conflicts, use descriptive IDs with your mod name as a prefix:

```
✓ Good:  "my_mod_daedric_sword", "my_mod_new_quest_01", "my_mod_alduin_boss"
✗ Bad:   "daedric_sword", "new_quest", "dragon"
```

This helps prevent accidental overrides and makes it easy to identify where content comes from.

## Testing Your Mod

1. Place your modpack in `data/mods/`
2. Run `npm run dev`
3. Create a new game
4. Check console for mod loading messages
5. Verify your content appears in inventories, quest journals, etc.

## Distributing Your Mod

Future versions of Schyrim will support uploading mods to the Skyrim Nexus and other platforms. Mods will be packaged as `.modpak` files (directories or ZIP archives) that can be installed automatically.

**Recommended distribution format:**
- Compress your mod directory to `.zip`
- Name it: `ModName-1.0.0.zip`
- Include a README.txt with load order instructions and dependencies

## Troubleshooting

**My mod doesn't load:**
- Check `modpack.json` is valid JSON (use a JSON validator)
- Ensure the `id` field matches the directory name
- Check console for error messages

**My items/spells don't appear:**
- Verify the content directory structure matches the template above
- Check that JSON files are valid
- Restart the game after adding mods

**My mod conflicts with another mod:**
- Use a higher `loadOrder` value to have your mod override the other
- Or add conflicting mods to `conflictsWith` to warn users

## Advanced: Custom Content Types

While the current system supports the content types listed above, Schyrim's architecture is designed to be extensible. If you need custom content types, you can:

1. Modify `src/mod-system.ts` to support your content type
2. Update the `ContentRegistry` interface
3. Distribute your mod with documentation on the new content type

## See Also

- [Game Loop](./GAME_LOOP.md) — How the game processes actions
- [Quest System](./QUEST_SYSTEM.md) — How quests work (useful for quest modders)
- [Combat System](./COMBAT_SYSTEM.md) — How combat and spells work
