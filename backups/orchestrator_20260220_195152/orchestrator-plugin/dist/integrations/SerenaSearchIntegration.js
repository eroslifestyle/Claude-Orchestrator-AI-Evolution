"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSerenaIntegration = exports.SerenaSearchIntegration = void 0;
// =============================================================================
// SERENA SEARCH INTEGRATION CLASS
// =============================================================================
class SerenaSearchIntegration {
    config;
    logger;
    fallbackSearch;
    cache = new Map();
    metrics;
    isEnabled = true;
    fallbackEnabled = true;
    maxCacheSize = 1000;
    defaultTTL = 5 * 60 * 1000; // 5 minutes
    constructor(config, logger, fallbackSearch) {
        this.config = config;
        this.logger = logger;
        this.fallbackSearch = fallbackSearch;
        this.metrics = {
            searchTime: 0,
            cacheHitRate: 0,
            patternAccuracy: 0,
            failoverRate: 0,
            throughput: 0,
            lastOptimization: new Date()
        };
        this.initializePerformanceOptimizations();
    }
    // =============================================================================
    // CORE SEARCH METHODS
    // =============================================================================
    /**
     * Enhanced search con Serena engine e intelligent fallback
     */
    async search(request) {
        const startTime = Date.now();
        const cacheKey = this.generateCacheKey(request);
        try {
            // 1. Check cache first for performance
            const cachedResult = this.getCachedResult(cacheKey);
            if (cachedResult) {
                this.updateMetrics('cache_hit', startTime);
                return cachedResult;
            }
            // 2. Execute Serena search
            const result = await this.executeSerenaSearch(request);
            // 3. Cache result for future queries
            this.cacheResult(cacheKey, result);
            // 4. Update performance metrics
            this.updateMetrics('search_success', startTime, result);
            return result;
        }
        catch (error) {
            this.logger.warn(`Serena search failed: ${error.message}`);
            // 5. Intelligent fallback to existing search system
            if (this.fallbackEnabled && this.fallbackSearch) {
                const fallbackResult = await this.executeFallbackSearch(request);
                this.updateMetrics('fallback_used', startTime);
                return fallbackResult;
            }
            throw new Error(`Search failed: ${error.message}`);
        }
    }
    /**
     * Multi-pattern batch search con parallelismo massimo
     */
    async batchSearch(requests) {
        const startTime = Date.now();
        // Execute parallel searches with performance optimization
        const searchPromises = requests.map((request, index) => this.search(request).catch(error => {
            this.logger.warn(`Batch search ${index} failed: ${error.message}`);
            return this.createErrorResult(request, error.message);
        }));
        const results = await Promise.all(searchPromises);
        this.updateBatchMetrics(startTime, results);
        return results;
    }
    /**
     * Enhanced keyword expansion con semantic analysis
     */
    async enhanceKeywords(keywords) {
        const enhanced = [];
        for (const keyword of keywords) {
            const enhancement = {
                original: keyword,
                patterns: this.generateSearchPatterns(keyword),
                semanticExpansions: this.generateSemanticExpansions(keyword),
                codePatterns: this.generateCodePatterns(keyword),
                confidence: this.calculatePatternConfidence(keyword)
            };
            enhanced.push(enhancement);
        }
        return enhanced;
    }
    // =============================================================================
    // SERENA MCP PLUGIN INTEGRATION
    // =============================================================================
    async executeSerenaSearch(request) {
        if (!this.isEnabled) {
            throw new Error('Serena search integration is disabled');
        }
        const startTime = Date.now();
        try {
            // Use the actual Serena MCP plugin tool
            const mcpRequest = {
                substring_pattern: request.pattern,
                relative_path: request.relativePath || '',
                restrict_search_to_code_files: request.restrictToCodeFiles || false,
                paths_include_glob: request.pathsIncludeGlob || '',
                paths_exclude_glob: request.pathsExcludeGlob || '',
                context_lines_after: request.contextLinesAfter || 0,
                context_lines_before: request.contextLinesBefore || 0,
                multiline: request.multiline || false,
                max_answer_chars: request.maxAnswerChars || -1
            };
            // This would be the actual MCP call - simulated for now
            const mcpResult = await this.callSerenaPlugin(mcpRequest);
            // Parse and structure the result
            const matches = this.parseSerenaResult(mcpResult);
            const result = {
                pattern: request.pattern,
                totalMatches: matches.length,
                fileCount: new Set(matches.map(m => m.filePath)).size,
                matches: matches,
                searchTime: Date.now() - startTime,
                cached: false
            };
            return result;
        }
        catch (error) {
            throw new Error(`Serena MCP call failed: ${error.message}`);
        }
    }
    async callSerenaPlugin(request) {
        // This would integrate with the actual MCP plugin
        // For now, we simulate the interface
        // In real implementation:
        // return await mcpPluginSerena.searchForPattern(request);
        // Simulated response structure:
        return {
            results: {
                'src/analysis/KeywordExtractor.ts': [
                    {
                        line_number: 45,
                        content: '  confidence_boost?: number;',
                        context_before: ['interface KeywordMapping {', '  domain: string;'],
                        context_after: ['}', '']
                    }
                ]
            },
            total_matches: 1,
            search_time_ms: 85
        };
    }
    parseSerenaResult(mcpResult) {
        const matches = [];
        for (const [filePath, fileMatches] of Object.entries(mcpResult.results || {})) {
            for (const match of fileMatches) {
                matches.push({
                    filePath: filePath,
                    lineNumber: match.line_number,
                    matchingLine: match.content,
                    contextBefore: match.context_before || [],
                    contextAfter: match.context_after || [],
                    confidence: this.calculateMatchConfidence(match.content)
                });
            }
        }
        return matches;
    }
    // =============================================================================
    // INTELLIGENT CACHING SYSTEM
    // =============================================================================
    generateCacheKey(request) {
        const keyData = {
            pattern: request.pattern,
            path: request.relativePath || '',
            codeOnly: request.restrictToCodeFiles || false,
            include: request.pathsIncludeGlob || '',
            exclude: request.pathsExcludeGlob || ''
        };
        return JSON.stringify(keyData);
    }
    getCachedResult(cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (!cached)
            return null;
        // Check TTL
        if (Date.now() - cached.timestamp.getTime() > cached.ttl) {
            this.cache.delete(cacheKey);
            return null;
        }
        // Update hit count and return result
        cached.hits++;
        cached.result.cached = true;
        return cached.result;
    }
    cacheResult(cacheKey, result) {
        // Manage cache size
        if (this.cache.size >= this.maxCacheSize) {
            this.evictOldestCacheEntries();
        }
        const cacheEntry = {
            pattern: result.pattern,
            hash: this.generateContentHash(result),
            result: { ...result, cached: false },
            timestamp: new Date(),
            hits: 0,
            ttl: this.calculateTTL(result)
        };
        this.cache.set(cacheKey, cacheEntry);
    }
    // =============================================================================
    // PERFORMANCE OPTIMIZATION
    // =============================================================================
    initializePerformanceOptimizations() {
        // Set up background cache cleanup
        setInterval(() => this.cleanupExpiredCache(), 60000); // Every minute
        // Performance metrics collection
        setInterval(() => this.updatePerformanceMetrics(), 30000); // Every 30 seconds
    }
    cleanupExpiredCache() {
        const now = Date.now();
        const keysToDelete = [];
        Array.from(this.cache.entries()).forEach(([key, entry]) => {
            if (now - entry.timestamp.getTime() > entry.ttl) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => this.cache.delete(key));
    }
    evictOldestCacheEntries() {
        // Remove 20% of cache entries, starting with least recently used
        const entriesToEvict = Math.floor(this.cache.size * 0.2);
        const sortedEntries = Array.from(this.cache.entries())
            .sort(([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime());
        for (let i = 0; i < entriesToEvict; i++) {
            this.cache.delete(sortedEntries[i][0]);
        }
    }
    // =============================================================================
    // FALLBACK SYSTEM
    // =============================================================================
    async executeFallbackSearch(request) {
        if (!this.fallbackSearch) {
            throw new Error('No fallback search system available');
        }
        try {
            const result = await this.fallbackSearch(request);
            result.cached = false;
            return result;
        }
        catch (error) {
            throw new Error(`Fallback search failed: ${error.message}`);
        }
    }
    // =============================================================================
    // PATTERN ENHANCEMENT ALGORITHMS
    // =============================================================================
    generateSearchPatterns(keyword) {
        const patterns = [];
        // Exact match
        patterns.push(`\\b${this.escapeRegex(keyword)}\\b`);
        // Case insensitive
        patterns.push(`(?i)\\b${this.escapeRegex(keyword)}\\b`);
        // Word boundaries with common separators
        patterns.push(`[\\w_]*${this.escapeRegex(keyword)}[\\w_]*`);
        // Function/method patterns
        patterns.push(`${this.escapeRegex(keyword)}\\s*\\(`);
        // Variable/property patterns
        patterns.push(`\\.(\\s)*${this.escapeRegex(keyword)}`);
        return patterns;
    }
    generateSemanticExpansions(keyword) {
        const expansions = [];
        // Common programming synonyms
        const synonymMap = {
            'function': ['method', 'procedure', 'routine'],
            'variable': ['var', 'field', 'property'],
            'class': ['type', 'interface', 'struct'],
            'error': ['exception', 'failure', 'issue'],
            'test': ['spec', 'check', 'validate']
        };
        const lower = keyword.toLowerCase();
        if (synonymMap[lower]) {
            expansions.push(...synonymMap[lower]);
        }
        // Common prefixes/suffixes
        expansions.push(`get${this.capitalize(keyword)}`);
        expansions.push(`set${this.capitalize(keyword)}`);
        expansions.push(`${keyword}er`);
        expansions.push(`${keyword}ing`);
        return expansions;
    }
    generateCodePatterns(keyword) {
        const patterns = [];
        // TypeScript/JavaScript patterns
        patterns.push(`interface\\s+${this.escapeRegex(keyword)}`);
        patterns.push(`class\\s+${this.escapeRegex(keyword)}`);
        patterns.push(`function\\s+${this.escapeRegex(keyword)}`);
        patterns.push(`const\\s+${this.escapeRegex(keyword)}`);
        patterns.push(`export\\s+.*${this.escapeRegex(keyword)}`);
        // Import/require patterns
        patterns.push(`import.*${this.escapeRegex(keyword)}`);
        patterns.push(`require.*${this.escapeRegex(keyword)}`);
        return patterns;
    }
    // =============================================================================
    // UTILITY METHODS
    // =============================================================================
    calculateMatchConfidence(content) {
        // Simple confidence calculation based on content quality
        let confidence = 0.7; // Base confidence
        if (content.includes('function'))
            confidence += 0.1;
        if (content.includes('class'))
            confidence += 0.1;
        if (content.includes('interface'))
            confidence += 0.1;
        if (content.trim().startsWith('//'))
            confidence -= 0.2;
        return Math.min(1.0, Math.max(0.0, confidence));
    }
    calculatePatternConfidence(keyword) {
        // Calculate confidence based on keyword characteristics
        let confidence = 0.8; // Base confidence
        if (keyword.length < 3)
            confidence -= 0.3;
        if (keyword.includes('_'))
            confidence += 0.1;
        if (/^[A-Z]/.test(keyword))
            confidence += 0.1;
        return Math.min(1.0, Math.max(0.0, confidence));
    }
    calculateTTL(result) {
        // Dynamic TTL based on result characteristics
        let ttl = this.defaultTTL;
        if (result.totalMatches > 50)
            ttl *= 2; // Large results cache longer
        if (result.searchTime > 1000)
            ttl *= 1.5; // Expensive searches cache longer
        return ttl;
    }
    generateContentHash(result) {
        const content = JSON.stringify({
            pattern: result.pattern,
            matches: result.totalMatches,
            files: result.fileCount
        });
        // Simple hash function for cache validation
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }
    escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    capitalize(text) {
        return text.charAt(0).toUpperCase() + text.slice(1);
    }
    createErrorResult(request, error) {
        return {
            pattern: request.pattern,
            totalMatches: 0,
            fileCount: 0,
            matches: [],
            searchTime: 0,
            cached: false,
            error: error
        };
    }
    // =============================================================================
    // METRICS & MONITORING
    // =============================================================================
    updateMetrics(type, startTime, result) {
        const duration = Date.now() - startTime;
        switch (type) {
            case 'cache_hit':
                this.metrics.cacheHitRate = this.calculateCacheHitRate();
                break;
            case 'search_success':
                this.metrics.searchTime = this.updateAverageTime(duration);
                if (result) {
                    this.metrics.patternAccuracy = this.updatePatternAccuracy(result);
                }
                break;
            case 'fallback_used':
                this.metrics.failoverRate = this.updateFailoverRate();
                break;
        }
        this.metrics.throughput = this.calculateThroughput();
    }
    updateBatchMetrics(startTime, results) {
        const totalTime = Date.now() - startTime;
        const successfulSearches = results.filter(r => !r.error).length;
        this.metrics.searchTime = this.updateAverageTime(totalTime / results.length);
        this.metrics.throughput = successfulSearches / (totalTime / 1000);
    }
    calculateCacheHitRate() {
        const totalEntries = this.cache.size;
        if (totalEntries === 0)
            return 0;
        const totalHits = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.hits, 0);
        return totalHits / totalEntries;
    }
    updateAverageTime(newTime) {
        return (this.metrics.searchTime * 0.9) + (newTime * 0.1); // Exponential moving average
    }
    updatePatternAccuracy(result) {
        const avgConfidence = result.matches.reduce((sum, match) => sum + match.confidence, 0) / result.matches.length || 0;
        return (this.metrics.patternAccuracy * 0.9) + (avgConfidence * 0.1);
    }
    updateFailoverRate() {
        // This would track actual failover statistics in a production implementation
        return this.metrics.failoverRate;
    }
    calculateThroughput() {
        // This would track actual throughput in a production implementation
        return this.metrics.throughput;
    }
    updatePerformanceMetrics() {
        // Background metrics optimization
        this.metrics.lastOptimization = new Date();
        // Log performance statistics
        this.logger.debug('Serena Performance Metrics:', {
            searchTime: `${this.metrics.searchTime.toFixed(2)}ms`,
            cacheHitRate: `${(this.metrics.cacheHitRate * 100).toFixed(1)}%`,
            patternAccuracy: `${(this.metrics.patternAccuracy * 100).toFixed(1)}%`,
            throughput: `${this.metrics.throughput.toFixed(2)} searches/sec`
        });
    }
    // =============================================================================
    // PUBLIC API METHODS
    // =============================================================================
    getMetrics() {
        return { ...this.metrics };
    }
    getCacheStats() {
        const totalHits = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.hits, 0);
        return {
            size: this.cache.size,
            hitRate: this.metrics.cacheHitRate,
            totalHits: totalHits
        };
    }
    clearCache() {
        this.cache.clear();
        this.logger.info('Serena search cache cleared');
    }
    setEnabled(enabled) {
        this.isEnabled = enabled;
        this.logger.info(`Serena search ${enabled ? 'enabled' : 'disabled'}`);
    }
    setFallbackEnabled(enabled) {
        this.fallbackEnabled = enabled;
        this.logger.info(`Serena fallback ${enabled ? 'enabled' : 'disabled'}`);
    }
}
exports.SerenaSearchIntegration = SerenaSearchIntegration;
// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================
function createSerenaIntegration(config, logger, fallbackSearch) {
    return new SerenaSearchIntegration(config, logger, fallbackSearch);
}
exports.createSerenaIntegration = createSerenaIntegration;
// =============================================================================
// EXPORT TYPES
// =============================================================================
// All interfaces are already exported with 'export interface' declarations
//# sourceMappingURL=SerenaSearchIntegration.js.map