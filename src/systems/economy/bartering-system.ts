// ============================================================
// Schyrim Systems — Bartering System
// Vendor interactions, gold pools, trade execution
// ============================================================

import type { GameStateManager } from '../../core/game-state.js';
import type { EventBus } from '../../core/event-bus.js';
import type { ContentRegistry } from '../../content-registry.js';
import type { Item, InventoryEntry } from '../../core/types/items.types.js';
import type {
    VendorDefinition,
    VendorInstance,
    VendorPriceBias,
} from '../../core/types/vendor.types.js';
import type { FactionDefinition } from '../../core/types/faction.types.js';
import { calculatePrice, PriceContext } from '../economy/price-calculator.js';
import { getReputation } from '../factions/faction-system.js';
import { addItem, removeItem } from '../inventory/inventory-system.js';
import { GameEventType } from '../../core/types/events.types.js';

// ============================================================
// VENDOR STATE (in-memory, per-session)
// ============================================================

const vendorStates = new Map<string, VendorInstance>();

/**
 * Get or initialize a vendor's runtime state.
 */
export function getVendorState(
    vendorDef: VendorDefinition,
    world: { currentTime: { day: number; hour: number } },
): VendorInstance {
    let state = vendorStates.get(vendorDef.id);
    if (!state) {
        state = {
            vendorId: vendorDef.id,
            currentGold: vendorDef.goldPool,
            lastRestockTime: world.currentTime.day * 24 + world.currentTime.hour,
            soldToPlayer: [],
            boughtFromPlayer: [],
        };
        vendorStates.set(vendorDef.id, state);
    }

    // Check if vendor should restock
    const currentGameHour = world.currentTime.day * 24 + world.currentTime.hour;
    const hoursSinceRestock = currentGameHour - state.lastRestockTime;
    if (hoursSinceRestock >= vendorDef.goldRegenHours) {
        state.currentGold = vendorDef.goldPool;
        state.lastRestockTime = currentGameHour;
        state.boughtFromPlayer = []; // clear resold items
    }

    return state;
}

/**
 * Reset all vendor states (on game load, etc.)
 */
export function resetVendorStates(): void {
    vendorStates.clear();
}

// ============================================================
// PRICE CALCULATION (vendor-aware)
// ============================================================

/**
 * Get the price bias multiplier for an item based on vendor archetype.
 */
function getVendorBiasForItem(item: Item, bias: VendorPriceBias): number {
    switch (item.type) {
        case 'weapon':
            return bias.weapons ?? bias.default;
        case 'armor':
            return bias.armor ?? bias.default;
        case 'potion':
            return bias.potions ?? bias.default;
        case 'ingredient':
            return bias.ingredients ?? bias.default;
        case 'scroll':
            return bias.scrolls ?? bias.default;
        case 'jewelry':
            return bias.jewelry ?? bias.default;
        case 'food':
            return bias.food ?? bias.default;
        case 'misc':
            return bias.misc ?? bias.default;
        default:
            return bias.default;
    }
}

/**
 * Calculate the buy price (what the player pays) for an item at this vendor.
 */
export function getVendorBuyPrice(
    item: Item,
    vendorDef: VendorDefinition,
    gsm: GameStateManager,
    factionDefs: Map<string, FactionDefinition>,
): number {
    const player = gsm.getPlayer();
    const speechSkill = player.skills['speech']?.level ?? 15;
    const factionRep = vendorDef.factionId
        ? getReputation(gsm, vendorDef.factionId, factionDefs)
        : 0;

    const ctx: PriceContext = {
        item,
        speechSkill,
        factionReputation: factionRep,
        vendorPriceBias: getVendorBiasForItem(item, vendorDef.priceBias),
        isBuying: true,
        isStolen: item.tags?.includes('stolen') ?? false,
        isFence: vendorDef.isFence ?? false,
    };

    return calculatePrice(ctx);
}

/**
 * Calculate the sell price (what the player receives) for an item at this vendor.
 */
export function getVendorSellPrice(
    item: Item,
    vendorDef: VendorDefinition,
    gsm: GameStateManager,
    factionDefs: Map<string, FactionDefinition>,
): number {
    const player = gsm.getPlayer();
    const speechSkill = player.skills['speech']?.level ?? 15;
    const factionRep = vendorDef.factionId
        ? getReputation(gsm, vendorDef.factionId, factionDefs)
        : 0;

    const isStolen = item.tags?.includes('stolen') ?? false;

    // Non-fence vendors won't buy stolen goods
    if (isStolen && !vendorDef.isFence) return 0;

    const ctx: PriceContext = {
        item,
        speechSkill,
        factionReputation: factionRep,
        vendorPriceBias: getVendorBiasForItem(item, vendorDef.priceBias),
        isBuying: false,
        isStolen,
        isFence: vendorDef.isFence ?? false,
    };

    return calculatePrice(ctx);
}

// ============================================================
// TRADE EXECUTION
// ============================================================

export interface TradeResult {
    success: boolean;
    message: string;
    goldDelta?: number;
}

/**
 * Execute a purchase: player buys an item from the vendor.
 */
export function buyFromVendor(
    gsm: GameStateManager,
    bus: EventBus,
    vendorDef: VendorDefinition,
    item: Item,
    quantity: number,
    factionDefs: Map<string, FactionDefinition>,
): TradeResult {
    const price = getVendorBuyPrice(item, vendorDef, gsm, factionDefs) * quantity;
    const player = gsm.getPlayer();

    if (player.gold < price) {
        return { success: false, message: `Not enough gold. You need ${price}g but only have ${player.gold}g.` };
    }

    // Check carry weight
    const currentWeight = player.inventory.items.reduce(
        (sum, e) => sum + e.item.weight * e.quantity, 0,
    );
    const addedWeight = item.weight * quantity;
    if (currentWeight + addedWeight > player.inventory.maxWeight) {
        return { success: false, message: `Too heavy! Adding ${item.name} would exceed your carry weight.` };
    }

    // Execute transaction — add item via inventory system
    const addResult = addItem(player, item, quantity, `bought from ${vendorDef.name}`, bus);
    if (!addResult.success) {
        return { success: false, message: addResult.error };
    }

    // Commit: deduct gold + update inventory
    gsm.mutatePlayer(_p => ({
        ...addResult.data,
        gold: addResult.data.gold - price,
    }));

    // Vendor gains gold
    const vendorState = getVendorState(vendorDef, gsm.getWorld());
    vendorState.currentGold += price;
    vendorState.soldToPlayer.push(item.id);

    bus.emit(GameEventType.TRADE_COMPLETED, {
        vendorId: vendorDef.id,
        itemsBought: [item.id],
        itemsSold: [],
        goldDelta: -price,
    });

    return {
        success: true,
        message: `Bought ${quantity}x ${item.name} for ${price}g.`,
        goldDelta: -price,
    };
}

/**
 * Execute a sale: player sells an item to the vendor.
 */
export function sellToVendor(
    gsm: GameStateManager,
    bus: EventBus,
    vendorDef: VendorDefinition,
    item: Item,
    quantity: number,
    factionDefs: Map<string, FactionDefinition>,
): TradeResult {
    const unitPrice = getVendorSellPrice(item, vendorDef, gsm, factionDefs);
    if (unitPrice <= 0) {
        return { success: false, message: `${vendorDef.name} won't buy ${item.name}.` };
    }

    const totalPrice = unitPrice * quantity;
    const vendorState = getVendorState(vendorDef, gsm.getWorld());

    if (vendorState.currentGold < totalPrice) {
        return {
            success: false,
            message: `${vendorDef.name} doesn't have enough gold (${vendorState.currentGold}g / ${totalPrice}g needed).`,
        };
    }

    // Check player actually has the item
    const player = gsm.getPlayer();
    const entry = player.inventory.items.find(e => e.item.id === item.id);
    if (!entry || entry.quantity < quantity) {
        return { success: false, message: `You don't have ${quantity}x ${item.name}.` };
    }

    // Execute transaction — remove item via inventory system
    const removeResult = removeItem(player, item.id, quantity, bus);
    if (!removeResult.success) {
        return { success: false, message: removeResult.error };
    }

    // Commit: add gold + update inventory
    gsm.mutatePlayer(_p => ({
        ...removeResult.data,
        gold: removeResult.data.gold + totalPrice,
    }));

    // Vendor loses gold, gains item
    vendorState.currentGold -= totalPrice;
    vendorState.boughtFromPlayer.push({
        item,
        quantity,
        purchasePrice: totalPrice,
    });

    bus.emit(GameEventType.TRADE_COMPLETED, {
        vendorId: vendorDef.id,
        itemsBought: [],
        itemsSold: [item.id],
        goldDelta: totalPrice,
    });

    return {
        success: true,
        message: `Sold ${quantity}x ${item.name} for ${totalPrice}g.`,
        goldDelta: totalPrice,
    };
}

// ============================================================
// VENDOR INVENTORY (what the vendor has for sale)
// ============================================================

/**
 * Get the items a vendor currently has available for sale.
 */
export function getVendorInventory(
    vendorDef: VendorDefinition,
    content: ContentRegistry,
): Item[] {
    const items: Item[] = [];

    for (const itemId of vendorDef.inventoryPool) {
        const item = content.items.get(itemId);
        if (item) items.push(item);
    }

    // Also include items the vendor bought from the player
    const vendorState = vendorStates.get(vendorDef.id);
    if (vendorState) {
        for (const bought of vendorState.boughtFromPlayer) {
            items.push(bought.item);
        }
    }

    return items;
}

/**
 * Get the player's sellable items for this vendor.
 * Filters out quest items and (for non-fences) stolen items.
 */
export function getPlayerSellableItems(
    gsm: GameStateManager,
    vendorDef: VendorDefinition,
): InventoryEntry[] {
    const player = gsm.getPlayer();
    return player.inventory.items.filter(entry => {
        // Quest items can never be sold
        if (entry.item.type === 'quest_item') return false;

        // Stolen items only sellable to fences
        if (entry.item.tags?.includes('stolen') && !vendorDef.isFence) return false;

        return true;
    });
}

// ============================================================
// DISPLAY HELPERS
// ============================================================

export interface VendorItemDisplay {
    item: Item;
    buyPrice: number;
    sellPrice: number;
    playerOwns: number;
}

/**
 * Get a display-friendly list of vendor items with prices.
 */
export function getVendorDisplay(
    vendorDef: VendorDefinition,
    gsm: GameStateManager,
    content: ContentRegistry,
    factionDefs: Map<string, FactionDefinition>,
): { vendorItems: VendorItemDisplay[]; vendorGold: number; playerGold: number } {
    const vendorItems = getVendorInventory(vendorDef, content);
    const player = gsm.getPlayer();
    const vendorState = getVendorState(vendorDef, gsm.getWorld());

    const displayItems: VendorItemDisplay[] = vendorItems.map(item => ({
        item,
        buyPrice: getVendorBuyPrice(item, vendorDef, gsm, factionDefs),
        sellPrice: getVendorSellPrice(item, vendorDef, gsm, factionDefs),
        playerOwns: player.inventory.items.find(e => e.item.id === item.id)?.quantity ?? 0,
    }));

    return {
        vendorItems: displayItems,
        vendorGold: vendorState.currentGold,
        playerGold: player.gold,
    };
}
