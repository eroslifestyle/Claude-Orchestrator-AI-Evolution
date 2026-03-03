/**
 * Confidence Scorer - Sistema Unificato di Scoring tra Tier
 *
 * Implementa il sistema di confidence scoring configurabile definito in tier-config.json
 * Garantisce consistency tra Fast Path, Smart Path e Deep Path.
 *
 * @version 1.0 - Unified Scoring System
 * @author Analysis Layer Team
 * @date 30 Gennaio 2026
 */

import {
  AnalysisTier,
  ExtractedKeyword,
  KeywordSource,
  KeywordMatchType
} from '../types';

// =============================================================================
// CONFIDENCE SCORING CONFIGURATION
// =============================================================================

interface ConfidenceConfig {
  baseScores: {
    exact_keyword_match: number;
    fuzzy_keyword_match: number;
    synonym_match: number;
    phrase_match: number;
    context_inference: number;
    llm_analysis: number;
  };
  modifiers: {
    word_boundary_bonus: number;
    case_match_bonus: number;
    frequency_penalty: number;
    domain_amplifier_bonus: number;
    multi_domain_penalty: number;
    length_penalty_factor: number;
  };
  aggregation: {
    algorithm: 'weighted_average' | 'max' | 'median';
    tier1_weight: number;
    tier2_weight: number;
    tier3_weight: number;
    confidence_floor: number;
    confidence_ceiling: number;
  };
}

interface ConfidenceContext {
  /** Testo originale per context analysis */
  originalText: string;
  /** Match position nel testo */
  matchPosition: number;
  /** Lunghezza del match */
  matchLength: number;
  /** Ha word boundaries? */
  hasWordBoundaries: boolean;
  /** È case-sensitive match? */
  isCaseSensitiveMatch: boolean;
  /** Frequenza della keyword nel testo */
  frequency: number;
  /** Ci sono domain amplifiers nel context? */
  hasDomainAmplifiers: boolean;
  /** Quanti domini sono stati rilevati? */
  domainCount: number;
  /** Tier che ha generato questo scoring */
  sourceTier: AnalysisTier;
}

interface ScoringResult {
  /** Score finale 0.0-1.0 */
  finalScore: number;
  /** Score base pre-modifiers */
  baseScore: number;
  /** Modifiers applicati */
  appliedModifiers: AppliedModifier[];
  /** Breakdown dettagliato */
  breakdown: {
    baseScoreName: string;
    totalModifiers: number;
    beforeCap: number;
    afterCap: number;
  };
}

interface AppliedModifier {
  type: string;
  value: number;
  description: string;
}

// =============================================================================
// CONFIDENCE SCORER CLASS
// =============================================================================

export class ConfidenceScorer {
  private config: ConfidenceConfig;
  private startupTime: number;

  constructor(config?: Partial<ConfidenceConfig>) {
    this.startupTime = performance.now();

    // Default configuration da tier-config.json
    this.config = {
      baseScores: {
        exact_keyword_match: 1.0,
        fuzzy_keyword_match: 0.8,
        synonym_match: 0.7,
        phrase_match: 0.85,
        context_inference: 0.6,
        llm_analysis: 0.9
      },
      modifiers: {
        word_boundary_bonus: 0.1,
        case_match_bonus: 0.05,
        frequency_penalty: -0.02,
        domain_amplifier_bonus: 0.2,
        multi_domain_penalty: -0.1,
        length_penalty_factor: 0.001
      },
      aggregation: {
        algorithm: 'weighted_average',
        tier1_weight: 0.4,
        tier2_weight: 0.6,
        tier3_weight: 1.0,
        confidence_floor: 0.1,
        confidence_ceiling: 0.99
      },
      ...config
    };

    console.log(`🎯 ConfidenceScorer inizializzato in ${Math.round(performance.now() - this.startupTime)}ms`);
  }

  // =============================================================================
  // PUBLIC API
  // =============================================================================

  /**
   * Calcola confidence score per singola keyword
   */
  scoreKeyword(
    keyword: ExtractedKeyword,
    context: ConfidenceContext
  ): ScoringResult {
    // 1. Determina base score dal tipo di match
    const baseScore = this.getBaseScore(keyword.source, keyword.matchType);

    // 2. Calcola e applica modifiers
    const modifiers = this.calculateModifiers(keyword, context);
    const modifiedScore = this.applyModifiers(baseScore, modifiers);

    // 3. Applica floor e ceiling
    const finalScore = this.capScore(modifiedScore);

    return {
      finalScore,
      baseScore,
      appliedModifiers: modifiers,
      breakdown: {
        baseScoreName: this.getBaseScoreName(keyword.source),
        totalModifiers: modifiers.reduce((sum, mod) => sum + mod.value, 0),
        beforeCap: modifiedScore,
        afterCap: finalScore
      }
    };
  }

  /**
   * Aggrega confidence scores di multiple keywords usando weighted average
   */
  aggregateScores(
    scores: ScoringResult[],
    weights?: number[]
  ): number {
    if (scores.length === 0) return this.config.aggregation.confidence_floor;

    // Default weights uguali se non specificati
    const effectiveWeights = weights || scores.map(() => 1.0);

    if (this.config.aggregation.algorithm === 'weighted_average') {
      const weightedSum = scores.reduce((sum, score, index) =>
        sum + (score.finalScore * effectiveWeights[index]), 0
      );
      const totalWeight = effectiveWeights.reduce((sum, weight) => sum + weight, 0);
      return weightedSum / totalWeight;
    }

    if (this.config.aggregation.algorithm === 'max') {
      return Math.max(...scores.map(s => s.finalScore));
    }

    if (this.config.aggregation.algorithm === 'median') {
      const sorted = scores.map(s => s.finalScore).sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
    }

    // Fallback to weighted average
    return this.aggregateScores(scores, weights);
  }

  /**
   * Aggrega confidence tra tier diversi
   */
  aggregateTierScores(tierScores: Map<AnalysisTier, number>): number {
    const weights: number[] = [];
    const scores: number[] = [];

    for (const [tier, score] of tierScores.entries()) {
      scores.push(score);
      weights.push(this.getTierWeight(tier));
    }

    const weightedSum = scores.reduce((sum, score, index) =>
      sum + (score * weights[index]), 0
    );
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

    return this.capScore(weightedSum / totalWeight);
  }

  /**
   * Valida se una confidence è accettabile per un tier
   */
  isAcceptableConfidence(confidence: number, tier: AnalysisTier): boolean {
    const thresholds = {
      fast: 0.7,    // Da tier-config.json
      smart: 0.6,
      deep: 0.5
    };

    return confidence >= thresholds[tier];
  }

  // =============================================================================
  // SCORING CALCULATION
  // =============================================================================

  /**
   * Get base score basato su source e match type
   */
  private getBaseScore(source: KeywordSource, matchType: KeywordMatchType): number {
    // Mapping source → base score
    const sourceScores: Record<KeywordSource, number> = {
      exact: this.config.baseScores.exact_keyword_match,
      fuzzy: this.config.baseScores.fuzzy_keyword_match,
      stem: this.config.baseScores.fuzzy_keyword_match, // Simile a fuzzy
      synonym: this.config.baseScores.synonym_match,
      phrase: this.config.baseScores.phrase_match,
      context: this.config.baseScores.context_inference,
      nlp: this.config.baseScores.context_inference,    // Simile a context
      llm: this.config.baseScores.llm_analysis,
      llm_context: this.config.baseScores.llm_analysis  // Same as llm
    };

    let baseScore = sourceScores[source] || 0.5; // Fallback

    // Adjustment per match type
    if (matchType === 'partial') {
      baseScore *= 0.8; // Riduce per match parziali
    } else if (matchType === 'inferred') {
      baseScore *= 0.7; // Riduce di più per inferenze
    }

    return baseScore;
  }

  /**
   * Calcola tutti i modifiers applicabili
   */
  private calculateModifiers(
    _keyword: ExtractedKeyword,
    context: ConfidenceContext
  ): AppliedModifier[] {
    const modifiers: AppliedModifier[] = [];

    // 1. Word boundary bonus
    if (context.hasWordBoundaries) {
      modifiers.push({
        type: 'word_boundary',
        value: this.config.modifiers.word_boundary_bonus,
        description: 'Keyword ha word boundaries puliti'
      });
    }

    // 2. Case match bonus
    if (context.isCaseSensitiveMatch) {
      modifiers.push({
        type: 'case_match',
        value: this.config.modifiers.case_match_bonus,
        description: 'Match case-sensitive esatto'
      });
    }

    // 3. Frequency penalty (per keyword ripetute)
    if (context.frequency > 1) {
      const penalty = this.config.modifiers.frequency_penalty * (context.frequency - 1);
      modifiers.push({
        type: 'frequency_penalty',
        value: penalty,
        description: `Keyword ripetuta ${context.frequency} volte`
      });
    }

    // 4. Domain amplifier bonus
    if (context.hasDomainAmplifiers) {
      modifiers.push({
        type: 'domain_amplifier',
        value: this.config.modifiers.domain_amplifier_bonus,
        description: 'Trovati amplifier di dominio nel context'
      });
    }

    // 5. Multi-domain penalty
    if (context.domainCount > 1) {
      const penalty = this.config.modifiers.multi_domain_penalty;
      modifiers.push({
        type: 'multi_domain',
        value: penalty,
        description: `Rilevati ${context.domainCount} domini`
      });
    }

    // 6. Length penalty (per keyword molto lunghe)
    if (context.matchLength > 20) {
      const penalty = -this.config.modifiers.length_penalty_factor * (context.matchLength - 20);
      modifiers.push({
        type: 'length_penalty',
        value: penalty,
        description: `Keyword lunga ${context.matchLength} caratteri`
      });
    }

    // 7. Position bonus (parole all'inizio più rilevanti)
    if (context.matchPosition < 50) {
      const positionBonus = 0.05 * (1 - context.matchPosition / 50);
      modifiers.push({
        type: 'position_bonus',
        value: positionBonus,
        description: `Keyword in posizione iniziale (${context.matchPosition})`
      });
    }

    return modifiers;
  }

  /**
   * Applica array di modifiers al base score
   */
  private applyModifiers(baseScore: number, modifiers: AppliedModifier[]): number {
    return modifiers.reduce((score, modifier) => score + modifier.value, baseScore);
  }

  /**
   * Applica floor e ceiling al score
   */
  private capScore(score: number): number {
    return Math.max(
      this.config.aggregation.confidence_floor,
      Math.min(this.config.aggregation.confidence_ceiling, score)
    );
  }

  /**
   * Get peso per tier nel aggregation
   */
  private getTierWeight(tier: AnalysisTier): number {
    const weights = {
      fast: this.config.aggregation.tier1_weight,
      smart: this.config.aggregation.tier2_weight,
      deep: this.config.aggregation.tier3_weight
    };
    return weights[tier];
  }

  /**
   * Get human-readable name per base score
   */
  private getBaseScoreName(source: KeywordSource): string {
    const names: Record<KeywordSource, string> = {
      exact: 'Exact Match',
      fuzzy: 'Fuzzy Match',
      stem: 'Stem Match',
      synonym: 'Synonym Match',
      phrase: 'Phrase Match',
      context: 'Context Inference',
      nlp: 'NLP Analysis',
      llm: 'LLM Analysis',
      llm_context: 'LLM Context Analysis'
    };
    return names[source] || 'Unknown';
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Get current configuration
   */
  getConfig(): ConfidenceConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (hot reload)
   */
  updateConfig(newConfig: Partial<ConfidenceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔄 ConfidenceScorer config aggiornata');
  }

  /**
   * Get scoring statistics
   */
  getStats(): ConfidenceScorerStats {
    return {
      baseScoreCount: Object.keys(this.config.baseScores).length,
      modifierCount: Object.keys(this.config.modifiers).length,
      algorithm: this.config.aggregation.algorithm,
      floor: this.config.aggregation.confidence_floor,
      ceiling: this.config.aggregation.confidence_ceiling
    };
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create confidence context da keyword e testo
 */
export function createConfidenceContext(
  keyword: ExtractedKeyword,
  originalText: string,
  tier: AnalysisTier,
  options: {
    domainCount?: number;
    hasDomainAmplifiers?: boolean;
  } = {}
): ConfidenceContext {
  // Calcola frequency della keyword nel testo
  const frequency = (originalText.match(new RegExp(keyword.text, 'gi')) || []).length;

  // Check word boundaries
  const hasWordBoundaries = checkWordBoundaries(originalText, keyword.position, keyword.length);

  // Check case sensitivity
  const extractedText = originalText.substring(keyword.position, keyword.position + keyword.length);
  const isCaseSensitiveMatch = extractedText === keyword.text;

  return {
    originalText,
    matchPosition: keyword.position,
    matchLength: keyword.length,
    hasWordBoundaries,
    isCaseSensitiveMatch,
    frequency,
    hasDomainAmplifiers: options.hasDomainAmplifiers || false,
    domainCount: options.domainCount || 1,
    sourceTier: tier
  };
}

/**
 * Check se una keyword ha word boundaries puliti
 */
function checkWordBoundaries(text: string, position: number, length: number): boolean {
  const beforeChar = position > 0 ? text[position - 1] : ' ';
  const afterChar = position + length < text.length ? text[position + length] : ' ';

  const isWordChar = (char: string) => /\w/.test(char);

  return !isWordChar(beforeChar) && !isWordChar(afterChar);
}

// =============================================================================
// TYPES
// =============================================================================

interface ConfidenceScorerStats {
  baseScoreCount: number;
  modifierCount: number;
  algorithm: string;
  floor: number;
  ceiling: number;
}

// =============================================================================
// EXPORTS
// =============================================================================

export type {
  ConfidenceConfig,
  ConfidenceContext,
  ScoringResult,
  AppliedModifier,
  ConfidenceScorerStats
};