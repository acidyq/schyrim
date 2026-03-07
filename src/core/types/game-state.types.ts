// ============================================================
// Schyrim Core Types — Game State
// ============================================================

import type { PlayerState } from './character.types.js';
import type { WorldState } from './location.types.js';
import type { QuestState } from './quest.types.js';
import type { FactionState } from './faction.types.js';
import type { GameEventRecord } from './events.types.js';

/** Top-level game state — single source of truth */
export interface GameState {
    meta: GameMeta;
    player: PlayerState;
    world: WorldState;
    quests: QuestState;
    factions: FactionState;
    eventHistory: GameEventRecord[];
    config: RuntimeConfig;
}

export interface GameMeta {
    version: string;
    saveDate: string;
    playTime: number; // seconds
    saveName: string;
}

export interface RuntimeConfig {
    difficulty: DifficultySettings;
    immersion: ImmersionSettings;
    display: DisplaySettings;
    ai: AIRuntimeSettings;
}

export interface DifficultySettings {
    damageDealtMultiplier: number;    // 0.5 = easy, 1.0 = normal, 2.0 = hard
    damageReceivedMultiplier: number;
    xpMultiplier: number;
    lootRarityBias: number;          // higher = more rare drops
    encounterFrequency: number;       // 0.0 - 1.0
}

export interface ImmersionSettings {
    survivalEnabled: boolean;        // cold, hunger, fatigue (hooks only in M1)
    weatherEffects: boolean;
    timePassing: boolean;
    randomEncounters: boolean;
}

export interface DisplaySettings {
    colorMode: 'full' | 'minimal' | 'none';
    combatLogVerbosity: 'succinct' | 'detailed';
    confirmDestructiveActions: boolean;
    showDamageBreakdown: boolean;
}

export interface AIRuntimeSettings {
    enabled: boolean;
    verbosity: 'minimal' | 'standard' | 'cinematic';
    showSuggestedOptions: boolean;
}

/** Result type for system operations */
export type SystemResult<T> =
    | { success: true; data: T; message?: string }
    | { success: false; error: string; code: ErrorCode };

export enum ErrorCode {
    // Inventory
    INVENTORY_FULL = 'INVENTORY_FULL',
    ITEM_NOT_FOUND = 'ITEM_NOT_FOUND',
    INVALID_SLOT = 'INVALID_SLOT',
    CANNOT_EQUIP = 'CANNOT_EQUIP',

    // Combat
    INSUFFICIENT_MAGICKA = 'INSUFFICIENT_MAGICKA',
    INSUFFICIENT_STAMINA = 'INSUFFICIENT_STAMINA',
    ON_COOLDOWN = 'ON_COOLDOWN',
    INVALID_TARGET = 'INVALID_TARGET',

    // Navigation
    INVALID_EXIT = 'INVALID_EXIT',
    TRAVEL_BLOCKED = 'TRAVEL_BLOCKED',

    // Economy
    INSUFFICIENT_GOLD = 'INSUFFICIENT_GOLD',
    VENDOR_NO_GOLD = 'VENDOR_NO_GOLD',
    ITEM_NOT_SELLABLE = 'ITEM_NOT_SELLABLE',

    // Quest
    QUEST_PREREQUISITES_NOT_MET = 'QUEST_PREREQUISITES_NOT_MET',
    QUEST_ALREADY_ACTIVE = 'QUEST_ALREADY_ACTIVE',

    // AI
    AI_PROVIDER_ERROR = 'AI_PROVIDER_ERROR',
    AI_PARSE_ERROR = 'AI_PARSE_ERROR',
    AI_VALIDATION_ERROR = 'AI_VALIDATION_ERROR',

    // General
    INVALID_ACTION = 'INVALID_ACTION',
    DATA_VALIDATION_ERROR = 'DATA_VALIDATION_ERROR',
}
