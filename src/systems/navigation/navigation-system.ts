// ============================================================
// Schyrim Systems — Navigation System
// World as a location graph, movement, time, context actions
// ============================================================

import type { LocationDefinition, LocationInstance, GameTime, TimePeriod, WorldState } from '../../core/types/location.types.js';
import type { SystemResult } from '../../core/types/game-state.types.js';
import { ErrorCode } from '../../core/types/game-state.types.js';
import { EventBus } from '../../core/event-bus.js';
import { GameEventType } from '../../core/types/events.types.js';

/**
 * Get the current location definition.
 */
export function getCurrentLocation(
    locationId: string,
    locationDefs: Map<string, LocationDefinition>
): LocationDefinition | undefined {
    return locationDefs.get(locationId);
}

/**
 * Get available exits for the current location, respecting locks and visibility.
 */
export function getAvailableExits(
    location: LocationDefinition,
    locationInstance: LocationInstance | undefined,
    playerItemIds: string[]
): Array<{ direction: string; targetId: string; travelTime: number; description?: string; locked: boolean; canUnlock: boolean }> {
    return location.exits.map(exit => {
        const isHidden = exit.hidden && !(locationInstance?.discoveredExits.includes(exit.targetLocationId));
        if (isHidden) return null;

        const locked = exit.locked ?? false;
        const canUnlock = locked ? (exit.keyItemId ? playerItemIds.includes(exit.keyItemId) : false) : true;

        return {
            direction: exit.direction,
            targetId: exit.targetLocationId,
            travelTime: exit.travelTime,
            description: exit.description,
            locked,
            canUnlock,
        };
    }).filter((e): e is NonNullable<typeof e> => e !== null);
}

/**
 * Move to a target location.
 */
export function moveTo(
    currentLocationId: string,
    targetLocationId: string,
    locationDefs: Map<string, LocationDefinition>,
    worldState: WorldState,
    playerItemIds: string[],
    eventBus?: EventBus
): SystemResult<{ newLocationId: string; worldState: WorldState; travelTime: number; isNewDiscovery: boolean }> {
    const currentLocation = locationDefs.get(currentLocationId);
    if (!currentLocation) {
        return { success: false, error: 'Current location not found.', code: ErrorCode.INVALID_EXIT };
    }

    const exit = currentLocation.exits.find(e => e.targetLocationId === targetLocationId);
    if (!exit) {
        return { success: false, error: 'No path to that location from here.', code: ErrorCode.INVALID_EXIT };
    }

    // Check if locked
    if (exit.locked && exit.keyItemId && !playerItemIds.includes(exit.keyItemId)) {
        return { success: false, error: `The way is locked. You need: ${exit.keyItemId}`, code: ErrorCode.TRAVEL_BLOCKED };
    }

    // Check target exists
    const targetLocation = locationDefs.get(targetLocationId);
    if (!targetLocation) {
        return { success: false, error: 'Destination not found.', code: ErrorCode.INVALID_EXIT };
    }

    // Update world state: advance time, update location instance
    const updatedTime = advanceTime(worldState.currentTime, exit.travelTime);
    const isNewDiscovery = !worldState.discoveredLocations.includes(targetLocationId);

    // Create or update location instance
    const locationInstances = { ...worldState.locations };
    if (!locationInstances[targetLocationId]) {
        locationInstances[targetLocationId] = {
            definitionId: targetLocationId,
            visited: true,
            visitCount: 1,
            containers: {},
            clearedEnemies: [],
            discoveredExits: [],
            flags: {},
        };
    } else {
        locationInstances[targetLocationId] = {
            ...locationInstances[targetLocationId],
            visited: true,
            visitCount: locationInstances[targetLocationId].visitCount + 1,
            lastVisitTime: updatedTime,
        };
    }

    const updatedDiscovered = isNewDiscovery
        ? [...worldState.discoveredLocations, targetLocationId]
        : worldState.discoveredLocations;

    const newWorldState: WorldState = {
        ...worldState,
        currentTime: updatedTime,
        locations: locationInstances,
        discoveredLocations: updatedDiscovered,
    };

    // Emit events
    if (eventBus) {
        eventBus.emit(GameEventType.LOCATION_EXITED, { locationId: currentLocationId });
        eventBus.emit(GameEventType.LOCATION_ENTERED, {
            locationId: targetLocationId,
            locationName: targetLocation.name,
            locationType: targetLocation.type,
        });
        if (isNewDiscovery) {
            eventBus.emit(GameEventType.LOCATION_DISCOVERED, {
                locationId: targetLocationId,
                locationName: targetLocation.name,
            });
        }
        eventBus.emit(GameEventType.TIME_ADVANCED, {
            oldPeriod: worldState.currentTime.period,
            newPeriod: updatedTime.period,
            hoursAdvanced: exit.travelTime,
        });
    }

    return {
        success: true,
        data: {
            newLocationId: targetLocationId,
            worldState: newWorldState,
            travelTime: exit.travelTime,
            isNewDiscovery,
        },
    };
}

/**
 * Advance game time by a number of hours.
 */
export function advanceTime(current: GameTime, hours: number): GameTime {
    let totalMinutes = (current.day - 1) * 24 * 60 + current.hour * 60 + current.minute;
    totalMinutes += hours * 60;

    const day = Math.floor(totalMinutes / (24 * 60)) + 1;
    const remainingMinutes = totalMinutes % (24 * 60);
    const hour = Math.floor(remainingMinutes / 60);
    const minute = remainingMinutes % 60;
    const period = getTimePeriod(hour);

    return { day, hour, minute, period };
}

/**
 * Get the time period from hour.
 */
export function getTimePeriod(hour: number): TimePeriod {
    if (hour >= 5 && hour < 8) return 'dawn';
    if (hour >= 8 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
}

/**
 * Format current time for display.
 */
export function formatTime(time: GameTime): string {
    const hourStr = time.hour.toString().padStart(2, '0');
    const minStr = time.minute.toString().padStart(2, '0');
    const periodNames: Record<TimePeriod, string> = {
        dawn: '🌅 Dawn',
        morning: '☀️ Morning',
        afternoon: '🌤 Afternoon',
        evening: '🌆 Evening',
        night: '🌙 Night',
    };
    return `Day ${time.day}, ${hourStr}:${minStr} — ${periodNames[time.period]}`;
}

/**
 * Format a location for display.
 */
export function formatLocationDisplay(
    location: LocationDefinition,
    instance: LocationInstance | undefined,
    time: GameTime
): string {
    const lines: string[] = [];
    const firstVisit = !instance || instance.visitCount <= 1;

    lines.push(`━━━ ${location.name} ━━━`);
    lines.push(formatTime(time));
    lines.push('');
    lines.push(firstVisit && location.detailedDescription ? location.detailedDescription : location.description);
    lines.push('');

    return lines.join('\n');
}

/**
 * Get context-sensitive actions for a location.
 */
export function getContextActions(location: LocationDefinition): string[] {
    const actions: string[] = [];

    for (const entity of location.entities) {
        switch (entity.type) {
            case 'npc':
                actions.push(`talk ${entity.entityId}`);
                break;
            case 'enemy':
                actions.push(`attack ${entity.entityId}`);
                break;
            case 'container':
                actions.push(`loot ${entity.entityId}`);
                break;
            case 'crafting_station':
                actions.push(`use ${entity.entityId}`);
                break;
            case 'interactable':
                actions.push(`inspect ${entity.entityId}`);
                break;
        }
    }

    return actions;
}

/**
 * Check for random encounter during travel.
 */
export function checkRandomEncounter(
    dangerLevel: number,
    encounterFrequency: number,
    _playerLevel: number
): { encounterTriggered: boolean; encounterType?: string } {
    const chance = (dangerLevel / 10) * encounterFrequency * 0.3;
    if (Math.random() < chance) {
        // Select encounter type based on danger level
        const types = dangerLevel > 6
            ? ['bandits', 'draugr', 'wolves', 'frost_troll']
            : ['wolves', 'bandits', 'traveling_merchant', 'patrol'];

        const encounterType = types[Math.floor(Math.random() * types.length)];
        return { encounterTriggered: true, encounterType };
    }
    return { encounterTriggered: false };
}
