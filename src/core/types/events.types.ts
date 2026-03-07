// ============================================================
// Schyrim Core Types — Events (Typed Event Bus)
// ============================================================

import type { Item } from './items.types.js';
import type { SkillId } from './character.types.js';
import type { StatusEffect, DamageResult, CombatOutcome } from './combat.types.js';
import type { WeatherType, TimePeriod } from './location.types.js';

/** All game event types */
export enum GameEventType {
    // Combat
    COMBAT_START = 'COMBAT_START',
    COMBAT_END = 'COMBAT_END',
    COMBAT_DAMAGE = 'COMBAT_DAMAGE',
    COMBAT_HEAL = 'COMBAT_HEAL',
    COMBAT_STATUS_APPLIED = 'COMBAT_STATUS_APPLIED',

    // Inventory
    ITEM_ACQUIRED = 'ITEM_ACQUIRED',
    ITEM_DROPPED = 'ITEM_DROPPED',
    ITEM_EQUIPPED = 'ITEM_EQUIPPED',
    ITEM_UNEQUIPPED = 'ITEM_UNEQUIPPED',
    ITEM_USED = 'ITEM_USED',

    // Quest
    QUEST_STARTED = 'QUEST_STARTED',
    QUEST_STAGE_CHANGE = 'QUEST_STAGE_CHANGE',
    QUEST_COMPLETED = 'QUEST_COMPLETED',
    QUEST_FAILED = 'QUEST_FAILED',
    QUEST_OBJECTIVE_UPDATE = 'QUEST_OBJECTIVE_UPDATE',

    // Navigation
    LOCATION_ENTERED = 'LOCATION_ENTERED',
    LOCATION_EXITED = 'LOCATION_EXITED',
    LOCATION_DISCOVERED = 'LOCATION_DISCOVERED',

    // Reputation
    REPUTATION_CHANGE = 'REPUTATION_CHANGE',
    FACTION_RANK_CHANGE = 'FACTION_RANK_CHANGE',

    // Progression
    SKILL_XP_GAINED = 'SKILL_XP_GAINED',
    SKILL_LEVEL_UP = 'SKILL_LEVEL_UP',
    CHARACTER_LEVEL_UP = 'CHARACTER_LEVEL_UP',
    PERK_ACQUIRED = 'PERK_ACQUIRED',

    // Economy
    TRADE_COMPLETED = 'TRADE_COMPLETED',
    GOLD_CHANGED = 'GOLD_CHANGED',

    // Dialogue
    DIALOGUE_STARTED = 'DIALOGUE_STARTED',
    DIALOGUE_CHOICE_MADE = 'DIALOGUE_CHOICE_MADE',
    DIALOGUE_ENDED = 'DIALOGUE_ENDED',

    // Time & Weather
    TIME_ADVANCED = 'TIME_ADVANCED',
    WEATHER_CHANGED = 'WEATHER_CHANGED',

    // World Events
    RANDOM_ENCOUNTER = 'RANDOM_ENCOUNTER',
    WORLD_EVENT = 'WORLD_EVENT',

    // System
    SAVE_GAME = 'SAVE_GAME',
    LOAD_GAME = 'LOAD_GAME',
    GAME_STARTED = 'GAME_STARTED',
}

/** Typed event payloads — maps event type to its data */
export interface GameEventPayloads {
    [GameEventType.COMBAT_START]: { participantIds: string[]; locationId: string };
    [GameEventType.COMBAT_END]: { outcome: CombatOutcome; participantIds: string[]; xpGained: number };
    [GameEventType.COMBAT_DAMAGE]: { attackerId: string; targetId: string; result: DamageResult };
    [GameEventType.COMBAT_HEAL]: { healerId: string; targetId: string; amount: number; source: string };
    [GameEventType.COMBAT_STATUS_APPLIED]: { targetId: string; effect: StatusEffect };

    [GameEventType.ITEM_ACQUIRED]: { entityId: string; item: Item; quantity: number; source: string };
    [GameEventType.ITEM_DROPPED]: { entityId: string; item: Item; quantity: number };
    [GameEventType.ITEM_EQUIPPED]: { entityId: string; item: Item; slot: string };
    [GameEventType.ITEM_UNEQUIPPED]: { entityId: string; item: Item; slot: string };
    [GameEventType.ITEM_USED]: { entityId: string; item: Item };

    [GameEventType.QUEST_STARTED]: { questId: string; questTitle: string };
    [GameEventType.QUEST_STAGE_CHANGE]: { questId: string; fromStage: string; toStage: string };
    [GameEventType.QUEST_COMPLETED]: { questId: string; questTitle: string };
    [GameEventType.QUEST_FAILED]: { questId: string; reason: string };
    [GameEventType.QUEST_OBJECTIVE_UPDATE]: { questId: string; objectiveId: string; progress: number; total: number };

    [GameEventType.LOCATION_ENTERED]: { locationId: string; locationName: string; locationType: string };
    [GameEventType.LOCATION_EXITED]: { locationId: string };
    [GameEventType.LOCATION_DISCOVERED]: { locationId: string; locationName: string };

    [GameEventType.REPUTATION_CHANGE]: { factionId: string; oldValue: number; newValue: number; reason: string };
    [GameEventType.FACTION_RANK_CHANGE]: { factionId: string; oldRank: string; newRank: string };

    [GameEventType.SKILL_XP_GAINED]: { skill: SkillId; xpGained: number; totalXp: number; source: string };
    [GameEventType.SKILL_LEVEL_UP]: { skill: SkillId; newLevel: number };
    [GameEventType.CHARACTER_LEVEL_UP]: { newLevel: number };
    [GameEventType.PERK_ACQUIRED]: { perkId: string; perkName: string; tree: SkillId };

    [GameEventType.TRADE_COMPLETED]: { vendorId: string; itemsBought: string[]; itemsSold: string[]; goldDelta: number };
    [GameEventType.GOLD_CHANGED]: { oldAmount: number; newAmount: number; reason: string };

    [GameEventType.DIALOGUE_STARTED]: { npcId: string; npcName: string; dialogueTreeId: string };
    [GameEventType.DIALOGUE_CHOICE_MADE]: { npcId: string; optionId: string; optionText: string };
    [GameEventType.DIALOGUE_ENDED]: { npcId: string };

    [GameEventType.TIME_ADVANCED]: { oldPeriod: TimePeriod; newPeriod: TimePeriod; hoursAdvanced: number };
    [GameEventType.WEATHER_CHANGED]: { oldWeather: WeatherType; newWeather: WeatherType };

    [GameEventType.RANDOM_ENCOUNTER]: { encounterType: string; locationId: string };
    [GameEventType.WORLD_EVENT]: { eventType: string; description: string };

    [GameEventType.SAVE_GAME]: { saveName: string; timestamp: string };
    [GameEventType.LOAD_GAME]: { saveName: string; timestamp: string };
    [GameEventType.GAME_STARTED]: { playerName: string; race: string };
}

/** A recorded event for history / AI context */
export interface GameEventRecord {
    type: GameEventType;
    payload: GameEventPayloads[GameEventType];
    timestamp: string; // ISO timestamp
    gameTime?: { day: number; hour: number };
}

/** Event subscriber function type */
export type EventHandler<T extends GameEventType> = (payload: GameEventPayloads[T]) => void;
