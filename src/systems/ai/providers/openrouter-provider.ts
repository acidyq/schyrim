// ============================================================
// Schyrim — OpenRouter LLM Provider
// Uses the OpenAI-compatible API at openrouter.ai
// Supports hundreds of models including free-tier ones.
// Set OPENROUTER_API_KEY (and optionally OPENROUTER_MODEL) env vars.
// ============================================================

import type { LLMProvider, ProviderConfig, StructuredPrompt, RawAIResponse } from '../../../core/types/ai.types.js';

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'meta-llama/llama-3.1-8b-instruct:free';

interface OpenRouterResponse {
    id: string;
    model: string;
    choices: Array<{
        message: { content: string };
        finish_reason: string;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export class OpenRouterProvider implements LLMProvider {
    readonly name = 'OpenRouter';
    readonly providerType = 'openrouter' as const;
    private config!: ProviderConfig;

    async initialize(config: ProviderConfig): Promise<void> {
        this.config = config;
    }

    async generateResponse(prompt: StructuredPrompt): Promise<RawAIResponse> {
        const start = Date.now();

        const messages = [
            {
                role: 'system',
                content: `${prompt.systemMessage}\n\nRules:\n${prompt.rulesBlock}`,
            },
            {
                role: 'user',
                content: prompt.playerMessage,
            },
        ];

        const body = {
            model: this.config.model ?? DEFAULT_MODEL,
            messages,
            max_tokens: this.config.maxTokens ?? 200,
            temperature: this.config.temperature ?? 0.82,
        };

        const response = await fetch(OPENROUTER_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://schyrim.game',
                'X-Title': 'Schyrim RPG',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => 'unknown error');
            throw new Error(`OpenRouter ${response.status}: ${errText}`);
        }

        const data = await response.json() as OpenRouterResponse;
        const text = data.choices[0]?.message.content ?? '';

        return {
            text: text.trim(),
            tokensUsed: data.usage?.total_tokens,
            provider: 'openrouter',
            model: data.model ?? body.model,
            latencyMs: Date.now() - start,
        };
    }

    async isAvailable(): Promise<boolean> {
        return !!(this.config?.apiKey);
    }
}
