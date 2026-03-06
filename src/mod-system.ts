// ============================================================
// Schyrim — Mod System
// Enables loading and merging mod packs (.modpak) into game
// ============================================================

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ContentRegistry } from './content-registry.js';
import type { RaceDefinition, PerkDefinition } from './core/types/character.types.js';
import type { LocationDefinition } from './core/types/location.types.js';
import type { EnemyDefinition, SpellDefinition } from './core/types/combat.types.js';
import type { QuestDefinition } from './core/types/quest.types.js';
import type { Item, LeveledList } from './core/types/items.types.js';
import type { DialogueTree } from './core/types/dialogue.types.js';
import type { FactionDefinition } from './core/types/faction.types.js';
import type { VendorDefinition } from './core/types/vendor.types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODS_DIR = join(__dirname, '..', 'data', 'mods');

/**
 * Mod Pack Metadata — included in modpack.json in the root of each mod
 */
export interface ModpackMetadata {
    id: string;                    // unique mod ID (e.g., "better-weapons", "new-quest-pack")
    name: string;                  // human-readable name
    version: string;               // semver (e.g., "1.0.0")
    author: string;                // mod author name
    description: string;           // mod description
    dependencies?: string[];       // IDs of required mods
    conflictsWith?: string[];      // IDs of incompatible mods
    loadOrder?: number;            // optional load order priority (higher = later)
}

/**
 * Mod Pack Structure:
 * mods/
 *   my-mod-pack/
 *     modpack.json              (metadata)
 *     content/
 *       items/                  (optional)
 *       spells/                 (optional)
 *       locations/              (optional)
 *       enemies/                (optional)
 *       quests/                 (optional)
 *       races/                  (optional)
 *       perks/                  (optional)
 *       dialogue/               (optional)
 *       factions/               (optional)
 *       vendors/                (optional)
 *       leveled-lists/          (optional)
 */

export interface LoadedModpack {
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

function loadJsonFile<T>(filePath: string): T[] {
    if (!existsSync(filePath)) return [];
    try {
        const raw = readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [parsed];
    } catch (err) {
        console.warn(`Warning: Failed to load ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
        return [];
    }
}

function loadJsonDir<T>(dirPath: string): T[] {
    if (!existsSync(dirPath)) return [];
    const files = readdirSync(dirPath).filter(f => f.endsWith('.json'));
    return files.flatMap(f => loadJsonFile<T>(join(dirPath, f)));
}

/**
 * Load a single modpack directory
 */
export function loadModpack(modpackDir: string): LoadedModpack | null {
    const metadataPath = join(modpackDir, 'modpack.json');

    if (!existsSync(metadataPath)) {
        console.warn(`Warning: modpack.json not found in ${modpackDir}`);
        return null;
    }

    try {
        const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8')) as ModpackMetadata;
        const contentDir = join(modpackDir, 'content');

        return {
            metadata,
            races: loadJsonDir<RaceDefinition>(join(contentDir, 'races')),
            locations: loadJsonDir<LocationDefinition>(join(contentDir, 'locations')),
            enemies: loadJsonDir<EnemyDefinition>(join(contentDir, 'enemies')),
            quests: loadJsonDir<QuestDefinition>(join(contentDir, 'quests')),
            items: loadJsonDir<Item>(join(contentDir, 'items')),
            spells: loadJsonDir<SpellDefinition>(join(contentDir, 'spells')),
            dialogueTrees: loadJsonDir<DialogueTree>(join(contentDir, 'dialogue')),
            factions: loadJsonDir<FactionDefinition>(join(contentDir, 'factions')),
            perks: loadJsonDir<PerkDefinition>(join(contentDir, 'perks')),
            vendors: loadJsonDir<VendorDefinition>(join(contentDir, 'vendors')),
            leveledLists: loadJsonDir<LeveledList>(join(contentDir, 'leveled-lists')),
        };
    } catch (err) {
        console.error(`Error loading modpack from ${modpackDir}: ${err instanceof Error ? err.message : String(err)}`);
        return null;
    }
}

/**
 * Discover and load all modpacks from the mods directory
 * Returns modpacks in load order (respecting loadOrder metadata)
 */
export function discoverModpacks(): LoadedModpack[] {
    if (!existsSync(MODS_DIR)) {
        return [];
    }

    const modpacks: LoadedModpack[] = [];
    const entries = readdirSync(MODS_DIR);

    for (const entry of entries) {
        const modDir = join(MODS_DIR, entry);
        if (!statSync(modDir).isDirectory()) continue;

        const mod = loadModpack(modDir);
        if (mod) {
            modpacks.push(mod);
        }
    }

    // Sort by load order (higher loadOrder = later = higher priority)
    modpacks.sort((a, b) => {
        const aOrder = a.metadata.loadOrder ?? 0;
        const bOrder = b.metadata.loadOrder ?? 0;
        return aOrder - bOrder;
    });

    return modpacks;
}

/**
 * Merge modpack content into the base content registry
 * Later mods can override earlier mods with the same IDs
 */
export function mergeModpackIntoRegistry(registry: ContentRegistry, modpack: LoadedModpack): void {
    // Items — can override base game items
    for (const item of modpack.items) {
        registry.items.set(item.id, item);
    }

    // Spells — can override base game spells
    for (const spell of modpack.spells) {
        registry.spells.set(spell.id, spell);
    }

    // Locations — can add or override
    for (const loc of modpack.locations) {
        registry.locations.set(loc.id, loc);
    }

    // Enemies — can add or override
    for (const enemy of modpack.enemies) {
        registry.enemies.set(enemy.id, enemy);
    }

    // Quests — can add or override
    for (const quest of modpack.quests) {
        registry.quests.set(quest.id, quest);
    }

    // Races — can add or override
    for (const race of modpack.races) {
        registry.races.set(race.id, race);
    }

    // Perks — can add or override
    for (const perk of modpack.perks) {
        registry.perks.set(perk.id, perk);
    }

    // Dialogue Trees — can add or override
    for (const tree of modpack.dialogueTrees) {
        registry.dialogueTrees.set(tree.id, tree);
    }

    // Factions — can add or override
    for (const faction of modpack.factions) {
        registry.factions.set(faction.id, faction);
    }

    // Vendors — can add or override
    for (const vendor of modpack.vendors) {
        registry.vendors.set(vendor.id, vendor);
    }

    // Leveled Lists — can add or override
    for (const list of modpack.leveledLists) {
        registry.leveledLists.set(list.id, list);
    }
}

/**
 * Merge all discovered modpacks into the registry
 */
export function mergeAllModpacks(registry: ContentRegistry): void {
    const modpacks = discoverModpacks();

    if (modpacks.length > 0) {
        console.log(`Found ${modpacks.length} modpack(s):`);
        for (const mod of modpacks) {
            console.log(`  • ${mod.metadata.name} v${mod.metadata.version} by ${mod.metadata.author}`);
        }
    }

    for (const modpack of modpacks) {
        mergeModpackIntoRegistry(registry, modpack);
    }
}
