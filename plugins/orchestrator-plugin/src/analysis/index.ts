/**
 * Analysis Layer - Entry Point
 *
 * Sistema 3-Tier per analisi intelligente delle richieste utente:
 * - Tier 1 (Fast Path): Enhanced regex <10ms
 * - Tier 2 (Smart Path): Synonyms + NLP <50ms
 * - Tier 3 (Deep Path): Claude LLM <2s
 *
 * @version 1.0 - Pragmatic Balance Implementation
 * @author Analysis Layer Team
 * @date 30 Gennaio 2026
 */

// =============================================================================
// TYPES EXPORTS
// =============================================================================

export * from './types';

// =============================================================================
// CORE ANALYSIS ENGINE
// =============================================================================

export { AnalysisEngine } from './analysis-engine';

// =============================================================================
// TIER IMPLEMENTATIONS
// =============================================================================

// Tier 1 - Fast Path
export { FastPathAnalyzer } from './tiers/fast/fast-path-analyzer';

// Tier 2 - Smart Path
export { SmartPathAnalyzer } from './tiers/smart/smart-path-analyzer';

// Tier 3 - Deep Path
// export { DeepPathAnalyzer } from './tiers/deep/deep-path-analyzer'; // TODO: Implementare

// =============================================================================
// UTILITIES
// =============================================================================

export { ConfidenceScorer, createConfidenceContext } from './utils/confidence-scorer';
export { CacheManager, KeywordExtractionCache, PatternCache } from './utils/cache-manager';

// TODO: Implementare utilities aggiuntive
// export { SynonymDictionary } from './utils/synonym-dictionary';
// export { PhrasePatternMatcher } from './utils/phrase-pattern-matcher';
// export { ContextRuleEngine } from './utils/context-rule-engine';
// export { PerformanceMonitor } from './utils/performance-monitor';

// =============================================================================
// CONFIGURATION (coming soon)
// =============================================================================

// export { ConfigLoader } from './config/config-loader';
// export { DefaultConfigs } from './config/default-configs';

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Interfaccia principale dell'Analysis Layer
 *
 * Usage:
 * ```typescript
 * import { AnalysisEngine, AnalysisResult } from '../analysis';
 *
 * const engine = new AnalysisEngine();
 * const result: AnalysisResult = await engine.analyze("implementa login OAuth2");
 *
 * console.log(`Dominio rilevato: ${result.domains.primaryDomain.name}`);
 * console.log(`Agent consigliato: ${result.summary.recommendation.primaryAgent}`);
 * console.log(`Complessità: ${result.complexity.level}`);
 * ```
 */

// =============================================================================
// DEVELOPMENT STATUS
// =============================================================================

/**
 * IMPLEMENTATION STATUS:
 *
 * ✅ COMPLETED:
 * - Type system completo (200+ linee)
 * - Directory structure 3-tier
 * - Configuration JSON files (synonyms, patterns, context-rules, tier-config)
 * - Tier 1: Fast Path Analyzer (enhanced regex + caching)
 * - Tier 2: Smart Path Analyzer (synonym + phrase + context)
 * - Utils: ConfidenceScorer unificato
 * - Utils: CacheManager avanzato (LRU + TTL + metrics)
 * - Integration: AnalysisEngine orchestrator completo
 * - Circuit breaker, quality gates, fallback system
 * - Performance monitoring e health checks
 *
 * ⏳ TODO:
 * - Tier 3: Deep Path Analyzer (Claude LLM integration)
 * - Config: Loader dinamico da JSON files
 * - Utils: SynonymDictionary, PhrasePatternMatcher avanzati
 * - Integration: orchestrator-core.ts hookup
 * - Testing: Unit test suite
 * - Docs: Implementation guide
 */