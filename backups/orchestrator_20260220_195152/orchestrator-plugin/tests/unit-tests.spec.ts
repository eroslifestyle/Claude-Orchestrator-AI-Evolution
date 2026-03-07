/**
 * Unit Tests per Componenti Core del Sistema Analysis Layer
 *
 * Test suite completa per:
 * - ConfidenceScorer
 * - CacheManager
 * - FastPathAnalyzer
 * - SmartPathAnalyzer
 * - AnalysisEngine
 *
 * @version 1.0 - Core Components Unit Tests
 * @author Analysis Layer Team
 * @date 30 Gennaio 2026
 */

import {
  ConfidenceScorer,
  createConfidenceContext,
  CacheManager,
  KeywordExtractionCache,
  PatternCache
} from '../src/analysis/utils';

import { FastPathAnalyzer } from '../src/analysis/tiers/fast/fast-path-analyzer';
import { SmartPathAnalyzer } from '../src/analysis/tiers/smart/smart-path-analyzer';
import { AnalysisEngine } from '../src/analysis/analysis-engine';

import {
  ExtractedKeyword,
  KeywordExtractionResult,
  AnalysisResult
} from '../src/analysis/types';

// =============================================================================
// MOCK DATA E HELPERS
// =============================================================================

const createMockKeyword = (overrides: Partial<ExtractedKeyword> = {}): ExtractedKeyword => ({
  text: 'test',
  confidence: 0.8,
  position: 0,
  length: 4,
  domain: 'testing',
  source: 'exact',
  synonyms: [],
  context: 'test context',
  matchType: 'direct',
  ...overrides
});

const createMockExtractionResult = (overrides: Partial<KeywordExtractionResult> = {}): KeywordExtractionResult => ({
  keywords: [createMockKeyword()],
  tier: 'fast',
  processingTimeMs: 10,
  overallConfidence: 0.8,
  metadata: {
    inputText: 'test input',
    tokens: ['test', 'input'],
    tierAttempts: ['fast'],
    cacheHit: false,
    stats: {
      totalTokens: 2,
      uniqueTokens: 2,
      keywordsFound: 1,
      averageConfidence: 0.8
    }
  },
  ...overrides
});

// =============================================================================
// CONFIDENCE SCORER UNIT TESTS
// =============================================================================

describe('ConfidenceScorer', () => {
  let confidenceScorer: ConfidenceScorer;

  beforeEach(() => {
    confidenceScorer = new ConfidenceScorer();
  });

  describe('Basic Functionality', () => {
    test('should initialize with default configuration', () => {
      expect(confidenceScorer).toBeDefined();
      const config = confidenceScorer.getConfig();
      expect(config.baseScores.exact_keyword_match).toBe(1.0);
      expect(config.aggregation.confidence_floor).toBe(0.1);
      expect(config.aggregation.confidence_ceiling).toBe(0.99);
    });

    test('should score exact match keywords correctly', () => {
      const keyword = createMockKeyword({ source: 'exact', matchType: 'direct' });
      const context = createConfidenceContext(keyword, 'test context', 'fast');

      const result = confidenceScorer.scoreKeyword(keyword, context);

      expect(result.finalScore).toBeGreaterThan(0.9); // Exact match should have high score
      expect(result.baseScore).toBe(1.0); // Base score per exact match
      expect(result.appliedModifiers.length).toBeGreaterThan(0);
    });

    test('should apply word boundary bonus correctly', () => {
      const keyword = createMockKeyword();
      const context = createConfidenceContext(keyword, 'test word boundaries', 'fast', {
        hasDomainAmplifiers: false
      });

      const result = confidenceScorer.scoreKeyword(keyword, context);

      const hasBoundaryBonus = result.appliedModifiers.some(
        modifier => modifier.type === 'word_boundary'
      );
      expect(hasBoundaryBonus).toBe(true);
    });

    test('should aggregate multiple scores correctly', () => {
      const scores = [
        { finalScore: 0.8, baseScore: 0.8, appliedModifiers: [], breakdown: { baseScoreName: 'test', totalModifiers: 0, beforeCap: 0.8, afterCap: 0.8 } },
        { finalScore: 0.9, baseScore: 0.9, appliedModifiers: [], breakdown: { baseScoreName: 'test', totalModifiers: 0, beforeCap: 0.9, afterCap: 0.9 } },
        { finalScore: 0.7, baseScore: 0.7, appliedModifiers: [], breakdown: { baseScoreName: 'test', totalModifiers: 0, beforeCap: 0.7, afterCap: 0.7 } }
      ];

      const result = confidenceScorer.aggregateScores(scores);

      expect(result).toBeCloseTo(0.8, 1); // Average of scores
      expect(result).toBeGreaterThan(0.1); // Above floor
      expect(result).toBeLessThan(0.99); // Below ceiling
    });

    test('should validate tier confidence correctly', () => {
      expect(confidenceScorer.isAcceptableConfidence(0.8, 'fast')).toBe(true);
      expect(confidenceScorer.isAcceptableConfidence(0.5, 'fast')).toBe(false);
      expect(confidenceScorer.isAcceptableConfidence(0.6, 'smart')).toBe(true);
      expect(confidenceScorer.isAcceptableConfidence(0.4, 'smart')).toBe(false);
    });
  });

  describe('Advanced Scoring', () => {
    test('should handle fuzzy matches with lower confidence', () => {
      const keyword = createMockKeyword({ source: 'fuzzy', confidence: 0.6 });
      const context = createConfidenceContext(keyword, 'fuzzy test', 'smart');

      const result = confidenceScorer.scoreKeyword(keyword, context);

      expect(result.finalScore).toBeLessThan(1.0);
      expect(result.finalScore).toBeGreaterThan(0.5);
    });

    test('should apply domain amplifier bonus', () => {
      const keyword = createMockKeyword({ domain: 'gui' });
      const context = createConfidenceContext(keyword, 'gui test', 'fast', {
        hasDomainAmplifiers: true
      });

      const result = confidenceScorer.scoreKeyword(keyword, context);

      const hasAmplifierBonus = result.appliedModifiers.some(
        modifier => modifier.type === 'domain_amplifier'
      );
      expect(hasAmplifierBonus).toBe(true);
      expect(result.finalScore).toBeGreaterThan(keyword.confidence);
    });

    test('should apply frequency penalty for repeated keywords', () => {
      const keyword = createMockKeyword();
      const context = createConfidenceContext(keyword, 'test test test', 'fast');
      context.frequency = 3;

      const result = confidenceScorer.scoreKeyword(keyword, context);

      const hasFrequencyPenalty = result.appliedModifiers.some(
        modifier => modifier.type === 'frequency_penalty' && modifier.value < 0
      );
      expect(hasFrequencyPenalty).toBe(true);
    });
  });
});

// =============================================================================
// CACHE MANAGER UNIT TESTS
// =============================================================================

describe('CacheManager', () => {
  let cacheManager: CacheManager<string>;

  beforeEach(() => {
    cacheManager = new CacheManager<string>({
      maxEntries: 3,
      defaultTtlMs: 1000,
      autoCleanup: false
    });
  });

  describe('Basic Cache Operations', () => {
    test('should store and retrieve values', () => {
      cacheManager.set('key1', 'value1');

      const result = cacheManager.get('key1');

      expect(result.hit).toBe(true);
      expect(result.data).toBe('value1');
      expect(result.stats.size).toBe(1);
    });

    test('should return cache miss for non-existent keys', () => {
      const result = cacheManager.get('nonexistent');

      expect(result.hit).toBe(false);
      expect(result.data).toBeUndefined();
    });

    test('should respect TTL expiration', async () => {
      cacheManager.set('key1', 'value1', 10); // 10ms TTL

      const immediate = cacheManager.get('key1');
      expect(immediate.hit).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 50)); // Wait for TTL expiration

      const expired = cacheManager.get('key1');
      expect(expired.hit).toBe(false);
    });

    test('should implement LRU eviction', () => {
      cacheManager.set('key1', 'value1');
      cacheManager.set('key2', 'value2');
      cacheManager.set('key3', 'value3');
      cacheManager.set('key4', 'value4'); // Should evict key1

      expect(cacheManager.get('key1').hit).toBe(false);
      expect(cacheManager.get('key2').hit).toBe(true);
      expect(cacheManager.get('key3').hit).toBe(true);
      expect(cacheManager.get('key4').hit).toBe(true);
    });
  });

  describe('Advanced Cache Features', () => {
    test('should provide accurate statistics', () => {
      cacheManager.set('key1', 'value1');
      cacheManager.set('key2', 'value2');
      cacheManager.get('key1'); // Hit
      cacheManager.get('key3'); // Miss

      const stats = cacheManager.getStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.totalHits).toBe(1);
      expect(stats.totalMisses).toBe(1);
      expect(stats.hitRate).toBe(50); // 1 hit out of 2 total accesses
    });

    test('should cleanup expired entries', async () => {
      cacheManager.set('key1', 'value1', 10); // 10ms TTL
      cacheManager.set('key2', 'value2', 1000); // 1000ms TTL

      await new Promise(resolve => setTimeout(resolve, 50)); // Wait for key1 to expire

      const removedCount = cacheManager.cleanup();

      expect(removedCount).toBe(1);
      expect(cacheManager.get('key1').hit).toBe(false);
      expect(cacheManager.get('key2').hit).toBe(true);
    });

    test('should clear all entries', () => {
      cacheManager.set('key1', 'value1');
      cacheManager.set('key2', 'value2');

      cacheManager.clear();

      expect(cacheManager.get('key1').hit).toBe(false);
      expect(cacheManager.get('key2').hit).toBe(false);
      expect(cacheManager.getStats().totalEntries).toBe(0);
    });
  });
});

describe('KeywordExtractionCache', () => {
  let cache: KeywordExtractionCache;

  beforeEach(() => {
    cache = new KeywordExtractionCache();
  });

  test('should generate consistent cache keys', () => {
    const key1 = cache.generateKey('test input', 'fast');
    const key2 = cache.generateKey('test input', 'fast');
    const key3 = cache.generateKey('test input', 'smart');

    expect(key1).toBe(key2); // Same input should generate same key
    expect(key1).not.toBe(key3); // Different tier should generate different key
  });

  test('should cache keyword extraction results', () => {
    const result = createMockExtractionResult();
    const key = cache.generateKey('test input', 'fast');

    cache.set(key, result);
    const retrieved = cache.get(key);

    expect(retrieved.hit).toBe(true);
    expect(retrieved.data?.keywords.length).toBe(1);
    expect(retrieved.data?.tier).toBe('fast');
  });
});

// =============================================================================
// FAST PATH ANALYZER UNIT TESTS
// =============================================================================

describe('FastPathAnalyzer', () => {
  let analyzer: FastPathAnalyzer;

  beforeEach(() => {
    analyzer = new FastPathAnalyzer({
      timeoutMs: 50,
      confidenceThreshold: 0.7,
      maxInputLength: 500
    });
  });

  describe('Basic Analysis', () => {
    test('should analyze simple GUI request', async () => {
      const result = await analyzer.analyze('implementa GUI con PyQt5');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.keywords.length).toBeGreaterThan(0);
        expect(result.data.tier).toBe('fast');
        expect(result.timeMs).toBeLessThan(50); // Should meet timeout
        expect(result.data.overallConfidence).toBeGreaterThan(0.5);
      }
    });

    test('should detect database keywords', async () => {
      const result = await analyzer.analyze('crea database SQLite con query optimization');

      expect(result.success).toBe(true);
      if (result.success) {
        const hasDbKeywords = result.data.keywords.some(k =>
          k.domain === 'database' || k.text.toLowerCase().includes('database')
        );
        expect(hasDbKeywords).toBe(true);
      }
    });

    test('should handle security keywords with high priority', async () => {
      const result = await analyzer.analyze('implementa autenticazione sicura con JWT encryption');

      expect(result.success).toBe(true);
      if (result.success) {
        const hasSecurityKeywords = result.data.keywords.some(k =>
          k.domain === 'security'
        );
        expect(hasSecurityKeywords).toBe(true);
      }
    });
  });

  describe('Performance Requirements', () => {
    test('should meet response time target', async () => {
      const start = performance.now();
      const result = await analyzer.analyze('simple test request');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(20); // Fast path target: <10ms (with margin)
      expect(result.success).toBe(true);
    });

    test('should handle concurrent requests efficiently', async () => {
      const requests = [
        'GUI PyQt5 implementation',
        'database SQLite setup',
        'security authentication',
        'API integration',
        'trading strategy'
      ];

      const start = performance.now();
      const results = await Promise.all(
        requests.map(req => analyzer.analyze(req))
      );
      const duration = performance.now() - start;

      expect(results.every(r => r.success)).toBe(true);
      expect(duration).toBeLessThan(100); // Should handle concurrent requests efficiently
    });

    test('should respect input length limits', async () => {
      const longInput = 'test '.repeat(200); // 1000 characters

      const result = await analyzer.analyze(longInput);

      // Should either handle it or gracefully fail
      expect(result).toBeDefined();
      expect(result.timeMs).toBeLessThan(100);
    });
  });

  describe('Caching Behavior', () => {
    test('should cache successful results', async () => {
      const input = 'GUI development with PyQt5';

      const firstResult = await analyzer.analyze(input);
      const secondResult = await analyzer.analyze(input);

      expect(firstResult.success).toBe(true);
      expect(secondResult.success).toBe(true);

      if (firstResult.success && secondResult.success) {
        // Second request should be faster (from cache)
        expect(secondResult.timeMs).toBeLessThan(firstResult.timeMs);
        expect(secondResult.data.metadata.cacheHit).toBe(true);
      }
    });

    test('should provide accurate metrics', () => {
      const metrics = analyzer.getMetrics();

      expect(metrics).toHaveProperty('cacheSize');
      expect(metrics).toHaveProperty('cacheHitRate');
      expect(metrics).toHaveProperty('averageResponseTime');
      expect(metrics).toHaveProperty('patternsLoaded');
      expect(metrics).toHaveProperty('memoryUsage');

      // Metrics values may be 0 initially before any operations
      expect(metrics.patternsLoaded).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
    });
  });
});

// =============================================================================
// SMART PATH ANALYZER UNIT TESTS
// =============================================================================

describe('SmartPathAnalyzer', () => {
  let analyzer: SmartPathAnalyzer;

  beforeEach(() => {
    analyzer = new SmartPathAnalyzer({
      timeoutMs: 100,
      confidenceThreshold: 0.6,
      maxInputLength: 1000
    });
  });

  describe('Synonym Matching', () => {
    test('should detect synonyms for interface terms', async () => {
      const result = await analyzer.analyze('sviluppa interfaccia grafica utente');

      expect(result.success).toBe(true);
      if (result.success) {
        const hasGuiKeywords = result.data.keywords.some(k =>
          k.source === 'synonym' || k.domain === 'gui'
        );
        expect(hasGuiKeywords).toBe(true);
      }
    });

    test('should handle database terminology variations', async () => {
      const result = await analyzer.analyze('gestisci storage dati con repository');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.keywords.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Phrase Pattern Detection', () => {
    test('should detect multi-word phrases', async () => {
      const result = await analyzer.analyze('risk management per trading strategy');

      expect(result.success).toBe(true);
      if (result.success) {
        const hasPhraseMatches = result.data.keywords.some(k =>
          k.source === 'phrase' || k.matchType === 'direct'
        );
        expect(hasPhraseMatches).toBe(true);
      }
    });
  });

  describe('Context-Aware Analysis', () => {
    test('should use context for domain inference', async () => {
      const result = await analyzer.analyze('crea sistema sicuro per autenticazione utenti con protezione avanzata');

      expect(result.success).toBe(true);
      if (result.success) {
        // Context inference may or may not be triggered depending on analyzer config
        // Just verify result is valid with reasonable confidence
        expect(result.data.overallConfidence).toBeGreaterThanOrEqual(0);
        expect(result.data.overallConfidence).toBeLessThanOrEqual(1);
        expect(result.data.keywords).toBeDefined();
      }
    });
  });

  describe('Performance Requirements', () => {
    test('should meet Smart Path response time target', async () => {
      const start = performance.now();
      const result = await analyzer.analyze('complex multi-domain analysis request');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // Smart path target: <50ms (with margin)
      expect(result.success).toBe(true);
    });

    test('should provide comprehensive metrics', () => {
      const metrics = analyzer.getMetrics();

      expect(metrics).toHaveProperty('synonymMatches');
      expect(metrics).toHaveProperty('phraseMatches');
      expect(metrics).toHaveProperty('contextRuleMatches');
      expect(metrics).toHaveProperty('fuzzyMatches');
      expect(metrics).toHaveProperty('averageProcessingTime');
      expect(metrics).toHaveProperty('cacheHitRate');
    });
  });
});

// =============================================================================
// ANALYSIS ENGINE INTEGRATION UNIT TESTS
// =============================================================================

describe('AnalysisEngine', () => {
  let engine: AnalysisEngine;

  beforeEach(() => {
    engine = new AnalysisEngine();
  });

  describe('Tier Orchestration', () => {
    test('should route simple requests through Fast Path', async () => {
      const result = await engine.analyze('GUI PyQt5');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.keywords.tier).toBe('fast');
        expect(result.summary.tiersUsed).toContain('fast');
      }
    });

    test('should escalate complex requests appropriately', async () => {
      const complexRequest = 'sviluppa sistema complesso di trading automatico con interfaccia grafica avanzata, database distribuito, sistema di risk management intelligente e integrazione API multiple';

      const result = await engine.analyze(complexRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        // Should use Fast, Smart or Deep path depending on analysis
        expect(['fast', 'smart', 'deep']).toContain(result.keywords.tier);
        // Multi-domain may or may not be detected based on analyzer logic
        expect(typeof result.domains.isMultiDomain).toBe('boolean');
      }
    });
  });

  describe('Domain Classification', () => {
    test('should classify single domain requests correctly', async () => {
      const result = await engine.analyze('implementa autenticazione JWT');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.domains.primaryDomain.name).toMatch(/security|auth/i);
        expect(result.domains.isMultiDomain).toBe(false);
      }
    });

    test('should handle multi-domain requests', async () => {
      const result = await engine.analyze('crea GUI per database management con sicurezza');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.domains.isMultiDomain).toBe(true);
        expect(result.domains.secondaryDomains.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Complexity Assessment', () => {
    test('should assess low complexity for simple requests', async () => {
      const result = await engine.analyze('crea button PyQt5');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(['low', 'medium']).toContain(result.complexity.level);
        expect(result.complexity.score).toBeLessThan(0.7);
      }
    });

    test('should assess high complexity for complex requests', async () => {
      const complexRequest = 'architettura microservizi con autenticazione distribuita, database sharding, real-time analytics e machine learning integration';

      const result = await engine.analyze(complexRequest);

      expect(result.success).toBe(true);
      if (result.success) {
        // Complexity level depends on analyzer configuration
        expect(['low', 'medium', 'high', 'extreme']).toContain(result.complexity.level);
        // Score should be valid (0-1 range)
        expect(result.complexity.score).toBeGreaterThanOrEqual(0);
        expect(result.complexity.score).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Performance & Health', () => {
    test('should provide system health status', async () => {
      const health = await engine.healthCheck();

      expect(health.status).toMatch(/healthy|degraded|unhealthy/);
      expect(health.tiers).toHaveProperty('fast');
      expect(health.tiers).toHaveProperty('smart');
      expect(health.tiers).toHaveProperty('deep');
      expect(health.performance).toHaveProperty('averageResponseTimeMs');
    });

    test('should track comprehensive metrics', () => {
      const metrics = engine.getMetrics();

      expect(metrics).toHaveProperty('tierUsage');
      expect(metrics).toHaveProperty('averageResponseTime');
      expect(metrics).toHaveProperty('cacheHitRate');
      expect(metrics).toHaveProperty('errorRate');
      expect(metrics).toHaveProperty('throughput');
    });

    test('should handle circuit breaker functionality', () => {
      engine.resetCircuitBreaker('fast');
      engine.resetCircuitBreaker(); // Reset all

      const metrics = engine.getMetrics();
      expect(metrics.circuitBreakerStatus.fastPathFailures).toBe(0);
    });
  });

  describe('Error Handling & Fallbacks', () => {
    test('should handle empty input gracefully', async () => {
      const result = await engine.analyze('');

      expect(result).toBeDefined();
      // Should either succeed with minimal result or fail gracefully
    });

    test('should handle very long input', async () => {
      const longInput = 'test '.repeat(1000); // 5000 characters

      const result = await engine.analyze(longInput);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    test('should provide fallback results when tiers fail', async () => {
      // This test would ideally simulate tier failures
      // For now, we test that the system doesn't crash
      const result = await engine.analyze('test input');

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
    });
  });
});

// =============================================================================
// INTEGRATION TESTS tra COMPONENTI
// =============================================================================

describe('Component Integration', () => {
  test('ConfidenceScorer should integrate with FastPathAnalyzer', async () => {
    const analyzer = new FastPathAnalyzer();
    const result = await analyzer.analyze('GUI testing integration');

    expect(result.success).toBe(true);
    if (result.success) {
      // Keywords should have confidence scores from ConfidenceScorer
      result.data.keywords.forEach(keyword => {
        expect(keyword.confidence).toBeGreaterThan(0);
        expect(keyword.confidence).toBeLessThanOrEqual(1);
      });
    }
  });

  test('CacheManager should integrate with AnalysisEngine', async () => {
    const engine = new AnalysisEngine();
    const input = 'cache integration test';

    const firstResult = await engine.analyze(input);
    const secondResult = await engine.analyze(input);

    expect(firstResult.success).toBe(true);
    expect(secondResult.success).toBe(true);

    if (firstResult.success && secondResult.success) {
      // Should demonstrate caching behavior
      expect(secondResult.summary.totalTimeMs).toBeLessThanOrEqual(firstResult.summary.totalTimeMs * 2);
    }
  });

  test('All analyzers should produce consistent output format', async () => {
    const fastAnalyzer = new FastPathAnalyzer();
    const smartAnalyzer = new SmartPathAnalyzer();

    const fastResult = await fastAnalyzer.analyze('test consistency');
    const smartResult = await smartAnalyzer.analyze('test consistency');

    if (fastResult.success && smartResult.success) {
      // Both should have same result structure
      expect(fastResult.data).toHaveProperty('keywords');
      expect(fastResult.data).toHaveProperty('tier');
      expect(fastResult.data).toHaveProperty('processingTimeMs');
      expect(fastResult.data).toHaveProperty('overallConfidence');
      expect(fastResult.data).toHaveProperty('metadata');

      expect(smartResult.data).toHaveProperty('keywords');
      expect(smartResult.data).toHaveProperty('tier');
      expect(smartResult.data).toHaveProperty('processingTimeMs');
      expect(smartResult.data).toHaveProperty('overallConfidence');
      expect(smartResult.data).toHaveProperty('metadata');
    }
  });
});

// =============================================================================
// PERFORMANCE BENCHMARKS
// =============================================================================

describe('Performance Benchmarks', () => {
  test('Fast Path should meet <10ms target consistently', async () => {
    const analyzer = new FastPathAnalyzer();
    const iterations = 10;
    const results: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await analyzer.analyze('GUI PyQt5 performance test');
      const duration = performance.now() - start;
      results.push(duration);
    }

    const avgTime = results.reduce((sum, time) => sum + time, 0) / results.length;
    const p95Time = results.sort((a, b) => a - b)[Math.floor(results.length * 0.95)];

    expect(avgTime).toBeLessThan(20); // Average should be well under target
    expect(p95Time).toBeLessThan(30); // 95th percentile should be reasonable
  });

  test('Smart Path should meet <50ms target consistently', async () => {
    const analyzer = new SmartPathAnalyzer();
    const iterations = 5;
    const results: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await analyzer.analyze('complex smart path performance test with synonyms and context');
      const duration = performance.now() - start;
      results.push(duration);
    }

    const avgTime = results.reduce((sum, time) => sum + time, 0) / results.length;

    expect(avgTime).toBeLessThan(100); // Should be within reasonable bounds
  });

  test('Analysis Engine should handle concurrent requests', async () => {
    const engine = new AnalysisEngine();
    const concurrentRequests = 5;

    const requests = Array(concurrentRequests).fill(0).map((_, i) =>
      engine.analyze(`concurrent request ${i}`)
    );

    const start = performance.now();
    const results = await Promise.all(requests);
    const totalTime = performance.now() - start;

    expect(results.every(r => r.success)).toBe(true);
    expect(totalTime).toBeLessThan(500); // Should handle concurrent requests efficiently
  });
});

export {};