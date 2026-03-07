// ============================================================
// Schyrim Tests — Dialogue Engine
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    startDialogue,
    getCurrentNode,
    getAvailableOptions,
    selectOption,
    evaluateCondition,
    formatDialogueNode,
} from '../../../src/systems/dialogue/dialogue-engine.js';
import type { DialogueContext } from '../../../src/systems/dialogue/dialogue-engine.js';
import type { DialogueTree, DialogueCondition } from '../../../src/core/types/dialogue.types.js';
import { EventBus } from '../../../src/core/event-bus.js';
import { initializeSkills } from '../../../src/systems/progression/skill-system.js';
import type { PlayerState } from '../../../src/core/types/character.types.js';

// --- Test Fixtures ---

function makePlayer(overrides?: Partial<PlayerState>): PlayerState {
    return {
        name: 'Test',
        race: 'nord',
        level: 5,
        experience: 0,
        attributes: { health: 100, healthMax: 100, stamina: 100, staminaMax: 100, magicka: 100, magickaMax: 100 },
        skills: initializeSkills(),
        perks: [],
        perkPoints: 0,
        knownSpells: [],
        knownShouts: [],
        activeEffects: [],
        inventory: { items: [], maxWeight: 300 },
        equipment: {},
        gold: 50,
        currentLocationId: 'whiterun',
        discoveredLocations: ['whiterun'],
        activePowerCooldowns: {},
        ...overrides,
    };
}

function makeContext(overrides?: Partial<DialogueContext>): DialogueContext {
    return {
        player: makePlayer(),
        quests: { activeQuests: {}, completedQuests: [], failedQuests: [], flags: {} },
        factions: { reputations: {}, ranks: {} },
        flags: {},
        ...overrides,
    };
}

const simpleTree: DialogueTree = {
    id: 'tree_innkeeper',
    speakerId: 'npc_innkeeper',
    speakerName: 'Hulda',
    startNodeId: 'greeting',
    nodes: {
        greeting: {
            id: 'greeting',
            text: 'Welcome to the Bannered Mare! What can I do for you?',
            options: [
                { id: 'rumors', text: 'Heard any rumors?', nextNodeId: 'rumors_node' },
                { id: 'room', text: 'I need a room.', nextNodeId: 'room_node' },
                { id: 'leave', text: 'Nothing, thanks.' },
            ],
        },
        rumors_node: {
            id: 'rumors_node',
            text: 'They say a strange barrow was found near Whiterun...',
            options: [
                { id: 'tell_more', text: 'Tell me more.', nextNodeId: 'details_node' },
                { id: 'back', text: 'Thanks.', nextNodeId: 'greeting' },
            ],
            effects: [{ type: 'set_flag', flagId: 'heard_rumors', value: true }],
        },
        room_node: {
            id: 'room_node',
            text: 'That will be 10 gold for a night.',
            options: [],
            isTerminal: true,
        },
        details_node: {
            id: 'details_node',
            text: 'An ancient barrow, Bleak Falls, hides great treasure and great danger.',
            options: [],
            isTerminal: true,
            effects: [{ type: 'start_quest', questId: 'quest_bleak_falls' }],
        },
    },
};

const conditionalTree: DialogueTree = {
    id: 'tree_guard',
    speakerId: 'npc_guard',
    speakerName: 'Guard',
    startNodeId: 'halt',
    nodes: {
        halt: {
            id: 'halt',
            text: 'Halt! State your business.',
            options: [
                {
                    id: 'persuade', text: 'I\'m on important business.', nextNodeId: 'pass',
                    conditions: [{ type: 'skill_check', skill: 'speech', minLevel: 30 }],
                    skillCheckDifficulty: 40,
                },
                {
                    id: 'guild', text: 'I am a member of the Guild.',
                    nextNodeId: 'pass',
                    conditions: [{ type: 'guild_membership', factionId: 'thieves_guild' }],
                    hidden: true,
                },
                {
                    id: 'nord_only', text: 'A true Nord needs no permission.',
                    nextNodeId: 'pass',
                    conditions: [{ type: 'race_required', race: 'nord' }],
                },
                { id: 'bribe', text: 'Never mind.', nextNodeId: undefined },
            ],
        },
        pass: {
            id: 'pass',
            text: 'Very well, you may pass.',
            options: [],
            isTerminal: true,
        },
    },
};

// --- Tests ---

describe('DialogueEngine', () => {
    describe('startDialogue()', () => {
        it('should create a dialogue session pointing to the start node', () => {
            const session = startDialogue(simpleTree);
            expect(session.isActive).toBe(true);
            expect(session.currentNodeId).toBe('greeting');
            expect(session.history).toEqual(['greeting']);
        });

        it('should emit DIALOGUE_STARTED event when event bus provided', () => {
            const bus = new EventBus();
            const handler = vi.fn();
            bus.on('DIALOGUE_STARTED', handler);

            startDialogue(simpleTree, bus);
            expect(handler).toHaveBeenCalledOnce();
            expect(handler).toHaveBeenCalledWith(expect.objectContaining({
                npcId: 'npc_innkeeper',
            }));
        });
    });

    describe('getCurrentNode()', () => {
        it('should return the current dialogue node', () => {
            const session = startDialogue(simpleTree);
            const node = getCurrentNode(session);
            expect(node).toBeDefined();
            expect(node!.id).toBe('greeting');
            expect(node!.text).toContain('Welcome');
        });

        it('should return undefined for invalid node ID', () => {
            const session = startDialogue(simpleTree);
            session.currentNodeId = 'nonexistent';
            const node = getCurrentNode(session);
            expect(node).toBeUndefined();
        });
    });

    describe('getAvailableOptions()', () => {
        it('should return all options for a node with no conditions', () => {
            const session = startDialogue(simpleTree);
            const context = makeContext();
            const options = getAvailableOptions(session, context);
            expect(options).toHaveLength(3);
            expect(options.every(o => o.meetsConditions)).toBe(true);
        });

        it('should filter hidden options that don\'t meet conditions', () => {
            const session = startDialogue(conditionalTree);
            const context = makeContext(); // no guild membership
            const options = getAvailableOptions(session, context);

            // The hidden guild option should be filtered out
            const guildOption = options.find(o => o.option.id === 'guild');
            expect(guildOption).toBeUndefined();
        });

        it('should show hidden options when conditions are met', () => {
            const session = startDialogue(conditionalTree);
            const context = makeContext({
                factions: { reputations: { thieves_guild: 10 }, ranks: {} },
            });
            const options = getAvailableOptions(session, context);
            const guildOption = options.find(o => o.option.id === 'guild');
            expect(guildOption).toBeDefined();
            expect(guildOption!.meetsConditions).toBe(true);
        });

        it('should mark non-hidden options as locked when conditions not met', () => {
            const session = startDialogue(conditionalTree);
            // Player with low speech
            const context = makeContext();
            const options = getAvailableOptions(session, context);
            const persuadeOpt = options.find(o => o.option.id === 'persuade');
            expect(persuadeOpt).toBeDefined();
            expect(persuadeOpt!.meetsConditions).toBe(false);
        });

        it('should calculate skill check chance', () => {
            const session = startDialogue(conditionalTree);
            const player = makePlayer();
            player.skills.speech = { level: 40, xp: 0, xpToNextLevel: 100 };
            const context = makeContext({ player });
            const options = getAvailableOptions(session, context);
            const persuadeOpt = options.find(o => o.option.id === 'persuade');
            expect(persuadeOpt?.skillCheckChance).toBeDefined();
            expect(persuadeOpt!.skillCheckChance!).toBeGreaterThan(0);
        });
    });

    describe('selectOption()', () => {
        it('should advance to the next node', () => {
            const session = startDialogue(simpleTree);
            const context = makeContext();
            const { session: updated } = selectOption(session, 'rumors', context);
            expect(updated.currentNodeId).toBe('rumors_node');
            expect(updated.isActive).toBe(true);
            expect(updated.history).toContain('rumors_node');
        });

        it('should end dialogue when option has no nextNodeId', () => {
            const session = startDialogue(simpleTree);
            const context = makeContext();
            const { session: updated } = selectOption(session, 'leave', context);
            expect(updated.isActive).toBe(false);
        });

        it('should end dialogue when reaching a terminal node', () => {
            const session = startDialogue(simpleTree);
            const context = makeContext();
            const { session: updated } = selectOption(session, 'room', context);
            expect(updated.isActive).toBe(false);
        });

        it('should collect effects from the option and target node', () => {
            const session = startDialogue(simpleTree);
            session.currentNodeId = 'rumors_node';
            const context = makeContext();
            const { effects } = selectOption(session, 'tell_more', context);
            // details_node has a start_quest effect
            const questEffect = effects.find(e => e.type === 'start_quest');
            expect(questEffect).toBeDefined();
        });

        it('should emit DIALOGUE_CHOICE_MADE event', () => {
            const bus = new EventBus();
            const handler = vi.fn();
            bus.on('DIALOGUE_CHOICE_MADE', handler);

            const session = startDialogue(simpleTree);
            const context = makeContext();
            selectOption(session, 'rumors', context, bus);
            expect(handler).toHaveBeenCalledOnce();
        });

        it('should return empty for invalid option ID', () => {
            const session = startDialogue(simpleTree);
            const context = makeContext();
            const { session: updated, effects } = selectOption(session, 'nonexistent', context);
            expect(effects).toHaveLength(0);
            expect(updated.currentNodeId).toBe('greeting'); // unchanged
        });
    });

    describe('evaluateCondition()', () => {
        it('should evaluate skill_check condition', () => {
            const cond: DialogueCondition = { type: 'skill_check', skill: 'speech', minLevel: 30 };
            const ctx = makeContext();
            expect(evaluateCondition(cond, ctx)).toBe(false); // default skill level < 30

            ctx.player.skills.speech = { level: 50, xp: 0, xpToNextLevel: 100 };
            expect(evaluateCondition(cond, ctx)).toBe(true);
        });

        it('should evaluate perk_required condition', () => {
            const cond: DialogueCondition = { type: 'perk_required', perkId: 'haggling_1' };
            const ctx = makeContext();
            expect(evaluateCondition(cond, ctx)).toBe(false);

            ctx.player.perks.push('haggling_1');
            expect(evaluateCondition(cond, ctx)).toBe(true);
        });

        it('should evaluate race_required condition', () => {
            const cond: DialogueCondition = { type: 'race_required', race: 'nord' };
            const ctx = makeContext();
            expect(evaluateCondition(cond, ctx)).toBe(true);

            ctx.player.race = 'dunmer';
            expect(evaluateCondition(cond, ctx)).toBe(false);
        });

        it('should evaluate guild_membership condition', () => {
            const cond: DialogueCondition = { type: 'guild_membership', factionId: 'mages_guild' };
            const ctx = makeContext();
            expect(evaluateCondition(cond, ctx)).toBe(false);

            ctx.factions.reputations['mages_guild'] = 5;
            expect(evaluateCondition(cond, ctx)).toBe(true);
        });

        it('should evaluate reputation_threshold condition', () => {
            const cond: DialogueCondition = { type: 'reputation_threshold', factionId: 'nobles', minReputation: 20 };
            const ctx = makeContext();
            expect(evaluateCondition(cond, ctx)).toBe(false);

            ctx.factions.reputations['nobles'] = 25;
            expect(evaluateCondition(cond, ctx)).toBe(true);
        });

        it('should evaluate quest_stage condition', () => {
            const cond: DialogueCondition = { type: 'quest_stage', questId: 'quest_1', stageId: 'stage_2', comparison: 'at' };
            const ctx = makeContext();
            // Quest not active — at should be false
            expect(evaluateCondition(cond, ctx)).toBe(false);

            ctx.quests.activeQuests['quest_1'] = {
                questId: 'quest_1',
                currentStageId: 'stage_2',
                objectiveProgress: {},
                startedAt: new Date().toISOString(),
            };
            expect(evaluateCondition(cond, ctx)).toBe(true);
        });

        it('should evaluate item_possessed condition', () => {
            const cond: DialogueCondition = { type: 'item_possessed', itemId: 'golden_claw', quantity: 1 };
            const ctx = makeContext();
            expect(evaluateCondition(cond, ctx)).toBe(false);

            ctx.player.inventory.items.push({
                item: { id: 'golden_claw', name: 'Golden Claw', description: '', type: 'quest_item', weight: 1, baseValue: 100, rarity: 'unique', tags: ['quest'] } as any,
                quantity: 1,
            });
            expect(evaluateCondition(cond, ctx)).toBe(true);
        });

        it('should evaluate stat_check condition for gold', () => {
            const cond: DialogueCondition = { type: 'stat_check', stat: 'gold', minValue: 100 };
            const ctx = makeContext();
            expect(evaluateCondition(cond, ctx)).toBe(false); // player has 50g

            ctx.player.gold = 200;
            expect(evaluateCondition(cond, ctx)).toBe(true);
        });

        it('should evaluate stat_check condition for level', () => {
            const cond: DialogueCondition = { type: 'stat_check', stat: 'level', minValue: 10 };
            const ctx = makeContext();
            expect(evaluateCondition(cond, ctx)).toBe(false); // player level 5

            ctx.player.level = 15;
            expect(evaluateCondition(cond, ctx)).toBe(true);
        });

        it('should evaluate flag_set condition', () => {
            const cond: DialogueCondition = { type: 'flag_set', flagId: 'dragon_slain', value: true };
            const ctx = makeContext();
            expect(evaluateCondition(cond, ctx)).toBe(false);

            ctx.flags['dragon_slain'] = true;
            expect(evaluateCondition(cond, ctx)).toBe(true);
        });
    });

    describe('formatDialogueNode()', () => {
        it('should format node text and options', () => {
            const session = startDialogue(simpleTree);
            const ctx = makeContext();
            const options = getAvailableOptions(session, ctx);
            const output = formatDialogueNode(session, options);
            expect(output).toContain('Hulda');
            expect(output).toContain('Welcome');
            expect(output).toContain('[1]');
            expect(output).toContain('[Leave]');
        });

        it('should show locked options', () => {
            const session = startDialogue(conditionalTree);
            const ctx = makeContext();
            const options = getAvailableOptions(session, ctx);
            const output = formatDialogueNode(session, options);
            expect(output).toContain('[Locked]');
        });
    });
});
