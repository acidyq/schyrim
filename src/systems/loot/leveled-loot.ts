// ============================================================
// Schyrim Systems — Leveled Loot Generator
// Template-based loot generation using weighted random selection
// ============================================================

import type { LeveledList, LeveledListEntry } from '../../core/types/items.types.js';

/** A single resolved loot drop */
export interface LootDrop {
    itemId: string;
    quantity: number;
}

/**
 * Roll a leveled list and return the resulting loot drops.
 * Filters entries by player level, then uses weighted random selection.
 *
 * @param list  — the leveled list definition
 * @param playerLevel — the player's current level
 * @param luckBias — optional bias toward rarer items (0 = no bias, positive = luckier)
 */
export function generateLoot(
    list: LeveledList,
    playerLevel: number,
    luckBias: number = 0,
): LootDrop[] {
    // Filter entries by level range
    const eligible = list.entries.filter(entry =>
        playerLevel >= entry.minLevel &&
        (entry.maxLevel === undefined || playerLevel <= entry.maxLevel)
    );

    if (eligible.length === 0) return [];

    // Determine how many times to roll
    const rollCount = randomInRange(list.rollCount.min, list.rollCount.max);
    const drops: LootDrop[] = [];

    for (let i = 0; i < rollCount; i++) {
        const picked = weightedPick(eligible, luckBias);
        if (picked) {
            const quantity = randomInRange(picked.count.min, picked.count.max);
            if (quantity > 0) {
                // Merge with existing drop of same item
                const existing = drops.find(d => d.itemId === picked.itemId);
                if (existing) {
                    existing.quantity += quantity;
                } else {
                    drops.push({ itemId: picked.itemId, quantity });
                }
            }
        }
    }

    return drops;
}

/**
 * Generate a gold reward based on player level and a base multiplier.
 *
 * @param playerLevel — current player level
 * @param baseMin — minimum gold at level 1
 * @param baseMax — maximum gold at level 1
 * @param levelScaling — additional gold per level (default 2)
 */
export function generateGoldReward(
    playerLevel: number,
    baseMin: number = 5,
    baseMax: number = 25,
    levelScaling: number = 2,
): number {
    const min = baseMin + (playerLevel - 1) * levelScaling;
    const max = baseMax + (playerLevel - 1) * levelScaling;
    return randomInRange(min, max);
}

/**
 * Generate loot for a specific context (enemy death, container, quest reward).
 * Convenience wrapper that also adds bonus gold.
 */
export function generateEncounterLoot(
    lists: LeveledList[],
    playerLevel: number,
    luckBias: number = 0,
): { drops: LootDrop[]; bonusGold: number } {
    const allDrops: LootDrop[] = [];

    for (const list of lists) {
        const drops = generateLoot(list, playerLevel, luckBias);
        for (const drop of drops) {
            const existing = allDrops.find(d => d.itemId === drop.itemId);
            if (existing) {
                existing.quantity += drop.quantity;
            } else {
                allDrops.push({ ...drop });
            }
        }
    }

    const bonusGold = generateGoldReward(playerLevel);

    return { drops: allDrops, bonusGold };
}

// ============================================================
// WEIGHTED RANDOM SELECTION
// ============================================================

/**
 * Pick a random entry from a weighted list.
 * Higher `weight` = more likely to be picked.
 * `luckBias` shifts weight toward later (rarer) entries.
 */
function weightedPick(
    entries: LeveledListEntry[],
    luckBias: number = 0,
): LeveledListEntry | null {
    if (entries.length === 0) return null;

    // Apply luck bias: increase weight of rarer (higher index) entries
    const adjustedWeights = entries.map((entry, index) => {
        const biasMultiplier = 1 + (index / entries.length) * luckBias;
        return Math.max(0.01, entry.weight * biasMultiplier);
    });

    const totalWeight = adjustedWeights.reduce((s, w) => s + w, 0);
    let roll = Math.random() * totalWeight;

    for (let i = 0; i < entries.length; i++) {
        roll -= adjustedWeights[i];
        if (roll <= 0) {
            return entries[i];
        }
    }

    return entries[entries.length - 1]; // fallback
}

// ============================================================
// HELPERS
// ============================================================

function randomInRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
