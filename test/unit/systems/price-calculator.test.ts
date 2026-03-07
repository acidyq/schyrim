// ============================================================
// Schyrim Tests — Price Calculator
// ============================================================

import { describe, it, expect } from 'vitest';
import { calculatePrice, formatPriceComparison } from '../../../src/systems/economy/price-calculator.js';
import type { Item } from '../../../src/core/types/items.types.js';

function makeItem(overrides?: Partial<Item>): Item {
    return {
        id: 'test_item',
        name: 'Test Item',
        description: 'A test item',
        type: 'misc',
        weight: 1,
        baseValue: 100,
        rarity: 'common',
        tags: [],
        ...overrides,
    } as Item;
}

describe('PriceCalculator', () => {
    describe('calculatePrice()', () => {
        it('should calculate buy price higher than base at low speech', () => {
            const item = makeItem({ baseValue: 100 });
            const buyPrice = calculatePrice({ item, speechSkill: 0, isBuying: true });
            expect(buyPrice).toBeGreaterThan(100);
        });

        it('should calculate sell price lower than base', () => {
            const item = makeItem({ baseValue: 100 });
            const sellPrice = calculatePrice({ item, speechSkill: 50, isBuying: false });
            expect(sellPrice).toBeLessThan(100);
        });

        it('should improve prices with higher speech skill', () => {
            const item = makeItem({ baseValue: 100 });

            const lowSpeechBuy = calculatePrice({ item, speechSkill: 10, isBuying: true });
            const highSpeechBuy = calculatePrice({ item, speechSkill: 90, isBuying: true });

            const lowSpeechSell = calculatePrice({ item, speechSkill: 10, isBuying: false });
            const highSpeechSell = calculatePrice({ item, speechSkill: 90, isBuying: false });

            expect(highSpeechBuy).toBeLessThan(lowSpeechBuy); // cheaper to buy
            expect(highSpeechSell).toBeGreaterThan(lowSpeechSell); // more money when selling
        });

        it('should apply perk bonus', () => {
            const item = makeItem({ baseValue: 100 });

            const normal = calculatePrice({ item, speechSkill: 50, isBuying: false });
            const withPerk = calculatePrice({ item, speechSkill: 50, isBuying: false, perkBonusMultiplier: 1.2 });

            expect(withPerk).toBeGreaterThan(normal);
        });

        it('should improve buy prices with positive faction reputation', () => {
            const item = makeItem({ baseValue: 100 });

            const neutral = calculatePrice({ item, speechSkill: 50, isBuying: true, factionReputation: 0 });
            const allied = calculatePrice({ item, speechSkill: 50, isBuying: true, factionReputation: 100 });

            expect(allied).toBeLessThan(neutral);
        });

        it('should worsen buy prices with negative faction reputation', () => {
            const item = makeItem({ baseValue: 100 });

            const neutral = calculatePrice({ item, speechSkill: 50, isBuying: true, factionReputation: 0 });
            const hostile = calculatePrice({ item, speechSkill: 50, isBuying: true, factionReputation: -100 });

            expect(hostile).toBeGreaterThan(neutral);
        });

        it('should not allow selling stolen items to normal vendors', () => {
            const item = makeItem({ baseValue: 100 });
            const price = calculatePrice({ item, speechSkill: 50, isBuying: false, isStolen: true });
            expect(price).toBe(0);
        });

        it('should allow selling stolen items to fences at half price', () => {
            const item = makeItem({ baseValue: 100 });
            const normalPrice = calculatePrice({ item, speechSkill: 50, isBuying: false });
            const fencePrice = calculatePrice({ item, speechSkill: 50, isBuying: false, isStolen: true, isFence: true });

            expect(fencePrice).toBeGreaterThan(0);
            expect(fencePrice).toBeLessThan(normalPrice);
        });

        it('should return 0 for items with 0 base value', () => {
            const item = makeItem({ baseValue: 0 });
            const price = calculatePrice({ item, speechSkill: 50, isBuying: true });
            expect(price).toBe(0);
        });

        it('should always return at least 1 gold for sellable items', () => {
            const item = makeItem({ baseValue: 1 });
            const price = calculatePrice({ item, speechSkill: 0, isBuying: false });
            expect(price).toBeGreaterThanOrEqual(1);
        });

        it('should apply vendor price bias', () => {
            const item = makeItem({ baseValue: 100 });

            const normal = calculatePrice({ item, speechSkill: 50, isBuying: false });
            const biased = calculatePrice({ item, speechSkill: 50, isBuying: false, vendorPriceBias: 1.5 });

            expect(biased).toBeGreaterThan(normal);
        });
    });

    describe('formatPriceComparison()', () => {
        it('should format item prices correctly', () => {
            const item = makeItem({ name: 'Iron Sword', baseValue: 25 });
            const formatted = formatPriceComparison(item, 40, 15);
            expect(formatted).toContain('Iron Sword');
            expect(formatted).toContain('Buy: 40g');
            expect(formatted).toContain('Sell: 15g');
            expect(formatted).toContain('Base: 25g');
        });
    });
});
