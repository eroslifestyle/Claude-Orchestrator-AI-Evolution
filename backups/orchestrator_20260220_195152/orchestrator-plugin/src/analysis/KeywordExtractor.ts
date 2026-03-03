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

import type {
  ExtractedKeyword,
  KeywordExtractionResult,
  ClassifiedDomain
} from './types';

import type { PluginConfig } from '../types';
import { PluginLogger } from '../utils/logger';

// =============================================================================
// INTERFACES & TYPES
// =============================================================================

interface KeywordMapping {
  domain: string;
  keywords: string[];
  priority: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BASSA';
  agent: string;
  model: 'haiku' | 'sonnet' | 'opus';
  confidence_boost?: number;
}

interface ConfidenceConfig {
  exact_match: number;
  fuzzy_match: number;
  domain_inference: number;
  context_clues: number;
  default_fallback: number;
  priority_boost: Record<string, number>;
}

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

// =============================================================================
// KEYWORD EXTRACTOR CLASS
// =============================================================================

export class KeywordExtractor {
  private logger: PluginLogger;
  private keywordMappings: Map<string, KeywordMapping>;
  private confidenceConfig: ConfidenceConfig;
  private synonymDictionary: Map<string, string[]>;

  constructor(_config: PluginConfig) {
    // Store config if needed, or remove the unused parameter warning
    // this.config = _config;
    this.logger = new PluginLogger('KeywordExtractor');
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
  async extractKeywords(request: string): Promise<KeywordExtractionResult> {
    const startTime = Date.now();
    this.logger.debug('Extracting keywords', { request });

    try {
      // Preprocessing del testo
      const cleanText = this.preprocessText(request);
      const tokens = this.tokenizeText(cleanText);

      // Multi-tier keyword extraction
      const extractedKeywords: ExtractedKeyword[] = [];

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

    } catch (error) {
      this.logger.error('Keyword extraction failed', { error, request });
      throw error;
    }
  }

  /**
   * Rileva domini da keywords estratte
   */
  async detectDomains(keywords: ExtractedKeyword[]): Promise<ClassifiedDomain[]> {
    this.logger.debug('Detecting domains from keywords', { keywordCount: keywords.length });

    const domainScores = new Map<string, number>();
    const domainKeywords = new Map<string, string[]>();

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
        domainKeywords.get(domain)!.push(keyword.text);
      });
    });

    // Converte in ClassifiedDomain array
    const classifiedDomains: ClassifiedDomain[] = [];

    for (const [domainName, score] of domainScores.entries()) {
      const mapping = this.keywordMappings.get(domainName);
      if (!mapping) continue;

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
  calculateConfidence(keyword: string, domain: string): number {
    const mapping = this.keywordMappings.get(domain);
    if (!mapping) return this.confidenceConfig.default_fallback;

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
  handleMultiDomain(domains: ClassifiedDomain[]): RoutingStrategy {
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

  private preprocessText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ') // Rimuove punteggiatura eccetto trattini
      .replace(/\s+/g, ' ')      // Normalizza spazi
      .trim();
  }

  private tokenizeText(text: string): string[] {
    return text
      .split(/\s+/)
      .filter(token => token.length > 1) // Filtra token troppo corti
      .slice(0, 100); // Limite per performance
  }

  // =============================================================================
  // PRIVATE METHODS - KEYWORD EXTRACTION
  // =============================================================================

  private extractExactMatches(text: string, _tokens: string[]): ExtractedKeyword[] {
    const matches: ExtractedKeyword[] = [];

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
            source: 'exact' as const,
            synonyms: this.synonymDictionary.get(keyword) || [],
            context: this.extractContext(text, position, keyword.length),
            matchType: 'direct' as const
          });
        }
      });
    }

    return matches;
  }

  private extractFuzzyMatches(text: string, tokens: string[]): ExtractedKeyword[] {
    const matches: ExtractedKeyword[] = [];

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
              source: 'fuzzy' as const,
              synonyms: [],
              context: this.extractTokenContext(tokens, index),
              matchType: 'partial' as const
            });
          }
        });
      }
    });

    return matches;
  }

  private extractContextualKeywords(text: string, _tokens: string[]): ExtractedKeyword[] {
    const matches: ExtractedKeyword[] = [];

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
          source: 'context' as const,
          synonyms: [],
          context: this.extractContext(text, match.index || 0, match[0].length),
          matchType: 'inferred' as const
        });
      }
    });

    return matches;
  }

  // =============================================================================
  // PRIVATE METHODS - UTILITIES
  // =============================================================================

  private deduplicateKeywords(keywords: ExtractedKeyword[]): ExtractedKeyword[] {
    const seen = new Set<string>();
    return keywords.filter(keyword => {
      const key = `${keyword.text}-${keyword.domain}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private rankKeywordsByConfidence(keywords: ExtractedKeyword[]): ExtractedKeyword[] {
    return keywords.sort((a, b) => b.confidence - a.confidence);
  }

  private calculateOverallConfidence(keywords: ExtractedKeyword[]): number {
    if (keywords.length === 0) return 0;

    const avgConfidence = keywords.reduce((sum, k) => sum + k.confidence, 0) / keywords.length;
    const topKeywords = keywords.slice(0, 3); // Weight verso le top 3
    const topAvg = topKeywords.reduce((sum, k) => sum + k.confidence, 0) / topKeywords.length;

    return (avgConfidence * 0.4 + topAvg * 0.6); // Weighted average
  }

  private extractContext(text: string, position: number, length: number): string {
    const start = Math.max(0, position - 30);
    const end = Math.min(text.length, position + length + 30);
    return text.substring(start, end).trim();
  }

  private extractTokenContext(tokens: string[], index: number): string {
    const start = Math.max(0, index - 3);
    const end = Math.min(tokens.length, index + 4);
    return tokens.slice(start, end).join(' ');
  }

  private calculateLevenshteinSimilarity(a: string, b: string): number {
    const distance = this.levenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);
    return 1 - (distance / maxLength);
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[b.length][a.length];
  }

  private findMatchingDomains(keyword: string): string[] {
    const matches: string[] = [];

    for (const [domain, mapping] of this.keywordMappings.entries()) {
      if (mapping.keywords.some(k => k.includes(keyword) || keyword.includes(k))) {
        matches.push(domain);
      }
    }

    return matches;
  }

  private calculateFuzzyScore(keyword: string, domainKeywords: string[]): number {
    let bestScore = 0;

    domainKeywords.forEach(domainKeyword => {
      const similarity = this.calculateLevenshteinSimilarity(keyword, domainKeyword);
      bestScore = Math.max(bestScore, similarity);
    });

    return bestScore;
  }

  private calculateSynonymScore(keyword: string, domainKeywords: string[]): number {
    const synonyms = this.synonymDictionary.get(keyword) || [];

    if (synonyms.length === 0) return 0;

    let bestScore = 0;
    synonyms.forEach(synonym => {
      if (domainKeywords.includes(synonym)) {
        bestScore = Math.max(bestScore, 0.8);
      }
    });

    return bestScore;
  }

  private calculateDomainWeight(confidence: number, priority: string): number {
    const priorityWeights = { 'CRITICA': 1.0, 'ALTA': 0.8, 'MEDIA': 0.6, 'BASSA': 0.4 };
    const priorityWeight = priorityWeights[priority as keyof typeof priorityWeights] || 0.4;
    return confidence * priorityWeight;
  }

  // =============================================================================
  // PRIVATE METHODS - ROUTING STRATEGIES
  // =============================================================================

  private createSingleDomainStrategy(domain: ClassifiedDomain): RoutingStrategy {
    return {
      primaryAgent: domain.suggestedAgent,
      primaryModel: domain.suggestedModel === 'auto' ? 'sonnet' : domain.suggestedModel,
      secondaryOptions: [],
      parallelExecution: false,
      dependencyOrder: [domain.suggestedAgent]
    };
  }

  private createMultiDomainStrategy(domains: ClassifiedDomain[]): RoutingStrategy {
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

  private createFallbackStrategy(): RoutingStrategy {
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

  private initializeKeywordMappings(): void {
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
        priority: mapping.priority as 'CRITICA' | 'ALTA' | 'MEDIA' | 'BASSA',
        agent: mapping.agent,
        model: mapping.model as 'haiku' | 'sonnet' | 'opus'
      });
    });

    this.logger.debug('Keyword mappings initialized', { count: this.keywordMappings.size });
  }

  private initializeSynonymDictionary(): void {
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

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createKeywordExtractor(config: PluginConfig): KeywordExtractor {
  return new KeywordExtractor(config);
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { RoutingStrategy };