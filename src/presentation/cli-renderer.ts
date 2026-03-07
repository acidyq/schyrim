// ============================================================
// Schyrim Presentation — CLI Renderer
// Rich terminal output with chalk styling
// ============================================================

import chalk from 'chalk';

// Gold color theme
const gold = chalk.hex('#DAA520');
const brightGold = chalk.hex('#FFD700');
const dimGold = chalk.hex('#B8860B');
const health = chalk.redBright;
const mana = chalk.blueBright;
const stamina = chalk.greenBright;
const danger = chalk.red;
const info = chalk.cyan;
const dim = chalk.gray;
const bold = chalk.bold;

/**
 * Render the main banner.
 */
export function renderBanner(): string {
    return `
${dimGold.bold('╔══════════════════════════════════════════════════════════╗')}
${dimGold.bold('║')}                                                          ${dimGold.bold('║')}
${dimGold.bold('║')}   ${gold.bold('███████╗ ██████╗██╗  ██╗██╗   ██╗██████╗ ██╗███╗   ███╗')}  ${dimGold.bold('║')}
${dimGold.bold('║')}   ${gold.bold('██╔════╝██╔════╝██║  ██║╚██╗ ██╔╝██╔══██╗██║████╗ ████║')}  ${dimGold.bold('║')}
${dimGold.bold('║')}   ${brightGold.bold('███████╗██║     ███████║ ╚████╔╝ ██████╔╝██║██╔████╔██║')}  ${dimGold.bold('║')}
${dimGold.bold('║')}   ${gold.bold('╚════██║██║     ██╔══██║  ╚██╔╝  ██╔══██╗██║██║╚██╔╝██║')}  ${dimGold.bold('║')}
${dimGold.bold('║')}   ${gold.bold('███████║╚██████╗██║  ██║   ██║   ██║  ██║██║██║ ╚═╝ ██║')}  ${dimGold.bold('║')}
${dimGold.bold('║')}   ${dimGold('╚══════╝ ╚═════╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝╚═╝     ╚═╝')}  ${dimGold.bold('║')}
${dimGold.bold('║')}                                                          ${dimGold.bold('║')}
${dimGold.bold('║')}   ${dim('An AI-Narrated CLI RPG • Inspired by the Elder Scrolls')}    ${dimGold.bold('║')}
${dimGold.bold('║')}   ${dim('v0.1.0 • Vertical Slice')}                                  ${dimGold.bold('║')}
${dimGold.bold('║')}                                                          ${dimGold.bold('║')}
${dimGold.bold('╚══════════════════════════════════════════════════════════╝')}`;
}

/**
 * Render a section divider.
 */
export function renderDivider(title?: string): string {
    if (title) {
        return dimGold(`━━━ ${brightGold.bold(title)} ━━━`);
    }
    return dimGold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

/**
 * Render a location description.
 */
export function renderLocation(name: string, description: string, timeStr: string): string {
    const lines: string[] = [];
    lines.push('');
    lines.push(renderDivider(name));
    lines.push(dim(timeStr));
    lines.push('');
    lines.push(description);
    lines.push('');
    return lines.join('\n');
}

/**
 * Render the player HUD (health, magicka, stamina, gold, level).
 */
export function renderHUD(
    hp: number, hpMax: number,
    mp: number, mpMax: number,
    sp: number, spMax: number,
    gold: number,
    level: number
): string {
    const hpBar = makeBar(hp, hpMax, 15);
    const mpBar = makeBar(mp, mpMax, 10);
    const spBar = makeBar(sp, spMax, 10);

    return dim('  ') + health(`♥ ${hp}/${hpMax}`) + dim(` ${hpBar}  `) +
        mana(`✦ ${mp}/${mpMax}`) + dim(` ${mpBar}  `) +
        stamina(`⚡${sp}/${spMax}`) + dim(` ${spBar}  `) +
        brightGold(`💰${gold}g`) + dim(`  Lv.${level}`);
}

/**
 * Render an action menu.
 */
export function renderMenu(options: string[], title?: string): string {
    const lines: string[] = [];
    if (title) {
        lines.push('');
        lines.push(gold(title));
    }
    for (let i = 0; i < options.length; i++) {
        lines.push(dim(`  [${i + 1}]`) + ` ${options[i]}`);
    }
    lines.push('');
    return lines.join('\n');
}

/**
 * Render combat state with HP bars for all participants.
 */
export function renderCombat(
    round: number,
    playerName: string, playerHP: number, playerHPMax: number,
    playerMP: number, playerMPMax: number,
    playerSP: number, playerSPMax: number,
    enemies: Array<{ name: string; hp: number; hpMax: number; alive: boolean; effects: string[] }>
): string {
    const lines: string[] = [];
    lines.push('');
    lines.push(danger.bold(`⚔ ━━━ COMBAT — Round ${round} ━━━ ⚔`));
    lines.push('');

    // Player
    const pHpBar = makeBar(playerHP, playerHPMax, 20);
    lines.push(`  ${bold(playerName)}`);
    lines.push(`    ${health('♥ ' + playerHP + '/' + playerHPMax)} ${dim(pHpBar)}`);
    lines.push(`    ${mana('✦ ' + playerMP + '/' + playerMPMax)}  ${stamina('⚡' + playerSP + '/' + playerSPMax)}`);
    lines.push('');

    // Enemies
    for (const e of enemies) {
        const status = e.alive ? '' : dim(' [DEAD]');
        const eHpBar = makeBar(e.hp, e.hpMax, 20);
        lines.push(`  ${danger(e.name)}${status}`);
        lines.push(`    ${health('♥ ' + e.hp + '/' + e.hpMax)} ${dim(eHpBar)}`);
        if (e.effects.length > 0) {
            lines.push(`    ${dim('Effects:')} ${e.effects.join(', ')}`);
        }
    }

    lines.push('');
    return lines.join('\n');
}

/**
 * Render a combat log entry.
 */
export function renderCombatLog(entries: Array<{ text: string; isPlayer: boolean }>): string {
    return entries.map(e => {
        if (e.isPlayer) {
            return info(`  → ${e.text}`);
        }
        return danger(`  ← ${e.text}`);
    }).join('\n');
}

/**
 * Render a notification (item acquired, level up, quest update, etc.).
 */
export function renderNotification(type: 'item' | 'quest' | 'level_up' | 'discovery' | 'warning' | 'info', message: string): string {
    switch (type) {
        case 'item': return brightGold(`  ★ ${message}`);
        case 'quest': return gold.bold(`  📜 ${message}`);
        case 'level_up': return brightGold.bold(`  ⬆ LEVEL UP! ${message}`);
        case 'discovery': return info(`  🗺 ${message}`);
        case 'warning': return danger(`  ⚠ ${message}`);
        case 'info': return dim(`  ℹ ${message}`);
        default: return `  ${message}`;
    }
}

/**
 * Render dialogue text from an NPC.
 */
export function renderDialogue(speakerName: string, text: string): string {
    return `\n  ${gold.bold(speakerName + ':')} ${chalk.italic(`"${text}"`)}\n`;
}

/**
 * Render dialogue options.
 */
export function renderDialogueOptions(
    options: Array<{ text: string; locked: boolean; skillCheck?: string }>
): string {
    const lines: string[] = [];
    for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        if (opt.locked) {
            lines.push(dim(`  [${i + 1}] [Locked] ${opt.text}`));
        } else if (opt.skillCheck) {
            lines.push(dim(`  [${i + 1}]`) + ` ${opt.text} ${info(`(${opt.skillCheck})`)}`);
        } else {
            lines.push(dim(`  [${i + 1}]`) + ` ${opt.text}`);
        }
    }
    lines.push(dim(`  [${options.length + 1}]`) + ' [Leave]');
    lines.push('');
    return lines.join('\n');
}

/**
 * Render inventory list.
 */
export function renderInventory(
    items: Array<{ name: string; quantity: number; weight: number; equipped: boolean }>,
    currentWeight: number,
    maxWeight: number,
    gold: number
): string {
    const lines: string[] = [];
    lines.push('');
    lines.push(renderDivider('INVENTORY'));
    lines.push(dim(`  Weight: ${currentWeight.toFixed(1)}/${maxWeight} | Gold: ${gold}`));
    lines.push('');

    if (items.length === 0) {
        lines.push(dim('  (empty)'));
    } else {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const qty = item.quantity > 1 ? ` (x${item.quantity})` : '';
            const eq = item.equipped ? chalk.green(' [E]') : '';
            const weightStr = dim(` [${item.weight}w]`);
            lines.push(dim(`  [${i + 1}]`) + ` ${item.name}${qty}${eq}${weightStr}`);
        }
    }

    lines.push('');
    return lines.join('\n');
}

/**
 * Render character status screen.
 */
export function renderCharacterSheet(
    name: string, race: string, level: number,
    hp: number, hpMax: number,
    mp: number, mpMax: number,
    sp: number, spMax: number,
    skills: Array<{ name: string; level: number }>,
    perks: string[],
    perkPoints: number
): string {
    const lines: string[] = [];
    lines.push('');
    lines.push(renderDivider(`${name} — ${race}`));
    lines.push(dim(`  Level ${level} | Perk Points: ${perkPoints}`));
    lines.push('');
    lines.push(`  ${health(`♥ Health:  ${hp}/${hpMax}`)} ${dim(makeBar(hp, hpMax, 15))}`);
    lines.push(`  ${mana(`✦ Magicka: ${mp}/${mpMax}`)} ${dim(makeBar(mp, mpMax, 15))}`);
    lines.push(`  ${stamina(`⚡Stamina: ${sp}/${spMax}`)} ${dim(makeBar(sp, spMax, 15))}`);
    lines.push('');
    lines.push(gold('  Skills:'));

    // Show skills in columns
    for (let i = 0; i < skills.length; i += 3) {
        const cols = skills.slice(i, i + 3).map(s => {
            const name = s.name.padEnd(15);
            return `    ${name} ${dim(s.level.toString())}`;
        });
        lines.push(cols.join(''));
    }

    if (perks.length > 0) {
        lines.push('');
        lines.push(gold('  Perks:'));
        for (const perk of perks) {
            lines.push(`    • ${perk}`);
        }
    }

    lines.push('');
    return lines.join('\n');
}

// --- Internal ---

function makeBar(current: number, max: number, width: number): string {
    const pct = Math.max(0, Math.min(1, current / max));
    const filled = Math.round(pct * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}
