"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatternCache = exports.KeywordExtractionCache = exports.CacheManager = exports.createConfidenceContext = exports.ConfidenceScorer = exports.SmartPathAnalyzer = exports.FastPathAnalyzer = exports.AnalysisEngine = void 0;
// =============================================================================
// TYPES EXPORTS
// =============================================================================
__exportStar(require("./types"), exports);
// =============================================================================
// CORE ANALYSIS ENGINE
// =============================================================================
var analysis_engine_1 = require("./analysis-engine");
Object.defineProperty(exports, "AnalysisEngine", { enumerable: true, get: function () { return analysis_engine_1.AnalysisEngine; } });
// =============================================================================
// TIER IMPLEMENTATIONS
// =============================================================================
// Tier 1 - Fast Path
var fast_path_analyzer_1 = require("./tiers/fast/fast-path-analyzer");
Object.defineProperty(exports, "FastPathAnalyzer", { enumerable: true, get: function () { return fast_path_analyzer_1.FastPathAnalyzer; } });
// Tier 2 - Smart Path
var smart_path_analyzer_1 = require("./tiers/smart/smart-path-analyzer");
Object.defineProperty(exports, "SmartPathAnalyzer", { enumerable: true, get: function () { return smart_path_analyzer_1.SmartPathAnalyzer; } });
// Tier 3 - Deep Path
// export { DeepPathAnalyzer } from './tiers/deep/deep-path-analyzer'; // TODO: Implementare
// =============================================================================
// UTILITIES
// =============================================================================
var confidence_scorer_1 = require("./utils/confidence-scorer");
Object.defineProperty(exports, "ConfidenceScorer", { enumerable: true, get: function () { return confidence_scorer_1.ConfidenceScorer; } });
Object.defineProperty(exports, "createConfidenceContext", { enumerable: true, get: function () { return confidence_scorer_1.createConfidenceContext; } });
var cache_manager_1 = require("./utils/cache-manager");
Object.defineProperty(exports, "CacheManager", { enumerable: true, get: function () { return cache_manager_1.CacheManager; } });
Object.defineProperty(exports, "KeywordExtractionCache", { enumerable: true, get: function () { return cache_manager_1.KeywordExtractionCache; } });
Object.defineProperty(exports, "PatternCache", { enumerable: true, get: function () { return cache_manager_1.PatternCache; } });
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
//# sourceMappingURL=index.js.map