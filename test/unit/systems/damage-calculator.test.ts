// ============================================================
// Schyrim Tests — Damage Calculator
// ============================================================

import { describe, it, expect } from 'vitest';
import { calculateDamage, formatDamageSuccinct, formatDamageDetailed } from '../../../src/systems/combat/damage-calculator.js';
import type { CombatParticipant } from '../../../src/core/types/combat.types.js';
import type { WeaponItem } from '../../../src/core/types/items.types.js';

function makeParticipant(overrides?: Partial<CombatParticipant>): CombatParticipant {
    return {
        entityId: 'test',
        name: 'Test',
        isPlayer: true,
        health: 100,
        healthMax: 100,
        stamina: 100,
        staminaMax: 100,
        magicka: 100,
        magickaMax: 100,
        armorRating: 0,
        resistances: { physical: 0, fire: 0, frost: 0, shock: 0, poison: 0, magic: 0 },
        skills: {},
        activeStatusEffects: [],
        detectionLevel: 'combat',
        initiative: 0,
        isAlive: true,
        ...overrides,
    };
}

function makeWeapon(overrides?: Partial<WeaponItem>): WeaponItem {
    return {
        id: 'test_sword',
        name: 'Test Sword',
        description: 'A test weapon',
        type: 'weapon',
        weight: 10,
        baseValue: 50,
        rarity: 'common',
        tags: [],
        damage: 10,
        damageType: 'physical',
        speed: 'normal',
        weaponClass: 'one_handed_sword',
        ...overrides,
    };
}

describe('DamageCalculator', () => {
    describe('calculateDamage()', () => {
        it('should calculate basic physical damage', () => {
            const attacker = makeParticipant({ skills: { one_handed: 20 } });
            const defender = makeParticipant({ armorRating: 0 });
            const weapon = makeWeapon({ damage: 10 });

            const result = calculateDamage({ attacker, defender, weapon });

            // Damage should be > 0
            expect(result.finalDamage).toBeGreaterThan(0);
            expect(result.damageType).toBe('physical');
        });

        it('should apply skill modifiers', () => {
            const lowSkill = makeParticipant({ skills: { one_handed: 0 } });
            const highSkill = makeParticipant({ skills: { one_handed: 80 } });
            const defender = makeParticipant();
            const weapon = makeWeapon();

            const lowResult = calculateDamage({ attacker: lowSkill, defender, weapon });
            const highResult = calculateDamage({ attacker: highSkill, defender, weapon });

            // Higher skill should deal more damage (ignoring crits via large sample)
            // Since crits are random, compare raw damage
            expect(highResult.rawDamage).toBeGreaterThan(lowResult.rawDamage);
        });

        it('should reduce physical damage with armor', () => {
            const attacker = makeParticipant({ skills: { one_handed: 20 } });
            const noArmor = makeParticipant({ armorRating: 0 });
            const heavyArmor = makeParticipant({ armorRating: 50 });
            const weapon = makeWeapon();

            const noArmorResult = calculateDamage({ attacker, defender: noArmor, weapon });
            const armorResult = calculateDamage({ attacker, defender: heavyArmor, weapon });

            expect(armorResult.armorReduction).toBeGreaterThan(noArmorResult.armorReduction);
        });

        it('should not reduce elemental damage with physical armor', () => {
            const attacker = makeParticipant({ skills: { destruction: 20 } });
            const defender = makeParticipant({ armorRating: 50 });
            const fireStaff = makeWeapon({ damage: 10, damageType: 'fire', weaponClass: 'staff' });

            const result = calculateDamage({ attacker, defender, weapon: fireStaff });

            expect(result.armorReduction).toBe(0);
        });

        it('should apply elemental resistance', () => {
            const attacker = makeParticipant({ skills: { destruction: 20 } });
            const defender = makeParticipant({
                armorRating: 0,
                resistances: { physical: 0, fire: 0.5, frost: 0, shock: 0, poison: 0, magic: 0 },
            });
            const fireWeapon = makeWeapon({ damage: 10, damageType: 'fire', weaponClass: 'staff' });

            const result = calculateDamage({ attacker, defender, weapon: fireWeapon });

            expect(result.resistanceModifier).toBe(0.5);
        });

        it('should cap resistance at 85%', () => {
            const attacker = makeParticipant();
            const defender = makeParticipant({
                resistances: { physical: 0, fire: 0.99, frost: 0, shock: 0, poison: 0, magic: 0 },
            });
            const weapon = makeWeapon({ damageType: 'fire', weaponClass: 'staff' });

            const result = calculateDamage({ attacker, defender, weapon });

            expect(result.resistanceModifier).toBeGreaterThanOrEqual(0.15);
        });

        it('should apply sneak attack multiplier', () => {
            const attacker = makeParticipant({ skills: { one_handed: 20 } });
            const defender = makeParticipant();
            const weapon = makeWeapon();

            const normal = calculateDamage({ attacker, defender, weapon });
            const sneak = calculateDamage({ attacker, defender, weapon, isSneakAttack: true });

            expect(sneak.sneakAttack).toBe(true);
            expect(sneak.sneakMultiplier).toBe(2.0);
            expect(sneak.rawDamage).toBeGreaterThan(normal.rawDamage);
        });

        it('should deal minimum 1 damage', () => {
            const attacker = makeParticipant({ skills: {} });
            const defender = makeParticipant({ armorRating: 999 });
            const weapon = makeWeapon({ damage: 1 });

            const result = calculateDamage({ attacker, defender, weapon });

            expect(result.finalDamage).toBeGreaterThanOrEqual(1);
        });

        it('should apply speed factor', () => {
            const attacker = makeParticipant({ skills: { one_handed: 20 } });
            const defender = makeParticipant();

            const fastWeapon = makeWeapon({ speed: 'fast', damage: 10 });
            const slowWeapon = makeWeapon({ speed: 'slow', damage: 10 });

            const fastResult = calculateDamage({ attacker, defender, weapon: fastWeapon });
            const slowResult = calculateDamage({ attacker, defender, weapon: slowWeapon });

            // Slow weapons do more damage per hit
            expect(slowResult.rawDamage).toBeGreaterThan(fastResult.rawDamage);
        });

        it('should handle unarmed combat', () => {
            const attacker = makeParticipant();
            const defender = makeParticipant();

            const result = calculateDamage({ attacker, defender, weapon: undefined });

            expect(result.finalDamage).toBeGreaterThan(0);
        });
    });

    describe('formatDamageSuccinct()', () => {
        it('should format basic damage', () => {
            const result = calculateDamage({
                attacker: makeParticipant({ skills: { one_handed: 20 } }),
                defender: makeParticipant(),
                weapon: makeWeapon(),
            });

            const formatted = formatDamageSuccinct('Player', 'Bandit', result);
            expect(formatted).toContain('Player hits Bandit');
            expect(formatted).toContain('damage');
        });

        it('should show fire damage type', () => {
            const result = calculateDamage({
                attacker: makeParticipant(),
                defender: makeParticipant(),
                weapon: makeWeapon({ damageType: 'fire', weaponClass: 'staff' }),
            });

            const formatted = formatDamageSuccinct('Mage', 'Draugr', result);
            expect(formatted).toContain('[fire]');
        });
    });

    describe('formatDamageDetailed()', () => {
        it('should show breakdown', () => {
            const result = calculateDamage({
                attacker: makeParticipant({ skills: { one_handed: 20 } }),
                defender: makeParticipant({ armorRating: 20 }),
                weapon: makeWeapon(),
            });

            const formatted = formatDamageDetailed(result);
            expect(formatted).toContain('Raw');
            expect(formatted).toContain('Armor');
            expect(formatted).toContain('Final');
        });
    });
});
