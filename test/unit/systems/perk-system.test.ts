// ============================================================
// Perk System — Unit Tests
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateManager, resetGameStateManager } from '../../../src/core/game-state.js';
import { EventBus } from '../../../src/core/event-bus.js';
import type { PerkDefinition } from '../../../src/core/types/character.types.js';
import {
    canAcquirePerk,
    acquirePerk,
    getPerkBonus,
    getPerkCarryWeightBonus,
    getSpellCostReduction,
    getPerkTree,
    getAvailablePerkTrees,
} from '../../../src/systems/progression/perk-system.js';
import { initializeSkills } from '../../../src/systems/progression/skill-system.js';

// --- Fixtures ---

function createTestPerk(overrides?: Partial<PerkDefinition>): PerkDefinition {
    return {
        id: 'test_perk',
        name: 'Test Perk',
        tree: 'one_handed',
        tier: 1,
        description: 'A test perk.',
        prerequisitePerks: [],
        skillRequirement: 0,
        effects: [{ type: 'damage_multiplier', target: 'one_handed', value: 1.2 }],
        ...overrides,
    };
}

function createPerkMap(...perks: PerkDefinition[]): Map<string, PerkDefinition> {
    const map = new Map<string, PerkDefinition>();
    for (const p of perks) map.set(p.id, p);
    return map;
}

describe('Perk System', () => {
    let gsm: GameStateManager;
    let bus: EventBus;

    beforeEach(() => {
        resetGameStateManager();
        gsm = new GameStateManager();
        bus = new EventBus();

        // Give player skills and a perk point
        gsm.mutatePlayer(p => ({
            ...p,
            perkPoints: 3,
            skills: initializeSkills(),
        }));
    });

    describe('canAcquirePerk', () => {
        it('returns eligible for a basic perk with no requirements', () => {
            const perk = createTestPerk();
            const perks = createPerkMap(perk);
            const result = canAcquirePerk(gsm.getPlayer(), perk, perks);
            expect(result.eligible).toBe(true);
        });

        it('returns ineligible if already acquired', () => {
            const perk = createTestPerk();
            gsm.mutatePlayer(p => ({ ...p, perks: ['test_perk'] }));
            const result = canAcquirePerk(gsm.getPlayer(), perk, createPerkMap(perk));
            expect(result.eligible).toBe(false);
            expect(result.reason).toContain('Already');
        });

        it('returns ineligible if no perk points', () => {
            const perk = createTestPerk();
            gsm.mutatePlayer(p => ({ ...p, perkPoints: 0 }));
            const result = canAcquirePerk(gsm.getPlayer(), perk, createPerkMap(perk));
            expect(result.eligible).toBe(false);
            expect(result.reason).toContain('No perk points');
        });

        it('returns ineligible if skill requirement not met', () => {
            const perk = createTestPerk({ skillRequirement: 999 });
            const result = canAcquirePerk(gsm.getPlayer(), perk, createPerkMap(perk));
            expect(result.eligible).toBe(false);
            expect(result.reason).toContain('Requires');
        });

        it('returns ineligible if prerequisite perk missing', () => {
            const prereq = createTestPerk({ id: 'prereq_perk', name: 'Prereq' });
            const perk = createTestPerk({ id: 'advanced_perk', prerequisitePerks: ['prereq_perk'] });
            const perks = createPerkMap(prereq, perk);
            const result = canAcquirePerk(gsm.getPlayer(), perk, perks);
            expect(result.eligible).toBe(false);
            expect(result.reason).toContain('Requires perk');
        });

        it('returns eligible when prerequisite is met', () => {
            const prereq = createTestPerk({ id: 'prereq_perk', name: 'Prereq' });
            const perk = createTestPerk({ id: 'advanced_perk', prerequisitePerks: ['prereq_perk'] });
            gsm.mutatePlayer(p => ({ ...p, perks: ['prereq_perk'] }));
            const perks = createPerkMap(prereq, perk);
            const result = canAcquirePerk(gsm.getPlayer(), perk, perks);
            expect(result.eligible).toBe(true);
        });
    });

    describe('acquirePerk', () => {
        it('acquires a perk and deducts a perk point', () => {
            const perk = createTestPerk();
            const result = acquirePerk(gsm, bus, perk, createPerkMap(perk));
            expect(result.success).toBe(true);
            expect(gsm.getPlayer().perks).toContain('test_perk');
            expect(gsm.getPlayer().perkPoints).toBe(2);
        });

        it('emits PERK_ACQUIRED event', () => {
            const events: unknown[] = [];
            bus.on('PERK_ACQUIRED', (e) => events.push(e));
            const perk = createTestPerk();
            acquirePerk(gsm, bus, perk, createPerkMap(perk));
            expect(events.length).toBe(1);
            expect(events[0]).toMatchObject({ perkId: 'test_perk', perkName: 'Test Perk' });
        });

        it('fails for ineligible perk', () => {
            gsm.mutatePlayer(p => ({ ...p, perkPoints: 0 }));
            const perk = createTestPerk();
            const result = acquirePerk(gsm, bus, perk, createPerkMap(perk));
            expect(result.success).toBe(false);
        });
    });

    describe('getPerkBonus', () => {
        it('returns 1.0 with no perks', () => {
            const perks = createPerkMap(createTestPerk());
            const bonus = getPerkBonus(gsm.getPlayer(), 'damage_multiplier', 'one_handed', perks);
            expect(bonus).toBe(1.0);
        });

        it('returns perk value when perk is acquired', () => {
            const perk = createTestPerk({
                effects: [{ type: 'damage_multiplier', target: 'one_handed', value: 1.2 }],
            });
            gsm.mutatePlayer(p => ({ ...p, perks: ['test_perk'] }));
            const bonus = getPerkBonus(gsm.getPlayer(), 'damage_multiplier', 'one_handed', createPerkMap(perk));
            expect(bonus).toBeCloseTo(1.2);
        });

        it('stacks multiple perks multiplicatively', () => {
            const perk1 = createTestPerk({
                id: 'perk1',
                effects: [{ type: 'damage_multiplier', target: 'one_handed', value: 1.2 }],
            });
            const perk2 = createTestPerk({
                id: 'perk2',
                effects: [{ type: 'damage_multiplier', target: 'one_handed', value: 1.4 }],
            });
            gsm.mutatePlayer(p => ({ ...p, perks: ['perk1', 'perk2'] }));
            const bonus = getPerkBonus(gsm.getPlayer(), 'damage_multiplier', 'one_handed', createPerkMap(perk1, perk2));
            expect(bonus).toBeCloseTo(1.68); // 1.2 * 1.4
        });
    });

    describe('getPerkCarryWeightBonus', () => {
        it('returns 0 with no carry weight perks', () => {
            const perks = createPerkMap(createTestPerk());
            expect(getPerkCarryWeightBonus(gsm.getPlayer(), perks)).toBe(0);
        });

        it('returns bonus when perk is acquired', () => {
            const perk = createTestPerk({
                id: 'extra_pockets',
                effects: [{ type: 'carry_weight_bonus', target: 'carry_weight', value: 100 }],
            });
            gsm.mutatePlayer(p => ({ ...p, perks: ['extra_pockets'] }));
            expect(getPerkCarryWeightBonus(gsm.getPlayer(), createPerkMap(perk))).toBe(100);
        });
    });

    describe('getSpellCostReduction', () => {
        it('returns 1.0 with no cost reduction perks', () => {
            const perks = createPerkMap(createTestPerk());
            expect(getSpellCostReduction(gsm.getPlayer(), 'destruction', perks)).toBe(1.0);
        });

        it('returns reduction when perk matches school', () => {
            const perk = createTestPerk({
                id: 'novice_destruction',
                effects: [{ type: 'cost_reduction', target: 'destruction_novice', value: 0.5 }],
            });
            gsm.mutatePlayer(p => ({ ...p, perks: ['novice_destruction'] }));
            expect(getSpellCostReduction(gsm.getPlayer(), 'destruction', createPerkMap(perk))).toBeCloseTo(0.5);
        });
    });

    describe('getPerkTree', () => {
        it('returns perks sorted by tier', () => {
            const perk1 = createTestPerk({ id: 'p1', tier: 1 });
            const perk2 = createTestPerk({ id: 'p2', tier: 2 });
            const perk3 = createTestPerk({ id: 'p3', tier: 3, tree: 'archery' });
            const perks = createPerkMap(perk1, perk2, perk3);

            const tree = getPerkTree(gsm.getPlayer(), 'one_handed', perks);
            expect(tree.length).toBe(2); // only one_handed tree
            expect(tree[0].perkDef.id).toBe('p1');
            expect(tree[1].perkDef.id).toBe('p2');
        });

        it('marks acquired perks correctly', () => {
            const perk = createTestPerk();
            gsm.mutatePlayer(p => ({ ...p, perks: ['test_perk'] }));
            const tree = getPerkTree(gsm.getPlayer(), 'one_handed', createPerkMap(perk));
            expect(tree[0].acquired).toBe(true);
        });
    });

    describe('getAvailablePerkTrees', () => {
        it('returns unique tree IDs', () => {
            const p1 = createTestPerk({ id: 'p1', tree: 'one_handed' });
            const p2 = createTestPerk({ id: 'p2', tree: 'archery' });
            const p3 = createTestPerk({ id: 'p3', tree: 'one_handed' });
            const trees = getAvailablePerkTrees(createPerkMap(p1, p2, p3));
            expect(trees).toEqual(['archery', 'one_handed']);
        });
    });
});
