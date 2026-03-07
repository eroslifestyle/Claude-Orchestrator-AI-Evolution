/**
 * Tier 1 - Fast Path Analyzer
 *
 * Enhanced regex engine con word boundaries, caching e performance optimization
 * Target: <10ms response time, 70% coverage, confidence threshold 0.7
 *
 * @version 1.0 - Fast Path Implementation
 * @author Analysis Layer Team
 * @date 30 Gennaio 2026
 */
import { KeywordExtractionResult, GracefulPromise } from '../../types';
import { CacheStats } from '../../utils/cache-manager';
interface FastPathConfig {
    enabled: boolean;
    timeoutMs: number;
    confidenceThreshold: number;
    maxInputLength: number;
    enableWordBoundaries: boolean;
    enableCaching: boolean;
    cacheSize: number;
    caseSensitive: boolean;
}
export declare class FastPathAnalyzer {
    private config;
    private keywordCache;
    private patternCache;
    private patterns;
    private confidenceScorer;
    private startupTime;
    private performanceMetrics;
    constructor(config?: Partial<FastPathConfig>);
    /**
     * Analizza testo con Fast Path (Tier 1)
     * Target: <10ms, confidence >0.7, 70% coverage
     */
    analyze(text: string): GracefulPromise<KeywordExtractionResult>;
    /**
     * Check se Fast Path può gestire questa richiesta
     */
    canHandle(text: string): boolean;
    /**
     * Get comprehensive performance metrics
     */
    getMetrics(): FastPathMetrics;
    /**
     * Core keyword extraction con enhanced regex
     */
    private extractKeywordsFast;
    /**
     * Check se il context contiene amplifier per il dominio
     */
    private hasContextAmplifiers;
    /**
     * Extract context circostante (5 parole prima/dopo)
     */
    private extractContext;
    /**
     * Compila regex patterns da keyword mappings
     */
    private compileRegexPatterns;
    /**
     * Build regex pattern per un dominio
     */
    private buildDomainRegex;
    /**
     * Get hardcoded domain mappings (placeholder per MVP)
     */
    private getHardcodedMappings;
    /**
     * Update cache-related metrics
     */
    private updateCacheMetrics;
    /**
     * Update performance metrics con new response time
     */
    private updatePerformanceMetrics;
    /**
     * Optimize performance periodically
     */
    private optimizePerformance;
    /**
     * Preprocess input text
     */
    private preprocessText;
    /**
     * Validate input
     */
    private isValidInput;
    /**
     * Quick confidence score senza full analysis
     */
    private getQuickConfidenceScore;
    /**
     * Find original keyword da match
     */
    private findOriginalKeyword;
    /**
     * Build final extraction result
     */
    private buildExtractionResult;
    /**
     * Create success result
     */
    private createSuccessResult;
    /**
     * Create error result
     */
    private createErrorResult;
    /**
     * Calculate cache hit rate
     */
    private calculateCacheHitRate;
    /**
     * Get average response time
     */
    private getAverageResponseTime;
    /**
     * Estimate memory usage
     */
    private estimateMemoryUsage;
}
export interface FastPathMetrics {
    cacheSize: number;
    cacheHitRate: number;
    averageResponseTime: number;
    patternsLoaded: number;
    memoryUsage: number;
    patternCacheStats: CacheStats;
    keywordCacheStats: CacheStats;
    totalRequests: number;
    patternCompilationTime: number;
}
export type { FastPathConfig };
//# sourceMappingURL=fast-path-analyzer.d.ts.map