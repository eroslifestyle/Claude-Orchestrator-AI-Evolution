"use strict";
/**
 * Tier 2 - Smart Path Analyzer
 *
 * Implementa synonym matching, phrase patterns e context-aware rules
 * Target: <50ms response time, 95% coverage, confidence threshold 0.6
 *
 * @version 1.0 - Smart Path Implementation
 * @author Analysis Layer Team
 * @date 30 Gennaio 2026
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartPathAnalyzer = void 0;
const confidence_scorer_1 = require("../../utils/confidence-scorer");
const cache_manager_1 = require("../../utils/cache-manager");
// =============================================================================
// SMART PATH ANALYZER CLASS
// =============================================================================
class SmartPathAnalyzer {
    config;
    confidenceScorer;
    keywordCache;
    synonymMappings;
    phrasePatterns;
    contextRules;
    metrics;
    startupTime;
    constructor(config) {
        this.startupTime = performance.now();
        // Default configuration con performance targets
        this.config = {
            enabled: true,
            timeoutMs: 100,
            confidenceThreshold: 0.6,
            maxInputLength: 2000,
            enableSynonyms: true,
            enablePhrases: true,
            enableContextRules: true,
            synonymMaxDepth: 3,
            phraseMaxLength: 5,
            contextWindow: 5,
            fuzzyDistanceMax: 2,
            ...config
        };
        // Initialize components
        this.confidenceScorer = new confidence_scorer_1.ConfidenceScorer();
        this.keywordCache = new cache_manager_1.KeywordExtractionCache();
        // Initialize data structures
        this.synonymMappings = new Map();
        this.phrasePatterns = [];
        this.contextRules = [];
        // Initialize metrics
        this.metrics = {
            synonymMatches: 0,
            phraseMatches: 0,
            contextRuleMatches: 0,
            fuzzyMatches: 0,
            averageProcessingTime: 0,
            cacheHitRate: 0,
            memoryUsageMB: 0,
            synonymDictSize: 0,
            phrasePatternCount: 0,
            contextRuleCount: 0
        };
        // Load dictionaries and patterns
        this.loadSynonymMappings();
        this.loadPhrasePatterns();
        this.loadContextRules();
        console.log(`🧠 SmartPathAnalyzer inizializzato in ${Math.round(performance.now() - this.startupTime)}ms`);
    }
    // =============================================================================
    // PUBLIC API
    // =============================================================================
    /**
     * Analizza testo con Smart Path (Tier 2)
     * Target: <50ms, confidence >0.6, 95% coverage
     */
    async analyze(text) {
        const analysisStart = performance.now();
        try {
            // Validation e preprocessing
            const processedText = this.preprocessText(text);
            if (!this.isValidInput(processedText)) {
                return this.createErrorResult('invalid_input', analysisStart);
            }
            // Cache lookup
            const cacheKey = this.keywordCache.generateKey(processedText, 'smart');
            const cacheResult = this.keywordCache.get(cacheKey);
            if (cacheResult.hit && cacheResult.data) {
                const stats = this.keywordCache.getStats();
                this.updateMetrics(stats, performance.now() - analysisStart);
                const result = { ...cacheResult.data };
                result.metadata.cacheHit = true;
                return this.createSuccessResult(result, 'smart', analysisStart);
            }
            // Core Smart Path analysis
            const keywords = await this.extractKeywordsSmart(processedText);
            const result = this.buildExtractionResult(keywords, processedText, analysisStart);
            // Cache result se confidence alta
            if (result.overallConfidence >= this.config.confidenceThreshold) {
                this.keywordCache.set(cacheKey, result);
            }
            this.updateMetrics(this.keywordCache.getStats(), performance.now() - analysisStart);
            return this.createSuccessResult(result, 'smart', analysisStart);
        }
        catch (error) {
            return this.createErrorResult('system_error', analysisStart, error);
        }
    }
    /**
     * Check se Smart Path può gestire questa richiesta
     */
    canHandle(text) {
        if (!this.config.enabled)
            return false;
        if (text.length > this.config.maxInputLength)
            return false;
        // Quick confidence check con synonym/phrase scanning
        const quickScore = this.getQuickConfidenceScore(text);
        return quickScore >= this.config.confidenceThreshold;
    }
    /**
     * Get comprehensive metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }
    // =============================================================================
    // CORE ANALYSIS METHODS
    // =============================================================================
    /**
     * Core Smart Path extraction con synonym, phrase, context
     */
    async extractKeywordsSmart(text) {
        const keywords = [];
        const tokens = this.tokenizeText(text);
        // 1. Synonym matching
        if (this.config.enableSynonyms) {
            const synonymKeywords = this.extractSynonymMatches(text, tokens);
            keywords.push(...synonymKeywords);
        }
        // 2. Phrase pattern matching
        if (this.config.enablePhrases) {
            const phraseKeywords = this.extractPhraseMatches(text, tokens);
            keywords.push(...phraseKeywords);
        }
        // 3. Context rule application
        if (this.config.enableContextRules) {
            const contextKeywords = this.extractContextMatches(text, tokens, keywords);
            keywords.push(...contextKeywords);
        }
        // 4. Fuzzy matching per keywords non trovate
        const fuzzyKeywords = this.extractFuzzyMatches(text, tokens, keywords);
        keywords.push(...fuzzyKeywords);
        // 5. Deduplicate e score
        const finalKeywords = this.deduplicateAndScore(keywords, text);
        return finalKeywords.sort((a, b) => {
            // Sort by confidence desc, then position asc
            if (Math.abs(a.confidence - b.confidence) > 0.05) {
                return b.confidence - a.confidence;
            }
            return a.position - b.position;
        });
    }
    /**
     * Extract synonym matches
     */
    extractSynonymMatches(text, _tokens) {
        const keywords = [];
        const textLower = text.toLowerCase();
        for (const [domain, mappings] of this.synonymMappings.entries()) {
            for (const mapping of mappings) {
                // Check base keyword
                const baseMatch = this.findWordInText(textLower, mapping.baseKeyword);
                if (baseMatch) {
                    keywords.push(this.createKeywordFromMatch(baseMatch, mapping.baseKeyword, domain, 'exact', 'direct', text));
                }
                // Check synonyms
                for (const synonym of mapping.synonyms) {
                    const synonymMatch = this.findWordInText(textLower, synonym);
                    if (synonymMatch) {
                        keywords.push(this.createKeywordFromMatch(synonymMatch, mapping.baseKeyword, // Use base keyword as canonical form
                        domain, 'synonym', 'direct', text));
                        this.metrics.synonymMatches++;
                    }
                }
                // Check variations
                for (const variation of mapping.variations) {
                    const variationMatch = this.findWordInText(textLower, variation);
                    if (variationMatch) {
                        keywords.push(this.createKeywordFromMatch(variationMatch, mapping.baseKeyword, domain, 'synonym', 'partial', text));
                    }
                }
            }
        }
        return keywords;
    }
    /**
     * Extract phrase pattern matches
     */
    extractPhraseMatches(text, _tokens) {
        const keywords = [];
        const textLower = text.toLowerCase();
        for (const pattern of this.phrasePatterns) {
            const phraseMatches = this.findPhraseInText(textLower, pattern);
            for (const match of phraseMatches) {
                keywords.push(this.createKeywordFromMatch(match, pattern.pattern.join(' '), pattern.domain, 'phrase', 'direct', text));
                this.metrics.phraseMatches++;
            }
        }
        return keywords;
    }
    /**
     * Extract context rule matches
     */
    extractContextMatches(text, _tokens, _existingKeywords) {
        const keywords = [];
        const textLower = text.toLowerCase();
        for (const rule of this.contextRules) {
            const triggerMatch = this.findWordInText(textLower, rule.trigger);
            if (!triggerMatch)
                continue;
            // Check per amplifiers nel context window
            const contextWindow = this.extractContextWindow(text, triggerMatch.position, this.config.contextWindow);
            const hasAmplifiers = rule.amplifiers.some(amp => contextWindow.toLowerCase().includes(amp));
            const hasDampeners = rule.dampeners.some(damp => contextWindow.toLowerCase().includes(damp));
            // Create context-inferred keyword se conditions match
            if (hasAmplifiers && !hasDampeners) {
                keywords.push(this.createKeywordFromMatch(triggerMatch, rule.trigger, rule.domain, 'context', 'inferred', text));
                this.metrics.contextRuleMatches++;
            }
        }
        return keywords;
    }
    /**
     * Extract fuzzy matches per missed keywords
     */
    extractFuzzyMatches(text, tokens, existingKeywords) {
        const keywords = [];
        const existingTexts = new Set(existingKeywords.map(k => k.text.toLowerCase()));
        // Get all base keywords per fuzzy matching
        const allBaseKeywords = new Set();
        for (const mappings of this.synonymMappings.values()) {
            for (const mapping of mappings) {
                allBaseKeywords.add(mapping.baseKeyword);
            }
        }
        // Fuzzy match tokens against base keywords
        for (const token of tokens) {
            if (token.length < 3 || existingTexts.has(token.toLowerCase()))
                continue;
            for (const baseKeyword of allBaseKeywords) {
                const distance = this.calculateLevenshteinDistance(token.toLowerCase(), baseKeyword.toLowerCase());
                if (distance <= this.config.fuzzyDistanceMax && distance > 0) {
                    const match = this.findWordInText(text.toLowerCase(), token);
                    if (match) {
                        // Find domain per questo base keyword
                        const domain = this.findDomainForKeyword(baseKeyword);
                        if (domain) {
                            keywords.push(this.createKeywordFromMatch(match, baseKeyword, // Use base keyword come canonical
                            domain, 'fuzzy', 'partial', text));
                            this.metrics.fuzzyMatches++;
                        }
                    }
                }
            }
        }
        return keywords;
    }
    // =============================================================================
    // UTILITY METHODS
    // =============================================================================
    /**
     * Tokenize text in words
     */
    tokenizeText(text) {
        return text
            .toLowerCase()
            .split(/\W+/)
            .filter(token => token.length > 0);
    }
    /**
     * Find word in text con position
     */
    findWordInText(text, word) {
        const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        const match = text.match(regex);
        if (match && match.index !== undefined) {
            return {
                position: match.index,
                length: match[0].length
            };
        }
        return null;
    }
    /**
     * Find phrase pattern in text
     */
    findPhraseInText(text, pattern) {
        const matches = [];
        if (pattern.orderSensitive) {
            // Sequential phrase matching
            const phraseRegex = pattern.pattern
                .map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                .join('\\s+');
            const regex = new RegExp(`\\b${phraseRegex}\\b`, 'gi');
            let match;
            while ((match = regex.exec(text)) !== null) {
                matches.push({
                    position: match.index,
                    length: match[0].length
                });
            }
        }
        else {
            // Flexible phrase matching (parole in qualsiasi ordine)
            const allWords = pattern.pattern;
            const foundWords = allWords.filter(word => text.includes(word.toLowerCase()));
            // Se abbiamo almeno la metà delle parole, consider it a match
            if (foundWords.length >= Math.ceil(allWords.length / 2)) {
                const firstWord = foundWords[0];
                const wordMatch = this.findWordInText(text, firstWord);
                if (wordMatch) {
                    matches.push(wordMatch);
                }
            }
        }
        return matches;
    }
    /**
     * Extract context window around position
     */
    extractContextWindow(text, position, windowSize) {
        const beforeText = text.substring(0, position);
        const afterText = text.substring(position);
        const beforeWords = beforeText.split(/\s+/).slice(-windowSize).join(' ');
        const afterWords = afterText.split(/\s+/).slice(0, windowSize).join(' ');
        return `${beforeWords} ${afterWords}`.trim();
    }
    /**
     * Calculate Levenshtein distance per fuzzy matching
     */
    calculateLevenshteinDistance(str1, str2) {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
        for (let i = 0; i <= str1.length; i++)
            matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++)
            matrix[j][0] = j;
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(matrix[j][i - 1] + 1, // deletion
                matrix[j - 1][i] + 1, // insertion
                matrix[j - 1][i - 1] + indicator // substitution
                );
            }
        }
        return matrix[str2.length][str1.length];
    }
    /**
     * Find domain per keyword
     */
    findDomainForKeyword(keyword) {
        for (const [domain, mappings] of this.synonymMappings.entries()) {
            if (mappings.some(m => m.baseKeyword === keyword)) {
                return domain;
            }
        }
        return null;
    }
    /**
     * Create keyword from match data
     */
    createKeywordFromMatch(match, canonicalText, domain, source, matchType, originalText) {
        const tempKeyword = {
            text: canonicalText,
            confidence: 0.0, // Will be calculated
            position: match.position,
            length: match.length,
            domain,
            source,
            synonyms: [],
            context: this.extractContextWindow(originalText, match.position, 3),
            matchType
        };
        // Calculate confidence using unified system
        const confidenceContext = (0, confidence_scorer_1.createConfidenceContext)(tempKeyword, originalText, 'smart', {
            domainCount: 1,
            hasDomainAmplifiers: this.hasContextAmplifiers(tempKeyword.context, domain)
        });
        const scoringResult = this.confidenceScorer.scoreKeyword(tempKeyword, confidenceContext);
        return {
            ...tempKeyword,
            confidence: scoringResult.finalScore
        };
    }
    /**
     * Check context amplifiers per domain
     */
    hasContextAmplifiers(context, domain) {
        const amplifierWords = {
            gui: ['interfaccia', 'visual', 'design', 'user', 'experience'],
            database: ['dati', 'query', 'schema', 'tabella', 'record'],
            security: ['sicurezza', 'autenticazione', 'crittografia', 'protezione'],
            trading: ['mercato', 'trading', 'investimenti', 'portafoglio'],
            testing: ['test', 'verifica', 'qualità', 'validazione'],
            integration: ['integrazione', 'connessione', 'comunicazione']
        };
        const domainAmplifiers = amplifierWords[domain] || [];
        const contextLower = context.toLowerCase();
        return domainAmplifiers.some(amplifier => contextLower.includes(amplifier));
    }
    /**
     * Deduplicate keywords e final scoring
     */
    deduplicateAndScore(keywords, _text) {
        const keywordMap = new Map();
        for (const keyword of keywords) {
            const key = `${keyword.text.toLowerCase()}:${keyword.domain}`;
            if (!keywordMap.has(key)) {
                keywordMap.set(key, keyword);
            }
            else {
                // Keep higher confidence version
                const existing = keywordMap.get(key);
                if (keyword.confidence > existing.confidence) {
                    keywordMap.set(key, keyword);
                }
            }
        }
        return Array.from(keywordMap.values());
    }
    /**
     * Quick confidence estimation
     */
    getQuickConfidenceScore(text) {
        const tokens = this.tokenizeText(text);
        let maxScore = 0;
        // Quick synonym scan
        for (const [, mappings] of this.synonymMappings.entries()) {
            for (const mapping of mappings) {
                const hasBaseKeyword = tokens.some(token => token === mapping.baseKeyword);
                const hasSynonym = mapping.synonyms.some(syn => tokens.some(token => token === syn));
                if (hasBaseKeyword || hasSynonym) {
                    maxScore = Math.max(maxScore, mapping.confidence);
                }
            }
        }
        return maxScore;
    }
    // =============================================================================
    // DATA LOADING METHODS
    // =============================================================================
    /**
     * Load synonym mappings (placeholder per MVP)
     */
    loadSynonymMappings() {
        // Hardcoded per MVP - in produzione caricate da synonyms.json
        const mappings = {
            gui: [
                {
                    domain: 'gui',
                    baseKeyword: 'interfaccia',
                    synonyms: ['interface', 'gui', 'ui', 'frontend'],
                    variations: ['interfacce', 'interfaccia grafica'],
                    confidence: 0.85,
                    weight: 1.0
                }
            ],
            database: [
                {
                    domain: 'database',
                    baseKeyword: 'database',
                    synonyms: ['db', 'dati', 'storage', 'repository'],
                    variations: ['databases', 'data storage'],
                    confidence: 0.9,
                    weight: 1.0
                }
            ]
        };
        for (const [domain, domainMappings] of Object.entries(mappings)) {
            this.synonymMappings.set(domain, domainMappings);
        }
        this.metrics.synonymDictSize = Array.from(this.synonymMappings.values())
            .reduce((sum, mappings) => sum + mappings.length, 0);
        console.log(`📚 Caricate ${this.metrics.synonymDictSize} synonym mappings`);
    }
    /**
     * Load phrase patterns (placeholder per MVP)
     */
    loadPhrasePatterns() {
        // Hardcoded per MVP - in produzione caricate da phrase-patterns.json
        this.phrasePatterns = [
            {
                domain: 'gui',
                pattern: ['interfaccia', 'grafica'],
                confidence: 0.9,
                allowPartial: false,
                orderSensitive: true,
                maxGap: 1
            },
            {
                domain: 'security',
                pattern: ['risk', 'management'],
                confidence: 0.85,
                allowPartial: false,
                orderSensitive: false,
                maxGap: 2
            }
        ];
        this.metrics.phrasePatternCount = this.phrasePatterns.length;
        console.log(`🔤 Caricate ${this.metrics.phrasePatternCount} phrase patterns`);
    }
    /**
     * Load context rules (placeholder per MVP)
     */
    loadContextRules() {
        // Hardcoded per MVP - in produzione caricate da context-rules.json
        this.contextRules = [
            {
                domain: 'gui',
                trigger: 'crea',
                amplifiers: ['interfaccia', 'visual', 'design'],
                dampeners: ['database', 'api'],
                proximityBonus: 0.1,
                confidenceModifier: 0.15
            },
            {
                domain: 'security',
                trigger: 'sicurezza',
                amplifiers: ['autenticazione', 'crittografia', 'protezione'],
                dampeners: ['test', 'demo'],
                proximityBonus: 0.15,
                confidenceModifier: 0.2
            }
        ];
        this.metrics.contextRuleCount = this.contextRules.length;
        console.log(`⚡ Caricate ${this.metrics.contextRuleCount} context rules`);
    }
    // =============================================================================
    // RESULT BUILDERS & UTILITIES
    // =============================================================================
    /**
     * Preprocess input text
     */
    preprocessText(text) {
        return text
            .trim()
            .replace(/\s+/g, ' ')
            .substring(0, this.config.maxInputLength);
    }
    /**
     * Validate input
     */
    isValidInput(text) {
        return text.length > 0 && text.length <= this.config.maxInputLength;
    }
    /**
     * Update metrics
     */
    updateMetrics(cacheStats, responseTime) {
        // Moving average per response time
        const alpha = 0.1;
        if (this.metrics.averageProcessingTime === 0) {
            this.metrics.averageProcessingTime = responseTime;
        }
        else {
            this.metrics.averageProcessingTime =
                (alpha * responseTime) + ((1 - alpha) * this.metrics.averageProcessingTime);
        }
        this.metrics.cacheHitRate = cacheStats.hitRate;
        this.metrics.memoryUsageMB = cacheStats.memoryUsageMB;
    }
    /**
     * Build extraction result
     */
    buildExtractionResult(keywords, text, startTime) {
        const processingTime = performance.now() - startTime;
        const overallConfidence = keywords.length > 0
            ? keywords.reduce((sum, kw) => sum + kw.confidence, 0) / keywords.length
            : 0;
        return {
            keywords,
            tier: 'smart',
            processingTimeMs: processingTime,
            overallConfidence,
            metadata: {
                inputText: text,
                tokens: this.tokenizeText(text),
                tierAttempts: ['smart'],
                cacheHit: false,
                stats: {
                    totalTokens: this.tokenizeText(text).length,
                    uniqueTokens: new Set(this.tokenizeText(text)).size,
                    keywordsFound: keywords.length,
                    averageConfidence: overallConfidence
                }
            }
        };
    }
    /**
     * Create success result
     */
    createSuccessResult(result, tier, startTime) {
        return {
            success: true,
            data: result,
            tier,
            timeMs: performance.now() - startTime
        };
    }
    /**
     * Create error result
     */
    createErrorResult(errorType, startTime, error) {
        return {
            success: false,
            error: {
                tier: 'smart',
                type: errorType,
                message: error?.message || `Smart Path analysis failed: ${errorType}`,
                stack: error?.stack,
                recoverable: true
            },
            tier: 'smart',
            timeMs: performance.now() - startTime
        };
    }
}
exports.SmartPathAnalyzer = SmartPathAnalyzer;
//# sourceMappingURL=smart-path-analyzer.js.map