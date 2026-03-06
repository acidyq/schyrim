# Mod Creation Quick Start

Get your first Schyrim mod working in 5 minutes.

## Step 1: Create the Mod Directory

```bash
mkdir -p data/mods/my-first-mod/content/items
cd data/mods/my-first-mod
```

## Step 2: Create modpack.json

Create `data/mods/my-first-mod/modpack.json`:

```json
{
  "id": "my-first-mod",
  "name": "My First Mod",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "My first custom item mod",
  "loadOrder": 100
}
```

## Step 3: Add Custom Items

Create `data/mods/my-first-mod/content/items/my-items.json`:

```json
[
  {
    "id": "my_first_mod_cool_sword",
    "name": "Cool Sword",
    "type": "weapon",
    "subtype": "sword",
    "description": "My very first custom weapon!",
    "weight": 12,
    "value": 500,
    "damage": 15,
    "enchantment": null,
    "equippable": true,
    "equipSlots": ["right_hand", "left_hand"]
  }
]
```

## Step 4: Test It

```bash
npm run dev
```

Look for this in the console output:

```
Found 1 modpack(s):
  • My First Mod v1.0.0 by Your Name
```

Your item should be available in the game!

## Common Patterns

### Add Multiple Items

In the same `my-items.json`, add more objects to the array:

```json
[
  { "id": "my_mod_sword", ... },
  { "id": "my_mod_axe", ... },
  { "id": "my_mod_dagger", ... }
]
```

Or create separate files (`my-weapons.json`, `my-armor.json`, etc.).

### Add Spells

Create `content/spells/my-spells.json`:

```json
[
  {
    "id": "my_mod_custom_spell",
    "name": "Custom Spell",
    "school": "destruction",
    "description": "My custom spell",
    "magickaCost": 50,
    "damage": 15,
    "damageType": "fire",
    "range": "ranged",
    "castTime": "instant",
    "effects": [
      {
        "type": "direct_damage",
        "magnitude": 15,
        "duration": 0
      }
    ],
    "skillRequirement": 20
  }
]
```

### Add Quests

Create `content/quests/my-quests.json`:

```json
[
  {
    "id": "my_mod_test_quest",
    "name": "Test Quest",
    "type": "side",
    "giver": "tavern_keeper",
    "description": "A test quest",
    "prerequisites": { "minLevel": 5 },
    "rewards": { "gold": 100, "xp": 500 },
    "stages": [
      {
        "number": 1,
        "description": "Talk to the tavern keeper",
        "objectives": [
          { "type": "talk", "targetId": "tavern_keeper" }
        ],
        "onComplete": []
      }
    ]
  }
]
```

### Override Base Game Content

To change a base game item, use the same ID:

```json
[
  {
    "id": "sword_iron",
    "name": "Iron Sword (Buffed)",
    "damage": 20,
    ...
  }
]
```

Make sure your mod has `loadOrder` higher than mods you want to override (default is 0).

## Directory Structure Checklist

- ✓ `data/mods/my-first-mod/`
- ✓ `data/mods/my-first-mod/modpack.json`
- ✓ `data/mods/my-first-mod/content/`
- ✓ `data/mods/my-first-mod/content/items/` (optional, create if adding items)
- ✓ `data/mods/my-first-mod/content/spells/` (optional, create if adding spells)

## Supported Content Types

Create folders in `content/` for:

| Folder | What It Contains | File Names |
|--------|------------------|-----------|
| `items/` | Weapons, armor, potions, consumables | Any `.json` |
| `spells/` | Spells and magical effects | Any `.json` |
| `quests/` | Quest definitions | Any `.json` |
| `locations/` | Dungeons, cities, areas | Any `.json` |
| `enemies/` | Creatures and NPCs to fight | Any `.json` |
| `races/` | Custom playable races | Any `.json` |
| `perks/` | Skill tree perks | Any `.json` |
| `dialogue/` | NPC dialogue trees | Any `.json` |
| `factions/` | Factions and guilds | Any `.json` |
| `vendors/` | Merchants and shops | Any `.json` |
| `leveled-lists/` | Loot tables | Any `.json` |

Only create the folders you need!

## ID Naming Convention

Use a unique prefix to avoid conflicts:

```
✓ Good:  "my_mod_sword", "my_mod_new_quest", "my_mod_dragon"
✗ Bad:   "sword", "new_quest", "dragon"
```

The prefix helps prevent accidental overwrites.

## Debugging

### Check Console Output

After launching the game with `npm run dev`, look for:

- Mod loading confirmation: `Found X modpack(s):`
- Your mod listed with name, version, author
- Any warnings about invalid JSON

### Verify JSON Syntax

Use an online JSON validator (JSONLint, VSCode syntax highlighting) to catch typos.

### Test in Game

1. Create a new character
2. Look for your items in merchant inventories
3. Check if spells appear in your spell list
4. Verify quests show in journal

## Next Steps

- Read [MODDING.md](./MODDING.md) for detailed content type documentation
- Check [example-mod](../data/mods/example-mod/) for a working example
- Review [MOD_SYSTEM_ARCHITECTURE.md](./MOD_SYSTEM_ARCHITECTURE.md) for how load order works

## Tips & Tricks

1. **Multiple Files**: Organize content across multiple JSON files. They all load!
   ```
   content/items/
     ├─ weapons.json
     ├─ armor.json
     └─ potions.json
   ```

2. **Test Incrementally**: Add one item, test it, then add more.

3. **Use Descriptive IDs**: `my_mod_dragon_slayer_sword` is clearer than `my_mod_sword_1`.

4. **Check modpack.json**: Typos here cause silent failures.

5. **Load Order Matters**: Use higher `loadOrder` to override other mods.
   ```json
   { "loadOrder": 100 }  // Loads after loadOrder: 50
   ```

## Common Issues

**"My mod doesn't load"**
- Check `modpack.json` exists and is valid JSON
- Ensure directory is in `data/mods/`
- Check console for warnings

**"My items don't appear"**
- Verify JSON syntax is valid
- Check ID is unique
- Restart the game (reload is not enough)

**"My mod overwrites another mod I didn't intend"**
- You're using the same ID
- Use your mod prefix (e.g., `my_mod_`)
- Check `loadOrder` — higher numbers override

## Need Help?

See the full [MODDING.md](./MODDING.md) guide for complete documentation on all content types and advanced features.
