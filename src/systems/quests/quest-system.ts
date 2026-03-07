// ============================================================
// Schyrim — Quest System Runtime
// Tracks quest state, objective progress, stage advancement,
// and quest rewards. Decoupled from rendering.
// ============================================================

import type { GameStateManager } from '../../core/game-state.js';
import type { EventBus } from '../../core/event-bus.js';
import type {
    QuestDefinition, QuestInstance, QuestStageDefinition,
    QuestStageEffect, QuestReward,
} from '../../core/types/quest.types.js';
import { GameEventType } from '../../core/types/events.types.js';

// ============================================================
// PREREQUISITE CHECKING
// ============================================================

/**
 * Returns true if the player meets all prerequisites to start this quest.
 */
export function canStartQuest(gsm: GameStateManager, questDef: QuestDefinition): boolean {
    const quests = gsm.getQuests();

    // Cannot start if already active
    if (quests.activeQuests[questDef.id]) return false;

    // Cannot start if already completed (unless repeatable, e.g. radiant)
    if (quests.completedQuests.includes(questDef.id) && !questDef.isRepeatable) return false;

    // No prerequisites → OK
    if (!questDef.prerequisites?.length) return true;

    const player = gsm.getPlayer();

    for (const prereq of questDef.prerequisites) {
        switch (prereq.type) {
            case 'quest_completed':
                if (!quests.completedQuests.includes(prereq.target)) return false;
                break;

            case 'level':
                if (player.level < (prereq.value as number)) return false;
                break;

            case 'skill': {
                const skill = player.skills[prereq.target as keyof typeof player.skills];
                if (!skill || skill.level < (prereq.value as number)) return false;
                break;
            }

            case 'item':
                if (!player.inventory.items.some(e => e.item.id === prereq.target)) return false;
                break;

            case 'quest_stage':
            case 'reputation':
                // Advanced prerequisites — deferred to future implementation
                break;
        }
    }

    return true;
}

// ============================================================
// START QUEST
// ============================================================

/**
 * Starts a quest: creates the QuestInstance, initializes objective
 * progress counters, and emits QUEST_STARTED.
 */
export function startQuest(
    gsm: GameStateManager,
    bus: EventBus,
    questDef: QuestDefinition,
): void {
    const { id, title, stages } = questDef;
    const quests = gsm.getQuests();

    // Guard: already active, completed, or failed
    if (
        quests.activeQuests[id] ||
        quests.completedQuests.includes(id) ||
        quests.failedQuests.includes(id)
    ) return;

    const firstStage = stages[0];
    if (!firstStage) return;

    const instance: QuestInstance = {
        questId: id,
        currentStageId: firstStage.id,
        objectiveProgress: {},
        startedAt: new Date().toISOString(),
    };

    for (const obj of firstStage.objectives) {
        instance.objectiveProgress[obj.id] = 0;
    }

    gsm.mutateQuests(q => ({
        ...q,
        activeQuests: { ...q.activeQuests, [id]: instance },
    }));

    bus.emit(GameEventType.QUEST_STARTED, { questId: id, questTitle: title });
}

// ============================================================
// ADVANCE QUEST STAGE
// ============================================================

/**
 * Called when all required objectives in the current stage are met.
 * Applies onComplete effects, moves to the next stage (or completes the quest).
 */
export function advanceQuestStage(
    gsm: GameStateManager,
    bus: EventBus,
    questId: string,
    questDef: QuestDefinition,
): void {
    const quests = gsm.getQuests();
    const instance = quests.activeQuests[questId];
    if (!instance) return;

    const currentStageDef = questDef.stages.find(s => s.id === instance.currentStageId);
    if (!currentStageDef) return;

    // Apply stage completion effects (XP, gold, flags, etc.)
    if (currentStageDef.onComplete?.length) {
        applyStageEffects(gsm, currentStageDef.onComplete);
    }

    // No next stage ID = quest is complete
    if (!currentStageDef.nextStageId) {
        completeQuest(gsm, bus, questId, questDef);
        return;
    }

    const nextStageDef = questDef.stages.find(s => s.id === currentStageDef.nextStageId);
    if (!nextStageDef) {
        // Next stage doesn't exist in data — treat as completion
        completeQuest(gsm, bus, questId, questDef);
        return;
    }

    const fromStage = instance.currentStageId;

    // Initialise fresh objective progress for the new stage
    const newProgress: Record<string, number> = {};
    for (const obj of nextStageDef.objectives) {
        newProgress[obj.id] = 0;
    }

    gsm.mutateQuests(q => ({
        ...q,
        activeQuests: {
            ...q.activeQuests,
            [questId]: {
                ...instance,
                currentStageId: nextStageDef.id,
                objectiveProgress: newProgress,
            },
        },
    }));

    bus.emit(GameEventType.QUEST_STAGE_CHANGE, {
        questId,
        fromStage,
        toStage: nextStageDef.id,
    });
}

// ============================================================
// COMPLETE / FAIL QUEST
// ============================================================

/**
 * Marks a quest as complete: applies final rewards, moves it from
 * activeQuests → completedQuests, and emits QUEST_COMPLETED.
 */
export function completeQuest(
    gsm: GameStateManager,
    bus: EventBus,
    questId: string,
    questDef: QuestDefinition,
): void {
    const quests = gsm.getQuests();
    if (!quests.activeQuests[questId]) return;

    applyQuestRewards(gsm, questDef.rewards);

    gsm.mutateQuests(q => {
        const { [questId]: _removed, ...remaining } = q.activeQuests;
        return {
            ...q,
            activeQuests: remaining,
            completedQuests: [...q.completedQuests, questId],
        };
    });

    bus.emit(GameEventType.QUEST_COMPLETED, { questId, questTitle: questDef.title });
}

/**
 * Marks a quest as failed: moves it from activeQuests → failedQuests,
 * applies any onFail stage effects, and emits QUEST_FAILED.
 */
export function failQuest(
    gsm: GameStateManager,
    bus: EventBus,
    questId: string,
    reason: string,
    questDef?: QuestDefinition,
): void {
    const quests = gsm.getQuests();
    if (!quests.activeQuests[questId]) return;

    // Apply fail effects for current stage if present
    if (questDef) {
        const instance = quests.activeQuests[questId];
        const stageDef = questDef.stages.find(s => s.id === instance?.currentStageId);
        if (stageDef?.onFail?.length) {
            applyStageEffects(gsm, stageDef.onFail);
        }
    }

    gsm.mutateQuests(q => {
        const { [questId]: _removed, ...remaining } = q.activeQuests;
        return {
            ...q,
            activeQuests: remaining,
            failedQuests: [...q.failedQuests, questId],
        };
    });

    bus.emit(GameEventType.QUEST_FAILED, { questId, reason });
}

// ============================================================
// OBJECTIVE TRACKING
// ============================================================

/**
 * Increments objective progress by `delta`. If all required objectives
 * in the current stage are satisfied, automatically advances the stage.
 */
export function trackObjectiveProgress(
    gsm: GameStateManager,
    bus: EventBus,
    questId: string,
    objectiveId: string,
    delta: number,
    questDef: QuestDefinition,
): void {
    const quests = gsm.getQuests();
    const instance = quests.activeQuests[questId];
    if (!instance) return;

    const stageDef = questDef.stages.find(s => s.id === instance.currentStageId);
    if (!stageDef) return;

    const objectiveDef = stageDef.objectives.find(o => o.id === objectiveId);
    if (!objectiveDef) return;

    const required = objectiveDef.count ?? 1;
    const oldProgress = instance.objectiveProgress[objectiveId] ?? 0;
    if (oldProgress >= required) return; // already complete, skip

    const newProgress = Math.min(oldProgress + delta, required);

    gsm.mutateQuests(q => {
        const inst = q.activeQuests[questId];
        if (!inst) return q;
        return {
            ...q,
            activeQuests: {
                ...q.activeQuests,
                [questId]: {
                    ...inst,
                    objectiveProgress: {
                        ...inst.objectiveProgress,
                        [objectiveId]: newProgress,
                    },
                },
            },
        };
    });

    bus.emit(GameEventType.QUEST_OBJECTIVE_UPDATE, {
        questId,
        objectiveId,
        progress: newProgress,
        total: required,
    });

    // Check whether ALL required objectives in this stage are now satisfied
    const refreshed = gsm.getQuests().activeQuests[questId];
    if (!refreshed) return;

    const allDone = stageDef.objectives
        .filter(o => !o.optional)
        .every(o => (refreshed.objectiveProgress[o.id] ?? 0) >= (o.count ?? 1));

    if (allDone) {
        advanceQuestStage(gsm, bus, questId, questDef);
    }
}

// ============================================================
// WORLD EVENT HOOKS
// These are called by the game loop at appropriate moments.
// Each scans all active quests for matching objectives.
// ============================================================

/** Call when the player enters a location (travel, random encounter). */
export function onLocationEntered(
    gsm: GameStateManager,
    bus: EventBus,
    locationId: string,
    questDefs: Map<string, QuestDefinition>,
): void {
    const questState = gsm.getQuests();
    for (const [questId, instance] of Object.entries(questState.activeQuests)) {
        const questDef = questDefs.get(questId);
        if (!questDef) continue;
        const stageDef = questDef.stages.find(s => s.id === instance.currentStageId);
        if (!stageDef) continue;
        for (const obj of stageDef.objectives) {
            if (obj.type === 'go_to' && obj.target === locationId) {
                trackObjectiveProgress(gsm, bus, questId, obj.id, 1, questDef);
            }
        }
    }
}

/** Call when an enemy is killed (pass the base enemy type ID, not the numbered variant). */
export function onEnemyKilled(
    gsm: GameStateManager,
    bus: EventBus,
    enemyTypeId: string,
    questDefs: Map<string, QuestDefinition>,
): void {
    const questState = gsm.getQuests();
    for (const [questId, instance] of Object.entries(questState.activeQuests)) {
        const questDef = questDefs.get(questId);
        if (!questDef) continue;
        const stageDef = questDef.stages.find(s => s.id === instance.currentStageId);
        if (!stageDef) continue;
        for (const obj of stageDef.objectives) {
            if (obj.type === 'kill' && obj.target === enemyTypeId) {
                trackObjectiveProgress(gsm, bus, questId, obj.id, 1, questDef);
            }
        }
    }
}

/** Call when an item is added to the player's inventory. */
export function onItemCollected(
    gsm: GameStateManager,
    bus: EventBus,
    itemId: string,
    questDefs: Map<string, QuestDefinition>,
): void {
    const questState = gsm.getQuests();
    for (const [questId, instance] of Object.entries(questState.activeQuests)) {
        const questDef = questDefs.get(questId);
        if (!questDef) continue;
        const stageDef = questDef.stages.find(s => s.id === instance.currentStageId);
        if (!stageDef) continue;
        for (const obj of stageDef.objectives) {
            if (obj.type === 'collect' && obj.target === itemId) {
                trackObjectiveProgress(gsm, bus, questId, obj.id, 1, questDef);
            }
        }
    }
}

/** Call when the player speaks with an NPC. */
export function onNpcTalkedTo(
    gsm: GameStateManager,
    bus: EventBus,
    npcId: string,
    questDefs: Map<string, QuestDefinition>,
): void {
    const questState = gsm.getQuests();
    for (const [questId, instance] of Object.entries(questState.activeQuests)) {
        const questDef = questDefs.get(questId);
        if (!questDef) continue;
        const stageDef = questDef.stages.find(s => s.id === instance.currentStageId);
        if (!stageDef) continue;
        for (const obj of stageDef.objectives) {
            if (obj.type === 'talk_to' && obj.target === npcId) {
                trackObjectiveProgress(gsm, bus, questId, obj.id, 1, questDef);
            }
        }
    }
}

// ============================================================
// EFFECT APPLICATION (private helpers)
// ============================================================

function applyStageEffects(gsm: GameStateManager, effects: QuestStageEffect[]): void {
    for (const effect of effects) {
        switch (effect.type) {
            case 'give_xp':
                gsm.mutatePlayer(p => ({ ...p, experience: p.experience + effect.amount }));
                break;
            case 'give_gold':
                gsm.mutatePlayer(p => ({ ...p, gold: p.gold + effect.amount }));
                break;
            case 'set_flag':
                gsm.mutateQuests(q => ({
                    ...q,
                    flags: { ...q.flags, [effect.flagId]: effect.value },
                }));
                break;
            case 'unlock_location':
                gsm.mutatePlayer(p => ({
                    ...p,
                    discoveredLocations: p.discoveredLocations.includes(effect.locationId)
                        ? p.discoveredLocations
                        : [...p.discoveredLocations, effect.locationId],
                }));
                break;
            case 'give_item':
            case 'start_quest':
            case 'change_reputation':
            case 'spawn_enemy':
            case 'change_npc_state':
                // Reserved for future implementation
                break;
        }
    }
}

function applyQuestRewards(gsm: GameStateManager, rewards: QuestReward[]): void {
    for (const reward of rewards) {
        switch (reward.type) {
            case 'gold':
                gsm.mutatePlayer(p => ({ ...p, gold: p.gold + reward.amount }));
                break;
            case 'xp':
                gsm.mutatePlayer(p => ({ ...p, experience: p.experience + reward.amount }));
                break;
            case 'perk_point':
                gsm.mutatePlayer(p => ({ ...p, perkPoints: p.perkPoints + reward.amount }));
                break;
            case 'item':
            case 'reputation':
            case 'spell':
                // Reserved for future implementation
                break;
        }
    }
}

// ============================================================
// UTILITIES (for rendering)
// ============================================================

export interface QuestDisplayEntry {
    instance: QuestInstance;
    def: QuestDefinition;
    currentStage: QuestStageDefinition | undefined;
}

/** Returns all active quests with their definitions and current stage for display. */
export function getActiveQuestList(
    gsm: GameStateManager,
    questDefs: Map<string, QuestDefinition>,
): QuestDisplayEntry[] {
    const questState = gsm.getQuests();
    return Object.entries(questState.activeQuests)
        .map(([questId, instance]) => {
            const def = questDefs.get(questId);
            if (!def) return null;
            const currentStage = def.stages.find(s => s.id === instance.currentStageId);
            return { instance, def, currentStage };
        })
        .filter((x): x is QuestDisplayEntry => x !== null);
}

/** Returns formatted objective progress lines for display in the quest journal. */
export function getObjectiveProgressText(
    instance: QuestInstance,
    stageDef: QuestStageDefinition,
): string[] {
    return stageDef.objectives.map(obj => {
        const progress = instance.objectiveProgress[obj.id] ?? 0;
        const required = obj.count ?? 1;
        const done = progress >= required;
        const icon = done ? '✓' : '○';
        const countStr = required > 1 ? ` (${progress}/${required})` : '';
        const optStr = obj.optional ? ' [optional]' : '';
        return `${icon} ${obj.text}${countStr}${optStr}`;
    });
}
