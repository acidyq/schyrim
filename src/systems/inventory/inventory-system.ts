// ============================================================
// Schyrim Systems — Inventory System
// Item management, carry weight, equipment slots
// ============================================================

import type { Item, EquipmentSlot, EquippedGear, InventoryEntry } from '../../core/types/items.types.js';
import type { PlayerState } from '../../core/types/character.types.js';
import type { SystemResult } from '../../core/types/game-state.types.js';
import { ErrorCode } from '../../core/types/game-state.types.js';
import { EventBus } from '../../core/event-bus.js';
import { GameEventType } from '../../core/types/events.types.js';

/**
 * Calculate total inventory weight.
 */
export function getInventoryWeight(items: InventoryEntry[]): number {
    return items.reduce((total, entry) => total + entry.item.weight * entry.quantity, 0);
}

/**
 * Check if the player can carry an additional item.
 */
export function canCarry(player: PlayerState, item: Item, quantity: number = 1): boolean {
    const currentWeight = getInventoryWeight(player.inventory.items);
    const additionalWeight = item.weight * quantity;
    return (currentWeight + additionalWeight) <= player.inventory.maxWeight;
}

/**
 * Add an item to the player's inventory.
 */
export function addItem(
    player: PlayerState,
    item: Item,
    quantity: number = 1,
    source: string = 'unknown',
    eventBus?: EventBus
): SystemResult<PlayerState> {
    // Check carry weight (allow over-encumbered with warning)
    const isOverEncumbered = !canCarry(player, item, quantity);

    // Check if item already exists in inventory (stackable)
    const existingIndex = player.inventory.items.findIndex(e => e.item.id === item.id);

    let updatedItems: InventoryEntry[];

    if (existingIndex >= 0) {
        // Stack with existing
        updatedItems = [...player.inventory.items];
        updatedItems[existingIndex] = {
            ...updatedItems[existingIndex],
            quantity: updatedItems[existingIndex].quantity + quantity,
        };
    } else {
        // Add new entry
        updatedItems = [...player.inventory.items, { item, quantity }];
    }

    const updatedPlayer: PlayerState = {
        ...player,
        inventory: { ...player.inventory, items: updatedItems },
    };

    if (eventBus) {
        eventBus.emit(GameEventType.ITEM_ACQUIRED, { entityId: 'player', item, quantity, source });
    }

    const message = isOverEncumbered
        ? `Picked up ${item.name} (x${quantity}). WARNING: You are over-encumbered!`
        : `Picked up ${item.name} (x${quantity}).`;

    return { success: true, data: updatedPlayer, message };
}

/**
 * Remove an item from the player's inventory.
 */
export function removeItem(
    player: PlayerState,
    itemId: string,
    quantity: number = 1,
    eventBus?: EventBus
): SystemResult<PlayerState> {
    const entryIndex = player.inventory.items.findIndex(e => e.item.id === itemId);

    if (entryIndex < 0) {
        return { success: false, error: `Item '${itemId}' not found in inventory.`, code: ErrorCode.ITEM_NOT_FOUND };
    }

    const entry = player.inventory.items[entryIndex];
    if (entry.quantity < quantity) {
        return { success: false, error: `Not enough '${entry.item.name}' (have ${entry.quantity}, need ${quantity}).`, code: ErrorCode.ITEM_NOT_FOUND };
    }

    let updatedItems: InventoryEntry[];

    if (entry.quantity === quantity) {
        // Remove entirely
        updatedItems = player.inventory.items.filter((_, i) => i !== entryIndex);
    } else {
        // Reduce quantity
        updatedItems = [...player.inventory.items];
        updatedItems[entryIndex] = { ...entry, quantity: entry.quantity - quantity };
    }

    const updatedPlayer: PlayerState = {
        ...player,
        inventory: { ...player.inventory, items: updatedItems },
    };

    if (eventBus) {
        eventBus.emit(GameEventType.ITEM_DROPPED, { entityId: 'player', item: entry.item, quantity });
    }

    return { success: true, data: updatedPlayer };
}

/**
 * Equip an item from inventory.
 */
export function equipItem(
    player: PlayerState,
    itemId: string,
    eventBus?: EventBus
): SystemResult<PlayerState> {
    const entry = player.inventory.items.find(e => e.item.id === itemId);
    if (!entry) {
        return { success: false, error: `Item '${itemId}' not found in inventory.`, code: ErrorCode.ITEM_NOT_FOUND };
    }

    const item = entry.item;
    const slot = getEquipSlot(item);
    if (!slot) {
        return { success: false, error: `Cannot equip '${item.name}'.`, code: ErrorCode.CANNOT_EQUIP };
    }

    // Unequip current item in slot (return to inventory)
    let equipment: EquippedGear = { ...player.equipment };
    const currentlyEquipped = equipment[slot];

    let updatedItems = [...player.inventory.items];

    if (currentlyEquipped) {
        // Return old item to inventory
        const existingIndex = updatedItems.findIndex(e => e.item.id === currentlyEquipped.id);
        if (existingIndex >= 0) {
            updatedItems[existingIndex] = {
                ...updatedItems[existingIndex],
                quantity: updatedItems[existingIndex].quantity + 1,
            };
        } else {
            updatedItems.push({ item: currentlyEquipped, quantity: 1 });
        }

        if (eventBus) {
            eventBus.emit(GameEventType.ITEM_UNEQUIPPED, { entityId: 'player', item: currentlyEquipped, slot });
        }
    }

    // Remove new item from inventory
    const itemIndex = updatedItems.findIndex(e => e.item.id === itemId);
    if (itemIndex >= 0) {
        if (updatedItems[itemIndex].quantity <= 1) {
            updatedItems = updatedItems.filter((_, i) => i !== itemIndex);
        } else {
            updatedItems[itemIndex] = {
                ...updatedItems[itemIndex],
                quantity: updatedItems[itemIndex].quantity - 1,
            };
        }
    }

    // Equip new item
    equipment = { ...equipment, [slot]: item };

    const updatedPlayer: PlayerState = {
        ...player,
        equipment,
        inventory: { ...player.inventory, items: updatedItems },
    };

    if (eventBus) {
        eventBus.emit(GameEventType.ITEM_EQUIPPED, { entityId: 'player', item, slot });
    }

    return { success: true, data: updatedPlayer, message: `Equipped ${item.name}.` };
}

/**
 * Unequip an item and return it to inventory.
 */
export function unequipItem(
    player: PlayerState,
    slot: EquipmentSlot,
    eventBus?: EventBus
): SystemResult<PlayerState> {
    const item = player.equipment[slot];
    if (!item) {
        return { success: false, error: `Nothing equipped in ${slot} slot.`, code: ErrorCode.INVALID_SLOT };
    }

    // Add to inventory
    const addResult = addItem(player, item, 1, 'unequip');
    if (!addResult.success) return addResult;

    // Remove from equipment
    const equipment: EquippedGear = { ...addResult.data.equipment };
    delete equipment[slot];

    const updatedPlayer: PlayerState = { ...addResult.data, equipment };

    if (eventBus) {
        eventBus.emit(GameEventType.ITEM_UNEQUIPPED, { entityId: 'player', item, slot });
    }

    return { success: true, data: updatedPlayer, message: `Unequipped ${item.name}.` };
}

// --- Helpers ---

function getEquipSlot(item: Item): EquipmentSlot | null {
    switch (item.type) {
        case 'weapon':
            return 'weapon_main';
        case 'armor':
            switch (item.slot) {
                case 'head': return 'head';
                case 'chest': return 'chest';
                case 'hands': return 'hands';
                case 'feet': return 'feet';
                case 'shield': return 'weapon_off';
                default: return null;
            }
        case 'jewelry':
            switch (item.slot) {
                case 'ring': return 'ring_left';
                case 'amulet': return 'amulet';
                default: return null;
            }
        case 'clothing':
            switch (item.slot) {
                case 'head': return 'head';
                case 'chest': return 'chest';
                case 'hands': return 'hands';
                case 'feet': return 'feet';
                default: return null;
            }
        default:
            return null;
    }
}

/**
 * Calculate derived carry weight from stamina and perks.
 */
export function calculateCarryWeight(baseStamina: number, _perkBonus: number = 0): number {
    return 200 + baseStamina + _perkBonus;
}
