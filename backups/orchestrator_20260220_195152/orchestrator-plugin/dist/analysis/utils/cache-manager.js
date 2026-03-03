"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatternCache = exports.KeywordExtractionCache = exports.CacheManager = void 0;
// =============================================================================
// CACHE MANAGER CLASS
// =============================================================================
class CacheManager {
    cache;
    config;
    stats;
    cleanupTimer;
    startupTime;
    constructor(config = {}) {
        this.startupTime = performance.now();
        this.config = {
            maxEntries: 500,
            defaultTtlMs: 300000, // 5 minutes
            autoCleanup: true,
            cleanupIntervalMs: 60000, // 1 minute
            memoryLimitMB: 10,
            enableStats: true,
            warmingStrategy: 'none',
            ...config
        };
        this.cache = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            totalRequests: 0
        };
        this.cleanupTimer = null;
        // Start automatic cleanup if enabled
        if (this.config.autoCleanup) {
            this.startCleanupTimer();
        }
        console.log(`💾 CacheManager inizializzato in ${Math.round(performance.now() - this.startupTime)}ms`);
    }
    // =============================================================================
    // PUBLIC API
    // =============================================================================
    /**
     * Get value from cache
     */
    get(key) {
        this.stats.totalRequests++;
        const entry = this.cache.get(key);
        if (!entry) {
            this.stats.misses++;
            return {
                hit: false,
                stats: this.getQuickStats()
            };
        }
        // Check TTL expiration
        const now = Date.now();
        const isExpired = (now - entry.timestamp) > entry.ttlMs;
        if (isExpired) {
            this.cache.delete(key);
            this.stats.misses++;
            return {
                hit: false,
                stats: this.getQuickStats()
            };
        }
        // Update access statistics
        entry.accessCount++;
        entry.lastAccess = now;
        // Move to end (LRU)
        this.cache.delete(key);
        this.cache.set(key, entry);
        this.stats.hits++;
        return {
            hit: true,
            data: entry.data,
            stats: this.getQuickStats()
        };
    }
    /**
     * Set value in cache con TTL custom
     */
    set(key, data, ttlMs) {
        const now = Date.now();
        const actualTtl = ttlMs || this.config.defaultTtlMs;
        const sizeBytes = this.estimateSize(data);
        // Check memory limit (soft enforcement)
        if (this.shouldEvictForMemory(sizeBytes)) {
            this.evictForMemory();
        }
        // LRU eviction if at capacity
        if (this.cache.size >= this.config.maxEntries) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
            this.stats.evictions++;
        }
        const entry = {
            data,
            timestamp: now,
            ttlMs: actualTtl,
            accessCount: 1,
            lastAccess: now,
            sizeBytes,
            key
        };
        this.cache.set(key, entry);
    }
    /**
     * Remove specific key from cache
     */
    delete(key) {
        return this.cache.delete(key);
    }
    /**
     * Clear entire cache
     */
    clear() {
        this.cache.clear();
        this.resetStats();
    }
    /**
     * Get comprehensive cache statistics
     */
    getStats() {
        const entries = Array.from(this.cache.values());
        const now = Date.now();
        // Calculate hit rate
        const totalAccess = this.stats.hits + this.stats.misses;
        const hitRate = totalAccess > 0 ? (this.stats.hits / totalAccess) * 100 : 0;
        // Calculate memory usage
        const totalMemory = entries.reduce((sum, entry) => sum + entry.sizeBytes, 0);
        const memoryMB = totalMemory / (1024 * 1024);
        // Calculate average TTL remaining
        const activeTtls = entries
            .filter(entry => (now - entry.timestamp) < entry.ttlMs)
            .map(entry => entry.ttlMs - (now - entry.timestamp));
        const averageTtl = activeTtls.length > 0
            ? activeTtls.reduce((sum, ttl) => sum + ttl, 0) / activeTtls.length
            : 0;
        // Find top entries by access count
        const topEntries = entries
            .sort((a, b) => b.accessCount - a.accessCount)
            .slice(0, 5)
            .map(entry => ({
            key: entry.key,
            accessCount: entry.accessCount
        }));
        // Calculate efficiency (hits per entry)
        const efficiency = entries.length > 0 ? this.stats.hits / entries.length : 0;
        return {
            totalEntries: this.cache.size,
            hitRate,
            totalHits: this.stats.hits,
            totalMisses: this.stats.misses,
            memoryUsageMB: memoryMB,
            averageTtlMs: averageTtl,
            topEntries,
            efficiency
        };
    }
    /**
     * Force cleanup expired entries
     */
    cleanup() {
        const now = Date.now();
        let removedCount = 0;
        for (const [key, entry] of this.cache.entries()) {
            const isExpired = (now - entry.timestamp) > entry.ttlMs;
            if (isExpired) {
                this.cache.delete(key);
                removedCount++;
            }
        }
        if (removedCount > 0) {
            console.log(`🧹 Cache cleanup: rimosse ${removedCount} entries scadute`);
        }
        return removedCount;
    }
    /**
     * Warm cache con data predefiniti
     */
    async warmCache(warmingData) {
        console.log(`🔥 Cache warming: caricamento ${warmingData.length} entries...`);
        for (const item of warmingData) {
            this.set(item.key, item.data, item.ttlMs);
        }
        console.log(`✅ Cache warming completato`);
    }
    /**
     * Optimize cache (rimuove entries poco usate)
     */
    optimize() {
        const entries = Array.from(this.cache.entries());
        const now = Date.now();
        // Sort by access frequency and recency
        const scored = entries.map(([key, entry]) => {
            const recencyScore = 1 / (now - entry.lastAccess + 1);
            const frequencyScore = entry.accessCount;
            const totalScore = recencyScore * frequencyScore;
            return { key, entry, score: totalScore };
        });
        scored.sort((a, b) => b.score - a.score);
        // Keep only top performers if over capacity
        const targetSize = Math.floor(this.config.maxEntries * 0.8);
        if (scored.length > targetSize) {
            const toRemove = scored.slice(targetSize);
            for (const item of toRemove) {
                this.cache.delete(item.key);
                this.stats.evictions++;
            }
            console.log(`⚡ Cache ottimizzata: rimosse ${toRemove.length} entries poco performanti`);
        }
    }
    /**
     * Destroy cache manager
     */
    destroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.clear();
        console.log('💾 CacheManager distrutto');
    }
    // =============================================================================
    // PRIVATE METHODS
    // =============================================================================
    /**
     * Get quick stats snapshot
     */
    getQuickStats() {
        const totalAccess = this.stats.hits + this.stats.misses;
        const hitRate = totalAccess > 0 ? (this.stats.hits / totalAccess) * 100 : 0;
        const totalMemory = Array.from(this.cache.values())
            .reduce((sum, entry) => sum + entry.sizeBytes, 0);
        const memoryMB = totalMemory / (1024 * 1024);
        return {
            size: this.cache.size,
            hitRate: Math.round(hitRate * 100) / 100,
            memoryMB: Math.round(memoryMB * 100) / 100
        };
    }
    /**
     * Estimate size of data in bytes
     */
    estimateSize(data) {
        try {
            // Rough estimation basata su JSON serialization
            const jsonString = JSON.stringify(data);
            return jsonString.length * 2; // UTF-16 encoding
        }
        catch (error) {
            // Fallback per oggetti non serializzabili
            return 1000; // Default 1KB
        }
    }
    /**
     * Check se dovremmo evict per memory limit
     */
    shouldEvictForMemory(newSizeBytes) {
        const currentMemory = Array.from(this.cache.values())
            .reduce((sum, entry) => sum + entry.sizeBytes, 0);
        const totalMemory = currentMemory + newSizeBytes;
        const memoryMB = totalMemory / (1024 * 1024);
        return memoryMB > this.config.memoryLimitMB;
    }
    /**
     * Evict entries per memory management
     */
    evictForMemory() {
        const entries = Array.from(this.cache.entries());
        // Remove oldest entries first
        entries
            .sort(([, a], [, b]) => a.lastAccess - b.lastAccess)
            .slice(0, Math.ceil(entries.length * 0.2)) // Remove 20%
            .forEach(([key]) => {
            this.cache.delete(key);
            this.stats.evictions++;
        });
        console.log('🧹 Memory-based eviction completata');
    }
    /**
     * Start automatic cleanup timer
     */
    startCleanupTimer() {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.config.cleanupIntervalMs);
    }
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            totalRequests: 0
        };
    }
}
exports.CacheManager = CacheManager;
// =============================================================================
// SPECIALIZED CACHE MANAGERS
// =============================================================================
/**
 * Cache manager specializzato per keyword extraction results
 */
class KeywordExtractionCache extends CacheManager {
    constructor() {
        super({
            maxEntries: 1000,
            defaultTtlMs: 600000, // 10 minutes per keyword results
            memoryLimitMB: 5,
            autoCleanup: true,
            enableStats: true
        });
    }
    /**
     * Generate cache key per keyword extraction
     */
    generateKey(text, tier, options = {}) {
        const normalizedText = text.toLowerCase().replace(/\s+/g, ' ').trim();
        const optionsHash = JSON.stringify(options);
        // Simple hash function
        let hash = 0;
        const combined = `${tier}:${normalizedText}:${optionsHash}`;
        for (let i = 0; i < combined.length; i++) {
            hash = ((hash << 5) - hash + combined.charCodeAt(i)) & 0xffffffff;
        }
        return hash.toString(16);
    }
}
exports.KeywordExtractionCache = KeywordExtractionCache;
/**
 * Cache manager per regex patterns compilati
 */
class PatternCache extends CacheManager {
    constructor() {
        super({
            maxEntries: 200,
            defaultTtlMs: 3600000, // 1 hour per patterns
            memoryLimitMB: 2,
            autoCleanup: true
        });
    }
    /**
     * Cache compiled regex pattern
     */
    cachePattern(keywords, flags) {
        const key = `${keywords.join('|')}:${flags}`;
        const cached = this.get(key);
        if (cached.hit && cached.data) {
            return cached.data;
        }
        // Compile new pattern
        const escapedKeywords = keywords.map(kw => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const pattern = new RegExp(`\\b(${escapedKeywords.join('|')})\\b`, flags);
        this.set(key, pattern);
        return pattern;
    }
}
exports.PatternCache = PatternCache;
//# sourceMappingURL=cache-manager.js.map