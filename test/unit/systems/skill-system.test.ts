// ============================================================
// Schyrim Tests — Skill System
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    xpToNextLevel,
    calculateCharacterLevel,
    initializeSkills,
    applyRacialBonuses,
    grantSkillXP,
} from '../../../src/systems/progression/skill-system.js';
import { EventBus } from '../../../src/core/event-bus.js';
import { GameEventType } from '../../../src/core/types/events.types.js';
import type { PlayerState } from '../../../src/core/types/character.types.js';

function makePlayer(overrides?: Partial<PlayerState>): PlayerState {
    return {
        name: 'Test',
        race: 'nord',
        level: 1,
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
        gold: 0,
        currentLocationId: '',
        discoveredLocations: [],
        activePowerCooldowns: {},
        ...overrides,
    };
}

describe('SkillSystem', () => {
    describe('xpToNextLevel()', () => {
        it('should increase with level', () => {
            const xp10 = xpToNextLevel(10);
            const xp50 = xpToNextLevel(50);
            const xp90 = xpToNextLevel(90);

            expect(xp50).toBeGreaterThan(xp10);
            expect(xp90).toBeGreaterThan(xp50);
        });

        it('should return reasonable values at low levels', () => {
            const xp = xpToNextLevel(15);
            expect(xp).toBeGreaterThan(50);
            expect(xp).toBeLessThan(500);
        });
    });

    describe('initializeSkills()', () => {
        it('should create all 18 skills at level 15', () => {
            const skills = initializeSkills();
            const entries = Object.entries(skills);

            expect(entries).toHaveLength(18);
            for (const [, skill] of entries) {
                expect(skill.level).toBe(15);
                expect(skill.xp).toBe(0);
                expect(skill.xpToNextLevel).toBeGreaterThan(0);
            }
        });
    });

    describe('applyRacialBonuses()', () => {
        it('should increase skill levels with bonuses', () => {
            const skills = initializeSkills();
            const bonused = applyRacialBonuses(skills, { two_handed: 10, speech: 5 });

            expect(bonused.two_handed.level).toBe(25);
            expect(bonused.speech.level).toBe(20);
            expect(bonused.one_handed.level).toBe(15); // unchanged
        });
    });

    describe('calculateCharacterLevel()', () => {
        it('should be level 1 with default skills', () => {
            const skills = initializeSkills();
            expect(calculateCharacterLevel(skills)).toBe(1);
        });

        it('should increase with total skill levels gained', () => {
            const skills = initializeSkills();
            // Increase one_handed by 10 levels
            skills.one_handed = { ...skills.one_handed, level: 25 };
            expect(calculateCharacterLevel(skills)).toBe(2);
        });
    });

    describe('grantSkillXP()', () => {
        let eventBus: EventBus;

        beforeEach(() => {
            eventBus = new EventBus();
        });

        it('should increase skill XP', () => {
            const player = makePlayer();
            const result = grantSkillXP(player, 'one_handed', 5, 'melee_hit', eventBus);

            expect(result.player.skills.one_handed.xp).toBe(5);
            expect(result.leveledUp).toBe(false);
        });

        it('should level up when XP threshold is reached', () => {
            const player = makePlayer();
            const xpNeeded = player.skills.one_handed.xpToNextLevel;

            const result = grantSkillXP(player, 'one_handed', xpNeeded, 'training', eventBus);

            expect(result.leveledUp).toBe(true);
            expect(result.newLevel).toBe(16);
        });

        it('should emit SKILL_XP_GAINED event', () => {
            const handler = vi.fn();
            eventBus.on(GameEventType.SKILL_XP_GAINED, handler);

            const player = makePlayer();
            grantSkillXP(player, 'archery', 10, 'arrow_hit', eventBus);

            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({ skill: 'archery', xpGained: 10, source: 'arrow_hit' })
            );
        });

        it('should emit SKILL_LEVEL_UP event on level up', () => {
            const handler = vi.fn();
            eventBus.on(GameEventType.SKILL_LEVEL_UP, handler);

            const player = makePlayer();
            const xpNeeded = player.skills.destruction.xpToNextLevel;
            grantSkillXP(player, 'destruction', xpNeeded, 'cast', eventBus);

            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({ skill: 'destruction', newLevel: 16 })
            );
        });

        it('should cap skills at level 100', () => {
            const player = makePlayer();
            // Set skill to 99
            player.skills.one_handed = { level: 99, xp: 0, xpToNextLevel: xpToNextLevel(99) };

            const result = grantSkillXP(player, 'one_handed', 99999, 'test', eventBus);

            expect(result.newLevel).toBe(100);
            expect(result.player.skills.one_handed.xp).toBe(0);
        });
    });
});
