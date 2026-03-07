// ============================================================
// Schyrim Core Types — Dialogue
// ============================================================

import type { SkillId, RaceId } from './character.types.js';

/** A complete dialogue tree for an NPC or situation */
export interface DialogueTree {
    id: string;
    speakerId: string;       // NPC or entity ID
    speakerName: string;
    startNodeId: string;     // entry point node
    nodes: Record<string, DialogueNode>;
}

/** A single node in a dialogue tree */
export interface DialogueNode {
    id: string;
    text: string;            // what the NPC says
    options: DialogueOption[];
    effects?: DialogueEffect[]; // effects that trigger when this node is reached
    isTerminal?: boolean;    // if true, conversation ends after this node
}

/** A player choice in dialogue */
export interface DialogueOption {
    id: string;
    text: string;            // what the player says
    nextNodeId?: string;     // where this choice leads (undefined = end dialogue)
    conditions?: DialogueCondition[];
    effects?: DialogueEffect[];
    hidden?: boolean;        // only shown when conditions are met
    skillCheckDifficulty?: number; // if this is a skill check, the DC
}

// --- Conditions (Discriminated Union) ---

export type DialogueCondition =
    | { type: 'skill_check'; skill: SkillId; minLevel: number }
    | { type: 'perk_required'; perkId: string }
    | { type: 'race_required'; race: RaceId }
    | { type: 'guild_membership'; factionId: string }
    | { type: 'reputation_threshold'; factionId: string; minReputation: number }
    | { type: 'quest_stage'; questId: string; stageId: string; comparison: 'at' | 'past' | 'before' }
    | { type: 'item_possessed'; itemId: string; quantity?: number }
    | { type: 'stat_check'; stat: 'health' | 'stamina' | 'magicka' | 'gold' | 'level'; minValue: number }
    | { type: 'flag_set'; flagId: string; value: boolean };

// --- Effects ---

export type DialogueEffect =
    | { type: 'start_quest'; questId: string }
    | { type: 'advance_quest'; questId: string; stageId: string }
    | { type: 'give_item'; itemId: string; quantity: number }
    | { type: 'remove_item'; itemId: string; quantity: number }
    | { type: 'give_gold'; amount: number }
    | { type: 'remove_gold'; amount: number }
    | { type: 'change_reputation'; factionId: string; amount: number }
    | { type: 'teach_spell'; spellId: string }
    | { type: 'set_flag'; flagId: string; value: boolean }
    | { type: 'open_trade'; vendorId: string }
    | { type: 'start_combat'; enemyIds: string[] }
    | { type: 'teleport'; locationId: string }
    | { type: 'rest'; hours: number };
