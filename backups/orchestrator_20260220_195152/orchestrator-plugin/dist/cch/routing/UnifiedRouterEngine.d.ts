/**
 * UnifiedRouterEngine (URE) - Centralized Cache-Enabled Routing Engine
 *
 * Production-ready routing engine with LRU cache that replaces SmartAgentRouter.
 * Implements O(1) routing decisions with intelligent caching and fallback chains.
 *
 * FEATURES:
 * - LRU Cache with max 1000 entries, 1 hour TTL
 * - TF-IDF simplified keyword extraction
 * - Agent registry from AGENT_REGISTRY.md
 * - Model selection based on complexity
 * - Fallback chain: expert -> core -> generic
 * - Thread-safe operations
 * - Metrics collection
 *
 * @version 1.0.0 - CCH Implementation
 * @author Orchestrator Plugin Team
 * @date 01 Febbraio 2026
 */
import type { ModelType } from '../../types';
import type { ComplexityLevel, ExtractedKeyword } from '../../analysis/types';
/**
 * Decisione di routing prodotta dall'URE
 */
export interface RoutingDecision {
    /** File dell'agent selezionato */
    agentFile: string;
    /** Modello da utilizzare */
    model: 'haiku' | 'sonnet' | 'opus';
    /** Priorità del task */
    priority: 'LOW' | 'MEDIA' | 'ALTA' | 'CRITICA';
    /** Confidence della decisione 0-1 */
    confidence: number;
    /** Catena di fallback ordinata */
    fallbackAgents: string[];
    /** Reasoning della decisione */
    reasoning?: string;
    /** Tempo impiegato per la decisione (ms) */
    decisionTime: number;
    /** Cache hit */
    cacheHit: boolean;
}
/**
 * Richiesta di task da routare
 */
export interface TaskRequest {
    /** ID della richiesta */
    id?: string;
    /** Testo della richiesta utente */
    request: string;
    /** Dominio rilevato (opzionale) */
    domain?: string;
    /** Complessità stimata (opzionale) */
    complexity?: ComplexityLevel;
    /** Budget massimo (opzionale) */
    maxCost?: number;
    /** Timeout massimo (opzionale) */
    maxTime?: number;
    /** Metadata aggiuntivi */
    metadata?: Record<string, unknown>;
}
/**
 * Statistiche del router
 */
export interface RouterStats {
    /** Totale richieste processate */
    totalRequests: number;
    /** Cache hits */
    cacheHits: number;
    /** Cache misses */
    cacheMisses: number;
    /** Cache hit rate */
    cacheHitRate: number;
    /** Decisioni per agent */
    agentDecisions: Record<string, number>;
    /** Decisioni per model */
    modelDecisions: Record<ModelType, number>;
    /** Tempo medio decisione (ms) */
    avgDecisionTime: number;
    /** Numero di fallback attivati */
    fallbackActivations: number;
    /** Pattern invalidations */
    patternInvalidations: number;
    /** Ultimo reset */
    lastReset: Date;
}
/**
 * Configurazione dell'URE
 */
export interface UnifiedRouterConfig {
    /** Max entries nella cache LRU */
    maxCacheEntries?: number;
    /** TTL cache in millisecondi */
    cacheTTL?: number;
    /** Abilita/definisce cache */
    cachingEnabled?: boolean;
    /** Abilita metriche */
    metricsEnabled?: boolean;
    /** Agent registry path */
    agentRegistryPath?: string;
    /** Threshold confidence minima */
    minConfidence?: number;
}
/**
 * LRU Map con complessità O(1) per get/put
 * Implementazione custom con doubly-linked list e hash map
 */
declare class LRUMap<K extends string | number, V> {
    private capacity;
    private ttl;
    private cache;
    private head;
    private tail;
    private _size;
    constructor(capacity: number, ttl: number);
    /**
     * Ottieni valore dalla cache (O(1))
     */
    get(key: K): V | undefined;
    /**
     * Inserisci valore nella cache (O(1))
     */
    put(key: K, value: V): void;
    /**
     * Rimuovi entry specifica
     */
    delete(key: K): boolean;
    /**
     * Invalida entries per pattern
     */
    invalidatePattern(pattern: RegExp): number;
    /**
     * Clear entire cache
     */
    clear(): void;
    /**
     * Get current size
     */
    size(): number;
    /**
     * Get all keys
     */
    keys(): K[];
    /**
     * Clean expired entries
     */
    cleanExpired(): number;
    private addToFront;
    private removeEntry;
    private moveToHead;
    private evictLRU;
}
/**
 * TF-IDF simplificato per keyword extraction
 */
declare class SimplifiedTFIDF {
    private documents;
    private corpusFrequency;
    private totalDocuments;
    private stopWords;
    constructor();
    /**
     * Aggiungi documento al corpus
     */
    addDocument(id: string, text: string): void;
    /**
     * Estrai keywords con score TF-IDF
     */
    extractKeywords(text: string, topN?: number): ExtractedKeyword[];
    /**
     * Calcola score TF-IDF
     */
    private calculateTFIDF;
    /**
     * Tokenizza testo
     */
    private tokenize;
    /**
     * Estrai contesto
     */
    private extractContext;
    /**
     * Reset corpus
     */
    clear(): void;
}
/**
 * Agent registry entry
 */
export interface AgentRegistryEntry {
    name: string;
    file: string;
    role: string;
    specialization: string;
    keywords: string[];
    patterns: RegExp[];
    defaultModel: ModelType;
    minComplexity: ComplexityLevel;
    maxComplexity: ComplexityLevel;
    priority: number;
    tier: 'expert' | 'core' | 'generic';
    estimatedCostMultiplier: number;
}
/**
 * UnifiedRouterEngine - Motore di routing centralizzato con cache LRU
 */
export declare class UnifiedRouterEngine {
    private logger;
    private config;
    private cache;
    private tfidf;
    private agentRegistry;
    private stats;
    private requestTimes;
    private readonly MAX_TIME_SAMPLES;
    constructor(config?: UnifiedRouterConfig);
    /**
     * Route una richiesta all'agent appropriato
     * O(1) con cache hit, O(n) con cache miss dove n = numero agenti
     */
    route(request: TaskRequest): RoutingDecision;
    /**
     * Invalida cache entries per pattern regex
     */
    invalidate(pattern: string): void;
    /**
     * Warmup della cache con richieste predefinite
     */
    warmup(requests: TaskRequest[]): Promise<void>;
    /**
     * Ottieni statistiche del router
     */
    getStats(): RouterStats;
    /**
     * Reset statistiche
     */
    resetStats(): void;
    /**
     * Clear cache
     */
    clearCache(): void;
    /**
     * Clean expired cache entries
     */
    cleanExpiredCache(): number;
    /**
     * Calcola decisione di routing (cache miss path)
     */
    private computeRoutingDecision;
    /**
     * Score agents based on keyword matching and complexity
     */
    private scoreAgents;
    /**
     * Select model based on agent and complexity
     */
    private selectModel;
    /**
     * Build fallback chain: expert -> core -> generic
     */
    private buildFallbackChain;
    /**
     * Determine priority based on request and agent
     */
    private determinePriority;
    /**
     * Generate human-readable reasoning
     */
    private generateReasoning;
    /**
     * Create fallback decision when no agent matches
     */
    private createFallbackDecision;
    /**
     * Estimate complexity from request text
     */
    private estimateComplexity;
    /**
     * Generate cache key from request
     */
    private generateCacheKey;
    /**
     * Update statistics with decision
     */
    private updateStats;
    /**
     * Record decision time for avg calculation
     */
    private recordDecisionTime;
    /**
     * Initialize agent registry from AGENT_REGISTRY constant
     */
    private initializeAgentRegistry;
}
/**
 * Create UnifiedRouterEngine with default configuration
 */
export declare function createUnifiedRouterEngine(config?: UnifiedRouterConfig): UnifiedRouterEngine;
export { SimplifiedTFIDF, LRUMap };
//# sourceMappingURL=UnifiedRouterEngine.d.ts.map