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
/// <reference types="node" />
import { EventEmitter } from 'events';
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
export declare class ResilienceManager extends EventEmitter {
    private circuitBreakers;
    private failureHistory;
    /**
     * Esegue con retry automatico
     */
    withRetry<T>(fn: () => Promise<T>, options?: Partial<RetryOptions>): Promise<T>;
    /**
     * Esegue con fallback chain
     */
    withFallback<T>(chain: FallbackChain<T>): Promise<T>;
    /**
     * Circuit Breaker pattern
     */
    withCircuitBreaker<T>(key: string, fn: () => Promise<T>, threshold?: number, resetTimeMs?: number): Promise<T>;
    /**
     * Recovery da errore con context
     */
    recoverFromError<T>(error: Error, context: RecoveryContext, recoveryFn: () => Promise<T>): Promise<T | null>;
    /**
     * Prevenzione cascade failure
     */
    preventCascadeFailure(taskIds: string[]): string[];
    /**
     * Registra fallimento
     */
    private recordFailure;
    /**
     * Reset circuit breaker
     */
    resetCircuitBreaker(key: string): void;
    /**
     * Get circuit breaker state
     */
    getCircuitState(key: string): CircuitBreakerState | undefined;
    /**
     * Clear all state
     */
    clearAll(): void;
    /**
     * Sleep utility
     */
    private sleep;
}
export declare const resilience: ResilienceManager;
export declare function retry<T>(fn: () => Promise<T>, maxRetries?: number): Promise<T>;
export declare function withFallback<T>(primary: () => Promise<T>, fallback: () => Promise<T>): Promise<T>;
//# sourceMappingURL=resilience.d.ts.map