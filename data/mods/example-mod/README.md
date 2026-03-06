# Example Mod Pack

This is an example mod that demonstrates how to create custom content for Schyrim.

## What This Mod Adds

- **2 weapons**: Ebony Sword, Glass Bow
- **2 spells**: Lightning Bolt, Restore Health
- **Load order**: 100 (loads after base game content)

## How It Works

1. Place this directory in `data/mods/`
2. Run the game: `npm run dev`
3. Start a new game
4. Create a character and you'll be able to find/use these items and spells

## Overriding Base Game Content

To override base game content, use the same ID. For example, to make the base "spell_flames" spell more powerful:

```json
{
  "id": "spell_flames",
  "name": "Flames",
  "school": "destruction",
  "description": "A gout of fire (buffed by this mod)",
  "magickaCost": 10,
  "damage": 15,
  "damageType": "fire",
  "range": "ranged",
  "castTime": "instant",
  "effects": [
    {
      "type": "direct_damage",
      "magnitude": 15,
      "duration": 0
    },
    {
      "type": "burning",
      "magnitude": 3,
      "duration": 4
    }
  ],
  "skillRequirement": 0
}
```

Place this in `content/spells/` and it will automatically override the base game spell since this mod loads at `loadOrder: 100`.

## Load Order Rules

- Lower `loadOrder` = loads first (base game is effectively 0)
- Higher `loadOrder` = loads last (can override earlier mods)
- Same ID in later-loading mods overwrites earlier versions

## For More Information

See `docs/MODDING.md` in the root Schyrim directory for comprehensive modding documentation.
