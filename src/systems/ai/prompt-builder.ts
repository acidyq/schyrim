// ============================================================
// Schyrim — AI Prompt Builder
// Serialises live game state into structured prompts for LLMs.
// ============================================================

import type { GameStateManager } from '../../core/game-state.js';
import type { ContentRegistry } from '../../content-registry.js';
import type { GameContextSnapshot, StructuredPrompt } from '../../core/types/ai.types.js';
import type { GameTime } from '../../core/types/location.types.js';

// ============================================================
// SYSTEM IDENTITY MESSAGE
// ============================================================

const SYSTEM_MESSAGE = `You are the atmospheric narrator for SCHYRIM — a dark Nordic fantasy RPG inspired by The Elder Scrolls. Your only job right now is to write a vivid, immersive scene description (2-3 sentences maximum) for the location the player has just entered. Use present tense. Focus on what the player sees, hears, and smells. Match the tone: ancient, slightly grim, grounded, poetic but never overwrought. Do NOT mention game mechanics, stats, or inventory. Do NOT greet the player. Do NOT break the fourth wall. Write only the description — nothing else.`;

const RULES_BLOCK = `- Maximum 3 sentences
- Present tense throughout
- Sensory language: sight, sound, smell, touch
- Match tone to location type: dungeons are dread, inns are warm, road is exposed
- Weave in time of day naturally (do not state it explicitly)
- If hostiles are present, convey unease or imminent threat
- If a quest is active, let it subtly colour the mood
- No greetings, no second-person address, no "you see..."
- Pure prose — no bullet points, no labels, no markdown`;

// ============================================================
// SNAPSHOT BUILDER
// ============================================================

/**
 * Serialises the current game state into a GameContextSnapshot
 * suitable for inclusion in an AI prompt.
 */
export function buildGameContextSnapshot(
    gsm: GameStateManager,
    content: ContentRegistry,
): GameContextSnapshot {
    const player = gsm.getPlayer();
    const world = gsm.getWorld();
    const quests = gsm.getQuests();
    const locationDef = content.locations.get(player.currentLocationId);
    const locInstance = world.locations[player.currentLocationId];

    // Active quest titles (short list)
    const activeQuestNames = Object.keys(quests.activeQuests)
        .map(id => content.quests.get(id)?.title ?? id)
        .slice(0, 3); // cap at 3

    // Equipment summary
    const weaponItem = player.equipment['weapon_main'];
    const chestItem = player.equipment['chest'];

    // Build entity lists from location definition
    const clearedEnemies = locInstance?.clearedEnemies ?? [];
    const npcs: string[] = [];
    const enemies: string[] = [];
    const containers: string[] = [];
    const interactables: string[] = [];

    if (locationDef) {
        const seenEnemies = new Set<string>();
        const seenNpcs = new Set<string>();

        for (const entity of locationDef.entities) {
            if (entity.type === 'enemy' && !clearedEnemies.includes(entity.entityId)) {
                const def = content.enemies.get(entity.entityId);
                if (def && !seenEnemies.has(def.name)) {
                    enemies.push(def.name);
                    seenEnemies.add(def.name);
                }
            } else if (entity.type === 'npc') {
                if (!seenNpcs.has(entity.entityId)) {
                    npcs.push(humaniseName(entity.entityId));
                    seenNpcs.add(entity.entityId);
                }
            } else if (entity.type === 'container') {
                containers.push(entity.entityId);
            } else if (entity.type === 'interactable') {
                interactables.push(entity.entityId);
            }
        }
    }

    // Recent events from event bus history (simplified — just use active quest list)
    const recentEvents: string[] = activeQuestNames.map(q => `Active quest: ${q}`);

    return {
        location: {
            name: locationDef?.name ?? player.currentLocationId,
            type: locationDef?.type ?? 'unknown',
            description: locationDef?.description ?? '',
            exits: (locationDef?.exits ?? [])
                .map(e => content.locations.get(e.targetLocationId)?.name ?? e.targetLocationId)
                .slice(0, 4),
            time: formatTimeForAI(world.currentTime),
            weather: world.weather.current,
        },
        player: {
            name: player.name,
            race: player.race,
            level: player.level,
            health: `${player.attributes.health}/${player.attributes.healthMax}`,
            stamina: `${player.attributes.stamina}/${player.attributes.staminaMax}`,
            magicka: `${player.attributes.magicka}/${player.attributes.magickaMax}`,
            equippedWeapon: weaponItem?.name ?? 'unarmed',
            equippedArmor: chestItem?.name ?? 'none',
            notableItems: [],
            activeQuests: activeQuestNames,
            gold: player.gold,
        },
        nearbyEntities: { npcs, enemies, containers, interactables },
        recentEvents,
    };
}

// ============================================================
// PROMPT BUILDER
// ============================================================

/**
 * Builds a complete StructuredPrompt from a game context snapshot.
 * The prompt is designed to elicit a 2-3 sentence atmospheric description.
 */
export function buildScenePrompt(snapshot: GameContextSnapshot): StructuredPrompt {
    const { location, player, nearbyEntities } = snapshot;

    const lines: string[] = [
        `Location: ${location.name} (${location.type})`,
        `Time: ${location.time} | Weather: ${location.weather}`,
    ];

    if (nearbyEntities.enemies.length > 0) {
        lines.push(`Hostiles present: ${nearbyEntities.enemies.join(', ')}`);
    }

    if (nearbyEntities.npcs.length > 0) {
        lines.push(`NPCs present: ${nearbyEntities.npcs.join(', ')}`);
    }

    if (player.activeQuests.length > 0) {
        lines.push(`Player quest: ${player.activeQuests[0]}`);
    }

    lines.push(`Player: ${player.name} the ${player.race}, Lv.${player.level}`);
    lines.push(`Context: ${location.description}`);

    const playerMessage = lines.join('\n') + '\n\nDescribe this scene.';

    return {
        systemMessage: SYSTEM_MESSAGE,
        contextBlock: snapshot,
        rulesBlock: RULES_BLOCK,
        playerMessage,
    };
}

// ============================================================
// LOCAL HELPERS
// ============================================================

function formatTimeForAI(time: GameTime): string {
    const h = time.hour;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const periodNames: Record<string, string> = {
        morning: 'Morning',
        afternoon: 'Afternoon',
        evening: 'Evening',
        night: 'Night',
        dawn: 'Dawn',
        dusk: 'Dusk',
        midnight: 'Midnight',
    };
    const period = periodNames[time.period] ?? time.period;
    return `${hour12}:00 ${suffix} (${period})`;
}

function humaniseName(entityId: string): string {
    const map: Record<string, string> = {
        whiterun_guard: 'a Whiterun Guard',
        belethor: 'Belethor the merchant',
        hulda_innkeeper: 'Hulda, the innkeeper',
    };
    return map[entityId] ?? entityId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
