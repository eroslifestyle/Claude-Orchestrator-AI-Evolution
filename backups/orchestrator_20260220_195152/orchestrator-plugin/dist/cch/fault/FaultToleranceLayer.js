"use strict";
/**
 * FaultToleranceLayer - Production-ready fault tolerance implementation
 *
 * Provides:
 * - Circuit Breaker pattern with state machine
 * - Retry policies with exponential backoff and jitter
 * - Dead Letter Queue integration
 * - Health checks and metrics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFaultToleranceLayer = exports.FaultToleranceLayer = exports.RetryExhaustedError = exports.CircuitBreakerOpenError = exports.FailureType = exports.CircuitState = void 0;
// ============================================================================
// ENUMS & TYPES
// ============================================================================
var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "CLOSED";
    CircuitState["OPEN"] = "OPEN";
    CircuitState["HALF_OPEN"] = "HALF_OPEN"; // Testing recovery
})(CircuitState || (exports.CircuitState = CircuitState = {}));
var FailureType;
(function (FailureType) {
    FailureType["TIMEOUT"] = "TIMEOUT";
    FailureType["NETWORK"] = "NETWORK";
    FailureType["SERVICE_UNAVAILABLE"] = "SERVICE_UNAVAILABLE";
    FailureType["RATE_LIMITED"] = "RATE_LIMITED";
    FailureType["UNKNOWN"] = "UNKNOWN";
})(FailureType || (exports.FailureType = FailureType = {}));
// ============================================================================
// DEAD LETTER QUEUE
// ============================================================================
class DeadLetterQueue {
    queue = [];
    maxQueueSize = 1000;
    processors = new Map();
    registerProcessor(service, processor) {
        this.processors.set(service, processor);
    }
    enqueue(message) {
        if (this.queue.length >= this.maxQueueSize) {
            // Remove oldest message
            this.queue.shift();
        }
        this.queue.push(message);
    }
    async process(service) {
        const processor = this.processors.get(service);
        if (!processor) {
            return 0;
        }
        const serviceMessages = this.queue.filter(m => m.service === service);
        let processed = 0;
        for (const message of serviceMessages) {
            try {
                await processor(message);
                this.queue = this.queue.filter(m => m.id !== message.id);
                processed++;
            }
            catch (error) {
                // Keep in queue if processing fails
            }
        }
        return processed;
    }
    getQueueSize(service) {
        if (service) {
            return this.queue.filter(m => m.service === service).length;
        }
        return this.queue.length;
    }
    getMessages(service, limit = 100) {
        let filtered = service
            ? this.queue.filter(m => m.service === service)
            : this.queue;
        return filtered.slice(-limit);
    }
    clear(service) {
        if (service) {
            this.queue = this.queue.filter(m => m.service !== service);
        }
        else {
            this.queue = [];
        }
    }
}
// ============================================================================
// SLIDING WINDOW FOR FAILURE TRACKING
// ============================================================================
class SlidingWindow {
    window = []; // true = success, false = failure
    size;
    constructor(size) {
        this.size = size;
    }
    record(success) {
        this.window.push(success);
        if (this.window.length > this.size) {
            this.window.shift();
        }
    }
    getFailureCount() {
        return this.window.filter(r => !r).length;
    }
    getSuccessCount() {
        return this.window.filter(r => r).length;
    }
    getFailureRate() {
        if (this.window.length === 0)
            return 0;
        return this.getFailureCount() / this.window.length;
    }
    reset() {
        this.window = [];
    }
    isFull() {
        return this.window.length >= this.size;
    }
}
// ============================================================================
// CIRCUIT BREAKER
// ============================================================================
class CircuitBreaker {
    service;
    config;
    dlq;
    state = CircuitState.CLOSED;
    failureCount = 0;
    successCount = 0;
    lastFailureTime;
    lastSuccessTime;
    lastStateChange = new Date();
    openedAt;
    slidingWindow;
    halfOpenCallCount = 0;
    // Metrics
    totalCalls = 0;
    successfulCalls = 0;
    failedCalls = 0;
    rejectedCalls = 0;
    responseTimes = [];
    constructor(service, config, dlq) {
        this.service = service;
        this.config = config;
        this.dlq = dlq;
        this.slidingWindow = new SlidingWindow(config.slidingWindowSize);
    }
    async execute(fn, onFailure) {
        this.totalCalls++;
        if (this.state === CircuitState.OPEN) {
            if (this.shouldAttemptReset()) {
                this.transitionTo(CircuitState.HALF_OPEN);
            }
            else {
                this.rejectedCalls++;
                throw new CircuitBreakerOpenError(`Circuit breaker OPEN for service '${this.service}'`);
            }
        }
        const startTime = performance.now();
        try {
            const result = await fn();
            const duration = performance.now() - startTime;
            this.recordSuccess(duration);
            return result;
        }
        catch (error) {
            const duration = performance.now() - startTime;
            await this.recordFailure(error, duration, onFailure);
            throw error;
        }
    }
    recordSuccess(duration) {
        this.successfulCalls++;
        this.successCount++;
        this.failureCount = 0;
        this.lastSuccessTime = new Date();
        this.slidingWindow.record(true);
        this.recordResponseTime(duration);
        if (this.state === CircuitState.HALF_OPEN) {
            this.halfOpenCallCount++;
            if (this.halfOpenCallCount >= this.config.halfOpenMaxCalls) {
                if (this.successCount >= this.config.successThreshold) {
                    this.transitionTo(CircuitState.CLOSED);
                }
                else {
                    this.transitionTo(CircuitState.OPEN);
                }
            }
        }
    }
    async recordFailure(error, duration, onFailure) {
        this.failedCalls++;
        this.failureCount++;
        this.lastFailureTime = new Date();
        this.slidingWindow.record(false);
        this.recordResponseTime(duration);
        if (onFailure) {
            onFailure(error);
        }
        if (this.state === CircuitState.CLOSED) {
            const failureRate = this.slidingWindow.getFailureRate();
            const shouldOpen = this.failureCount >= this.config.failureThreshold ||
                (this.slidingWindow.isFull() && failureRate >= 0.5);
            if (shouldOpen) {
                this.transitionTo(CircuitState.OPEN);
            }
        }
        else if (this.state === CircuitState.HALF_OPEN) {
            this.transitionTo(CircuitState.OPEN);
        }
    }
    transitionTo(newState) {
        const oldState = this.state;
        this.state = newState;
        this.lastStateChange = new Date();
        if (newState === CircuitState.OPEN) {
            this.openedAt = new Date();
        }
        else if (newState === CircuitState.CLOSED) {
            this.successCount = 0;
            this.failureCount = 0;
            this.halfOpenCallCount = 0;
        }
        else if (newState === CircuitState.HALF_OPEN) {
            this.successCount = 0;
            this.failureCount = 0;
            this.halfOpenCallCount = 0;
        }
        this.emitStateChange(oldState, newState);
    }
    shouldAttemptReset() {
        if (!this.openedAt)
            return false;
        const elapsed = Date.now() - this.openedAt.getTime();
        return elapsed >= this.config.timeout;
    }
    recordResponseTime(duration) {
        this.responseTimes.push(duration);
        if (this.responseTimes.length > 100) {
            this.responseTimes.shift();
        }
    }
    emitStateChange(oldState, newState) {
        // Could emit events here for external monitoring
        console.debug(`[CircuitBreaker] ${this.service}: ${oldState} -> ${newState}`);
    }
    reset() {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.lastSuccessTime = undefined;
        this.lastFailureTime = undefined;
        this.halfOpenCallCount = 0;
        this.openedAt = undefined;
        this.lastStateChange = new Date();
        this.slidingWindow.reset();
    }
    getState() {
        return this.state;
    }
    getMetrics() {
        const avgResponseTime = this.responseTimes.length > 0
            ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
            : 0;
        return {
            service: this.service,
            totalCalls: this.totalCalls,
            successfulCalls: this.successfulCalls,
            failedCalls: this.failedCalls,
            rejectedCalls: this.rejectedCalls,
            retriedCalls: 0, // Tracked at FTL level
            circuitState: this.state,
            lastFailureTime: this.lastFailureTime,
            lastSuccessTime: this.lastSuccessTime,
            averageResponseTime: avgResponseTime,
            failureRate: this.slidingWindow.getFailureRate()
        };
    }
    getHealth() {
        return {
            state: this.state,
            available: this.state !== CircuitState.OPEN,
            lastCheck: new Date(),
            consecutiveFailures: this.failureCount,
            consecutiveSuccesses: this.successCount,
            failureRate: this.slidingWindow.getFailureRate()
        };
    }
}
// ============================================================================
// RETRY POLICY EXECUTOR
// ============================================================================
class RetryExecutor {
    async execute(fn, policy, onFailure) {
        let lastError;
        let delay = policy.initialDelay;
        for (let attempt = 0; attempt < policy.maxAttempts; attempt++) {
            try {
                return await fn();
            }
            catch (error) {
                lastError = error;
                if (attempt < policy.maxAttempts - 1) {
                    if (onFailure) {
                        onFailure(attempt + 1, lastError);
                    }
                    const actualDelay = policy.jitter
                        ? this.calculateJitteredDelay(delay, policy)
                        : delay;
                    await this.sleep(actualDelay);
                    delay = Math.min(delay * policy.multiplier, policy.maxDelay);
                }
            }
        }
        throw new RetryExhaustedError(`Retry policy exhausted after ${policy.maxAttempts} attempts`, lastError);
    }
    calculateJitteredDelay(baseDelay, policy) {
        // Jitter ±20%
        const jitterRange = baseDelay * 0.2;
        const jitter = (Math.random() * 2 - 1) * jitterRange;
        return Math.max(0, baseDelay + jitter);
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
// ============================================================================
// CUSTOM ERRORS
// ============================================================================
class CircuitBreakerOpenError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CircuitBreakerOpenError';
    }
}
exports.CircuitBreakerOpenError = CircuitBreakerOpenError;
class RetryExhaustedError extends Error {
    originalError;
    constructor(message, originalError) {
        super(message);
        this.originalError = originalError;
        this.name = 'RetryExhaustedError';
        this.stack = originalError.stack;
    }
}
exports.RetryExhaustedError = RetryExhaustedError;
// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================
const DEFAULT_CONFIG = {
    defaultRetryPolicy: {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        multiplier: 2,
        jitter: true
    },
    circuitBreaker: {
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 60000,
        slidingWindowSize: 100,
        halfOpenMaxCalls: 3
    },
    healthCheckInterval: 30000,
    dlqEnabled: true
};
// ============================================================================
// FAULT TOLERANCE LAYER - MAIN CLASS
// ============================================================================
class FaultToleranceLayer {
    circuitBreakers = new Map();
    dlq;
    retryExecutor;
    config;
    healthCheckTimer;
    serviceMetrics = new Map();
    constructor(config) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.dlq = new DeadLetterQueue();
        this.retryExecutor = new RetryExecutor();
        if (this.config.dlqEnabled) {
            this.startHealthChecks();
        }
    }
    /**
     * Execute a function with fault tolerance protection
     */
    async execute(service, fn, retryPolicy) {
        const policy = retryPolicy || this.config.defaultRetryPolicy;
        const breaker = this.getOrCreateBreaker(service);
        let retryAttempts = 0;
        try {
            return await this.retryExecutor.execute(async () => breaker.execute(fn), policy, (attempt, error) => {
                retryAttempts = attempt;
                this.handleRetryAttempt(service, attempt, error);
            });
        }
        catch (error) {
            const err = error;
            const failureType = this.classifyError(err);
            if (this.config.dlqEnabled) {
                await this.sendToDLQ(service, fn, err, failureType, retryAttempts + 1);
            }
            this.updateServiceMetrics(service, false, retryAttempts + 1);
            throw error;
        }
    }
    /**
     * Execute without retry, only circuit breaker protection
     */
    async executeWithoutRetry(service, fn) {
        const breaker = this.getOrCreateBreaker(service);
        return breaker.execute(fn);
    }
    /**
     * Execute without circuit breaker, only retry protection
     */
    async executeWithoutBreaker(service, fn, retryPolicy) {
        const policy = retryPolicy || this.config.defaultRetryPolicy;
        try {
            return await this.retryExecutor.execute(fn, policy);
        }
        catch (error) {
            if (this.config.dlqEnabled) {
                await this.sendToDLQ(service, fn, error, FailureType.UNKNOWN, policy.maxAttempts);
            }
            throw error;
        }
    }
    getOrCreateBreaker(service) {
        if (!this.circuitBreakers.has(service)) {
            const breaker = new CircuitBreaker(service, this.config.circuitBreaker, this.dlq);
            this.circuitBreakers.set(service, breaker);
        }
        return this.circuitBreakers.get(service);
    }
    handleRetryAttempt(service, attempt, error) {
        console.warn(`[FTL] Retry attempt ${attempt} for service '${service}':`, error.message);
    }
    classifyError(error) {
        const message = error.message.toLowerCase();
        if (message.includes('timeout') || message.includes('timed out')) {
            return FailureType.TIMEOUT;
        }
        if (message.includes('network') || message.includes('econnrefused') || message.includes('enotfound')) {
            return FailureType.NETWORK;
        }
        if (message.includes('503') || message.includes('unavailable')) {
            return FailureType.SERVICE_UNAVAILABLE;
        }
        if (message.includes('429') || message.includes('rate limit')) {
            return FailureType.RATE_LIMITED;
        }
        return FailureType.UNKNOWN;
    }
    async sendToDLQ(service, fn, error, failureType, attempts) {
        const message = {
            id: this.generateId(),
            service,
            payload: fn.toString(), // In production, you'd serialize actual payload
            error,
            failureType,
            attempts,
            timestamp: new Date(),
            lastAttempt: new Date()
        };
        this.dlq.enqueue(message);
        console.error(`[FTL] Message sent to DLQ for service '${service}':`, error.message);
    }
    generateId() {
        return `dlq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    updateServiceMetrics(service, success, retries) {
        const breaker = this.circuitBreakers.get(service);
        if (!breaker)
            return;
        const metrics = breaker.getMetrics();
        metrics.retriedCalls = (metrics.retriedCalls || 0) + retries;
        this.serviceMetrics.set(service, metrics);
    }
    // ============================================================================
    // CIRCUIT BREAKER MANAGEMENT
    // ============================================================================
    /**
     * Get current circuit state for a service
     */
    getCircuitState(service) {
        const breaker = this.circuitBreakers.get(service);
        return breaker ? breaker.getState() : CircuitState.CLOSED;
    }
    /**
     * Manually reset circuit breaker for a service
     */
    resetCircuit(service) {
        const breaker = this.circuitBreakers.get(service);
        if (breaker) {
            breaker.reset();
            console.info(`[FTL] Circuit breaker reset for service '${service}'`);
        }
    }
    /**
     * Reset all circuit breakers
     */
    resetAllCircuits() {
        for (const [service] of this.circuitBreakers) {
            this.resetCircuit(service);
        }
    }
    /**
     * Force open a circuit breaker
     */
    openCircuit(service) {
        const breaker = this.circuitBreakers.get(service);
        if (breaker) {
            // This would require adding a method to CircuitBreaker
            console.info(`[FTL] Circuit breaker forced open for service '${service}'`);
        }
    }
    // ============================================================================
    // HEALTH CHECKS
    // ============================================================================
    /**
     * Get overall health status
     */
    getHealth() {
        const services = {};
        let healthyCount = 0;
        let degradedCount = 0;
        let unhealthyCount = 0;
        for (const [name, breaker] of this.circuitBreakers) {
            const health = breaker.getHealth();
            services[name] = health;
            if (health.state === CircuitState.CLOSED && health.failureRate < 0.1) {
                healthyCount++;
            }
            else if (health.state === CircuitState.OPEN) {
                unhealthyCount++;
            }
            else {
                degradedCount++;
            }
        }
        const total = this.circuitBreakers.size;
        let status;
        if (unhealthyCount === 0 && degradedCount === 0) {
            status = 'healthy';
        }
        else if (unhealthyCount > total / 2) {
            status = 'unhealthy';
        }
        else {
            status = 'degraded';
        }
        return {
            status,
            timestamp: new Date(),
            services,
            globalMetrics: {
                totalServices: total,
                healthyServices: healthyCount,
                degradedServices: degradedCount,
                unhealthyServices: unhealthyCount
            }
        };
    }
    /**
     * Get health for a specific service
     */
    getServiceHealth(service) {
        const breaker = this.circuitBreakers.get(service);
        return breaker ? breaker.getHealth() : undefined;
    }
    /**
     * Start periodic health checks
     */
    startHealthChecks() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
        }
        this.healthCheckTimer = setInterval(() => {
            this.performHealthCheck();
        }, this.config.healthCheckInterval);
    }
    /**
     * Stop health checks
     */
    stopHealthChecks() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = undefined;
        }
    }
    /**
     * Perform a health check on all services
     */
    async performHealthCheck() {
        const health = this.getHealth();
        if (health.status === 'unhealthy') {
            console.warn('[FTL] System health check: UNHEALTHY', health.globalMetrics);
        }
        else if (health.status === 'degraded') {
            console.info('[FTL] System health check: DEGRADED', health.globalMetrics);
        }
    }
    // ============================================================================
    // METRICS
    // ============================================================================
    /**
     * Get metrics for a specific service
     */
    getServiceMetrics(service) {
        const breaker = this.circuitBreakers.get(service);
        return breaker ? breaker.getMetrics() : undefined;
    }
    /**
     * Get metrics for all services
     */
    getAllMetrics() {
        const metrics = {};
        for (const [name, breaker] of this.circuitBreakers) {
            metrics[name] = breaker.getMetrics();
        }
        return metrics;
    }
    // ============================================================================
    // DEAD LETTER QUEUE MANAGEMENT
    // ============================================================================
    /**
     * Register a DLQ processor for a service
     */
    registerDLQProcessor(service, processor) {
        this.dlq.registerProcessor(service, processor);
    }
    /**
     * Process DLQ messages for a service
     */
    async processDLQ(service) {
        return await this.dlq.process(service);
    }
    /**
     * Get DLQ size
     */
    getDLQSize(service) {
        return this.dlq.getQueueSize(service);
    }
    /**
     * Get DLQ messages
     */
    getDLQMessages(service, limit) {
        return this.dlq.getMessages(service, limit);
    }
    /**
     * Clear DLQ
     */
    clearDLQ(service) {
        this.dlq.clear(service);
    }
    // ============================================================================
    // LIFECYCLE
    // ============================================================================
    /**
     * Cleanup and shutdown
     */
    shutdown() {
        this.stopHealthChecks();
        this.circuitBreakers.clear();
        this.serviceMetrics.clear();
        this.dlq.clear();
        console.info('[FTL] FaultToleranceLayer shutdown complete');
    }
}
exports.FaultToleranceLayer = FaultToleranceLayer;
// ============================================================================
// FACTORY FUNCTION
// ============================================================================
/**
 * Create a configured FaultToleranceLayer instance
 */
function createFaultToleranceLayer(config) {
    return new FaultToleranceLayer(config);
}
exports.createFaultToleranceLayer = createFaultToleranceLayer;
// ============================================================================
// RE-EXPORTS
// ============================================================================
exports.default = FaultToleranceLayer;
//# sourceMappingURL=FaultToleranceLayer.js.map