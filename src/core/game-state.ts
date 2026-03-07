// ============================================================
// Schyrim Core — Game State Manager
// Central state management — single source of truth
// ============================================================

import type { GameState, GameMeta, RuntimeConfig } from './types/game-state.types.js';
import type { PlayerState } from './types/character.types.js';
import type { WorldState } from './types/location.types.js';
import type { QuestState } from './types/quest.types.js';
import type { FactionState } from './types/faction.types.js';

/**
 * Centralized game state manager.
 * All state mutations go through this manager.
 * The state is always JSON-serializable for save/load.
 */
export class GameStateManager {
    private state: GameState;

    constructor() {
        this.state = GameStateManager.createDefaultState();
    }

    // --- State Access (Read-Only) ---

    /** Get the full game state (read-only snapshot) */
    getState(): Readonly<GameState> {
        return this.state;
    }

    /** Get player state */
    getPlayer(): Readonly<PlayerState> {
        return this.state.player;
    }

    /** Get world state */
    getWorld(): Readonly<WorldState> {
        return this.state.world;
    }

    /** Get quest state */
    getQuests(): Readonly<QuestState> {
        return this.state.quests;
    }

    /** Get faction state */
    getFactions(): Readonly<FactionState> {
        return this.state.factions;
    }

    /** Get runtime config */
    getConfig(): Readonly<RuntimeConfig> {
        return this.state.config;
    }

    /** Get game meta */
    getMeta(): Readonly<GameMeta> {
        return this.state.meta;
    }

    // --- State Mutation (Controlled) ---

    /** Update player state with a partial patch */
    updatePlayer(patch: Partial<PlayerState>): void {
        this.state.player = { ...this.state.player, ...patch };
    }

    /** Update player state with a function for complex mutations */
    mutatePlayer(mutator: (player: PlayerState) => PlayerState): void {
        this.state.player = mutator({ ...this.state.player });
    }

    /** Update world state with a partial patch */
    updateWorld(patch: Partial<WorldState>): void {
        this.state.world = { ...this.state.world, ...patch };
    }

    /** Update world state with a function */
    mutateWorld(mutator: (world: WorldState) => WorldState): void {
        this.state.world = mutator({ ...this.state.world });
    }

    /** Update quest state */
    updateQuests(patch: Partial<QuestState>): void {
        this.state.quests = { ...this.state.quests, ...patch };
    }

    /** Update quest state with a function */
    mutateQuests(mutator: (quests: QuestState) => QuestState): void {
        this.state.quests = mutator({ ...this.state.quests });
    }

    /** Update faction state */
    updateFactions(patch: Partial<FactionState>): void {
        this.state.factions = { ...this.state.factions, ...patch };
    }

    /** Update faction state with a function */
    mutateFactions(mutator: (factions: FactionState) => FactionState): void {
        this.state.factions = mutator({ ...this.state.factions });
    }

    /** Update runtime config */
    updateConfig(patch: Partial<RuntimeConfig>): void {
        this.state.config = { ...this.state.config, ...patch };
    }

    /** Update game meta */
    updateMeta(patch: Partial<GameMeta>): void {
        this.state.meta = { ...this.state.meta, ...patch };
    }

    // --- Snapshot / Restore (Save/Load) ---

    /** Create a full JSON snapshot of the game state */
    snapshot(): string {
        return JSON.stringify(this.state, null, 2);
    }

    /** Restore state from a JSON snapshot */
    restore(json: string): void {
        const parsed = JSON.parse(json) as GameState;
        // TODO: Add version migration logic here
        this.state = parsed;
    }

    /** Load a complete state object (e.g., from save file) */
    loadState(state: GameState): void {
        this.state = state;
    }

    /** Reset to default empty state */
    reset(): void {
        this.state = GameStateManager.createDefaultState();
    }

    // --- Default State ---

    static createDefaultState(): GameState {
        return {
            meta: {
                version: '0.1.0',
                saveDate: new Date().toISOString(),
                playTime: 0,
                saveName: '',
            },
            player: {
                name: '',
                race: 'nord',
                level: 1,
                experience: 0,
                attributes: {
                    health: 100,
                    healthMax: 100,
                    stamina: 100,
                    staminaMax: 100,
                    magicka: 100,
                    magickaMax: 100,
                },
                skills: {} as PlayerState['skills'],
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
            },
            world: {
                locations: {},
                currentTime: { day: 1, hour: 8, minute: 0, period: 'morning' },
                weather: { current: 'clear', intensity: 0, duration: 100 },
                discoveredLocations: [],
                worldFlags: {},
                vendorInventories: {},
            },
            quests: {
                activeQuests: {},
                completedQuests: [],
                failedQuests: [],
                flags: {},
            },
            factions: {
                reputations: {},
                ranks: {},
            },
            eventHistory: [],
            config: {
                difficulty: {
                    damageDealtMultiplier: 1.0,
                    damageReceivedMultiplier: 1.0,
                    xpMultiplier: 1.0,
                    lootRarityBias: 0,
                    encounterFrequency: 0.5,
                },
                immersion: {
                    survivalEnabled: false,
                    weatherEffects: true,
                    timePassing: true,
                    randomEncounters: true,
                },
                display: {
                    colorMode: 'full',
                    combatLogVerbosity: 'succinct',
                    confirmDestructiveActions: true,
                    showDamageBreakdown: false,
                },
                ai: {
                    enabled: true,
                    verbosity: 'standard',
                    showSuggestedOptions: true,
                },
            },
        };
    }
}

/** Singleton instance */
let globalStateManager: GameStateManager | null = null;

export function getGameStateManager(): GameStateManager {
    if (!globalStateManager) {
        globalStateManager = new GameStateManager();
    }
    return globalStateManager;
}

export function resetGameStateManager(): void {
    globalStateManager = null;
}
