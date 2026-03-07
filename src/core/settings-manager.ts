// ============================================================
// Schyrim — Settings Manager
// Manages game settings and AI provider configuration
// ============================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_FILE = join(__dirname, '..', '..', '.env');
const ENV_EXAMPLE_FILE = join(__dirname, '..', '..', '.env.example');

export interface GameSettings {
    difficulty: 'easy' | 'normal' | 'hard';
    aiNarrationEnabled: boolean;
    showCombatLog: boolean;
    fontSize: 'small' | 'normal' | 'large';
}

export interface AIProviderSettings {
    preferredProvider: 'anthropic' | 'openrouter' | 'groq' | 'openai' | 'gemini' | 'together' | 'ollama' | 'mock';
    apiKeys: Record<string, string>;
    models: Record<string, string>;
}

export interface SchyrimSettings {
    game: GameSettings;
    aiProviders: AIProviderSettings;
}

/**
 * Settings Manager — Load, save, and manage game settings
 */
export class SettingsManager {
    private settings: SchyrimSettings;

    constructor() {
        this.settings = this.loadSettings();
    }

    /**
     * Load settings from environment variables
     */
    private loadSettings(): SchyrimSettings {
        return {
            game: {
                difficulty: 'normal',
                aiNarrationEnabled: true,
                showCombatLog: true,
                fontSize: 'normal',
            },
            aiProviders: {
                preferredProvider: 'anthropic',
                apiKeys: {
                    anthropic: process.env.ANTHROPIC_API_KEY || '',
                    openrouter: process.env.OPENROUTER_API_KEY || '',
                    groq: process.env.GROQ_API_KEY || '',
                    openai: process.env.OPENAI_API_KEY || '',
                    gemini: process.env.GEMINI_API_KEY || '',
                    together: process.env.TOGETHER_API_KEY || '',
                    ollama: process.env.OLLAMA_ENDPOINT || '',
                },
                models: {
                    anthropic: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022',
                    openrouter: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free',
                    groq: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
                    openai: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                    gemini: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
                    together: process.env.TOGETHER_MODEL || 'meta-llama/Llama-3-70b-chat-hf',
                    ollama: process.env.OLLAMA_MODEL || 'llama2',
                },
            },
        };
    }

    /**
     * Get all settings
     */
    getSettings(): SchyrimSettings {
        return { ...this.settings };
    }

    /**
     * Get game settings
     */
    getGameSettings(): GameSettings {
        return { ...this.settings.game };
    }

    /**
     * Get AI provider settings
     */
    getAIProviderSettings(): AIProviderSettings {
        return { ...this.settings.aiProviders };
    }

    /**
     * Update game setting
     */
    updateGameSetting<K extends keyof GameSettings>(key: K, value: GameSettings[K]): void {
        this.settings.game[key] = value;
    }

    /**
     * Set API key for a provider
     */
    setAPIKey(provider: string, apiKey: string): void {
        this.settings.aiProviders.apiKeys[provider] = apiKey;
        process.env[this.getEnvKeyName(provider)] = apiKey;
    }

    /**
     * Get API key for a provider
     */
    getAPIKey(provider: string): string {
        return this.settings.aiProviders.apiKeys[provider] || '';
    }

    /**
     * Set model for a provider
     */
    setModel(provider: string, model: string): void {
        this.settings.aiProviders.models[provider] = model;
        process.env[this.getModelEnvKeyName(provider)] = model;
    }

    /**
     * Get model for a provider
     */
    getModel(provider: string): string {
        return this.settings.aiProviders.models[provider] || '';
    }

    /**
     * Set preferred provider
     */
    setPreferredProvider(provider: string): void {
        if (this.isValidProvider(provider)) {
            this.settings.aiProviders.preferredProvider = provider as any;
        }
    }

    /**
     * Check if a provider is configured (has API key)
     */
    isProviderConfigured(provider: string): boolean {
        return !!this.settings.aiProviders.apiKeys[provider];
    }

    /**
     * Get list of available providers (those with API keys)
     */
    getAvailableProviders(): string[] {
        return Object.entries(this.settings.aiProviders.apiKeys)
            .filter(([_, key]) => !!key)
            .map(([provider, _]) => provider);
    }

    /**
     * Save settings to .env file
     */
    saveSettings(): void {
        const envContent = this.generateEnvContent();
        writeFileSync(ENV_FILE, envContent, 'utf-8');
    }

    /**
     * Generate .env file content
     */
    private generateEnvContent(): string {
        const lines: string[] = [
            '# Schyrim Configuration',
            '# Auto-generated by settings manager\n',
        ];

        // Add API keys
        const providers = [
            { key: 'anthropic', name: 'ANTHROPIC', model: 'ANTHROPIC_MODEL' },
            { key: 'openrouter', name: 'OPENROUTER', model: 'OPENROUTER_MODEL' },
            { key: 'groq', name: 'GROQ', model: 'GROQ_MODEL' },
            { key: 'openai', name: 'OPENAI', model: 'OPENAI_MODEL' },
            { key: 'gemini', name: 'GEMINI', model: 'GEMINI_MODEL' },
            { key: 'together', name: 'TOGETHER', model: 'TOGETHER_MODEL' },
            { key: 'ollama', name: 'OLLAMA', model: 'OLLAMA_MODEL' },
        ];

        for (const { key, name, model } of providers) {
            const apiKey = this.settings.aiProviders.apiKeys[key];
            const modelValue = this.settings.aiProviders.models[key];

            if (apiKey || key === 'ollama') {
                lines.push(`${name}_API_KEY=${apiKey || (key === 'ollama' ? '' : '')}`);
                lines.push(`${model}=${modelValue || ''}`);
                lines.push('');
            }
        }

        return lines.join('\n');
    }

    /**
     * Validate provider name
     */
    private isValidProvider(provider: string): boolean {
        return [
            'anthropic', 'openrouter', 'groq', 'openai',
            'gemini', 'together', 'ollama', 'mock',
        ].includes(provider);
    }

    /**
     * Get environment variable name for a provider's API key
     */
    private getEnvKeyName(provider: string): string {
        const map: Record<string, string> = {
            anthropic: 'ANTHROPIC_API_KEY',
            openrouter: 'OPENROUTER_API_KEY',
            groq: 'GROQ_API_KEY',
            openai: 'OPENAI_API_KEY',
            gemini: 'GEMINI_API_KEY',
            together: 'TOGETHER_API_KEY',
            ollama: 'OLLAMA_ENDPOINT',
        };
        return map[provider] || '';
    }

    /**
     * Get environment variable name for a provider's model
     */
    private getModelEnvKeyName(provider: string): string {
        const map: Record<string, string> = {
            anthropic: 'ANTHROPIC_MODEL',
            openrouter: 'OPENROUTER_MODEL',
            groq: 'GROQ_MODEL',
            openai: 'OPENAI_MODEL',
            gemini: 'GEMINI_MODEL',
            together: 'TOGETHER_MODEL',
            ollama: 'OLLAMA_MODEL',
        };
        return map[provider] || '';
    }
}

/**
 * Global settings manager instance
 */
let settingsManagerInstance: SettingsManager | null = null;

export function getSettingsManager(): SettingsManager {
    if (!settingsManagerInstance) {
        settingsManagerInstance = new SettingsManager();
    }
    return settingsManagerInstance;
}
