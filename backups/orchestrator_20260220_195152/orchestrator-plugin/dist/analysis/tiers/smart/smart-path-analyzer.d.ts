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
import { KeywordExtractionResult, GracefulPromise } from '../../types';
interface SmartPathInternalConfig {
    enabled: boolean;
    timeoutMs: number;
    confidenceThreshold: number;
    maxInputLength: number;
    enableSynonyms: boolean;
    enablePhrases: boolean;
    enableContextRules: boolean;
    synonymMaxDepth: number;
    phraseMaxLength: number;
    contextWindow: number;
    fuzzyDistanceMax: number;
}
interface SmartPathMetrics {
    synonymMatches: number;
    phraseMatches: number;
    contextRuleMatches: number;
    fuzzyMatches: number;
    averageProcessingTime: number;
    cacheHitRate: number;
    memoryUsageMB: number;
    synonymDictSize: number;
    phrasePatternCount: number;
    contextRuleCount: number;
}
export declare class SmartPathAnalyzer {
    private config;
    private confidenceScorer;
    private keywordCache;
    private synonymMappings;
    private phrasePatterns;
    private contextRules;
    private metrics;
    private startupTime;
    constructor(config?: Partial<SmartPathInternalConfig>);
    /**
     * Analizza testo con Smart Path (Tier 2)
     * Target: <50ms, confidence >0.6, 95% coverage
     */
    analyze(text: string): GracefulPromise<KeywordExtractionResult>;
    /**
     * Check se Smart Path può gestire questa richiesta
     */
    canHandle(text: string): boolean;
    /**
     * Get comprehensive metrics
     */
    getMetrics(): SmartPathMetrics;
    /**
     * Core Smart Path extraction con synonym, phrase, context
     */
    private extractKeywordsSmart;
    /**
     * Extract synonym matches
     */
    private extractSynonymMatches;
    /**
     * Extract phrase pattern matches
     */
    private extractPhraseMatches;
    /**
     * Extract context rule matches
     */
    private extractContextMatches;
    /**
     * Extract fuzzy matches per missed keywords
     */
    private extractFuzzyMatches;
    /**
     * Tokenize text in words
     */
    private tokenizeText;
    /**
     * Find word in text con position
     */
    private findWordInText;
    /**
     * Find phrase pattern in text
     */
    private findPhraseInText;
    /**
     * Extract context window around position
     */
    private extractContextWindow;
    /**
     * Calculate Levenshtein distance per fuzzy matching
     */
    private calculateLevenshteinDistance;
    /**
     * Find domain per keyword
     */
    private findDomainForKeyword;
    /**
     * Create keyword from match data
     */
    private createKeywordFromMatch;
    /**
     * Check context amplifiers per domain
     */
    private hasContextAmplifiers;
    /**
     * Deduplicate keywords e final scoring
     */
    private deduplicateAndScore;
    /**
     * Quick confidence estimation
     */
    private getQuickConfidenceScore;
    /**
     * Load synonym mappings (placeholder per MVP)
     */
    private loadSynonymMappings;
    /**
     * Load phrase patterns (placeholder per MVP)
     */
    private loadPhrasePatterns;
    /**
     * Load context rules (placeholder per MVP)
     */
    private loadContextRules;
    /**
     * Preprocess input text
     */
    private preprocessText;
    /**
     * Validate input
     */
    private isValidInput;
    /**
     * Update metrics
     */
    private updateMetrics;
    /**
     * Build extraction result
     */
    private buildExtractionResult;
    /**
     * Create success result
     */
    private createSuccessResult;
    /**
     * Create error result
     */
    private createErrorResult;
}
export type { SmartPathInternalConfig as SmartPathConfig, SmartPathMetrics };
//# sourceMappingURL=smart-path-analyzer.d.ts.map