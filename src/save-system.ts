// ============================================================
// Schyrim — Save System
// Persist game state to/from JSON files on disk
// ============================================================

import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GameState } from './core/types/game-state.types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAVES_DIR = join(__dirname, '..', 'saves');

export interface SaveInfo {
    filename: string;
    saveName: string;
    saveDate: string;
    playerName: string;
    playerLevel: number;
    locationId: string;
}

function ensureSavesDir(): void {
    if (!existsSync(SAVES_DIR)) {
        mkdirSync(SAVES_DIR, { recursive: true });
    }
}

export function saveGame(state: GameState, slotName: string = 'quicksave'): void {
    ensureSavesDir();
    const filename = `${slotName.replace(/[^a-z0-9_-]/gi, '_')}.json`;
    const updatedState: GameState = {
        ...state,
        meta: {
            ...state.meta,
            saveDate: new Date().toISOString(),
            saveName: slotName,
        },
    };
    writeFileSync(join(SAVES_DIR, filename), JSON.stringify(updatedState, null, 2), 'utf-8');
}

export function loadGame(filename: string): GameState {
    const path = join(SAVES_DIR, filename);
    if (!existsSync(path)) {
        throw new Error(`Save file not found: ${filename}`);
    }
    return JSON.parse(readFileSync(path, 'utf-8')) as GameState;
}

export function listSaves(): SaveInfo[] {
    ensureSavesDir();
    const files = readdirSync(SAVES_DIR).filter(f => f.endsWith('.json'));
    const saves: SaveInfo[] = [];

    for (const f of files) {
        try {
            const state = JSON.parse(readFileSync(join(SAVES_DIR, f), 'utf-8')) as GameState;
            saves.push({
                filename: f,
                saveName: state.meta.saveName || f.replace('.json', ''),
                saveDate: state.meta.saveDate,
                playerName: state.player.name || 'Unknown',
                playerLevel: state.player.level,
                locationId: state.player.currentLocationId,
            });
        } catch {
            // skip corrupt saves
        }
    }

    return saves.sort((a, b) => b.saveDate.localeCompare(a.saveDate));
}

export function hasSaves(): boolean {
    ensureSavesDir();
    return readdirSync(SAVES_DIR).some(f => f.endsWith('.json'));
}

export function deleteSave(filename: string): void {
    const path = join(SAVES_DIR, filename);
    if (existsSync(path)) {
        unlinkSync(path);
    }
}
