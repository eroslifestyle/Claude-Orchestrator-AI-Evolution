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
import type { ExtractedKeyword, KeywordExtractionResult, ClassifiedDomain } from './types';
import type { PluginConfig } from '../types';
interface RoutingStrategy {
    primaryAgent: string;
    primaryModel: 'haiku' | 'sonnet' | 'opus' | 'auto';
    secondaryOptions: Array<{
        agent: string;
        model: 'haiku' | 'sonnet' | 'opus' | 'auto';
        confidence: number;
    }>;
    parallelExecution: boolean;
    dependencyOrder?: string[];
}
export declare class KeywordExtractor {
    private logger;
    private keywordMappings;
    private confidenceConfig;
    private synonymDictionary;
    constructor(_config: PluginConfig);
    /**
     * Estrae keywords da una richiesta utente con confidence scoring
     */
    extractKeywords(request: string): Promise<KeywordExtractionResult>;
    /**
     * Rileva domini da keywords estratte
     */
    detectDomains(keywords: ExtractedKeyword[]): Promise<ClassifiedDomain[]>;
    /**
     * Calcola confidence score per keyword-domain pair
     */
    calculateConfidence(keyword: string, domain: string): number;
    /**
     * Gestisce richieste multi-domain con routing strategy
     */
    handleMultiDomain(domains: ClassifiedDomain[]): RoutingStrategy;
    private preprocessText;
    private tokenizeText;
    private extractExactMatches;
    private extractFuzzyMatches;
    private extractContextualKeywords;
    private deduplicateKeywords;
    private rankKeywordsByConfidence;
    private calculateOverallConfidence;
    private extractContext;
    private extractTokenContext;
    private calculateLevenshteinSimilarity;
    private levenshteinDistance;
    private findMatchingDomains;
    private calculateFuzzyScore;
    private calculateSynonymScore;
    private calculateDomainWeight;
    private createSingleDomainStrategy;
    private createMultiDomainStrategy;
    private createFallbackStrategy;
    private initializeKeywordMappings;
    private initializeSynonymDictionary;
}
export declare function createKeywordExtractor(config: PluginConfig): KeywordExtractor;
export type { RoutingStrategy };
//# sourceMappingURL=KeywordExtractor.d.ts.map