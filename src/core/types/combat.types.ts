// ============================================================
// Schyrim Core Types — Combat
// ============================================================

import type { DamageType } from './items.types.js';
import type { SkillId } from './character.types.js';

/** Combat session tracking an active combat encounter */
export interface CombatSession {
    id: string;
    round: number;
    phase: CombatPhase;
    participants: CombatParticipant[];
    log: CombatLogEntry[];
    isOver: boolean;
    outcome?: CombatOutcome;
}

export type CombatPhase = 'initiative' | 'player_action' | 'enemy_action' | 'status_processing' | 'round_summary';

export interface CombatParticipant {
    entityId: string;
    name: string;
    isPlayer: boolean;
    health: number;
    healthMax: number;
    stamina: number;
    staminaMax: number;
    magicka: number;
    magickaMax: number;
    armorRating: number;
    resistances: Record<DamageType, number>; // 0.0 = no resistance, 1.0 = immune, negative = weakness
    skills: Partial<Record<SkillId, number>>;
    activeStatusEffects: StatusEffect[];
    detectionLevel: DetectionLevel;
    initiative: number;
    isAlive: boolean;
    level?: number;        // character / enemy level (used for hit resolution)
    isBlocking?: boolean;  // true when player chose Block this round (cleared by advanceRound)
    isDodging?: boolean;   // true when player chose Dodge this round (cleared by advanceRound)
}

export type DetectionLevel = 'hidden' | 'detected' | 'combat';

export type CombatOutcome = 'victory' | 'defeat' | 'fled';

// --- Combat Actions ---

export type CombatAction =
    | { type: 'attack'; targetId: string }
    | { type: 'cast_spell'; spellId: string; targetId: string }
    | { type: 'use_shout'; shoutId: string; wordLevel: 1 | 2 | 3 }
    | { type: 'use_item'; itemId: string; targetId?: string }
    | { type: 'block' }
    | { type: 'dodge' }
    | { type: 'sneak' }
    | { type: 'flee' };

// --- Damage & Effects ---

export interface DamageResult {
    rawDamage: number;
    damageType: DamageType;
    armorReduction: number;
    resistanceModifier: number;
    criticalHit: boolean;
    criticalMultiplier: number;
    sneakAttack: boolean;
    sneakMultiplier: number;
    perkBonuses: number;
    finalDamage: number;
    statusEffectsApplied: StatusEffect[];
}

export interface StatusEffect {
    id: string;
    name: string;
    type: StatusEffectType;
    magnitude: number;       // damage per tick, slow %, etc.
    duration: number;         // remaining rounds
    sourceId: string;         // what caused it
}

export type StatusEffectType =
    | 'burning'      // fire DoT
    | 'slowed'       // reduced actions / movement
    | 'staggered'    // skip next action
    | 'paralyzed'    // skip multiple turns
    | 'bleeding'     // physical DoT
    | 'drain_magicka'
    | 'drain_stamina'
    | 'poisoned'     // poison DoT
    | 'weakened'     // reduced damage output
    | 'fortified';   // increased stats temporarily

// --- Combat Log ---

export interface CombatLogEntry {
    round: number;
    phase: CombatPhase;
    actorId: string;
    action: string;           // human-readable summary
    detailed?: string;        // verbose breakdown
    damageResult?: DamageResult;
    healAmount?: number;
    statusEffects?: StatusEffect[];
}

// --- Spells ---

export type MagicSchool = 'destruction' | 'restoration' | 'conjuration' | 'alteration' | 'illusion';

export interface SpellDefinition {
    id: string;
    name: string;
    school: MagicSchool;
    description: string;
    magickaCost: number;
    damage?: number;
    healAmount?: number;
    damageType?: DamageType;
    range: 'self' | 'touch' | 'ranged' | 'area';
    castTime: 'instant' | 'charged';
    effects: SpellEffect[];
    skillRequirement: number; // minimum skill in the spell's school
}

export interface SpellEffect {
    type: StatusEffectType | 'direct_damage' | 'direct_heal' | 'summon' | 'ward';
    magnitude: number;
    duration: number; // 0 = instant
}

// --- Shouts / Powers ---

export interface ShoutDefinition {
    id: string;
    name: string;
    description: string;
    words: [ShoutWord] | [ShoutWord, ShoutWord] | [ShoutWord, ShoutWord, ShoutWord];
}

export interface ShoutWord {
    word: string;
    meaning: string;
    cooldownSeconds: number;
    effects: SpellEffect[];
    unlockRequirement?: string; // quest ID or location ID
}

// --- Enemy Templates ---

export interface EnemyDefinition {
    id: string;
    name: string;
    description: string;
    level: number;
    health: number;
    stamina: number;
    magicka: number;
    armorRating: number;
    resistances: Partial<Record<DamageType, number>>;
    skills: Partial<Record<SkillId, number>>;
    equipment: string[];      // item IDs
    lootTableId: string;      // leveled list ID
    combatBehavior: CombatBehavior;
    detectionRange: number;   // how far they can detect sneaking players
    tags: string[];
}

export interface CombatBehavior {
    preferredRange: 'melee' | 'ranged' | 'magic';
    aggressiveness: number;   // 0.0 - 1.0 (how likely to attack vs. defend)
    fleeThreshold: number;    // HP % at which they try to flee
    spellIds?: string[];      // spells they can cast
    shoutIds?: string[];      // shouts they can use
}
