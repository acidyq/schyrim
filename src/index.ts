// ============================================================
// Schyrim — Entry Point
// ============================================================

import chalk from 'chalk';
import { getGameStateManager } from './core/game-state.js';
import { getEventBus } from './core/event-bus.js';
import { loadContent } from './content-registry.js';
import { runGame } from './game-loop.js';
import { createAIEngine } from './systems/ai/ai-engine.js';

async function main(): Promise<void> {
    console.clear();
    console.log(chalk.hex('#DAA520')('  Loading Schyrim...\n'));

    const gsm = getGameStateManager();
    const bus = getEventBus();
    const content = loadContent();

    console.log(chalk.green(`  ✓ ${content.races.size} races`));
    console.log(chalk.green(`  ✓ ${content.locations.size} locations`));
    console.log(chalk.green(`  ✓ ${content.enemies.size} enemies`));
    console.log(chalk.green(`  ✓ ${content.quests.size} quests`));
    console.log(chalk.green(`  ✓ ${content.items.size} items`));
    console.log(chalk.green(`  ✓ ${content.spells.size} spells`));
    console.log(chalk.green(`  ✓ ${content.dialogueTrees.size} dialogue trees`));
    console.log(chalk.green(`  ✓ ${content.factions.size} factions`));
    console.log(chalk.green(`  ✓ ${content.perks.size} perks`));
    console.log(chalk.green(`  ✓ ${content.vendors.size} vendors`));
    console.log(chalk.green(`  ✓ ${content.leveledLists.size} leveled lists`));

    // Initialise AI narrative engine (picks best available provider)
    const { engine, status } = await createAIEngine();
    if (engine.isLive) {
        console.log(chalk.cyan(`  ✦ AI narration: ${status}`));
    } else {
        console.log(chalk.gray(`  ○ AI narration: ${status}`));
    }
    console.log();

    await runGame(gsm, bus, content, engine);
}

main().catch(err => {
    console.error(chalk.red('\n  Fatal error:'), err);
    process.exit(1);
});
