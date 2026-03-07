/**
 * CONTEXT POOL MANAGER (CPM)
 * ===========================
 *
 * Production-ready context pooling system that eliminates Clean Context overhead.
 *
 * PERFORMANCE IMPROVEMENTS:
 * - 200-500ms -> <10ms context acquisition time
 * - Pre-warmed contexts per agent type
 * - Slab allocator pattern for memory efficiency
 * - LRU eviction for optimal memory usage
 *
 * @version 1.0.0
 * @author CCH Team
 */
/// <reference types="node" />
import { EventEmitter } from 'events';
/**
 * Clean Context representation
 */
export interface CleanContext {
    /** Agent type identifier */
    agentType: string;
    /** System prompt for this context */
    systemPrompt: string;
    /** Expertise area of the agent */
    expertise: string;
    /** Creation timestamp */
    createdAt: number;
    /** Last usage timestamp */
    lastUsed: number;
    /** Number of times this context was reused */
    usageCount: number;
    /** Unique context identifier */
    id: string;
    /** Current state of the context */
    state: ContextState;
    /** Context metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Context lifecycle states
 */
export type ContextState = 'idle' | 'acquired' | 'warming' | 'expired';
/**
 * Pool statistics for monitoring
 */
export interface PoolStats {
    /** Total contexts in pool */
    totalContexts: number;
    /** Currently available contexts */
    availableContexts: number;
    /** Currently acquired contexts */
    acquiredContexts: number;
    /** Number of agent types with pools */
    agentTypeCount: number;
    /** Cache hit rate (0-1) */
    hitRate: number;
    /** Total cache hits */
    totalHits: number;
    /** Total cache misses */
    totalMisses: number;
    /** Average context usage count */
    avgUsageCount: number;
    /** Contexts created total */
    contextsCreated: number;
    /** Contexts reused total */
    contextsReused: number;
    /** Contexts evicted total */
    contextsEvicted: number;
    /** Current memory usage estimate (bytes) */
    estimatedMemoryUsage: number;
    /** Per-agent-type statistics */
    agentTypeStats: Record<string, AgentTypeStats>;
    /** Last cleanup time */
    lastCleanupTime: number;
    /** Last stats update time */
    lastUpdated: number;
}
/**
 * Per-agent-type pool statistics
 */
export interface AgentTypeStats {
    /** Agent type identifier */
    agentType: string;
    /** Total contexts for this type */
    totalContexts: number;
    /** Available contexts */
    available: number;
    /** Acquired contexts */
    acquired: number;
    /** Pool hit rate */
    hitRate: number;
    /** Total acquisitions */
    totalAcquisitions: number;
    /** Average usage count */
    avgUsageCount: number;
    /** Preload status */
    isPreloaded: boolean;
}
/**
 * Pool configuration options
 */
export interface ContextPoolConfig {
    /** Minimum contexts per agent type (default: 5) */
    minPoolSize: number;
    /** Maximum contexts per agent type (default: 50) */
    maxPoolSize: number;
    /** Preload contexts on pool creation (default: true) */
    preloadEnabled: boolean;
    /** Number of contexts to preload (default: 10) */
    preloadCount: number;
    /** TTL for unused contexts in ms (default: 5 minutes) */
    contextTTL: number;
    /** Cleanup interval in ms (default: 1 minute) */
    cleanupInterval: number;
    /** Enable LRU eviction (default: true) */
    lruEvictionEnabled: boolean;
    /** Enable memory monitoring (default: true) */
    memoryMonitoringEnabled: boolean;
    /** Maximum memory per pool in bytes (default: 50MB) */
    maxMemoryBytes: number;
    /** Enable detailed metrics (default: true) */
    detailedMetricsEnabled: boolean;
    /** Enable automatic cleanup (default: true) */
    autoCleanupEnabled: boolean;
    /** Concurrent access safety lock timeout (default: 5000ms) */
    lockTimeout: number;
    /** Enable WeakMap for memory efficiency (default: true) */
    useWeakMap: boolean;
}
/**
 * Result of context acquisition
 */
export interface AcquisitionResult {
    /** The acquired context */
    context: CleanContext;
    /** Whether this was a cache hit */
    fromCache: boolean;
    /** Acquisition time in milliseconds */
    acquisitionTime: number;
}
export declare class ContextPoolManager extends EventEmitter {
    /** Agent type pools */
    private pools;
    /** Cleanup interval timer */
    private cleanupTimer;
    /** Configuration */
    private config;
    /** Global statistics */
    private globalStats;
    private static readonly EXPERTISE_MAP;
    constructor(config?: Partial<ContextPoolConfig>);
    /**
     * Acquire a context for the specified agent type
     * @param agentType The type of agent
     * @returns Acquired context with metadata
     */
    acquire(agentType: string): Promise<CleanContext>;
    /**
     * Acquire a context with detailed result
     * @param agentType The type of agent
     * @returns Acquisition result with timing and cache info
     */
    acquireWithResult(agentType: string): Promise<AcquisitionResult>;
    /**
     * Release a context back to the pool
     * @param context The context to release
     */
    release(context: CleanContext): Promise<void>;
    /**
     * Release multiple contexts
     * @param contexts Array of contexts to release
     */
    releaseMany(contexts: CleanContext[]): Promise<void>;
    /**
     * Preload contexts for specified agent types
     * @param agentTypes Array of agent types to preload
     */
    preload(agentTypes: string[]): Promise<void>;
    /**
     * Preload contexts for a single agent type
     * @param agentType The agent type to preload
     * @param count Number of contexts to preload
     */
    preloadAgentType(agentType: string, count?: number): Promise<void>;
    /**
     * Clear all contexts from all pools
     */
    clear(): void;
    /**
     * Clear pool for a specific agent type
     * @param agentType The agent type to clear
     */
    clearAgentType(agentType: string): void;
    /**
     * Shrink all pools to minimum size
     */
    shrink(): void;
    /**
     * Get comprehensive pool statistics
     */
    getStats(): PoolStats;
    /**
     * Get statistics for a specific agent type
     * @param agentType The agent type
     */
    getAgentTypeStats(agentType: string): AgentTypeStats | undefined;
    /**
     * Get a summary of pool status (human-readable)
     */
    getStatusSummary(): string;
    /**
     * Perform cleanup of expired contexts
     * @returns Number of contexts cleaned up
     */
    cleanup(): number;
    /**
     * Start automatic cleanup interval
     */
    private startCleanup;
    /**
     * Stop automatic cleanup interval
     */
    stopCleanup(): void;
    private createPool;
    private getExpertiseMapping;
    /**
     * Shutdown the pool manager and release resources
     */
    shutdown(): void;
    /**
     * Reset statistics without clearing pools
     */
    resetStats(): void;
    /**
     * Check if a pool exists for the given agent type
     */
    hasPool(agentType: string): boolean;
    /**
     * Get all agent types with pools
     */
    getAgentTypes(): string[];
    /**
     * Get current configuration
     */
    getConfig(): Readonly<ContextPoolConfig>;
    /**
     * Update configuration
     */
    updateConfig(updates: Partial<ContextPoolConfig>): void;
    /**
     * Get estimated memory usage in bytes
     */
    getMemoryUsage(): number;
    /**
     * Force eviction from all pools until memory target is met
     * @param targetMemoryBytes Target memory in bytes
     * @returns Number of contexts evicted
     */
    evictToMemoryTarget(targetMemoryBytes: number): number;
}
/**
 * Get the default ContextPoolManager singleton instance
 */
export declare function getContextPoolManager(config?: Partial<ContextPoolConfig>): ContextPoolManager;
/**
 * Reset the default singleton instance
 */
export declare function resetContextPoolManager(): void;
/**
 * Create a new ContextPoolManager with custom configuration
 */
export declare function createContextPoolManager(config?: Partial<ContextPoolConfig>): ContextPoolManager;
/**
 * Create a ContextPoolManager optimized for low memory usage
 */
export declare function createLowMemoryPoolManager(): ContextPoolManager;
/**
 * Create a ContextPoolManager optimized for high throughput
 */
export declare function createHighThroughputPoolManager(): ContextPoolManager;
export default ContextPoolManager;
//# sourceMappingURL=ContextPoolManager.d.ts.map