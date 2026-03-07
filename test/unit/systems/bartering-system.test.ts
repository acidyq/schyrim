// ============================================================
// Bartering System — Unit Tests
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateManager, resetGameStateManager } from '../../../src/core/game-state.js';
import { EventBus } from '../../../src/core/event-bus.js';
import type { Item, WeaponItem, PotionItem } from '../../../src/core/types/items.types.js';
import type { VendorDefinition } from '../../../src/core/types/vendor.types.js';
import type { FactionDefinition } from '../../../src/core/types/faction.types.js';
import {
    buyFromVendor,
    sellToVendor,
    getVendorBuyPrice,
    getVendorSellPrice,
    getVendorState,
    resetVendorStates,
    getPlayerSellableItems,
} from '../../../src/systems/economy/bartering-system.js';

// --- Fixtures ---

function createTestWeapon(overrides?: Partial<WeaponItem>): WeaponItem {
    return {
        id: 'iron_sword',
        name: 'Iron Sword',
        description: 'A basic sword.',
        type: 'weapon',
        weight: 9,
        baseValue: 25,
        rarity: 'common',
        tags: [],
        damage: 7,
        damageType: 'physical',
        speed: 'normal',
        weaponClass: 'one_handed_sword',
        ...overrides,
    };
}

function createTestPotion(): PotionItem {
    return {
        id: 'potion_minor_healing',
        name: 'Minor Healing Potion',
        description: 'Restores a small amount of health.',
        type: 'potion',
        weight: 0.5,
        baseValue: 15,
        rarity: 'common',
        tags: [],
        effect: 'restore_health',
        magnitude: 25,
        duration: 0,
    };
}

function createTestVendor(overrides?: Partial<VendorDefinition>): VendorDefinition {
    return {
        id: 'test_vendor',
        npcId: 'test_npc',
        name: 'Test Vendor',
        archetype: 'general_goods',
        locationId: 'test_location',
        goldPool: 500,
        goldRegenHours: 48,
        priceBias: {
            weapons: 1.2,
            potions: 1.0,
            default: 1.0,
        },
        inventoryPool: ['iron_sword', 'potion_minor_healing'],
        ...overrides,
    };
}

function createFenceDef(): VendorDefinition {
    return createTestVendor({
        id: 'test_fence',
        name: 'Test Fence',
        archetype: 'fence',
        isFence: true,
        goldPool: 1000,
    });
}

describe('Bartering System', () => {
    let gsm: GameStateManager;
    let bus: EventBus;
    const factionDefs = new Map<string, FactionDefinition>();

    beforeEach(() => {
        resetGameStateManager();
        gsm = new GameStateManager();
        bus = new EventBus();
        resetVendorStates();

        // Give player some gold and speech skill
        gsm.mutatePlayer(p => ({
            ...p,
            gold: 200,
            skills: {
                ...p.skills,
                speech: { level: 30, xp: 0, xpToNextLevel: 100 },
            },
        }));
    });

    describe('getVendorBuyPrice', () => {
        it('calculates a buy price for an item', () => {
            const vendor = createTestVendor();
            const sword = createTestWeapon();
            const price = getVendorBuyPrice(sword, vendor, gsm, factionDefs);
            expect(price).toBeGreaterThan(0);
            expect(price).toBeGreaterThanOrEqual(sword.baseValue);
        });

        it('applies vendor price bias for weapons at blacksmith', () => {
            const blacksmith = createTestVendor({ priceBias: { weapons: 1.3, default: 1.0 } });
            const generalVendor = createTestVendor({ priceBias: { weapons: 1.0, default: 1.0 } });
            const sword = createTestWeapon();

            const blacksmithPrice = getVendorBuyPrice(sword, blacksmith, gsm, factionDefs);
            const generalPrice = getVendorBuyPrice(sword, generalVendor, gsm, factionDefs);

            expect(blacksmithPrice).toBeGreaterThan(generalPrice);
        });
    });

    describe('getVendorSellPrice', () => {
        it('calculates a sell price for an item', () => {
            const vendor = createTestVendor();
            const sword = createTestWeapon();
            const price = getVendorSellPrice(sword, vendor, gsm, factionDefs);
            expect(price).toBeGreaterThan(0);
            expect(price).toBeLessThan(sword.baseValue); // sell price always less than base
        });

        it('returns 0 for stolen items at non-fence vendor', () => {
            const vendor = createTestVendor();
            const stolenSword = createTestWeapon({ tags: ['stolen'] });
            const price = getVendorSellPrice(stolenSword, vendor, gsm, factionDefs);
            expect(price).toBe(0);
        });

        it('accepts stolen items at a fence', () => {
            const fence = createFenceDef();
            const stolenSword = createTestWeapon({ tags: ['stolen'] });
            const price = getVendorSellPrice(stolenSword, fence, gsm, factionDefs);
            expect(price).toBeGreaterThan(0);
        });
    });

    describe('buyFromVendor', () => {
        it('deducts gold and adds item to inventory', () => {
            const vendor = createTestVendor();
            const potion = createTestPotion();
            const price = getVendorBuyPrice(potion, vendor, gsm, factionDefs);

            const result = buyFromVendor(gsm, bus, vendor, potion, 1, factionDefs);
            expect(result.success).toBe(true);
            expect(gsm.getPlayer().gold).toBe(200 - price);
            expect(gsm.getPlayer().inventory.items.some(e => e.item.id === 'potion_minor_healing')).toBe(true);
        });

        it('fails when player lacks gold', () => {
            gsm.mutatePlayer(p => ({ ...p, gold: 1 }));
            const vendor = createTestVendor();
            const sword = createTestWeapon();

            const result = buyFromVendor(gsm, bus, vendor, sword, 1, factionDefs);
            expect(result.success).toBe(false);
            expect(result.message).toContain('Not enough gold');
        });

        it('fails when carry weight exceeded', () => {
            gsm.mutatePlayer(p => ({
                ...p,
                gold: 10000,
                inventory: { ...p.inventory, maxWeight: 1 },
            }));
            const vendor = createTestVendor();
            const sword = createTestWeapon(); // weight 9

            const result = buyFromVendor(gsm, bus, vendor, sword, 1, factionDefs);
            expect(result.success).toBe(false);
            expect(result.message).toContain('Too heavy');
        });

        it('adds gold to vendor state', () => {
            const vendor = createTestVendor();
            const potion = createTestPotion();
            const price = getVendorBuyPrice(potion, vendor, gsm, factionDefs);

            buyFromVendor(gsm, bus, vendor, potion, 1, factionDefs);
            const state = getVendorState(vendor, gsm.getWorld());
            expect(state.currentGold).toBe(500 + price);
        });

        it('emits TRADE_COMPLETED event', () => {
            const events: unknown[] = [];
            bus.on('TRADE_COMPLETED', (e) => events.push(e));

            const vendor = createTestVendor();
            const potion = createTestPotion();
            buyFromVendor(gsm, bus, vendor, potion, 1, factionDefs);
            // TRADE_COMPLETED + ITEM_ACQUIRED
            expect(events.length).toBe(1);
        });
    });

    describe('sellToVendor', () => {
        it('adds gold and removes item from inventory', () => {
            const sword = createTestWeapon();
            gsm.mutatePlayer(p => ({
                ...p,
                inventory: {
                    ...p.inventory,
                    items: [{ item: sword, quantity: 1 }],
                },
            }));

            const vendor = createTestVendor();
            const price = getVendorSellPrice(sword, vendor, gsm, factionDefs);

            const result = sellToVendor(gsm, bus, vendor, sword, 1, factionDefs);
            expect(result.success).toBe(true);
            expect(gsm.getPlayer().gold).toBe(200 + price);
            expect(gsm.getPlayer().inventory.items.find(e => e.item.id === 'iron_sword')).toBeUndefined();
        });

        it('fails when vendor lacks gold', () => {
            const sword = createTestWeapon({ baseValue: 9999 });
            gsm.mutatePlayer(p => ({
                ...p,
                inventory: {
                    ...p.inventory,
                    items: [{ item: sword, quantity: 1 }],
                },
            }));

            const vendor = createTestVendor({ goldPool: 1 });
            const result = sellToVendor(gsm, bus, vendor, sword, 1, factionDefs);
            expect(result.success).toBe(false);
            expect(result.message).toContain("doesn't have enough gold");
        });

        it('refuses stolen items at non-fence', () => {
            const stolenSword = createTestWeapon({ tags: ['stolen'] });
            gsm.mutatePlayer(p => ({
                ...p,
                inventory: {
                    ...p.inventory,
                    items: [{ item: stolenSword, quantity: 1 }],
                },
            }));

            const vendor = createTestVendor();
            const result = sellToVendor(gsm, bus, vendor, stolenSword, 1, factionDefs);
            expect(result.success).toBe(false);
            expect(result.message).toContain("won't buy");
        });

        it('accepts stolen items at a fence', () => {
            const stolenSword = createTestWeapon({ tags: ['stolen'] });
            gsm.mutatePlayer(p => ({
                ...p,
                inventory: {
                    ...p.inventory,
                    items: [{ item: stolenSword, quantity: 1 }],
                },
            }));

            const fence = createFenceDef();
            const result = sellToVendor(gsm, bus, fence, stolenSword, 1, factionDefs);
            expect(result.success).toBe(true);
        });
    });

    describe('getVendorState', () => {
        it('initializes with full gold pool', () => {
            const vendor = createTestVendor({ goldPool: 750 });
            const state = getVendorState(vendor, { currentTime: { day: 1, hour: 8 } });
            expect(state.currentGold).toBe(750);
        });

        it('restocks after goldRegenHours', () => {
            const vendor = createTestVendor({ goldPool: 500, goldRegenHours: 24 });

            // Initialize at day 1 hour 8
            const state = getVendorState(vendor, { currentTime: { day: 1, hour: 8 } });
            state.currentGold = 100; // simulate spending

            // Check at day 2 hour 9 (25 hours later → should restock)
            const restocked = getVendorState(vendor, { currentTime: { day: 2, hour: 9 } });
            expect(restocked.currentGold).toBe(500);
        });
    });

    describe('getPlayerSellableItems', () => {
        it('filters out quest items', () => {
            const questItem: Item = {
                id: 'quest_amulet',
                name: 'Quest Amulet',
                description: 'Important quest item.',
                type: 'quest_item',
                weight: 0,
                baseValue: 0,
                rarity: 'unique',
                tags: ['quest'],
                questId: 'main_quest',
            };
            const sword = createTestWeapon();

            gsm.mutatePlayer(p => ({
                ...p,
                inventory: {
                    ...p.inventory,
                    items: [
                        { item: questItem, quantity: 1 },
                        { item: sword, quantity: 1 },
                    ],
                },
            }));

            const vendor = createTestVendor();
            const sellable = getPlayerSellableItems(gsm, vendor);
            expect(sellable.length).toBe(1);
            expect(sellable[0].item.id).toBe('iron_sword');
        });

        it('filters stolen items for non-fence vendors', () => {
            const stolenSword = createTestWeapon({ tags: ['stolen'] });
            gsm.mutatePlayer(p => ({
                ...p,
                inventory: {
                    ...p.inventory,
                    items: [{ item: stolenSword, quantity: 1 }],
                },
            }));

            const vendor = createTestVendor();
            const sellable = getPlayerSellableItems(gsm, vendor);
            expect(sellable.length).toBe(0);

            // Fence should accept
            const fence = createFenceDef();
            const fenceSellable = getPlayerSellableItems(gsm, fence);
            expect(fenceSellable.length).toBe(1);
        });
    });
});
