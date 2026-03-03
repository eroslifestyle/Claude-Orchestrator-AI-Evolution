/**
 * SerenaSearchIntegration - Revolutionary Search Engine Integration
 *
 * Implementazione Integration Expert per dramatic performance improvement
 * del Claude Code Orchestrator Plugin con Serena Search capabilities.
 *
 * @version 1.0 - Serena Integration Layer
 * @author Integration Expert Agent (T1)
 * @date 30 Gennaio 2026
 */
import type { PluginConfig } from '../types';
export interface SerenaSearchRequest {
    pattern: string;
    relativePath?: string;
    restrictToCodeFiles?: boolean;
    pathsIncludeGlob?: string;
    pathsExcludeGlob?: string;
    contextLinesAfter?: number;
    contextLinesBefore?: number;
    multiline?: boolean;
    maxAnswerChars?: number;
}
export interface SerenaSearchMatch {
    filePath: string;
    lineNumber: number;
    matchingLine: string;
    contextBefore: string[];
    contextAfter: string[];
    confidence: number;
}
export interface SerenaSearchResult {
    pattern: string;
    totalMatches: number;
    fileCount: number;
    matches: SerenaSearchMatch[];
    searchTime: number;
    cached: boolean;
    error?: string;
}
export interface SerenaEnhancedKeywords {
    original: string;
    patterns: string[];
    semanticExpansions: string[];
    codePatterns: string[];
    confidence: number;
}
export interface SerenaPerformanceMetrics {
    searchTime: number;
    cacheHitRate: number;
    patternAccuracy: number;
    failoverRate: number;
    throughput: number;
    lastOptimization: Date;
}
export declare class SerenaSearchIntegration {
    private config;
    private logger;
    private fallbackSearch?;
    private cache;
    private metrics;
    private isEnabled;
    private fallbackEnabled;
    private maxCacheSize;
    private defaultTTL;
    constructor(config: PluginConfig, logger: any, fallbackSearch?: (request: SerenaSearchRequest) => Promise<SerenaSearchResult>);
    /**
     * Enhanced search con Serena engine e intelligent fallback
     */
    search(request: SerenaSearchRequest): Promise<SerenaSearchResult>;
    /**
     * Multi-pattern batch search con parallelismo massimo
     */
    batchSearch(requests: SerenaSearchRequest[]): Promise<SerenaSearchResult[]>;
    /**
     * Enhanced keyword expansion con semantic analysis
     */
    enhanceKeywords(keywords: string[]): Promise<SerenaEnhancedKeywords[]>;
    private executeSerenaSearch;
    private callSerenaPlugin;
    private parseSerenaResult;
    private generateCacheKey;
    private getCachedResult;
    private cacheResult;
    private initializePerformanceOptimizations;
    private cleanupExpiredCache;
    private evictOldestCacheEntries;
    private executeFallbackSearch;
    private generateSearchPatterns;
    private generateSemanticExpansions;
    private generateCodePatterns;
    private calculateMatchConfidence;
    private calculatePatternConfidence;
    private calculateTTL;
    private generateContentHash;
    private escapeRegex;
    private capitalize;
    private createErrorResult;
    private updateMetrics;
    private updateBatchMetrics;
    private calculateCacheHitRate;
    private updateAverageTime;
    private updatePatternAccuracy;
    private updateFailoverRate;
    private calculateThroughput;
    private updatePerformanceMetrics;
    getMetrics(): SerenaPerformanceMetrics;
    getCacheStats(): {
        size: number;
        hitRate: number;
        totalHits: number;
    };
    clearCache(): void;
    setEnabled(enabled: boolean): void;
    setFallbackEnabled(enabled: boolean): void;
}
export declare function createSerenaIntegration(config: PluginConfig, logger: any, fallbackSearch?: (request: SerenaSearchRequest) => Promise<SerenaSearchResult>): SerenaSearchIntegration;
//# sourceMappingURL=SerenaSearchIntegration.d.ts.map