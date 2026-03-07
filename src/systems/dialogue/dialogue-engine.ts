// ============================================================
// Schyrim Systems — Dialogue Engine
// Branching dialogue with conditions and effects
// ============================================================

import type {
    DialogueTree,
    DialogueNode,
    DialogueOption,
    DialogueCondition,
    DialogueEffect,
} from '../../core/types/dialogue.types.js';
import type { PlayerState } from '../../core/types/character.types.js';
import type { QuestState } from '../../core/types/quest.types.js';
import type { FactionState } from '../../core/types/faction.types.js';
import { EventBus } from '../../core/event-bus.js';
import { GameEventType } from '../../core/types/events.types.js';

export interface DialogueContext {
    player: PlayerState;
    quests: QuestState;
    factions: FactionState;
    flags: Record<string, boolean>;
}

export interface DialogueSession {
    tree: DialogueTree;
    currentNodeId: string;
    history: string[]; // visited node IDs
    isActive: boolean;
}

/**
 * Start a dialogue session with an NPC.
 */
export function startDialogue(
    tree: DialogueTree,
    eventBus?: EventBus
): DialogueSession {
    if (eventBus) {
        eventBus.emit(GameEventType.DIALOGUE_STARTED, {
            npcId: tree.speakerId,
            npcName: tree.speakerName,
            dialogueTreeId: tree.id,
        });
    }

    return {
        tree,
        currentNodeId: tree.startNodeId,
        history: [tree.startNodeId],
        isActive: true,
    };
}

/**
 * Get the current dialogue node.
 */
export function getCurrentNode(session: DialogueSession): DialogueNode | undefined {
    return session.tree.nodes[session.currentNodeId];
}

/**
 * Get available options for the current node, filtered by conditions.
 */
export function getAvailableOptions(
    session: DialogueSession,
    context: DialogueContext
): Array<{ option: DialogueOption; meetsConditions: boolean; skillCheckChance?: number }> {
    const node = getCurrentNode(session);
    if (!node) return [];

    return node.options.map(option => {
        const meetsConditions = option.conditions
            ? option.conditions.every(c => evaluateCondition(c, context))
            : true;

        // Calculate skill check success probability if applicable
        let skillCheckChance: number | undefined;
        if (option.skillCheckDifficulty !== undefined && option.conditions) {
            const skillCheck = option.conditions.find(c => c.type === 'skill_check');
            if (skillCheck && skillCheck.type === 'skill_check') {
                const playerSkillLevel = context.player.skills[skillCheck.skill]?.level ?? 0;
                skillCheckChance = Math.min(1.0, Math.max(0.1, playerSkillLevel / (option.skillCheckDifficulty * 2)));
            }
        }

        // Filter hidden options that don't meet conditions
        if (option.hidden && !meetsConditions) {
            return null;
        }

        return { option, meetsConditions, skillCheckChance };
    }).filter((o): o is NonNullable<typeof o> => o !== null);
}

/**
 * Select a dialogue option and advance to the next node.
 */
export function selectOption(
    session: DialogueSession,
    optionId: string,
    context: DialogueContext,
    eventBus?: EventBus
): { session: DialogueSession; effects: DialogueEffect[]; passed?: boolean } {
    const node = getCurrentNode(session);
    if (!node) return { session: { ...session, isActive: false }, effects: [] };

    const option = node.options.find(o => o.id === optionId);
    if (!option) return { session, effects: [] };

    // Handle skill checks
    let passed: boolean | undefined;
    if (option.skillCheckDifficulty !== undefined) {
        const skillCheck = option.conditions?.find(c => c.type === 'skill_check');
        if (skillCheck && skillCheck.type === 'skill_check') {
            const skill = context.player.skills[skillCheck.skill]?.level ?? 0;
            const chance = Math.min(1.0, Math.max(0.1, skill / (option.skillCheckDifficulty * 2)));
            passed = Math.random() < chance;

            if (!passed) {
                // Failed skill check — stay on current node or go to fail node
                return {
                    session,
                    effects: [],
                    passed: false,
                };
            }
        }
    }

    // Emit choice event
    if (eventBus) {
        eventBus.emit(GameEventType.DIALOGUE_CHOICE_MADE, {
            npcId: session.tree.speakerId,
            optionId: option.id,
            optionText: option.text,
        });
    }

    // Collect effects from both the option and the target node
    const effects: DialogueEffect[] = [...(option.effects ?? [])];

    // Navigate to next node
    if (option.nextNodeId) {
        const nextNode = session.tree.nodes[option.nextNodeId];
        if (nextNode?.effects) {
            effects.push(...nextNode.effects);
        }

        const updatedSession: DialogueSession = {
            ...session,
            currentNodeId: option.nextNodeId,
            history: [...session.history, option.nextNodeId],
            isActive: !nextNode?.isTerminal,
        };

        return { session: updatedSession, effects, passed };
    } else {
        // End dialogue
        if (eventBus) {
            eventBus.emit(GameEventType.DIALOGUE_ENDED, { npcId: session.tree.speakerId });
        }

        return {
            session: { ...session, isActive: false },
            effects,
            passed,
        };
    }
}

/**
 * Evaluate a single dialogue condition against the current game context.
 */
export function evaluateCondition(condition: DialogueCondition, context: DialogueContext): boolean {
    switch (condition.type) {
        case 'skill_check': {
            const skillLevel = context.player.skills[condition.skill]?.level ?? 0;
            return skillLevel >= condition.minLevel;
        }

        case 'perk_required':
            return context.player.perks.includes(condition.perkId);

        case 'race_required':
            return context.player.race === condition.race;

        case 'guild_membership': {
            const rep = context.factions.reputations[condition.factionId] ?? 0;
            return rep > 0; // any positive reputation = member
        }

        case 'reputation_threshold': {
            const rep = context.factions.reputations[condition.factionId] ?? 0;
            return rep >= condition.minReputation;
        }

        case 'quest_stage': {
            const quest = context.quests.activeQuests[condition.questId];
            if (!quest) {
                if (condition.comparison === 'before') return true;
                return context.quests.completedQuests.includes(condition.questId) && condition.comparison === 'past';
            }
            switch (condition.comparison) {
                case 'at': return quest.currentStageId === condition.stageId;
                case 'past': return quest.currentStageId !== condition.stageId; // simplified
                case 'before': return false; // quest is active, not before
                default: return false;
            }
        }

        case 'item_possessed': {
            const entry = context.player.inventory.items.find(e => e.item.id === condition.itemId);
            if (!entry) return false;
            return entry.quantity >= (condition.quantity ?? 1);
        }

        case 'stat_check': {
            switch (condition.stat) {
                case 'health': return context.player.attributes.health >= condition.minValue;
                case 'stamina': return context.player.attributes.stamina >= condition.minValue;
                case 'magicka': return context.player.attributes.magicka >= condition.minValue;
                case 'gold': return context.player.gold >= condition.minValue;
                case 'level': return context.player.level >= condition.minValue;
                default: return false;
            }
        }

        case 'flag_set':
            return (context.flags[condition.flagId] ?? false) === condition.value;

        default:
            return false;
    }
}

/**
 * Format a dialogue node for CLI display.
 */
export function formatDialogueNode(
    session: DialogueSession,
    availableOptions: ReturnType<typeof getAvailableOptions>
): string {
    const node = getCurrentNode(session);
    if (!node) return '[Dialogue ended]';

    const lines: string[] = [];
    lines.push(`${session.tree.speakerName}: "${node.text}"`);
    lines.push('');

    for (let i = 0; i < availableOptions.length; i++) {
        const { option, meetsConditions, skillCheckChance } = availableOptions[i];

        if (meetsConditions) {
            let choiceText = `  [${i + 1}] ${option.text}`;
            if (skillCheckChance !== undefined) {
                const pct = Math.round(skillCheckChance * 100);
                choiceText += ` (${pct}% chance)`;
            }
            lines.push(choiceText);
        } else {
            lines.push(`  [${i + 1}] [Locked] ${option.text}`);
        }
    }

    lines.push(`  [${availableOptions.length + 1}] [Leave]`);

    return lines.join('\n');
}
