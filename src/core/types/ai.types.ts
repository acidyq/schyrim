// ============================================================
// Schyrim Core Types — AI Narrative Engine
// ============================================================

/** Configuration for an LLM provider */
export interface ProviderConfig {
    provider: AIProviderType;
    apiKey?: string;
    endpoint?: string;       // for Ollama or custom endpoints
    model?: string;          // specific model override
    maxTokens?: number;
    temperature?: number;
}

export type AIProviderType = 'anthropic' | 'gemini' | 'groq' | 'openrouter' | 'cerebras' | 'ollama' | 'mock';

/** Structured prompt sent to the LLM */
export interface StructuredPrompt {
    systemMessage: string;
    contextBlock: GameContextSnapshot;
    rulesBlock: string;
    playerMessage: string;
}

/** Serialized game state snapshot for AI context */
export interface GameContextSnapshot {
    location: {
        name: string;
        type: string;
        description: string;
        exits: string[];
        time: string;
        weather: string;
    };
    player: {
        name: string;
        race: string;
        level: number;
        health: string;        // "75/100"
        stamina: string;
        magicka: string;
        equippedWeapon: string;
        equippedArmor: string;
        notableItems: string[];
        activeQuests: string[];
        gold: number;
    };
    nearbyEntities: {
        npcs: string[];
        enemies: string[];
        containers: string[];
        interactables: string[];
    };
    recentEvents: string[];   // last 5-10 events as human-readable strings
    activeCombat?: {
        enemies: string[];
        playerHealth: string;
        round: number;
    };
}

/** Parsed AI response */
export interface ParsedAIResponse {
    sceneDescription: string;
    summarizedOptions: string[];
    proposedActions: ProposedAction[];
    meta: AIResponseMeta;
}

/** An action proposed by the AI for engine validation */
export interface ProposedAction {
    type: ProposedActionType;
    params: Record<string, string | number | boolean>;
}

export type ProposedActionType =
    | 'MOVE' | 'ATTACK' | 'CAST_SPELL' | 'USE_SHOUT'
    | 'TALK' | 'TRADE' | 'LOOT' | 'USE_ITEM'
    | 'REST' | 'SNEAK' | 'INSPECT' | 'WAIT'
    | 'FLEE' | 'BLOCK' | 'DODGE' | 'PICK_UP'
    | 'DROP' | 'EQUIP' | 'UNEQUIP' | 'JOURNAL'
    | 'CHARACTER_SHEET' | 'HELP' | 'SAVE' | 'LOAD';

export interface AIResponseMeta {
    flags: string[];         // e.g., "new_quest_hook", "high_danger", "skill_check_available"
    mood?: string;           // scene mood for narration consistency
    suggestedTone?: string;  // "tense", "calm", "humorous", etc.
}

/** Raw response from an LLM provider (before parsing) */
export interface RawAIResponse {
    text: string;
    tokensUsed?: number;
    provider: AIProviderType;
    model: string;
    latencyMs: number;
}

/** LLM Provider interface — the adapter contract */
export interface LLMProvider {
    name: string;
    providerType: AIProviderType;
    initialize(config: ProviderConfig): Promise<void>;
    generateResponse(prompt: StructuredPrompt): Promise<RawAIResponse>;
    isAvailable(): Promise<boolean>;
}
