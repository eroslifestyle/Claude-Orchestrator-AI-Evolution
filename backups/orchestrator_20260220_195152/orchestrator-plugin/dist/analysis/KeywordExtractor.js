"use strict";
/**
 * KeywordExtractor - NLP Processing per Domain Detection
 *
 * Implementazione AI Integration Expert con confidence scoring avanzato
 * e multi-domain request handling per il Claude Code Orchestrator Plugin.
 *
 * @version 1.0 - Fase 2 Implementation
 * @author AI Integration Expert Agent
 * @date 30 Gennaio 2026
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createKeywordExtractor = exports.KeywordExtractor = void 0;
const logger_1 = require("../utils/logger");
// =============================================================================
// KEYWORD EXTRACTOR CLASS
// =============================================================================
class KeywordExtractor {
    logger;
    keywordMappings;
    confidenceConfig;
    synonymDictionary;
    constructor(_config) {
        // Store config if needed, or remove the unused parameter warning
        // this.config = _config;
        this.logger = new logger_1.PluginLogger('KeywordExtractor');
        this.keywordMappings = new Map();
        this.synonymDictionary = new Map();
        // Configuration-driven confidence scoring
        // Configuration-driven confidence scoring
        this.confidenceConfig = {
            exact_match: 1.0,
            fuzzy_match: 0.8,
            domain_inference: 0.6,
            context_clues: 0.4,
            default_fallback: 0.1,
            priority_boost: {
                'CRITICA': 0.2,
                'ALTA': 0.1,
                'MEDIA': 0.05,
                'BASSA': 0.0
            }
        };
        this.initializeKeywordMappings();
        this.initializeSynonymDictionary();
        this.logger.info('KeywordExtractor initialized with NLP processing capabilities');
    }
    // =============================================================================
    // PUBLIC API
    // =============================================================================
    /**
     * Estrae keywords da una richiesta utente con confidence scoring
     */
    async extractKeywords(request) {
        const startTime = Date.now();
        this.logger.debug('Extracting keywords', { request });
        try {
            // Preprocessing del testo
            const cleanText = this.preprocessText(request);
            const tokens = this.tokenizeText(cleanText);
            // Multi-tier keyword extraction
            const extractedKeywords = [];
            // Tier 1: Exact matches
            extractedKeywords.push(...this.extractExactMatches(cleanText, tokens));
            // Tier 2: Fuzzy matches e synonyms
            extractedKeywords.push(...this.extractFuzzyMatches(cleanText, tokens));
            // Tier 3: Context-based inference
            extractedKeywords.push(...this.extractContextualKeywords(cleanText, tokens));
            // Deduplication e ranking
            const uniqueKeywords = this.deduplicateKeywords(extractedKeywords);
            const rankedKeywords = this.rankKeywordsByConfidence(uniqueKeywords);
            const processingTime = Date.now() - startTime;
            const overallConfidence = this.calculateOverallConfidence(rankedKeywords);
            return {
                keywords: rankedKeywords,
                tier: 'smart', // Smart tier con NLP processing
                processingTimeMs: processingTime,
                overallConfidence,
                metadata: {
                    inputText: request,
                    tokens,
                    tierAttempts: ['fast', 'smart'],
                    cacheHit: false, // TODO: Implement caching
                    stats: {
                        totalTokens: tokens.length,
                        uniqueTokens: new Set(tokens).size,
                        keywordsFound: rankedKeywords.length,
                        averageConfidence: overallConfidence
                    }
                }
            };
        }
        catch (error) {
            this.logger.error('Keyword extraction failed', { error, request });
            throw error;
        }
    }
    /**
     * Rileva domini da keywords estratte
     */
    async detectDomains(keywords) {
        this.logger.debug('Detecting domains from keywords', { keywordCount: keywords.length });
        const domainScores = new Map();
        const domainKeywords = new Map();
        // Analizza ogni keyword per domain detection
        keywords.forEach(keyword => {
            const matchingDomains = this.findMatchingDomains(keyword.text);
            matchingDomains.forEach(domain => {
                const currentScore = domainScores.get(domain) || 0;
                const boost = keyword.confidence * (keyword.domain === domain ? 1.2 : 1.0);
                domainScores.set(domain, currentScore + boost);
                if (!domainKeywords.has(domain)) {
                    domainKeywords.set(domain, []);
                }
                domainKeywords.get(domain).push(keyword.text);
            });
        });
        // Converte in ClassifiedDomain array
        const classifiedDomains = [];
        for (const [domainName, score] of domainScores.entries()) {
            const mapping = this.keywordMappings.get(domainName);
            if (!mapping)
                continue;
            const normalizedConfidence = Math.min(score / keywords.length, 1.0);
            classifiedDomains.push({
                name: domainName,
                confidence: normalizedConfidence,
                matchedKeywords: domainKeywords.get(domainName) || [],
                suggestedAgent: mapping.agent,
                suggestedModel: mapping.model,
                priority: mapping.priority,
                weight: this.calculateDomainWeight(normalizedConfidence, mapping.priority)
            });
        }
        return classifiedDomains
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 10); // Top 10 domini più rilevanti
    }
    /**
     * Calcola confidence score per keyword-domain pair
     */
    calculateConfidence(keyword, domain) {
        const mapping = this.keywordMappings.get(domain);
        if (!mapping)
            return this.confidenceConfig.default_fallback;
        // Exact match
        if (mapping.keywords.includes(keyword.toLowerCase())) {
            return this.confidenceConfig.exact_match +
                (this.confidenceConfig.priority_boost[mapping.priority] || 0);
        }
        // Fuzzy match
        const fuzzyScore = this.calculateFuzzyScore(keyword, mapping.keywords);
        if (fuzzyScore > 0.7) {
            return this.confidenceConfig.fuzzy_match * fuzzyScore +
                (this.confidenceConfig.priority_boost[mapping.priority] || 0);
        }
        // Synonym match
        const synonymScore = this.calculateSynonymScore(keyword, mapping.keywords);
        if (synonymScore > 0) {
            return this.confidenceConfig.domain_inference * synonymScore +
                (this.confidenceConfig.priority_boost[mapping.priority] || 0);
        }
        return this.confidenceConfig.default_fallback;
    }
    /**
     * Gestisce richieste multi-domain con routing strategy
     */
    handleMultiDomain(domains) {
        this.logger.debug('Handling multi-domain request', { domainCount: domains.length });
        if (domains.length === 0) {
            return this.createFallbackStrategy();
        }
        if (domains.length === 1) {
            return this.createSingleDomainStrategy(domains[0]);
        }
        return this.createMultiDomainStrategy(domains);
    }
    // =============================================================================
    // PRIVATE METHODS - TEXT PROCESSING
    // =============================================================================
    preprocessText(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, ' ') // Rimuove punteggiatura eccetto trattini
            .replace(/\s+/g, ' ') // Normalizza spazi
            .trim();
    }
    tokenizeText(text) {
        return text
            .split(/\s+/)
            .filter(token => token.length > 1) // Filtra token troppo corti
            .slice(0, 100); // Limite per performance
    }
    // =============================================================================
    // PRIVATE METHODS - KEYWORD EXTRACTION
    // =============================================================================
    extractExactMatches(text, _tokens) {
        const matches = [];
        for (const [domain, mapping] of this.keywordMappings.entries()) {
            mapping.keywords.forEach(keyword => {
                if (text.includes(keyword)) {
                    const position = text.indexOf(keyword);
                    matches.push({
                        text: keyword,
                        confidence: this.calculateConfidence(keyword, domain),
                        position,
                        length: keyword.length,
                        domain,
                        source: 'exact',
                        synonyms: this.synonymDictionary.get(keyword) || [],
                        context: this.extractContext(text, position, keyword.length),
                        matchType: 'direct'
                    });
                }
            });
        }
        return matches;
    }
    extractFuzzyMatches(text, tokens) {
        const matches = [];
        tokens.forEach((token, index) => {
            for (const [domain, mapping] of this.keywordMappings.entries()) {
                mapping.keywords.forEach(keyword => {
                    const similarity = this.calculateLevenshteinSimilarity(token, keyword);
                    if (similarity > 0.7 && similarity < 1.0) { // Esclude exact matches
                        matches.push({
                            text: token,
                            confidence: this.confidenceConfig.fuzzy_match * similarity,
                            position: text.indexOf(token),
                            length: token.length,
                            domain,
                            source: 'fuzzy',
                            synonyms: [],
                            context: this.extractTokenContext(tokens, index),
                            matchType: 'partial'
                        });
                    }
                });
            }
        });
        return matches;
    }
    extractContextualKeywords(text, _tokens) {
        const matches = [];
        // Context-based inference patterns
        const contextPatterns = [
            { pattern: /implement|create|build|develop/i, domain: 'implementation', boost: 0.3 },
            { pattern: /fix|debug|error|bug/i, domain: 'testing', boost: 0.4 },
            { pattern: /database|query|sql/i, domain: 'database', boost: 0.5 },
            { pattern: /ui|interface|gui|button/i, domain: 'gui', boost: 0.4 },
            { pattern: /security|auth|login/i, domain: 'security', boost: 0.6 }
        ];
        contextPatterns.forEach(({ pattern, domain, boost }) => {
            const match = text.match(pattern);
            if (match) {
                matches.push({
                    text: match[0],
                    confidence: this.confidenceConfig.context_clues + boost,
                    position: match.index || 0,
                    length: match[0].length,
                    domain,
                    source: 'context',
                    synonyms: [],
                    context: this.extractContext(text, match.index || 0, match[0].length),
                    matchType: 'inferred'
                });
            }
        });
        return matches;
    }
    // =============================================================================
    // PRIVATE METHODS - UTILITIES
    // =============================================================================
    deduplicateKeywords(keywords) {
        const seen = new Set();
        return keywords.filter(keyword => {
            const key = `${keyword.text}-${keyword.domain}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }
    rankKeywordsByConfidence(keywords) {
        return keywords.sort((a, b) => b.confidence - a.confidence);
    }
    calculateOverallConfidence(keywords) {
        if (keywords.length === 0)
            return 0;
        const avgConfidence = keywords.reduce((sum, k) => sum + k.confidence, 0) / keywords.length;
        const topKeywords = keywords.slice(0, 3); // Weight verso le top 3
        const topAvg = topKeywords.reduce((sum, k) => sum + k.confidence, 0) / topKeywords.length;
        return (avgConfidence * 0.4 + topAvg * 0.6); // Weighted average
    }
    extractContext(text, position, length) {
        const start = Math.max(0, position - 30);
        const end = Math.min(text.length, position + length + 30);
        return text.substring(start, end).trim();
    }
    extractTokenContext(tokens, index) {
        const start = Math.max(0, index - 3);
        const end = Math.min(tokens.length, index + 4);
        return tokens.slice(start, end).join(' ');
    }
    calculateLevenshteinSimilarity(a, b) {
        const distance = this.levenshteinDistance(a, b);
        const maxLength = Math.max(a.length, b.length);
        return 1 - (distance / maxLength);
    }
    levenshteinDistance(a, b) {
        const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
        for (let i = 0; i <= a.length; i++)
            matrix[0][i] = i;
        for (let j = 0; j <= b.length; j++)
            matrix[j][0] = j;
        for (let j = 1; j <= b.length; j++) {
            for (let i = 1; i <= a.length; i++) {
                const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + indicator);
            }
        }
        return matrix[b.length][a.length];
    }
    findMatchingDomains(keyword) {
        const matches = [];
        for (const [domain, mapping] of this.keywordMappings.entries()) {
            if (mapping.keywords.some(k => k.includes(keyword) || keyword.includes(k))) {
                matches.push(domain);
            }
        }
        return matches;
    }
    calculateFuzzyScore(keyword, domainKeywords) {
        let bestScore = 0;
        domainKeywords.forEach(domainKeyword => {
            const similarity = this.calculateLevenshteinSimilarity(keyword, domainKeyword);
            bestScore = Math.max(bestScore, similarity);
        });
        return bestScore;
    }
    calculateSynonymScore(keyword, domainKeywords) {
        const synonyms = this.synonymDictionary.get(keyword) || [];
        if (synonyms.length === 0)
            return 0;
        let bestScore = 0;
        synonyms.forEach(synonym => {
            if (domainKeywords.includes(synonym)) {
                bestScore = Math.max(bestScore, 0.8);
            }
        });
        return bestScore;
    }
    calculateDomainWeight(confidence, priority) {
        const priorityWeights = { 'CRITICA': 1.0, 'ALTA': 0.8, 'MEDIA': 0.6, 'BASSA': 0.4 };
        const priorityWeight = priorityWeights[priority] || 0.4;
        return confidence * priorityWeight;
    }
    // =============================================================================
    // PRIVATE METHODS - ROUTING STRATEGIES
    // =============================================================================
    createSingleDomainStrategy(domain) {
        return {
            primaryAgent: domain.suggestedAgent,
            primaryModel: domain.suggestedModel === 'auto' ? 'sonnet' : domain.suggestedModel,
            secondaryOptions: [],
            parallelExecution: false,
            dependencyOrder: [domain.suggestedAgent]
        };
    }
    createMultiDomainStrategy(domains) {
        const primary = domains[0];
        const secondaryOptions = domains.slice(1, 4).map(d => ({
            agent: d.suggestedAgent,
            model: d.suggestedModel === 'auto' ? 'sonnet' : d.suggestedModel,
            confidence: d.confidence
        }));
        return {
            primaryAgent: primary.suggestedAgent,
            primaryModel: primary.suggestedModel === 'auto' ? 'sonnet' : primary.suggestedModel,
            secondaryOptions,
            parallelExecution: true,
            dependencyOrder: domains.map(d => d.suggestedAgent)
        };
    }
    createFallbackStrategy() {
        return {
            primaryAgent: 'coder',
            primaryModel: 'haiku',
            secondaryOptions: [
                { agent: 'analyzer', model: 'haiku', confidence: 0.1 }
            ],
            parallelExecution: false,
            dependencyOrder: ['coder']
        };
    }
    // =============================================================================
    // INITIALIZATION
    // =============================================================================
    initializeKeywordMappings() {
        // Load from config/keyword-mappings.json
        // This would typically load from the actual config file
        // For now, using the mappings from the config structure
        const mappings = [
            { domain: 'gui', keywords: ['gui', 'pyqt5', 'qt', 'widget', 'dialog', 'ui', 'interface'], priority: 'ALTA', agent: 'gui-super-expert', model: 'sonnet' },
            { domain: 'testing', keywords: ['test', 'debug', 'bug', 'qa', 'quality'], priority: 'ALTA', agent: 'tester_expert', model: 'sonnet' },
            { domain: 'database', keywords: ['database', 'sql', 'sqlite', 'query'], priority: 'ALTA', agent: 'database_expert', model: 'sonnet' },
            { domain: 'security', keywords: ['security', 'auth', 'encryption'], priority: 'CRITICA', agent: 'security_unified_expert', model: 'sonnet' },
            { domain: 'architecture', keywords: ['architecture', 'design', 'pattern'], priority: 'ALTA', agent: 'architect_expert', model: 'opus' },
            { domain: 'implementation', keywords: ['implement', 'code', 'develop'], priority: 'MEDIA', agent: 'coder', model: 'sonnet' }
        ];
        mappings.forEach(mapping => {
            this.keywordMappings.set(mapping.domain, {
                domain: mapping.domain,
                keywords: mapping.keywords,
                priority: mapping.priority,
                agent: mapping.agent,
                model: mapping.model
            });
        });
        this.logger.debug('Keyword mappings initialized', { count: this.keywordMappings.size });
    }
    initializeSynonymDictionary() {
        // Basic synonym dictionary
        const synonyms = {
            'create': ['build', 'develop', 'implement', 'generate'],
            'fix': ['repair', 'debug', 'resolve', 'solve'],
            'test': ['check', 'validate', 'verify', 'qa'],
            'gui': ['ui', 'interface', 'frontend', 'view'],
            'database': ['db', 'storage', 'persistence', 'data']
        };
        Object.entries(synonyms).forEach(([word, syns]) => {
            this.synonymDictionary.set(word, syns);
            // Add reverse mappings
            syns.forEach(syn => {
                const existing = this.synonymDictionary.get(syn) || [];
                if (!existing.includes(word)) {
                    this.synonymDictionary.set(syn, [...existing, word]);
                }
            });
        });
        this.logger.debug('Synonym dictionary initialized', { entries: this.synonymDictionary.size });
    }
}
exports.KeywordExtractor = KeywordExtractor;
// =============================================================================
// FACTORY FUNCTION
// =============================================================================
function createKeywordExtractor(config) {
    return new KeywordExtractor(config);
}
exports.createKeywordExtractor = createKeywordExtractor;
//# sourceMappingURL=KeywordExtractor.js.map