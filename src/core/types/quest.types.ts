// ============================================================
// Schyrim Core Types — Quests
// ============================================================

export interface QuestState {
    activeQuests: Record<string, QuestInstance>;
    completedQuests: string[];
    failedQuests: string[];
    flags: Record<string, boolean>; // global quest flags
}

/** Definition of a quest (from data) */
export interface QuestDefinition {
    id: string;
    title: string;
    description: string;
    type: QuestType;
    faction?: string;         // associated faction ID
    prerequisites?: QuestPrerequisite[];
    stages: QuestStageDefinition[];
    rewards: QuestReward[];
    isRepeatable?: boolean;   // for radiant quests
}

export type QuestType = 'main' | 'faction' | 'side' | 'radiant';

export interface QuestPrerequisite {
    type: 'quest_completed' | 'quest_stage' | 'reputation' | 'level' | 'skill' | 'item';
    target: string;          // quest ID, faction ID, skill ID, item ID
    value: number | string;  // threshold or stage ID
}

export interface QuestStageDefinition {
    id: string;
    description: string;      // objective text shown to player
    objectives: QuestObjective[];
    onComplete?: QuestStageEffect[];
    onFail?: QuestStageEffect[];
    nextStageId?: string;     // null = quest complete
    failStageId?: string;     // what happens on failure
}

export interface QuestObjective {
    id: string;
    text: string;
    type: ObjectiveType;
    target: string;           // location ID, NPC ID, item ID, enemy type
    count?: number;           // how many to kill/collect
    locationId?: string;      // where the objective takes place
    optional?: boolean;
}

export type ObjectiveType =
    | 'go_to'          // travel to location
    | 'talk_to'        // speak with NPC
    | 'kill'           // defeat enemies
    | 'collect'        // obtain items
    | 'deliver'        // bring item to NPC
    | 'escort'         // bring NPC to location
    | 'investigate'    // examine/interact with something
    | 'survive'        // survive for X rounds
    | 'custom';        // generic, checked by flag

export type QuestStageEffect =
    | { type: 'give_item'; itemId: string; quantity: number }
    | { type: 'give_gold'; amount: number }
    | { type: 'give_xp'; amount: number }
    | { type: 'change_reputation'; factionId: string; amount: number }
    | { type: 'set_flag'; flagId: string; value: boolean }
    | { type: 'unlock_location'; locationId: string }
    | { type: 'spawn_enemy'; enemyId: string; locationId: string }
    | { type: 'change_npc_state'; npcId: string; state: string }
    | { type: 'start_quest'; questId: string };

export interface QuestReward {
    type: 'gold' | 'item' | 'xp' | 'reputation' | 'spell' | 'perk_point';
    target?: string;         // item ID, faction ID, spell ID
    amount: number;
}

/** Runtime instance of an active quest */
export interface QuestInstance {
    questId: string;
    currentStageId: string;
    objectiveProgress: Record<string, number>; // objective ID → current count
    startedAt: string;       // ISO timestamp
    data?: Record<string, string>; // radiant quest parameters (target name, location, etc.)
}

// --- Radiant Quest Templates ---

export interface RadiantQuestTemplate {
    id: string;
    baseQuestId: string;     // base quest definition to clone
    parameterSlots: RadiantParameter[];
    validDispatchers: string[]; // NPC IDs that can give this quest type
    cooldown: number;        // minimum time between instances
}

export interface RadiantParameter {
    name: string;            // e.g., "target_location", "target_enemy"
    type: 'location' | 'enemy' | 'item' | 'npc';
    filters: Record<string, string | number | boolean>; // e.g., { "type": "dungeon", "danger": "medium" }
}
