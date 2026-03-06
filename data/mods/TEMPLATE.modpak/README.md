# Template Modpack

This is a template directory for creating new Schyrim mods.

## How to Use This Template

1. Copy this entire `TEMPLATE.modpak` directory
2. Rename it to your mod ID (e.g., `my-awesome-mod`)
3. Edit `modpack.json` with your mod's metadata
4. Replace the JSON files in `content/` with your own
5. Delete any `content/` subdirectories you don't need
6. Launch the game — your mod will load automatically

## modpack.json Fields

- **id**: Unique identifier (lowercase, hyphens only, e.g., `my-awesome-mod`)
- **name**: Human-readable name shown in mod list
- **version**: Semantic version (e.g., `1.0.0`)
- **author**: Your name or team
- **description**: Brief description of what the mod does
- **loadOrder**: When to load relative to other mods (higher = later = overrides)

## Content Types

This template includes sample JSON files for:

- `content/items/` — Weapons, armor, potions
- `content/spells/` — Spells and magical effects

Delete or add folders as needed. Example:
- Want to add quests? Create `content/quests/` and add JSON files
- Want to add enemies? Create `content/enemies/` and add JSON files

See `docs/MODDING.md` in the main Schyrim directory for complete documentation.

## ID Naming Convention

Use your mod ID as a prefix to avoid conflicts:

```
my_awesome_mod_sword        ✓ Good
my_awesome_mod_quest        ✓ Good
sword                        ✗ Bad (conflicts with base game)
new_item                     ✗ Bad (too generic)
```

## Testing Your Mod

1. Place your mod directory in `data/mods/`
2. Run `npm run dev`
3. Create a new game
4. Verify your content appears (items in shops, spells in spell list, etc.)

## Load Order

Mods load in order of their `loadOrder` value:

```
loadOrder: 0   ← Base game loads first
loadOrder: 50  ← This mod loads next
loadOrder: 100 ← This mod loads last (can override earlier mods)
```

If your mod should override another mod's content, use a higher `loadOrder`.

## Common Content Types

### Items
Weapons, armor, potions, ingredients, misc items. Create in `content/items/`:

```json
{
  "id": "my_mod_sword",
  "name": "Awesome Sword",
  "type": "weapon",
  "subtype": "sword",
  "damage": 20,
  ...
}
```

### Spells
Magical spells. Create in `content/spells/`:

```json
{
  "id": "my_mod_spell",
  "name": "My Spell",
  "school": "destruction",
  "magickaCost": 50,
  ...
}
```

### Quests
Quests with objectives and dialogue. Create in `content/quests/`:

```json
{
  "id": "my_mod_quest",
  "name": "Quest Name",
  "type": "side",
  "giver": "npc_id",
  ...
}
```

### Locations
Dungeons, cities, areas. Create in `content/locations/`:

```json
{
  "id": "my_mod_location",
  "name": "Location Name",
  "type": "dungeon",
  ...
}
```

### Enemies
Creatures and enemies. Create in `content/enemies/`:

```json
{
  "id": "my_mod_enemy",
  "name": "Enemy Name",
  "level": 10,
  ...
}
```

See `docs/MODDING.md` for complete documentation on all content types.

## Troubleshooting

**My mod doesn't load**
- Check console output for warnings
- Verify `modpack.json` is valid JSON
- Ensure directory is in `data/mods/`

**My items don't appear**
- Check JSON syntax (use a JSON validator)
- Verify your ID is unique (no spaces, special chars except underscores)
- Restart the game (new save, not just reload)

**My mod conflicts with another mod**
- Use a higher `loadOrder` value to override
- Make sure your IDs are unique

## Need Help?

See the full documentation:
- `docs/MOD_QUICK_START.md` — 5-minute tutorial
- `docs/MODDING.md` — Complete reference
- `docs/MOD_SYSTEM_ARCHITECTURE.md` — Technical details
- `data/mods/example-mod/` — Working example

Good luck with your mod! 🎮
