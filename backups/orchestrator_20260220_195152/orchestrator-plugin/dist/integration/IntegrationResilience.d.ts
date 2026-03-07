/**
 * Integration Resilience Controller
 *
 * Handles system integration failures (~1.2% of residual failure cases).
 * Provides bulletproof API handling, rate limit management, plugin system
 * fault tolerance, and cross-platform compatibility assurance.
 *
 * TARGETS:
 * - Claude Code API rate limiting
 * - Task tool internal failures
 * - Plugin system integration issues
 * - OS-specific compatibility problems
 *
 * @version 1.0.0 - BULLETPROOF API INTEGRATION
 */
/// <reference types="node" />
import { EventEmitter } from 'events';
import type { IntegrationContext, IntegrationResilienceResult, RetryConfig, IntegrationHealth, ApiCall, ApiCallResult, RateLimitState } from '../types';
/**
 * Integration Resilience Controller - Main Class
 */
export declare class IntegrationResilience extends EventEmitter {
    private readonly logger;
    private readonly rateLimitManager;
    private readonly apiClient;
    private readonly pluginManager;
    private readonly platformManager;
    private readonly resilienceHistory;
    constructor();
    /**
     * Handle integration failure with comprehensive resilience
     */
    handleIntegrationFailure(context: IntegrationContext): Promise<IntegrationResilienceResult>;
    /**
     * Analyze failure pattern to determine best recovery approach
     */
    private analyzeFailurePattern;
    /**
     * Apply resilience strategy based on failure analysis
     */
    private applyResilienceStrategy;
    /**
     * Apply additional strategies if primary fails
     */
    private applyAdditionalStrategies;
    /**
     * Handle rate limit recovery
     */
    private handleRateLimitRecovery;
    /**
     * Handle network retry
     */
    private handleNetworkRetry;
    /**
     * Handle plugin fallback
     */
    private handlePluginFallback;
    /**
     * Handle platform fallback
     */
    private handlePlatformFallback;
    /**
     * Handle generic retry
     */
    private handleGenericRetry;
    /**
     * Handle emergency fallback
     */
    private handleEmergencyFallback;
    /**
     * Make resilient API call
     */
    makeResilientApiCall<T>(apiCall: ApiCall, retryConfig?: Partial<RetryConfig>): Promise<ApiCallResult<T>>;
    /**
     * Execute resilient plugin operation
     */
    executeResilientPluginOperation<T>(pluginId: string, operation: string, parameters: any, fallback?: () => Promise<T>): Promise<{
        success: boolean;
        data?: T;
        error?: string;
        usedFallback: boolean;
    }>;
    /**
     * Get integration resilience statistics
     */
    getResilienceStatistics(): {
        totalHandled: number;
        successRate: number;
        averageResilienceTime: number;
        failureTypeDistribution: Record<string, number>;
        mostEffectiveStrategies: Record<string, number>;
        currentIntegrationHealth: number;
    };
    /**
     * Get current integration health
     */
    getCurrentIntegrationHealth(): {
        apiHealth: Record<string, RateLimitState>;
        pluginHealth: Record<string, IntegrationHealth>;
        platformStatus: string;
        overallHealth: number;
    };
    /**
     * Reset integration health
     */
    resetIntegrationHealth(type?: string, identifier?: string): void;
}
/**
 * Export Integration Resilience Controller
 */
export default IntegrationResilience;
//# sourceMappingURL=IntegrationResilience.d.ts.map