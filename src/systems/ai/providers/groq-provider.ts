// ============================================================
// Schyrim — Groq LLM Provider
// Uses the Groq REST API (OpenAI-compatible).
// Fast inference — ideal for real-time narration.
// Set GROQ_API_KEY (and optionally GROQ_MODEL) env vars.
// ============================================================

import type { LLMProvider, ProviderConfig, StructuredPrompt, RawAIResponse } from '../../../core/types/ai.types.js';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.1-8b-instant';

interface GroqResponse {
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

export class GroqProvider implements LLMProvider {
    readonly name = 'Groq';
    readonly providerType = 'groq' as const;
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

        const response = await fetch(GROQ_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => 'unknown error');
            throw new Error(`Groq ${response.status}: ${errText}`);
        }

        const data = await response.json() as GroqResponse;
        const text = data.choices[0]?.message.content ?? '';

        return {
            text: text.trim(),
            tokensUsed: data.usage?.total_tokens,
            provider: 'groq',
            model: data.model ?? body.model,
            latencyMs: Date.now() - start,
        };
    }

    async isAvailable(): Promise<boolean> {
        return !!(this.config?.apiKey);
    }
}
