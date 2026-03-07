// ============================================================
// Faction System — Unit Tests
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateManager, resetGameStateManager } from '../../../src/core/game-state.js';
import { EventBus } from '../../../src/core/event-bus.js';
import type { FactionDefinition } from '../../../src/core/types/faction.types.js';
import {
    getReputation,
    changeReputation,
    getCurrentRank,
    getNextRank,
    getDisposition,
    getFactionPriceModifier,
    getFactionSummary,
} from '../../../src/systems/factions/faction-system.js';

// --- Test fixtures ---

function createTestFaction(overrides?: Partial<FactionDefinition>): FactionDefinition {
    return {
        id: 'test_guild',
        name: 'Test Guild',
        description: 'A guild for testing.',
        ranks: [
            { id: 'outsider', name: 'Outsider', reputationThreshold: -100 },
            { id: 'initiate', name: 'Initiate', reputationThreshold: 0 },
            { id: 'member', name: 'Member', reputationThreshold: 25 },
            { id: 'veteran', name: 'Veteran', reputationThreshold: 50 },
            { id: 'leader', name: 'Leader', reputationThreshold: 80 },
        ],
        hostileBelow: -50,
        alliedAbove: 50,
        defaultReputation: 0,
        allies: [],
        enemies: [],
        ...overrides,
    };
}

function createFactionMap(...factions: FactionDefinition[]): Map<string, FactionDefinition> {
    const map = new Map<string, FactionDefinition>();
    for (const f of factions) map.set(f.id, f);
    return map;
}

describe('Faction System', () => {
    let gsm: GameStateManager;
    let bus: EventBus;

    beforeEach(() => {
        resetGameStateManager();
        gsm = new GameStateManager();
        bus = new EventBus();
    });

    describe('getReputation', () => {
        it('returns default reputation when no record exists', () => {
            const faction = createTestFaction({ defaultReputation: 10 });
            const factions = createFactionMap(faction);
            expect(getReputation(gsm, 'test_guild', factions)).toBe(10);
        });

        it('returns 0 for unknown factions', () => {
            const factions = new Map<string, FactionDefinition>();
            expect(getReputation(gsm, 'nonexistent', factions)).toBe(0);
        });

        it('returns the stored reputation when one exists', () => {
            gsm.updateFactions({ reputations: { test_guild: 42 } });
            const factions = createFactionMap(createTestFaction());
            expect(getReputation(gsm, 'test_guild', factions)).toBe(42);
        });
    });

    describe('changeReputation', () => {
        it('increases reputation by delta', () => {
            const faction = createTestFaction();
            const factions = createFactionMap(faction);
            changeReputation(gsm, bus, 'test_guild', 30, factions);
            expect(getReputation(gsm, 'test_guild', factions)).toBe(30);
        });

        it('decreases reputation by delta', () => {
            gsm.updateFactions({ reputations: { test_guild: 20 } });
            const factions = createFactionMap(createTestFaction());
            changeReputation(gsm, bus, 'test_guild', -35, factions);
            expect(getReputation(gsm, 'test_guild', factions)).toBe(-15);
        });

        it('clamps to -100', () => {
            const factions = createFactionMap(createTestFaction());
            changeReputation(gsm, bus, 'test_guild', -200, factions);
            expect(getReputation(gsm, 'test_guild', factions)).toBe(-100);
        });

        it('clamps to +100', () => {
            const factions = createFactionMap(createTestFaction());
            changeReputation(gsm, bus, 'test_guild', 200, factions);
            expect(getReputation(gsm, 'test_guild', factions)).toBe(100);
        });

        it('emits REPUTATION_CHANGE event', () => {
            const events: unknown[] = [];
            bus.on('REPUTATION_CHANGE', (e) => events.push(e));
            const factions = createFactionMap(createTestFaction());
            changeReputation(gsm, bus, 'test_guild', 15, factions);
            expect(events.length).toBe(1);
            expect(events[0]).toMatchObject({
                factionId: 'test_guild',
                oldValue: 0,
                newValue: 15,
            });
        });

        it('applies spillover to allies', () => {
            const guildA = createTestFaction({ id: 'guild_a', allies: ['guild_b'], enemies: [] });
            const guildB = createTestFaction({ id: 'guild_b', allies: ['guild_a'], enemies: [] });
            const factions = createFactionMap(guildA, guildB);

            changeReputation(gsm, bus, 'guild_a', 40, factions);
            // guild_b should gain 50% spillover = +20
            expect(getReputation(gsm, 'guild_b', factions)).toBe(20);
        });

        it('applies negative spillover to enemies', () => {
            const guildA = createTestFaction({ id: 'guild_a', allies: [], enemies: ['guild_c'] });
            const guildC = createTestFaction({ id: 'guild_c' });
            const factions = createFactionMap(guildA, guildC);

            changeReputation(gsm, bus, 'guild_a', 40, factions);
            // guild_c should lose 50% spillover = -20
            expect(getReputation(gsm, 'guild_c', factions)).toBe(-20);
        });
    });

    describe('getCurrentRank', () => {
        const faction = createTestFaction();

        it('returns Outsider for very negative reputation', () => {
            expect(getCurrentRank(-100, faction)?.name).toBe('Outsider');
        });

        it('returns Initiate at 0 reputation', () => {
            expect(getCurrentRank(0, faction)?.name).toBe('Initiate');
        });

        it('returns Member at 25 reputation', () => {
            expect(getCurrentRank(25, faction)?.name).toBe('Member');
        });

        it('returns Veteran at 60 reputation', () => {
            expect(getCurrentRank(60, faction)?.name).toBe('Veteran');
        });

        it('returns Leader at 80 reputation', () => {
            expect(getCurrentRank(80, faction)?.name).toBe('Leader');
        });

        it('returns undefined for undefined faction', () => {
            expect(getCurrentRank(50, undefined)).toBeUndefined();
        });
    });

    describe('getNextRank', () => {
        const faction = createTestFaction();

        it('returns Initiate when at Outsider', () => {
            expect(getNextRank(-50, faction)?.name).toBe('Initiate');
        });

        it('returns Member when at Initiate', () => {
            expect(getNextRank(10, faction)?.name).toBe('Member');
        });

        it('returns undefined at max rank', () => {
            expect(getNextRank(100, faction)).toBeUndefined();
        });
    });

    describe('getDisposition', () => {
        const faction = createTestFaction();

        it('returns hostile below hostileBelow threshold', () => {
            expect(getDisposition(-60, faction)).toBe('hostile');
        });

        it('returns unfriendly between hostile and neutral', () => {
            expect(getDisposition(-30, faction)).toBe('unfriendly');
        });

        it('returns neutral for middling reputation', () => {
            expect(getDisposition(10, faction)).toBe('neutral');
        });

        it('returns friendly for positive reputation', () => {
            expect(getDisposition(35, faction)).toBe('friendly');
        });

        it('returns allied above alliedAbove threshold', () => {
            expect(getDisposition(55, faction)).toBe('allied');
        });
    });

    describe('getFactionPriceModifier', () => {
        const faction = createTestFaction();

        it('returns 1.3 for buying when hostile', () => {
            expect(getFactionPriceModifier(-60, faction, true)).toBe(1.3);
        });

        it('returns 0.7 for selling when hostile', () => {
            expect(getFactionPriceModifier(-60, faction, false)).toBe(0.7);
        });

        it('returns 1.0 for neutral', () => {
            expect(getFactionPriceModifier(10, faction, true)).toBe(1.0);
        });

        it('returns 0.85 for buying when allied', () => {
            expect(getFactionPriceModifier(55, faction, true)).toBe(0.85);
        });
    });

    describe('getFactionSummary', () => {
        it('returns summary for all factions', () => {
            const faction = createTestFaction();
            const factions = createFactionMap(faction);
            const summary = getFactionSummary(gsm, factions);
            expect(summary.length).toBe(1);
            expect(summary[0].factionId).toBe('test_guild');
            expect(summary[0].disposition).toBe('neutral');
        });
    });
});
