// ============================================================
// Schyrim Systems — Skill System (Level by Use)
// Skills gain XP from actions, auto-level, and feed character level
// ============================================================

import type { SkillId, SkillState, PlayerState } from '../../core/types/character.types.js';
import { EventBus } from '../../core/event-bus.js';
import { GameEventType } from '../../core/types/events.types.js';

/** Default starting state for all skills */
const DEFAULT_SKILL_LEVEL = 15;
const DEFAULT_SKILL_XP = 0;

/** XP required to level up a skill — scales quadratically */
export function xpToNextLevel(currentLevel: number): number {
    return Math.floor(25 + (currentLevel * currentLevel * 0.5) + (currentLevel * 5));
}

/** Total skill level sum that triggers the next character level */
export function skillSumForLevel(characterLevel: number): number {
    return 0 + (characterLevel - 1) * 10; // each char level needs 10 more total skill levels
}

/** Calculate character level from total skill levels */
export function calculateCharacterLevel(skills: Record<SkillId, SkillState>): number {
    const totalLevels = Object.values(skills).reduce((sum, s) => sum + s.level, 0);
    const baseTotal = Object.keys(skills).length * DEFAULT_SKILL_LEVEL; // starting total
    const gained = totalLevels - baseTotal;
    return Math.max(1, Math.floor(gained / 10) + 1);
}

/** Initialize all skills with default values */
export function initializeSkills(): Record<SkillId, SkillState> {
    const allSkills: SkillId[] = [
        'one_handed', 'two_handed', 'archery', 'block', 'heavy_armor', 'light_armor',
        'destruction', 'restoration', 'conjuration', 'alteration', 'illusion', 'enchanting',
        'sneak', 'lockpicking', 'pickpocket', 'speech', 'alchemy',
        'smithing',
    ];

    const skills: Partial<Record<SkillId, SkillState>> = {};
    for (const skill of allSkills) {
        skills[skill] = {
            level: DEFAULT_SKILL_LEVEL,
            xp: DEFAULT_SKILL_XP,
            xpToNextLevel: xpToNextLevel(DEFAULT_SKILL_LEVEL),
        };
    }
    return skills as Record<SkillId, SkillState>;
}

/** Apply racial skill bonuses to initialized skills */
export function applyRacialBonuses(
    skills: Record<SkillId, SkillState>,
    bonuses: Partial<Record<SkillId, number>>
): Record<SkillId, SkillState> {
    const result = { ...skills };
    for (const [skillId, bonus] of Object.entries(bonuses)) {
        const skill = result[skillId as SkillId];
        if (skill && bonus) {
            result[skillId as SkillId] = {
                ...skill,
                level: skill.level + bonus,
                xpToNextLevel: xpToNextLevel(skill.level + bonus),
            };
        }
    }
    return result;
}

/**
 * Grant skill XP from an action.
 * Returns updated player state and any level-up info.
 */
export function grantSkillXP(
    player: PlayerState,
    skill: SkillId,
    xpAmount: number,
    source: string,
    eventBus?: EventBus
): { player: PlayerState; leveledUp: boolean; newLevel: number; characterLevelUp: boolean } {
    const current = player.skills[skill];
    if (!current) {
        return { player, leveledUp: false, newLevel: 0, characterLevelUp: false };
    }

    let newXp = current.xp + xpAmount;
    let newLevel = current.level;
    let leveledUp = false;

    // Check for level-up (potentially multiple levels from large XP gains)
    while (newXp >= current.xpToNextLevel && newLevel < 100) {
        newXp -= xpToNextLevel(newLevel);
        newLevel++;
        leveledUp = true;
    }

    // Cap at level 100
    if (newLevel >= 100) {
        newLevel = 100;
        newXp = 0;
    }

    const updatedSkill: SkillState = {
        level: newLevel,
        xp: newXp,
        xpToNextLevel: xpToNextLevel(newLevel),
    };

    const updatedSkills = { ...player.skills, [skill]: updatedSkill };

    // Check for character level up
    const oldCharLevel = player.level;
    const newCharLevel = calculateCharacterLevel(updatedSkills);
    const characterLevelUp = newCharLevel > oldCharLevel;

    const updatedPlayer: PlayerState = {
        ...player,
        skills: updatedSkills,
        level: newCharLevel,
        perkPoints: characterLevelUp ? player.perkPoints + 1 : player.perkPoints,
    };

    // Emit events
    if (eventBus) {
        eventBus.emit(GameEventType.SKILL_XP_GAINED, {
            skill,
            xpGained: xpAmount,
            totalXp: newXp,
            source,
        });

        if (leveledUp) {
            eventBus.emit(GameEventType.SKILL_LEVEL_UP, {
                skill,
                newLevel,
            });
        }

        if (characterLevelUp) {
            eventBus.emit(GameEventType.CHARACTER_LEVEL_UP, {
                newLevel: newCharLevel,
            });
        }
    }

    return { player: updatedPlayer, leveledUp, newLevel, characterLevelUp };
}

/** XP reward amounts for common actions */
export const SKILL_XP_REWARDS: Record<string, { skill: SkillId; xp: number }> = {
    melee_hit: { skill: 'one_handed', xp: 5 },
    twohanded_hit: { skill: 'two_handed', xp: 6 },
    arrow_hit: { skill: 'archery', xp: 5 },
    successful_block: { skill: 'block', xp: 4 },
    cast_destruction: { skill: 'destruction', xp: 6 },
    cast_restoration: { skill: 'restoration', xp: 5 },
    cast_alteration: { skill: 'alteration', xp: 5 },
    cast_conjuration: { skill: 'conjuration', xp: 6 },
    cast_illusion: { skill: 'illusion', xp: 5 },
    sneak_past: { skill: 'sneak', xp: 4 },
    sneak_attack: { skill: 'sneak', xp: 8 },
    pick_lock: { skill: 'lockpicking', xp: 10 },
    pickpocket_success: { skill: 'pickpocket', xp: 10 },
    successful_persuade: { skill: 'speech', xp: 8 },
    successful_intimidate: { skill: 'speech', xp: 6 },
    successful_barter: { skill: 'speech', xp: 3 },
    craft_item: { skill: 'smithing', xp: 12 },
    brew_potion: { skill: 'alchemy', xp: 10 },
    enchant_item: { skill: 'enchanting', xp: 12 },
    take_damage_heavy_armor: { skill: 'heavy_armor', xp: 3 },
    take_damage_light_armor: { skill: 'light_armor', xp: 3 },
};
