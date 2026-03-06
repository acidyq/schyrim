// ============================================================
// Schyrim — Content Registry
// Loads and indexes all game content from JSON data files
// Supports mod packs via the mod system
// ============================================================

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RaceDefinition, PerkDefinition } from './core/types/character.types.js';
import type { LocationDefinition } from './core/types/location.types.js';
import type { EnemyDefinition, SpellDefinition } from './core/types/combat.types.js';
import type { QuestDefinition } from './core/types/quest.types.js';
import type { Item, LeveledList } from './core/types/items.types.js';
import type { DialogueTree } from './core/types/dialogue.types.js';
import type { FactionDefinition } from './core/types/faction.types.js';
import type { VendorDefinition } from './core/types/vendor.types.js';
import { mergeAllModpacks } from './mod-system.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data', 'content');

function loadJsonFile<T>(filePath: string): T[] {
    if (!existsSync(filePath)) return [];
    try {
        const raw = readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
        console.error(`  Warning: Failed to load ${filePath}`);
        return [];
    }
}

function loadJsonDir<T>(subDir: string): T[] {
    const fullDir = join(DATA_DIR, subDir);
    if (!existsSync(fullDir)) return [];
    const files = readdirSync(fullDir).filter(f => f.endsWith('.json'));
    return files.flatMap(f => loadJsonFile<T>(join(fullDir, f)));
}

export interface ContentRegistry {
    races: Map<string, RaceDefinition>;
    locations: Map<string, LocationDefinition>;
    enemies: Map<string, EnemyDefinition>;
    quests: Map<string, QuestDefinition>;
    items: Map<string, Item>;
    spells: Map<string, SpellDefinition>;
    dialogueTrees: Map<string, DialogueTree>;
    factions: Map<string, FactionDefinition>;
    perks: Map<string, PerkDefinition>;
    vendors: Map<string, VendorDefinition>;
    leveledLists: Map<string, LeveledList>;
}

export function loadContent(): ContentRegistry {
    const races = new Map<string, RaceDefinition>();
    const locations = new Map<string, LocationDefinition>();
    const enemies = new Map<string, EnemyDefinition>();
    const quests = new Map<string, QuestDefinition>();
    const items = new Map<string, Item>();
    const spells = new Map<string, SpellDefinition>();
    const dialogueTrees = new Map<string, DialogueTree>();
    const factions = new Map<string, FactionDefinition>();
    const perks = new Map<string, PerkDefinition>();
    const vendors = new Map<string, VendorDefinition>();
    const leveledLists = new Map<string, LeveledList>();

    for (const race of loadJsonDir<RaceDefinition>('races')) {
        races.set(race.id, race);
    }

    for (const loc of loadJsonDir<LocationDefinition>('locations')) {
        locations.set(loc.id, loc);
    }

    for (const enemy of loadJsonDir<EnemyDefinition>('enemies')) {
        enemies.set(enemy.id, enemy);
    }

    for (const quest of loadJsonDir<QuestDefinition>('quests')) {
        quests.set(quest.id, quest);
    }

    for (const item of loadJsonDir<Item>('items')) {
        items.set(item.id, item);
    }

    for (const spell of loadJsonDir<SpellDefinition>('spells')) {
        spells.set(spell.id, spell);
    }

    for (const tree of loadJsonDir<DialogueTree>('dialogue')) {
        dialogueTrees.set(tree.id, tree);
    }

    for (const faction of loadJsonDir<FactionDefinition>('factions')) {
        factions.set(faction.id, faction);
    }

    for (const perk of loadJsonDir<PerkDefinition>('perks')) {
        perks.set(perk.id, perk);
    }

    for (const vendor of loadJsonDir<VendorDefinition>('vendors')) {
        vendors.set(vendor.id, vendor);
    }

    for (const list of loadJsonDir<LeveledList>('leveled-lists')) {
        leveledLists.set(list.id, list);
    }

    const registry = { races, locations, enemies, quests, items, spells, dialogueTrees, factions, perks, vendors, leveledLists };

    // Load and merge modpacks
    mergeAllModpacks(registry);

    return registry;
}
