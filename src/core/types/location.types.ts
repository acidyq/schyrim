// ============================================================
// Schyrim Core Types — Locations & World
// ============================================================

import type { ContainerInventory } from './items.types.js';

export interface WorldState {
    locations: Record<string, LocationInstance>;
    currentTime: GameTime;
    weather: WeatherState;
    discoveredLocations: string[];
    worldFlags: Record<string, boolean>;
    /** Persistent vendor inventories: vendorId → itemId → quantity */
    vendorInventories: Record<string, Record<string, number>>;
}

/** Definition of a location (from data) */
export interface LocationDefinition {
    id: string;
    name: string;
    type: LocationType;
    region: string;          // e.g., "whiterun_hold"
    description: string;
    detailedDescription?: string; // longer description for first visit
    exits: ExitDefinition[];
    entities: LocationEntityRef[];
    tags: LocationTag[];
    ambient: AmbientData;
}

export type LocationType =
    | 'city' | 'town' | 'village' | 'inn'
    | 'dungeon' | 'cave' | 'ruins' | 'wilderness'
    | 'fort' | 'tower' | 'dragon_lair' | 'sacred_site'
    | 'mine' | 'camp' | 'farm' | 'road';

export type LocationTag =
    | 'civilized' | 'dangerous' | 'safe' | 'underground'
    | 'outdoor' | 'indoor' | 'sacred' | 'cursed'
    | 'faction_territory' | 'trade_hub' | 'no_fast_travel';

export interface ExitDefinition {
    targetLocationId: string;
    direction: string;       // "north", "east", "through the iron door", etc.
    travelTime: number;      // in game time units
    description?: string;    // e.g., "A narrow path leads down into darkness"
    locked?: boolean;
    keyItemId?: string;      // item ID needed to unlock
    hidden?: boolean;        // only visible after discovery
    dangerLevel: number;     // 0-10, affects random encounter chance
}

export interface LocationEntityRef {
    type: 'npc' | 'enemy' | 'container' | 'crafting_station' | 'interactable';
    entityId: string;
    spawnCondition?: SpawnCondition;
}

export interface SpawnCondition {
    type: 'always' | 'time_of_day' | 'quest_stage' | 'flag' | 'level_range';
    params: Record<string, string | number | boolean>;
}

/** Runtime state of a location (mutable) */
export interface LocationInstance {
    definitionId: string;
    visited: boolean;
    visitCount: number;
    containers: Record<string, ContainerInventory>;
    clearedEnemies: string[];     // entity IDs of defeated enemies
    discoveredExits: string[];    // target location IDs of found hidden exits
    flags: Record<string, boolean>;
    lastVisitTime?: GameTime;
}

// --- Time ---

export interface GameTime {
    day: number;            // day count from game start
    hour: number;           // 0-23
    minute: number;         // 0-59
    period: TimePeriod;
}

export type TimePeriod = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night';

// --- Weather ---

export interface WeatherState {
    current: WeatherType;
    intensity: number;       // 0.0 - 1.0
    duration: number;        // remaining time units
    nextWeather?: WeatherType;
}

export type WeatherType = 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'fog' | 'ash';

// --- Ambient ---

export interface AmbientData {
    defaultWeather: WeatherType;
    lightLevel: 'bright' | 'dim' | 'dark';
    dangerLevel: number;     // 0-10
    temperature?: 'freezing' | 'cold' | 'mild' | 'warm' | 'hot'; // for survival hooks
    sounds?: string[];       // ambient sound descriptions for AI narration
}

// --- NPCs ---

export interface NPCDefinition {
    id: string;
    name: string;
    race: string;
    description: string;
    locationId: string;
    factionId?: string;
    dialogueTreeId?: string;
    vendorConfig?: VendorConfig;
    trainerConfig?: TrainerConfig;
    schedule?: NPCSchedule[];
    tags: string[];
    essential?: boolean;     // can't be killed (quest-important)
}

export interface VendorConfig {
    archetype: VendorArchetype;
    goldPool: number;
    restockTimeDays: number;
    inventoryListId: string; // leveled list ID for vendor stock
    priceBias: Record<string, number>; // item type → multiplier (blacksmith pays more for weapons)
}

export type VendorArchetype = 'general_goods' | 'blacksmith' | 'alchemist' | 'court_mage' | 'fence' | 'trainer';

export interface TrainerConfig {
    skill: string;           // skill ID they train
    maxTrainingLevel: number;
    costPerLevel: number;
}

export interface NPCSchedule {
    timePeriod: TimePeriod;
    locationId: string;
    activity: string;        // description for AI narration
}
