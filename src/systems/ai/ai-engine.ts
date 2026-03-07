// ============================================================
// Schyrim — AI Narrative Engine
// Orchestrates provider selection, caching, and graceful fallback.
// ============================================================

import type { GameStateManager } from '../../core/game-state.js';
import type { ContentRegistry } from '../../content-registry.js';
import type { LLMProvider, ProviderConfig, AIProviderType } from '../../core/types/ai.types.js';
import { MockProvider } from './providers/mock-provider.js';
import { AnthropicProvider } from './providers/anthropic-provider.js';
import { OpenRouterProvider } from './providers/openrouter-provider.js';
import { GroqProvider } from './providers/groq-provider.js';
import { buildGameContextSnapshot, buildScenePrompt } from './prompt-builder.js';

const AI_TIMEOUT_MS = 6000; // give real providers 6 seconds before fallback

// ============================================================
// AI ENGINE CLASS
// ============================================================

export class AIEngine {
    private provider: LLMProvider;
    private providerType: AIProviderType;
    private isLiveProvider: boolean;

    /** Cache key: `${locationId}:${timePeriod}` → description text */
    private cache = new Map<string, string>();

    /** Track in-flight requests to avoid duplicate concurrent calls */
    private inflight = new Set<string>();

    constructor(provider: LLMProvider, providerType: AIProviderType, isLiveProvider: boolean) {
        this.provider = provider;
        this.providerType = providerType;
        this.isLiveProvider = isLiveProvider;
    }

    get providerName(): string {
        return this.provider.name;
    }

    get isLive(): boolean {
        return this.isLiveProvider;
    }

    get type(): AIProviderType {
        return this.providerType;
    }

    /**
     * Generate a scene description for the player's current location.
     * Returns the cached version immediately if available.
     * On failure or timeout, returns null so callers can fall back gracefully.
     */
    async generateSceneDescription(
        gsm: GameStateManager,
        content: ContentRegistry,
    ): Promise<string | null> {
        const player = gsm.getPlayer();
        const world = gsm.getWorld();
        const cacheKey = `${player.currentLocationId}:${world.currentTime.period}`;

        // Cache hit — instant return
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        // Deduplicate concurrent requests for the same key
        if (this.inflight.has(cacheKey)) {
            return null; // caller should use static description this time
        }

        this.inflight.add(cacheKey);

        try {
            const snapshot = buildGameContextSnapshot(gsm, content);
            const prompt = buildScenePrompt(snapshot);

            const raw = await withTimeout(
                this.provider.generateResponse(prompt),
                AI_TIMEOUT_MS,
            );

            const description = cleanDescription(raw.text);
            if (description) {
                this.cache.set(cacheKey, description);
            }
            return description || null;

        } catch {
            // Silently fall back — game is fully playable without AI narration
            return null;

        } finally {
            this.inflight.delete(cacheKey);
        }
    }

    /** Clear the description cache (useful after time advances or saves load). */
    clearCache(): void {
        this.cache.clear();
    }

    /** Peek at cache stats for display. */
    getCacheStats(): { size: number } {
        return { size: this.cache.size };
    }
}

// ============================================================
// FACTORY — picks the best available provider
// ============================================================

/**
 * Creates an AIEngine with the highest-priority available provider.
 *
 * Priority order:
 *   1. Anthropic   (ANTHROPIC_API_KEY) — Claude 3.5 Haiku/Sonnet
 *   2. OpenRouter  (OPENROUTER_API_KEY) — Hundreds of models
 *   3. Groq        (GROQ_API_KEY) — Fast inference
 *   4. Mock        (always available — deterministic templates)
 *
 * Returns the engine and a human-readable status string for the loading screen.
 */
export async function createAIEngine(): Promise<{ engine: AIEngine; status: string }> {
    // 1. Try Anthropic (Claude)
    const anthropicKey = process.env['ANTHROPIC_API_KEY'];
    if (anthropicKey) {
        const config: ProviderConfig = {
            provider: 'anthropic',
            apiKey: anthropicKey,
            model: process.env['ANTHROPIC_MODEL'] ?? 'claude-3-5-haiku-20241022',
            maxTokens: 200,
            temperature: 0.82,
        };
        try {
            const provider = new AnthropicProvider();
            await provider.initialize(config);
            const engine = new AIEngine(provider, 'anthropic', true);
            return { engine, status: `Claude (${config.model})` };
        } catch {
            // fall through
        }
    }

    // 2. Try OpenRouter
    const openrouterKey = process.env['OPENROUTER_API_KEY'];
    if (openrouterKey) {
        const config: ProviderConfig = {
            provider: 'openrouter',
            apiKey: openrouterKey,
            model: process.env['OPENROUTER_MODEL'] ?? 'meta-llama/llama-3.1-8b-instruct:free',
            maxTokens: 200,
            temperature: 0.82,
        };
        try {
            const provider = new OpenRouterProvider();
            await provider.initialize(config);
            const engine = new AIEngine(provider, 'openrouter', true);
            return { engine, status: `OpenRouter (${config.model})` };
        } catch {
            // fall through
        }
    }

    // 3. Try Groq
    const groqKey = process.env['GROQ_API_KEY'];
    if (groqKey) {
        const config: ProviderConfig = {
            provider: 'groq',
            apiKey: groqKey,
            model: process.env['GROQ_MODEL'] ?? 'llama-3.1-8b-instant',
            maxTokens: 200,
            temperature: 0.82,
        };
        try {
            const provider = new GroqProvider();
            await provider.initialize(config);
            const engine = new AIEngine(provider, 'groq', true);
            return { engine, status: `Groq (${config.model})` };
        } catch {
            // fall through
        }
    }

    // 4. Fall back to mock
    const mock = new MockProvider();
    await mock.initialize({ provider: 'mock' });
    const engine = new AIEngine(mock, 'mock', false);
    return { engine, status: 'offline (set ANTHROPIC_API_KEY, OPENROUTER_API_KEY, or GROQ_API_KEY to enable AI narration)' };
}

// ============================================================
// UTILITIES
// ============================================================

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`AI timeout after ${ms}ms`)), ms),
        ),
    ]);
}

/**
 * Strip any markdown, leading/trailing whitespace, or model preamble
 * that slipped past the system prompt constraints.
 */
function cleanDescription(raw: string): string {
    return raw
        .replace(/^(Sure|Certainly|Here is|Of course)[^.!?]*[.!?]\s*/i, '') // strip preambles
        .replace(/\*\*?([^*]+)\*\*?/g, '$1')  // strip **bold**
        .replace(/^#+\s*/gm, '')               // strip markdown headers
        .trim();
}
