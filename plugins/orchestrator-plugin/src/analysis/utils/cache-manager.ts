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

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================

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
  topEntries: Array<{ key: string; accessCount: number }>;
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

// =============================================================================
// CACHE MANAGER CLASS
// =============================================================================

export class CacheManager<T = any> {
  private cache: Map<string, CacheEntry<T>>;
  private config: CacheConfig;
  private stats: {
    hits: number;
    misses: number;
    evictions: number;
    totalRequests: number;
  };
  private cleanupTimer: NodeJS.Timeout | null;
  private startupTime: number;

  constructor(config: Partial<CacheConfig> = {}) {
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
  get(key: string): CacheOperationResult<T> {
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
  set(key: string, data: T, ttlMs?: number): void {
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

    const entry: CacheEntry<T> = {
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
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.resetStats();
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats(): CacheStats {
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
  cleanup(): number {
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
  async warmCache(
    warmingData: Array<{ key: string; data: T; ttlMs?: number }>
  ): Promise<void> {
    console.log(`🔥 Cache warming: caricamento ${warmingData.length} entries...`);

    for (const item of warmingData) {
      this.set(item.key, item.data, item.ttlMs);
    }

    console.log(`✅ Cache warming completato`);
  }

  /**
   * Optimize cache (rimuove entries poco usate)
   */
  optimize(): void {
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
  destroy(): void {
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
  private getQuickStats() {
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
  private estimateSize(data: T): number {
    try {
      // Rough estimation basata su JSON serialization
      const jsonString = JSON.stringify(data);
      return jsonString.length * 2; // UTF-16 encoding
    } catch (error) {
      // Fallback per oggetti non serializzabili
      return 1000; // Default 1KB
    }
  }

  /**
   * Check se dovremmo evict per memory limit
   */
  private shouldEvictForMemory(newSizeBytes: number): boolean {
    const currentMemory = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.sizeBytes, 0);
    const totalMemory = currentMemory + newSizeBytes;
    const memoryMB = totalMemory / (1024 * 1024);

    return memoryMB > this.config.memoryLimitMB;
  }

  /**
   * Evict entries per memory management
   */
  private evictForMemory(): void {
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
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupIntervalMs);
  }

  /**
   * Reset statistics
   */
  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRequests: 0
    };
  }
}

// =============================================================================
// SPECIALIZED CACHE MANAGERS
// =============================================================================

/**
 * Cache manager specializzato per keyword extraction results
 */
export class KeywordExtractionCache extends CacheManager<KeywordExtractionResult> {
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
  generateKey(text: string, tier: AnalysisTier, options: any = {}): string {
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

/**
 * Cache manager per regex patterns compilati
 */
export class PatternCache extends CacheManager<RegExp> {
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
  cachePattern(keywords: string[], flags: string): RegExp {
    const key = `${keywords.join('|')}:${flags}`;
    const cached = this.get(key);

    if (cached.hit && cached.data) {
      return cached.data;
    }

    // Compile new pattern
    const escapedKeywords = keywords.map(kw =>
      kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    const pattern = new RegExp(`\\b(${escapedKeywords.join('|')})\\b`, flags);

    this.set(key, pattern);
    return pattern;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { CacheConfig, CacheEntry, CacheStats, CacheOperationResult };