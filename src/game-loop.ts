// ============================================================
// Schyrim — Main Game Loop
// Orchestrates all game screens: menu, world, combat, inventory
// ============================================================

import chalk from 'chalk';

import type { LocationDefinition, LocationInstance } from './core/types/location.types.js';
import type { EnemyDefinition, CombatSession, CombatAction, SpellDefinition, StatusEffectType } from './core/types/combat.types.js';
import type { PlayerState, RaceDefinition, RaceId, SkillId } from './core/types/character.types.js';
import type { EquipmentSlot } from './core/types/items.types.js';
import { GameEventType } from './core/types/events.types.js';
import {
    canStartQuest, startQuest, advanceQuestStage, onLocationEntered, onEnemyKilled,
    onItemCollected, onNpcTalkedTo, getActiveQuestList, getObjectiveProgressText,
} from './systems/quests/quest-system.js';
import type { AIEngine } from './systems/ai/ai-engine.js';
import type { DialogueTree, DialogueEffect } from './core/types/dialogue.types.js';
import type { QuestState } from './core/types/quest.types.js';
import type { FactionState } from './core/types/faction.types.js';
import {
    startDialogue, getCurrentNode, getAvailableOptions, selectOption,
} from './systems/dialogue/dialogue-engine.js';
import type { DialogueContext, DialogueSession } from './systems/dialogue/dialogue-engine.js';

import { GameStateManager } from './core/game-state.js';
import { EventBus } from './core/event-bus.js';
import type { ContentRegistry } from './content-registry.js';

import {
    renderBanner, renderLocation, renderCombat,
    renderCombatLog, renderNotification, renderDialogue,
    renderInventory, renderCharacterSheet, renderDivider,
} from './presentation/cli-renderer.js';

import {
    getAvailableExits, moveTo, formatTime, advanceTime,
} from './systems/navigation/navigation-system.js';

import {
    createCombatSession, playerToParticipant, enemyToParticipant,
    executePlayerAction, processEnemyActions, processStatusEffects,
    checkCombatEnd, advanceRound, getLivingEnemies,
} from './systems/combat/combat-system.js';

import { grantSkillXP, initializeSkills, applyRacialBonuses } from './systems/progression/skill-system.js';
import { getInventoryWeight, equipItem, unequipItem, addItem } from './systems/inventory/inventory-system.js';
import { saveGame, loadGame, listSaves, hasSaves } from './save-system.js';

import {
    buyFromVendor, sellToVendor, getVendorBuyPrice, getVendorSellPrice,
    getVendorInventory, getPlayerSellableItems, getVendorState,
} from './systems/economy/bartering-system.js';
import {
    acquirePerk, getPerkTree, getAvailablePerkTrees,
} from './systems/progression/perk-system.js';
import { generateLoot, generateGoldReward } from './systems/loot/leveled-loot.js';

import { ui, type UIChoice } from './presentation/tui/screen.js';

// ============================================================
// CONTEXT
// ============================================================

interface GameContext {
    gsm: GameStateManager;
    bus: EventBus;
    content: ContentRegistry;
    notifications: string[];
    ai: AIEngine;
}

// ============================================================
// ENTRY POINT
// ============================================================

export async function runGame(
    gsm: GameStateManager,
    bus: EventBus,
    content: ContentRegistry,
    ai: AIEngine
): Promise<void> {
    ui.init();

    const notifications: string[] = [];
    const ctx: GameContext = { gsm, bus, content, notifications, ai };

    bus.on(GameEventType.QUEST_STARTED, ({ questTitle }) => {
        notifications.push(chalk.hex('#FFD700')(`  ✦ Quest Started: "${questTitle}"`));
    });
    bus.on(GameEventType.QUEST_STAGE_CHANGE, ({ questId, toStage }) => {
        const def = content.quests.get(questId);
        const stage = def?.stages.find(s => s.id === toStage);
        if (stage) notifications.push(chalk.cyan(`  ◆ Objective: ${stage.description}`));
    });
    bus.on(GameEventType.QUEST_COMPLETED, ({ questTitle }) => {
        notifications.push(chalk.hex('#FFD700').bold(`  ★ Quest Complete: "${questTitle}"!`));
    });
    bus.on(GameEventType.QUEST_OBJECTIVE_UPDATE, ({ objectiveId, progress, total }) => {
        if (total > 1) {
            notifications.push(chalk.gray(`  ○ ${objectiveId.replace(/_/g, ' ')} (${progress}/${total})`));
        }
    });
    bus.on(GameEventType.REPUTATION_CHANGE, ({ factionId, newValue }) => {
        const fName = content.factions.get(factionId)?.name ?? factionId;
        notifications.push(chalk.hex('#DAA520')(`  ◇ ${fName} reputation: ${newValue > 0 ? '+' : ''}${newValue}`));
    });
    bus.on(GameEventType.PERK_ACQUIRED, ({ perkName, tree }) => {
        notifications.push(chalk.hex('#FFD700').bold(`  ★ Perk Acquired: ${perkName} (${tree.replace(/_/g, ' ')})`));
    });
    bus.on(GameEventType.TRADE_COMPLETED, ({ goldDelta }) => {
        notifications.push(chalk.green(`  ⚖ Trade complete (${goldDelta > 0 ? '+' : ''}${goldDelta}g)`));
    });

    await mainMenu(ctx);
}

// ============================================================
// MAIN MENU
// ============================================================

async function mainMenu(ctx: GameContext): Promise<void> {
    ui.clear();
    ui.log(renderBanner());
    ui.setMenuLabel('SCHYRIM');

    const savesExist = hasSaves();
    const choices: UIChoice[] = [
        { name: 'New Game', value: 'new' },
        {
            name: savesExist ? 'Continue' : chalk.gray('Continue (no saves)'),
            value: 'continue',
            disabled: savesExist ? false : '(no saves found)',
        },
        { name: chalk.gray('Quit'), value: 'quit' },
    ];

    const choice = await ui.select(choices);

    switch (choice) {
        case 'new': await newGame(ctx); break;
        case 'continue': await continueGame(ctx); break;
        case 'quit':
            ui.log(chalk.gray('\n  Farewell, traveller...\n'));
            await sleep(600);
            process.exit(0);
    }
}

// ============================================================
// CHARACTER CREATION
// ============================================================

async function newGame(ctx: GameContext): Promise<void> {
    ui.clear();
    ui.log(chalk.hex('#FFD700').bold('  ═══ Character Creation ═══'));
    ui.log(chalk.gray('  You are the Dragonborn. But who are you?\n'));
    ui.setMenuLabel('CHARACTER CREATION');

    const name = await ui.input('What is your name?', 'Dovahkiin');

    const races = [...ctx.content.races.values()];
    const raceChoices: UIChoice[] = races.map(r => ({
        name: `${r.name.padEnd(20)} ${chalk.gray(r.description.slice(0, 50) + '...')}`,
        value: r.id,
    }));
    ui.log(chalk.hex('#DAA520')('\n  Choose your race:'));
    const raceId = await ui.select(raceChoices);
    const race = ctx.content.races.get(raceId) as RaceDefinition;

    ui.log('');
    ui.log(renderDivider(race.name));
    ui.log(chalk.gray(`  ${race.description}`));
    if (race.racialAbility) {
        ui.log(chalk.cyan(`  Ability: ${race.racialAbility}`));
    }
    const skillBonusStr = Object.entries(race.skillBonuses)
        .filter(([, v]) => (v ?? 0) > 0)
        .map(([k, v]) => `+${v} ${k.replace(/_/g, ' ')}`)
        .join('  ');
    if (skillBonusStr) {
        ui.log(chalk.hex('#DAA520')(`  Skills: ${skillBonusStr}`));
    }
    ui.log('');

    const confirmChoices: UIChoice[] = [
        { name: `Begin as ${chalk.bold(name.trim())} the ${chalk.bold(race.name)}`, value: 'yes' },
        { name: chalk.gray('Choose differently'), value: 'no' },
    ];
    const confirmed = await ui.select(confirmChoices);
    if (confirmed === 'no') {
        return newGame(ctx);
    }

    // Initialize state
    ctx.gsm.reset();

    const skills = applyRacialBonuses(
        initializeSkills(),
        race.skillBonuses as Record<string, number>
    );

    const baseAttrs = { health: 100, healthMax: 100, stamina: 100, staminaMax: 100, magicka: 100, magickaMax: 100 };
    const attrs = { ...baseAttrs };
    for (const [key, bonus] of Object.entries(race.attributeBonuses)) {
        if (key in attrs && typeof bonus === 'number') {
            (attrs as Record<string, number>)[key] += bonus;
            const baseKey = key.replace('Max', '');
            if (key.endsWith('Max') && baseKey in attrs) {
                (attrs as Record<string, number>)[baseKey] += bonus;
            }
        }
    }

    // All characters start with Healing; mage races get their racial spells too
    const startingSpells = Array.from(new Set([
        'spell_healing',
        ...(race.startingSpells ?? []),
    ]));

    ctx.gsm.updatePlayer({
        name: name.trim(),
        race: raceId as RaceId,
        attributes: attrs,
        skills,
        gold: 50,
        currentLocationId: 'whiterun_gate',
        discoveredLocations: ['whiterun_gate'],
        knownSpells: startingSpells,
    });

    ctx.gsm.mutateWorld(w => ({
        ...w,
        discoveredLocations: ['whiterun_gate'],
        locations: {
            whiterun_gate: {
                definitionId: 'whiterun_gate',
                visited: true,
                visitCount: 1,
                containers: {},
                clearedEnemies: [],
                discoveredExits: [],
                flags: {},
                lastVisitTime: w.currentTime,
            },
        },
    }));

    ctx.gsm.updateMeta({
        saveName: `${name.trim().toLowerCase().replace(/\s+/g, '_')}_1`,
        playTime: 0,
    });

    for (const [, questDef] of ctx.content.quests) {
        if (canStartQuest(ctx.gsm, questDef)) {
            startQuest(ctx.gsm, ctx.bus, questDef);
        }
    }

    ui.log('');
    flushNotifications(ctx);
    ui.log(chalk.hex('#FFD700')('  Your story begins...'));
    await sleep(1500);
    await worldLoop(ctx);
}

// ============================================================
// LOAD GAME
// ============================================================

async function continueGame(ctx: GameContext): Promise<void> {
    const saves = listSaves();
    if (saves.length === 0) {
        return mainMenu(ctx);
    }

    ui.clear();
    ui.log(chalk.hex('#DAA520').bold('  ═══ Load Game ═══\n'));
    ui.setMenuLabel('LOAD GAME');

    const saveChoices: UIChoice[] = saves.map(s => ({
        name: `${chalk.bold(s.playerName)} Lv.${s.playerLevel} — ${chalk.gray(s.saveName)} — ${chalk.gray(new Date(s.saveDate).toLocaleString())}`,
        value: s.filename,
    }));
    saveChoices.push({ name: chalk.gray('← Back'), value: 'back' });

    const filename = await ui.select(saveChoices);
    if (filename === 'back') {
        return mainMenu(ctx);
    }

    const state = loadGame(filename);
    ctx.gsm.loadState(state);
    ctx.ai.clearCache();
    ui.log(chalk.green('\n  Game loaded.\n'));
    await sleep(600);
    await worldLoop(ctx);
}

// ============================================================
// WORLD LOOP
// ============================================================

async function worldLoop(ctx: GameContext): Promise<void> {
    let lastLocationKey = '';

    while (true) {
        const player = ctx.gsm.getPlayer();
        const world = ctx.gsm.getWorld();
        const locationId = player.currentLocationId;
        const location = ctx.content.locations.get(locationId);

        if (!location) {
            ui.log(chalk.red(`\n  ERROR: Unknown location "${locationId}". Warping to Whiterun.\n`));
            ctx.gsm.updatePlayer({ currentLocationId: 'whiterun_gate' });
            await sleep(1000);
            continue;
        }

        const instance = world.locations[locationId] as LocationInstance | undefined;
        const locationKey = `${locationId}:${world.currentTime.period}`;

        if (locationKey !== lastLocationKey) {
            lastLocationKey = locationKey;

            const firstVisit = !instance || instance.visitCount <= 1;
            const staticDesc = firstVisit && location.detailedDescription
                ? location.detailedDescription
                : location.description;

            const aiDesc = await ctx.ai.generateSceneDescription(ctx.gsm, ctx.content);
            const displayDesc = aiDesc ?? staticDesc;

            ui.clear();
            ui.log(renderLocation(location.name, displayDesc, formatTime(world.currentTime)));

            if (aiDesc && ctx.ai.isLive) {
                ui.log(chalk.gray(`  ✦ ${ctx.ai.providerName}`));
            }

            if (location.ambient.sounds?.length) {
                const sound = location.ambient.sounds[Math.floor(Math.random() * location.ambient.sounds.length)];
                ui.log(chalk.gray(`\n  You hear: ${sound}`));
            }
        }

        ui.updateHUD(player, ctx.gsm.getQuests(), ctx.content);
        ui.updateStatus(location.name, location.region, formatTime(world.currentTime));
        ui.setMenuLabel('ACTIONS');

        const actionChoices = buildWorldMenu(ctx, location, instance);
        const action = await ui.select(actionChoices);

        const result = await handleWorldAction(ctx, action, location, instance);
        if (result === 'quit') {
            ui.log(chalk.gray('\n  Farewell, Dragonborn...\n'));
            await sleep(600);
            process.exit(0);
        }
        if (result === 'menu') {
            return mainMenu(ctx);
        }
    }
}

// ============================================================
// WORLD MENU BUILDER
// ============================================================

function buildWorldMenu(
    ctx: GameContext,
    location: LocationDefinition,
    instance: LocationInstance | undefined
): UIChoice[] {
    const player = ctx.gsm.getPlayer();
    const world = ctx.gsm.getWorld();
    const cleared = instance?.clearedEnemies ?? [];
    const playerItemIds = player.inventory.items.map(i => i.item.id);

    const choices: UIChoice[] = [];
    const sep = (label: string): UIChoice => ({
        name: chalk.hex('#555')(label),
        value: `__sep_${label}__`,
        disabled: 'sep',
    });

    // --- Travel ---
    const exits = getAvailableExits(location, instance, playerItemIds);
    if (exits.length > 0) {
        choices.push(sep('── Travel ──'));
        for (const exit of exits) {
            if (exit.locked && !exit.canUnlock) {
                choices.push({
                    name: chalk.gray(`[Locked] ${exit.direction} (${exit.travelTime}h)`),
                    value: `travel:${exit.targetId}`,
                    disabled: 'locked',
                });
            } else {
                const lockNote = exit.locked && exit.canUnlock ? chalk.yellow(' [you have the key]') : '';
                const targetName = ctx.content.locations.get(exit.targetId)?.name ?? exit.targetId;
                choices.push({
                    name: `${exit.direction} → ${chalk.gray(targetName)} ${chalk.gray(`(${exit.travelTime}h)`)}${lockNote}`,
                    value: `travel:${exit.targetId}`,
                });
            }
        }
    }

    // --- Filter active entities ---
    const activeEntities = location.entities.filter(e => {
        if (e.type === 'enemy' && cleared.includes(e.entityId)) return false;
        if (e.spawnCondition?.type === 'time_of_day') {
            return e.spawnCondition.params['period'] === world.currentTime.period;
        }
        return true;
    });

    const npcs = activeEntities.filter(e => e.type === 'npc');
    const enemies = activeEntities.filter(e => e.type === 'enemy');
    const containers = activeEntities.filter(e => e.type === 'container');
    const interactables = activeEntities.filter(e => e.type === 'interactable');

    if (npcs.length > 0) {
        choices.push(sep('── People ──'));
        const seen = new Set<string>();
        for (const e of npcs) {
            if (seen.has(e.entityId)) continue;
            seen.add(e.entityId);
            choices.push({
                name: `Talk to ${formatEntityName(e.entityId)}`,
                value: `talk:${e.entityId}`,
            });
        }
    }

    if (enemies.length > 0) {
        choices.push(sep('── Threats ──'));
        const seen = new Set<string>();
        for (const e of enemies) {
            const enemy = ctx.content.enemies.get(e.entityId);
            if (!enemy || seen.has(e.entityId)) continue;
            seen.add(e.entityId);
            const count = enemies.filter(x => x.entityId === e.entityId).length;
            const countNote = count > 1 ? ` (×${count})` : '';
            choices.push({
                name: chalk.red(`⚔ Attack ${enemy.name}${countNote}`) + chalk.gray(` Lv.${enemy.level}`),
                value: `attack:${e.entityId}`,
            });
        }
    }

    if (containers.length > 0) {
        choices.push(sep('── Search ──'));
        for (const e of containers) {
            const looted = !!instance?.containers[e.entityId];
            choices.push({
                name: looted
                    ? chalk.gray(`(empty) ${formatEntityName(e.entityId)}`)
                    : `Search ${formatEntityName(e.entityId)}`,
                value: `loot:${e.entityId}`,
                disabled: looted ? 'empty' : false,
            });
        }
    }

    for (const e of interactables) {
        choices.push({
            name: `Inspect ${formatEntityName(e.entityId)}`,
            value: `inspect:${e.entityId}`,
        });
    }

    choices.push(sep('── Actions ──'));
    const hpPct = player.attributes.health / player.attributes.healthMax;
    const restNote = hpPct < 1 ? chalk.gray(' (heal 15% HP)') : '';
    choices.push({ name: `Rest (1 hour)${restNote}`, value: 'rest' });
    choices.push({ name: 'Inventory', value: 'inventory' });
    choices.push({ name: 'Character Sheet', value: 'character' });
    const questCount = Object.keys(ctx.gsm.getQuests().activeQuests).length;
    const journalNote = questCount > 0 ? chalk.hex('#DAA520')(` (${questCount} active)`) : '';
    choices.push({ name: `Quest Journal${journalNote}`, value: 'journal' });
    choices.push({ name: 'Save Game', value: 'save' });
    choices.push(sep('──'));
    choices.push({ name: chalk.gray('Main Menu'), value: 'menu' });
    choices.push({ name: chalk.red('Quit'), value: 'quit' });

    return choices;
}

// ============================================================
// WORLD ACTION HANDLER
// ============================================================

async function handleWorldAction(
    ctx: GameContext,
    action: string,
    location: LocationDefinition,
    instance: LocationInstance | undefined
): Promise<'continue' | 'quit' | 'menu'> {
    if (action.startsWith('travel:')) {
        await handleTravel(ctx, action.slice(7));
    } else if (action.startsWith('attack:')) {
        await handleCombat(ctx, action.slice(7), location, instance);
    } else if (action.startsWith('talk:')) {
        await handleTalk(ctx, action.slice(5), location);
    } else if (action.startsWith('loot:')) {
        await handleLoot(ctx, action.slice(5));
    } else if (action.startsWith('inspect:')) {
        await handleInspect(ctx, action.slice(8));
    } else {
        switch (action) {
            case 'rest': await handleRest(ctx); break;
            case 'inventory': await handleInventory(ctx); break;
            case 'character': await handleCharacterSheet(ctx); break;
            case 'journal': await handleQuestJournal(ctx); break;
            case 'save': await handleSave(ctx); break;
            case 'menu': return 'menu';
            case 'quit': return 'quit';
        }
    }
    return 'continue';
}

// ============================================================
// TRAVEL
// ============================================================

async function handleTravel(ctx: GameContext, targetId: string): Promise<void> {
    const player = ctx.gsm.getPlayer();
    const world = ctx.gsm.getWorld();
    const playerItemIds = player.inventory.items.map(i => i.item.id);

    const result = moveTo(
        player.currentLocationId,
        targetId,
        ctx.content.locations,
        world,
        playerItemIds,
        ctx.bus,
    );

    if (!result.success) {
        ui.log(chalk.red(`\n  ${result.error}\n`));
        await ui.pressEnter();
        return;
    }

    const { newLocationId, worldState, isNewDiscovery } = result.data;

    const newDiscovered = isNewDiscovery
        ? [...player.discoveredLocations, newLocationId]
        : player.discoveredLocations;

    ctx.gsm.updatePlayer({
        currentLocationId: newLocationId,
        discoveredLocations: newDiscovered,
    });
    ctx.gsm.updateWorld(worldState);

    if (isNewDiscovery) {
        const loc = ctx.content.locations.get(newLocationId);
        ui.log(renderNotification('discovery', `Discovered: ${loc?.name ?? newLocationId}`));
        await sleep(800);
    }

    onLocationEntered(ctx.gsm, ctx.bus, newLocationId, ctx.content.quests);
    if (ctx.notifications.length > 0) {
        flushNotifications(ctx);
        await ui.pressEnter();
    }

    // Random encounter check
    const srcLocation = ctx.content.locations.get(player.currentLocationId);
    if (srcLocation && ctx.gsm.getConfig().immersion.randomEncounters) {
        const exit = srcLocation.exits.find(e => e.targetLocationId === targetId);
        if (exit && exit.dangerLevel > 3) {
            const chance = (exit.dangerLevel / 10) * 0.2;
            if (Math.random() < chance) {
                await triggerRandomEncounter(ctx);
            }
        }
    }
}

async function triggerRandomEncounter(ctx: GameContext): Promise<void> {
    const enemyPool = ['bandit_melee', 'bandit_archer'].filter(id => ctx.content.enemies.has(id));
    if (enemyPool.length === 0) return;

    const enemyId = enemyPool[Math.floor(Math.random() * enemyPool.length)];
    const enemy = ctx.content.enemies.get(enemyId)!;

    ui.log('');
    ui.log(chalk.red.bold(`  ⚠ A ${enemy.name} ambushes you on the road!`));
    await sleep(1200);

    const choice = await ui.select([
        { name: chalk.red('Fight!'), value: 'fight' },
        { name: chalk.yellow('Try to flee'), value: 'flee' },
    ]);

    if (choice === 'fight') {
        await runCombat(ctx, [enemy], enemyId);
    } else {
        if (Math.random() < 0.6) {
            ui.log(chalk.green('\n  You slip away into the wilderness.\n'));
            await sleep(800);
        } else {
            ui.log(chalk.red('\n  They cut off your escape!\n'));
            await sleep(1000);
            await runCombat(ctx, [enemy], enemyId);
        }
    }
}

// ============================================================
// COMBAT
// ============================================================

async function handleCombat(
    ctx: GameContext,
    enemyId: string,
    location: LocationDefinition,
    instance: LocationInstance | undefined
): Promise<void> {
    const enemy = ctx.content.enemies.get(enemyId);
    if (!enemy) {
        ui.log(chalk.gray('\n  Nothing to fight here.\n'));
        await ui.pressEnter();
        return;
    }

    const cleared = instance?.clearedEnemies ?? [];
    if (cleared.includes(enemyId)) {
        ui.log(chalk.gray(`\n  The ${enemy.name} has already been defeated.\n`));
        await ui.pressEnter();
        return;
    }

    const count = Math.min(
        location.entities.filter(e => e.type === 'enemy' && e.entityId === enemyId).length,
        3
    );

    const enemies: EnemyDefinition[] = Array.from({ length: count }, (_, i) => ({
        ...enemy,
        id: count > 1 ? `${enemy.id}_${i + 1}` : enemy.id,
        name: count > 1 ? `${enemy.name} ${i + 1}` : enemy.name,
    }));

    await runCombat(ctx, enemies, enemyId);

    const locationId = ctx.gsm.getPlayer().currentLocationId;
    ctx.gsm.mutateWorld(w => {
        const existing = w.locations[locationId] ?? {
            definitionId: locationId, visited: true, visitCount: 1,
            containers: {}, clearedEnemies: [], discoveredExits: [], flags: {},
        };
        return {
            ...w,
            locations: {
                ...w.locations,
                [locationId]: {
                    ...existing,
                    clearedEnemies: [...existing.clearedEnemies, enemyId],
                },
            },
        };
    });
}

/**
 * Resolve a player spell cast directly in the game loop.
 * Handles damage, healing, and status effects; grants skill XP.
 */
function executeSpellCast(
    session: CombatSession,
    spell: SpellDefinition,
    targetId: string,
    ctx: GameContext,
): CombatSession {
    const updated = { ...session, log: [...session.log] };
    const caster = updated.participants.find(p => p.isPlayer);
    if (!caster) return updated;

    // Defensive magicka check (already gated by UI disabled state)
    if (caster.magicka < spell.magickaCost) {
        updated.log.push({
            round: updated.round, phase: 'player_action', actorId: 'player',
            action: `${caster.name} doesn't have enough magicka to cast ${spell.name}!`,
        });
        return updated;
    }

    caster.magicka = Math.max(0, caster.magicka - spell.magickaCost);
    caster.detectionLevel = 'combat';

    let logMsg = `${caster.name} casts ${chalk.cyan(spell.name)}!`;

    for (const effect of spell.effects) {
        const isTargetSelf = targetId === 'player';
        const target = isTargetSelf
            ? caster
            : updated.participants.find(p => p.entityId === targetId);
        if (!target) continue;

        switch (effect.type) {
            case 'direct_damage': {
                if (!target.isAlive) break;
                const damageType = (spell.damageType ?? 'physical') as string;
                const resistance = (target.resistances as Record<string, number>)[damageType] ?? 0;
                const resistMod = 1.0 - Math.min(resistance, 0.85);
                const magicSkill = (caster.skills[spell.school as SkillId] ?? 15) as number;
                const skillMod = 0.5 + (magicSkill / 40);
                const finalDmg = Math.max(1, Math.round(effect.magnitude * skillMod * resistMod));
                target.health = Math.max(0, target.health - finalDmg);
                if (target.health <= 0) target.isAlive = false;
                const typeStr = spell.damageType ? ` ${spell.damageType}` : '';
                logMsg += ` ${target.name} takes ${chalk.red(String(finalDmg))}${typeStr} damage.`;
                if (!target.isAlive) logMsg += ` ${target.name} has been slain!`;
                break;
            }
            case 'direct_heal': {
                const before = caster.health;
                caster.health = Math.min(caster.healthMax, caster.health + effect.magnitude);
                const healed = caster.health - before;
                logMsg += ` ${caster.name} is healed for ${chalk.green(String(healed))} HP.`;
                break;
            }
            default: {
                // Status effects (burning, slowed, drain_stamina, fortified, etc.)
                if (effect.duration > 0) {
                    target.activeStatusEffects.push({
                        id: `${spell.id}_${effect.type}_r${updated.round}`,
                        name: spell.name,
                        type: effect.type as StatusEffectType,
                        magnitude: effect.magnitude,
                        duration: effect.duration,
                        sourceId: spell.id,
                    });
                    if (effect.type === 'fortified') {
                        // Temporarily boost armor rating; expiry handled by processStatusEffects
                        caster.armorRating += effect.magnitude;
                        logMsg += ` ${caster.name} gains ${chalk.yellow(`+${effect.magnitude} armor`)} for ${effect.duration} rounds.`;
                    }
                    // drain_magicka with duration 0 is instant (Sparks) — handled by direct effect not status
                }
                break;
            }
        }
    }

    // Handle instant drain effects (e.g. Sparks drains enemy magicka on hit)
    if (spell.damageType === 'shock' && targetId !== 'player') {
        const target = updated.participants.find(p => p.entityId === targetId);
        if (target && target.isAlive) {
            const drainEffect = spell.effects.find(e => e.type === 'drain_magicka' && e.duration === 0);
            if (drainEffect) {
                target.magicka = Math.max(0, target.magicka - drainEffect.magnitude);
            }
        }
    }

    updated.log.push({ round: updated.round, phase: 'player_action', actorId: 'player', action: logMsg });

    // Grant skill XP for the spell's school
    ctx.gsm.mutatePlayer(p => {
        const { player } = grantSkillXP(p, spell.school as SkillId, 20, 'spell_cast', ctx.bus);
        return player;
    });

    return updated;
}

async function runCombat(ctx: GameContext, enemies: EnemyDefinition[], baseEnemyTypeId?: string): Promise<void> {
    const player = ctx.gsm.getPlayer();
    const playerParticipant = playerToParticipant(player);
    const enemyParticipants = enemies.map(e => enemyToParticipant(e));

    let session: CombatSession = createCombatSession(playerParticipant, enemyParticipants, ctx.bus);

    while (!session.isOver) {
        ui.clear();
        ui.setMenuLabel('COMBAT');

        const sessionPlayer = session.participants.find(p => p.isPlayer)!;
        const sessionEnemies = session.participants.filter(p => !p.isPlayer);

        ui.log(renderCombat(
            session.round,
            sessionPlayer.name,
            sessionPlayer.health,
            sessionPlayer.healthMax,
            sessionPlayer.magicka,
            sessionPlayer.magickaMax,
            sessionPlayer.stamina,
            sessionPlayer.staminaMax,
            sessionEnemies.map(e => ({
                name: e.name,
                hp: e.health,
                hpMax: e.healthMax,
                alive: e.isAlive,
                effects: e.activeStatusEffects.map(ef => ef.name),
            }))
        ));

        const recentLog = session.log.slice(-5);
        if (recentLog.length > 0) {
            ui.log(renderCombatLog(recentLog.map(e => ({
                text: e.action,
                isPlayer: e.actorId === 'player',
            }))));
        }

        const living = getLivingEnemies(session);
        if (living.length === 0) break;

        const combatChoices: UIChoice[] = [
            { name: chalk.hex('#555')('── Attack ──'), value: '__sep_attack__', disabled: 'sep' },
            ...living.map(e => ({
                name: chalk.red(`⚔ Strike ${e.name}`) + chalk.gray(` [${e.health}/${e.healthMax} HP]`),
                value: `attack:${e.entityId}`,
            })),
        ];

        // Magic section — only if player knows spells
        const playerSpells = player.knownSpells
            .map(id => ctx.content.spells.get(id))
            .filter((s): s is SpellDefinition => s !== undefined);

        if (playerSpells.length > 0) {
            combatChoices.push({ name: chalk.hex('#555')('── Magic ──'), value: '__sep_magic__', disabled: 'sep' });
            for (const spell of playerSpells) {
                const canCast = sessionPlayer.magicka >= spell.magickaCost;
                const mpLabel = chalk.blue(`[${spell.magickaCost} MP]`);
                const dmgLabel = spell.damage
                    ? chalk.red(` ${spell.damage} ${spell.damageType}`)
                    : spell.healAmount
                    ? chalk.green(` +${spell.healAmount} heal`)
                    : '';
                const baseLabel = `✦ ${spell.name} ${mpLabel}${dmgLabel}`;
                const noMpLabel = chalk.gray(`✦ ${spell.name} [${spell.magickaCost} MP] — out of magicka`);

                if (spell.range === 'self') {
                    combatChoices.push({
                        name: canCast ? baseLabel : noMpLabel,
                        value: `cast_self:${spell.id}`,
                        disabled: canCast ? false : 'no_mp',
                    });
                } else if (living.length === 1) {
                    // Single target — no need to repeat enemy name
                    combatChoices.push({
                        name: canCast ? baseLabel : noMpLabel,
                        value: `cast:${spell.id}:${living[0].entityId}`,
                        disabled: canCast ? false : 'no_mp',
                    });
                } else {
                    // Multiple targets — one entry per enemy
                    for (const enemy of living) {
                        combatChoices.push({
                            name: canCast
                                ? `${baseLabel} → ${enemy.name}`
                                : chalk.gray(`✦ ${spell.name} → ${enemy.name} — out of magicka`),
                            value: `cast:${spell.id}:${enemy.entityId}`,
                            disabled: canCast ? false : 'no_mp',
                        });
                    }
                }
            }
        }

        combatChoices.push(
            { name: chalk.hex('#555')('── Maneuver ──'), value: '__sep_maneuver__', disabled: 'sep' },
            { name: 'Block  ' + chalk.gray('(halves incoming damage this round)'), value: 'block' },
            { name: 'Dodge  ' + chalk.gray('(enemy attacks at disadvantage)'), value: 'dodge' },
            { name: chalk.dim('Sneak  (attempt to hide)'), value: 'sneak' },
            { name: chalk.yellow('Flee!'), value: 'flee' },
        );

        const combatAction = await ui.select(combatChoices);

        if (combatAction.startsWith('cast:') || combatAction.startsWith('cast_self:')) {
            // Spell cast — handled separately from executePlayerAction
            const isSelf = combatAction.startsWith('cast_self:');
            const parts = combatAction.split(':');
            const spellId = parts[1];
            const targetId = isSelf ? 'player' : parts[2];
            const spell = ctx.content.spells.get(spellId)!;

            session = executeSpellCast(session, spell, targetId, ctx);
            session = checkCombatEnd(session, ctx.bus);
            if (session.isOver) break;
        } else {
            let action: CombatAction;
            if (combatAction.startsWith('attack:')) {
                action = { type: 'attack', targetId: combatAction.slice(7) };
            } else {
                action = { type: combatAction as 'block' | 'dodge' | 'flee' | 'sneak' };
            }

            const equippedWeapon = player.equipment['weapon_main'];
            const weapon = equippedWeapon?.type === 'weapon' ? equippedWeapon : undefined;

            session = executePlayerAction(session, action, weapon, ctx.bus);
            session = checkCombatEnd(session, ctx.bus);
            if (session.isOver) break;
        }

        session = processEnemyActions(session, ctx.bus);
        session = processStatusEffects(session);
        session = checkCombatEnd(session, ctx.bus);
        if (session.isOver) break;

        session = advanceRound(session);
        await sleep(300);
    }

    await handleCombatEnd(ctx, session, enemies, baseEnemyTypeId);
}

async function handleCombatEnd(
    ctx: GameContext,
    session: CombatSession,
    _enemies: EnemyDefinition[],
    baseEnemyTypeId?: string
): Promise<void> {
    const sessionPlayer = session.participants.find(p => p.isPlayer)!;

    if (session.outcome === 'defeat') {
        ui.clear();
        ui.log(chalk.red.bold('\n  ══════════════════════════════════'));
        ui.log(chalk.red.bold('        You have fallen...'));
        ui.log(chalk.red.bold('  ══════════════════════════════════\n'));

        const choice = await ui.select([
            { name: 'Load Last Save', value: 'load' },
            { name: 'Return to Main Menu', value: 'menu' },
            { name: 'Quit', value: 'quit' },
        ]);

        if (choice === 'load') {
            const saves = listSaves();
            if (saves.length > 0) {
                ctx.gsm.loadState(loadGame(saves[0].filename));
            } else {
                await mainMenu(ctx);
            }
        } else if (choice === 'menu') {
            await mainMenu(ctx);
        } else {
            process.exit(0);
        }
        return;
    }

    if (session.outcome === 'fled') {
        ui.log(chalk.yellow('\n  You fled from battle.\n'));
        await ui.pressEnter();
        return;
    }

    // Victory
    ui.clear();
    ui.log(chalk.green.bold(`\n  ⚔ Victory! — ${session.round} round(s)\n`));

    ctx.gsm.mutatePlayer(p => ({
        ...p,
        attributes: {
            ...p.attributes,
            health: Math.max(1, sessionPlayer.health),
            stamina: Math.max(0, sessionPlayer.stamina),
            magicka: Math.max(0, sessionPlayer.magicka),
        },
    }));

    const hitsLanded = session.log.filter(
        l => l.actorId === 'player' && l.phase === 'player_action' && l.damageResult
    ).length;
    if (hitsLanded > 0) {
        ctx.gsm.mutatePlayer(p => {
            const { player } = grantSkillXP(p, 'one_handed', hitsLanded * 5, 'melee_hit', ctx.bus);
            return player;
        });
        const skill = ctx.gsm.getPlayer().skills['one_handed'];
        if (skill) {
            ui.log(renderNotification('info', `One-Handed +${hitsLanded * 5} XP (Level ${skill.level})`));
        }
    }

    const defeated = session.participants.filter(p => !p.isPlayer && !p.isAlive);
    const player = ctx.gsm.getPlayer();
    const goldReward = generateGoldReward(player.level, 5, 25, 2);
    ctx.gsm.mutatePlayer(p => ({ ...p, gold: p.gold + goldReward }));
    ui.log(renderNotification('item', `Found ${goldReward} gold on the fallen.`));

    for (const enemy of _enemies) {
        const lootList = ctx.content.leveledLists.get(enemy.lootTableId);
        if (lootList) {
            const drops = generateLoot(lootList, player.level);
            for (const drop of drops) {
                const item = ctx.content.items.get(drop.itemId);
                if (item) {
                    const addResult = addItem(ctx.gsm.getPlayer(), item, drop.quantity, `looted from ${enemy.name}`, ctx.bus);
                    if (addResult.success) {
                        ctx.gsm.mutatePlayer(() => addResult.data);
                        ui.log(renderNotification('item', `Found: ${item.name}${drop.quantity > 1 ? ` ×${drop.quantity}` : ''}`));
                    }
                }
            }
        }
    }

    for (const e of defeated) {
        ui.log(chalk.gray(`  ✓ Defeated: ${e.name}`));
    }

    const finalPlayer = ctx.gsm.getPlayer();
    if (finalPlayer.perkPoints > 0) {
        ui.log(renderNotification('level_up', `Level ${finalPlayer.level}! Perk point gained.`));
    }

    if (baseEnemyTypeId) {
        onEnemyKilled(ctx.gsm, ctx.bus, baseEnemyTypeId, ctx.content.quests);
    }
    flushNotifications(ctx);

    ui.log('');
    await ui.pressEnter();
}

// ============================================================
// TALK
// ============================================================

async function handleTalk(
    ctx: GameContext,
    npcId: string,
    location: LocationDefinition
): Promise<void> {
    ui.clear();

    const tree = Array.from(ctx.content.dialogueTrees.values()).find(t => t.speakerId === npcId);
    if (tree) {
        await runDialogueSession(ctx, tree);
    } else {
        const npcName = formatEntityName(npcId);
        const greeting = getNPCGreeting(npcId, location.type);
        ui.log(renderDialogue(npcName, greeting));
        ui.log(chalk.gray('  [This person has nothing special to say.]\n'));
        await ui.pressEnter();
    }

    onNpcTalkedTo(ctx.gsm, ctx.bus, npcId, ctx.content.quests);
    flushNotifications(ctx);
}

async function runDialogueSession(ctx: GameContext, tree: DialogueTree): Promise<void> {
    const buildCtx = (): DialogueContext => ({
        player: ctx.gsm.getPlayer() as PlayerState,
        quests: ctx.gsm.getQuests() as QuestState,
        factions: ctx.gsm.getFactions() as FactionState,
        flags: ctx.gsm.getWorld().worldFlags,
    });

    let session: DialogueSession = startDialogue(tree, ctx.bus);

    while (session.isActive) {
        const node = getCurrentNode(session);
        if (!node) break;

        const dialogueCtx = buildCtx();
        const availableOptions = getAvailableOptions(session, dialogueCtx);

        ui.clear();
        ui.log(renderDialogue(tree.speakerName, node.text));
        ui.log('');

        const choices: UIChoice[] = availableOptions.map(({ option, meetsConditions, skillCheckChance }) => {
            let label = option.text;
            if (skillCheckChance !== undefined) {
                label += chalk.gray(` (${Math.round(skillCheckChance * 100)}% success)`);
            }
            return {
                name: meetsConditions
                    ? `  ${label}`
                    : chalk.gray(`  [Locked] ${label}`),
                value: option.id,
                disabled: meetsConditions ? false : 'requires skill',
            };
        });
        choices.push({ name: chalk.gray('  [Leave]'), value: '__leave__' });

        ui.setMenuLabel(tree.speakerName);
        const chosenId = await ui.select(choices);
        if (chosenId === '__leave__') break;

        const result = selectOption(session, chosenId, dialogueCtx, ctx.bus);

        if (result.passed === false) {
            ui.log(chalk.red('\n  Your attempt fails...\n'));
            await sleep(1000);
            continue;
        }

        session = result.session;

        for (const effect of result.effects) {
            await applyDialogueEffect(ctx, effect);
        }
    }
}

async function applyDialogueEffect(ctx: GameContext, effect: DialogueEffect): Promise<void> {
    switch (effect.type) {
        case 'start_quest': {
            const questDef = ctx.content.quests.get(effect.questId);
            if (questDef && canStartQuest(ctx.gsm, questDef)) {
                startQuest(ctx.gsm, ctx.bus, questDef);
                flushNotifications(ctx);
            }
            break;
        }
        case 'advance_quest': {
            const questDef = ctx.content.quests.get(effect.questId);
            if (questDef) {
                advanceQuestStage(ctx.gsm, ctx.bus, effect.questId, questDef);
                flushNotifications(ctx);
            }
            break;
        }
        case 'open_trade': {
            const vendorDef = ctx.content.vendors.get(effect.vendorId)
                ?? Array.from(ctx.content.vendors.values()).find(v => v.npcId === effect.vendorId);
            if (vendorDef) {
                await handleTrade(ctx, vendorDef.id);
            }
            break;
        }
        case 'remove_gold': {
            ctx.gsm.mutatePlayer(p => ({ ...p, gold: Math.max(0, p.gold - effect.amount) }));
            ui.log(chalk.gray(`\n  [Paid ${effect.amount} gold]\n`));
            await sleep(500);
            break;
        }
        case 'give_gold': {
            ctx.gsm.mutatePlayer(p => ({ ...p, gold: p.gold + effect.amount }));
            ui.log(renderNotification('item', `Received ${effect.amount} gold.`));
            await sleep(500);
            break;
        }
        case 'give_item': {
            const item = ctx.content.items.get(effect.itemId);
            if (item) {
                const addResult = addItem(ctx.gsm.getPlayer(), item, effect.quantity, 'dialogue reward', ctx.bus);
                if (addResult.success) {
                    ctx.gsm.mutatePlayer(() => addResult.data);
                    ui.log(renderNotification('item', `Received: ${item.name}${effect.quantity > 1 ? ` ×${effect.quantity}` : ''}`));
                    await sleep(500);
                }
            }
            break;
        }
        case 'set_flag': {
            ctx.gsm.mutateWorld(w => ({
                ...w,
                worldFlags: { ...w.worldFlags, [effect.flagId]: effect.value },
            }));
            break;
        }
        case 'rest': {
            ctx.gsm.mutatePlayer(p => ({
                ...p,
                attributes: {
                    ...p.attributes,
                    health: p.attributes.healthMax,
                    stamina: p.attributes.staminaMax,
                    magicka: p.attributes.magickaMax,
                },
            }));
            ctx.gsm.mutateWorld(w => ({ ...w, currentTime: advanceTime(w.currentTime, effect.hours) }));
            ui.log(chalk.green(`\n  You sleep for ${effect.hours} hours and wake fully restored.\n`));
            await sleep(800);
            break;
        }
    }
}

// ============================================================
// TRADE
// ============================================================

async function handleTrade(ctx: GameContext, vendorId: string): Promise<void> {
    const vendorDef = ctx.content.vendors.get(vendorId);
    if (!vendorDef) return;

    while (true) {
        ui.clear();
        const player = ctx.gsm.getPlayer();
        const vendorState = getVendorState(vendorDef, ctx.gsm.getWorld());
        ui.setMenuLabel('TRADE');

        ui.log(chalk.hex('#FFD700').bold(`\n  ═══ ${vendorDef.name} ═══`));
        ui.log(chalk.gray(`  ${vendorDef.description ?? ''}\n`));
        ui.log(chalk.hex('#DAA520')(`  Your Gold: ${player.gold}g  │  Vendor Gold: ${vendorState.currentGold}g\n`));

        const action = await ui.select([
            { name: '🛒 Buy', value: 'buy' },
            { name: '💰 Sell', value: 'sell' },
            { name: chalk.gray('← Leave'), value: 'leave' },
        ]);

        if (action === 'leave') break;
        if (action === 'buy') await handleBuyMenu(ctx, vendorDef);
        else if (action === 'sell') await handleSellMenu(ctx, vendorDef);
    }
}

async function handleBuyMenu(ctx: GameContext, vendorDef: import('./core/types/vendor.types.js').VendorDefinition): Promise<void> {
    const vendorItems = getVendorInventory(vendorDef, ctx.content);
    if (vendorItems.length === 0) {
        ui.log(chalk.gray('\n  This vendor has nothing for sale.\n'));
        await ui.pressEnter();
        return;
    }

    // Group items by ID to show quantities
    const itemGroups = new Map<string, { item: typeof vendorItems[0]; quantity: number }>();
    for (const item of vendorItems) {
        const existing = itemGroups.get(item.id);
        if (existing) {
            existing.quantity++;
        } else {
            itemGroups.set(item.id, { item, quantity: 1 });
        }
    }

    const player = ctx.gsm.getPlayer();
    const groupedItems = Array.from(itemGroups.values());
    const itemChoices: UIChoice[] = groupedItems.map(({ item, quantity }, i) => {
        const price = getVendorBuyPrice(item, vendorDef, ctx.gsm, ctx.content.factions);
        const affordable = player.gold >= price;
        const priceStr = affordable
            ? chalk.hex('#FFD700')(`${price}g`)
            : chalk.red(`${price}g`);
        const qtyStr = quantity > 1 ? ` ${chalk.gray(`{${quantity}}`)}` : '';
        return {
            name: `${item.name}${qtyStr} ${chalk.gray(`[${item.weight}w]`)} — ${priceStr}`,
            value: i.toString(),
            disabled: affordable ? false : 'can\'t afford',
        };
    });
    itemChoices.push({ name: chalk.gray('← Back'), value: 'back' });

    const idx = await ui.select(itemChoices);
    if (idx === 'back') return;

    const { item } = groupedItems[parseInt(idx)];
    const result = buyFromVendor(ctx.gsm, ctx.bus, vendorDef, item, 1, ctx.content.factions);
    if (result.success) {
        ui.log(chalk.green(`\n  ${result.message}\n`));
    } else {
        ui.log(chalk.red(`\n  ${result.message}\n`));
    }
    await sleep(600);
}

async function handleSellMenu(ctx: GameContext, vendorDef: import('./core/types/vendor.types.js').VendorDefinition): Promise<void> {
    const sellable = getPlayerSellableItems(ctx.gsm, vendorDef);
    if (sellable.length === 0) {
        ui.log(chalk.gray('\n  You have nothing to sell.\n'));
        await ui.pressEnter();
        return;
    }

    const itemChoices: UIChoice[] = sellable.map((entry, i) => {
        const price = getVendorSellPrice(entry.item, vendorDef, ctx.gsm, ctx.content.factions);
        const qtyNote = entry.quantity > 1 ? ` ×${entry.quantity}` : '';
        return {
            name: `${entry.item.name}${qtyNote} ${chalk.gray(`[${entry.item.weight}w]`)} — ${chalk.hex('#FFD700')(`${price}g`)}`,
            value: i.toString(),
        };
    });
    itemChoices.push({ name: chalk.gray('← Back'), value: 'back' });

    const idx = await ui.select(itemChoices);
    if (idx === 'back') return;

    const entry = sellable[parseInt(idx)];
    const result = sellToVendor(ctx.gsm, ctx.bus, vendorDef, entry.item, 1, ctx.content.factions);
    if (result.success) {
        ui.log(chalk.green(`\n  ${result.message}\n`));
    } else {
        ui.log(chalk.red(`\n  ${result.message}\n`));
    }
    await sleep(600);
}

// ============================================================
// LOOT
// ============================================================

async function handleLoot(ctx: GameContext, containerId: string): Promise<void> {
    const locationId = ctx.gsm.getPlayer().currentLocationId;
    const instance = ctx.gsm.getWorld().locations[locationId];

    // Already looted — container is empty
    if (instance?.containers[containerId]) {
        ui.clear();
        ui.log(chalk.gray(`\n  You search ${formatEntityName(containerId)} again... but find nothing.\n`));
        await ui.pressEnter();
        return;
    }

    ui.clear();
    ui.log(chalk.hex('#DAA520').bold(`\n  Searching ${formatEntityName(containerId)}...\n`));

    const goldAmount = containerId.includes('chest')
        ? Math.floor(Math.random() * 50) + 10
        : Math.floor(Math.random() * 20) + 3;

    ctx.gsm.mutatePlayer(p => ({ ...p, gold: p.gold + goldAmount }));
    ui.log(renderNotification('item', `Found ${goldAmount} gold.`));

    // Roll item drops from leveled lists based on container type
    const containerLootTables: Record<string, string> = {
        bandit_chest: 'dungeon_chest',
        draugr_coffin_loot: 'draugr_loot',
        overlord_chest: 'boss_draugr_loot',
    };
    const lootTableId = containerLootTables[containerId];
    if (lootTableId) {
        const lootList = ctx.content.leveledLists.get(lootTableId);
        if (lootList) {
            const drops = generateLoot(lootList, ctx.gsm.getPlayer().level);
            for (const drop of drops) {
                const item = ctx.content.items.get(drop.itemId);
                if (item) {
                    const addResult = addItem(ctx.gsm.getPlayer(), item, drop.quantity, `found in ${formatEntityName(containerId)}`, ctx.bus);
                    if (addResult.success) {
                        ctx.gsm.mutatePlayer(() => addResult.data);
                        ui.log(renderNotification('item', `Found: ${item.name}${drop.quantity > 1 ? ` ×${drop.quantity}` : ''}`));
                    }
                }
            }
        }
    }

    // Quest: Golden Claw hidden in draugr containers
    const activeQuests = ctx.gsm.getQuests().activeQuests;
    const isClawStage = activeQuests['golden_claw']?.currentStageId === 'stage_find_claw';
    const isBarrowContainer = containerId === 'draugr_coffin_loot' || containerId === 'overlord_chest';
    if (isClawStage && isBarrowContainer) {
        ui.log(renderNotification('item', 'Found: Golden Claw! (quest item)'));
        onItemCollected(ctx.gsm, ctx.bus, 'golden_claw_key', ctx.content.quests);
    }

    // Mark container as emptied — persists through saves
    ctx.gsm.mutateWorld(w => {
        const loc = w.locations[locationId] ?? {
            definitionId: locationId, visited: true, visitCount: 1,
            containers: {}, clearedEnemies: [], discoveredExits: [], flags: {},
        };
        return {
            ...w,
            locations: {
                ...w.locations,
                [locationId]: {
                    ...loc,
                    containers: {
                        ...loc.containers,
                        [containerId]: { containerId, locked: false, items: [], maxWeight: 0 },
                    },
                },
            },
        };
    });

    flushNotifications(ctx);
    ui.log('');
    await ui.pressEnter();
}

// ============================================================
// INSPECT
// ============================================================

async function handleInspect(_ctx: GameContext, entityId: string): Promise<void> {
    ui.clear();
    const name = formatEntityName(entityId);
    ui.log('');
    ui.log(renderDivider(name));
    ui.log('');

    const descriptions: Record<string, string> = {
        word_wall_unrelenting_force:
            'The Word Wall towers before you, carved from ancient stone. Dragon script glows with a faint blue light — ' +
            'a Word of Power is encoded here.\n\n  Word: FUS (Force) — the first word of Unrelenting Force.\n\n  ' +
            chalk.gray('[You sense the word burning itself into your mind...]'),
    };

    ui.log(chalk.gray(`  ${descriptions[entityId] ?? `You examine the ${name}. Nothing immediately stands out.`}`));
    ui.log('');
    await ui.pressEnter();
}

// ============================================================
// REST
// ============================================================

async function handleRest(ctx: GameContext): Promise<void> {
    const player = ctx.gsm.getPlayer();
    const locationType = ctx.content.locations.get(player.currentLocationId)?.type ?? 'road';
    const isUnsafe = ['dungeon', 'cave', 'wilderness', 'road'].includes(locationType);

    if (isUnsafe) {
        ui.log(chalk.yellow('\n  You rest warily — this is not a safe place.\n'));
    } else {
        ui.log(chalk.gray('\n  You rest for an hour...\n'));
    }
    await sleep(700);

    ctx.gsm.mutatePlayer(p => {
        const { health, healthMax, stamina, staminaMax, magicka, magickaMax } = p.attributes;
        return {
            ...p,
            attributes: {
                ...p.attributes,
                health: Math.min(healthMax, health + Math.floor(healthMax * 0.15)),
                stamina: Math.min(staminaMax, stamina + Math.floor(staminaMax * 0.25)),
                magicka: Math.min(magickaMax, magicka + Math.floor(magickaMax * 0.15)),
            },
        };
    });

    ctx.gsm.mutateWorld(w => ({
        ...w,
        currentTime: advanceTime(w.currentTime, 1),
    }));

    ui.log(chalk.green('  You feel refreshed.\n'));
    await sleep(400);
}

// ============================================================
// INVENTORY
// ============================================================

async function handleInventory(ctx: GameContext): Promise<void> {
    while (true) {
        ui.clear();
        const player = ctx.gsm.getPlayer();
        const items = player.inventory.items;
        const currentWeight = getInventoryWeight(items);
        ui.setMenuLabel('INVENTORY');

        const equippedIds = new Set<string>(
            Object.values(player.equipment)
                .filter((i): i is NonNullable<typeof i> => i != null)
                .map(i => i.id)
        );

        const displayItems = items.map(({ item, quantity }) => ({
            name: item.name,
            quantity,
            weight: item.weight,
            equipped: equippedIds.has(item.id),
        }));

        ui.log(renderInventory(displayItems, currentWeight, player.inventory.maxWeight, player.gold));

        if (items.length === 0) {
            ui.log(chalk.gray('  Nothing to show.\n'));
            await ui.pressEnter();
            break;
        }

        const itemChoices: UIChoice[] = items.map(({ item, quantity }, i) => ({
            name: `${item.name}${quantity > 1 ? ` ×${quantity}` : ''}${equippedIds.has(item.id) ? chalk.green(' [E]') : ''} ${chalk.gray(`[${item.weight}w]`)}`,
            value: i.toString(),
        }));
        itemChoices.push({ name: chalk.gray('← Back'), value: 'back' });

        const idx = await ui.select(itemChoices);
        if (idx === 'back') break;

        const { item } = items[parseInt(idx)];
        const isEquipped = equippedIds.has(item.id);

        const actionChoices: UIChoice[] = [];
        if (item.type === 'weapon' || item.type === 'armor') {
            actionChoices.push({ name: isEquipped ? 'Unequip' : 'Equip', value: 'equip' });
        }
        if (item.type === 'potion') {
            actionChoices.push({ name: 'Use', value: 'use' });
        }
        actionChoices.push({ name: chalk.gray('← Back'), value: 'back' });

        ui.setMenuLabel(item.name);
        const itemAction = await ui.select(actionChoices);
        if (itemAction === 'back') continue;

        if (itemAction === 'equip') {
            const currentPlayer = ctx.gsm.getPlayer();
            if (isEquipped) {
                const slot = findSlotForItem(currentPlayer.equipment, item.id);
                if (slot) {
                    const result = unequipItem(currentPlayer, slot as EquipmentSlot, ctx.bus);
                    if (result.success) {
                        ctx.gsm.mutatePlayer(() => result.data);
                        ui.log(chalk.green(`\n  Unequipped ${item.name}.\n`));
                    }
                }
            } else {
                const result = equipItem(currentPlayer, item.id, ctx.bus);
                if (result.success) {
                    ctx.gsm.mutatePlayer(() => result.data);
                    ui.log(chalk.green(`\n  Equipped ${item.name}.\n`));
                } else {
                    ui.log(chalk.red(`\n  Cannot equip: ${result.error}\n`));
                }
            }
            await sleep(500);
        } else if (itemAction === 'use' && item.type === 'potion') {
            const magnitude = item.magnitude ?? 30;
            ctx.gsm.mutatePlayer(p => {
                const { health, healthMax, stamina, staminaMax, magicka, magickaMax } = p.attributes;
                let newAttrs = p.attributes;
                switch (item.effect) {
                    case 'restore_health':
                        newAttrs = { ...newAttrs, health: Math.min(healthMax, health + magnitude) };
                        break;
                    case 'restore_stamina':
                        newAttrs = { ...newAttrs, stamina: Math.min(staminaMax, stamina + magnitude) };
                        break;
                    case 'restore_magicka':
                        newAttrs = { ...newAttrs, magicka: Math.min(magickaMax, magicka + magnitude) };
                        break;
                }
                const updatedItems = p.inventory.items
                    .map(e => e.item.id === item.id
                        ? { ...e, quantity: e.quantity - 1 }
                        : e
                    )
                    .filter(e => e.quantity > 0);
                return {
                    ...p,
                    attributes: newAttrs,
                    inventory: { ...p.inventory, items: updatedItems },
                };
            });
            ui.log(chalk.green(`\n  Used ${item.name}. Restored ${magnitude} ${item.effect.replace('restore_', '')}.\n`));
            await sleep(600);
        }
    }
}

// ============================================================
// CHARACTER SHEET
// ============================================================

async function handleCharacterSheet(ctx: GameContext): Promise<void> {
    while (true) {
        ui.clear();
        const player = ctx.gsm.getPlayer();
        const { health, healthMax, stamina, staminaMax, magicka, magickaMax } = player.attributes;
        ui.setMenuLabel('CHARACTER');

        const skills = Object.entries(player.skills).map(([id, s]) => ({
            name: id.replace(/_/g, ' '),
            level: s.level,
        }));

        ui.log(renderCharacterSheet(
            player.name,
            player.race,
            player.level,
            health, healthMax,
            magicka, magickaMax,
            stamina, staminaMax,
            skills,
            player.perks,
            player.perkPoints,
        ));

        const equipEntries = Object.entries(player.equipment).filter(([, item]) => item != null);
        if (equipEntries.length > 0) {
            ui.log(chalk.hex('#DAA520')('  Equipped:'));
            for (const [slot, item] of equipEntries) {
                if (item) {
                    ui.log(chalk.gray(`    ${slot.replace(/_/g, ' ').padEnd(14)} ${item.name}`));
                }
            }
            ui.log('');
        }

        if (player.perks.length > 0) {
            ui.log(chalk.hex('#DAA520')('  Acquired Perks:'));
            for (const perkId of player.perks) {
                const perkDef = ctx.content.perks.get(perkId);
                if (perkDef) {
                    ui.log(chalk.gray(`    ✓ ${perkDef.name} — ${perkDef.description}`));
                }
            }
            ui.log('');
        }

        const menuChoices: UIChoice[] = [];
        if (player.perkPoints > 0) {
            menuChoices.push({
                name: chalk.hex('#FFD700')(`★ Spend Perk Points (${player.perkPoints} available)`),
                value: 'perks',
            });
        }
        menuChoices.push({ name: chalk.gray('← Back'), value: 'back' });

        const sheetAction = await ui.select(menuChoices);
        if (sheetAction === 'back') break;
        if (sheetAction === 'perks') await handlePerkBrowser(ctx);
    }
}

async function handlePerkBrowser(ctx: GameContext): Promise<void> {
    const trees = getAvailablePerkTrees(ctx.content.perks);
    if (trees.length === 0) {
        ui.log(chalk.gray('\n  No perk trees available.\n'));
        await ui.pressEnter();
        return;
    }

    while (true) {
        const player = ctx.gsm.getPlayer();
        if (player.perkPoints <= 0) {
            ui.log(chalk.gray('\n  No perk points remaining.\n'));
            await sleep(600);
            return;
        }

        ui.clear();
        ui.setMenuLabel('PERK TREES');
        ui.log(chalk.hex('#FFD700').bold(`\n  ═══ Perk Trees ═══`));
        ui.log(chalk.hex('#DAA520')(`  Perk Points: ${player.perkPoints}\n`));

        const treeChoices: UIChoice[] = trees.map(tree => {
            const skillLevel = player.skills[tree]?.level ?? 0;
            const acquired = getPerkTree(player, tree, ctx.content.perks).filter(e => e.acquired).length;
            const total = getPerkTree(player, tree, ctx.content.perks).length;
            return {
                name: `${tree.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} ${chalk.gray(`(Lv ${skillLevel})`)} — ${chalk.gray(`${acquired}/${total} perks`)}`,
                value: tree,
            };
        });
        treeChoices.push({ name: chalk.gray('← Back'), value: 'back' });

        const treeId = await ui.select(treeChoices);
        if (treeId === 'back') return;

        const perks = getPerkTree(player, treeId as SkillId, ctx.content.perks);
        ui.clear();
        const treeName = (treeId as string).replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
        ui.setMenuLabel(treeName);
        ui.log(chalk.hex('#FFD700').bold(`\n  ═══ ${treeName} Perks ═══\n`));

        const perkChoices: UIChoice[] = perks.map(entry => {
            let prefix: string;
            let nameStr: string;
            if (entry.acquired) {
                prefix = chalk.green('✓');
                nameStr = chalk.green(entry.perkDef.name);
            } else if (entry.eligible) {
                prefix = chalk.hex('#FFD700')('○');
                nameStr = chalk.hex('#FFD700')(entry.perkDef.name);
            } else {
                prefix = chalk.gray('✗');
                nameStr = chalk.gray(entry.perkDef.name);
            }
            const desc = chalk.gray(` — ${entry.perkDef.description}`);
            const disabledReason = entry.acquired ? 'acquired' : (entry.eligible ? false : (entry.reason ?? 'locked'));
            return {
                name: `${prefix} ${nameStr}${desc}`,
                value: entry.perkDef.id,
                disabled: disabledReason,
            };
        });
        perkChoices.push({ name: chalk.gray('← Back'), value: 'back' });

        const perkId = await ui.select(perkChoices);
        if (perkId === 'back') continue;

        const perkDef = ctx.content.perks.get(perkId);
        if (perkDef) {
            const result = acquirePerk(ctx.gsm, ctx.bus, perkDef, ctx.content.perks);
            if (result.success) {
                ui.log(chalk.green(`\n  ${result.message}\n`));
            } else {
                ui.log(chalk.red(`\n  ${result.message}\n`));
            }
            flushNotifications(ctx);
            await sleep(800);
        }
    }
}

// ============================================================
// QUEST JOURNAL
// ============================================================

async function handleQuestJournal(ctx: GameContext): Promise<void> {
    ui.clear();
    ui.setMenuLabel('JOURNAL');
    ui.log('');
    ui.log(chalk.hex('#FFD700').bold('  ═══ Quest Journal ═══\n'));

    const activeQuests = getActiveQuestList(ctx.gsm, ctx.content.quests);
    const completedIds = ctx.gsm.getQuests().completedQuests;
    const failedIds = ctx.gsm.getQuests().failedQuests;

    if (activeQuests.length === 0 && completedIds.length === 0) {
        ui.log(chalk.gray('  No quests yet. Speak to NPCs or explore to find work.\n'));
        await ui.pressEnter();
        return;
    }

    if (activeQuests.length > 0) {
        ui.log(chalk.cyan('  ── Active Quests ──\n'));
        for (const { def, instance, currentStage } of activeQuests) {
            const typeTag = chalk.gray(`[${def.type}]`);
            ui.log(chalk.bold(`  ◆ ${def.title}`) + ' ' + typeTag);
            ui.log(chalk.gray(`    ${def.description}`));
            if (currentStage) {
                ui.log(chalk.hex('#DAA520')(`\n    Stage: ${currentStage.description}`));
                const progressLines = getObjectiveProgressText(instance, currentStage);
                for (const line of progressLines) {
                    ui.log(chalk.gray(`      ${line}`));
                }
            }
            ui.log('');
        }
    }

    if (completedIds.length > 0) {
        ui.log(chalk.gray('  ── Completed ──\n'));
        for (const qId of completedIds) {
            const def = ctx.content.quests.get(qId);
            ui.log(chalk.green(`  ✓ ${def?.title ?? qId}`));
        }
        ui.log('');
    }

    if (failedIds.length > 0) {
        ui.log(chalk.red('  ── Failed ──\n'));
        for (const qId of failedIds) {
            const def = ctx.content.quests.get(qId);
            ui.log(chalk.red(`  ✗ ${def?.title ?? qId}`));
        }
        ui.log('');
    }

    await ui.pressEnter();
}

// ============================================================
// SAVE
// ============================================================

async function handleSave(ctx: GameContext): Promise<void> {
    const player = ctx.gsm.getPlayer();
    const defaultName = `${player.name.toLowerCase().replace(/\s+/g, '_')}_lv${player.level}`;

    const saveName = await ui.input('Save name:', defaultName);
    const state = JSON.parse(ctx.gsm.snapshot());
    saveGame(state, saveName.trim() || defaultName);
    ui.log(chalk.green(`\n  Saved as "${saveName}".\n`));
    await sleep(700);
}

// ============================================================
// HELPERS
// ============================================================

function flushNotifications(ctx: GameContext): void {
    if (ctx.notifications.length === 0) return;
    ui.log('');
    for (const n of ctx.notifications) {
        ui.log(n);
    }
    ctx.notifications.splice(0);
}

function formatEntityName(entityId: string): string {
    const nameMap: Record<string, string> = {
        whiterun_guard: 'Whiterun Guard',
        belethor: 'Belethor',
        hulda_innkeeper: 'Hulda (Innkeeper)',
        word_wall_unrelenting_force: 'Word Wall (Unrelenting Force)',
        bandit_chest: 'Bandit Chest',
        innkeeper_provisions: 'Provisions Crate',
        draugr_coffin_loot: 'Draugr Coffin',
        overlord_chest: 'Ancient Chest',
    };
    return nameMap[entityId] ?? entityId
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

function getNPCGreeting(npcId: string, locationType: string): string {
    const greetings: Record<string, string> = {
        whiterun_guard: 'Halt! State your business in Whiterun. ...Hmph. Carry on, then.',
        belethor: "Welcome to Belethor's General Goods! I'll buy your treasures and sell you my own. What'll it be?",
        hulda_innkeeper: 'Welcome to the Bannered Mare, traveller! Looking for a warm room and a hot meal?',
    };
    const isDark = ['dungeon', 'cave', 'ruins'].includes(locationType);
    return greetings[npcId] ?? `Greetings, stranger. ${isDark ? 'You should not be here alone.' : 'Troubled times, these are.'}`;
}

function findSlotForItem(equipment: PlayerState['equipment'], itemId: string): string | null {
    for (const [slot, item] of Object.entries(equipment)) {
        if (item?.id === itemId) return slot;
    }
    return null;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
