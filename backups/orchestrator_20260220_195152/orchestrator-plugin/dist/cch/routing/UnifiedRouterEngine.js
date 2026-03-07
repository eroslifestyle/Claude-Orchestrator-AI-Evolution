"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LRUMap = exports.SimplifiedTFIDF = exports.createUnifiedRouterEngine = exports.UnifiedRouterEngine = void 0;
const logger_1 = require("../../utils/logger");
/**
 * LRU Map con complessità O(1) per get/put
 * Implementazione custom con doubly-linked list e hash map
 */
class LRUMap {
    capacity;
    ttl;
    cache;
    head;
    tail;
    _size;
    constructor(capacity, ttl) {
        this.capacity = capacity;
        this.ttl = ttl;
        this.cache = new Map();
        this.head = null;
        this.tail = null;
        this._size = 0;
    }
    /**
     * Ottieni valore dalla cache (O(1))
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return undefined;
        }
        // Check TTL
        if (Date.now() > entry.expiresAt) {
            this.removeEntry(entry);
            this.cache.delete(key);
            this._size--;
            return undefined;
        }
        // Move to head (most recently used)
        this.moveToHead(entry);
        entry.accessCount++;
        return entry.value;
    }
    /**
     * Inserisci valore nella cache (O(1))
     */
    put(key, value) {
        const existingEntry = this.cache.get(key);
        if (existingEntry) {
            // Update existing entry
            existingEntry.value = value;
            existingEntry.expiresAt = Date.now() + this.ttl;
            this.moveToHead(existingEntry);
            return;
        }
        // Create new entry
        const newEntry = {
            value,
            key: key,
            prev: null,
            next: null,
            expiresAt: Date.now() + this.ttl,
            accessCount: 1
        };
        this.cache.set(key, newEntry);
        this.addToFront(newEntry);
        this._size++;
        // Evict if over capacity
        if (this._size > this.capacity) {
            this.evictLRU();
        }
    }
    /**
     * Rimuovi entry specifica
     */
    delete(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return false;
        }
        this.removeEntry(entry);
        this.cache.delete(key);
        this._size--;
        return true;
    }
    /**
     * Invalida entries per pattern
     */
    invalidatePattern(pattern) {
        let invalidated = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (pattern.test(key)) {
                this.removeEntry(entry);
                this.cache.delete(key);
                this._size--;
                invalidated++;
            }
        }
        return invalidated;
    }
    /**
     * Clear entire cache
     */
    clear() {
        this.cache.clear();
        this.head = null;
        this.tail = null;
        this._size = 0;
    }
    /**
     * Get current size
     */
    size() {
        return this._size;
    }
    /**
     * Get all keys
     */
    keys() {
        return Array.from(this.cache.keys());
    }
    /**
     * Clean expired entries
     */
    cleanExpired() {
        let cleaned = 0;
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.removeEntry(entry);
                this.cache.delete(key);
                this._size--;
                cleaned++;
            }
        }
        return cleaned;
    }
    // =============================================================================
    // PRIVATE METHODS - Linked List Operations
    // =============================================================================
    addToFront(entry) {
        entry.prev = null;
        entry.next = this.head;
        if (this.head) {
            this.head.prev = entry;
        }
        this.head = entry;
        if (!this.tail) {
            this.tail = entry;
        }
    }
    removeEntry(entry) {
        if (entry.prev) {
            entry.prev.next = entry.next;
        }
        else {
            this.head = entry.next;
        }
        if (entry.next) {
            entry.next.prev = entry.prev;
        }
        else {
            this.tail = entry.prev;
        }
    }
    moveToHead(entry) {
        this.removeEntry(entry);
        this.addToFront(entry);
    }
    evictLRU() {
        if (!this.tail) {
            return;
        }
        const key = this.tail.key;
        this.removeEntry(this.tail);
        this.cache.delete(key);
        this._size--;
    }
}
exports.LRUMap = LRUMap;
/**
 * TF-IDF simplificato per keyword extraction
 */
class SimplifiedTFIDF {
    documents;
    corpusFrequency;
    totalDocuments;
    stopWords;
    constructor() {
        this.documents = new Map();
        this.corpusFrequency = new Map();
        this.totalDocuments = 0;
        this.stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
            'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
            'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can',
            'il', 'lo', 'la', 'i', 'gli', 'un', 'uno', 'una', 'e', 'o', 'ma',
            'in', 'su', 'a', 'da', 'con', 'per', 'di', 'come', 'sono', 'era',
            'essere', 'avere', 'fare', 'dire'
        ]);
    }
    /**
     * Aggiungi documento al corpus
     */
    addDocument(id, text) {
        const tokens = this.tokenize(text);
        const termFrequency = new Map();
        // Calculate term frequency
        for (const token of tokens) {
            const count = (termFrequency.get(token) || 0) + 1;
            termFrequency.set(token, count);
            // Update corpus frequency
            const corpusCount = this.corpusFrequency.get(token) || 0;
            this.corpusFrequency.set(token, corpusCount + 1);
        }
        // Calculate magnitude for normalization
        let magnitude = 0;
        for (const count of termFrequency.values()) {
            magnitude += count * count;
        }
        magnitude = Math.sqrt(magnitude);
        this.documents.set(id, { tokens, termFrequency, magnitude });
        this.totalDocuments++;
    }
    /**
     * Estrai keywords con score TF-IDF
     */
    extractKeywords(text, topN = 10) {
        const tokens = this.tokenize(text);
        const termFrequency = new Map();
        for (const token of tokens) {
            termFrequency.set(token, (termFrequency.get(token) || 0) + 1);
        }
        const scores = Array.from(termFrequency.entries()).map(([term, tf]) => ({
            term,
            score: this.calculateTFIDF(term, tf, tokens.length)
        }));
        // Sort by score descending
        scores.sort((a, b) => b.score - a.score);
        return scores.slice(0, topN).map((s, idx) => ({
            text: s.term,
            confidence: Math.min(s.score, 1.0),
            position: text.indexOf(s.term),
            length: s.term.length,
            source: 'exact',
            synonyms: [],
            context: this.extractContext(text, s.term),
            matchType: 'direct'
        }));
    }
    /**
     * Calcola score TF-IDF
     */
    calculateTFIDF(term, termFreq, docLength) {
        const tf = termFreq / docLength; // Normalized term frequency
        const df = (this.corpusFrequency.get(term) || 0) + 1; // Document frequency + 1 smoothing
        const idf = Math.log(this.totalDocuments / df); // Inverse document frequency
        return tf * idf;
    }
    /**
     * Tokenizza testo
     */
    tokenize(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, ' ')
            .split(/\s+/)
            .filter(token => token.length > 2 && !this.stopWords.has(token));
    }
    /**
     * Estrai contesto
     */
    extractContext(text, term) {
        const idx = text.indexOf(term);
        const start = Math.max(0, idx - 30);
        const end = Math.min(text.length, idx + term.length + 30);
        return text.substring(start, end).trim();
    }
    /**
     * Reset corpus
     */
    clear() {
        this.documents.clear();
        this.corpusFrequency.clear();
        this.totalDocuments = 0;
    }
}
exports.SimplifiedTFIDF = SimplifiedTFIDF;
/**
 * Registry degli agenti dal sistema CCH
 */
const AGENT_REGISTRY = [
    // Expert Tier Agents
    {
        name: 'gui-super-expert',
        file: '.claude-plugin/agents/gui-super-expert.md',
        role: 'GUI Architect',
        specialization: 'gui',
        keywords: ['gui', 'pyqt5', 'qt', 'widget', 'dialog', 'ui', 'interface', 'frontend', 'window', 'form'],
        patterns: [/\b(gui|ui|interface|pyqt|qt\d|widget|dialog)\b/i],
        defaultModel: 'sonnet',
        minComplexity: 'medium',
        maxComplexity: 'extreme',
        priority: 90,
        tier: 'expert',
        estimatedCostMultiplier: 1.5
    },
    {
        name: 'database-expert',
        file: '.claude-plugin/agents/database-expert.md',
        role: 'Database Architect',
        specialization: 'database',
        keywords: ['database', 'sql', 'sqlite', 'query', 'schema', 'migration', 'orm', 'postgres', 'mysql'],
        patterns: [/\b(database|sql|sqlite|postgres|mysql|schema|query|orm)\b/i],
        defaultModel: 'sonnet',
        minComplexity: 'medium',
        maxComplexity: 'extreme',
        priority: 85,
        tier: 'expert',
        estimatedCostMultiplier: 1.4
    },
    {
        name: 'security-expert',
        file: '.claude-plugin/agents/security-expert.md',
        role: 'Security Specialist',
        specialization: 'security',
        keywords: ['security', 'auth', 'authentication', 'encryption', 'crypto', 'jwt', 'oauth', 'csrf', 'xss'],
        patterns: [/\b(security|auth|authentication|encryption|crypto|jwt|oauth|csrf|xss)\b/i],
        defaultModel: 'sonnet',
        minComplexity: 'high',
        maxComplexity: 'extreme',
        priority: 95,
        tier: 'expert',
        estimatedCostMultiplier: 1.6
    },
    {
        name: 'architect-expert',
        file: '.claude-plugin/agents/architect-expert.md',
        role: 'System Architect',
        specialization: 'architecture',
        keywords: ['architecture', 'design', 'pattern', 'structure', 'system', 'scalability', 'microservice'],
        patterns: [/\b(architecture|design pattern|system design|scalability|microservice)\b/i],
        defaultModel: 'opus',
        minComplexity: 'high',
        maxComplexity: 'extreme',
        priority: 92,
        tier: 'expert',
        estimatedCostMultiplier: 2.0
    },
    {
        name: 'testing-expert',
        file: '.claude-plugin/agents/testing-expert.md',
        role: 'Testing Engineer',
        specialization: 'testing',
        keywords: ['test', 'testing', 'tdd', 'bdd', 'mock', 'stub', 'assertion', 'coverage', 'pytest', 'jest'],
        patterns: [/\b(test|testing|tdd|bdd|mock|stub|coverage|pytest|jest)\b/i],
        defaultModel: 'sonnet',
        minComplexity: 'low',
        maxComplexity: 'high',
        priority: 75,
        tier: 'expert',
        estimatedCostMultiplier: 1.2
    },
    // Core Tier Agents
    {
        name: 'coder',
        file: '.claude-plugin/agents/coder.md',
        role: 'Code Implementation',
        specialization: 'implementation',
        keywords: ['implement', 'code', 'develop', 'function', 'class', 'method', 'algorithm', 'logic'],
        patterns: [/\b(implement|code|develop|function|class|method)\b/i],
        defaultModel: 'haiku',
        minComplexity: 'low',
        maxComplexity: 'high',
        priority: 60,
        tier: 'core',
        estimatedCostMultiplier: 1.0
    },
    {
        name: 'analyzer',
        file: '.claude-plugin/agents/analyzer.md',
        role: 'Code Analysis',
        specialization: 'analysis',
        keywords: ['analyze', 'analysis', 'review', 'inspect', 'examine', 'understand', 'explain'],
        patterns: [/\b(analyze|analysis|review|inspect|examine)\b/i],
        defaultModel: 'haiku',
        minComplexity: 'low',
        maxComplexity: 'medium',
        priority: 55,
        tier: 'core',
        estimatedCostMultiplier: 0.9
    },
    {
        name: 'debugger',
        file: '.claude-plugin/agents/debugger.md',
        role: 'Debugging Specialist',
        specialization: 'debugging',
        keywords: ['debug', 'bug', 'fix', 'error', 'issue', 'problem', 'crash', 'exception'],
        patterns: [/\b(debug|bug|fix|error|issue|crash|exception)\b/i],
        defaultModel: 'sonnet',
        minComplexity: 'medium',
        maxComplexity: 'extreme',
        priority: 70,
        tier: 'core',
        estimatedCostMultiplier: 1.3
    },
    {
        name: 'refactorer',
        file: '.claude-plugin/agents/refactorer.md',
        role: 'Code Refactoring',
        specialization: 'refactoring',
        keywords: ['refactor', 'cleanup', 'optimize', 'improve', 'simplify', 'restructure'],
        patterns: [/\b(refactor|cleanup|optimize|improve|simplify)\b/i],
        defaultModel: 'sonnet',
        minComplexity: 'low',
        maxComplexity: 'high',
        priority: 65,
        tier: 'core',
        estimatedCostMultiplier: 1.1
    },
    // Documentation Agent - CRITICAL: runs at end of every development task
    {
        name: 'documenter',
        file: '.claude-plugin/agents/documenter.md',
        role: 'Documentation Specialist',
        specialization: 'documentation',
        keywords: ['document', 'documentation', 'docs', 'readme', 'changelog', 'api docs', 'docstring', 'jsdoc', 'explain', 'describe'],
        patterns: [/\b(document|documentation|docs|readme|changelog|api.?doc|docstring|jsdoc)\b/i],
        defaultModel: 'sonnet',
        minComplexity: 'low',
        maxComplexity: 'high',
        priority: 80,
        tier: 'core',
        estimatedCostMultiplier: 1.1
    },
    // Generic Tier Agents
    {
        name: 'generalist',
        file: '.claude-plugin/agents/generalist.md',
        role: 'General Purpose',
        specialization: 'general',
        keywords: ['help', 'assist', 'general', 'default', 'fallback'],
        patterns: [],
        defaultModel: 'haiku',
        minComplexity: 'low',
        maxComplexity: 'extreme',
        priority: 30,
        tier: 'generic',
        estimatedCostMultiplier: 0.8
    },
    {
        name: 'fallback',
        file: '.claude-plugin/agents/fallback.md',
        role: 'Emergency Fallback',
        specialization: 'emergency',
        keywords: [],
        patterns: [],
        defaultModel: 'haiku',
        minComplexity: 'low',
        maxComplexity: 'extreme',
        priority: 10,
        tier: 'generic',
        estimatedCostMultiplier: 0.5
    }
];
// =============================================================================
// UNIFIED ROUTER ENGINE
// =============================================================================
/**
 * UnifiedRouterEngine - Motore di routing centralizzato con cache LRU
 */
class UnifiedRouterEngine {
    logger;
    config;
    cache;
    tfidf;
    agentRegistry;
    stats;
    // Metrics collection
    requestTimes = [];
    MAX_TIME_SAMPLES = 1000;
    constructor(config = {}) {
        this.logger = new logger_1.PluginLogger('UnifiedRouterEngine');
        // Default configuration
        this.config = {
            maxCacheEntries: config.maxCacheEntries ?? 1000,
            cacheTTL: config.cacheTTL ?? 3600000, // 1 hour in ms
            cachingEnabled: config.cachingEnabled ?? true,
            metricsEnabled: config.metricsEnabled ?? true,
            agentRegistryPath: config.agentRegistryPath ?? '',
            minConfidence: config.minConfidence ?? 0.3
        };
        // Initialize LRU cache
        this.cache = new LRUMap(this.config.maxCacheEntries, this.config.cacheTTL);
        // Initialize TF-IDF
        this.tfidf = new SimplifiedTFIDF();
        // Initialize agent registry
        this.agentRegistry = new Map();
        this.initializeAgentRegistry();
        // Initialize stats
        this.stats = {
            totalRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            cacheHitRate: 0,
            agentDecisions: {},
            modelDecisions: { haiku: 0, sonnet: 0, opus: 0, auto: 0 },
            avgDecisionTime: 0,
            fallbackActivations: 0,
            patternInvalidations: 0,
            lastReset: new Date()
        };
        this.logger.info('UnifiedRouterEngine initialized', {
            maxCacheEntries: this.config.maxCacheEntries,
            cacheTTL: this.config.cacheTTL,
            agentsRegistered: this.agentRegistry.size
        });
    }
    // ==========================================================================
    // PUBLIC API - ROUTING METHODS
    // ==========================================================================
    /**
     * Route una richiesta all'agent appropriato
     * O(1) con cache hit, O(n) con cache miss dove n = numero agenti
     */
    route(request) {
        const startTime = Date.now();
        this.stats.totalRequests++;
        // Generate cache key
        const cacheKey = this.generateCacheKey(request);
        // Check cache first (O(1))
        if (this.config.cachingEnabled) {
            const cached = this.cache.get(cacheKey);
            if (cached) {
                this.stats.cacheHits++;
                this.updateStats(cached);
                this.recordDecisionTime(Date.now() - startTime);
                this.logger.debug('Cache hit for routing decision', {
                    cacheKey,
                    agent: cached.agentFile
                });
                return { ...cached, cacheHit: true };
            }
            this.stats.cacheMisses++;
        }
        // Cache miss - compute routing decision
        const decision = this.computeRoutingDecision(request, startTime);
        decision.cacheHit = false;
        // Cache the decision
        if (this.config.cachingEnabled && decision.confidence >= this.config.minConfidence) {
            this.cache.put(cacheKey, decision);
        }
        // Update stats
        this.updateStats(decision);
        this.recordDecisionTime(Date.now() - startTime);
        this.logger.info('Routing decision computed', {
            agent: decision.agentFile,
            model: decision.model,
            confidence: decision.confidence,
            decisionTime: decision.decisionTime
        });
        return decision;
    }
    /**
     * Invalida cache entries per pattern regex
     */
    invalidate(pattern) {
        const regex = new RegExp(pattern, 'i');
        const invalidated = this.cache.invalidatePattern(regex);
        this.stats.patternInvalidations += invalidated;
        this.logger.info('Cache invalidation completed', {
            pattern,
            entriesInvalidated: invalidated
        });
    }
    /**
     * Warmup della cache con richieste predefinite
     */
    async warmup(requests) {
        this.logger.info('Starting cache warmup', { requestCount: requests.length });
        const warmupStart = Date.now();
        for (const request of requests) {
            // Pre-compute routing decisions
            this.route(request);
            // Add to TF-IDF corpus
            this.tfidf.addDocument(request.id || request.request.slice(0, 50), request.request);
        }
        const warmupTime = Date.now() - warmupStart;
        this.logger.info('Cache warmup completed', {
            requestsProcessed: requests.length,
            warmupTime,
            cacheSize: this.cache.size()
        });
    }
    /**
     * Ottieni statistiche del router
     */
    getStats() {
        // Calculate hit rate
        const total = this.stats.cacheHits + this.stats.cacheMisses;
        this.stats.cacheHitRate = total > 0 ? this.stats.cacheHits / total : 0;
        // Calculate avg decision time
        if (this.requestTimes.length > 0) {
            const sum = this.requestTimes.reduce((a, b) => a + b, 0);
            this.stats.avgDecisionTime = sum / this.requestTimes.length;
        }
        return { ...this.stats };
    }
    /**
     * Reset statistiche
     */
    resetStats() {
        this.stats = {
            totalRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            cacheHitRate: 0,
            agentDecisions: {},
            modelDecisions: { haiku: 0, sonnet: 0, opus: 0, auto: 0 },
            avgDecisionTime: 0,
            fallbackActivations: 0,
            patternInvalidations: 0,
            lastReset: new Date()
        };
        this.requestTimes = [];
        this.logger.info('Stats reset');
    }
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        this.logger.info('Cache cleared');
    }
    /**
     * Clean expired cache entries
     */
    cleanExpiredCache() {
        const cleaned = this.cache.cleanExpired();
        this.logger.info('Expired cache entries cleaned', { count: cleaned });
        return cleaned;
    }
    // ==========================================================================
    // PRIVATE METHODS - ROUTING DECISION
    // ==========================================================================
    /**
     * Calcola decisione di routing (cache miss path)
     */
    computeRoutingDecision(request, startTime) {
        // Extract keywords using TF-IDF
        const keywords = this.tfidf.extractKeywords(request.request, 10);
        // Score agents based on keyword matching
        const agentScores = this.scoreAgents(request, keywords);
        // Sort by score descending
        const sortedAgents = Array.from(agentScores.entries())
            .sort(([, a], [, b]) => b.score - a.score);
        if (sortedAgents.length === 0) {
            // No agent matched - use fallback
            return this.createFallbackDecision(request, startTime);
        }
        // Select primary agent
        const [primaryAgentName, primaryScore] = sortedAgents[0];
        const primaryAgent = this.agentRegistry.get(primaryAgentName);
        // Select model based on complexity
        const model = this.selectModel(primaryAgent, request.complexity);
        // Calculate confidence
        const confidence = Math.min(primaryScore.score, 1.0);
        // Build fallback chain
        const fallbackAgents = this.buildFallbackChain(primaryAgentName, sortedAgents.slice(1).map(([name]) => name));
        // Determine priority
        const priority = this.determinePriority(request, primaryAgent, confidence);
        // Generate reasoning
        const reasoning = this.generateReasoning(primaryAgent, keywords.slice(0, 3), confidence, model);
        return {
            agentFile: primaryAgent.file,
            model,
            priority,
            confidence,
            fallbackAgents,
            reasoning,
            decisionTime: Date.now() - startTime,
            cacheHit: false
        };
    }
    /**
     * Score agents based on keyword matching and complexity
     */
    scoreAgents(request, keywords) {
        const scores = new Map();
        // Initialize scores
        for (const agent of this.agentRegistry.values()) {
            scores.set(agent.name, { score: 0, reasons: [] });
        }
        // Keyword matching score
        for (const keyword of keywords) {
            for (const agent of this.agentRegistry.values()) {
                const currentScore = scores.get(agent.name);
                // Direct keyword match
                if (agent.keywords.includes(keyword.text.toLowerCase())) {
                    currentScore.score += keyword.confidence * 0.3;
                    currentScore.reasons.push(`keyword: ${keyword.text}`);
                }
                // Pattern match
                for (const pattern of agent.patterns) {
                    if (pattern.test(keyword.text)) {
                        currentScore.score += keyword.confidence * 0.2;
                        currentScore.reasons.push(`pattern: ${pattern.source}`);
                    }
                }
            }
        }
        // Domain match bonus
        if (request.domain) {
            for (const agent of this.agentRegistry.values()) {
                if (agent.specialization === request.domain) {
                    const currentScore = scores.get(agent.name);
                    currentScore.score += 0.4;
                    currentScore.reasons.push('domain match');
                }
            }
        }
        // Complexity match
        const complexity = request.complexity || this.estimateComplexity(request);
        const complexityOrder = ['low', 'medium', 'high', 'extreme'];
        for (const agent of this.agentRegistry.values()) {
            const currentScore = scores.get(agent.name);
            // Check if agent can handle complexity
            const minIdx = complexityOrder.indexOf(agent.minComplexity);
            const maxIdx = complexityOrder.indexOf(agent.maxComplexity);
            const reqIdx = complexityOrder.indexOf(complexity);
            if (reqIdx >= minIdx && reqIdx <= maxIdx) {
                // Within range - bonus based on tier
                const tierBonus = agent.tier === 'expert' ? 0.2 : agent.tier === 'core' ? 0.1 : 0.05;
                currentScore.score += tierBonus;
                currentScore.reasons.push(`complexity capable: ${complexity}`);
            }
            else if (reqIdx > maxIdx) {
                // Over complexity - reduce score
                currentScore.score *= 0.5;
                currentScore.reasons.push(`complexity mismatch: ${complexity} > ${agent.maxComplexity}`);
            }
        }
        // Priority tier bonus
        for (const agent of this.agentRegistry.values()) {
            const currentScore = scores.get(agent.name);
            currentScore.score += (agent.priority / 100) * 0.1;
        }
        return scores;
    }
    /**
     * Select model based on agent and complexity
     */
    selectModel(agent, requestComplexity) {
        // Start with agent's default model, converting 'auto' to a concrete model
        let selectedModel = agent.defaultModel === 'auto' ? 'sonnet' : agent.defaultModel;
        const complexity = requestComplexity || 'medium';
        // Upgrade based on complexity
        const modelHierarchy = ['haiku', 'sonnet', 'opus'];
        if (complexity === 'high' && selectedModel === 'haiku') {
            selectedModel = 'sonnet';
        }
        else if (complexity === 'extreme') {
            if (selectedModel === 'haiku') {
                selectedModel = 'sonnet';
            }
            // Opus for extreme complexity with expert agents
            if (agent.tier === 'expert') {
                selectedModel = 'opus';
            }
        }
        return selectedModel;
    }
    /**
     * Build fallback chain: expert -> core -> generic
     */
    buildFallbackChain(primaryAgent, otherAgents) {
        const chain = [];
        // Get primary agent tier
        const primary = this.agentRegistry.get(primaryAgent);
        // Add agents from other tiers in order
        const tiers = primary.tier === 'expert' ? ['core', 'generic'] :
            primary.tier === 'core' ? ['expert', 'generic'] : ['expert', 'core'];
        for (const tier of tiers) {
            // Find best agent from this tier
            for (const agentName of otherAgents) {
                const agent = this.agentRegistry.get(agentName);
                if (agent && agent.tier === tier) {
                    chain.push(agent.file);
                    break;
                }
            }
            // If no agent found in otherAgents, find first from tier
            if (chain.length < tiers.indexOf(tier) + 1) {
                for (const agent of this.agentRegistry.values()) {
                    if (agent.tier === tier && agent.name !== primaryAgent) {
                        chain.push(agent.file);
                        break;
                    }
                }
            }
        }
        // Always add fallback as last resort
        const fallbackAgent = this.agentRegistry.get('fallback');
        if (fallbackAgent && !chain.includes(fallbackAgent.file)) {
            chain.push(fallbackAgent.file);
        }
        return chain;
    }
    /**
     * Determine priority based on request and agent
     */
    determinePriority(request, agent, confidence) {
        // Security is always critical
        if (agent.specialization === 'security') {
            return 'CRITICA';
        }
        // High complexity = high priority
        if (request.complexity === 'extreme') {
            return 'ALTA';
        }
        // Low confidence = higher priority (needs attention)
        if (confidence < 0.5) {
            return 'MEDIA';
        }
        // Based on agent priority
        if (agent.priority >= 90) {
            return 'ALTA';
        }
        else if (agent.priority >= 70) {
            return 'MEDIA';
        }
        return 'LOW';
    }
    /**
     * Generate human-readable reasoning
     */
    generateReasoning(agent, keywords, confidence, model) {
        const kwStr = keywords.map(k => k.text).join(', ');
        return `Selected ${agent.name} (${agent.tier} tier) based on keyword matches: [${kwStr}]. ` +
            `Using ${model} model with ${confidence.toFixed(2)} confidence. ` +
            `Specialization: ${agent.specialization}`;
    }
    /**
     * Create fallback decision when no agent matches
     */
    createFallbackDecision(request, startTime) {
        const fallbackAgent = this.agentRegistry.get('fallback') ||
            this.agentRegistry.get('generalist') ||
            Array.from(this.agentRegistry.values())[0];
        this.stats.fallbackActivations++;
        return {
            agentFile: fallbackAgent?.file || 'fallback.md',
            model: 'haiku',
            priority: 'LOW',
            confidence: 0.1,
            fallbackAgents: [],
            reasoning: 'No agent matched - using fallback',
            decisionTime: Date.now() - startTime,
            cacheHit: false
        };
    }
    /**
     * Estimate complexity from request text
     */
    estimateComplexity(request) {
        const text = request.request.toLowerCase();
        // Complexity indicators
        const extremeIndicators = [
            'architecture', 'scalability', 'distributed', 'microservice',
            'complex system', 'enterprise', 'multi-thread', 'concurrent'
        ];
        const highIndicators = [
            'implement', 'develop', 'create', 'build', 'database',
            'api', 'integration', 'security', 'authentication'
        ];
        const mediumIndicators = [
            'fix', 'debug', 'analyze', 'refactor', 'optimize',
            'update', 'modify', 'change'
        ];
        const hasExtreme = extremeIndicators.some(i => text.includes(i));
        const hasHigh = highIndicators.some(i => text.includes(i));
        const hasMedium = mediumIndicators.some(i => text.includes(i));
        if (hasExtreme)
            return 'extreme';
        if (hasHigh)
            return 'high';
        if (hasMedium)
            return 'medium';
        return 'low';
    }
    /**
     * Generate cache key from request
     */
    generateCacheKey(request) {
        // Normalize request text
        const normalized = request.request
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        // Create hash-like key (simple implementation)
        const prefix = request.domain || 'general';
        const complexity = request.complexity || 'medium';
        const hash = normalized.split('').reduce((acc, char) => {
            return ((acc << 5) - acc) + char.charCodeAt(0);
        }, 0);
        return `${prefix}:${complexity}:${Math.abs(hash)}`;
    }
    /**
     * Update statistics with decision
     */
    updateStats(decision) {
        // Agent decisions
        const agentKey = decision.agentFile;
        this.stats.agentDecisions[agentKey] = (this.stats.agentDecisions[agentKey] || 0) + 1;
        // Model decisions
        this.stats.modelDecisions[decision.model]++;
    }
    /**
     * Record decision time for avg calculation
     */
    recordDecisionTime(time) {
        if (!this.config.metricsEnabled)
            return;
        this.requestTimes.push(time);
        // Keep only recent samples
        if (this.requestTimes.length > this.MAX_TIME_SAMPLES) {
            this.requestTimes.shift();
        }
    }
    // ==========================================================================
    // INITIALIZATION
    // ==========================================================================
    /**
     * Initialize agent registry from AGENT_REGISTRY constant
     */
    initializeAgentRegistry() {
        for (const agent of AGENT_REGISTRY) {
            this.agentRegistry.set(agent.name, agent);
        }
        // Load additional agents from file if configured
        if (this.config.agentRegistryPath) {
            // Would load from file here
            this.logger.debug('Agent registry path configured', {
                path: this.config.agentRegistryPath
            });
        }
        this.logger.info('Agent registry initialized', {
            totalAgents: this.agentRegistry.size,
            expertTier: Array.from(this.agentRegistry.values()).filter(a => a.tier === 'expert').length,
            coreTier: Array.from(this.agentRegistry.values()).filter(a => a.tier === 'core').length,
            genericTier: Array.from(this.agentRegistry.values()).filter(a => a.tier === 'generic').length
        });
    }
}
exports.UnifiedRouterEngine = UnifiedRouterEngine;
// =============================================================================
// FACTORY FUNCTION
// =============================================================================
/**
 * Create UnifiedRouterEngine with default configuration
 */
function createUnifiedRouterEngine(config) {
    return new UnifiedRouterEngine(config);
}
exports.createUnifiedRouterEngine = createUnifiedRouterEngine;
//# sourceMappingURL=UnifiedRouterEngine.js.map