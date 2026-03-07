/**
 * FaultToleranceLayer - Production-ready fault tolerance implementation
 *
 * Provides:
 * - Circuit Breaker pattern with state machine
 * - Retry policies with exponential backoff and jitter
 * - Dead Letter Queue integration
 * - Health checks and metrics
 */
export declare enum CircuitState {
    CLOSED = "CLOSED",// Normal operation
    OPEN = "OPEN",// Failing, reject requests
    HALF_OPEN = "HALF_OPEN"
}
export declare enum FailureType {
    TIMEOUT = "TIMEOUT",
    NETWORK = "NETWORK",
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
    RATE_LIMITED = "RATE_LIMITED",
    UNKNOWN = "UNKNOWN"
}
export interface RetryPolicy {
    maxAttempts: number;
    initialDelay: number;
    maxDelay: number;
    multiplier: number;
    jitter: boolean;
}
export interface CircuitBreakerConfig {
    failureThreshold: number;
    successThreshold: number;
    timeout: number;
    slidingWindowSize: number;
    halfOpenMaxCalls: number;
}
export interface FaultToleranceConfig {
    defaultRetryPolicy: RetryPolicy;
    circuitBreaker: CircuitBreakerConfig;
    healthCheckInterval: number;
    dlqEnabled: boolean;
}
export interface DeadLetterMessage {
    id: string;
    service: string;
    payload: unknown;
    error: Error;
    failureType: FailureType;
    attempts: number;
    timestamp: Date;
    lastAttempt: Date;
}
export interface ServiceMetrics {
    service: string;
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    rejectedCalls: number;
    retriedCalls: number;
    circuitState: CircuitState;
    lastFailureTime?: Date;
    lastSuccessTime?: Date;
    averageResponseTime: number;
    failureRate: number;
}
export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: Date;
    services: Record<string, ServiceHealth>;
    globalMetrics: {
        totalServices: number;
        healthyServices: number;
        degradedServices: number;
        unhealthyServices: number;
    };
}
export interface ServiceHealth {
    state: CircuitState;
    available: boolean;
    lastCheck: Date;
    consecutiveFailures: number;
    consecutiveSuccesses: number;
    failureRate: number;
}
export declare class CircuitBreakerOpenError extends Error {
    constructor(message: string);
}
export declare class RetryExhaustedError extends Error {
    readonly originalError: Error;
    constructor(message: string, originalError: Error);
}
export declare class FaultToleranceLayer {
    private circuitBreakers;
    private dlq;
    private retryExecutor;
    private config;
    private healthCheckTimer?;
    private serviceMetrics;
    constructor(config?: Partial<FaultToleranceConfig>);
    /**
     * Execute a function with fault tolerance protection
     */
    execute<T>(service: string, fn: () => Promise<T>, retryPolicy?: RetryPolicy): Promise<T>;
    /**
     * Execute without retry, only circuit breaker protection
     */
    executeWithoutRetry<T>(service: string, fn: () => Promise<T>): Promise<T>;
    /**
     * Execute without circuit breaker, only retry protection
     */
    executeWithoutBreaker<T>(service: string, fn: () => Promise<T>, retryPolicy?: RetryPolicy): Promise<T>;
    private getOrCreateBreaker;
    private handleRetryAttempt;
    private classifyError;
    private sendToDLQ;
    private generateId;
    private updateServiceMetrics;
    /**
     * Get current circuit state for a service
     */
    getCircuitState(service: string): CircuitState;
    /**
     * Manually reset circuit breaker for a service
     */
    resetCircuit(service: string): void;
    /**
     * Reset all circuit breakers
     */
    resetAllCircuits(): void;
    /**
     * Force open a circuit breaker
     */
    openCircuit(service: string): void;
    /**
     * Get overall health status
     */
    getHealth(): HealthStatus;
    /**
     * Get health for a specific service
     */
    getServiceHealth(service: string): ServiceHealth | undefined;
    /**
     * Start periodic health checks
     */
    private startHealthChecks;
    /**
     * Stop health checks
     */
    stopHealthChecks(): void;
    /**
     * Perform a health check on all services
     */
    private performHealthCheck;
    /**
     * Get metrics for a specific service
     */
    getServiceMetrics(service: string): ServiceMetrics | undefined;
    /**
     * Get metrics for all services
     */
    getAllMetrics(): Record<string, ServiceMetrics>;
    /**
     * Register a DLQ processor for a service
     */
    registerDLQProcessor(service: string, processor: (msg: DeadLetterMessage) => Promise<void>): void;
    /**
     * Process DLQ messages for a service
     */
    processDLQ(service: string): Promise<number>;
    /**
     * Get DLQ size
     */
    getDLQSize(service?: string): number;
    /**
     * Get DLQ messages
     */
    getDLQMessages(service?: string, limit?: number): DeadLetterMessage[];
    /**
     * Clear DLQ
     */
    clearDLQ(service?: string): void;
    /**
     * Cleanup and shutdown
     */
    shutdown(): void;
}
/**
 * Create a configured FaultToleranceLayer instance
 */
export declare function createFaultToleranceLayer(config?: Partial<FaultToleranceConfig>): FaultToleranceLayer;
export default FaultToleranceLayer;
//# sourceMappingURL=FaultToleranceLayer.d.ts.map