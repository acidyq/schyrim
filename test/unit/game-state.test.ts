// ============================================================
// Schyrim Tests — Game State Manager
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateManager } from '../../src/core/game-state.js';

describe('GameStateManager', () => {
    let manager: GameStateManager;

    beforeEach(() => {
        manager = new GameStateManager();
    });

    describe('initialization', () => {
        it('should start with default state', () => {
            const state = manager.getState();
            expect(state.meta.version).toBe('0.1.0');
            expect(state.player.level).toBe(1);
            expect(state.player.attributes.health).toBe(100);
            expect(state.player.attributes.healthMax).toBe(100);
            expect(state.player.gold).toBe(0);
            expect(state.player.inventory.items).toHaveLength(0);
            expect(state.world.currentTime.period).toBe('morning');
        });
    });

    describe('state access', () => {
        it('should return player state', () => {
            const player = manager.getPlayer();
            expect(player.race).toBe('nord');
            expect(player.level).toBe(1);
        });

        it('should return world state', () => {
            const world = manager.getWorld();
            expect(world.weather.current).toBe('clear');
            expect(world.currentTime.day).toBe(1);
        });

        it('should return quest state', () => {
            const quests = manager.getQuests();
            expect(quests.completedQuests).toHaveLength(0);
            expect(quests.flags).toEqual({});
        });

        it('should return config', () => {
            const config = manager.getConfig();
            expect(config.difficulty.damageDealtMultiplier).toBe(1.0);
            expect(config.ai.enabled).toBe(true);
        });
    });

    describe('state mutations', () => {
        it('updatePlayer() should patch player state', () => {
            manager.updatePlayer({ name: 'Dovahkiin', gold: 500 });

            const player = manager.getPlayer();
            expect(player.name).toBe('Dovahkiin');
            expect(player.gold).toBe(500);
            expect(player.level).toBe(1); // unchanged
        });

        it('mutatePlayer() should allow complex mutations', () => {
            manager.mutatePlayer(player => ({
                ...player,
                name: 'Dragonborn',
                attributes: {
                    ...player.attributes,
                    health: 80,
                },
            }));

            const player = manager.getPlayer();
            expect(player.name).toBe('Dragonborn');
            expect(player.attributes.health).toBe(80);
            expect(player.attributes.healthMax).toBe(100); // unchanged
        });

        it('updateWorld() should patch world state', () => {
            manager.updateWorld({
                weather: { current: 'snow', intensity: 0.7, duration: 50 },
            });

            const world = manager.getWorld();
            expect(world.weather.current).toBe('snow');
            expect(world.weather.intensity).toBe(0.7);
        });

        it('updateQuests() should patch quest state', () => {
            manager.updateQuests({
                completedQuests: ['golden_claw'],
            });

            expect(manager.getQuests().completedQuests).toContain('golden_claw');
        });

        it('updateFactions() should patch faction state', () => {
            manager.updateFactions({
                reputations: { companions: 25 },
            });

            expect(manager.getFactions().reputations['companions']).toBe(25);
        });

        it('updateConfig() should patch config', () => {
            manager.updateConfig({
                difficulty: {
                    damageDealtMultiplier: 2.0,
                    damageReceivedMultiplier: 0.5,
                    xpMultiplier: 1.5,
                    lootRarityBias: 1,
                    encounterFrequency: 0.8,
                },
            });

            expect(manager.getConfig().difficulty.damageDealtMultiplier).toBe(2.0);
        });
    });

    describe('snapshot and restore', () => {
        it('should create a JSON snapshot', () => {
            manager.updatePlayer({ name: 'Snapshot Test', gold: 999 });

            const json = manager.snapshot();
            const parsed = JSON.parse(json);

            expect(parsed.player.name).toBe('Snapshot Test');
            expect(parsed.player.gold).toBe(999);
        });

        it('should restore from a JSON snapshot', () => {
            manager.updatePlayer({ name: 'Before Restore', gold: 100 });
            const snapshot = manager.snapshot();

            // Reset and verify it's reset
            manager.reset();
            expect(manager.getPlayer().name).toBe('');

            // Restore
            manager.restore(snapshot);
            expect(manager.getPlayer().name).toBe('Before Restore');
            expect(manager.getPlayer().gold).toBe(100);
        });

        it('should roundtrip state through snapshot/restore', () => {
            manager.updatePlayer({ name: 'Roundtrip', gold: 42, level: 7 });
            manager.updateWorld({
                currentTime: { day: 5, hour: 14, minute: 30, period: 'afternoon' },
            });
            manager.updateQuests({ completedQuests: ['test_quest'] });

            const snapshot = manager.snapshot();
            const newManager = new GameStateManager();
            newManager.restore(snapshot);

            expect(newManager.getPlayer().name).toBe('Roundtrip');
            expect(newManager.getPlayer().gold).toBe(42);
            expect(newManager.getWorld().currentTime.day).toBe(5);
            expect(newManager.getQuests().completedQuests).toContain('test_quest');
        });
    });

    describe('reset', () => {
        it('should reset to default state', () => {
            manager.updatePlayer({ name: 'To Be Reset', gold: 9999 });
            manager.reset();

            expect(manager.getPlayer().name).toBe('');
            expect(manager.getPlayer().gold).toBe(0);
            expect(manager.getPlayer().level).toBe(1);
        });
    });
});
