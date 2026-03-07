// ============================================================
// Schyrim — Settings UI
// In-game settings menu for configuration
// ============================================================

import chalk from 'chalk';
import { select, input, confirm } from '@inquirer/prompts';
import { Separator } from '@inquirer/prompts';
import { ui } from './tui/screen.js';
import { getSettingsManager } from '../core/settings-manager.js';

// Helper function
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Display the main settings menu
 */
export async function showSettingsMenu(): Promise<void> {
    const settings = getSettingsManager();

    // eslint-disable-next-line no-constant-condition
    while (true) {
        console.clear();
        ui.log(chalk.hex('#DAA520')('\n  ⚙️  SETTINGS\n'));

        const choice = await select({
            message: 'Settings',
            choices: [
                { name: '🤖 AI Providers', value: 'ai' },
                { name: '⚙️  Game Settings', value: 'game' },
                { name: '💾 Save & Exit', value: 'save' },
                new Separator(),
                { name: 'Exit (No Save)', value: 'exit' },
            ],
        });

        switch (choice) {
            case 'ai':
                await showAIProviderSettings();
                break;
            case 'game':
                await showGameSettings();
                break;
            case 'save':
                settings.saveSettings();
                ui.log(chalk.green('\n  ✓ Settings saved!\n'));
                await sleep(500);
                return;
            case 'exit':
                return;
        }
    }
}

/**
 * Show AI provider configuration menu
 */
async function showAIProviderSettings(): Promise<void> {
    const settings = getSettingsManager();

    // eslint-disable-next-line no-constant-condition
    while (true) {
        console.clear();
        ui.log(chalk.hex('#DAA520')('\n  🤖 AI PROVIDERS\n'));

        const aiSettings = settings.getAIProviderSettings();
        const availableProviders = settings.getAvailableProviders();

        ui.log(chalk.gray(`  Preferred: ${chalk.cyan(aiSettings.preferredProvider)}`));
        ui.log(chalk.gray(`  Configured: ${availableProviders.length > 0 ? availableProviders.join(', ') : 'none'}\n`));

        const choice = await select({
            message: 'AI Provider Settings',
            choices: [
                { name: 'Anthropic (Claude)', value: 'anthropic' },
                { name: 'OpenRouter (100+ models)', value: 'openrouter' },
                { name: 'Groq (Fast)', value: 'groq' },
                { name: 'OpenAI (ChatGPT)', value: 'openai' },
                { name: 'Google Gemini', value: 'gemini' },
                { name: 'Together AI', value: 'together' },
                { name: 'Ollama (Local)', value: 'ollama' },
                new Separator(),
                { name: 'Test Provider', value: 'test' },
                { name: 'Back', value: 'back' },
            ],
        });

        if (choice === 'back') {
            return;
        }

        if (choice === 'test') {
            await testProviders();
        } else {
            await configureProvider(choice);
        }
    }
}

/**
 * Configure a specific provider
 */
async function configureProvider(provider: string): Promise<void> {
    const settings = getSettingsManager();

    console.clear();
    ui.log(chalk.hex('#DAA520')(`\n  ${provider.toUpperCase()} CONFIGURATION\n`));

    // Get current values
    const currentKey = settings.getAPIKey(provider);
    const currentModel = settings.getModel(provider);

    // Show defaults
    const defaults = getProviderDefaults(provider);
    ui.log(chalk.gray(`  Default model: ${defaults.model}\n`));

    // Ask for API key
    const apiKey = await input({
        message: `API Key (leave blank to keep current)`,
        default: currentKey ? '••••••••' : '(not set)',
        validate: (value) => {
            if (value && value.length < 10 && value !== '••••••••') {
                return 'API key seems too short';
            }
            return true;
        },
    });

    if (apiKey && apiKey !== '••••••••') {
        settings.setAPIKey(provider, apiKey);
        ui.log(chalk.green('✓ API key updated'));
    }

    // Ask for model override
    const modelChoice = await confirm({
        message: `Override default model? (default: ${currentModel || defaults.model})`,
        default: false,
    });

    if (modelChoice) {
        const model = await input({
            message: 'Model name',
            default: currentModel || defaults.model,
        });
        settings.setModel(provider, model);
        ui.log(chalk.green('✓ Model updated'));
    }

    // Option to set as preferred
    if (settings.getAPIKey(provider)) {
        const setPreferred = await confirm({
            message: 'Set as preferred provider?',
            default: false,
        });

        if (setPreferred) {
            settings.setPreferredProvider(provider);
            ui.log(chalk.green('✓ Set as preferred'));
        }
    }

    await sleep(1000);
}

/**
 * Test connectivity to configured providers
 */
async function testProviders(): Promise<void> {
    const settings = getSettingsManager();
    const available = settings.getAvailableProviders();

    console.clear();
    ui.log(chalk.hex('#DAA520')('\n  🧪 TESTING PROVIDERS\n'));

    if (available.length === 0) {
        ui.log(chalk.yellow('  No providers configured\n'));
        await sleep(2000);
        return;
    }

    for (const provider of available) {
        ui.log(`  ${provider}...`);
        // TODO: Implement actual provider testing
        // For now, just show status
        ui.log(chalk.green('    ✓ Configured\n'));
    }

    ui.log(chalk.gray('  (Actual connectivity test coming soon)\n'));
    await sleep(2000);
}

/**
 * Show game settings menu
 */
async function showGameSettings(): Promise<void> {
    const settings = getSettingsManager();

    console.clear();
    ui.log(chalk.hex('#DAA520')('\n  ⚙️  GAME SETTINGS\n'));

    const gameSettings = settings.getGameSettings();

    const choice = await select({
        message: 'Game Settings',
        choices: [
            {
                name: `Difficulty: ${gameSettings.difficulty}`,
                value: 'difficulty',
            },
            {
                name: `AI Narration: ${gameSettings.aiNarrationEnabled ? 'On' : 'Off'}`,
                value: 'narration',
            },
            {
                name: `Combat Log: ${gameSettings.showCombatLog ? 'On' : 'Off'}`,
                value: 'combatlog',
            },
            {
                name: `Font Size: ${gameSettings.fontSize}`,
                value: 'fontsize',
            },
            new Separator(),
            { name: 'Back', value: 'back' },
        ],
    });

    switch (choice) {
        case 'difficulty':
            const difficulty = await select({
                message: 'Difficulty',
                choices: [
                    { name: 'Easy', value: 'easy' },
                    { name: 'Normal', value: 'normal' },
                    { name: 'Hard', value: 'hard' },
                ],
            });
            settings.updateGameSetting('difficulty', difficulty as any);
            ui.log(chalk.green('\n✓ Difficulty updated\n'));
            await sleep(800);
            break;

        case 'narration':
            const narration = await confirm({
                message: 'Enable AI narration?',
                default: gameSettings.aiNarrationEnabled,
            });
            settings.updateGameSetting('aiNarrationEnabled', narration);
            ui.log(chalk.green('\n✓ Setting updated\n'));
            await sleep(800);
            break;

        case 'combatlog':
            const combatlog = await confirm({
                message: 'Show combat log?',
                default: gameSettings.showCombatLog,
            });
            settings.updateGameSetting('showCombatLog', combatlog);
            ui.log(chalk.green('\n✓ Setting updated\n'));
            await sleep(800);
            break;

        case 'fontsize':
            const fontsize = await select({
                message: 'Font Size',
                choices: [
                    { name: 'Small', value: 'small' },
                    { name: 'Normal', value: 'normal' },
                    { name: 'Large', value: 'large' },
                ],
            });
            settings.updateGameSetting('fontSize', fontsize as any);
            ui.log(chalk.green('\n✓ Font size updated\n'));
            await sleep(800);
            break;
    }

    // Don't return here - loop back to game settings menu
}

/**
 * Get default configuration for a provider
 */
function getProviderDefaults(
    provider: string,
): { model: string; description: string } {
    const defaults: Record<string, { model: string; description: string }> = {
        anthropic: {
            model: 'claude-3-5-haiku-20241022',
            description: 'Claude - Best quality',
        },
        openrouter: {
            model: 'meta-llama/llama-3.1-8b-instruct:free',
            description: 'OpenRouter - 100+ models',
        },
        groq: {
            model: 'llama-3.1-8b-instant',
            description: 'Groq - Fastest',
        },
        openai: {
            model: 'gpt-4o-mini',
            description: 'ChatGPT',
        },
        gemini: {
            model: 'gemini-1.5-flash',
            description: 'Google Gemini',
        },
        together: {
            model: 'meta-llama/Llama-3-70b-chat-hf',
            description: 'Together AI',
        },
        ollama: {
            model: 'llama2',
            description: 'Local/offline',
        },
    };

    return defaults[provider] || { model: '', description: '' };
}
