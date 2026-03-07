// ============================================================
// Schyrim Systems — Damage Calculator
// Core combat math: damage = (base × skill × perks × speed) - armor
// ============================================================

import type { DamageResult, CombatParticipant, StatusEffect, StatusEffectType } from '../../core/types/combat.types.js';
import type { WeaponItem, DamageType } from '../../core/types/items.types.js';
import type { SkillId } from '../../core/types/character.types.js';

export interface DamageContext {
    attacker: CombatParticipant;
    defender: CombatParticipant;
    weapon?: WeaponItem;
    isSneakAttack?: boolean;
    perkBonusMultiplier?: number;
    difficultyMultiplier?: number;
    /** When true, forces a critical hit regardless of the random crit roll (e.g. natural 20). */
    forceCrit?: boolean;
}

/**
 * Roll ndS dice and return the total.
 * e.g. rollDice(1, 20) = 1d20, rollDice(2, 6) = 2d6
 */
export function rollDice(count: number, sides: number): number {
    let total = 0;
    for (let i = 0; i < count; i++) {
        total += Math.floor(Math.random() * sides) + 1;
    }
    return total;
}

/**
 * Calculate damage dealt from an attacker to a defender.
 * Formula: (base_damage × skill_mod × perk_bonus × speed_factor) - (armor × effectiveness)
 * Then apply resistance and critical hit modifiers.
 */
export function calculateDamage(ctx: DamageContext): DamageResult {
    const {
        attacker,
        defender,
        weapon,
        isSneakAttack = false,
        perkBonusMultiplier = 1.0,
        difficultyMultiplier = 1.0,
        forceCrit = false,
    } = ctx;

    // Base damage
    const baseDamage = weapon?.damage ?? 5; // unarmed = 5
    const damageType: DamageType = weapon?.damageType ?? 'physical';

    // Skill modifier (0.5 at skill 0, 1.0 at skill 20, up to 2.0 at skill 100)
    const relevantSkill = getRelevantSkill(weapon);
    const skillLevel = attacker.skills[relevantSkill] ?? 0;
    const skillModifier = 0.5 + (skillLevel / 40);

    // Speed factor - fast weapons do less damage per hit, slow do more
    const speedFactor = getSpeedFactor(weapon);

    // Raw damage before armor
    let rawDamage = baseDamage * skillModifier * perkBonusMultiplier * speedFactor * difficultyMultiplier;

    // Critical hit calculation (forceCrit is set on a natural 20 from the hit roll)
    const critChance = calculateCritChance(skillLevel, perkBonusMultiplier);
    const critRoll = Math.random();
    const criticalHit = forceCrit || critRoll < critChance;
    const criticalMultiplier = criticalHit ? 1.5 : 1.0;
    rawDamage *= criticalMultiplier;

    // Sneak attack
    const sneakMultiplier = isSneakAttack ? 2.0 : 1.0;
    rawDamage *= sneakMultiplier;

    // Armor reduction (diminishing returns formula)
    const armorRating = defender.armorRating;
    const armorReduction = calculateArmorReduction(armorRating, damageType);

    // Resistance modifier
    const resistance = defender.resistances[damageType] ?? 0;
    const resistanceModifier = 1.0 - Math.min(resistance, 0.85); // cap at 85% resistance

    // Final damage
    const finalDamage = Math.max(1, Math.round((rawDamage - armorReduction) * resistanceModifier));

    // Status effects from weapon enchantment
    const statusEffectsApplied = generateStatusEffects(weapon, attacker);

    return {
        rawDamage: Math.round(rawDamage),
        damageType,
        armorReduction: Math.round(armorReduction),
        resistanceModifier,
        criticalHit,
        criticalMultiplier,
        sneakAttack: isSneakAttack,
        sneakMultiplier,
        perkBonuses: perkBonusMultiplier,
        finalDamage,
        statusEffectsApplied,
    };
}

/**
 * Format a damage result for CLI display (succinct mode).
 */
export function formatDamageSuccinct(attackerName: string, defenderName: string, result: DamageResult): string {
    let msg = `${attackerName} hits ${defenderName} for ${result.finalDamage} damage`;

    if (result.criticalHit) {
        msg += ' (CRITICAL!)';
    }
    if (result.sneakAttack) {
        msg += ' (SNEAK ATTACK!)';
    }
    if (result.damageType !== 'physical') {
        msg += ` [${result.damageType}]`;
    }

    return msg;
}

/**
 * Format a damage result for CLI display (detailed mode).
 */
export function formatDamageDetailed(result: DamageResult): string {
    const lines = [
        `  Raw: ${result.rawDamage} (base × skill × ${result.perkBonuses.toFixed(1)}x perks)`,
        `  Armor: -${result.armorReduction}`,
    ];

    if (result.resistanceModifier < 1.0) {
        lines.push(`  Resistance: ×${result.resistanceModifier.toFixed(2)} (${result.damageType})`);
    }
    if (result.criticalHit) {
        lines.push(`  Critical: ×${result.criticalMultiplier.toFixed(1)}`);
    }
    if (result.sneakAttack) {
        lines.push(`  Sneak: ×${result.sneakMultiplier.toFixed(1)}`);
    }
    lines.push(`  Final: ${result.finalDamage}`);

    return lines.join('\n');
}

// --- Internal Helpers ---

function getRelevantSkill(weapon?: WeaponItem): SkillId {
    if (!weapon) return 'one_handed'; // unarmed uses one-handed for now

    switch (weapon.weaponClass) {
        case 'one_handed_sword':
        case 'one_handed_axe':
        case 'one_handed_mace':
        case 'dagger':
            return 'one_handed';
        case 'two_handed_sword':
        case 'two_handed_axe':
        case 'two_handed_hammer':
            return 'two_handed';
        case 'bow':
        case 'crossbow':
            return 'archery';
        case 'staff':
            return 'destruction';
        default:
            return 'one_handed';
    }
}

function getSpeedFactor(weapon?: WeaponItem): number {
    if (!weapon) return 1.0;
    switch (weapon.speed) {
        case 'fast': return 0.8;
        case 'normal': return 1.0;
        case 'slow': return 1.3;
        default: return 1.0;
    }
}

function calculateCritChance(skillLevel: number, perkBonus: number): number {
    // Base 5% + 0.1% per skill level + perk modifiers
    return Math.min(0.05 + (skillLevel * 0.001 * perkBonus), 0.25); // cap at 25%
}

function calculateArmorReduction(armorRating: number, damageType: DamageType): number {
    if (damageType !== 'physical') {
        // Armor only reduces physical damage; elemental bypasses armor
        return 0;
    }
    // Diminishing returns: armor / (armor + 100)
    return (armorRating / (armorRating + 100)) * armorRating;
}

function generateStatusEffects(weapon: WeaponItem | undefined, _attacker: CombatParticipant): StatusEffect[] {
    if (!weapon?.enchantmentId) return [];

    const effects: StatusEffect[] = [];

    // Map enchantment IDs to status effects
    if (weapon.enchantmentId === 'frost_damage_1') {
        effects.push({
            id: 'frost_dot',
            name: 'Frostburn',
            type: 'slowed' as StatusEffectType,
            magnitude: 15,
            duration: 2,
            sourceId: weapon.id,
        });
    }

    return effects;
}
