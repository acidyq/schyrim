// ============================================================
// Schyrim Core — Configuration Manager
// Loads YAML settings for difficulty, immersion, display, AI
// ============================================================

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { RuntimeConfig, DifficultySettings, ImmersionSettings, DisplaySettings, AIRuntimeSettings } from './types/game-state.types.js';

export interface SettingsFile {
    difficulty?: Partial<DifficultySettings>;
    immersion?: Partial<ImmersionSettings>;
    display?: Partial<DisplaySettings>;
    ai?: Partial<AIRuntimeSettings>;
}

const DEFAULT_CONFIG: RuntimeConfig = {
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
};

/**
 * Configuration Manager: loads YAML settings with defaults and env var overrides.
 */
export class ConfigManager {
    private config: RuntimeConfig;
    private configPath: string;

    constructor(configPath: string) {
        this.configPath = configPath;
        this.config = ConfigManager.deepClone(DEFAULT_CONFIG);
    }

    /**
     * Load config from YAML file, merging with defaults.
     * Environment variables override file settings.
     */
    load(): RuntimeConfig {
        // Start with defaults
        this.config = ConfigManager.deepClone(DEFAULT_CONFIG);

        // Layer file settings on top
        if (existsSync(this.configPath)) {
            try {
                const raw = readFileSync(this.configPath, 'utf-8');
                const fileSettings = parseYaml(raw) as SettingsFile;
                if (fileSettings) {
                    this.mergeSettings(fileSettings);
                }
            } catch (err) {
                console.warn(`[ConfigManager] Warning: Could not parse ${this.configPath}: ${err instanceof Error ? err.message : err}`);
                console.warn('[ConfigManager] Using default settings.');
            }
        }

        // Layer environment variables on top
        this.applyEnvOverrides();

        return this.config;
    }

    /**
     * Get the current configuration.
     */
    getConfig(): Readonly<RuntimeConfig> {
        return this.config;
    }

    /**
     * Update a specific config section.
     */
    update(patch: Partial<RuntimeConfig>): void {
        if (patch.difficulty) {
            this.config.difficulty = { ...this.config.difficulty, ...patch.difficulty };
        }
        if (patch.immersion) {
            this.config.immersion = { ...this.config.immersion, ...patch.immersion };
        }
        if (patch.display) {
            this.config.display = { ...this.config.display, ...patch.display };
        }
        if (patch.ai) {
            this.config.ai = { ...this.config.ai, ...patch.ai };
        }
    }

    /**
     * Save current config to YAML file.
     */
    save(): void {
        const dir = dirname(this.configPath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        const yaml = stringifyYaml(this.config);
        writeFileSync(this.configPath, yaml, 'utf-8');
    }

    /**
     * Reset to defaults.
     */
    reset(): RuntimeConfig {
        this.config = ConfigManager.deepClone(DEFAULT_CONFIG);
        return this.config;
    }

    /**
     * Get default configuration.
     */
    static getDefaults(): RuntimeConfig {
        return ConfigManager.deepClone(DEFAULT_CONFIG);
    }

    // --- Private ---

    private mergeSettings(settings: SettingsFile): void {
        if (settings.difficulty) {
            this.config.difficulty = { ...this.config.difficulty, ...settings.difficulty };
        }
        if (settings.immersion) {
            this.config.immersion = { ...this.config.immersion, ...settings.immersion };
        }
        if (settings.display) {
            this.config.display = { ...this.config.display, ...settings.display };
        }
        if (settings.ai) {
            this.config.ai = { ...this.config.ai, ...settings.ai };
        }
    }

    private applyEnvOverrides(): void {
        // Difficulty
        const dmgDealt = process.env['SCHYRIM_DAMAGE_DEALT'];
        if (dmgDealt) this.config.difficulty.damageDealtMultiplier = parseFloat(dmgDealt);

        const dmgReceived = process.env['SCHYRIM_DAMAGE_RECEIVED'];
        if (dmgReceived) this.config.difficulty.damageReceivedMultiplier = parseFloat(dmgReceived);

        const xpMult = process.env['SCHYRIM_XP_MULTIPLIER'];
        if (xpMult) this.config.difficulty.xpMultiplier = parseFloat(xpMult);

        // Display
        const colorMode = process.env['SCHYRIM_COLOR_MODE'];
        if (colorMode && ['full', 'minimal', 'none'].includes(colorMode)) {
            this.config.display.colorMode = colorMode as 'full' | 'minimal' | 'none';
        }

        const verbosity = process.env['SCHYRIM_COMBAT_VERBOSITY'];
        if (verbosity && ['succinct', 'detailed'].includes(verbosity)) {
            this.config.display.combatLogVerbosity = verbosity as 'succinct' | 'detailed';
        }

        // AI
        const aiEnabled = process.env['SCHYRIM_AI_ENABLED'];
        if (aiEnabled !== undefined) {
            this.config.ai.enabled = aiEnabled === 'true' || aiEnabled === '1';
        }

        const aiVerbosity = process.env['SCHYRIM_AI_VERBOSITY'];
        if (aiVerbosity && ['minimal', 'standard', 'cinematic'].includes(aiVerbosity)) {
            this.config.ai.verbosity = aiVerbosity as 'minimal' | 'standard' | 'cinematic';
        }
    }

    private static deepClone<T>(obj: T): T {
        return JSON.parse(JSON.stringify(obj));
    }
}
