// ============================================================
// Schyrim Core Types — Vendor & Economy
// ============================================================

import type { Item } from './items.types.js';

/** Vendor archetype (determines stock and pricing biases) */
export type VendorArchetype =
    | 'general_goods'
    | 'blacksmith'
    | 'alchemist'
    | 'court_mage'
    | 'fence'
    | 'trainer'
    | 'innkeeper';

/** A vendor definition loaded from content data */
export interface VendorDefinition {
    id: string;
    npcId: string;           // which NPC this vendor is attached to
    name: string;
    archetype: VendorArchetype;
    description?: string;
    locationId: string;      // where this vendor operates
    factionId?: string;      // faction affiliation (affects pricing)
    goldPool: number;        // base gold available for purchasing from player
    goldRegenHours: number;  // hours until gold pool resets
    priceBias: VendorPriceBias;
    inventoryPool: string[]; // item IDs this vendor can stock
    availableHours?: { start: number; end: number }; // hours of operation (24h)
    isFence?: boolean;       // can buy stolen items
}

/** Vendor-specific price adjustments (multiplicative) */
export interface VendorPriceBias {
    weapons?: number;        // e.g., blacksmith pays 1.3x for weapons
    armor?: number;
    potions?: number;
    ingredients?: number;
    scrolls?: number;
    jewelry?: number;
    misc?: number;
    food?: number;
    default: number;         // fallback for uncategorized items
}

/** Runtime vendor state (tracks gold, restocking) */
export interface VendorInstance {
    vendorId: string;
    currentGold: number;
    lastRestockTime: number; // game hour when gold was last reset
    soldToPlayer: string[];  // item IDs sold to the player (for restock tracking)
    boughtFromPlayer: VendorBoughtEntry[]; // items bought from player
}

export interface VendorBoughtEntry {
    item: Item;
    quantity: number;
    purchasePrice: number;
}
