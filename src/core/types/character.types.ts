// ============================================================
// Schyrim Core Types — Character & Progression
// ============================================================

import type { EquippedGear, Inventory } from './items.types.js';

/** Full player state */
export interface PlayerState {
    name: string;
    race: RaceId;
    background?: string;
    level: number;
    experience: number;
    attributes: Attributes;
    skills: Record<SkillId, SkillState>;
    perks: string[];          // IDs of acquired perks
    perkPoints: number;
    knownSpells: string[];    // IDs of learned spells
    knownShouts: string[];    // IDs of learned shouts
    activeEffects: ActiveEffect[];
    inventory: Inventory;
    equipment: EquippedGear;
    gold: number;
    currentLocationId: string;
    discoveredLocations: string[];
    activePowerCooldowns: Record<string, number>; // shout/power ID → cooldown remaining (rounds)
}

export interface Attributes {
    health: number;
    healthMax: number;
    stamina: number;
    staminaMax: number;
    magicka: number;
    magickaMax: number;
}

export interface SkillState {
    level: number;
    xp: number;
    xpToNextLevel: number;
}

export type SkillId =
    // Combat
    | 'one_handed' | 'two_handed' | 'archery' | 'block' | 'heavy_armor' | 'light_armor'
    // Magic
    | 'destruction' | 'restoration' | 'conjuration' | 'alteration' | 'illusion' | 'enchanting'
    // Stealth
    | 'sneak' | 'lockpicking' | 'pickpocket' | 'speech' | 'alchemy'
    // Crafting
    | 'smithing';

export interface ActiveEffect {
    id: string;
    name: string;
    source: string; // what caused it (potion name, spell name, etc.)
    magnitude: number;
    durationRemaining: number; // rounds or time units; 0 = permanent until removed
    effectType: ActiveEffectType;
}

export type ActiveEffectType =
    | 'fortify_attribute' | 'drain_attribute'
    | 'fortify_skill' | 'resist_element'
    | 'regenerate' | 'invisibility' | 'waterbreathing'
    | 'disease' | 'poison';

// --- Races ---

export type RaceId =
    | 'nord' | 'imperial' | 'breton' | 'redguard'
    | 'dunmer' | 'altmer' | 'bosmer' | 'orc'
    | 'khajiit' | 'argonian';

export interface RaceDefinition {
    id: RaceId;
    name: string;
    description: string;
    attributeBonuses: Partial<Record<keyof Attributes, number>>;
    skillBonuses: Partial<Record<SkillId, number>>;
    racialAbility?: string; // description of passive ability
    startingSpells?: string[]; // spell IDs
}

// --- Perks ---

export interface PerkDefinition {
    id: string;
    name: string;
    tree: SkillId;
    tier: number; // 1-5, determines position in tree
    description: string;
    prerequisitePerks: string[];
    skillRequirement: number; // minimum skill level in the tree's skill
    effects: PerkEffect[];
    maxRanks?: number; // default 1
}

export interface PerkEffect {
    type: PerkEffectType;
    target: string; // what it modifies
    value: number; // multiplier or flat bonus
}

export type PerkEffectType =
    | 'damage_multiplier' | 'cost_reduction' | 'armor_bonus'
    | 'sneak_multiplier' | 'price_modifier' | 'new_ability'
    | 'resistance_bonus' | 'xp_bonus' | 'carry_weight_bonus';

// --- Derived Stats (calculated, not stored) ---

export interface DerivedStats {
    carryWeight: number;
    armorRating: number;
    weaponDamage: number;
    spellCostModifier: number; // multiplier, lower = cheaper
    sneakEffectiveness: number;
    critChance: number;
    priceModifier: number; // lower = better prices
}
