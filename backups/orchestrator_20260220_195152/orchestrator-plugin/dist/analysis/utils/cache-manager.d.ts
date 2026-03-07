/**
 * Cache Manager - Sistema di Cache Unificato per Analysis Layer
 *
 * Implementa LRU cache con TTL, metriche, cache warming e garbage collection
 * automatico. Ottimizzato per performance e memory usage.
 *
 * @version 1.0 - High Performance Caching
 * @author Analysis Layer Team
 * @date 30 Gennaio 2026
 */
import { AnalysisTier, KeywordExtractionResult } from '../types';
interface CacheConfig {
    /** Max entries nel cache */
    maxEntries: number;
    /** TTL default in ms */
    defaultTtlMs: number;
    /** Enable automatic cleanup */
    autoCleanup: boolean;
    /** Cleanup interval in ms */
    cleanupIntervalMs: number;
    /** Memory limit in MB (soft limit) */
    memoryLimitMB: number;
    /** Enable cache statistics */
    enableStats: boolean;
    /** Cache warming strategy */
    warmingStrategy: 'none' | 'preload' | 'background';
}
interface CacheEntry<T> {
    /** Cached data */
    data: T;
    /** Creation timestamp */
    timestamp: number;
    /** TTL in ms */
    ttlMs: number;
    /** Access count */
    accessCount: number;
    /** Last access timestamp */
    lastAccess: number;
    /** Size estimate in bytes */
    sizeBytes: number;
    /** Entry key for LRU */
    key: string;
}
interface CacheStats {
    /** Totale entries nel cache */
    totalEntries: number;
    /** Hit rate percentage */
    hitRate: number;
    /** Total hits */
    totalHits: number;
    /** Total misses */
    totalMisses: number;
    /** Memory usage in MB */
    memoryUsageMB: number;
    /** Average TTL remaining */
    averageTtlMs: number;
    /** Most accessed entries */
    topEntries: Array<{
        key: string;
        accessCount: number;
    }>;
    /** Cache efficiency */
    efficiency: number;
}
interface CacheOperationResult<T> {
    /** Found in cache? */
    hit: boolean;
    /** Cached data (if hit) */
    data?: T;
    /** Cache stats snapshot */
    stats: {
        size: number;
        hitRate: number;
        memoryMB: number;
    };
}
export declare class CacheManager<T = any> {
    private cache;
    private config;
    private stats;
    private cleanupTimer;
    private startupTime;
    constructor(config?: Partial<CacheConfig>);
    /**
     * Get value from cache
     */
    get(key: string): CacheOperationResult<T>;
    /**
     * Set value in cache con TTL custom
     */
    set(key: string, data: T, ttlMs?: number): void;
    /**
     * Remove specific key from cache
     */
    delete(key: string): boolean;
    /**
     * Clear entire cache
     */
    clear(): void;
    /**
     * Get comprehensive cache statistics
     */
    getStats(): CacheStats;
    /**
     * Force cleanup expired entries
     */
    cleanup(): number;
    /**
     * Warm cache con data predefiniti
     */
    warmCache(warmingData: Array<{
        key: string;
        data: T;
        ttlMs?: number;
    }>): Promise<void>;
    /**
     * Optimize cache (rimuove entries poco usate)
     */
    optimize(): void;
    /**
     * Destroy cache manager
     */
    destroy(): void;
    /**
     * Get quick stats snapshot
     */
    private getQuickStats;
    /**
     * Estimate size of data in bytes
     */
    private estimateSize;
    /**
     * Check se dovremmo evict per memory limit
     */
    private shouldEvictForMemory;
    /**
     * Evict entries per memory management
     */
    private evictForMemory;
    /**
     * Start automatic cleanup timer
     */
    private startCleanupTimer;
    /**
     * Reset statistics
     */
    private resetStats;
}
/**
 * Cache manager specializzato per keyword extraction results
 */
export declare class KeywordExtractionCache extends CacheManager<KeywordExtractionResult> {
    constructor();
    /**
     * Generate cache key per keyword extraction
     */
    generateKey(text: string, tier: AnalysisTier, options?: any): string;
}
/**
 * Cache manager per regex patterns compilati
 */
export declare class PatternCache extends CacheManager<RegExp> {
    constructor();
    /**
     * Cache compiled regex pattern
     */
    cachePattern(keywords: string[], flags: string): RegExp;
}
export type { CacheConfig, CacheEntry, CacheStats, CacheOperationResult };
//# sourceMappingURL=cache-manager.d.ts.map