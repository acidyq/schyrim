// ============================================================
// Schyrim Tests — Quest System
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    canStartQuest,
    startQuest,
    advanceQuestStage,
    completeQuest,
    failQuest,
    trackObjectiveProgress,
    onLocationEntered,
    onEnemyKilled,
    onItemCollected,
    getActiveQuestList,
    getObjectiveProgressText,
} from '../../../src/systems/quests/quest-system.js';
import { GameStateManager } from '../../../src/core/game-state.js';
import { EventBus } from '../../../src/core/event-bus.js';
import type { QuestDefinition } from '../../../src/core/types/quest.types.js';

// --- Test Fixtures ---

function makeQuestDef(overrides?: Partial<QuestDefinition>): QuestDefinition {
    return {
        id: 'quest_test',
        title: 'The Test Quest',
        description: 'A quest for testing.',
        type: 'side',
        stages: [
            {
                id: 'stage_1',
                description: 'Go to the dungeon.',
                objectives: [
                    { id: 'obj_go', text: 'Travel to Dark Cave', type: 'go_to', target: 'dark_cave' },
                ],
                nextStageId: 'stage_2',
            },
            {
                id: 'stage_2',
                description: 'Kill the spiders.',
                objectives: [
                    { id: 'obj_kill', text: 'Kill 3 Frostbite Spiders', type: 'kill', target: 'frostbite_spider', count: 3 },
                ],
                nextStageId: 'stage_3',
                onComplete: [
                    { type: 'give_gold', amount: 100 },
                ],
            },
            {
                id: 'stage_3',
                description: 'Return to the quest giver.',
                objectives: [
                    { id: 'obj_talk', text: 'Talk to Hulda', type: 'talk_to', target: 'npc_hulda' },
                ],
                // no nextStageId → completing this stage completes the quest
            },
        ],
        rewards: [
            { type: 'xp', amount: 200 },
            { type: 'gold', amount: 50 },
        ],
        ...overrides,
    };
}

const questWithPrereqs: QuestDefinition = makeQuestDef({
    id: 'quest_locked',
    prerequisites: [
        { type: 'quest_completed', target: 'quest_prologue', value: '' },
        { type: 'level', target: '', value: 5 },
    ],
});

const collectQuest: QuestDefinition = makeQuestDef({
    id: 'quest_collect',
    title: 'Collecting Things',
    stages: [
        {
            id: 'stage_collect',
            description: 'Collect 5 mushrooms.',
            objectives: [
                { id: 'obj_collect', text: 'Collect 5 Nightshade', type: 'collect', target: 'nightshade', count: 5 },
            ],
        },
    ],
});

// --- Tests ---

describe('QuestSystem', () => {
    let gsm: GameStateManager;
    let bus: EventBus;

    beforeEach(() => {
        gsm = new GameStateManager();
        bus = new EventBus();
    });

    describe('canStartQuest()', () => {
        it('should allow starting a quest with no prerequisites', () => {
            const quest = makeQuestDef();
            expect(canStartQuest(gsm, quest)).toBe(true);
        });

        it('should reject quest when prerequisite quest is not completed', () => {
            expect(canStartQuest(gsm, questWithPrereqs)).toBe(false);
        });

        it('should reject quest when player level is too low', () => {
            // Complete the prerequisite quest but keep level low (default is 1)
            gsm.mutateQuests(q => ({
                ...q,
                completedQuests: [...q.completedQuests, 'quest_prologue'],
            }));
            expect(canStartQuest(gsm, questWithPrereqs)).toBe(false);
        });

        it('should allow quest when all prerequisites are met', () => {
            gsm.mutateQuests(q => ({
                ...q,
                completedQuests: [...q.completedQuests, 'quest_prologue'],
            }));
            gsm.updatePlayer({ level: 5 });
            expect(canStartQuest(gsm, questWithPrereqs)).toBe(true);
        });

        it('should reject if quest is already active', () => {
            const quest = makeQuestDef();
            startQuest(gsm, bus, quest);
            expect(canStartQuest(gsm, quest)).toBe(false);
        });

        it('should reject if quest is already completed', () => {
            const quest = makeQuestDef();
            gsm.mutateQuests(q => ({
                ...q,
                completedQuests: [...q.completedQuests, quest.id],
            }));
            expect(canStartQuest(gsm, quest)).toBe(false);
        });
    });

    describe('startQuest()', () => {
        it('should add quest to active quests', () => {
            const quest = makeQuestDef();
            startQuest(gsm, bus, quest);
            const quests = gsm.getQuests();
            expect(quests.activeQuests[quest.id]).toBeDefined();
            expect(quests.activeQuests[quest.id].currentStageId).toBe('stage_1');
        });

        it('should initialize objective progress to 0', () => {
            const quest = makeQuestDef();
            startQuest(gsm, bus, quest);
            const instance = gsm.getQuests().activeQuests[quest.id];
            expect(instance.objectiveProgress['obj_go']).toBe(0);
        });

        it('should emit QUEST_STARTED event', () => {
            const handler = vi.fn();
            bus.on('QUEST_STARTED', handler);

            const quest = makeQuestDef();
            startQuest(gsm, bus, quest);
            expect(handler).toHaveBeenCalledOnce();
        });
    });

    describe('trackObjectiveProgress()', () => {
        it('should increment objective progress', () => {
            const quest = makeQuestDef();
            startQuest(gsm, bus, quest);

            // Manually advance to stage_2 (the kill stage)
            advanceQuestStage(gsm, bus, quest.id, quest);
            trackObjectiveProgress(gsm, bus, quest.id, 'obj_kill', 1, quest);

            const instance = gsm.getQuests().activeQuests[quest.id];
            expect(instance.objectiveProgress['obj_kill']).toBe(1);
        });

        it('should auto-advance stage when all objectives are met', () => {
            const quest = makeQuestDef();
            startQuest(gsm, bus, quest);
            advanceQuestStage(gsm, bus, quest.id, quest); // stage_1 → stage_2

            // Kill 3 spiders to complete stage_2
            trackObjectiveProgress(gsm, bus, quest.id, 'obj_kill', 3, quest);

            const instance = gsm.getQuests().activeQuests[quest.id];
            expect(instance.currentStageId).toBe('stage_3');
        });

        it('should apply onComplete effects when stage advances', () => {
            const quest = makeQuestDef();
            startQuest(gsm, bus, quest);
            advanceQuestStage(gsm, bus, quest.id, quest); // to stage_2

            const goldBefore = gsm.getPlayer().gold;
            trackObjectiveProgress(gsm, bus, quest.id, 'obj_kill', 3, quest);

            // stage_2's onComplete gives 100 gold
            expect(gsm.getPlayer().gold).toBe(goldBefore + 100);
        });
    });

    describe('completeQuest()', () => {
        it('should move quest from active to completed', () => {
            const quest = makeQuestDef();
            startQuest(gsm, bus, quest);
            completeQuest(gsm, bus, quest.id, quest);

            const quests = gsm.getQuests();
            expect(quests.activeQuests[quest.id]).toBeUndefined();
            expect(quests.completedQuests).toContain(quest.id);
        });

        it('should apply quest rewards', () => {
            const quest = makeQuestDef();
            startQuest(gsm, bus, quest);

            const goldBefore = gsm.getPlayer().gold;
            completeQuest(gsm, bus, quest.id, quest);

            // Quest rewards: 50 gold
            expect(gsm.getPlayer().gold).toBe(goldBefore + 50);
        });

        it('should emit QUEST_COMPLETED event', () => {
            const handler = vi.fn();
            bus.on('QUEST_COMPLETED', handler);

            const quest = makeQuestDef();
            startQuest(gsm, bus, quest);
            completeQuest(gsm, bus, quest.id, quest);
            expect(handler).toHaveBeenCalledOnce();
        });
    });

    describe('failQuest()', () => {
        it('should move quest from active to failed', () => {
            const quest = makeQuestDef();
            startQuest(gsm, bus, quest);
            failQuest(gsm, bus, quest.id, 'Quest giver died.');

            const quests = gsm.getQuests();
            expect(quests.activeQuests[quest.id]).toBeUndefined();
            expect(quests.failedQuests).toContain(quest.id);
        });

        it('should emit QUEST_FAILED event', () => {
            const handler = vi.fn();
            bus.on('QUEST_FAILED', handler);

            const quest = makeQuestDef();
            startQuest(gsm, bus, quest);
            failQuest(gsm, bus, quest.id, 'Failed');
            expect(handler).toHaveBeenCalledOnce();
        });
    });

    describe('World Event Hooks', () => {
        it('onLocationEntered should track go_to objectives', () => {
            const quest = makeQuestDef();
            const questDefs = new Map([[quest.id, quest]]);
            startQuest(gsm, bus, quest);

            onLocationEntered(gsm, bus, 'dark_cave', questDefs);

            // Should have auto-advanced past stage_1
            const instance = gsm.getQuests().activeQuests[quest.id];
            expect(instance.currentStageId).toBe('stage_2');
        });

        it('onEnemyKilled should track kill objectives', () => {
            const quest = makeQuestDef();
            const questDefs = new Map([[quest.id, quest]]);
            startQuest(gsm, bus, quest);
            advanceQuestStage(gsm, bus, quest.id, quest); // to stage_2

            onEnemyKilled(gsm, bus, 'frostbite_spider', questDefs);

            const instance = gsm.getQuests().activeQuests[quest.id];
            expect(instance.objectiveProgress['obj_kill']).toBe(1);
        });

        it('onItemCollected should track collect objectives', () => {
            const questDefs = new Map([[collectQuest.id, collectQuest]]);
            startQuest(gsm, bus, collectQuest);

            onItemCollected(gsm, bus, 'nightshade', questDefs);

            const instance = gsm.getQuests().activeQuests[collectQuest.id];
            expect(instance.objectiveProgress['obj_collect']).toBe(1);
        });
    });

    describe('Utilities', () => {
        it('getActiveQuestList should return active quests with defs', () => {
            const quest = makeQuestDef();
            const questDefs = new Map([[quest.id, quest]]);
            startQuest(gsm, bus, quest);

            const list = getActiveQuestList(gsm, questDefs);
            expect(list).toHaveLength(1);
            expect(list[0].def.id).toBe(quest.id);
            expect(list[0].currentStage).toBeDefined();
        });

        it('getObjectiveProgressText should format objective progress', () => {
            const quest = makeQuestDef();
            startQuest(gsm, bus, quest);
            advanceQuestStage(gsm, bus, quest.id, quest);

            const instance = gsm.getQuests().activeQuests[quest.id];
            const stageDef = quest.stages.find(s => s.id === 'stage_2')!;
            const lines = getObjectiveProgressText(instance, stageDef);

            expect(lines.length).toBeGreaterThan(0);
            expect(lines[0]).toContain('Kill');
        });
    });
});
