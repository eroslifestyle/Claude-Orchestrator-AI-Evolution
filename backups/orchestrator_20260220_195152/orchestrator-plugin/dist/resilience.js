"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.withFallback = exports.retry = exports.resilience = exports.ResilienceManager = void 0;
const events_1 = require("events");
// =============================================================================
// RESILIENCE MANAGER
// =============================================================================
class ResilienceManager extends events_1.EventEmitter {
    circuitBreakers = new Map();
    failureHistory = new Map();
    /**
     * Esegue con retry automatico
     */
    async withRetry(fn, options) {
        const opts = {
            maxRetries: options?.maxRetries ?? 3,
            delay: options?.delay ?? 1000,
            backoffMultiplier: options?.backoffMultiplier ?? 2,
            maxDelay: options?.maxDelay ?? 30000
        };
        let lastError = null;
        let currentDelay = opts.delay;
        for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
            try {
                const result = await fn();
                this.emit('retrySuccess', { attempt });
                return result;
            }
            catch (error) {
                lastError = error;
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
    async withFallback(chain) {
        // Prova primary
        try {
            return await chain.primary();
        }
        catch (primaryError) {
            this.emit('primaryFailed', { error: primaryError.message });
        }
        // Prova fallbacks in ordine
        for (let i = 0; i < chain.fallbacks.length; i++) {
            try {
                const result = await chain.fallbacks[i]();
                this.emit('fallbackUsed', { index: i });
                return result;
            }
            catch (error) {
                this.emit('fallbackFailed', { index: i, error: error.message });
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
    async withCircuitBreaker(key, fn, threshold = 5, resetTimeMs = 60000) {
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
        }
        catch (error) {
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
    async recoverFromError(error, context, recoveryFn) {
        this.recordFailure(context.taskId || 'unknown');
        this.emit('recovering', { error: error.message, context });
        try {
            // Attendi prima di retry (backoff)
            await this.sleep(1000 * context.attempt);
            const result = await recoveryFn();
            this.emit('recovered', { context });
            return result;
        }
        catch (recoveryError) {
            this.emit('recoveryFailed', {
                originalError: error.message,
                recoveryError: recoveryError.message
            });
            return null;
        }
    }
    /**
     * Prevenzione cascade failure
     */
    preventCascadeFailure(taskIds) {
        const failureRates = new Map();
        // Calcola failure rate per task
        for (const taskId of taskIds) {
            const history = this.failureHistory.get(taskId) || [];
            const recentFailures = history.filter(t => Date.now() - t < 60000).length;
            failureRates.set(taskId, recentFailures);
        }
        // Identifica task ad alto rischio
        const highRiskTasks = [];
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
    recordFailure(taskId) {
        if (!this.failureHistory.has(taskId)) {
            this.failureHistory.set(taskId, []);
        }
        this.failureHistory.get(taskId).push(Date.now());
        // Pulisci storia vecchia
        const history = this.failureHistory.get(taskId);
        const recentOnly = history.filter(t => Date.now() - t < 300000); // 5 min
        this.failureHistory.set(taskId, recentOnly);
    }
    /**
     * Reset circuit breaker
     */
    resetCircuitBreaker(key) {
        this.circuitBreakers.delete(key);
        this.emit('circuitReset', { key });
    }
    /**
     * Get circuit breaker state
     */
    getCircuitState(key) {
        return this.circuitBreakers.get(key);
    }
    /**
     * Clear all state
     */
    clearAll() {
        this.circuitBreakers.clear();
        this.failureHistory.clear();
    }
    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.ResilienceManager = ResilienceManager;
// =============================================================================
// SINGLETON & CONVENIENCE
// =============================================================================
exports.resilience = new ResilienceManager();
async function retry(fn, maxRetries = 3) {
    return exports.resilience.withRetry(fn, { maxRetries });
}
exports.retry = retry;
async function withFallback(primary, fallback) {
    return exports.resilience.withFallback({
        primary,
        fallbacks: [fallback]
    });
}
exports.withFallback = withFallback;
//# sourceMappingURL=resilience.js.map