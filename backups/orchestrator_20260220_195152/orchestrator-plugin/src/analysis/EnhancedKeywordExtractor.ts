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

import type {
  ExtractedKeyword,
  KeywordExtractionResult
} from './types';

import type { PluginConfig, ModelType } from '../types';
import type { ComplexityLevel, DomainClassificationResult } from './types';
import { PluginLogger } from '../utils/logger';

import {
  SerenaSearchIntegration,
  SerenaSearchResult,
  SerenaEnhancedKeywords
} from '../integrations/SerenaSearchIntegration';

// =============================================================================
// ENHANCED INTERFACES & TYPES
// =============================================================================

export interface SemanticKeywordAnalysis {
  keyword: string;
  semanticWeight: number;              // 0.0 to 1.0 semantic importance
  contextualRelevance: number;         // 0.0 to 1.0 context relevance
  codebaseFrequency: number;           // Usage frequency in codebase
  domainSpecificity: number;           // How domain-specific the keyword is
  aiConfidence: number;                // AI model confidence in classification
}

export interface CodePatternMatch {
  pattern: string;                     // Regex pattern matched
  location: string;                    // File path where found
  lineNumber: number;                  // Line number in file
  context: string;                     // Surrounding code context
  patternType: 'class' | 'function' | 'variable' | 'import' | 'interface';
  confidence: number;                  // Pattern match confidence
}

export interface IntelligentExtractionContext {
  searchResults: SerenaSearchResult[];    // Serena search results
  semanticAnalysis: SemanticKeywordAnalysis[];  // AI semantic analysis
  patternMatches: CodePatternMatch[];     // Code pattern matches
  crossFileReferences: CrossFileReference[]; // Cross-file dependencies
  contextualHints: ContextualHint[];      // Context-based insights
}

export interface CrossFileReference {
  sourceFile: string;                  // File containing reference
  targetFile: string;                  // File being referenced
  referenceType: 'import' | 'dependency' | 'call' | 'inheritance';
  strength: number;                    // 0.0 to 1.0 reference strength
  lineNumber: number;                  // Line number of reference
}

export interface ContextualHint {
  type: 'naming_convention' | 'architectural_pattern' | 'domain_knowledge';
  description: string;                 // Description of the hint
  confidence: number;                  // Confidence in the hint
  impact: 'high' | 'medium' | 'low';   // Impact on routing decisions
}

export interface EnhancedDomainClassification {
  domain: string;                      // Domain name
  confidence: number;                  // Overall domain confidence
  keywords: ExtractedKeyword[];        // Keywords supporting this domain
  codeEvidence: CodePatternMatch[];    // Code patterns supporting domain
  semanticScore: number;               // AI semantic classification score
  architecturalHints: string[];        // Architectural pattern hints
  recommendedAgent: string;            // Best agent for this domain
  recommendedModel: ModelType;         // Best model for complexity
  estimatedComplexity: ComplexityLevel; // Estimated task complexity
}

// =============================================================================
// ENHANCED KEYWORD EXTRACTOR CLASS
// =============================================================================

export class EnhancedKeywordExtractor {
  private serenaIntegration: SerenaSearchIntegration;
  private domainMappings: Map<string, string[]>;
  private semanticCache: Map<string, SemanticKeywordAnalysis[]>;
  private patternCache: Map<string, CodePatternMatch[]>;

  constructor(
    _config: PluginConfig,
    private logger: PluginLogger,
    serenaIntegration: SerenaSearchIntegration
  ) {
    this.serenaIntegration = serenaIntegration;
    this.domainMappings = this.initializeDomainMappings();
    this.semanticCache = new Map();
    this.patternCache = new Map();
  }

  // =============================================================================
  // ENHANCED KEYWORD EXTRACTION WITH SERENA
  // =============================================================================

  /**
   * Revolutionary keyword extraction con Serena search intelligence
   */
  async extractKeywordsEnhanced(
    userInput: string,
    codebaseContext?: string
  ): Promise<KeywordExtractionResult> {
    const startTime = Date.now();

    try {
      // 1. Traditional keyword extraction as baseline
      const baseKeywords = this.extractBaseKeywords(userInput);

      // 2. Enhance keywords using Serena search capabilities
      const enhancedKeywords = await this.serenaIntegration.enhanceKeywords(
        baseKeywords.map(k => k.text)
      );

      // 3. Perform intelligent codebase analysis
      const searchContext = await this.analyzeCodebaseContext(
        enhancedKeywords,
        codebaseContext
      );

      // 4. Semantic analysis with AI intelligence
      const semanticAnalysis = await this.performSemanticAnalysis(
        enhancedKeywords,
        searchContext
      );

      // 5. Advanced domain classification
      const domainClassification = this.classifyDomainsEnhanced(
        semanticAnalysis,
        searchContext
      );

      // 6. Confidence scoring with multiple signals
      const finalKeywords = this.calculateEnhancedConfidence(
        baseKeywords,
        semanticAnalysis,
        searchContext
      );

      const result: KeywordExtractionResult = {
        keywords: finalKeywords,
        tier: 'smart',
        processingTimeMs: Date.now() - startTime,
        overallConfidence: domainClassification.overallConfidence,
        metadata: {
          inputText: userInput,
          tokens: [],
          tierAttempts: ['smart'],
          cacheHit: false,
          stats: {
            totalTokens: 0,
            uniqueTokens: 0,
            keywordsFound: finalKeywords.length,
            averageConfidence: domainClassification.overallConfidence
          }
        }
      };

      // Cache results for performance
      this.cacheAnalysisResults(userInput, semanticAnalysis, searchContext);

      return result;

    } catch (error) {
      this.logger.warn(`Enhanced keyword extraction failed: ${error instanceof Error ? error.message : String(error)}`);

      // Fallback to traditional extraction
      return this.extractKeywordsTraditional(userInput);
    }
  }

  /**
   * Analyze codebase context using Serena search intelligence
   */
  private async analyzeCodebaseContext(
    enhancedKeywords: SerenaEnhancedKeywords[],
    _codebaseContext?: string
  ): Promise<IntelligentExtractionContext> {
    const searchResults: SerenaSearchResult[] = [];
    const patternMatches: CodePatternMatch[] = [];
    const crossFileReferences: CrossFileReference[] = [];

    // Perform parallel searches for enhanced patterns
    const searchPromises = enhancedKeywords.flatMap(keyword =>
      keyword.patterns.map(pattern =>
        this.serenaIntegration.search({
          pattern: pattern,
          restrictToCodeFiles: true,
          contextLinesAfter: 2,
          contextLinesBefore: 2,
          maxAnswerChars: 10000
        })
      )
    );

    const allResults = await Promise.allSettled(searchPromises);

    allResults.forEach(result => {
      if (result.status === 'fulfilled') {
        searchResults.push(result.value);
        patternMatches.push(...this.extractPatternMatches(result.value));
      }
    });

    // Analyze cross-file dependencies
    crossFileReferences.push(...await this.analyzeCrossFileReferences(searchResults));

    // Generate contextual hints
    const contextualHints = this.generateContextualHints(patternMatches, crossFileReferences);

    return {
      searchResults,
      semanticAnalysis: [], // Will be filled in next step
      patternMatches,
      crossFileReferences,
      contextualHints
    };
  }

  /**
   * Advanced semantic analysis con AI intelligence
   */
  private async performSemanticAnalysis(
    enhancedKeywords: SerenaEnhancedKeywords[],
    _context: IntelligentExtractionContext
  ): Promise<SemanticKeywordAnalysis[]> {
    const semanticAnalysis: SemanticKeywordAnalysis[] = [];

    for (const keyword of enhancedKeywords) {
      // Calculate semantic metrics
      const semanticWeight = this.calculateSemanticWeight(keyword, _context);
      const contextualRelevance = this.calculateContextualRelevance(keyword, _context);
      const codebaseFrequency = this.calculateCodebaseFrequency(keyword, _context);
      const domainSpecificity = this.calculateDomainSpecificity(keyword);
      const aiConfidence = keyword.confidence;

      const analysis: SemanticKeywordAnalysis = {
        keyword: keyword.original,
        semanticWeight,
        contextualRelevance,
        codebaseFrequency,
        domainSpecificity,
        aiConfidence
      };

      semanticAnalysis.push(analysis);
    }

    // Update context with semantic analysis
    _context.semanticAnalysis = semanticAnalysis;

    return semanticAnalysis;
  }

  /**
   * Enhanced domain classification con multiple intelligence signals
   */
  private classifyDomainsEnhanced(
    semanticAnalysis: SemanticKeywordAnalysis[],
    context: IntelligentExtractionContext
  ): DomainClassificationResult {
    const domainScores = new Map<string, number>();
    const domainEvidence = new Map<string, {
      keywords: ExtractedKeyword[];
      patterns: CodePatternMatch[];
      confidence: number;
    }>();

    // Score domains based on semantic analysis
    for (const analysis of semanticAnalysis) {
      const domains = this.getKeywordDomains(analysis.keyword);

      for (const domain of domains) {
        const currentScore = domainScores.get(domain) || 0;
        const weightedScore = analysis.semanticWeight * analysis.contextualRelevance * analysis.domainSpecificity;
        domainScores.set(domain, currentScore + weightedScore);

        // Collect evidence for domain
        if (!domainEvidence.has(domain)) {
          domainEvidence.set(domain, {
            keywords: [],
            patterns: [],
            confidence: 0
          });
        }

        const evidence = domainEvidence.get(domain)!;
        evidence.keywords.push({
          text: analysis.keyword,
          confidence: analysis.aiConfidence,
          position: 0,
          length: analysis.keyword.length,
          domain: domain,
          source: 'llm_context' as const,
          synonyms: [],
          context: '',
          matchType: 'direct' as const
        });
        evidence.confidence = Math.max(evidence.confidence, analysis.aiConfidence);
      }
    }

    // Enhance scoring with code pattern evidence
    for (const pattern of context.patternMatches) {
      const domains = this.getPatternDomains(pattern);

      for (const domain of domains) {
        const currentScore = domainScores.get(domain) || 0;
        domainScores.set(domain, currentScore + (pattern.confidence * 0.5));

        const evidence = domainEvidence.get(domain);
        if (evidence) {
          evidence.patterns.push(pattern);
        }
      }
    }

    // Sort domains by score
    const sortedDomains = Array.from(domainScores.entries())
      .sort(([,a], [,b]) => b - a);

    const primaryDomain = sortedDomains[0]?.[0] || 'general';
    const secondaryDomains = sortedDomains.slice(1, 4).map(([domain]) => domain);

    // Calculate overall confidence
    const totalScore = Array.from(domainScores.values()).reduce((sum, score) => sum + score, 0);
    const primaryScore = domainScores.get(primaryDomain) || 0;
    const overallConfidence = totalScore > 0 ? primaryScore / totalScore : 0;

    return {
      primaryDomain: {
        name: primaryDomain,
        confidence: overallConfidence,
        matchedKeywords: [],
        suggestedAgent: 'experts/general_expert.md',
        suggestedModel: 'sonnet',
        priority: 'MEDIA',
        weight: 1.0
      },
      secondaryDomains: secondaryDomains.map(domain => ({
        name: domain,
        confidence: domainScores.get(domain) || 0,
        matchedKeywords: [],
        suggestedAgent: 'experts/general_expert.md',
        suggestedModel: 'sonnet',
        priority: 'MEDIA',
        weight: 1.0
      })),
      isMultiDomain: secondaryDomains.length > 0,
      overallConfidence,
      tier: 'smart',
      processingTimeMs: 0,
      metadata: {
        algorithm: 'llm-analysis',
        thresholds: {
          primaryDomainMin: 0.5,
          multiDomainThreshold: 0.3,
          confidenceMin: 0.1
        },
        conflicts: []
      }
    };
  }

  // =============================================================================
  // INTELLIGENCE CALCULATION METHODS
  // =============================================================================

  private calculateSemanticWeight(
    keyword: SerenaEnhancedKeywords,
    context: IntelligentExtractionContext
  ): number {
    let weight = 0.5; // Base weight

    // Boost based on semantic expansions
    if (keyword.semanticExpansions.length > 2) weight += 0.2;

    // Boost based on code pattern matches
    const patternMatches = context.patternMatches.filter(p =>
      keyword.patterns.some(pattern => p.pattern.includes(keyword.original))
    );
    weight += patternMatches.length * 0.1;

    // Boost based on confidence
    weight += keyword.confidence * 0.3;

    return Math.min(1.0, weight);
  }

  private calculateContextualRelevance(
    keyword: SerenaEnhancedKeywords,
    context: IntelligentExtractionContext
  ): number {
    let relevance = 0.6; // Base relevance

    // Check for contextual hints
    const relevantHints = context.contextualHints.filter(hint =>
      hint.description.toLowerCase().includes(keyword.original.toLowerCase())
    );

    relevance += relevantHints.length * 0.2;

    // Check for cross-file references
    const references = context.crossFileReferences.filter(ref =>
      ref.sourceFile.includes(keyword.original) || ref.targetFile.includes(keyword.original)
    );

    relevance += references.length * 0.1;

    return Math.min(1.0, relevance);
  }

  private calculateCodebaseFrequency(
    keyword: SerenaEnhancedKeywords,
    context: IntelligentExtractionContext
  ): number {
    const totalMatches = context.searchResults.reduce(
      (sum, result) => sum + result.totalMatches, 0
    );

    const keywordMatches = context.searchResults
      .filter(result => result.pattern.includes(keyword.original))
      .reduce((sum, result) => sum + result.totalMatches, 0);

    return totalMatches > 0 ? keywordMatches / totalMatches : 0;
  }

  private calculateDomainSpecificity(keyword: SerenaEnhancedKeywords): number {
    const domains = this.getKeywordDomains(keyword.original);

    // More specific if keyword maps to fewer domains
    if (domains.length === 1) return 1.0;
    if (domains.length === 2) return 0.8;
    if (domains.length === 3) return 0.6;

    return 0.4;
  }

  private calculateEnhancedConfidence(
    baseKeywords: ExtractedKeyword[],
    semanticAnalysis: SemanticKeywordAnalysis[],
    _context: IntelligentExtractionContext
  ): ExtractedKeyword[] {
    return baseKeywords.map(keyword => {
      const semantic = semanticAnalysis.find(s => s.keyword === keyword.text);

      if (semantic) {
        // Enhanced confidence calculation using multiple signals
        const combinedConfidence =
          (keyword.confidence * 0.3) +
          (semantic.semanticWeight * 0.25) +
          (semantic.contextualRelevance * 0.25) +
          (semantic.codebaseFrequency * 0.2);

        return {
          ...keyword,
          confidence: Math.min(1.0, combinedConfidence)
        };
      }

      return keyword;
    });
  }

  // =============================================================================
  // PATTERN ANALYSIS METHODS
  // =============================================================================

  private extractPatternMatches(_searchResult: SerenaSearchResult): CodePatternMatch[] {
    const patterns: CodePatternMatch[] = [];

    for (const match of _searchResult.matches) {
      const patternType = this.determinePatternType(match.matchingLine);

      patterns.push({
        pattern: _searchResult.pattern,
        location: match.filePath,
        lineNumber: match.lineNumber,
        context: match.contextBefore.concat([match.matchingLine], match.contextAfter).join('\n'),
        patternType,
        confidence: match.confidence
      });
    }

    return patterns;
  }

  private determinePatternType(_line: string): 'class' | 'function' | 'variable' | 'import' | 'interface' {
    const line = _line.toLowerCase();
    if (line.includes('class ')) return 'class';
    if (line.includes('interface ')) return 'interface';
    if (line.includes('function ') || line.includes(' => ')) return 'function';
    if (line.includes('import ')) return 'import';
    return 'variable';
  }

  private async analyzeCrossFileReferences(
    searchResults: SerenaSearchResult[]
  ): Promise<CrossFileReference[]> {
    const references: CrossFileReference[] = [];

    // Analyze import patterns
    const importSearches = await this.serenaIntegration.batchSearch([
      { pattern: 'import.*from.*[\'"]', restrictToCodeFiles: true },
      { pattern: 'require\\(.*[\'"]', restrictToCodeFiles: true },
      { pattern: 'import\\s*\\{.*\\}', restrictToCodeFiles: true }
    ]);

    for (const result of importSearches) {
      for (const match of result.matches) {
        const ref = this.parseImportReference(match.matchingLine, match.filePath, match.lineNumber);
        if (ref) references.push(ref);
      }
    }

    return references;
  }

  private parseImportReference(line: string, sourceFile: string, lineNumber: number): CrossFileReference | null {
    // Parse import statements to extract dependencies
    const importMatch = line.match(/import.*from\s*['"]([^'"]+)['"]/);
    const requireMatch = line.match(/require\(['"]([^'"]+)['"]\)/);

    const targetFile = importMatch?.[1] || requireMatch?.[1];

    if (targetFile) {
      return {
        sourceFile,
        targetFile,
        referenceType: importMatch ? 'import' : 'dependency',
        strength: 0.8,
        lineNumber
      };
    }

    return null;
  }

  private generateContextualHints(
    patternMatches: CodePatternMatch[],
    crossFileReferences: CrossFileReference[]
  ): ContextualHint[] {
    const hints: ContextualHint[] = [];

    // Analyze naming conventions
    const namingPatterns = this.analyzeNamingConventions(patternMatches);
    if (namingPatterns.length > 0) {
      hints.push({
        type: 'naming_convention',
        description: `Detected naming patterns: ${namingPatterns.join(', ')}`,
        confidence: 0.7,
        impact: 'medium'
      });
    }

    // Analyze architectural patterns
    const archPatterns = this.analyzeArchitecturalPatterns(crossFileReferences);
    if (archPatterns.length > 0) {
      hints.push({
        type: 'architectural_pattern',
        description: `Detected architectural patterns: ${archPatterns.join(', ')}`,
        confidence: 0.8,
        impact: 'high'
      });
    }

    return hints;
  }

  // =============================================================================
  // DOMAIN MAPPING & UTILITY METHODS
  // =============================================================================

  private initializeDomainMappings(): Map<string, string[]> {
    const mappings = new Map<string, string[]>();

    mappings.set('gui', ['interface', 'ui', 'widget', 'dialog', 'window', 'form']);
    mappings.set('database', ['sql', 'query', 'table', 'schema', 'migration']);
    mappings.set('api', ['endpoint', 'request', 'response', 'http', 'rest']);
    mappings.set('testing', ['test', 'spec', 'mock', 'assert', 'expect']);
    mappings.set('security', ['auth', 'token', 'encryption', 'hash', 'secure']);
    mappings.set('performance', ['optimize', 'cache', 'fast', 'memory', 'cpu']);

    return mappings;
  }

  private getKeywordDomains(keyword: string): string[] {
    const domains: string[] = [];
    const lowerKeyword = keyword.toLowerCase();

    Array.from(this.domainMappings.entries()).forEach(([domain, keywords]) => {
      if (keywords.some(k => lowerKeyword.includes(k) || k.includes(lowerKeyword))) {
        domains.push(domain);
      }
    });

    return domains.length > 0 ? domains : ['general'];
  }

  private getPatternDomains(pattern: CodePatternMatch): string[] {
    const domains: string[] = [];

    if (pattern.patternType === 'class' || pattern.patternType === 'interface') {
      domains.push('architecture');
    }
    if (pattern.location.includes('test')) {
      domains.push('testing');
    }
    if (pattern.location.includes('api') || pattern.location.includes('service')) {
      domains.push('api');
    }

    return domains.length > 0 ? domains : ['general'];
  }

  private analyzeNamingConventions(patterns: CodePatternMatch[]): string[] {
    const conventions: string[] = [];

    const hasSnakeCase = patterns.some(p => p.context.includes('_'));
    const hasCamelCase = patterns.some(p => /[a-z][A-Z]/.test(p.context));
    const hasPascalCase = patterns.some(p => /^[A-Z]/.test(p.context.trim()));

    if (hasSnakeCase) conventions.push('snake_case');
    if (hasCamelCase) conventions.push('camelCase');
    if (hasPascalCase) conventions.push('PascalCase');

    return conventions;
  }

  private analyzeArchitecturalPatterns(references: CrossFileReference[]): string[] {
    const patterns: string[] = [];

    const hasServicePattern = references.some(ref => ref.targetFile.includes('service'));
    const hasComponentPattern = references.some(ref => ref.targetFile.includes('component'));
    const hasUtilPattern = references.some(ref => ref.targetFile.includes('util'));

    if (hasServicePattern) patterns.push('Service Layer');
    if (hasComponentPattern) patterns.push('Component Architecture');
    if (hasUtilPattern) patterns.push('Utility Pattern');

    return patterns;
  }

  private generateDomainDetails(
    domainEvidence: Map<string, { keywords: ExtractedKeyword[], patterns: CodePatternMatch[], confidence: number }>
  ): Record<string, any> {
    const details: Record<string, any> = {};

    Array.from(domainEvidence.entries()).forEach(([domain, evidence]) => {
      details[domain] = {
        keywordCount: evidence.keywords.length,
        patternCount: evidence.patterns.length,
        confidence: evidence.confidence,
        evidence: {
          topKeywords: evidence.keywords.slice(0, 5),
          codePatterns: evidence.patterns.slice(0, 3).map(p => p.patternType)
        }
      };
    });

    return details;
  }

  // =============================================================================
  // FALLBACK & CACHING METHODS
  // =============================================================================

  private extractKeywordsTraditional(userInput: string): KeywordExtractionResult {
    // Fallback to traditional keyword extraction without Serena
    const keywords = this.extractBaseKeywords(userInput);

    return {
      keywords,
      tier: 'fast',
      processingTimeMs: 50,
      overallConfidence: 0.6,
      metadata: {
        inputText: userInput,
        tokens: [],
        tierAttempts: ['fast'],
        cacheHit: false,
        stats: {
          totalTokens: 0,
          uniqueTokens: 0,
          keywordsFound: keywords.length,
          averageConfidence: 0.6
        }
      }
    };
  }

  private extractBaseKeywords(userInput: string): ExtractedKeyword[] {
    // Basic keyword extraction implementation
    const words = userInput.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);

    return words.map(word => ({
      text: word,
      confidence: 0.7,
      position: 0,
      length: word.length,
      domain: this.getKeywordDomains(word)[0] || 'general',
      source: 'exact' as const,
      synonyms: [],
      context: userInput,
      matchType: 'direct' as const
    }));
  }

  private cacheAnalysisResults(
    userInput: string,
    semanticAnalysis: SemanticKeywordAnalysis[],
    context: IntelligentExtractionContext
  ): void {
    const cacheKey = this.generateCacheKey(userInput);

    this.semanticCache.set(cacheKey, semanticAnalysis);
    this.patternCache.set(cacheKey, context.patternMatches);

    // Cleanup old cache entries
    if (this.semanticCache.size > 100) {
      const firstKey = this.semanticCache.keys().next().value;
      this.semanticCache.delete(firstKey);
    }

    if (this.patternCache.size > 100) {
      const firstKey = this.patternCache.keys().next().value;
      this.patternCache.delete(firstKey);
    }
  }

  private generateCacheKey(userInput: string): string {
    return userInput.toLowerCase().replace(/[^\w]/g, '').slice(0, 50);
  }

  // =============================================================================
  // PUBLIC API METHODS
  // =============================================================================

  public async getSemanticInsights(userInput: string): Promise<SemanticKeywordAnalysis[]> {
    const cacheKey = this.generateCacheKey(userInput);

    if (this.semanticCache.has(cacheKey)) {
      return this.semanticCache.get(cacheKey)!;
    }

    // Perform fresh analysis
    await this.extractKeywordsEnhanced(userInput);
    return this.semanticCache.get(cacheKey) || [];
  }

  public async getCodebaseInsights(userInput: string): Promise<CodePatternMatch[]> {
    const cacheKey = this.generateCacheKey(userInput);

    if (this.patternCache.has(cacheKey)) {
      return this.patternCache.get(cacheKey)!;
    }

    // Perform fresh analysis
    await this.extractKeywordsEnhanced(userInput);
    return this.patternCache.get(cacheKey) || [];
  }

  public clearCache(): void {
    this.semanticCache.clear();
    this.patternCache.clear();
    this.logger.info('Enhanced KeywordExtractor cache cleared');
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

export function createEnhancedKeywordExtractor(
  config: PluginConfig,
  logger: PluginLogger,
  serenaIntegration: SerenaSearchIntegration
): EnhancedKeywordExtractor {
  return new EnhancedKeywordExtractor(config, logger, serenaIntegration);
}

// =============================================================================
// EXPORT TYPES
// =============================================================================
// All interfaces are already exported with 'export interface' declarations