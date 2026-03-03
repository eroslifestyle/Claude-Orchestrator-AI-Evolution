/**
 * RESILIENCE MANAGER - Consolidated
 * ==================================
 * Gestione resilienza consolidata da:
 * - resilience/UltraResilientFallback.ts
 * - recovery/ResourceConstraintRecovery.ts
 * - prevention/CascadeFailurePrevention.ts
 *
 * @version 4.0.0
 */

import { EventEmitter } from 'events';

// =============================================================================
// TYPES
// =============================================================================

export interface RetryOptions {
    maxRetries: number;
    delay: number;
    backoffMultiplier: number;
    maxDelay: number;
}

export interface CircuitBreakerState {
    failures: number;
    lastFailure: number;
    state: 'closed' | 'open' | 'half-open';
    threshold: number;
    resetTimeMs: number;
}

export interface RecoveryContext {
    taskId?: string;
    operation?: string;
    attempt: number;
    lastError?: Error;
}

export interface FallbackChain<T> {
    primary: () => Promise<T>;
    fallbacks: Array<() => Promise<T>>;
    finalFallback?: T;
}

// =============================================================================
// RESILIENCE MANAGER
// =============================================================================

export class ResilienceManager extends EventEmitter {
    private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
    private failureHistory: Map<string, number[]> = new Map();

    /**
     * Esegue con retry automatico
     */
    async withRetry<T>(
        fn: () => Promise<T>,
        options?: Partial<RetryOptions>
    ): Promise<T> {
        const opts: RetryOptions = {
            maxRetries: options?.maxRetries ?? 3,
            delay: options?.delay ?? 1000,
            backoffMultiplier: options?.backoffMultiplier ?? 2,
            maxDelay: options?.maxDelay ?? 30000
        };

        let lastError: Error | null = null;
        let currentDelay = opts.delay;

        for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
            try {
                const result = await fn();
                this.emit('retrySuccess', { attempt });
                return result;
            } catch (error) {
                lastError = error as Error;
                this.emit('retryAttempt', { attempt, error: lastError.message });

                if (attempt < opts.maxRetries) {
                    await this.sleep(currentDelay);
                    currentDelay = Math.min(currentDelay * opts.backoffMultiplier, opts.maxDelay);
                }
            }
        }

        this.emit('retryExhausted', { error: lastError?.message });
        throw lastError || new Error('Retry exhausted');
    }

    /**
     * Esegue con fallback chain
     */
    async withFallback<T>(chain: FallbackChain<T>): Promise<T> {
        // Prova primary
        try {
            return await chain.primary();
        } catch (primaryError) {
            this.emit('primaryFailed', { error: (primaryError as Error).message });
        }

        // Prova fallbacks in ordine
        for (let i = 0; i < chain.fallbacks.length; i++) {
            try {
                const result = await chain.fallbacks[i]();
                this.emit('fallbackUsed', { index: i });
                return result;
            } catch (error) {
                this.emit('fallbackFailed', { index: i, error: (error as Error).message });
            }
        }

        // Usa final fallback se disponibile
        if (chain.finalFallback !== undefined) {
            this.emit('finalFallbackUsed', {});
            return chain.finalFallback;
        }

        throw new Error('All fallbacks exhausted');
    }

    /**
     * Circuit Breaker pattern
     */
    async withCircuitBreaker<T>(
        key: string,
        fn: () => Promise<T>,
        threshold = 5,
        resetTimeMs = 60000
    ): Promise<T> {
        let breaker = this.circuitBreakers.get(key);

        if (!breaker) {
            breaker = {
                failures: 0,
                lastFailure: 0,
                state: 'closed',
                threshold,
                resetTimeMs
            };
            this.circuitBreakers.set(key, breaker);
        }

        // Check se circuit è open
        if (breaker.state === 'open') {
            const timeSinceLastFailure = Date.now() - breaker.lastFailure;

            if (timeSinceLastFailure < breaker.resetTimeMs) {
                throw new Error(`Circuit breaker open for ${key}`);
            }

            // Passa a half-open
            breaker.state = 'half-open';
            this.emit('circuitHalfOpen', { key });
        }

        try {
            const result = await fn();

            // Success - reset breaker
            breaker.failures = 0;
            breaker.state = 'closed';

            return result;

        } catch (error) {
            breaker.failures++;
            breaker.lastFailure = Date.now();

            if (breaker.failures >= breaker.threshold) {
                breaker.state = 'open';
                this.emit('circuitOpened', { key, failures: breaker.failures });
            }

            throw error;
        }
    }

    /**
     * Recovery da errore con context
     */
    async recoverFromError<T>(
        error: Error,
        context: RecoveryContext,
        recoveryFn: () => Promise<T>
    ): Promise<T | null> {
        this.recordFailure(context.taskId || 'unknown');

        this.emit('recovering', { error: error.message, context });

        try {
            // Attendi prima di retry (backoff)
            await this.sleep(1000 * context.attempt);

            const result = await recoveryFn();
            this.emit('recovered', { context });

            return result;

        } catch (recoveryError) {
            this.emit('recoveryFailed', {
                originalError: error.message,
                recoveryError: (recoveryError as Error).message
            });
            return null;
        }
    }

    /**
     * Prevenzione cascade failure
     */
    preventCascadeFailure(taskIds: string[]): string[] {
        const failureRates = new Map<string, number>();

        // Calcola failure rate per task
        for (const taskId of taskIds) {
            const history = this.failureHistory.get(taskId) || [];
            const recentFailures = history.filter(t => Date.now() - t < 60000).length;
            failureRates.set(taskId, recentFailures);
        }

        // Identifica task ad alto rischio
        const highRiskTasks: string[] = [];
        for (const [taskId, rate] of Array.from(failureRates)) {
            if (rate >= 3) {
                highRiskTasks.push(taskId);
                this.emit('cascadeRisk', { taskId, failureRate: rate });
            }
        }

        // Ritorna task sicuri
        return taskIds.filter(id => !highRiskTasks.includes(id));
    }

    /**
     * Registra fallimento
     */
    private recordFailure(taskId: string): void {
        if (!this.failureHistory.has(taskId)) {
            this.failureHistory.set(taskId, []);
        }
        this.failureHistory.get(taskId)!.push(Date.now());

        // Pulisci storia vecchia
        const history = this.failureHistory.get(taskId)!;
        const recentOnly = history.filter(t => Date.now() - t < 300000); // 5 min
        this.failureHistory.set(taskId, recentOnly);
    }

    /**
     * Reset circuit breaker
     */
    resetCircuitBreaker(key: string): void {
        this.circuitBreakers.delete(key);
        this.emit('circuitReset', { key });
    }

    /**
     * Get circuit breaker state
     */
    getCircuitState(key: string): CircuitBreakerState | undefined {
        return this.circuitBreakers.get(key);
    }

    /**
     * Clear all state
     */
    clearAll(): void {
        this.circuitBreakers.clear();
        this.failureHistory.clear();
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// =============================================================================
// SINGLETON & CONVENIENCE
// =============================================================================

export const resilience = new ResilienceManager();

export async function retry<T>(
    fn: () => Promise<T>,
    maxRetries = 3
): Promise<T> {
    return resilience.withRetry(fn, { maxRetries });
}

export async function withFallback<T>(
    primary: () => Promise<T>,
    fallback: () => Promise<T>
): Promise<T> {
    return resilience.withFallback({
        primary,
        fallbacks: [fallback]
    });
}
