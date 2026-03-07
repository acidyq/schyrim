// ============================================================
// Schyrim Core — Typed Event Bus
// Cross-cutting pub/sub system for inter-system communication
// ============================================================

import {
    GameEventType,
    type GameEventPayloads,
    type EventHandler,
    type GameEventRecord,
} from './types/events.types.js';

interface Subscription<T extends GameEventType> {
    handler: EventHandler<T>;
    priority: number;      // lower = earlier execution
    once: boolean;
}

/**
 * Typed event bus for game system communication.
 * Systems never import each other — they communicate through this bus.
 * Events are dispatched synchronously in priority order.
 */
export class EventBus {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private subscribers: Map<GameEventType, Subscription<any>[]> = new Map();
    private history: GameEventRecord[] = [];
    private debugMode: boolean = false;
    private maxHistorySize: number = 100;

    constructor(options?: { debugMode?: boolean; maxHistorySize?: number }) {
        this.debugMode = options?.debugMode ?? false;
        this.maxHistorySize = options?.maxHistorySize ?? 100;
    }

    /**
     * Subscribe to an event type.
     * @param eventType - The event type to listen for
     * @param handler - Callback function with typed payload
     * @param priority - Lower numbers execute first (default: 10)
     * @returns Unsubscribe function
     */
    on<T extends GameEventType>(
        eventType: T,
        handler: EventHandler<T>,
        priority: number = 10
    ): () => void {
        return this.addSubscription(eventType, handler, priority, false);
    }

    /**
     * Subscribe to an event type for a single emission only.
     */
    once<T extends GameEventType>(
        eventType: T,
        handler: EventHandler<T>,
        priority: number = 10
    ): () => void {
        return this.addSubscription(eventType, handler, priority, true);
    }

    /**
     * Emit an event to all subscribers.
     * Dispatches synchronously in priority order (deterministic).
     */
    emit<T extends GameEventType>(eventType: T, payload: GameEventPayloads[T]): void {
        if (this.debugMode) {
            console.log(`[EventBus] ${eventType}`, JSON.stringify(payload, null, 2));
        }

        // Record in history
        const record: GameEventRecord = {
            type: eventType,
            payload,
            timestamp: new Date().toISOString(),
        };
        this.history.push(record);
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }

        // Dispatch to subscribers
        const subs = this.subscribers.get(eventType);
        if (!subs || subs.length === 0) return;

        // Sort by priority (stable sort)
        const sorted = [...subs].sort((a, b) => a.priority - b.priority);

        const toRemove: Subscription<T>[] = [];

        for (const sub of sorted) {
            try {
                sub.handler(payload);
                if (sub.once) {
                    toRemove.push(sub);
                }
            } catch (error) {
                console.error(`[EventBus] Error in handler for ${eventType}:`, error);
            }
        }

        // Remove once-handlers
        if (toRemove.length > 0) {
            const remaining = subs.filter(s => !toRemove.includes(s));
            this.subscribers.set(eventType, remaining);
        }
    }

    /**
     * Remove all subscribers for a specific event type.
     */
    off(eventType: GameEventType): void {
        this.subscribers.delete(eventType);
    }

    /**
     * Remove all subscribers for all event types.
     */
    clear(): void {
        this.subscribers.clear();
    }

    /**
     * Get the event history (for AI context and debugging).
     */
    getHistory(limit?: number): GameEventRecord[] {
        const count = limit ?? this.history.length;
        return this.history.slice(-count);
    }

    /**
     * Clear event history.
     */
    clearHistory(): void {
        this.history = [];
    }

    /**
     * Get subscriber count for an event type (for testing/debugging).
     */
    getSubscriberCount(eventType: GameEventType): number {
        return this.subscribers.get(eventType)?.length ?? 0;
    }

    /**
     * Enable or disable debug logging.
     */
    setDebugMode(enabled: boolean): void {
        this.debugMode = enabled;
    }

    // --- Private ---

    private addSubscription<T extends GameEventType>(
        eventType: T,
        handler: EventHandler<T>,
        priority: number,
        once: boolean
    ): () => void {
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, []);
        }

        const subscription: Subscription<T> = { handler, priority, once };
        this.subscribers.get(eventType)!.push(subscription);

        // Return unsubscribe function
        return () => {
            const subs = this.subscribers.get(eventType);
            if (subs) {
                const index = subs.indexOf(subscription);
                if (index >= 0) {
                    subs.splice(index, 1);
                }
            }
        };
    }
}

/** Singleton event bus instance */
let globalEventBus: EventBus | null = null;

export function getEventBus(options?: { debugMode?: boolean; maxHistorySize?: number }): EventBus {
    if (!globalEventBus) {
        globalEventBus = new EventBus(options);
    }
    return globalEventBus;
}

export function resetEventBus(): void {
    if (globalEventBus) {
        globalEventBus.clear();
        globalEventBus.clearHistory();
    }
    globalEventBus = null;
}
