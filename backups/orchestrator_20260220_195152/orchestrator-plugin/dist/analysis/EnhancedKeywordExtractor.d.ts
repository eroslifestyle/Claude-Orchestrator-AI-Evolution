/**
 * EnhancedKeywordExtractor - AI-Powered Keyword Analysis con Serena Integration
 *
 * Implementazione AI Integration Expert con revolutionary search capabilities
 * per semantic understanding e pattern-based intelligence nel Orchestrator.
 *
 * @version 2.0 - Serena Integration Enhancement
 * @author AI Integration Expert Agent (T2)
 * @date 30 Gennaio 2026
 */
import type { ExtractedKeyword, KeywordExtractionResult } from './types';
import type { PluginConfig, ModelType } from '../types';
import type { ComplexityLevel } from './types';
import { PluginLogger } from '../utils/logger';
import { SerenaSearchIntegration, SerenaSearchResult } from '../integrations/SerenaSearchIntegration';
export interface SemanticKeywordAnalysis {
    keyword: string;
    semanticWeight: number;
    contextualRelevance: number;
    codebaseFrequency: number;
    domainSpecificity: number;
    aiConfidence: number;
}
export interface CodePatternMatch {
    pattern: string;
    location: string;
    lineNumber: number;
    context: string;
    patternType: 'class' | 'function' | 'variable' | 'import' | 'interface';
    confidence: number;
}
export interface IntelligentExtractionContext {
    searchResults: SerenaSearchResult[];
    semanticAnalysis: SemanticKeywordAnalysis[];
    patternMatches: CodePatternMatch[];
    crossFileReferences: CrossFileReference[];
    contextualHints: ContextualHint[];
}
export interface CrossFileReference {
    sourceFile: string;
    targetFile: string;
    referenceType: 'import' | 'dependency' | 'call' | 'inheritance';
    strength: number;
    lineNumber: number;
}
export interface ContextualHint {
    type: 'naming_convention' | 'architectural_pattern' | 'domain_knowledge';
    description: string;
    confidence: number;
    impact: 'high' | 'medium' | 'low';
}
export interface EnhancedDomainClassification {
    domain: string;
    confidence: number;
    keywords: ExtractedKeyword[];
    codeEvidence: CodePatternMatch[];
    semanticScore: number;
    architecturalHints: string[];
    recommendedAgent: string;
    recommendedModel: ModelType;
    estimatedComplexity: ComplexityLevel;
}
export declare class EnhancedKeywordExtractor {
    private logger;
    private serenaIntegration;
    private domainMappings;
    private semanticCache;
    private patternCache;
    constructor(_config: PluginConfig, logger: PluginLogger, serenaIntegration: SerenaSearchIntegration);
    /**
     * Revolutionary keyword extraction con Serena search intelligence
     */
    extractKeywordsEnhanced(userInput: string, codebaseContext?: string): Promise<KeywordExtractionResult>;
    /**
     * Analyze codebase context using Serena search intelligence
     */
    private analyzeCodebaseContext;
    /**
     * Advanced semantic analysis con AI intelligence
     */
    private performSemanticAnalysis;
    /**
     * Enhanced domain classification con multiple intelligence signals
     */
    private classifyDomainsEnhanced;
    private calculateSemanticWeight;
    private calculateContextualRelevance;
    private calculateCodebaseFrequency;
    private calculateDomainSpecificity;
    private calculateEnhancedConfidence;
    private extractPatternMatches;
    private determinePatternType;
    private analyzeCrossFileReferences;
    private parseImportReference;
    private generateContextualHints;
    private initializeDomainMappings;
    private getKeywordDomains;
    private getPatternDomains;
    private analyzeNamingConventions;
    private analyzeArchitecturalPatterns;
    private generateDomainDetails;
    private extractKeywordsTraditional;
    private extractBaseKeywords;
    private cacheAnalysisResults;
    private generateCacheKey;
    getSemanticInsights(userInput: string): Promise<SemanticKeywordAnalysis[]>;
    getCodebaseInsights(userInput: string): Promise<CodePatternMatch[]>;
    clearCache(): void;
}
export declare function createEnhancedKeywordExtractor(config: PluginConfig, logger: PluginLogger, serenaIntegration: SerenaSearchIntegration): EnhancedKeywordExtractor;
//# sourceMappingURL=EnhancedKeywordExtractor.d.ts.map