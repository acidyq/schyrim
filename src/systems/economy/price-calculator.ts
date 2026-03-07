// ============================================================
// Schyrim Systems — Price Calculator
// Economy math for buy/sell prices
// ============================================================

import type { Item } from '../../core/types/items.types.js';

export interface PriceContext {
    item: Item;
    speechSkill: number;       // 0-100
    perkBonusMultiplier?: number; // from speech perks
    racialBonus?: number;       // e.g., Khajiit or Imperial bonus
    factionReputation?: number; // -100 to +100, with affiliated vendor
    isStolen?: boolean;
    isFence?: boolean;          // vendor is a fence
    vendorPriceBias?: number;   // vendor-specific bias (blacksmith pays more for weapons)
    isBuying?: boolean;         // true = player buying, false = player selling
}

/**
 * Calculate the final price of an item for trading.
 *
 * Formula:
 *   base_value × speech_modifier × perk_bonus × racial_bonus
 *   × faction_rep_modifier × vendor_bias × stolen_penalty
 */
export function calculatePrice(ctx: PriceContext): number {
    const {
        item,
        speechSkill,
        perkBonusMultiplier = 1.0,
        racialBonus = 1.0,
        factionReputation = 0,
        isStolen = false,
        isFence = false,
        vendorPriceBias = 1.0,
        isBuying = true,
    } = ctx;

    const baseValue = item.baseValue;
    if (baseValue <= 0) return 0;

    // Speech modifier: skill affects prices
    // At speech 0: buy at 2x, sell at 0.33x
    // At speech 50: buy at 1.3x, sell at 0.6x
    // At speech 100: buy at 1.0x, sell at 0.85x
    const speechModifier = isBuying
        ? 2.0 - (speechSkill / 100) * 1.0    // decreases buy price
        : 0.33 + (speechSkill / 100) * 0.52;  // increases sell price

    // Faction reputation modifier
    // -100 rep = +30% buy / -30% sell
    // 0 rep = no change
    // +100 rep = -20% buy / +20% sell
    const repModifier = isBuying
        ? 1.0 - (factionReputation / 100) * 0.2
        : 1.0 + (factionReputation / 100) * 0.2;

    // Stolen penalty: stolen items sell for 50% less (unless to a fence)
    const stolenPenalty = (isStolen && !isFence) ? 0.0 // can't sell stolen items to normal vendors
        : (isStolen && isFence) ? 0.5  // fences take them at half price
            : 1.0;

    // Final calculation
    let price = baseValue * speechModifier * perkBonusMultiplier * racialBonus * repModifier * vendorPriceBias;

    if (!isBuying) {
        price *= stolenPenalty;
    }

    // Clamp: never pay more than 2x base, never receive less than 1 gold for a sellable item
    if (isBuying) {
        price = Math.min(price, baseValue * 3.0);
    } else {
        price = Math.max(price, stolenPenalty > 0 ? 1 : 0);
    }

    return Math.round(price);
}

/**
 * Format a price for display with buy/sell comparison.
 */
export function formatPriceComparison(item: Item, buyPrice: number, sellPrice: number): string {
    return `${item.name} — Buy: ${buyPrice}g | Sell: ${sellPrice}g | Base: ${item.baseValue}g`;
}
