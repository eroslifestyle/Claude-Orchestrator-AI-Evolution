/**
 * Analysis Engine - Core Orchestrator del Sistema 3-Tier
 *
 * Coordina Fast Path (Tier 1), Smart Path (Tier 2) e Deep Path (Tier 3)
 * con fallback intelligente, performance monitoring e graceful degradation.
 *
 * @version 1.0 - Core Orchestrator Implementation
 * @author Analysis Layer Team
 * @date 30 Gennaio 2026
 */
import { AnalysisTier, AnalysisResult, AnalysisMetrics } from './types';
interface AnalysisEngineInternalConfig {
    fastPath: {
        enabled: boolean;
        timeoutMs: number;
        confidenceThreshold: number;
        fallbackThreshold: number;
    };
    smartPath: {
        enabled: boolean;
        timeoutMs: number;
        confidenceThreshold: number;
        fallbackThreshold: number;
    };
    deepPath: {
        enabled: boolean;
        timeoutMs: number;
        confidenceThreshold: number;
    };
    globalSettings: {
        maxParallelRequests: number;
        requestQueueSize: number;
        memoryLimitMB: number;
        enableMetrics: boolean;
        enableProfiling: boolean;
    };
    fallbackBehavior: {
        maxTierFailures: number;
        circuitBreakerEnabled: boolean;
        circuitBreakerThreshold: number;
    };
    qualityGates: {
        minConfidenceThreshold: number;
        maxResponseTimeMs: number;
        minCoveragePercentage: number;
    };
}
interface CircuitBreakerState {
    fastPathFailures: number;
    smartPathFailures: number;
    deepPathFailures: number;
    lastFailureTime: number;
    isOpen: boolean;
    resetTimeoutMs: number;
}
export declare class AnalysisEngine {
    private config;
    private fastPathAnalyzer;
    private smartPathAnalyzer;
    private cache;
    private circuitBreaker;
    private metrics;
    private startupTime;
    private requestQueue;
    constructor(config?: Partial<AnalysisEngineInternalConfig>);
    /**
     * Analizza testo con sistema 3-tier completo
     */
    analyze(text: string): Promise<AnalysisResult>;
    /**
     * Get comprehensive system metrics
     */
    getMetrics(): AnalysisMetrics & {
        circuitBreakerStatus: CircuitBreakerState;
        fastPathMetrics: any;
        smartPathMetrics: any;
        cacheMetrics: any;
    };
    /**
     * Health check per il sistema
     */
    healthCheck(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        tiers: Record<AnalysisTier, 'active' | 'circuit_open' | 'disabled'>;
        performance: {
            averageResponseTimeMs: number;
            cacheHitRate: number;
            memoryUsageMB: number;
        };
    }>;
    /**
     * Reset circuit breaker (manual intervention)
     */
    resetCircuitBreaker(tier?: AnalysisTier): void;
    /**
     * Run tier analysis con fallback strategy
     */
    private runTierAnalysis;
    /**
     * Run tier con timeout protection
     */
    private runTierWithTimeout;
    /**
     * Check se tier può essere utilizzato (circuit breaker)
     */
    private canUseTier;
    /**
     * Handle tier failure per circuit breaker
     */
    private handleTierFailure;
    /**
     * Check quality gate per tier
     */
    private meetsQualityGate;
    /**
     * Build final analysis result
     */
    private buildAnalysisResult;
    /**
     * Classify domains da keyword results
     */
    private classifyDomains;
    /**
     * Assess complexity da keyword e context
     */
    private assessComplexity;
    /**
     * Load default configuration
     */
    private loadDefaultConfig;
    /**
     * Create request context
     */
    private createRequestContext;
    /**
     * Generate cache key
     */
    private generateCacheKey;
    /**
     * Get agent per domain
     */
    private getAgentForDomain;
    /**
     * Get model per domain e confidence
     */
    private getModelForDomain;
    /**
     * Get priority per domain
     */
    private getPriorityForDomain;
    /**
     * Get default domain when none detected
     */
    private getDefaultDomain;
    /**
     * Update metrics
     */
    private updateMetrics;
    /**
     * Update tier metrics
     */
    private updateTierMetrics;
    /**
     * Calculate overall average response time
     */
    private calculateAverageResponseTime;
    /**
     * Get tier status
     */
    private getTierStatus;
    /**
     * Estimate memory usage
     */
    private estimateMemoryUsage;
    /**
     * Create fallback result quando tutti i tier falliscono
     */
    private createFallbackResult;
    /**
     * Enrich cached result con fresh metadata
     */
    private enrichCachedResult;
    /**
     * Create error result
     */
    private createErrorResult;
}
export type { AnalysisEngineInternalConfig };
//# sourceMappingURL=analysis-engine.d.ts.map