// ============================================================
// Schyrim Tests — Event Bus
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '../../src/core/event-bus.js';
import { GameEventType } from '../../src/core/types/events.types.js';

describe('EventBus', () => {
    let bus: EventBus;

    beforeEach(() => {
        bus = new EventBus();
    });

    describe('on() and emit()', () => {
        it('should deliver events to subscribers', () => {
            const handler = vi.fn();
            bus.on(GameEventType.ITEM_ACQUIRED, handler);

            const payload = {
                entityId: 'player',
                item: { id: 'iron_sword', name: 'Iron Sword', type: 'weapon' as const, description: 'A simple iron sword', weight: 9, baseValue: 25, rarity: 'common' as const, tags: [], damage: 7, damageType: 'physical' as const, speed: 'normal' as const, weaponClass: 'one_handed_sword' as const },
                quantity: 1,
                source: 'loot',
            };

            bus.emit(GameEventType.ITEM_ACQUIRED, payload);

            expect(handler).toHaveBeenCalledOnce();
            expect(handler).toHaveBeenCalledWith(payload);
        });

        it('should deliver events to multiple subscribers', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            bus.on(GameEventType.COMBAT_START, handler1);
            bus.on(GameEventType.COMBAT_START, handler2);

            const payload = { participantIds: ['player', 'bandit_1'], locationId: 'bleakfalls_barrow' };
            bus.emit(GameEventType.COMBAT_START, payload);

            expect(handler1).toHaveBeenCalledOnce();
            expect(handler2).toHaveBeenCalledOnce();
        });

        it('should not deliver events to unrelated subscribers', () => {
            const combatHandler = vi.fn();
            const questHandler = vi.fn();

            bus.on(GameEventType.COMBAT_START, combatHandler);
            bus.on(GameEventType.QUEST_STARTED, questHandler);

            bus.emit(GameEventType.COMBAT_START, { participantIds: ['player'], locationId: 'road' });

            expect(combatHandler).toHaveBeenCalledOnce();
            expect(questHandler).not.toHaveBeenCalled();
        });
    });

    describe('priority ordering', () => {
        it('should execute handlers in priority order (lower = first)', () => {
            const order: number[] = [];

            bus.on(GameEventType.LOCATION_ENTERED, () => order.push(3), 30);
            bus.on(GameEventType.LOCATION_ENTERED, () => order.push(1), 10);
            bus.on(GameEventType.LOCATION_ENTERED, () => order.push(2), 20);

            bus.emit(GameEventType.LOCATION_ENTERED, {
                locationId: 'whiterun',
                locationName: 'Whiterun',
                locationType: 'city',
            });

            expect(order).toEqual([1, 2, 3]);
        });
    });

    describe('once()', () => {
        it('should only fire once then remove itself', () => {
            const handler = vi.fn();
            bus.once(GameEventType.CHARACTER_LEVEL_UP, handler);

            bus.emit(GameEventType.CHARACTER_LEVEL_UP, { newLevel: 2 });
            bus.emit(GameEventType.CHARACTER_LEVEL_UP, { newLevel: 3 });

            expect(handler).toHaveBeenCalledOnce();
            expect(handler).toHaveBeenCalledWith({ newLevel: 2 });
        });
    });

    describe('unsubscribe', () => {
        it('should stop receiving events after unsubscribe', () => {
            const handler = vi.fn();
            const unsub = bus.on(GameEventType.GOLD_CHANGED, handler);

            bus.emit(GameEventType.GOLD_CHANGED, { oldAmount: 0, newAmount: 100, reason: 'loot' });
            expect(handler).toHaveBeenCalledOnce();

            unsub();

            bus.emit(GameEventType.GOLD_CHANGED, { oldAmount: 100, newAmount: 200, reason: 'trade' });
            expect(handler).toHaveBeenCalledOnce(); // still just once
        });
    });

    describe('off() and clear()', () => {
        it('off() should remove all subscribers for a specific event', () => {
            const handler = vi.fn();
            bus.on(GameEventType.SKILL_LEVEL_UP, handler);

            bus.off(GameEventType.SKILL_LEVEL_UP);
            bus.emit(GameEventType.SKILL_LEVEL_UP, { skill: 'one_handed', newLevel: 15 });

            expect(handler).not.toHaveBeenCalled();
        });

        it('clear() should remove all subscribers for all events', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            bus.on(GameEventType.COMBAT_START, handler1);
            bus.on(GameEventType.QUEST_STARTED, handler2);

            bus.clear();

            bus.emit(GameEventType.COMBAT_START, { participantIds: [], locationId: '' });
            bus.emit(GameEventType.QUEST_STARTED, { questId: 'q1', questTitle: 'Test' });

            expect(handler1).not.toHaveBeenCalled();
            expect(handler2).not.toHaveBeenCalled();
        });
    });

    describe('event history', () => {
        it('should record events in history', () => {
            bus.emit(GameEventType.GAME_STARTED, { playerName: 'Dovahkiin', race: 'nord' });
            bus.emit(GameEventType.LOCATION_ENTERED, { locationId: 'whiterun', locationName: 'Whiterun', locationType: 'city' });

            const history = bus.getHistory();
            expect(history).toHaveLength(2);
            expect(history[0].type).toBe(GameEventType.GAME_STARTED);
            expect(history[1].type).toBe(GameEventType.LOCATION_ENTERED);
        });

        it('should limit history size', () => {
            const smallBus = new EventBus({ maxHistorySize: 3 });

            for (let i = 0; i < 5; i++) {
                smallBus.emit(GameEventType.CHARACTER_LEVEL_UP, { newLevel: i + 1 });
            }

            const history = smallBus.getHistory();
            expect(history).toHaveLength(3);
            expect((history[0].payload as { newLevel: number }).newLevel).toBe(3);
        });

        it('should return limited history when limit specified', () => {
            for (let i = 0; i < 10; i++) {
                bus.emit(GameEventType.TIME_ADVANCED, { oldPeriod: 'morning', newPeriod: 'afternoon', hoursAdvanced: 1 });
            }

            const recent = bus.getHistory(3);
            expect(recent).toHaveLength(3);
        });

        it('should clear history', () => {
            bus.emit(GameEventType.GAME_STARTED, { playerName: 'Test', race: 'nord' });
            bus.clearHistory();
            expect(bus.getHistory()).toHaveLength(0);
        });
    });

    describe('error handling', () => {
        it('should continue dispatching if a handler throws', () => {
            const errorHandler = vi.fn(() => { throw new Error('Handler error'); });
            const safeHandler = vi.fn();

            // Error handler has higher priority (runs first)
            bus.on(GameEventType.COMBAT_END, errorHandler, 1);
            bus.on(GameEventType.COMBAT_END, safeHandler, 10);

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            bus.emit(GameEventType.COMBAT_END, {
                outcome: 'victory',
                participantIds: ['player'],
                xpGained: 50,
            });

            expect(errorHandler).toHaveBeenCalled();
            expect(safeHandler).toHaveBeenCalled(); // should still fire
            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });
    });

    describe('getSubscriberCount()', () => {
        it('should return correct subscriber count', () => {
            expect(bus.getSubscriberCount(GameEventType.COMBAT_START)).toBe(0);

            bus.on(GameEventType.COMBAT_START, () => { });
            bus.on(GameEventType.COMBAT_START, () => { });

            expect(bus.getSubscriberCount(GameEventType.COMBAT_START)).toBe(2);
        });
    });

    describe('debug mode', () => {
        it('should log events when debug mode is enabled', () => {
            const debugBus = new EventBus({ debugMode: true });
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            debugBus.emit(GameEventType.GAME_STARTED, { playerName: 'Debug', race: 'nord' });

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });
});
