// ============================================================
// Schyrim Tests — Inventory System
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
    addItem,
    removeItem,
    equipItem,
    unequipItem,
    getInventoryWeight,
    canCarry,
} from '../../../src/systems/inventory/inventory-system.js';
import type { PlayerState } from '../../../src/core/types/character.types.js';
import type { Item, WeaponItem, ArmorItem } from '../../../src/core/types/items.types.js';
import { initializeSkills } from '../../../src/systems/progression/skill-system.js';

function makePlayer(overrides?: Partial<PlayerState>): PlayerState {
    return {
        name: 'Test',
        race: 'nord',
        level: 1,
        experience: 0,
        attributes: { health: 100, healthMax: 100, stamina: 100, staminaMax: 100, magicka: 100, magickaMax: 100 },
        skills: initializeSkills(),
        perks: [],
        perkPoints: 0,
        knownSpells: [],
        knownShouts: [],
        activeEffects: [],
        inventory: { items: [], maxWeight: 300 },
        equipment: {},
        gold: 0,
        currentLocationId: '',
        discoveredLocations: [],
        activePowerCooldowns: {},
        ...overrides,
    };
}

const ironSword: WeaponItem = {
    id: 'iron_sword', name: 'Iron Sword', description: 'A blade', type: 'weapon',
    weight: 9, baseValue: 25, rarity: 'common', tags: [],
    damage: 7, damageType: 'physical', speed: 'normal', weaponClass: 'one_handed_sword',
};

const leatherArmor: ArmorItem = {
    id: 'leather_armor', name: 'Leather Armor', description: 'Armor', type: 'armor',
    weight: 6, baseValue: 50, rarity: 'common', tags: [],
    armorRating: 20, slot: 'chest', armorType: 'light',
};

const potion: Item = {
    id: 'potion_health', name: 'Health Potion', description: 'Heals', type: 'potion',
    weight: 0.5, baseValue: 15, rarity: 'common', tags: [],
    effect: 'restore_health', magnitude: 25, duration: 0,
} as Item;

describe('InventorySystem', () => {
    let player: PlayerState;

    beforeEach(() => {
        player = makePlayer();
    });

    describe('addItem()', () => {
        it('should add an item to inventory', () => {
            const result = addItem(player, ironSword);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.inventory.items).toHaveLength(1);
                expect(result.data.inventory.items[0].item.id).toBe('iron_sword');
                expect(result.data.inventory.items[0].quantity).toBe(1);
            }
        });

        it('should stack identical items', () => {
            let result = addItem(player, potion, 1);
            expect(result.success).toBe(true);
            if (result.success) {
                result = addItem(result.data, potion, 2);
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.inventory.items).toHaveLength(1);
                    expect(result.data.inventory.items[0].quantity).toBe(3);
                }
            }
        });

        it('should warn when over-encumbered', () => {
            player = makePlayer({ inventory: { items: [], maxWeight: 5 } });
            const result = addItem(player, ironSword);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.message).toContain('over-encumbered');
            }
        });
    });

    describe('removeItem()', () => {
        it('should remove an item', () => {
            const add = addItem(player, ironSword);
            if (!add.success) throw new Error('Setup failed');

            const result = removeItem(add.data, 'iron_sword');
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.inventory.items).toHaveLength(0);
            }
        });

        it('should reduce stack quantity', () => {
            let p = player;
            const add = addItem(p, potion, 3);
            if (!add.success) throw new Error('Setup failed');
            p = add.data;

            const result = removeItem(p, 'potion_health', 1);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.inventory.items[0].quantity).toBe(2);
            }
        });

        it('should fail for non-existent items', () => {
            const result = removeItem(player, 'nonexistent');
            expect(result.success).toBe(false);
        });
    });

    describe('equipItem()', () => {
        it('should equip a weapon', () => {
            const add = addItem(player, ironSword);
            if (!add.success) throw new Error('Setup failed');

            const result = equipItem(add.data, 'iron_sword');
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.equipment.weapon_main?.id).toBe('iron_sword');
                expect(result.data.inventory.items).toHaveLength(0); // removed from inventory
            }
        });

        it('should equip armor', () => {
            const add = addItem(player, leatherArmor);
            if (!add.success) throw new Error('Setup failed');

            const result = equipItem(add.data, 'leather_armor');
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.equipment.chest?.id).toBe('leather_armor');
            }
        });

        it('should swap equipment and return old item to inventory', () => {
            const steelSword: WeaponItem = { ...ironSword, id: 'steel_sword', name: 'Steel Sword', damage: 12 };

            let p = player;
            let r = addItem(p, ironSword);
            if (!r.success) throw new Error('Setup failed');
            p = r.data;

            r = equipItem(p, 'iron_sword');
            if (!r.success) throw new Error('Setup failed');
            p = r.data;

            r = addItem(p, steelSword);
            if (!r.success) throw new Error('Setup failed');
            p = r.data;

            r = equipItem(p, 'steel_sword');
            expect(r.success).toBe(true);
            if (r.success) {
                expect(r.data.equipment.weapon_main?.id).toBe('steel_sword');
                // Iron sword should be back in inventory
                const ironInInventory = r.data.inventory.items.find(e => e.item.id === 'iron_sword');
                expect(ironInInventory).toBeDefined();
            }
        });
    });

    describe('unequipItem()', () => {
        it('should unequip and return item to inventory', () => {
            const add = addItem(player, ironSword);
            if (!add.success) throw new Error('Setup failed');
            const equip = equipItem(add.data, 'iron_sword');
            if (!equip.success) throw new Error('Setup failed');

            const result = unequipItem(equip.data, 'weapon_main');
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.equipment.weapon_main).toBeUndefined();
                expect(result.data.inventory.items.find(e => e.item.id === 'iron_sword')).toBeDefined();
            }
        });

        it('should fail for empty slot', () => {
            const result = unequipItem(player, 'weapon_main');
            expect(result.success).toBe(false);
        });
    });

    describe('canCarry()', () => {
        it('should return true when under weight limit', () => {
            expect(canCarry(player, ironSword)).toBe(true);
        });

        it('should return false when over weight limit', () => {
            player = makePlayer({ inventory: { items: [], maxWeight: 5 } });
            expect(canCarry(player, ironSword)).toBe(false);
        });
    });

    describe('getInventoryWeight()', () => {
        it('should calculate total weight', () => {
            const items = [
                { item: ironSword, quantity: 2 },  // 9 × 2 = 18
                { item: potion, quantity: 3 },      // 0.5 × 3 = 1.5
            ];
            expect(getInventoryWeight(items)).toBe(19.5);
        });
    });
});
