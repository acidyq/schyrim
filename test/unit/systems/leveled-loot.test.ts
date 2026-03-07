// ============================================================
// Leveled Loot — Unit Tests
// ============================================================

import { describe, it, expect } from 'vitest';
import type { LeveledList } from '../../../src/core/types/items.types.js';
import {
    generateLoot,
    generateGoldReward,
    generateEncounterLoot,
} from '../../../src/systems/loot/leveled-loot.js';

// --- Fixtures ---

function createTestList(overrides?: Partial<LeveledList>): LeveledList {
    return {
        id: 'test_loot',
        entries: [
            { itemId: 'iron_sword', minLevel: 1, weight: 50, count: { min: 1, max: 1 } },
            { itemId: 'steel_sword', minLevel: 5, weight: 20, count: { min: 1, max: 1 } },
            { itemId: 'daedric_sword', minLevel: 40, weight: 2, count: { min: 1, max: 1 } },
            { itemId: 'bread', minLevel: 1, weight: 80, count: { min: 1, max: 3 } },
        ],
        rollCount: { min: 1, max: 2 },
        ...overrides,
    };
}

describe('Leveled Loot', () => {
    describe('generateLoot', () => {
        it('returns at least one drop for a valid list', () => {
            const list = createTestList();
            // Run multiple times to account for randomness
            let gotDrop = false;
            for (let i = 0; i < 20; i++) {
                const drops = generateLoot(list, 10);
                if (drops.length > 0) gotDrop = true;
            }
            expect(gotDrop).toBe(true);
        });

        it('filters entries by player level (min)', () => {
            const list = createTestList();
            // Level 1 player should never get steel or daedric (steel requires level 5)
            for (let i = 0; i < 50; i++) {
                const drops = generateLoot(list, 1);
                for (const drop of drops) {
                    expect(drop.itemId).not.toBe('steel_sword');
                    expect(drop.itemId).not.toBe('daedric_sword');
                }
            }
        });

        it('can include higher-level items for high-level players', () => {
            const list = createTestList();
            let gotSteel = false;
            for (let i = 0; i < 50; i++) {
                const drops = generateLoot(list, 10);
                if (drops.some(d => d.itemId === 'steel_sword')) gotSteel = true;
            }
            expect(gotSteel).toBe(true);
        });

        it('respects maxLevel on entries', () => {
            const list: LeveledList = {
                id: 'capped_list',
                entries: [
                    { itemId: 'low_item', minLevel: 1, maxLevel: 5, weight: 50, count: { min: 1, max: 1 } },
                    { itemId: 'high_item', minLevel: 1, weight: 50, count: { min: 1, max: 1 } },
                ],
                rollCount: { min: 1, max: 1 },
            };

            // Level 10 player should never get low_item (maxLevel 5)
            for (let i = 0; i < 50; i++) {
                const drops = generateLoot(list, 10);
                for (const drop of drops) {
                    expect(drop.itemId).not.toBe('low_item');
                }
            }
        });

        it('returns empty for no eligible entries', () => {
            const list = createTestList({
                entries: [
                    { itemId: 'late_game_item', minLevel: 99, weight: 50, count: { min: 1, max: 1 } },
                ],
            });
            const drops = generateLoot(list, 1);
            expect(drops).toEqual([]);
        });

        it('merges duplicate item drops', () => {
            const list: LeveledList = {
                id: 'dupe_list',
                entries: [
                    { itemId: 'same_item', minLevel: 1, weight: 100, count: { min: 1, max: 1 } },
                ],
                rollCount: { min: 3, max: 3 },
            };

            const drops = generateLoot(list, 5);
            // All 3 rolls should merge into one entry
            expect(drops.length).toBe(1);
            expect(drops[0].quantity).toBe(3);
        });

        it('generates quantity within count range', () => {
            const list: LeveledList = {
                id: 'qty_list',
                entries: [
                    { itemId: 'potion', minLevel: 1, weight: 100, count: { min: 2, max: 5 } },
                ],
                rollCount: { min: 1, max: 1 },
            };

            for (let i = 0; i < 20; i++) {
                const drops = generateLoot(list, 5);
                for (const drop of drops) {
                    expect(drop.quantity).toBeGreaterThanOrEqual(2);
                    expect(drop.quantity).toBeLessThanOrEqual(5);
                }
            }
        });
    });

    describe('generateGoldReward', () => {
        it('scales with player level', () => {
            const lowLevel = [];
            const highLevel = [];
            for (let i = 0; i < 50; i++) {
                lowLevel.push(generateGoldReward(1));
                highLevel.push(generateGoldReward(20));
            }
            const lowAvg = lowLevel.reduce((s, v) => s + v, 0) / lowLevel.length;
            const highAvg = highLevel.reduce((s, v) => s + v, 0) / highLevel.length;
            expect(highAvg).toBeGreaterThan(lowAvg);
        });

        it('respects min/max bounds at level 1', () => {
            for (let i = 0; i < 50; i++) {
                const gold = generateGoldReward(1, 10, 20, 0);
                expect(gold).toBeGreaterThanOrEqual(10);
                expect(gold).toBeLessThanOrEqual(20);
            }
        });
    });

    describe('generateEncounterLoot', () => {
        it('combines multiple leveled lists', () => {
            const list1: LeveledList = {
                id: 'armor_list',
                entries: [{ itemId: 'iron_helmet', minLevel: 1, weight: 100, count: { min: 1, max: 1 } }],
                rollCount: { min: 1, max: 1 },
            };
            const list2: LeveledList = {
                id: 'weapon_list',
                entries: [{ itemId: 'iron_sword', minLevel: 1, weight: 100, count: { min: 1, max: 1 } }],
                rollCount: { min: 1, max: 1 },
            };

            const result = generateEncounterLoot([list1, list2], 5);
            expect(result.drops.length).toBe(2);
            expect(result.bonusGold).toBeGreaterThan(0);
        });

        it('returns bonus gold', () => {
            const result = generateEncounterLoot([], 10);
            expect(result.drops).toEqual([]);
            expect(result.bonusGold).toBeGreaterThan(0);
        });
    });
});
