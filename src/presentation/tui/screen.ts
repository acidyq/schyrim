// ============================================================
// Schyrim — TUI Screen Manager
// blessed multi-panel terminal interface
// Panels: content log (left), HUD (right), menu (bottom)
// ============================================================

import blessed from 'blessed';
import chalk from 'chalk';
import type { PlayerState } from '../../core/types/character.types.js';
import type { QuestState } from '../../core/types/quest.types.js';
import type { ContentRegistry } from '../../content-registry.js';

export interface UIChoice {
    name: string;       // display text (chalk ANSI codes OK)
    value: string;      // resolved when selected
    disabled?: string | false; // falsy = selectable; string = dimmed non-selectable
}

// ============================================================
// SchyrimUI class
// ============================================================

class SchyrimUI {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private screen!: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private contentBox!: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private hudPanel!: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private menuList!: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private statusBar!: any;

    private contentLines: string[] = [];
    private menuChoices: UIChoice[] = [];
    private menuResolve: ((value: string) => void) | null = null;
    private initialized = false;

    // ----------------------------------------------------------
    // Init — call once from runGame() before anything else
    // ----------------------------------------------------------

    init(): void {
        if (this.initialized) return;
        this.initialized = true;

        this.screen = blessed.screen({
            smartCSR: true,
            title: 'SCHYRIM',
            fullUnicode: true,
            dockBorders: true,
        });

        // Layout constants
        const MENU_H = 12;    // lines for action list
        const STATUS_H = 1;   // status bar height
        const HUD_W = '32%';
        const CONTENT_W = '68%';
        // content height = total screen - menu rows - status - 2 border lines each
        const CONTENT_H = `100%-${MENU_H + STATUS_H + 2}`;

        // --- Content log (scrollable, top-left) ---
        this.contentBox = blessed.scrollablebox({
            parent: this.screen,
            top: 0,
            left: 0,
            width: CONTENT_W,
            height: CONTENT_H,
            tags: false,        // let chalk ANSI codes pass through raw
            scrollable: true,
            alwaysScroll: true,
            mouse: true,
            scrollbar: {
                ch: '│',
                style: { fg: '#2a2a2a' },
            },
            border: { type: 'line' },
            style: { border: { fg: '#333' } },
            padding: { top: 0, left: 1, right: 0, bottom: 0 },
        });

        // --- HUD panel (character stats, top-right, fixed) ---
        this.hudPanel = blessed.box({
            parent: this.screen,
            top: 0,
            right: 0,
            width: HUD_W,
            height: CONTENT_H,
            tags: false,
            border: { type: 'line' },
            style: { border: { fg: '#333' } },
            padding: { top: 0, left: 1, right: 1, bottom: 0 },
        });

        // --- Action menu (bottom, full width) ---
        this.menuList = blessed.list({
            parent: this.screen,
            top: CONTENT_H,
            left: 0,
            width: '100%',
            height: MENU_H,
            tags: false,
            keys: true,
            vi: true,
            mouse: true,
            border: { type: 'line' },
            label: chalk.hex('#555')(' ACTIONS '),
            style: {
                border: { fg: '#555' },
                selected: { fg: '#FFD700', bold: true },
                item: { fg: '#999' },
            },
            padding: { top: 0, left: 1, right: 0, bottom: 0 },
        });

        // --- Status bar (1 line, absolute bottom) ---
        this.statusBar = blessed.box({
            parent: this.screen,
            bottom: 0,
            left: 0,
            width: '100%',
            height: STATUS_H,
            tags: false,
            style: { bg: '#111', fg: '#555' },
            padding: { left: 2 },
        });

        // Menu selection handler
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.menuList.on('select', (_item: any, index: number) => {
            const choice = this.menuChoices[index];
            if (!choice || choice.disabled) return;     // skip disabled / separators
            const resolve = this.menuResolve;
            if (resolve) {
                this.menuResolve = null;
                resolve(choice.value);
            }
        });

        // Ctrl+C always quits
        this.screen.key(['C-c'], () => process.exit(0));

        this.screen.render();
    }

    // ----------------------------------------------------------
    // Content log
    // ----------------------------------------------------------

    log(text: string): void {
        const lines = text.split('\n');
        for (const line of lines) {
            this.contentLines.push(line);
        }
        // Cap history to prevent memory creep
        if (this.contentLines.length > 500) {
            this.contentLines = this.contentLines.slice(this.contentLines.length - 500);
        }
        this.contentBox.setContent(this.contentLines.join('\n'));
        this.contentBox.setScrollPerc(100);
        this.screen.render();
    }

    clear(): void {
        this.contentLines = [];
        this.contentBox.setContent('');
        this.screen.render();
    }

    // ----------------------------------------------------------
    // HUD panel (always-visible character stats)
    // ----------------------------------------------------------

    updateHUD(player: PlayerState, quests: QuestState, content: ContentRegistry): void {
        const { health, healthMax, stamina, staminaMax, magicka, magickaMax } = player.attributes;
        const BAR = 16;

        const bar = (cur: number, max: number, color: string): string => {
            const pct = max > 0 ? Math.max(0, Math.min(1, cur / max)) : 0;
            const filled = Math.round(pct * BAR);
            const empty = BAR - filled;
            return chalk.hex(color)('█'.repeat(filled)) + chalk.hex('#2a2a2a')('█'.repeat(empty));
        };

        const carry = Math.floor(
            player.inventory.items.reduce((s, e) => s + e.item.weight * e.quantity, 0)
        );

        const race = player.race.charAt(0).toUpperCase() + player.race.slice(1);
        const lines: string[] = [
            chalk.bold(player.name),
            chalk.gray(`${race}  ·  Lv ${player.level}`),
            '',
            `${chalk.red('HP')} ${bar(health, healthMax, '#cc3333')} ${chalk.gray(String(health))}`,
            `${chalk.hex('#4488ff')('SP')} ${bar(stamina, staminaMax, '#4488cc')} ${chalk.gray(String(stamina))}`,
            `${chalk.hex('#aa44ff')('MP')} ${bar(magicka, magickaMax, '#8844cc')} ${chalk.gray(String(magicka))}`,
            '',
            `${chalk.hex('#DAA520')(`◈ ${player.gold}g`)}  ${chalk.gray(`${carry}/${player.inventory.maxWeight}w`)}`,
        ];

        // Active quests (up to 3)
        const activeIds = Object.keys(quests.activeQuests);
        if (activeIds.length > 0) {
            lines.push('', chalk.hex('#DAA520')('QUESTS'));
            for (const qId of activeIds.slice(0, 3)) {
                const def = content.quests.get(qId);
                const instance = quests.activeQuests[qId];
                if (!def) continue;
                lines.push(chalk.bold(`◆ ${def.title}`));
                const stage = def.stages.find(s => s.id === instance.currentStageId);
                if (stage) {
                    const desc = stage.description.length > 28
                        ? stage.description.slice(0, 26) + '…'
                        : stage.description;
                    lines.push(chalk.gray(`  → ${desc}`));
                }
            }
        }

        if (player.perkPoints > 0) {
            lines.push('', chalk.hex('#FFD700')(`★ ${player.perkPoints} perk pt${player.perkPoints > 1 ? 's' : ''}`));
        }

        this.hudPanel.setContent(lines.join('\n'));
        this.screen.render();
    }

    // ----------------------------------------------------------
    // Status bar (location · region · time)
    // ----------------------------------------------------------

    updateStatus(locationName: string, region: string, timeStr: string): void {
        const regionFmt = region.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        this.statusBar.setContent(chalk.hex('#555')(`${locationName}  ·  ${regionFmt}  ·  ${timeStr}`));
        this.screen.render();
    }

    setMenuLabel(label: string): void {
        this.menuList.setLabel(chalk.hex('#555')(` ${label} `));
        this.screen.render();
    }

    // ----------------------------------------------------------
    // Async I/O — all return Promises for use with await
    // ----------------------------------------------------------

    /** Show choices in the menu list; resolve when a non-disabled item is selected. */
    async select(choices: UIChoice[]): Promise<string> {
        this.menuChoices = choices;

        const items = choices.map(c => {
            if (c.disabled) {
                const reason = typeof c.disabled === 'string' ? chalk.hex('#333')(` (${c.disabled})`) : '';
                return chalk.hex('#444')(`  ${c.name}`) + reason;
            }
            return `  ${c.name}`;
        });

        this.menuList.setItems(items);

        // Jump cursor to first non-disabled item
        const firstEnabled = choices.findIndex(c => !c.disabled);
        this.menuList.select(firstEnabled >= 0 ? firstEnabled : 0);
        this.menuList.focus();
        this.screen.render();

        return new Promise(resolve => {
            this.menuResolve = resolve;
        });
    }

    /** Floating textbox overlay; resolve with entered text (or defaultValue on Escape). */
    async input(prompt: string, defaultValue = ''): Promise<string> {
        return new Promise(resolve => {
            const box = blessed.textbox({
                parent: this.screen,
                top: 'center',
                left: 'center',
                width: 64,
                height: 5,
                border: { type: 'line' },
                label: chalk.hex('#FFD700')(` ${prompt} `),
                style: {
                    border: { fg: '#FFD700' },
                    bg: '#111',
                },
                keys: true,
                inputOnFocus: true,
            });

            box.setValue(defaultValue);

            box.key('enter', () => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const value = (box as any).getValue().trim();
                box.destroy();
                this.menuList.focus();
                this.screen.render();
                resolve(value || defaultValue);
            });

            box.key('escape', () => {
                box.destroy();
                this.menuList.focus();
                this.screen.render();
                resolve(defaultValue);
            });

            box.focus();
            this.screen.render();
        });
    }

    /** Show a single Continue option and wait for the player to select it. */
    async pressEnter(): Promise<void> {
        await this.select([{ name: chalk.gray('[ Continue ]'), value: '__continue__' }]);
    }

    render(): void {
        this.screen.render();
    }

    destroy(): void {
        this.screen.destroy();
    }
}

// Singleton — initialized lazily via ui.init()
export const ui = new SchyrimUI();
