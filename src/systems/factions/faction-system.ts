// ============================================================
// Schyrim Systems — Faction System
// Reputation tracking, rank progression, and faction effects
// ============================================================

import type { GameStateManager } from '../../core/game-state.js';
import type { EventBus } from '../../core/event-bus.js';
import type { FactionDefinition, FactionRank } from '../../core/types/faction.types.js';
import { GameEventType } from '../../core/types/events.types.js';

// ============================================================
// REPUTATION
// ============================================================

/**
 * Get the player's reputation with a faction.
 * Returns the faction's default reputation if no record exists.
 */
export function getReputation(
    gsm: GameStateManager,
    factionId: string,
    factionDefs: Map<string, FactionDefinition>,
): number {
    const factions = gsm.getFactions();
    if (factions.reputations[factionId] !== undefined) {
        return factions.reputations[factionId];
    }
    const def = factionDefs.get(factionId);
    return def?.defaultReputation ?? 0;
}

/**
 * Change the player's reputation with a faction by a delta value.
 * Clamped to [-100, +100]. Emits REPUTATION_CHANGE event.
 * Also applies ally/enemy spillover: allies gain 50% of positive rep,
 * enemies gain 50% of negative rep (and vice versa).
 */
export function changeReputation(
    gsm: GameStateManager,
    bus: EventBus,
    factionId: string,
    delta: number,
    factionDefs: Map<string, FactionDefinition>,
): void {
    const oldRep = getReputation(gsm, factionId, factionDefs);
    const newRep = clampReputation(oldRep + delta);

    gsm.mutateFactions(f => ({
        ...f,
        reputations: { ...f.reputations, [factionId]: newRep },
    }));

    const oldRank = getCurrentRank(oldRep, factionDefs.get(factionId));
    const newRank = getCurrentRank(newRep, factionDefs.get(factionId));

    bus.emit(GameEventType.REPUTATION_CHANGE, {
        factionId,
        oldValue: oldRep,
        newValue: newRep,
        reason: `reputation delta ${delta > 0 ? '+' : ''}${delta}`,
    });

    // Rank change notification
    if (oldRank?.id !== newRank?.id && newRank) {
        bus.emit(GameEventType.FACTION_RANK_CHANGE, {
            factionId,
            oldRank: oldRank?.name ?? 'none',
            newRank: newRank.name,
        });
    }

    // Spillover to allies and enemies
    const def = factionDefs.get(factionId);
    if (!def) return;

    const spilloverAmount = Math.round(delta * 0.5);
    if (spilloverAmount === 0) return;

    for (const allyId of def.allies ?? []) {
        applySpillover(gsm, allyId, spilloverAmount, factionDefs);
    }

    for (const enemyId of def.enemies ?? []) {
        applySpillover(gsm, enemyId, -spilloverAmount, factionDefs);
    }
}

function applySpillover(
    gsm: GameStateManager,
    factionId: string,
    delta: number,
    factionDefs: Map<string, FactionDefinition>,
): void {
    const oldRep = getReputation(gsm, factionId, factionDefs);
    const newRep = clampReputation(oldRep + delta);
    gsm.mutateFactions(f => ({
        ...f,
        reputations: { ...f.reputations, [factionId]: newRep },
    }));
}

// ============================================================
// RANKS
// ============================================================

/**
 * Get the player's current rank within a faction based on their reputation.
 */
export function getCurrentRank(
    reputation: number,
    factionDef: FactionDefinition | undefined,
): FactionRank | undefined {
    if (!factionDef?.ranks?.length) return undefined;

    // Ranks are sorted by threshold ascending — find the highest qualified
    const sorted = [...factionDef.ranks].sort(
        (a, b) => a.reputationThreshold - b.reputationThreshold,
    );

    let currentRank: FactionRank | undefined;
    for (const rank of sorted) {
        if (reputation >= rank.reputationThreshold) {
            currentRank = rank;
        }
    }
    return currentRank;
}

/**
 * Get the next rank the player can achieve.
 */
export function getNextRank(
    reputation: number,
    factionDef: FactionDefinition | undefined,
): FactionRank | undefined {
    if (!factionDef?.ranks?.length) return undefined;

    const sorted = [...factionDef.ranks].sort(
        (a, b) => a.reputationThreshold - b.reputationThreshold,
    );

    for (const rank of sorted) {
        if (reputation < rank.reputationThreshold) {
            return rank;
        }
    }
    return undefined;
}

// ============================================================
// DISPOSITION (for NPC / system interactions)
// ============================================================

export type FactionDisposition = 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'allied';

/**
 * Get the faction's disposition toward the player based on reputation.
 */
export function getDisposition(
    reputation: number,
    factionDef: FactionDefinition | undefined,
): FactionDisposition {
    if (!factionDef) return 'neutral';

    if (reputation <= factionDef.hostileBelow) return 'hostile';
    if (reputation < -20) return 'unfriendly';
    if (reputation >= factionDef.alliedAbove) return 'allied';
    if (reputation > 30) return 'friendly';
    return 'neutral';
}

/**
 * Get the price modifier for a faction's disposition.
 * Hostile = +30% buy, -30% sell
 * Allied = -15% buy, +15% sell
 */
export function getFactionPriceModifier(
    reputation: number,
    factionDef: FactionDefinition | undefined,
    isBuying: boolean,
): number {
    const disposition = getDisposition(reputation, factionDef);
    switch (disposition) {
        case 'hostile':
            return isBuying ? 1.3 : 0.7;
        case 'unfriendly':
            return isBuying ? 1.15 : 0.85;
        case 'neutral':
            return 1.0;
        case 'friendly':
            return isBuying ? 0.9 : 1.1;
        case 'allied':
            return isBuying ? 0.85 : 1.15;
    }
}

// ============================================================
// DISPLAY
// ============================================================

export interface FactionDisplayEntry {
    factionId: string;
    name: string;
    reputation: number;
    disposition: FactionDisposition;
    currentRank: FactionRank | undefined;
    nextRank: FactionRank | undefined;
}

/**
 * Get a display-friendly list of all factions with player reputation.
 */
export function getFactionSummary(
    gsm: GameStateManager,
    factionDefs: Map<string, FactionDefinition>,
): FactionDisplayEntry[] {
    return Array.from(factionDefs.values()).map(def => {
        const reputation = getReputation(gsm, def.id, factionDefs);
        return {
            factionId: def.id,
            name: def.name,
            reputation,
            disposition: getDisposition(reputation, def),
            currentRank: getCurrentRank(reputation, def),
            nextRank: getNextRank(reputation, def),
        };
    });
}

// ============================================================
// HELPERS
// ============================================================

function clampReputation(value: number): number {
    return Math.max(-100, Math.min(100, value));
}
