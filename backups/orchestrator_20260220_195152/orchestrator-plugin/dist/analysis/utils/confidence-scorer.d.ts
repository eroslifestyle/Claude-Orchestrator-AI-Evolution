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
import { AnalysisTier, ExtractedKeyword } from '../types';
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
export declare class ConfidenceScorer {
    private config;
    private startupTime;
    constructor(config?: Partial<ConfidenceConfig>);
    /**
     * Calcola confidence score per singola keyword
     */
    scoreKeyword(keyword: ExtractedKeyword, context: ConfidenceContext): ScoringResult;
    /**
     * Aggrega confidence scores di multiple keywords usando weighted average
     */
    aggregateScores(scores: ScoringResult[], weights?: number[]): number;
    /**
     * Aggrega confidence tra tier diversi
     */
    aggregateTierScores(tierScores: Map<AnalysisTier, number>): number;
    /**
     * Valida se una confidence è accettabile per un tier
     */
    isAcceptableConfidence(confidence: number, tier: AnalysisTier): boolean;
    /**
     * Get base score basato su source e match type
     */
    private getBaseScore;
    /**
     * Calcola tutti i modifiers applicabili
     */
    private calculateModifiers;
    /**
     * Applica array di modifiers al base score
     */
    private applyModifiers;
    /**
     * Applica floor e ceiling al score
     */
    private capScore;
    /**
     * Get peso per tier nel aggregation
     */
    private getTierWeight;
    /**
     * Get human-readable name per base score
     */
    private getBaseScoreName;
    /**
     * Get current configuration
     */
    getConfig(): ConfidenceConfig;
    /**
     * Update configuration (hot reload)
     */
    updateConfig(newConfig: Partial<ConfidenceConfig>): void;
    /**
     * Get scoring statistics
     */
    getStats(): ConfidenceScorerStats;
}
/**
 * Create confidence context da keyword e testo
 */
export declare function createConfidenceContext(keyword: ExtractedKeyword, originalText: string, tier: AnalysisTier, options?: {
    domainCount?: number;
    hasDomainAmplifiers?: boolean;
}): ConfidenceContext;
interface ConfidenceScorerStats {
    baseScoreCount: number;
    modifierCount: number;
    algorithm: string;
    floor: number;
    ceiling: number;
}
export type { ConfidenceConfig, ConfidenceContext, ScoringResult, AppliedModifier, ConfidenceScorerStats };
//# sourceMappingURL=confidence-scorer.d.ts.map