// ============================================================
// Schyrim Systems — Perk Runtime
// Perk acquisition, validation, and effect application
// ============================================================

import type { PlayerState, PerkDefinition, SkillId } from '../../core/types/character.types.js';
import type { GameStateManager } from '../../core/game-state.js';
import type { EventBus } from '../../core/event-bus.js';
import { GameEventType } from '../../core/types/events.types.js';

// ============================================================
// PERK ELIGIBILITY
// ============================================================

/**
 * Check if a player can acquire a specific perk.
 */
export function canAcquirePerk(
    player: Readonly<PlayerState>,
    perkDef: PerkDefinition,
    allPerkDefs: Map<string, PerkDefinition>,
): { eligible: boolean; reason?: string } {
    // Already has perk?
    if (player.perks.includes(perkDef.id)) {
        return { eligible: false, reason: 'Already acquired.' };
    }

    // Has perk points?
    if (player.perkPoints <= 0) {
        return { eligible: false, reason: 'No perk points available.' };
    }

    // Meets skill requirement?
    const skill = player.skills[perkDef.tree];
    if (!skill || skill.level < perkDef.skillRequirement) {
        return {
            eligible: false,
            reason: `Requires ${perkDef.tree.replace(/_/g, ' ')} skill level ${perkDef.skillRequirement} (current: ${skill?.level ?? 0}).`,
        };
    }

    // Has prerequisite perks?
    for (const prereqId of perkDef.prerequisitePerks) {
        if (!player.perks.includes(prereqId)) {
            const prereqDef = allPerkDefs.get(prereqId);
            return {
                eligible: false,
                reason: `Requires perk: ${prereqDef?.name ?? prereqId}.`,
            };
        }
    }

    return { eligible: true };
}

// ============================================================
// PERK ACQUISITION
// ============================================================

/**
 * Acquire a perk for the player.
 * Returns updated player state, or null if ineligible.
 */
export function acquirePerk(
    gsm: GameStateManager,
    bus: EventBus,
    perkDef: PerkDefinition,
    allPerkDefs: Map<string, PerkDefinition>,
): { success: boolean; message: string } {
    const player = gsm.getPlayer();
    const { eligible, reason } = canAcquirePerk(player, perkDef, allPerkDefs);

    if (!eligible) {
        return { success: false, message: reason ?? 'Cannot acquire perk.' };
    }

    gsm.mutatePlayer(p => ({
        ...p,
        perks: [...p.perks, perkDef.id],
        perkPoints: p.perkPoints - 1,
    }));

    bus.emit(GameEventType.PERK_ACQUIRED, {
        perkId: perkDef.id,
        perkName: perkDef.name,
        tree: perkDef.tree,
    });

    return { success: true, message: `Acquired perk: ${perkDef.name}` };
}

// ============================================================
// PERK EFFECT QUERIES
// ============================================================

/**
 * Get the total perk bonus for a specific effect type and target.
 * E.g., total damage_multiplier for 'one_handed' = product of all matching perk values.
 */
export function getPerkBonus(
    player: Readonly<PlayerState>,
    effectType: string,
    target: string,
    allPerkDefs: Map<string, PerkDefinition>,
): number {
    let bonus = 1.0;

    for (const perkId of player.perks) {
        const perkDef = allPerkDefs.get(perkId);
        if (!perkDef) continue;

        for (const effect of perkDef.effects) {
            if (effect.type === effectType && effect.target === target) {
                // Multiplicative stacking for multipliers
                if (effectType.includes('multiplier') || effectType.includes('modifier')) {
                    bonus *= effect.value;
                } else {
                    // Additive stacking for flat bonuses
                    bonus += effect.value;
                }
            }
        }
    }

    return bonus;
}

/**
 * Get the total flat perk bonus (additive) for carry weight.
 */
export function getPerkCarryWeightBonus(
    player: Readonly<PlayerState>,
    allPerkDefs: Map<string, PerkDefinition>,
): number {
    let bonus = 0;

    for (const perkId of player.perks) {
        const perkDef = allPerkDefs.get(perkId);
        if (!perkDef) continue;

        for (const effect of perkDef.effects) {
            if (effect.type === 'carry_weight_bonus') {
                bonus += effect.value;
            }
        }
    }

    return bonus;
}

/**
 * Get the total cost reduction for a spell school + tier.
 * Returns a multiplier (0.5 = 50% cost reduction).
 */
export function getSpellCostReduction(
    player: Readonly<PlayerState>,
    school: string,
    allPerkDefs: Map<string, PerkDefinition>,
): number {
    let reduction = 1.0;

    for (const perkId of player.perks) {
        const perkDef = allPerkDefs.get(perkId);
        if (!perkDef) continue;

        for (const effect of perkDef.effects) {
            if (effect.type === 'cost_reduction' && effect.target.startsWith(school)) {
                reduction *= effect.value;
            }
        }
    }

    return reduction;
}

// ============================================================
// PERK TREE DISPLAY
// ============================================================

export interface PerkTreeEntry {
    perkDef: PerkDefinition;
    acquired: boolean;
    eligible: boolean;
    reason?: string;
}

/**
 * Get a display-friendly perk tree for a specific skill.
 */
export function getPerkTree(
    player: Readonly<PlayerState>,
    tree: SkillId,
    allPerkDefs: Map<string, PerkDefinition>,
): PerkTreeEntry[] {
    const perksInTree = Array.from(allPerkDefs.values())
        .filter(p => p.tree === tree)
        .sort((a, b) => a.tier - b.tier);

    return perksInTree.map(perkDef => {
        const acquired = player.perks.includes(perkDef.id);
        const { eligible, reason } = canAcquirePerk(player, perkDef, allPerkDefs);
        return { perkDef, acquired, eligible, reason };
    });
}

/**
 * Get all available skill trees that have perks.
 */
export function getAvailablePerkTrees(
    allPerkDefs: Map<string, PerkDefinition>,
): SkillId[] {
    const trees = new Set<SkillId>();
    for (const perk of allPerkDefs.values()) {
        trees.add(perk.tree);
    }
    return Array.from(trees).sort();
}
