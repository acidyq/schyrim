// ============================================================
// Schyrim Systems — Combat System
// Turn-based combat with structured rounds
// ============================================================

import type {
    CombatSession,
    CombatParticipant,
    CombatAction,
    CombatLogEntry,
    DamageResult,
    StatusEffect,
} from '../../core/types/combat.types.js';
import type { WeaponItem } from '../../core/types/items.types.js';
import type { PlayerState } from '../../core/types/character.types.js';
import type { EnemyDefinition } from '../../core/types/combat.types.js';
import { calculateDamage, formatDamageSuccinct, rollDice } from './damage-calculator.js';
import { EventBus } from '../../core/event-bus.js';
import { GameEventType } from '../../core/types/events.types.js';

let sessionCounter = 0;

/**
 * Create a new combat session from an array of participants.
 */
export function createCombatSession(
    playerParticipant: CombatParticipant,
    enemyParticipants: CombatParticipant[],
    eventBus?: EventBus
): CombatSession {
    sessionCounter++;
    const participants = [playerParticipant, ...enemyParticipants];

    // Roll initiative for all participants
    for (const p of participants) {
        p.initiative = rollInitiative(p);
    }

    // Sort by initiative (highest first)
    participants.sort((a, b) => b.initiative - a.initiative);

    const session: CombatSession = {
        id: `combat_${sessionCounter}`,
        round: 1,
        phase: 'player_action',
        participants,
        log: [],
        isOver: false,
    };

    if (eventBus) {
        eventBus.emit(GameEventType.COMBAT_START, {
            participantIds: participants.map(p => p.entityId),
            locationId: '',
        });
    }

    return session;
}

/**
 * Create a CombatParticipant from a PlayerState.
 */
export function playerToParticipant(player: PlayerState): CombatParticipant {
    // Calculate armor rating from equipment
    let armorRating = 0;
    for (const item of Object.values(player.equipment)) {
        if (item && item.type === 'armor') {
            armorRating += item.armorRating;
        }
    }

    // Convert SkillState objects to just their level numbers for combat
    const skillLevels = Object.entries(player.skills).reduce((acc, [id, state]) => {
        acc[id] = state.level;
        return acc;
    }, {} as Record<string, number>);

    return {
        entityId: 'player',
        name: player.name || 'Dragonborn',
        isPlayer: true,
        health: player.attributes.health,
        healthMax: player.attributes.healthMax,
        stamina: player.attributes.stamina,
        staminaMax: player.attributes.staminaMax,
        magicka: player.attributes.magicka,
        magickaMax: player.attributes.magickaMax,
        armorRating,
        resistances: { physical: 0, fire: 0, frost: 0, shock: 0, poison: 0, magic: 0 },
        skills: skillLevels,
        activeStatusEffects: [],
        detectionLevel: 'combat',
        initiative: 0,
        isAlive: true,
        level: player.level,
    };
}

/**
 * Create a CombatParticipant from an EnemyDefinition.
 */
export function enemyToParticipant(enemy: EnemyDefinition): CombatParticipant {
    return {
        entityId: enemy.id,
        name: enemy.name,
        isPlayer: false,
        health: enemy.health,
        healthMax: enemy.health,
        stamina: enemy.stamina,
        staminaMax: enemy.stamina,
        magicka: enemy.magicka,
        magickaMax: enemy.magicka,
        armorRating: enemy.armorRating,
        resistances: {
            physical: enemy.resistances.physical ?? 0,
            fire: enemy.resistances.fire ?? 0,
            frost: enemy.resistances.frost ?? 0,
            shock: enemy.resistances.shock ?? 0,
            poison: enemy.resistances.poison ?? 0,
            magic: enemy.resistances.magic ?? 0,
        },
        skills: enemy.skills as Record<string, number>,
        activeStatusEffects: [],
        detectionLevel: 'combat',
        initiative: 0,
        isAlive: true,
        level: enemy.level,
    };
}

/**
 * Execute the player's chosen combat action.
 * Returns the updated session with log entries for this action.
 */
export function executePlayerAction(
    session: CombatSession,
    action: CombatAction,
    playerWeapon?: WeaponItem,
    eventBus?: EventBus
): CombatSession {
    const updated = { ...session, log: [...session.log] };
    const player = updated.participants.find(p => p.isPlayer);
    if (!player || !player.isAlive) return updated;

    switch (action.type) {
        case 'attack': {
            const target = updated.participants.find(p => p.entityId === action.targetId);
            if (!target || !target.isAlive) {
                addLog(updated, player.entityId, 'player_action', 'Target is not available.');
                break;
            }

            // d20 hit check
            const atkSkill = getAttackSkillLevel(player, playerWeapon);
            const defLevel = target.level ?? Math.floor(target.healthMax / 20);
            const hitRoll = rollToHit(atkSkill, defLevel);

            if (hitRoll.isFumble) {
                addLog(updated, player.entityId, 'player_action',
                    `${player.name} fumbles the attack! [d20: 1]`);
                player.detectionLevel = 'combat';
                break;
            }
            if (!hitRoll.hit) {
                addLog(updated, player.entityId, 'player_action',
                    `${player.name} swings at ${target.name} but misses! [d20: ${hitRoll.roll}]`);
                player.detectionLevel = 'combat';
                break;
            }

            // Hit — calculate damage (nat 20 forces crit)
            const dmgResult = calculateDamage({
                attacker: player,
                defender: target,
                weapon: playerWeapon,
                isSneakAttack: player.detectionLevel === 'hidden',
                forceCrit: hitRoll.isCrit,
            });

            target.health = Math.max(0, target.health - dmgResult.finalDamage);
            if (target.health <= 0) target.isAlive = false;

            // Apply status effects
            for (const effect of dmgResult.statusEffectsApplied) {
                target.activeStatusEffects.push({ ...effect });
            }

            // Weapon reveals player
            player.detectionLevel = 'combat';

            const hitNote = hitRoll.isCrit ? ` [d20: 20]` : ` [d20: ${hitRoll.roll}]`;
            const msg = formatDamageSuccinct(player.name, target.name, dmgResult) + hitNote;
            addLog(updated, player.entityId, 'player_action', msg, undefined, dmgResult);

            if (!target.isAlive) {
                addLog(updated, target.entityId, 'player_action', `${target.name} has been slain!`);
            }

            if (eventBus) {
                eventBus.emit(GameEventType.COMBAT_DAMAGE, {
                    attackerId: player.entityId,
                    targetId: target.entityId,
                    result: dmgResult,
                });
            }
            break;
        }

        case 'use_item': {
            // Simplified: potions restore health/stamina/magicka
            addLog(updated, player.entityId, 'player_action', `Used item.`);
            break;
        }

        case 'block': {
            // Mark as blocking — enemy attacks this round have +3 player DC and deal 50% damage if they connect
            const blockStaminaCost = 10;
            if (player.stamina < blockStaminaCost) {
                addLog(updated, player.entityId, 'player_action',
                    `${player.name} is too exhausted to block!`);
                break;
            }
            player.isBlocking = true;
            player.stamina = Math.max(0, player.stamina - blockStaminaCost);
            addLog(updated, player.entityId, 'player_action',
                `${player.name} raises their guard, bracing for impact. [−${blockStaminaCost} stamina]`);
            break;
        }

        case 'dodge': {
            // Mark as dodging — enemy attacks roll with disadvantage this round
            const dodgeStaminaCost = 15;
            if (player.stamina < dodgeStaminaCost) {
                addLog(updated, player.entityId, 'player_action',
                    `${player.name} is too exhausted to dodge!`);
                break;
            }
            player.isDodging = true;
            player.stamina = Math.max(0, player.stamina - dodgeStaminaCost);
            addLog(updated, player.entityId, 'player_action',
                `${player.name} shifts their footing, ready to evade. [−${dodgeStaminaCost} stamina]`);
            break;
        }

        case 'flee': {
            // Fleeing has a chance based on speed vs enemies
            const fleeChance = 0.4 + (player.stamina / player.staminaMax) * 0.3;
            if (Math.random() < fleeChance) {
                updated.isOver = true;
                updated.outcome = 'fled';
                addLog(updated, player.entityId, 'player_action', `${player.name} escapes from combat!`);
            } else {
                addLog(updated, player.entityId, 'player_action', `${player.name} fails to flee!`);
            }
            break;
        }

        case 'cast_spell': {
            // Simplified spell casting
            addLog(updated, player.entityId, 'player_action', `${player.name} casts a spell!`);
            break;
        }

        case 'sneak': {
            const sneakSkill = (player.skills['sneak'] ?? 15) as number;
            const hideChance = 0.1 + sneakSkill / 200;
            if (Math.random() < hideChance) {
                player.detectionLevel = 'hidden';
                addLog(updated, player.entityId, 'player_action', `${player.name} vanishes into the shadows.`);
            } else {
                addLog(updated, player.entityId, 'player_action', `${player.name} fails to hide.`);
            }
            break;
        }

        default:
            addLog(updated, player.entityId, 'player_action', `${player.name} does nothing.`);
    }

    return updated;
}

/**
 * Process all enemy actions for the current round.
 */
export function processEnemyActions(
    session: CombatSession,
    eventBus?: EventBus
): CombatSession {
    const updated = { ...session, log: [...session.log] };
    const player = updated.participants.find(p => p.isPlayer);
    if (!player || !player.isAlive || updated.isOver) return updated;

    for (const enemy of updated.participants.filter(p => !p.isPlayer && p.isAlive)) {
        const isBlocking = player.isBlocking ?? false;
        const isDodging  = player.isDodging  ?? false;
        const enemyLevel = enemy.level ?? Math.floor(enemy.healthMax / 20);

        // d20 hit check (dodge = disadvantage, block = +3 player DC)
        const hitRoll = rollEnemyToHit(enemyLevel, player.armorRating, isBlocking, isDodging);

        if (hitRoll.isFumble) {
            addLog(updated, enemy.entityId, 'enemy_action',
                `${enemy.name} fumbles their attack! [d20: 1]`);
            continue;
        }
        if (!hitRoll.hit) {
            const dodgeNote = isDodging ? ' (evaded!)' : '';
            addLog(updated, enemy.entityId, 'enemy_action',
                `${enemy.name} attacks but misses! [d20: ${hitRoll.roll}]${dodgeNote}`);
            continue;
        }

        // Hit — build an ad-hoc weapon from the enemy's stats
        const enemyWeapon: WeaponItem = {
            id: `${enemy.entityId}_weapon`,
            name: 'Claws',
            description: '',
            type: 'weapon',
            weight: 0,
            baseValue: 0,
            rarity: 'common',
            tags: [],
            damage: Math.max(5, Math.round(enemy.healthMax / 15)),
            damageType: 'physical',
            speed: 'normal',
            weaponClass: 'one_handed_sword',
        };

        const dmgResult = calculateDamage({
            attacker: enemy,
            defender: player,
            weapon: enemyWeapon,
        });

        // Block halves incoming damage
        let finalDamage = dmgResult.finalDamage;
        let blockNote = '';
        if (isBlocking) {
            finalDamage = Math.max(1, Math.floor(finalDamage / 2));
            blockNote = ' (blocked!)';
        }

        player.health = Math.max(0, player.health - finalDamage);
        if (player.health <= 0) player.isAlive = false;

        // Build display result with adjusted damage for log/event accuracy
        const displayResult = isBlocking ? { ...dmgResult, finalDamage } : dmgResult;
        const hitNote = ` [d20: ${hitRoll.roll}]`;
        const msg = formatDamageSuccinct(enemy.name, player.name, displayResult) + blockNote + hitNote;
        addLog(updated, enemy.entityId, 'enemy_action', msg, undefined, displayResult);

        if (eventBus) {
            eventBus.emit(GameEventType.COMBAT_DAMAGE, {
                attackerId: enemy.entityId,
                targetId: player.entityId,
                result: displayResult,
            });
        }

        if (!player.isAlive) {
            addLog(updated, player.entityId, 'enemy_action', `${player.name} has fallen in battle!`);
            break;
        }
    }

    return updated;
}

/**
 * Process status effects (DoTs, debuffs) at end of round.
 */
export function processStatusEffects(session: CombatSession): CombatSession {
    const updated = { ...session, log: [...session.log] };

    for (const participant of updated.participants.filter(p => p.isAlive)) {
        const expiredEffects: StatusEffect[] = [];

        for (const effect of participant.activeStatusEffects) {
            // Apply effect
            switch (effect.type) {
                case 'burning':
                case 'poisoned':
                case 'bleeding': {
                    const dotDamage = Math.round(effect.magnitude);
                    participant.health = Math.max(0, participant.health - dotDamage);
                    addLog(updated, participant.entityId, 'status_processing',
                        `${participant.name} takes ${dotDamage} ${effect.type} damage.`);
                    if (participant.health <= 0) {
                        participant.isAlive = false;
                        addLog(updated, participant.entityId, 'status_processing',
                            `${participant.name} succumbs to ${effect.name}!`);
                    }
                    break;
                }
                case 'drain_magicka': {
                    participant.magicka = Math.max(0, participant.magicka - effect.magnitude);
                    break;
                }
                case 'drain_stamina': {
                    participant.stamina = Math.max(0, participant.stamina - effect.magnitude);
                    break;
                }
                // slowed, staggered, paralyzed are checked during action resolution
                default:
                    break;
            }

            // Tick duration
            effect.duration--;
            if (effect.duration <= 0) {
                expiredEffects.push(effect);
                // Reverse on-apply mutations when the effect expires
                if (effect.type === 'fortified') {
                    participant.armorRating = Math.max(0, participant.armorRating - effect.magnitude);
                }
            }
        }

        // Remove expired effects
        participant.activeStatusEffects = participant.activeStatusEffects.filter(
            e => !expiredEffects.includes(e)
        );
    }

    return updated;
}

/**
 * Check if combat is over and determine outcome.
 */
export function checkCombatEnd(session: CombatSession, eventBus?: EventBus): CombatSession {
    const updated = { ...session };
    const player = updated.participants.find(p => p.isPlayer);
    const enemies = updated.participants.filter(p => !p.isPlayer);

    if (!player || !player.isAlive) {
        updated.isOver = true;
        updated.outcome = 'defeat';
    } else if (enemies.every(e => !e.isAlive)) {
        updated.isOver = true;
        updated.outcome = 'victory';
    }

    if (updated.isOver && eventBus) {
        const xpGained = enemies.filter(e => !e.isAlive).reduce((sum, e) => sum + e.healthMax, 0);
        eventBus.emit(GameEventType.COMBAT_END, {
            outcome: updated.outcome!,
            participantIds: updated.participants.map(p => p.entityId),
            xpGained,
        });
    }

    return updated;
}

/**
 * Advance to the next round.
 * Clears per-round flags (isBlocking, isDodging) on all participants.
 */
export function advanceRound(session: CombatSession): CombatSession {
    const participants = session.participants.map(p =>
        p.isPlayer ? { ...p, isBlocking: false, isDodging: false } : p
    );
    return {
        ...session,
        participants,
        round: session.round + 1,
        phase: 'player_action',
    };
}

/**
 * Get a summary of the current combat state for display.
 */
export function getCombatSummary(session: CombatSession): string {
    const lines: string[] = [];
    lines.push(`━━━ Round ${session.round} ━━━`);

    const player = session.participants.find(p => p.isPlayer);
    if (player) {
        const hpBar = makeHPBar(player.health, player.healthMax);
        lines.push(`  ${player.name}: ${hpBar} ${player.health}/${player.healthMax} HP`);
        if (player.magicka < player.magickaMax) {
            lines.push(`    MP: ${player.magicka}/${player.magickaMax}  SP: ${player.stamina}/${player.staminaMax}`);
        }
    }

    lines.push('');

    for (const enemy of session.participants.filter(p => !p.isPlayer)) {
        const status = enemy.isAlive ? '' : ' [DEAD]';
        const hpBar = makeHPBar(enemy.health, enemy.healthMax);
        lines.push(`  ${enemy.name}: ${hpBar} ${enemy.health}/${enemy.healthMax} HP${status}`);
        if (enemy.activeStatusEffects.length > 0) {
            const effects = enemy.activeStatusEffects.map(e => `${e.name}(${e.duration})`).join(', ');
            lines.push(`    Effects: ${effects}`);
        }
    }

    return lines.join('\n');
}

/**
 * Get the combat log entries for the current round.
 */
export function getCurrentRoundLog(session: CombatSession): CombatLogEntry[] {
    return session.log.filter(e => e.round === session.round);
}

/**
 * Get living enemies in the session.
 */
export function getLivingEnemies(session: CombatSession): CombatParticipant[] {
    return session.participants.filter(p => !p.isPlayer && p.isAlive);
}

// --- Internal Helpers ---

function rollInitiative(participant: CombatParticipant): number {
    const speedBonus = participant.stamina / 10;
    return Math.floor(Math.random() * 20) + 1 + speedBonus;
}

function addLog(
    session: CombatSession,
    actorId: string,
    phase: CombatLogEntry['phase'],
    action: string,
    detailed?: string,
    damageResult?: DamageResult
): void {
    session.log.push({
        round: session.round,
        phase,
        actorId,
        action,
        detailed,
        damageResult,
    });
}

/**
 * Get the relevant attack skill level for hit resolution.
 */
function getAttackSkillLevel(attacker: CombatParticipant, weapon?: WeaponItem): number {
    if (!weapon) return (attacker.skills['one_handed'] ?? 15) as number;
    switch (weapon.weaponClass) {
        case 'two_handed_sword':
        case 'two_handed_axe':
        case 'two_handed_hammer':
            return (attacker.skills['two_handed'] ?? 15) as number;
        case 'bow':
        case 'crossbow':
            return (attacker.skills['archery'] ?? 15) as number;
        default:
            return (attacker.skills['one_handed'] ?? 15) as number;
    }
}

/**
 * Roll d20 + skill bonus vs enemy DC.
 * Natural 1 = fumble (always miss). Natural 20 = critical hit (always hits).
 *
 * Hit DC = min(15,  8 + floor(enemyLevel / 2))
 * Skill bonus  = floor(skillLevel / 8)
 */
function rollToHit(
    skillLevel: number,
    enemyLevel: number
): { roll: number; hit: boolean; isFumble: boolean; isCrit: boolean } {
    const roll = rollDice(1, 20);
    if (roll === 1)  return { roll, hit: false, isFumble: true,  isCrit: false };
    if (roll === 20) return { roll, hit: true,  isFumble: false, isCrit: true  };

    const skillBonus = Math.floor(skillLevel / 8);
    const dc = Math.min(15, 8 + Math.floor(enemyLevel / 2));
    return { roll, hit: (roll + skillBonus) >= dc, isFumble: false, isCrit: false };
}

/**
 * Roll enemy to-hit against the player.
 * Dodge gives the enemy disadvantage (roll twice, take lower).
 * Block adds +3 to the player's effective defense DC.
 *
 * Player DC  = 8 + floor(armorRating / 20) [+ 3 if blocking]
 * Enemy bonus = floor(enemyLevel / 3)
 */
function rollEnemyToHit(
    enemyLevel: number,
    playerArmorRating: number,
    isBlocking: boolean,
    isDodging: boolean
): { roll: number; hit: boolean; isFumble: boolean } {
    let roll = rollDice(1, 20);
    if (isDodging) {
        // Disadvantage: roll twice, take lower
        roll = Math.min(roll, rollDice(1, 20));
    }
    if (roll === 1) return { roll, hit: false, isFumble: true };

    const attackBonus = Math.floor(enemyLevel / 3);
    const playerDC = 8 + Math.floor(playerArmorRating / 20) + (isBlocking ? 3 : 0);
    return { roll, hit: (roll + attackBonus) >= playerDC, isFumble: false };
}

function makeHPBar(current: number, max: number): string {
    const pct = Math.max(0, current / max);
    const filled = Math.round(pct * 20);
    const empty = 20 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);

    if (pct > 0.6) return `[${bar}]`;
    if (pct > 0.3) return `[${bar}]`;
    return `[${bar}]`;
}
