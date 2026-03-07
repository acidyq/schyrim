// ============================================================
// Schyrim Core Types — Items (Discriminated Unions)
// ============================================================

/** Base properties shared by ALL items */
export interface ItemBase {
    id: string;
    name: string;
    description: string;
    weight: number;
    baseValue: number;
    rarity: ItemRarity;
    tags: ItemTag[];
    iconChar?: string; // Single character for CLI display
}

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'unique';

export type ItemTag =
    | 'enchanted' | 'stolen' | 'faction_made' | 'unique'
    | 'crafted' | 'quest' | 'key' | 'daedric' | 'dwemer';

// --- Discriminated Union: Item ---

export type Item =
    | WeaponItem
    | ArmorItem
    | ClothingItem
    | JewelryItem
    | SpellTomeItem
    | PotionItem
    | FoodItem
    | IngredientItem
    | ScrollItem
    | SoulGemItem
    | MiscItem
    | QuestItem;

export interface WeaponItem extends ItemBase {
    type: 'weapon';
    damage: number;
    damageType: DamageType;
    speed: WeaponSpeed;
    weaponClass: WeaponClass;
    enchantmentId?: string;
    critMultiplier?: number;
}

export interface ArmorItem extends ItemBase {
    type: 'armor';
    armorRating: number;
    slot: ArmorSlot;
    armorType: ArmorType;
    enchantmentId?: string;
}

export interface ClothingItem extends ItemBase {
    type: 'clothing';
    slot: ArmorSlot;
    enchantmentId?: string;
}

export interface JewelryItem extends ItemBase {
    type: 'jewelry';
    slot: 'ring' | 'amulet';
    enchantmentId?: string;
}

export interface SpellTomeItem extends ItemBase {
    type: 'spell_tome';
    spellId: string;
}

export interface PotionItem extends ItemBase {
    type: 'potion';
    effect: PotionEffect;
    magnitude: number;
    duration: number; // 0 = instant
}

export interface FoodItem extends ItemBase {
    type: 'food';
    healthRestore: number;
    staminaRestore: number;
    hungerRestore?: number; // for survival mode
}

export interface IngredientItem extends ItemBase {
    type: 'ingredient';
    alchemyEffects: string[]; // IDs of alchemy effects (for future alchemy system)
}

export interface ScrollItem extends ItemBase {
    type: 'scroll';
    spellId: string;
    charges: number;
}

export interface SoulGemItem extends ItemBase {
    type: 'soul_gem';
    gemSize: 'petty' | 'lesser' | 'common' | 'greater' | 'grand' | 'black';
    filled: boolean;
}

export interface MiscItem extends ItemBase {
    type: 'misc';
}

export interface QuestItem extends ItemBase {
    type: 'quest_item';
    questId: string;
}

// --- Enums ---

export type DamageType = 'physical' | 'fire' | 'frost' | 'shock' | 'poison' | 'magic';

export type WeaponSpeed = 'slow' | 'normal' | 'fast';

export type WeaponClass = 'one_handed_sword' | 'one_handed_axe' | 'one_handed_mace'
    | 'two_handed_sword' | 'two_handed_axe' | 'two_handed_hammer'
    | 'bow' | 'crossbow' | 'dagger' | 'staff';

export type ArmorSlot = 'head' | 'chest' | 'hands' | 'feet' | 'shield';

export type ArmorType = 'light' | 'heavy' | 'clothing';

export type PotionEffect =
    | 'restore_health' | 'restore_stamina' | 'restore_magicka'
    | 'fortify_health' | 'fortify_stamina' | 'fortify_magicka'
    | 'resist_fire' | 'resist_frost' | 'resist_shock' | 'resist_poison'
    | 'invisibility' | 'waterbreathing'
    | 'damage_health' | 'damage_stamina' | 'damage_magicka'
    | 'paralysis' | 'slow';

// --- Equipment Slots ---

export type EquipmentSlot =
    | 'head' | 'chest' | 'hands' | 'feet'
    | 'ring_left' | 'ring_right' | 'amulet'
    | 'weapon_main' | 'weapon_off' | 'ammo';

export type EquippedGear = Partial<Record<EquipmentSlot, Item>>;

// --- Inventory ---

export interface InventoryEntry {
    item: Item;
    quantity: number;
}

export interface Inventory {
    items: InventoryEntry[];
    maxWeight: number;
}

export interface ContainerInventory extends Inventory {
    containerId: string;
    locked: boolean;
    lockLevel?: 'novice' | 'apprentice' | 'adept' | 'expert' | 'master';
}

// --- Leveled Lists ---

export interface LeveledListEntry {
    itemId: string;
    minLevel: number;
    maxLevel?: number;
    weight: number; // probability weight
    count: { min: number; max: number };
}

export interface LeveledList {
    id: string;
    entries: LeveledListEntry[];
    rollCount: { min: number; max: number };
}
