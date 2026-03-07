/**
 * Cascade Failure Prevention System
 *
 * Prevents cascade failures that constitute ~1.5% of the residual failure cases.
 * Implements circuit breaker patterns, dependency loop detection, and automatic
 * failure isolation to ensure system stability.
 *
 * CRITICAL MISSION: Eliminate configuration cascade failures that prevent
 * 100% fallback success rate achievement.
 *
 * @version 1.0.0 - ZERO TOLERANCE CASCADE PREVENTION
 */
/// <reference types="node" />
import { EventEmitter } from 'events';
import type { CascadeFailureContext } from '../types';
interface CircuitBreakerState {
    operationId: string;
    state: 'closed' | 'open' | 'half-open';
    failureCount: number;
    successCount: number;
    lastFailureTime: number;
    lastSuccessTime: number;
    metrics: {
        totalRequests: number;
        successfulRequests: number;
        failedRequests: number;
        averageResponseTime: number;
    };
}
interface CascadePreventionConfig {
    enableCircuitBreaker: boolean;
    enableDependencyAnalysis: boolean;
    autoFixCircularDependencies: boolean;
    maxAutoFixAttempts: number;
    circuitBreakerConfig: {
        failureThreshold: number;
        timeout: number;
        openTimeout: number;
    };
}
interface SystemHealthMetrics {
    overallHealth: number;
    configurationHealth: number;
    dependencyHealth: number;
    circuitBreakerHealth: number;
    systemLoad: {
        cpu: number;
        memory: number;
        disk: number;
    };
    activeCircuitBreakers: Record<string, CircuitBreakerState>;
    criticalIssueCount: number;
    warningIssueCount: number;
    assessmentTime: number;
    timestamp: string;
    error?: string;
}
interface PreventionResult {
    preventionId: string;
    success: boolean;
    actionsPerformed: string[];
    preventionTime: number;
    systemHealthBefore: SystemHealthMetrics;
    systemHealthAfter: SystemHealthMetrics | null;
    dependencyAnalysis?: any;
    circuitBreakersConfigured?: number;
    autoFixResults?: any;
    error?: string;
    timestamp: string;
}
interface CascadeFailureContextExtended extends CascadeFailureContext {
    rootPath: string;
    configPaths: string[];
}
/**
 * Cascade Failure Prevention System - Main Class
 * Coordinates all cascade prevention mechanisms
 */
export declare class CascadeFailurePrevention extends EventEmitter {
    private readonly logger;
    private readonly dependencyAnalyzer;
    private readonly circuitBreaker;
    private readonly config;
    private readonly preventionHistory;
    constructor(config?: Partial<CascadePreventionConfig>);
    /**
     * Main prevention method - analyze and prevent cascade failures
     */
    preventCascadeFailures(context: CascadeFailureContextExtended): Promise<PreventionResult>;
    /**
     * Perform dependency analysis
     */
    private performDependencyAnalysis;
    /**
     * Setup circuit breakers for critical operations
     */
    private setupCircuitBreakers;
    /**
     * Auto-fix critical issues
     */
    private autoFixCriticalIssues;
    /**
     * Assess current system health
     */
    private assessSystemHealth;
    /**
     * Execute operation through circuit breaker protection
     */
    executeProtected<T>(operationId: string, operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<T>;
    /**
     * Get prevention statistics
     */
    getPreventionStatistics(): {
        totalPreventions: number;
        successRate: number;
        averagePreventionTime: number;
        totalIssuesFixed: number;
        circuitBreakerStats: Record<string, CircuitBreakerState>;
        commonIssueTypes: Record<string, number>;
    };
    /**
     * Reset circuit breaker
     */
    resetCircuitBreaker(operationId: string): void;
    /**
     * Reset all circuit breakers
     */
    resetAllCircuitBreakers(): void;
}
/**
 * Export Cascade Failure Prevention System
 */
export default CascadeFailurePrevention;
//# sourceMappingURL=CascadeFailurePrevention.d.ts.map