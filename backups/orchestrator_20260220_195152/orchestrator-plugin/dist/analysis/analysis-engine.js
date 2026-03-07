"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisEngine = void 0;
const fast_path_analyzer_1 = require("./tiers/fast/fast-path-analyzer");
const smart_path_analyzer_1 = require("./tiers/smart/smart-path-analyzer");
// import { DeepPathAnalyzer } from './tiers/deep/deep-path-analyzer'; // TODO: Implementare Tier 3
const cache_manager_1 = require("./utils/cache-manager");
// =============================================================================
// ANALYSIS ENGINE CLASS
// =============================================================================
class AnalysisEngine {
    config;
    fastPathAnalyzer;
    smartPathAnalyzer;
    // private deepPathAnalyzer: DeepPathAnalyzer; // TODO: Implementare
    cache;
    circuitBreaker;
    metrics;
    startupTime;
    requestQueue;
    constructor(config) {
        this.startupTime = performance.now();
        // Load configuration da tier-config.json (hardcoded per MVP)
        this.config = this.loadDefaultConfig(config);
        // Initialize tier analyzers
        this.fastPathAnalyzer = new fast_path_analyzer_1.FastPathAnalyzer({
            timeoutMs: this.config.fastPath.timeoutMs,
            confidenceThreshold: this.config.fastPath.confidenceThreshold
        });
        this.smartPathAnalyzer = new smart_path_analyzer_1.SmartPathAnalyzer({
            timeoutMs: this.config.smartPath.timeoutMs,
            confidenceThreshold: this.config.smartPath.confidenceThreshold
        });
        // TODO: Initialize Deep Path quando implementato
        // this.deepPathAnalyzer = new DeepPathAnalyzer({...});
        // Initialize shared services
        this.cache = new cache_manager_1.CacheManager({
            maxEntries: 100,
            defaultTtlMs: 300000, // 5 minutes
            memoryLimitMB: 5
        });
        // Initialize circuit breaker
        this.circuitBreaker = {
            fastPathFailures: 0,
            smartPathFailures: 0,
            deepPathFailures: 0,
            lastFailureTime: 0,
            isOpen: false,
            resetTimeoutMs: 60000 // 1 minute
        };
        // Initialize metrics
        this.metrics = {
            tierUsage: { fast: 0, smart: 0, deep: 0 },
            averageResponseTime: { fast: 0, smart: 0, deep: 0 },
            cacheHitRate: 0,
            errorRate: { fast: 0, smart: 0, deep: 0 },
            throughput: 0
        };
        // Initialize request tracking
        this.requestQueue = new Map();
        console.log(`🧠 AnalysisEngine inizializzato in ${Math.round(performance.now() - this.startupTime)}ms`);
    }
    // =============================================================================
    // PUBLIC API
    // =============================================================================
    /**
     * Analizza testo con sistema 3-tier completo
     */
    async analyze(text) {
        const requestContext = this.createRequestContext(text);
        try {
            // Cache lookup first
            const cacheKey = this.generateCacheKey(text);
            const cacheResult = this.cache.get(cacheKey);
            if (cacheResult.hit && cacheResult.data) {
                this.updateMetrics('cache');
                return this.enrichCachedResult(cacheResult.data, requestContext);
            }
            // Run tier analysis with fallback
            const analysisResult = await this.runTierAnalysis(text, requestContext);
            // Cache result se successful
            if (analysisResult.success) {
                this.cache.set(cacheKey, analysisResult);
            }
            return analysisResult;
        }
        catch (error) {
            return this.createErrorResult(requestContext, 'system_error', error);
        }
        finally {
            this.requestQueue.delete(requestContext.requestId);
        }
    }
    /**
     * Get comprehensive system metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            circuitBreakerStatus: { ...this.circuitBreaker },
            fastPathMetrics: this.fastPathAnalyzer.getMetrics(),
            smartPathMetrics: this.smartPathAnalyzer.getMetrics(),
            cacheMetrics: this.cache.getStats()
        };
    }
    /**
     * Health check per il sistema
     */
    async healthCheck() {
        const fastPathStatus = this.getTierStatus('fast');
        const smartPathStatus = this.getTierStatus('smart');
        const deepPathStatus = this.getTierStatus('deep');
        const activeTiers = [fastPathStatus, smartPathStatus, deepPathStatus]
            .filter(status => status === 'active').length;
        let overallStatus;
        if (activeTiers >= 2) {
            overallStatus = 'healthy';
        }
        else if (activeTiers >= 1) {
            overallStatus = 'degraded';
        }
        else {
            overallStatus = 'unhealthy';
        }
        return {
            status: overallStatus,
            tiers: {
                fast: fastPathStatus,
                smart: smartPathStatus,
                deep: deepPathStatus
            },
            performance: {
                averageResponseTimeMs: this.calculateAverageResponseTime(),
                cacheHitRate: this.metrics.cacheHitRate,
                memoryUsageMB: this.estimateMemoryUsage()
            }
        };
    }
    /**
     * Reset circuit breaker (manual intervention)
     */
    resetCircuitBreaker(tier) {
        if (tier) {
            const key = `${tier}PathFailures`;
            const currentValue = this.circuitBreaker[key];
            if (typeof currentValue === 'number') {
                this.circuitBreaker[key] = 0;
            }
        }
        else {
            this.circuitBreaker.fastPathFailures = 0;
            this.circuitBreaker.smartPathFailures = 0;
            this.circuitBreaker.deepPathFailures = 0;
            this.circuitBreaker.isOpen = false;
        }
        console.log(`🔄 Circuit breaker reset${tier ? ` per tier ${tier}` : ''}`);
    }
    // =============================================================================
    // CORE TIER ORCHESTRATION
    // =============================================================================
    /**
     * Run tier analysis con fallback strategy
     */
    async runTierAnalysis(text, context) {
        // Tier 1: Fast Path
        if (this.config.fastPath.enabled && this.canUseTier('fast')) {
            context.tierAttempts.push('fast');
            if (this.fastPathAnalyzer.canHandle(text)) {
                const fastResult = await this.runTierWithTimeout(() => this.fastPathAnalyzer.analyze(text), this.config.fastPath.timeoutMs, 'fast', context);
                if (fastResult.success && this.meetsQualityGate(fastResult.data, 'fast')) {
                    this.metrics.tierUsage.fast++;
                    return this.buildAnalysisResult(fastResult.data, context);
                }
                else {
                    this.handleTierFailure('fast', fastResult.success ? 'quality_gate' : 'execution_failure');
                }
            }
        }
        // Tier 2: Smart Path
        if (this.config.smartPath.enabled && this.canUseTier('smart')) {
            context.tierAttempts.push('smart');
            if (this.smartPathAnalyzer.canHandle(text)) {
                const smartResult = await this.runTierWithTimeout(() => this.smartPathAnalyzer.analyze(text), this.config.smartPath.timeoutMs, 'smart', context);
                if (smartResult.success && this.meetsQualityGate(smartResult.data, 'smart')) {
                    this.metrics.tierUsage.smart++;
                    return this.buildAnalysisResult(smartResult.data, context);
                }
                else {
                    this.handleTierFailure('smart', smartResult.success ? 'quality_gate' : 'execution_failure');
                }
            }
        }
        // Tier 3: Deep Path (TODO: Implementare quando ready)
        /*
        if (this.config.deepPath.enabled && this.canUseTier('deep')) {
          context.tierAttempts.push('deep');
    
          const deepResult = await this.runTierWithTimeout(
            () => this.deepPathAnalyzer.analyze(text),
            this.config.deepPath.timeoutMs,
            'deep',
            context
          );
    
          if (deepResult.success && this.meetsQualityGate(deepResult.data, 'deep')) {
            this.metrics.tierUsage.deep++;
            return this.buildAnalysisResult(deepResult.data, context);
          }
        }
        */
        // All tiers failed - return fallback result
        return this.createFallbackResult(context);
    }
    /**
     * Run tier con timeout protection
     */
    async runTierWithTimeout(tierFunction, timeoutMs, tier, context) {
        const tierStart = performance.now();
        try {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error(`Tier ${tier} timeout after ${timeoutMs}ms`)), timeoutMs);
            });
            const result = await Promise.race([
                tierFunction(),
                timeoutPromise
            ]);
            // Update metrics
            const responseTime = performance.now() - tierStart;
            this.updateTierMetrics(tier, responseTime, result.success);
            return result;
        }
        catch (error) {
            const responseTime = performance.now() - tierStart;
            this.updateTierMetrics(tier, responseTime, false);
            context.errors.push({
                tier,
                type: 'timeout',
                message: error instanceof Error ? error.message : String(error),
                recoverable: true
            });
            return {
                success: false,
                error: {
                    tier,
                    type: 'timeout',
                    message: error instanceof Error ? error.message : 'Unknown error',
                    recoverable: true
                },
                tier,
                timeMs: responseTime
            };
        }
    }
    /**
     * Check se tier può essere utilizzato (circuit breaker)
     */
    canUseTier(tier) {
        if (!this.config.fallbackBehavior.circuitBreakerEnabled)
            return true;
        const key = `${tier}PathFailures`;
        const failureCount = this.circuitBreaker[key];
        const threshold = this.config.fallbackBehavior.circuitBreakerThreshold;
        return failureCount < threshold;
    }
    /**
     * Handle tier failure per circuit breaker
     */
    handleTierFailure(tier, reason) {
        const key = `${tier}PathFailures`;
        const currentValue = this.circuitBreaker[key];
        this.circuitBreaker[key] = (currentValue + 1);
        this.circuitBreaker.lastFailureTime = Date.now();
        const failures = this.circuitBreaker[key];
        console.warn(`⚠️  Tier ${tier} failure #${failures}: ${reason}`);
        if (failures >= this.config.fallbackBehavior.circuitBreakerThreshold) {
            this.circuitBreaker.isOpen = true;
            console.error(`🚨 Circuit breaker opened for tier ${tier}`);
        }
    }
    /**
     * Check quality gate per tier
     */
    meetsQualityGate(result, tier) {
        const gates = {
            fast: {
                minConfidence: 0.7,
                maxResponseTime: 10,
                minKeywords: 1
            },
            smart: {
                minConfidence: 0.6,
                maxResponseTime: 50,
                minKeywords: 1
            },
            deep: {
                minConfidence: 0.5,
                maxResponseTime: 2000,
                minKeywords: 0
            }
        };
        const gate = gates[tier];
        return (result.overallConfidence >= gate.minConfidence &&
            result.processingTimeMs <= gate.maxResponseTime &&
            result.keywords.length >= gate.minKeywords);
    }
    // =============================================================================
    // RESULT BUILDING
    // =============================================================================
    /**
     * Build final analysis result
     */
    buildAnalysisResult(keywordResult, context) {
        const totalTime = performance.now() - context.startTime;
        // Domain classification da keyword results
        const domainClassification = this.classifyDomains(keywordResult);
        // Complexity assessment
        const complexityAssessment = this.assessComplexity(keywordResult, context);
        // Build summary
        const summary = {
            originalText: context.inputText,
            tiersUsed: context.tierAttempts,
            totalTimeMs: totalTime,
            averageConfidence: keywordResult.overallConfidence,
            recommendation: {
                primaryAgent: domainClassification.primaryDomain.suggestedAgent,
                model: domainClassification.primaryDomain.suggestedModel === 'auto' ? 'sonnet' : domainClassification.primaryDomain.suggestedModel,
                estimatedDifficulty: complexityAssessment.level,
                shouldParallelize: complexityAssessment.shouldSpawnSubtasks
            }
        };
        return {
            keywords: keywordResult,
            domains: domainClassification,
            complexity: complexityAssessment,
            summary,
            success: true,
            errors: context.errors,
            warnings: context.warnings
        };
    }
    /**
     * Classify domains da keyword results
     */
    classifyDomains(keywordResult) {
        // Group keywords by domain
        const domainGroups = new Map();
        for (const keyword of keywordResult.keywords) {
            if (keyword.domain) {
                if (!domainGroups.has(keyword.domain)) {
                    domainGroups.set(keyword.domain, []);
                }
                domainGroups.get(keyword.domain).push(keyword);
            }
        }
        // Calculate domain confidence scores
        const domains = [];
        for (const [domainName, keywords] of domainGroups.entries()) {
            const confidence = keywords.reduce((sum, k) => sum + k.confidence, 0) / keywords.length;
            const weight = keywords.length / keywordResult.keywords.length;
            domains.push({
                name: domainName,
                confidence,
                matchedKeywords: keywords.map(k => k.text),
                suggestedAgent: this.getAgentForDomain(domainName),
                suggestedModel: this.getModelForDomain(domainName, confidence),
                priority: this.getPriorityForDomain(domainName),
                weight
            });
        }
        // Sort by confidence * weight
        domains.sort((a, b) => (b.confidence * b.weight) - (a.confidence * a.weight));
        const primaryDomain = domains[0] || this.getDefaultDomain();
        const secondaryDomains = domains.slice(1, 3); // Top 3 excluding primary
        return {
            primaryDomain,
            secondaryDomains,
            isMultiDomain: domains.length > 1,
            overallConfidence: keywordResult.overallConfidence,
            tier: keywordResult.tier,
            processingTimeMs: keywordResult.processingTimeMs,
            metadata: {
                algorithm: 'config-driven',
                thresholds: {
                    primaryDomainMin: 0.5,
                    multiDomainThreshold: 0.3,
                    confidenceMin: 0.1
                },
                conflicts: []
            }
        };
    }
    /**
     * Assess complexity da keyword e context
     */
    assessComplexity(keywordResult, context) {
        // Simple complexity scoring per MVP
        const domainCount = new Set(keywordResult.keywords
            .map(k => k.domain)
            .filter(d => d)).size;
        const keywordDensity = keywordResult.keywords.length / context.inputText.split(/\s+/).length;
        const averageConfidence = keywordResult.overallConfidence;
        // Calculate complexity score (0.0-1.0)
        let complexityScore = 0.0;
        complexityScore += Math.min(domainCount * 0.2, 0.6); // Multi-domain complexity
        complexityScore += Math.min(keywordDensity * 0.3, 0.3); // Keyword density
        complexityScore += (1.0 - averageConfidence) * 0.1; // Uncertainty penalty
        // Map score to level
        let level;
        if (complexityScore < 0.3)
            level = 'low';
        else if (complexityScore < 0.6)
            level = 'medium';
        else if (complexityScore < 0.8)
            level = 'high';
        else
            level = 'extreme';
        // Model recommendation based on complexity
        let recommendedModel;
        if (level === 'low')
            recommendedModel = 'haiku';
        else if (level === 'extreme')
            recommendedModel = 'opus';
        else
            recommendedModel = 'sonnet';
        return {
            level,
            score: complexityScore,
            factors: [
                {
                    type: 'domain_count',
                    weight: 0.6,
                    score: Math.min(domainCount / 5, 1.0),
                    description: `${domainCount} domini rilevati`,
                    impact: { timeMultiplier: 1.0 + domainCount * 0.2, costMultiplier: 1.0 }
                }
            ],
            recommendedModel,
            estimates: {
                timeMinutes: level === 'low' ? 2 : level === 'medium' ? 5 : level === 'high' ? 15 : 30,
                costDollars: level === 'low' ? 0.01 : level === 'medium' ? 0.05 : level === 'high' ? 0.15 : 0.30,
                agentCount: domainCount,
                parallelizability: domainCount > 1 ? 0.8 : 0.2
            },
            shouldSpawnSubtasks: domainCount > 2 || level === 'extreme',
            maxSubtasks: Math.min(domainCount, 5),
            tier: keywordResult.tier,
            processingTimeMs: keywordResult.processingTimeMs
        };
    }
    // =============================================================================
    // UTILITY METHODS
    // =============================================================================
    /**
     * Load default configuration
     */
    loadDefaultConfig(override) {
        // Configurazione da tier-config.json (hardcoded per MVP)
        return {
            fastPath: {
                enabled: true,
                timeoutMs: 20,
                confidenceThreshold: 0.7,
                fallbackThreshold: 0.5
            },
            smartPath: {
                enabled: true,
                timeoutMs: 100,
                confidenceThreshold: 0.6,
                fallbackThreshold: 0.4
            },
            deepPath: {
                enabled: false, // TODO: Abilitare quando implementato
                timeoutMs: 5000,
                confidenceThreshold: 0.5
            },
            globalSettings: {
                maxParallelRequests: 10,
                requestQueueSize: 100,
                memoryLimitMB: 100,
                enableMetrics: true,
                enableProfiling: false
            },
            fallbackBehavior: {
                maxTierFailures: 3,
                circuitBreakerEnabled: true,
                circuitBreakerThreshold: 5
            },
            qualityGates: {
                minConfidenceThreshold: 0.1,
                maxResponseTimeMs: 5000,
                minCoveragePercentage: 70
            },
            ...override
        };
    }
    /**
     * Create request context
     */
    createRequestContext(text) {
        const context = {
            requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            startTime: performance.now(),
            inputText: text,
            tierAttempts: [],
            errors: [],
            warnings: []
        };
        this.requestQueue.set(context.requestId, context);
        return context;
    }
    /**
     * Generate cache key
     */
    generateCacheKey(text) {
        const normalized = text.toLowerCase().trim().replace(/\s+/g, ' ');
        return `analysis_${Buffer.from(normalized).toString('base64').slice(0, 32)}`;
    }
    /**
     * Get agent per domain
     */
    getAgentForDomain(domain) {
        const agents = {
            gui: 'experts/gui-super-expert.md',
            database: 'experts/database_expert.md',
            security: 'experts/security_unified_expert.md',
            testing: 'experts/tester_expert.md',
            trading: 'experts/trading_strategy_expert.md',
            integration: 'experts/integration_expert.md'
        };
        return agents[domain] || 'experts/general_expert.md';
    }
    /**
     * Get model per domain e confidence
     */
    getModelForDomain(domain, confidence) {
        if (confidence < 0.5)
            return 'haiku';
        const priorityDomains = ['security', 'architecture'];
        if (priorityDomains.includes(domain))
            return 'sonnet';
        return 'sonnet'; // Default
    }
    /**
     * Get priority per domain
     */
    getPriorityForDomain(domain) {
        const priorities = {
            security: 'CRITICA',
            architecture: 'CRITICA',
            testing: 'ALTA',
            database: 'ALTA',
            gui: 'MEDIA',
            integration: 'MEDIA'
        };
        return priorities[domain] || 'BASSA';
    }
    /**
     * Get default domain when none detected
     */
    getDefaultDomain() {
        return {
            name: 'general',
            confidence: 0.1,
            matchedKeywords: [],
            suggestedAgent: 'experts/general_expert.md',
            suggestedModel: 'haiku',
            priority: 'BASSA',
            weight: 1.0
        };
    }
    /**
     * Update metrics
     */
    updateMetrics(source) {
        if (source === 'cache') {
            this.metrics.cacheHitRate = this.cache.getStats().hitRate;
        }
    }
    /**
     * Update tier metrics
     */
    updateTierMetrics(tier, responseTime, success) {
        // Update average response time
        const alpha = 0.1;
        if (this.metrics.averageResponseTime[tier] === 0) {
            this.metrics.averageResponseTime[tier] = responseTime;
        }
        else {
            this.metrics.averageResponseTime[tier] =
                (alpha * responseTime) + ((1 - alpha) * this.metrics.averageResponseTime[tier]);
        }
        // Update error rate se failure
        if (!success) {
            this.metrics.errorRate[tier] = (this.metrics.errorRate[tier] + 1) / 2; // Simple moving average
        }
    }
    /**
     * Calculate overall average response time
     */
    calculateAverageResponseTime() {
        const times = Object.values(this.metrics.averageResponseTime);
        return times.reduce((sum, time) => sum + time, 0) / times.length;
    }
    /**
     * Get tier status
     */
    getTierStatus(tier) {
        const tierConfig = tier === 'fast' ? this.config.fastPath :
            tier === 'smart' ? this.config.smartPath :
                this.config.deepPath;
        if (!tierConfig.enabled)
            return 'disabled';
        if (!this.canUseTier(tier))
            return 'circuit_open';
        return 'active';
    }
    /**
     * Estimate memory usage
     */
    estimateMemoryUsage() {
        // Simple estimation (in realtà dovrebbe essere calcolata accuratamente)
        return 25; // MB
    }
    /**
     * Create fallback result quando tutti i tier falliscono
     */
    createFallbackResult(context) {
        context.warnings.push('All tiers failed - returning minimal fallback result');
        // Minimal keyword extraction con regex semplice
        const words = context.inputText.split(/\s+/).filter(w => w.length > 3);
        const fallbackKeywords = words.slice(0, 3).map((word) => ({
            text: word,
            confidence: 0.1,
            position: context.inputText.indexOf(word),
            length: word.length,
            domain: 'general',
            source: 'context',
            synonyms: [],
            context: context.inputText,
            matchType: 'partial'
        }));
        const fallbackResult = {
            keywords: fallbackKeywords,
            tier: context.tierAttempts[context.tierAttempts.length - 1] || 'fast',
            processingTimeMs: performance.now() - context.startTime,
            overallConfidence: 0.1,
            metadata: {
                inputText: context.inputText,
                tokens: words,
                tierAttempts: context.tierAttempts,
                cacheHit: false,
                stats: {
                    totalTokens: words.length,
                    uniqueTokens: new Set(words).size,
                    keywordsFound: fallbackKeywords.length,
                    averageConfidence: 0.1
                }
            }
        };
        return this.buildAnalysisResult(fallbackResult, context);
    }
    /**
     * Enrich cached result con fresh metadata
     */
    enrichCachedResult(cachedResult, context) {
        return {
            ...cachedResult,
            summary: {
                ...cachedResult.summary,
                totalTimeMs: performance.now() - context.startTime
            }
        };
    }
    /**
     * Create error result
     */
    createErrorResult(context, errorType, error) {
        const fallbackResult = this.createFallbackResult(context);
        return {
            ...fallbackResult,
            success: false,
            errors: [
                ...context.errors,
                {
                    tier: context.tierAttempts[context.tierAttempts.length - 1] || 'fast',
                    type: errorType,
                    message: error?.message || `Analysis failed: ${errorType}`,
                    stack: error?.stack,
                    recoverable: true
                }
            ]
        };
    }
}
exports.AnalysisEngine = AnalysisEngine;
//# sourceMappingURL=analysis-engine.js.map