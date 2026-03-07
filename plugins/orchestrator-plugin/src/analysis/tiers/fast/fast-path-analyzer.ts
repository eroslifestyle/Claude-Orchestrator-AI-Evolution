/**
 * Tier 1 - Fast Path Analyzer
 *
 * Enhanced regex engine con word boundaries, caching e performance optimization
 * Target: <10ms response time, 70% coverage, confidence threshold 0.7
 *
 * @version 1.0 - Fast Path Implementation
 * @author Analysis Layer Team
 * @date 30 Gennaio 2026
 */

import {
  AnalysisTier,
  ExtractedKeyword,
  KeywordExtractionResult,
  TierResult,
  GracefulPromise
} from '../../types';
import {
  ConfidenceScorer,
  createConfidenceContext
} from '../../utils/confidence-scorer';
import {
  KeywordExtractionCache,
  PatternCache,
  CacheStats
} from '../../utils/cache-manager';

// =============================================================================
// FAST PATH CONFIGURATION
// =============================================================================

interface FastPathConfig {
  enabled: boolean;
  timeoutMs: number;
  confidenceThreshold: number;
  maxInputLength: number;
  enableWordBoundaries: boolean;
  enableCaching: boolean;
  cacheSize: number;
  caseSensitive: boolean;
}

interface PerformanceMetrics {
  totalRequests: number;
  averageResponseTime: number;
  cacheHitRate: number;
  patternCompilationTime: number;
  memoryUsageMB: number;
  lastOptimizationTime: number;
}

interface RegexPattern {
  domain: string;
  keywords: string[];
  pattern: RegExp;
  confidence: number;
  agent: string;
  model: 'haiku' | 'sonnet' | 'opus';
}

// =============================================================================
// FAST PATH ANALYZER CLASS
// =============================================================================

export class FastPathAnalyzer {
  private config: FastPathConfig;
  private keywordCache: KeywordExtractionCache;
  private patternCache: PatternCache;
  private patterns: RegexPattern[];
  private confidenceScorer: ConfidenceScorer;
  private startupTime: number;
  private performanceMetrics: PerformanceMetrics;

  constructor(config?: Partial<FastPathConfig>) {
    this.startupTime = performance.now();

    // Default configuration con performance targets
    this.config = {
      enabled: true,
      timeoutMs: 20,
      confidenceThreshold: 0.7,
      maxInputLength: 1000,
      enableWordBoundaries: true,
      enableCaching: true,
      cacheSize: 500,
      caseSensitive: false,
      ...config
    };

    // Initialize advanced cache managers
    this.keywordCache = new KeywordExtractionCache();
    this.patternCache = new PatternCache();

    // Initialize confidence scorer
    this.confidenceScorer = new ConfidenceScorer();

    // Initialize performance metrics
    this.performanceMetrics = {
      totalRequests: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      patternCompilationTime: 0,
      memoryUsageMB: 0,
      lastOptimizationTime: Date.now()
    };

    // Compile regex patterns from domain mappings
    const patternStartTime = performance.now();
    this.patterns = this.compileRegexPatterns();
    this.performanceMetrics.patternCompilationTime = performance.now() - patternStartTime;

    console.log(`🚀 FastPathAnalyzer initialized in ${Math.round(performance.now() - this.startupTime)}ms`);
  }

  // =============================================================================
  // PUBLIC API
  // =============================================================================

  /**
   * Analizza testo con Fast Path (Tier 1)
   * Target: <10ms, confidence >0.7, 70% coverage
   */
  async analyze(text: string): GracefulPromise<KeywordExtractionResult> {
    const analysisStart = performance.now();
    this.performanceMetrics.totalRequests++;

    try {
      // Validation e preprocessing
      const processedText = this.preprocessText(text);
      if (!this.isValidInput(processedText)) {
        return this.createErrorResult('invalid_input', analysisStart);
      }

      // Cache lookup con nuovo cache manager
      if (this.config.enableCaching) {
        const cacheKey = this.keywordCache.generateKey(processedText, 'fast');
        const cacheResult = this.keywordCache.get(cacheKey);

        if (cacheResult.hit && cacheResult.data) {
          // Update cache stats
          this.updateCacheMetrics(cacheResult.stats);

          // Mark as cache hit
          const cachedResult = { ...cacheResult.data };
          cachedResult.metadata.cacheHit = true;

          return this.createSuccessResult(cachedResult, 'fast', analysisStart);
        }
      }

      // Core analysis con performance monitoring
      const keywords = this.extractKeywordsFast(processedText);
      const result = this.buildExtractionResult(keywords, processedText, analysisStart);

      // Cache result se confidence alta
      if (this.config.enableCaching && result.overallConfidence >= this.config.confidenceThreshold) {
        const cacheKey = this.keywordCache.generateKey(processedText, 'fast');
        this.keywordCache.set(cacheKey, result);
      }

      // Update performance metrics
      this.updatePerformanceMetrics(performance.now() - analysisStart);

      return this.createSuccessResult(result, 'fast', analysisStart);

    } catch (error) {
      return this.createErrorResult('system_error', analysisStart, error);
    }
  }

  /**
   * Check se Fast Path può gestire questa richiesta
   */
  canHandle(text: string): boolean {
    if (!this.config.enabled) return false;
    if (text.length > this.config.maxInputLength) return false;

    // Quick confidence check senza full analysis
    const quickScore = this.getQuickConfidenceScore(text);
    return quickScore >= this.config.confidenceThreshold;
  }

  /**
   * Get comprehensive performance metrics
   */
  getMetrics(): FastPathMetrics {
    const keywordCacheStats = this.keywordCache.getStats();
    const patternCacheStats = this.patternCache.getStats();

    return {
      cacheSize: keywordCacheStats.totalEntries,
      cacheHitRate: this.performanceMetrics.cacheHitRate,
      averageResponseTime: this.performanceMetrics.averageResponseTime,
      patternsLoaded: this.patterns.length,
      memoryUsage: this.performanceMetrics.memoryUsageMB,
      patternCacheStats,
      keywordCacheStats,
      totalRequests: this.performanceMetrics.totalRequests,
      patternCompilationTime: this.performanceMetrics.patternCompilationTime
    };
  }

  // =============================================================================
  // CORE ANALYSIS METHODS
  // =============================================================================

  /**
   * Core keyword extraction con enhanced regex
   */
  private extractKeywordsFast(text: string): ExtractedKeyword[] {
    const keywords: ExtractedKeyword[] = [];
    const textLower = this.config.caseSensitive ? text : text.toLowerCase();
    const seenKeywords = new Set<string>();

    // Iterate through compiled regex patterns
    for (const pattern of this.patterns) {
      const matches = textLower.matchAll(pattern.pattern);

      for (const match of matches) {
        if (!match.index) continue;

        const matchedText = match[0];
        const keywordText = this.findOriginalKeyword(matchedText, pattern.keywords);

        // Skip duplicates
        if (seenKeywords.has(keywordText)) continue;
        seenKeywords.add(keywordText);

        // Create temporary keyword per confidence scoring
        const tempKeyword: ExtractedKeyword = {
          text: keywordText,
          confidence: 0.0, // Temporaneo, verrà calcolato
          position: match.index,
          length: matchedText.length,
          domain: pattern.domain,
          source: 'exact',
          synonyms: [],
          context: this.extractContext(text, match.index, matchedText.length),
          matchType: 'direct'
        };

        // Calculate confidence usando il sistema unificato
        const confidenceContext = createConfidenceContext(tempKeyword, text, 'fast', {
          domainCount: 1,
          hasDomainAmplifiers: this.hasContextAmplifiers(tempKeyword.context, pattern.domain)
        });

        const scoringResult = this.confidenceScorer.scoreKeyword(tempKeyword, confidenceContext);

        // Create final keyword con confidence calcolata
        const keyword: ExtractedKeyword = {
          ...tempKeyword,
          confidence: scoringResult.finalScore
        };

        keywords.push(keyword);
      }
    }

    // Sort by confidence and position
    return keywords.sort((a, b) => {
      if (Math.abs(a.confidence - b.confidence) > 0.05) {
        return b.confidence - a.confidence;
      }
      return a.position - b.position;
    });
  }

  /**
   * Check se il context contiene amplifier per il dominio
   */
  private hasContextAmplifiers(context: string, domain: string): boolean {
    const amplifierWords = {
      gui: ['interfaccia', 'visual', 'design', 'user', 'experience'],
      database: ['dati', 'query', 'schema', 'tabella', 'record'],
      security: ['sicurezza', 'autenticazione', 'crittografia', 'protezione'],
      trading: ['mercato', 'trading', 'investimenti', 'portafoglio'],
      testing: ['test', 'verifica', 'qualità', 'validazione'],
      integration: ['integrazione', 'connessione', 'comunicazione']
    };

    const domainAmplifiers = amplifierWords[domain as keyof typeof amplifierWords] || [];
    const contextLower = context.toLowerCase();

    return domainAmplifiers.some(amplifier => contextLower.includes(amplifier));
  }

  /**
   * Extract context circostante (5 parole prima/dopo)
   */
  private extractContext(text: string, position: number, length: number): string {
    const beforeText = text.substring(0, position);
    const afterText = text.substring(position + length);

    const beforeWords = beforeText.split(/\s+/).slice(-3).join(' ');
    const afterWords = afterText.split(/\s+/).slice(0, 3).join(' ');

    return `${beforeWords} [${text.substring(position, position + length)}] ${afterWords}`.trim();
  }

  // =============================================================================
  // REGEX PATTERN COMPILATION
  // =============================================================================

  /**
   * Compila regex patterns da keyword mappings
   */
  private compileRegexPatterns(): RegexPattern[] {
    const patterns: RegexPattern[] = [];

    // Domain mappings hardcoded (in produzione caricate da synonyms.json)
    const domainMappings = this.getHardcodedMappings();

    for (const [domain, mapping] of Object.entries(domainMappings)) {
      const keywords: string[] = [...mapping.keywords]; // Convert readonly array to mutable
      const regexPattern = this.buildDomainRegex(keywords);

      patterns.push({
        domain,
        keywords,
        pattern: regexPattern,
        confidence: mapping.baseConfidence,
        agent: mapping.agent,
        model: mapping.model
      });
    }

    console.log(`📊 Compiled ${patterns.length} regex patterns for Fast Path`);
    return patterns;
  }

  /**
   * Build regex pattern per un dominio
   */
  private buildDomainRegex(keywords: readonly string[]): RegExp {
    // Escape special regex characters
    const escapedKeywords = keywords.map(kw => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    // Build pattern con word boundaries se abilitato
    let pattern: string;
    if (this.config.enableWordBoundaries) {
      pattern = `\\b(${escapedKeywords.join('|')})\\b`;
    } else {
      pattern = `(${escapedKeywords.join('|')})`;
    }

    const flags = this.config.caseSensitive ? 'g' : 'gi';
    return new RegExp(pattern, flags);
  }

  /**
   * Get hardcoded domain mappings (placeholder per MVP)
   */
  private getHardcodedMappings() {
    return {
      gui: {
        keywords: ['gui', 'pyqt5', 'qt', 'widget', 'dialog', 'layout', 'interface', 'ui', 'form', 'button', 'menu'],
        baseConfidence: 0.9,
        agent: 'experts/gui-super-expert.md',
        model: 'sonnet'
      },
      database: {
        keywords: ['database', 'sql', 'sqlite', 'postgresql', 'query', 'schema', 'db', 'table', 'migration'],
        baseConfidence: 0.85,
        agent: 'experts/database_expert.md',
        model: 'sonnet'
      },
      security: {
        keywords: ['security', 'auth', 'authentication', 'encryption', 'jwt', 'oauth', 'password', 'token', 'login'],
        baseConfidence: 0.95,
        agent: 'experts/security_unified_expert.md',
        model: 'sonnet'
      },
      testing: {
        keywords: ['test', 'debug', 'bug', 'qa', 'quality', 'performance', 'benchmark', 'unittest', 'e2e'],
        baseConfidence: 0.8,
        agent: 'experts/tester_expert.md',
        model: 'sonnet'
      },
      trading: {
        keywords: ['trading', 'risk', 'management', 'position', 'tp', 'sl', 'forex', 'strategy', 'portfolio'],
        baseConfidence: 0.85,
        agent: 'experts/trading_strategy_expert.md',
        model: 'sonnet'
      },
      integration: {
        keywords: ['api', 'integration', 'webhook', 'rest', 'client', 'server', 'endpoint', 'microservice'],
        baseConfidence: 0.8,
        agent: 'experts/integration_expert.md',
        model: 'sonnet'
      }
    } as const;
  }

  // =============================================================================
  // PERFORMANCE OPTIMIZATION
  // =============================================================================

  /**
   * Update cache-related metrics
   */
  private updateCacheMetrics(cacheStats: { hitRate: number; memoryMB: number }): void {
    this.performanceMetrics.cacheHitRate = cacheStats.hitRate;
    this.performanceMetrics.memoryUsageMB = cacheStats.memoryMB;
  }

  /**
   * Update performance metrics con new response time
   */
  private updatePerformanceMetrics(responseTime: number): void {
    // Moving average per response time
    const alpha = 0.1; // Smoothing factor
    if (this.performanceMetrics.averageResponseTime === 0) {
      this.performanceMetrics.averageResponseTime = responseTime;
    } else {
      this.performanceMetrics.averageResponseTime =
        (alpha * responseTime) + ((1 - alpha) * this.performanceMetrics.averageResponseTime);
    }

    // Periodic optimization check
    const now = Date.now();
    const timeSinceLastOptimization = now - this.performanceMetrics.lastOptimizationTime;

    // Optimize cache every 5 minutes
    if (timeSinceLastOptimization > 300000) {
      this.optimizePerformance();
      this.performanceMetrics.lastOptimizationTime = now;
    }
  }

  /**
   * Optimize performance periodically
   */
  private optimizePerformance(): void {
    // Optimize keyword cache
    this.keywordCache.optimize();

    // Cleanup expired patterns
    this.patternCache.cleanup();

    // Log optimization
    const stats = this.getMetrics();
    console.log(`⚡ FastPath performance optimized - Hit Rate: ${Math.round(stats.cacheHitRate)}%, Memory: ${Math.round(stats.memoryUsage)}MB`);
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Preprocess input text
   */
  private preprocessText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .substring(0, this.config.maxInputLength);
  }

  /**
   * Validate input
   */
  private isValidInput(text: string): boolean {
    return text.length > 0 && text.length <= this.config.maxInputLength;
  }

  /**
   * Quick confidence score senza full analysis
   */
  private getQuickConfidenceScore(text: string): number {
    const textLower = text.toLowerCase();
    let maxScore = 0;

    for (const pattern of this.patterns) {
      const match = pattern.pattern.exec(textLower);
      if (match && match.index !== undefined) {
        // Crea quick scoring context
        const quickKeyword: ExtractedKeyword = {
          text: match[0],
          confidence: 0.0,
          position: match.index,
          length: match[0].length,
          domain: pattern.domain,
          source: 'exact',
          synonyms: [],
          context: '',
          matchType: 'direct'
        };

        const quickContext = createConfidenceContext(quickKeyword, text, 'fast');
        const scoringResult = this.confidenceScorer.scoreKeyword(quickKeyword, quickContext);

        maxScore = Math.max(maxScore, scoringResult.finalScore);

        // Reset regex per prossima iterazione
        pattern.pattern.lastIndex = 0;
      }
    }

    return maxScore;
  }


  /**
   * Find original keyword da match
   */
  private findOriginalKeyword(matchedText: string, keywords: string[]): string {
    const exact = keywords.find(kw =>
      this.config.caseSensitive ? kw === matchedText : kw.toLowerCase() === matchedText.toLowerCase()
    );
    return exact || keywords[0]; // Fallback al primo keyword
  }

  /**
   * Build final extraction result
   */
  private buildExtractionResult(
    keywords: ExtractedKeyword[],
    text: string,
    startTime: number
  ): KeywordExtractionResult {
    const processingTime = performance.now() - startTime;
    const overallConfidence = keywords.length > 0
      ? keywords.reduce((sum, kw) => sum + kw.confidence, 0) / keywords.length
      : 0;

    return {
      keywords,
      tier: 'fast',
      processingTimeMs: processingTime,
      overallConfidence,
      metadata: {
        inputText: text,
        tokens: text.split(/\s+/),
        tierAttempts: ['fast'],
        cacheHit: false,
        stats: {
          totalTokens: text.split(/\s+/).length,
          uniqueTokens: new Set(text.split(/\s+/)).size,
          keywordsFound: keywords.length,
          averageConfidence: overallConfidence
        }
      }
    };
  }

  // =============================================================================
  // RESULT BUILDERS
  // =============================================================================

  /**
   * Create success result
   */
  private createSuccessResult(
    result: KeywordExtractionResult,
    tier: AnalysisTier,
    startTime: number
  ): TierResult<KeywordExtractionResult> {
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
  private createErrorResult(
    errorType: string,
    startTime: number,
    error?: any
  ): TierResult<KeywordExtractionResult> {
    return {
      success: false,
      error: {
        tier: 'fast',
        type: errorType as any,
        message: error?.message || `Fast Path analysis failed: ${errorType}`,
        stack: error?.stack,
        recoverable: true
      },
      tier: 'fast',
      timeMs: performance.now() - startTime
    };
  }

  // =============================================================================
  // METRICS & MONITORING
  // =============================================================================

  /**
   * Calculate cache hit rate
   */
  private calculateCacheHitRate(): number {
    // Placeholder - in produzione tracked con metrics
    return 0.85; // 85% target hit rate
  }

  /**
   * Get average response time
   */
  private getAverageResponseTime(): number {
    // Placeholder - in produzione tracked con metrics
    return 8; // 8ms average
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    // Estimate based on pattern count and cache size
    const patternsSize = this.patterns.length * 500; // ~0.5KB per pattern
    return patternsSize / 1024; // Return in MB
  }
}

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface FastPathMetrics {
  cacheSize: number;
  cacheHitRate: number;
  averageResponseTime: number;
  patternsLoaded: number;
  memoryUsage: number;
  patternCacheStats: CacheStats;
  keywordCacheStats: CacheStats;
  totalRequests: number;
  patternCompilationTime: number;
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { FastPathConfig };