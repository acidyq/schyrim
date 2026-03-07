// ============================================================
// Schyrim AI — Anthropic Provider
// Supports Claude models (3.5 Sonnet, 3 Haiku, etc.)
// ============================================================

import type { LLMProvider, ProviderConfig, RawAIResponse, StructuredPrompt } from '../../../core/types/ai.types.js';

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-3-5-haiku-20241022'; // Fast, low-cost, great for game narration

interface AnthropicMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface AnthropicRequestBody {
    model: string;
    max_tokens: number;
    system?: string;
    messages: AnthropicMessage[];
}

interface AnthropicResponse {
    id: string;
    type: string;
    role: string;
    content: Array<{
        type: string;
        text: string;
    }>;
    model: string;
    stop_reason: string;
    stop_sequence: string | null;
    usage: {
        input_tokens: number;
        output_tokens: number;
    };
}

/**
 * Anthropic Provider — Use Claude models for scene narration
 * Supports claude-3-5-sonnet (higher quality), claude-3-5-haiku (faster/cheaper)
 */
export class AnthropicProvider implements LLMProvider {
    readonly name = 'Anthropic';
    readonly providerType = 'anthropic' as const;
    private config: ProviderConfig | null = null;

    async initialize(config: ProviderConfig): Promise<void> {
        if (!config.apiKey) {
            throw new Error('Anthropic API key is required');
        }
        this.config = config;
    }

    async isAvailable(): Promise<boolean> {
        return this.config !== null && !!this.config.apiKey;
    }

    async generateResponse(prompt: StructuredPrompt): Promise<RawAIResponse> {
        if (!this.config) {
            throw new Error('Provider not initialized');
        }

        const start = Date.now();

        const systemMessage = `${prompt.systemMessage}

Rules:
${prompt.rulesBlock}

Context:
${prompt.contextBlock}`;

        const messages: AnthropicMessage[] = [
            {
                role: 'user',
                content: prompt.playerMessage,
            },
        ];

        const body: AnthropicRequestBody = {
            model: this.config.model ?? DEFAULT_MODEL,
            max_tokens: this.config.maxTokens ?? 200,
            system: systemMessage,
            messages,
        };

        const response = await fetch(ANTHROPIC_ENDPOINT, {
            method: 'POST',
            headers: {
                'x-api-key': this.config.apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => 'unknown error');
            throw new Error(`Anthropic ${response.status}: ${errText}`);
        }

        const data = (await response.json()) as AnthropicResponse;
        const text = data.content[0]?.text ?? '';

        return {
            text: text.trim(),
            tokensUsed: data.usage.input_tokens + data.usage.output_tokens,
            provider: 'anthropic',
            model: data.model,
            latencyMs: Date.now() - start,
        };
    }
}
