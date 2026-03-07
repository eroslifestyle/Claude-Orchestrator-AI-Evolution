/**
 * Resource Constraint Recovery Engine
 *
 * Handles resource constraint failures (~2% of residual failure cases).
 * Implements proactive resource monitoring, cleanup, throttling, and
 * load redistribution to prevent resource-related failures.
 *
 * TARGETS:
 * - System timeout limit reached
 * - Disk space insufficient
 * - CPU throttling during heavy processing
 * - Memory limits exceeded during parallel execution
 *
 * @version 1.0.0 - PROACTIVE RESOURCE MANAGEMENT
 */
/// <reference types="node" />
import { EventEmitter } from 'events';
import type { ResourceRecoveryResult, SystemResourceMetrics, ResourceRecoveryConfig, ResourceConstraintContext } from '../types';
/**
 * Resource Constraint Recovery Engine - Main Class
 */
export declare class ResourceConstraintRecovery extends EventEmitter {
    private readonly logger;
    private readonly resourceMonitor;
    private readonly cleanupManager;
    private readonly loadManager;
    private readonly config;
    private readonly recoveryHistory;
    constructor(config?: Partial<ResourceRecoveryConfig>);
    /**
     * Initialize recovery engine
     */
    private initializeRecoveryEngine;
    /**
     * Main recovery method - handle resource constraint
     */
    handleResourceConstraint(context: ResourceConstraintContext): Promise<ResourceRecoveryResult>;
    /**
     * Determine appropriate recovery strategy
     */
    private determineRecoveryStrategy;
    private determineMemoryRecoveryStrategy;
    private determineCpuRecoveryStrategy;
    private determineDiskRecoveryStrategy;
    private determineTimeoutRecoveryStrategy;
    /**
     * Execute recovery strategy
     */
    private executeRecoveryStrategy;
    /**
     * Execute individual recovery action
     */
    private executeRecoveryAction;
    private adjustLoadBalancing;
    private applyEmergencyThrottling;
    private adjustConcurrency;
    private enableOperationQueuing;
    private adjustTimeouts;
    /**
     * Perform additional recovery attempts
     */
    private performAdditionalRecoveryAttempts;
    /**
     * Verify recovery success
     */
    private verifyRecoverySuccess;
    /**
     * Execute operation with resource protection
     */
    executeWithResourceProtection<T>(operationId: string, operation: () => Promise<T>, priority?: number): Promise<T>;
    /**
     * Get resource constraint recovery statistics
     */
    getRecoveryStatistics(): {
        totalRecoveries: number;
        successRate: number;
        averageRecoveryTime: number;
        constraintTypeDistribution: Record<string, number>;
        mostEffectiveStrategies: Record<string, number>;
        currentSystemHealth: number;
    };
    /**
     * Get current resource monitoring status
     */
    getCurrentResourceStatus(): Promise<{
        currentMetrics: SystemResourceMetrics;
        predictions: any[];
        healthScore: number;
        recommendations: string[];
    }>;
    /**
     * Cleanup and shutdown
     */
    shutdown(): void;
}
/**
 * Export Resource Constraint Recovery Engine
 */
export default ResourceConstraintRecovery;
//# sourceMappingURL=ResourceConstraintRecovery.d.ts.map